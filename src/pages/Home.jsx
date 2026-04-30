import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
"Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit. — Matthew 28:19"];


export default function Home() {
  const { user, checkAppState } = useAuth();
  const queryClient = useQueryClient();
  const [showJoinCode, setShowJoinCode] = useState(false);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Track oversight_leader_id reactively — subscribe to User entity changes
  const [oversightLeaderId, setOversightLeaderId] = useState(user?.oversight_leader_id || null);

  // Sync from auth context on mount and when user changes
  useEffect(() => {
    setOversightLeaderId(user?.oversight_leader_id || null);
  }, [user?.oversight_leader_id]);

  // Subscribe to real-time User changes so the card hides the moment oversight_leader_id is set
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.User.subscribe((event) => {
      if (event.id === user.id && event.data?.oversight_leader_id) {
        setOversightLeaderId(event.data.oversight_leader_id);
      }
    });
    return unsub;
  }, [user?.id]);

  const olId = oversightLeaderId || (isAdmin ? user?.id : null);
  const hasGroup = isAdmin || !!oversightLeaderId;
  const today = format(new Date(), "yyyy-MM-dd");
  const tagline = useMemo(() => TAGLINES[new Date().getDay() % TAGLINES.length], []);

  const { data: logs = [] } = useQuery({
    queryKey: ["dailyLogs", user?.email],
    queryFn: () => base44.entities.DailyLog.filter({ created_by: user.email }, "-date", 60),
    enabled: !!user?.email
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges", user?.email],
    queryFn: () => base44.entities.ChallengeSelection.filter({ created_by: user.email }, "-created_date", 20),
    enabled: !!user?.email
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["weeklyUpdates", user?.email],
    queryFn: () => base44.entities.WeeklyUpdate.filter({ created_by: user.email }, "-created_date", 10),
    enabled: !!user?.email
  });

  const todayLog = logs.find((l) => l.date === today);

  const streak = useMemo(() => {
    let count = 0;
    const sorted = [...logs]
      .filter((l) => l.bible_reading_minutes > 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let checkDate = new Date();
    // If no log today yet, start checking from yesterday
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
    .filter((l) => {
      const d = parseISO(l.date);
      return d >= weekStart && d <= weekEnd;
    })
    .reduce((sum, l) => sum + (l.bible_reading_minutes || 0), 0);
  const weeklyPrayer = logs
    .filter((l) => {
      const d = parseISO(l.date);
      return d >= weekStart && d <= weekEnd;
    })
    .reduce((sum, l) => sum + (l.prayer_minutes || 0), 0);

  const activeChallenge = challenges.find(
    (c) => c.status === "in_progress" || c.status === "not_started"
  );

  return (
    <div className="px-5 pt-6 space-y-5">
      {/* Header */}
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

      {/* No Leader Alert */}
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

      {/* Tagline */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl p-4 border border-primary/20">
        <p className="text-sm font-medium text-primary italic leading-relaxed">
          "Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit."
        </p>
        <p className="text-xs text-primary/70 font-semibold mt-2">— Matthew 28:19</p>
      </div>

      {/* Daily Check-in */}
      <DailyCheckIn todayLog={todayLog} streak={streak} olId={olId} />

      {/* Weekly Summary */}
      <WeeklySummary
        weeklyBible={weeklyBible}
        weeklyPrayer={weeklyPrayer}
        activeChallenge={activeChallenge}
      />

      {/* Recent Activity */}
      <RecentActivity logs={logs.slice(0, 5)} updates={updates.slice(0, 5)} />

      {/* Accountability Group */}
      <AccountabilityGroupSection user={user} />

      {/* Join Code Form */}
      <JoinCodeForm
        open={showJoinCode}
        onOpenChange={setShowJoinCode}
        onSuccess={() => { checkAppState(); }}
      />
    </div>
  );
}