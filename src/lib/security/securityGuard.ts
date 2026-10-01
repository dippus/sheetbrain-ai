import { NextRequest, NextResponse } from 'next/server';
import { logCloudWatchMetric } from '@/lib/aws/cloudwatch';

// ==============================================================================
// 1. IN-MEMORY SLIDING WINDOW RATE LIMITER
// ==============================================================================

interface RateLimitEntry {
  timestamps: number[];
  lastSeen: number;
}

// Global in-memory storage for sliding window timestamps per IP + Action
const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 5000;
let lastCleanup = Date.now();

/**
 * Periodically purge stale IP entries to prevent memory leaks in serverless / long-running Node instances.
 */
function cleanupExpiredEntries(now: number, maxWindowMs: number) {
  if (now - lastCleanup < 60000 && rateLimitStore.size < MAX_STORE_SIZE) {
    return;
  }
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastSeen > maxWindowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  limit?: number;        // Max requests allowed within window (default: 30)
  windowMs?: number;     // Window size in ms (default: 60,000ms = 1 min)
  action?: string;       // Unique action identifier for bucket isolation (e.g., 'generate', 'edit')
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  ip: string;
}

/**
 * Extracts client IP safely across CloudFront, AWS Amplify, proxy, and direct connections.
 */
/**
 * Extracts client IP safely across CloudFront, AWS Amplify, proxy, and direct connections.
 * In AWS Amplify/CloudFront, `cloudfront-viewer-address` cannot be forged by the client.
 */
export function extractClientIp(req: NextRequest): string {
  // 1. CloudFront authentic viewer address (Format: IP:Port) - highest trust, tamper-proof
  const cfViewer = req.headers.get('cloudfront-viewer-address');
  if (cfViewer) {
    const ip = cfViewer.split(':')[0].trim();
    if (ip) return ip;
  }

  // 2. Real-IP set by trusted reverse proxy
  const realIp = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (realIp) return realIp.trim();

  // 3. X-Forwarded-For: CloudFront appends client IP to the end. Take rightmost non-internal IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((p) => p.trim()).filter(Boolean);
    // Take the last client hop appended by edge proxy
    const clientIp = parts[parts.length - 1];
    if (clientIp) return clientIp;
  }

  return '127.0.0.1';
}

/**
 * Checks sliding window rate limit for the incoming request.
 * NOTE: This is a process-level (L1) rate limiter. In multi-instance serverless environments,
 * counters are per-instance. It effectively protects against single-client burst loops.
 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions = {}
): RateLimitResult {
  const limit = options.limit ?? 30;
  const windowMs = options.windowMs ?? 60000;
  const action = options.action ?? 'api';
  const ip = extractClientIp(req);
  const now = Date.now();

  cleanupExpiredEntries(now, windowMs);

  const bucketKey = `${ip}:${action}`;
  let entry = rateLimitStore.get(bucketKey);

  if (!entry) {
    entry = { timestamps: [], lastSeen: now };
    rateLimitStore.set(bucketKey, entry);
  }

  // Filter out timestamps outside the active sliding window
  const windowStart = now - windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
  entry.lastSeen = now;

  const currentCount = entry.timestamps.length;
  const allowed = currentCount < limit;

  if (allowed) {
    entry.timestamps.push(now);
  }

  const oldestTimestamp = entry.timestamps[0] || now;
  const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
  const remaining = Math.max(0, limit - entry.timestamps.length);

  if (!allowed) {
    logCloudWatchMetric({
      operation: 'SecurityRateLimit',
      latencyMs: 1,
      status: 'ERROR',
      metadata: { ip, action, currentCount, limit },
    });
  }

  return {
    allowed,
    limit,
    remaining,
    resetSeconds,
    ip,
  };
}

/**
 * Convenience helper to return a standardized 429 Too Many Requests response.
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `Rate limit exceeded (${result.limit} requests/min). Please retry in ${result.resetSeconds}s.`,
      retryAfterSeconds: result.resetSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.resetSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

// ==============================================================================
// 2. ADVERSARIAL PROMPT INJECTION & JAILBREAK GUARD
// ==============================================================================

export interface PromptSecurityResult {
  isSafe: boolean;
  reason?: string;
  flaggedPattern?: string;
}

/**
 * Scoped regex signatures targeting prompt injection, system prompt extraction,
 * and jailbreak attempts without causing false positives on legitimate business spreadsheet requests
 * (e.g. "ignore blank rows", "ERP system", "previous quarters", "tax system rules").
 */
