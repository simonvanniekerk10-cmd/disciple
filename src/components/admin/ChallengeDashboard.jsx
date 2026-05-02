import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { BarChart2, CheckCircle2, PlayCircle, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ChallengeDashboard() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);

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

  const { data: selections = [], isLoading } = useQuery({
    queryKey: ["adminChallengeSelections", user?.id],
    queryFn: async () => {
      const memberIds = members.map(m => m.id);
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from('challenge_selections')
        .select('*')
        .in('user_id', memberIds)
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: members.length > 0,
  });

  const notStarted = selections.filter((s) => s.status === "not_started");
  const inProgress = selections.filter((s) => s.status === "in_progress");
  const completed = selections.filter((s) => s.status === "completed");

  const byUser = {};
  selections.forEach((s) => {
    const userId = s.user_id || "unknown";
    if (!byUser[userId]) {
      const member = members.find(m => m.id === userId);
      byUser[userId] = {
        userId,
        name: member?.display_name || member?.full_name || member?.email || userId,
        active: null,
        completed: 0
      };
    }
    if (s.status === "in_progress" || s.status === "not_started") {
      byUser[userId].active = s;
    }
    if (s.status === "completed") {
      byUser[userId].completed += 1;
    }
  });

  const statusColor = {
    not_started: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/10 text-primary",
    completed: "bg-green-500/10 text-green-400",
  };

  const statusLabel = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-base">Challenge Dashboard</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center" style={{background:'#EEF3FB',border:'1px solid #C8D8F0'}}>
          <Clock className="w-4 h-4 mx-auto mb-1" style={{color:'#1E2D50'}} />
          <p className="text-lg font-bold" style={{color:'#1E2D50'}}>{notStarted.length}</p>
          <p className="text-[10px]" style={{color:'#6B82AA'}}>Not Started</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{background:'#EEF3FB',border:'1px solid #C8D8F0'}}>
          <PlayCircle className="w-4 h-4 mx-auto mb-1" style={{color:'#1E2D50'}} />
          <p className="text-lg font-bold" style={{color:'#1E2D50'}}>{inProgress.length}</p>
          <p className="text-[10px]" style={{color:'#6B82AA'}}>In Progress</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{background:'#EEF3FB',border:'1px solid #C8D8F0'}}>
          <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold" style={{color:'#1E2D50'}}>{completed.length}</p>
          <p className="text-[10px]" style={{color:'#6B82AA'}}>Completed</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {Object.keys(byUser).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">By Disciple</p>
          {Object.values(byUser).map((u) => (
            <div
              key={u.userId}
              className="rounded-xl px-4 py-3 transition-colors hover:opacity-90"
              style={{background:'#EEF3FB',border:'1px solid #C8D8F0'}}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{color:'#1A1A40'}}>{u.name}</p>
                  {u.active ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.active.challenge_title}</p>
                      <Badge className={`mt-1 text-[10px] ${statusColor[u.active.status]}`}>
                        {statusLabel[u.active.status]}
                      </Badge>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">No active challenge</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-base font-bold text-primary">{u.completed}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && selections.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No challenge activity yet from your group.
        </p>
      )}
    </div>
  );
}