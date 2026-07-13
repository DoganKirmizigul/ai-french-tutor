"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen, Headphones, Languages, LayoutDashboard,
  MessageCircle, Moon, Pencil, Sun, Volume2, WalletCards,
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
  { href: "/ceviri",   label: "Translate",    icon: Languages },
];

function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return { dark, toggle };
}

export default function Navbar() {
  const pathname = usePathname();
  const { dark, toggle } = useDarkMode();

  return (
    <>
      {/* ── Dark mode toggle — fixed top-right on mobile ── */}
      <button
        onClick={toggle}
        aria-label="Toggle dark mode"
        className="fixed right-3 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white/90 text-neutral-600 shadow-sm backdrop-blur-xl transition hover:bg-neutral-100 dark:border-white/[0.08] dark:bg-neutral-900/90 dark:text-neutral-400 dark:hover:bg-neutral-800 md:hidden"
      >
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

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
              My <span className="text-slate-600 dark:text-slate-400">French</span> Teacher
            </span>
          </Link>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1 flex-shrink-0" />

          <nav className="flex items-center gap-0.5 flex-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[10px] px-[11px] py-[5px] text-[12.5px] font-medium transition-all whitespace-nowrap",
                    active
                      ? "bg-slate-700 text-white shadow-sm shadow-slate-700/30"
                      : "text-neutral-500 hover:bg-black/[0.04] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                  )}
                >
                  <Icon size={13} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Dark mode toggle — desktop */}
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.07] bg-neutral-50 text-neutral-500 transition hover:bg-neutral-100 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-white/95 backdrop-blur-xl md:hidden dark:border-white/[0.06] dark:bg-neutral-950/95">
        <div className="grid grid-cols-8">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={cn(
                  "flex flex-col items-center justify-center py-3 transition-colors",
                  active
                    ? "text-slate-700 dark:text-slate-400"
                    : "text-neutral-400 dark:text-neutral-600"
                )}
              >
                <Icon
                  size={22}
                  className={active ? "stroke-[2.2]" : "stroke-[1.6]"}
                />
                {active && (
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-slate-700 dark:bg-slate-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
