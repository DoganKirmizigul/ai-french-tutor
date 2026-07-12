"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Headphones,
  LayoutDashboard,
  MessageCircle,
  Pencil,
  Volume2,
  WalletCards,
} from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pratik", label: "Practice", icon: Pencil },
  { href: "/konular", label: "Topics", icon: BookOpen },
  { href: "/kartlar", label: "Cards", icon: WalletCards },
  { href: "/dictee", label: "Dictée", icon: Headphones },
  { href: "/telaffuz", label: "Pronunciation", icon: Volume2 },
  { href: "/sohbet", label: "Chat", icon: MessageCircle },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: top navbar */}
      <header className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 md:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
          <Link href="/" className="mr-4 flex items-center gap-2 font-bold">
            <span>🇫🇷</span>
            <span className="grad-text">My French Teacher</span>
          </Link>
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "grad text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Mobile: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
        <div className="grid grid-cols-7">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  active ? "text-indigo-500" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
