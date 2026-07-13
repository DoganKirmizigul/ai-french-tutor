"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Profile, Badge, Session, SrsStats } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import Link from "next/link";

interface ProfileData {
  profile: Profile;
  badges: Badge[];
  srs_stats: SrsStats;
  sessions: Session[];
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.post("/api/profile/touch")
      .then(() => api.get<ProfileData>("/api/profile"))
      .then((d) => {
        if (!d.profile.placement_done) {
          router.replace("/placement");
        } else {
          setData(d);
        }
      })
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) return (
    <div className="card p-5 text-sm text-red-600 border-red-200 dark:border-red-900/50 dark:text-red-400">
      Could not reach backend: {error}
    </div>
  );

  if (!data) return (
    <div className="flex items-center gap-3 py-16 text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
      <span className="text-sm font-medium">Loading your progress…</span>
    </div>
  );

  const { profile, badges, srs_stats, sessions } = data;
  const accuracy = profile.total_exercises
    ? Math.round((profile.total_correct / profile.total_exercises) * 100)
    : 0;
  const weak = Object.entries(profile.weak_topics).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const earnedBadges = badges.filter((b) => b.earned);
  const srsProgress = srs_stats.total ? Math.round((srs_stats.learned / srs_stats.total) * 100) : 0;

  return (
    <div className="space-y-4">

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* Greeting */}
        <div className="card relative overflow-hidden p-6 md:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(273 72% 47% / 0.08), transparent 70%)" }} />
          <div className="pointer-events-none absolute right-[50px] top-[50px] h-20 w-20 rounded-full border border-slate-400/15" />
          <div className="pointer-events-none absolute right-[70px] top-[70px] h-[42px] w-[42px] rounded-full border border-slate-400/25" />

          <p className="eyebrow">Welcome back · {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
          <h1 className="mt-2 text-[32px] font-black tracking-tight leading-tight">
            Bonjour!
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You&apos;re making steady progress on your French learning journey.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-white shadow-sm shadow-slate-700/30">
              ★ Level {profile.level}
            </span>
            <span className="inline-flex items-center rounded-full bg-black/[0.05] px-3.5 py-1.5 text-[10.5px] font-semibold text-foreground/70 dark:bg-white/[0.07]">
              {profile.total_exercises} exercises done
            </span>
            <Link
              href="/pratik"
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white transition"
              style={{
                background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.2), transparent 55%), linear-gradient(148deg, hsl(273 66% 50%), hsl(273 72% 35%))",
                boxShadow: "0 4px 16px hsl(273 72% 38% / 0.45), inset 0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              Practice now <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Streak */}
        <div
          className="relative overflow-hidden rounded-[var(--radius)] p-6 text-white"
          style={{
            background: "radial-gradient(ellipse at 18% 15%, rgba(253,210,100,0.45), transparent 55%), linear-gradient(155deg, hsl(33 68% 50%), hsl(33 68% 38%), hsl(30 65% 26%))",
            boxShadow: "0 8px 28px hsl(33 68% 38% / 0.45)",
          }}
        >
          <p className="eyebrow" style={{ color: "rgba(255,220,140,0.75)" }}>Current streak</p>
          <div className="mt-3 text-6xl font-black tracking-tight leading-none font-variant-numeric">
            {profile.streak}
          </div>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: "rgba(255,225,150,0.85)" }}>
            {profile.streak === 1 ? "day" : "days"} in a row
          </p>
          <div className="mt-4 h-px" style={{ background: "rgba(255,255,255,0.18)" }} />
          <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.52)" }}>
            Consistency is the root of fluency.
          </p>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Exercises", value: profile.total_exercises, href: "/pratik",
            accent: "hsl(273 72% 47%)", bg: "hsl(273 72% 47% / 0.08)" },
          { label: "Accuracy",  value: `${accuracy}%`,           href: "/pratik",
            accent: "hsl(145 55% 45%)", bg: "hsl(145 55% 45% / 0.08)" },
          { label: "Flashcards", value: srs_stats.total,          href: "/kartlar",
            accent: "hsl(210 65% 50%)", bg: "hsl(210 65% 50% / 0.08)" },
          { label: "Due Today",  value: srs_stats.due_today,      href: "/kartlar",
            accent: "hsl(33 68% 44%)", bg: "hsl(33 68% 44% / 0.08)" },
        ].map(({ label, value, href, accent, bg }) => (
          <Link key={label} href={href} className="card group p-4 transition hover:shadow-lg">
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-[11px] text-white text-xs font-bold"
              style={{ background: bg, color: accent }}
            >
              <div className="h-4 w-4 rounded-full border-[1.5px]" style={{ borderColor: accent }} />
            </div>
            <div className="text-[26px] font-black tracking-tight leading-none font-variant-numeric">
              {value}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Accuracy chart ─────────────────────────────────── */}
      {sessions.length > 1 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow">Accuracy over time</p>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">
              Last {sessions.length} sessions
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sessions} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="amGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="hsl(273 72% 47%)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="hsl(273 72% 47%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" fontSize={10} tick={{ fill: "hsl(273 10% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} fontSize={10} tick={{ fill: "hsl(273 10% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0 0% 100%)",
                    border: "1px solid hsl(270 18% 88%)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    padding: "8px 12px",
                  }}
                  cursor={{ stroke: "hsl(273 72% 47%)", strokeWidth: 1, strokeDasharray: "4 2" }}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="hsl(273 72% 47%)"
                  strokeWidth={2.5}
                  fill="url(#amGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "hsl(273 72% 47%)", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Weak topics + Badges ──────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow">Needs work</p>
            <Link href="/konular" className="text-[11px] font-semibold text-slate-700 hover:underline dark:text-slate-400">
              Study →
            </Link>
          </div>
          {weak.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">No weak topics yet — start practising!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {weak.map(([topic, errors]) => {
                const pct = Math.min(100, (errors as number) * 10);
                return (
                  <div key={topic}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold">{topic}</span>
                      <span className="text-[10.5px] font-bold text-red-500">{errors} err</span>
                    </div>
                    <div className="progress-track" style={{ height: "4px" }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: "hsl(0 82% 58%)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow">Achievements</p>
            <span className="rounded-full bg-slate-700/10 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-700 dark:bg-slate-400/15 dark:text-slate-400">
              {earnedBadges.length} / {badges.length}
            </span>
          </div>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground">Complete exercises to earn badges.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.name}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10.5px] font-semibold",
                    b.earned
                      ? "bg-slate-700 text-white shadow-sm shadow-slate-700/25"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {b.earned ? "🏅" : "🔒"} {b.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SRS strip ──────────────────────────────────────── */}
      {srs_stats.total > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">Flashcard mastery</p>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400">{srsProgress}%</span>
          </div>

          <div className="progress-track mb-4">
            <div className="progress-fill" style={{ width: `${srsProgress}%` }} />
          </div>

          <div className="stats-mini">
            {[
              { label: "Total",     value: srs_stats.total,     color: "" },
              { label: "Due",       value: srs_stats.due_today, color: "text-amber-600 dark:text-amber-400" },
              { label: "Learned",   value: srs_stats.learned,   color: "text-green-600 dark:text-green-400" },
              { label: "Suspended", value: srs_stats.suspended, color: "text-muted-foreground" },
            ].map(({ label, value, color }) => (
              <div key={label} className="stats-mini-cell">
                <div className={`stats-mini-num ${color}`}>{value}</div>
                <div className="stats-mini-lbl">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
