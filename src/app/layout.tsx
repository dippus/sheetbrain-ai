import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL("https://sheetbrain.ai"),
  openGraph: {
    title: "SheetBrain AI Workspace",
    description: "Autonomous multi-agent spreadsheet intelligence workspace.",
    url: "https://sheetbrain.ai",
    siteName: "SheetBrain AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SheetBrain AI Workspace",
    description: "Autonomous multi-agent spreadsheet intelligence workspace.",
  },
  title: 'SheetBrain Studio — Desktop Spreadsheet & Model Engine',
  description: 'Production desktop spreadsheet workspace with reactive formula engine, real local datasets, and scenario analysis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
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
      <body className="h-full bg-[var(--app-bg)] text-[var(--cell-text)] antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
