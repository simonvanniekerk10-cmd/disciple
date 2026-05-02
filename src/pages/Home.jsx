import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { format, startOfWeek, endOfWeek, subDays, parseISO } from "date-fns";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import DailyCheckIn from "../components/home/DailyCheckIn";
import WeeklySummary from "../components/home/WeeklySummary";
import RecentActivity from "../components/home/RecentActivity";
import AccountabilityGroupSection from "../components/home/AccountabilityGroupSection";
import JoinCodeForm from "../components/home/JoinCodeForm";

const TAGLINES = [
  "Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit. — Matthew 28:19"
];

export default function Home() {
  const { user, checkAppState } = useAuth();
  const [showJoinCode, setShowJoinCode] = useState(false);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [oversightLeaderId, setOversightLeaderId] = useState(user?.oversight_leader_id || null);

  useEffect(() => {
    setOversightLeaderId(user?.oversight_leader_id || null);
  }, [user?.oversight_leader_id]);

  // Subscribe to real-time profile changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('home-profile-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        if (payload.new?.oversight_leader_id) {
          setOversightLeaderId(payload.new.oversight_leader_id);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const olId = oversightLeaderId || (isAdmin ? user?.id : null);
  const hasGroup = isAdmin || !!oversightLeaderId;
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: logs = [] } = useQuery({
    queryKey: ["dailyLogs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(60);
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenge_selections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["weeklyUpdates", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_updates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id
  });

  const todayLog = logs.find((l) => l.date === today);

  const streak = useMemo(() => {
    let count = 0;
    const sorted = [...logs]
      .filter((l) => l.bible_reading_minutes > 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    let checkDate = new Date();
    if (!sorted.find((l) => l.date === today)) {
      checkDate = subDays(checkDate, 1);
    }
    for (let i = 0; i < 365; i++) {
      const dateStr = format(checkDate, "yyyy-MM-dd");
      if (sorted.find((l) => l.date === dateStr)) {
        count++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return count;
  }, [logs, today]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weeklyBible = logs
    .filter((l) => { const d = parseISO(l.date); return d >= weekStart && d <= weekEnd; })
    .reduce((sum, l) => sum + (l.bible_reading_minutes || 0), 0);
  const weeklyPrayer = logs
    .filter((l) => { const d = parseISO(l.date); return d >= weekStart && d <= weekEnd; })
    .reduce((sum, l) => sum + (l.prayer_minutes || 0), 0);

  const activeChallenge = challenges.find(
    (c) => c.status === "in_progress" || c.status === "not_started"
  );

  return (
    <div className="px-5 pt-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-2xl font-bold mt-1">Disciple</h1>
        </div>
        <Link
          to="/Settings"
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      {!hasGroup && (
        <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
          <p className="text-sm text-accent font-medium mb-2">Join a Group</p>
          <p className="text-xs text-accent/80 mb-3">
            Ask your leader for a code to join their group and get started.
          </p>
          <button
            onClick={() => setShowJoinCode(true)}
            className="text-xs font-semibold text-accent hover:text-accent/80 transition"
          >
            Enter Code →
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl p-4 border border-primary/20">
        <p className="text-sm font-medium text-primary italic leading-relaxed">
          "Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit."
        </p>
        <p className="text-xs text-primary/70 font-semibold mt-2">— Matthew 28:19</p>
      </div>

      <DailyCheckIn todayLog={todayLog} streak={streak} olId={olId} />

      <WeeklySummary
        weeklyBible={weeklyBible}
        weeklyPrayer={weeklyPrayer}
        activeChallenge={activeChallenge}
      />

      <RecentActivity logs={logs.slice(0, 5)} updates={updates.slice(0, 5)} />

      <AccountabilityGroupSection user={user} />

      <JoinCodeForm
        open={showJoinCode}
        onOpenChange={setShowJoinCode}
        onSuccess={() => { checkAppState(); }}
      />
    </div>
  );
}