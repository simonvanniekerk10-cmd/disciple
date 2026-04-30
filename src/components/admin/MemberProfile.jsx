import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, differenceInDays, startOfWeek, addDays } from "date-fns";
import { ArrowLeft, BookOpen, Heart, Flame, Calendar, Target, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PROGRESS_COLORS = {
  not_started: { label: "Not Started", cls: "bg-muted text-muted-foreground" },
  in_progress:  { label: "In Progress",  cls: "bg-primary/15 text-primary" },
  completed:    { label: "Completed",     cls: "bg-emerald-500/15 text-emerald-400" },
};

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-secondary rounded-xl p-3 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold leading-none">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function streak(logs, field) {
  if (!logs.length) return 0;
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const log of sorted) {
    const logDate = parseISO(log.date);
    const diff = differenceInDays(cursor, logDate);
    if (diff > 1) break;
    if (log[field] > 0) {
      count++;
      cursor = logDate;
    }
  }
  return count;
}

function buildWeeklyChart(logs) {
  const weeks = [];
  const today = new Date();
  for (let w = 3; w >= 0; w--) {
    const weekStart = startOfWeek(addDays(today, -w * 7), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekLogs = logs.filter((l) => {
      const d = parseISO(l.date);
      return d >= weekStart && d <= weekEnd;
    });
    const bibleMin = weekLogs.reduce((s, l) => s + (l.bible_reading_minutes || 0), 0);
    const prayerMin = weekLogs.reduce((s, l) => s + (l.prayer_minutes || 0), 0);
    weeks.push({
      week: format(weekStart, "d MMM"),
      Bible: Math.round(bibleMin),
      Prayer: Math.round(prayerMin),
    });
  }
  return weeks;
}

export default function MemberProfile({ member, olId, onBack }) {
  const [logs, setLogs] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member?.email) return;
    setLoading(true);
    Promise.all([
      base44.entities.DailyLog.filter({ created_by: member.email, oversight_leader_id: olId }, "-date", 500),
      base44.entities.ChallengeSelection.filter({ created_by: member.email }, "-created_date", 50),
      base44.entities.WeeklyUpdate.filter({ created_by: member.email }, "-created_date", 200),
    ]).then(([l, c, u]) => {
      setLogs(l);
      setChallenges(c);
      setUpdates(u);
      setLoading(false);
    });
  }, [member?.email, olId]);

  // Devotion stats
  const now = new Date();
  const thisMonthStr = format(now, "yyyy-MM");
  const monthLogs = logs.filter((l) => l.date?.startsWith(thisMonthStr));
  const totalBibleMin = logs.reduce((s, l) => s + (l.bible_reading_minutes || 0), 0);
  const totalPrayerMin = logs.reduce((s, l) => s + (l.prayer_minutes || 0), 0);
  const monthBibleMin = monthLogs.reduce((s, l) => s + (l.bible_reading_minutes || 0), 0);
  const monthPrayerMin = monthLogs.reduce((s, l) => s + (l.prayer_minutes || 0), 0);
  const bibleStreak = streak(logs, "bible_reading_minutes");
  const prayerStreak = streak(logs, "prayer_minutes");
  const lastLog = logs.sort((a, b) => b.date.localeCompare(a.date))[0];
  const weeklyData = buildWeeklyChart(logs);

  // Challenge data
  const activeChallenge = challenges.find((c) => c.status === "in_progress" || c.status === "not_started");
  const completedChallenges = challenges.filter((c) => c.status === "completed");

  const activeUpdates = updates
    .filter((u) => u.challenge_id === activeChallenge?.id || u.challenge_title === activeChallenge?.challenge_title)
    .sort((a, b) => (a.week_number || 0) - (b.week_number || 0));

  // At-a-glance indicators
  const lastActiveDays = lastLog ? differenceInDays(new Date(), parseISO(lastLog.date)) : null;
  const devotionConsistency = logs.filter((l) => l.bible_reading_minutes > 0).length;
  const challengeEngagement = updates.length;

  const glanceTiles = [
    {
      icon: BookOpen,
      label: "Devotion",
      value: devotionConsistency > 0 ? `${devotionConsistency} days` : "None yet",
      sub: "with Bible reading",
    },
    {
      icon: Target,
      label: "Challenge",
      value: challengeEngagement > 0 ? `${challengeEngagement} updates` : "None yet",
      sub: "submitted total",
    },
    {
      icon: Clock,
      label: "Last Active",
      value: lastActiveDays === null ? "Never" : lastActiveDays === 0 ? "Today" : `${lastActiveDays}d ago`,
      sub: lastLog ? format(parseISO(lastLog.date), "d MMM") : "No logs",
    },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col" style={{ maxHeight: "80dvh" }}>
      {/* Back header — sticky */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0 sticky top-0 bg-card z-10">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-secondary border border-border shrink-0 overflow-hidden flex items-center justify-center">
          {member.profile_photo_url ? (
            <img src={member.profile_photo_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {(member.name || "?")[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{member.name || member.email}</p>
          <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-6">

          {/* At a glance */}
          <div className="flex gap-2">
            {glanceTiles.map((t) => (
              <StatTile key={t.label} icon={t.icon} label={t.label} value={t.value} sub={t.sub} />
            ))}
          </div>

          {/* Devotion & Prayer */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" /> Devotion & Prayer
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-secondary rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bible Reading</p>
                <p className="font-bold">{(totalBibleMin / 60).toFixed(1)}h <span className="text-xs font-normal text-muted-foreground">all time</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{(monthBibleMin / 60).toFixed(1)}h this month</p>
              </div>
              <div className="bg-secondary rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prayer</p>
                <p className="font-bold">{(totalPrayerMin / 60).toFixed(1)}h <span className="text-xs font-normal text-muted-foreground">all time</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{(monthPrayerMin / 60).toFixed(1)}h this month</p>
              </div>
              <div className="bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bible Streak</p>
                </div>
                <p className="font-bold">{bibleStreak} <span className="text-xs font-normal text-muted-foreground">days</span></p>
              </div>
              <div className="bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prayer Streak</p>
                </div>
                <p className="font-bold">{prayerStreak} <span className="text-xs font-normal text-muted-foreground">days</span></p>
              </div>
            </div>

            {lastLog && (
              <p className="text-[10px] text-muted-foreground mb-3">
                Last entry: {format(parseISO(lastLog.date), "EEEE, d MMMM yyyy")}
              </p>
            )}

            {/* Weekly chart */}
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Last 4 Weeks (minutes)</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={weeklyData} barCategoryGap="30%">
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                    cursor={{ fill: "hsl(var(--secondary))" }}
                  />
                  <Bar dataKey="Bible" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Prayer" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Active Challenge */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" /> Current Challenge
            </h3>

            {activeChallenge ? (
              <div className="space-y-3">
                <div className="bg-secondary rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm leading-snug">{activeChallenge.challenge_title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${PROGRESS_COLORS[activeChallenge.status]?.cls}`}>
                      {PROGRESS_COLORS[activeChallenge.status]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{activeChallenge.challenge_category} · {activeChallenge.month}</p>

                  {/* Progress bar from latest update */}
                  {activeUpdates.length > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{activeUpdates[activeUpdates.length - 1]?.progress ?? 0}%</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${activeUpdates[activeUpdates.length - 1]?.progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Weekly updates */}
                {activeUpdates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Updates</p>
                    {activeUpdates.map((u, i) => (
                      <div key={u.id} className="bg-secondary rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary">Update {u.week_number || i + 1}</span>
                          <Badge variant="outline" className="text-[10px]">{u.progress ?? 0}%</Badge>
                        </div>
                        {u.what_done && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">What they did</p>
                            <p className="text-xs mt-0.5">{u.what_done}</p>
                          </div>
                        )}
                        {u.obstacles && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Obstacles</p>
                            <p className="text-xs mt-0.5">{u.obstacles}</p>
                          </div>
                        )}
                        {u.learnings && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Learnings</p>
                            <p className="text-xs mt-0.5">{u.learnings}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-secondary rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">No active challenge.</p>
              </div>
            )}
          </section>

          {/* Completed Challenges */}
          {completedChallenges.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Completed Challenges
              </h3>
              <div className="space-y-2">
                {completedChallenges.map((c) => (
                  <div key={c.id} className="bg-secondary rounded-xl px-4 py-3 flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.challenge_title}</p>
                      <p className="text-[10px] text-muted-foreground">{c.challenge_category} · {c.month}</p>
                    </div>
                    {c.completed_date && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(parseISO(c.completed_date), "d MMM yyyy")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}