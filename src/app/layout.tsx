import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SheetBrain AI — Autonomous Multi-Agent Spreadsheet Workspace',
  description: 'Convert natural language prompts into living, formula-driven spreadsheets with dynamic charts and What-If simulations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-studio-950 text-slate-100 antialiased selection:bg-brand-emerald/30 selection:text-brand-emerald">
        {children}
      </body>
    </html>
  );
}
