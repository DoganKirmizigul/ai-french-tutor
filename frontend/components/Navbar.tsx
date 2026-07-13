"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Headphones, LayoutDashboard,
  MessageCircle, Pencil, Volume2, WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const items = [
  { href: "/",          label: "Dashboard",    icon: LayoutDashboard },
  { href: "/pratik",    label: "Practice",     icon: Pencil },
  { href: "/konular",   label: "Topics",       icon: BookOpen },
  { href: "/kartlar",   label: "Cards",        icon: WalletCards },
  { href: "/dictee",    label: "Dictée",       icon: Headphones },
  { href: "/telaffuz",  label: "Pronunciation",icon: Volume2 },
  { href: "/sohbet",    label: "Chat",         icon: MessageCircle },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden border-b bg-background/80 backdrop-blur-md md:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
          <Link href="/" className="mr-3 flex items-center gap-2 font-bold text-sm">
            <span className="text-lg">🇫🇷</span>
            <span className="grad-text font-semibold tracking-tight">My French Teacher</span>
          </Link>
          <Separator orientation="vertical" className="mx-2 h-5" />
          <nav className="flex items-center gap-0.5">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                    active
                      ? "grad text-white shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-7">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
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
