import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { ClipboardList } from "lucide-react";
import { differenceInDays, parseISO, startOfWeek, endOfWeek } from "date-fns";

function getStatusColor(bibleDays, prayerDays) {
  const total = bibleDays + prayerDays;
  if (total >= 8) return "green";
  if (total >= 4) return "amber";
  return "red";
}

const COLOR_EMOJI = { green: "🟢", amber: "🟡", red: "🔴" };
const COLOR_BADGE = {
  green: "bg-green-500/10 text-green-400",
  amber: "bg-yellow-500/10 text-yellow-400",
  red: "bg-red-500/10 text-red-400",
};

export default function WeeklyCareSummary() {
  const { user } = useAuth();

  const { data: members = [] } = useQuery({
    queryKey: ["groupMembers", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('oversight_leader_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["groupLogsWeekly", user?.id],
    queryFn: async () => {
      const memberIds = members.map(m => m.id);
      if (memberIds.length === 0) return [];
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .in('user_id', memberIds)
        .gte('date', weekStart);
      return data || [];
    },
    enabled: members.length > 0,
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ["groupChallengesWeekly", user?.id],
    queryFn: async () => {
      const memberIds = members.map(m => m.id);
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from('challenge_selections')
        .select('*')
        .in('user_id', memberIds);
      return data || [];
    },
    enabled: members.length > 0,
  });

  const enriched = members.map(m => {
    const memberLogs = logs.filter(l => l.user_id === m.id);
    const bibleDays = memberLogs.filter(l => l.bible_reading_minutes > 0).length;
    const prayerDays = memberLogs.filter(l => l.prayer_minutes > 0).length;
    const activeChallenge = challenges.find(c => c.user_id === m.id && (c.status === "in_progress" || c.status === "not_started"));
    const statusColor = getStatusColor(bibleDays, prayerDays);
    return { ...m, bibleDays, prayerDays, activeChallenge, statusColor };
  });

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Weekly Care Summary</h2>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No disciples in your group yet.</p>
      ) : (
        <div className="space-y-2">
          {enriched.map((m) => (
            <div key={m.id} className="bg-secondary rounded-xl border border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{COLOR_EMOJI[m.statusColor]}</span>
                  <div>
                    <p className="text-sm font-semibold">{m.display_name || m.full_name || m.email}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${COLOR_BADGE[m.statusColor]}`}>
                  {m.statusColor.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-card rounded-lg py-2">
                  <p className="text-base font-bold text-primary">{m.bibleDays}</p>
                  <p className="text-[10px] text-muted-foreground">Bible Days</p>
                </div>
                <div className="bg-card rounded-lg py-2">
                  <p className="text-base font-bold text-primary">{m.prayerDays}</p>
                  <p className="text-[10px] text-muted-foreground">Prayer Days</p>
                </div>
                <div className="bg-card rounded-lg py-2">
                  <p className="text-xs font-bold text-primary capitalize">{m.activeChallenge ? "Active" : "None"}</p>
                  <p className="text-[10px] text-muted-foreground">Challenge</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}