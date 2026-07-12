"use client";

import { useEffect, useState } from "react";
import { api, Profile, Badge, Session, SrsStats } from "@/lib/api";
import { Flame, Target, TrendingUp, WalletCards } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ProfileData {
  profile: Profile;
  badges: Badge[];
  srs_stats: SrsStats;
  sessions: Session[];
}

export default function Dashboard() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .post("/api/profile/touch")
      .then(() => api.get<ProfileData>("/api/profile"))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return <div className="card border-red-300 text-red-600">Could not reach backend: {error}</div>;
  if (!data) return <div className="animate-pulse text-slate-400">Loading…</div>;

  const { profile, badges, srs_stats, sessions } = data;
  const accuracy = profile.total_exercises
    ? Math.round((profile.total_correct / profile.total_exercises) * 100)
    : 0;
  const weak = Object.entries(profile.weak_topics).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Bonjour! <span className="grad-text">Level {profile.level}</span>
        </h1>
        <div className="grad flex items-center gap-2 rounded-2xl px-4 py-2 font-bold text-white shadow-md">
          <Flame size={18} /> {profile.streak}-Day Streak
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={<Target size={18} />} label="Total Exercises" value={profile.total_exercises} />
        <Stat icon={<TrendingUp size={18} />} label="Accuracy" value={`${accuracy}%`} />
        <Stat icon={<WalletCards size={18} />} label="Flashcards" value={srs_stats.total} />
        <Stat icon={<Flame size={18} />} label="Due Today" value={srs_stats.due_today} />
      </div>

      {sessions.length > 1 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">📈 Accuracy History</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessions}>
                <XAxis dataKey="date" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#667eea" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">🎯 Weak Topics</h2>
          {weak.length === 0 ? (
            <p className="text-sm text-slate-500">None detected yet — start practicing!</p>
          ) : (
            <ul className="space-y-2">
              {weak.map(([topic, errors]) => (
                <li key={topic} className="flex justify-between text-sm">
                  <span>{topic}</span>
                  <span className="font-semibold text-red-500">{errors} errors</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">🏅 Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.name}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  b.earned
                    ? "grad text-white"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                {b.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
