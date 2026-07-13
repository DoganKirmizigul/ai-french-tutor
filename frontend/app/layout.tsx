import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "🇫🇷 My French Teacher",
  description: "AI-powered personal French teacher",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#667eea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className={inter.className}>
        {/* Fixed background: base color + gradient blobs + grain */}
        <div className="bg-fx" aria-hidden="true">
          <div className="bg-fx-blob bg-fx-blob-1" />
          <div className="bg-fx-blob bg-fx-blob-2" />
          <div className="bg-fx-blob bg-fx-blob-3" />
          <div className="bg-fx-blob bg-fx-blob-4" />
        </div>
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-10">{children}</main>
      </body>
    </html>
  );
}
