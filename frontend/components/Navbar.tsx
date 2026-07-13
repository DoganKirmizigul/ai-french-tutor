"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Headphones, LayoutDashboard,
  MessageCircle, Pencil, Volume2, WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/",         label: "Dashboard",    icon: LayoutDashboard },
  { href: "/pratik",   label: "Practice",     icon: Pencil },
  { href: "/konular",  label: "Topics",       icon: BookOpen },
  { href: "/kartlar",  label: "Cards",        icon: WalletCards },
  { href: "/dictee",   label: "Dictée",       icon: Headphones },
  { href: "/telaffuz", label: "Pronunciation", icon: Volume2 },
  { href: "/sohbet",   label: "Chat",         icon: MessageCircle },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop top nav ── */}
      <header className="sticky top-0 z-40 hidden border-b border-black/[0.05] bg-white/82 backdrop-blur-2xl md:block dark:border-white/[0.05] dark:bg-neutral-950/82">
        <div className="mx-auto flex h-[54px] max-w-5xl items-center gap-1 px-4">

          {/* Brushstroke tricolore logo */}
          <Link href="/" className="mr-4 flex items-center gap-2.5 flex-shrink-0">
            <svg width="28" height="20" viewBox="0 0 30 22" fill="none">
              <path d="M4 3.5 Q3.2 11 4 18.5"  stroke="#002395" strokeWidth="6" strokeLinecap="round"/>
              <path d="M15 2.5 Q14.1 11 15 19.5" stroke="#C8C2B8" strokeWidth="6" strokeLinecap="round"/>
              <path d="M26 3.5 Q26.8 11 26 18.5" stroke="#ED2939" strokeWidth="6" strokeLinecap="round"/>
            </svg>
            <span className="text-[13.5px] font-bold tracking-tight text-neutral-800 dark:text-white">
              My <span className="text-violet-700 dark:text-violet-400">French</span> Teacher
            </span>
          </Link>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1 flex-shrink-0" />

          <nav className="flex items-center gap-0.5">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[10px] px-[11px] py-[5px] text-[12.5px] font-medium transition-all whitespace-nowrap",
                    active
                      ? "bg-violet-700 text-white shadow-sm shadow-violet-700/30"
                      : "text-neutral-500 hover:bg-black/[0.04] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                  )}
                >
                  <Icon size={13} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-white/95 backdrop-blur-xl md:hidden dark:border-white/[0.06] dark:bg-neutral-950/95">
        <div className="grid grid-cols-7">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-semibold uppercase tracking-wide transition-colors",
                  active
                    ? "text-violet-700 dark:text-violet-400"
                    : "text-neutral-400 dark:text-neutral-600"
                )}
              >
                <Icon size={19} className={active ? "stroke-[2.5]" : "stroke-[1.8]"} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
