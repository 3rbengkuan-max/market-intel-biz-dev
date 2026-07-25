import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Intel — MP Biomedicals BD",
  description:
    "Capture AI-researched market opportunities and threats, rank them, assign response actions, and track follow-up.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-50 text-neutral-900 min-h-screen">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-6 w-6 rounded bg-blue-600 text-white text-center text-sm leading-6">
                MI
              </span>
              <span>Market Intel</span>
              <span className="hidden sm:inline text-neutral-400 font-normal">
                · MP Biomedicals BD
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/scan"
                className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
              >
                Run AI scan
              </Link>
              <Link
                href="/intel/new"
                className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-100"
              >
                New intel
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
