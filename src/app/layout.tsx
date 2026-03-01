import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Green Machines | Competitive Swimming",
  description:
    "Track times, view progressions, and race against the clock with The Green Machines swim team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="bg-green-700 text-white shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🏊</span>
              <span className="font-bold text-xl tracking-tight">
                The Green Machines
              </span>
            </Link>
            <div className="flex items-center gap-4 text-sm font-medium">
              <Link
                href="/"
                className="hover:text-green-200 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/race"
                className="hover:text-green-200 transition-colors"
              >
                Race Simulator
              </Link>
              <Link
                href="/admin"
                className="hover:text-green-200 transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </nav>
        {children}
        <footer className="bg-green-800 text-green-100 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm">
            <p className="font-semibold text-lg mb-1">
              🏊 The Green Machines
            </p>
            <p className="text-green-300">
              Making waves, one race at a time.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
