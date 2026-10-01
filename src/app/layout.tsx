import type { Metadata } from 'next';
import './globals.css';

/**
 * Canonical public URL for Open Graph / Twitter card resolution.
 * Falls back to the deployed origin so shared links always resolve correctly.
 */
const canonicalUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.AWS_BRANCH ? `https://${process.env.AWS_BRANCH}.${process.env.AWS_APP_ID}.amplifyapp.com` : 'https://main.d36a9s34xgy54i.amplifyapp.com');

export const metadata: Metadata = {
  metadataBase: new URL(canonicalUrl),
  openGraph: {
    title: "SheetBrain AI Workspace",
    description: "Autonomous multi-agent spreadsheet intelligence workspace.",
    url: canonicalUrl,
    siteName: "SheetBrain AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SheetBrain AI Workspace",
    description: "Autonomous multi-agent spreadsheet intelligence workspace.",
  },
  title: 'SheetBrain AI — Autonomous Spreadsheet Intelligence & Model Engine',
  description: 'Enterprise spreadsheet workspace with deterministic formula engine, multi-agent AI synthesis, and What-If scenario simulations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full w-full max-w-full dark overflow-hidden overflow-x-hidden select-none" style={{ overscrollBehavior: 'none' }} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('sheetbrain_theme');
                if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="h-full w-full max-w-full bg-[var(--app-bg)] text-[var(--cell-text)] antialiased overflow-hidden overflow-x-hidden overscroll-none">
        {children}
      </body>
    </html>
  );
}
