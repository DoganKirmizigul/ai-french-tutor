"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Profile, Badge, Session, SrsStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Flame, Target, TrendingUp, WalletCards, BookOpen, Trophy } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="pt-6 text-destructive text-sm">Could not reach backend: {error}</CardContent>
    </Card>
  );
  if (!data) return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      Loading…
    </div>
  );

  const { profile, badges, srs_stats, sessions } = data;
  const accuracy = profile.total_exercises
    ? Math.round((profile.total_correct / profile.total_exercises) * 100)
    : 0;
  const weak = Object.entries(profile.weak_topics).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const earnedBadges = badges.filter((b) => b.earned);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour! <span className="grad-text">Level {profile.level}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Keep up the great work</p>
        </div>
        <div className="grad flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-white shadow-md">
          <Flame size={16} /> {profile.streak}-Day Streak
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Target size={16} />}       label="Exercises"   value={profile.total_exercises} />
        <StatCard icon={<TrendingUp size={16} />}   label="Accuracy"    value={`${accuracy}%`} />
        <StatCard icon={<WalletCards size={16} />}  label="Flashcards"  value={srs_stats.total} />
        <StatCard icon={<BookOpen size={16} />}     label="Due Today"   value={srs_stats.due_today} />
      </div>

      {/* Accuracy chart */}
      {sessions.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Accuracy History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sessions}>
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#667eea" strokeWidth={2.5} dot={{ fill: "#667eea", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Weak topics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target size={15} className="text-destructive" /> Weak Topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weak.length === 0 ? (
              <p className="text-sm text-muted-foreground">None detected yet — start practicing!</p>
            ) : (
              weak.map(([topic, errors]) => (
                <div key={topic} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{topic}</span>
                    <span className="text-destructive font-semibold">{errors} errors</span>
                  </div>
                  <Progress value={Math.min(100, (errors as number) * 10)} className="h-1.5 [&>div]:bg-destructive" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy size={15} className="text-yellow-500" /> Badges
              {earnedBadges.length > 0 && (
                <UiBadge variant="secondary" className="ml-auto">{earnedBadges.length}/{badges.length}</UiBadge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.name}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    b.earned ? "grad text-white shadow-sm" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {b.earned ? "🏅 " : "🔒 "}{b.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SRS progress bar */}
      {srs_stats.total > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground font-medium">Flashcard progress</span>
              <span className="font-semibold">{srs_stats.learned}/{srs_stats.total} learned</span>
            </div>
            <Progress value={srs_stats.total ? (srs_stats.learned / srs_stats.total) * 100 : 0} className="h-2" />
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
              <div><div className="font-bold text-foreground text-lg">{srs_stats.total}</div>Total</div>
              <div><div className="font-bold text-primary text-lg">{srs_stats.due_today}</div>Due Today</div>
              <div><div className="font-bold text-foreground text-lg">{srs_stats.learned}</div>Learned</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
          {icon} {label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
