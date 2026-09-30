# ⚡ 10x Instant Speed Protocol (User-Mandated Rule)

> **MANDATORY INSTRUCTION SET FOR ALL TURNS AND AGENTS:**

1. **`next dev` (Fast Refresh / HMR)**:
   - Keep `next dev` active on port 3000.
   - Never run `npm run build` during iterative changes.
   - Code edits will update in ~200ms in the user's browser via HMR.

2. **Zero Headless Chrome Lag**:
   - Strictly NO background headless Chrome screenshots, browser recordings, or browser subagent tasks.
   - The user inspects and interacts directly in their own browser (`http://localhost:3000`) with Ctrl + R.

3. **Only Push on Final Milestones**:
   - Do NOT run `git commit` or `git push` on every small edit or micro-change.
   - Only commit and push to GitHub/AWS Amplify when the user explicitly asks for a deploy or milestone push.

4. **Lean & Fast Verification**:
   - Only run `tsc --noEmit` (quick ~2s TypeScript validation) to guarantee 0 errors.
   - Fast, surgical turnaround under 10 seconds.