const INJECTION_PATTERNS: Array<{ regex: RegExp; description: string }> = [
  {
    // Scoped strictly to overriding system/developer instructions (not business data rules)
    regex: /\b(ignore|disregard|forget|override)\b[\s\S]{0,15}\b(all\s+)?(previous|prior|above)\b[\s\S]{0,15}\b(instructions?|prompts?|directions?|system\s+rules?)\b/i,
    description: 'System instruction override / disregard command',
  },
  {
    // Specific system prompt leakage requests
    regex: /\b(what (is|are)|print|show|reveal|display|output|leak|give me|repeat)\b[\s\S]{0,20}\b(your|the)\b[\s\S]{0,20}\b(system prompt|internal prompt|developer instructions|hidden prompt)\b/i,
    description: 'System prompt extraction attempt',
  },
  {
    // Explicit jailbreak persona override
    regex: /\b(you are now|pretend you are|act as|roleplay as)\b[\s\S]{0,20}\b(dan|jailbreak|unfiltered ai|unrestricted mode)\b/i,
    description: 'Jailbreak persona or DAN override',
  },
  {
    regex: /\b(do anything now|bypass safety filters|disable guardrails)\b/i,
    description: 'Guardrail bypass attempt',
  },
  {
    regex: /[\x00\u0000]/,
    description: 'Null byte injection attack',
  },
];

/**
 * Evaluates user input against adversarial injection heuristics.
 * Returns true if clean, false if flagged with details.
 */
export function detectPromptInjection(input: string): PromptSecurityResult {
  if (!input || typeof input !== 'string') {
    return { isSafe: true };
  }

  const normalized = input.normalize('NFKC').trim();

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.regex.test(normalized)) {
      logCloudWatchMetric({
        operation: 'SecurityPromptInjection',
        latencyMs: 1,
        status: 'ERROR',
        metadata: { pattern: pattern.description, sampleLength: input.length },
      });

      return {
        isSafe: false,
        reason: `Adversarial prompt injection pattern detected: ${pattern.description}.`,
        flaggedPattern: pattern.description,
      };
    }
  }

  return { isSafe: true };
}

// ==============================================================================
// 3. BROWSER CSRF ORIGIN VALIDATOR
// ==============================================================================

/** Exact production domain (NO wildcard *.amplifyapp.com allowed) */
const EXACT_PRODUCTION_DOMAIN = 'main.d36a9s34xgy54i.amplifyapp.com';

/**
 * Validates Origin / Referer for browser-initiated state-changing API endpoints.
 * NOTE: This is browser CSRF defense, NOT bot/abuse protection (curl/scripts can forge headers).
 */
export function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // Server-to-server, direct curl, or automated testing has no browser Origin header
  if (!origin && !referer) {
    return true;
  }

  const target = origin || referer || '';

  try {
    const parsed = new URL(target);
    const host = parsed.hostname.toLowerCase();

    // Allow localhost and local loopbacks
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return true;
    }

    // Allow ONLY our exact production domain (no broad wildcard that permits rogue Amplify apps)
    if (host === EXACT_PRODUCTION_DOMAIN) {
      return true;
    }

    // Allow custom deployment domain if configured
    const configuredSite = process.env.NEXT_PUBLIC_SITE_URL;
    if (configuredSite) {
      const siteHost = new URL(configuredSite).hostname.toLowerCase();
      if (host === siteHost) return true;
    }

    return false;
  } catch {
    return false;
  }
}
