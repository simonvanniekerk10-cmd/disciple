import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { BarChart2, CheckCircle2, PlayCircle, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MemberChallengeDetail from "@/components/admin/MemberChallengeDetail";

export default function ChallengeDashboard() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: selections = [], isLoading } = useQuery({
    queryKey: ["adminChallengeSelections", user?.id],
    queryFn: () =>
      base44.entities.ChallengeSelection.filter(
        { oversight_leader_id: user?.id },
        "-created_date",
        200
      ),
    enabled: !!user?.id,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["groupUsers", user?.id],
    queryFn: () => base44.entities.User.filter({ oversight_leader_id: user?.id }),
    enabled: !!user?.id,
  });

  const notStarted = selections.filter((s) => s.status === "not_started");
  const inProgress = selections.filter((s) => s.status === "in_progress");
  const completed = selections.filter((s) => s.status === "completed");

  // Group selections by user
  const byUser = {};
  selections.forEach((s) => {
    const email = s.created_by || "unknown";
    if (!byUser[email]) byUser[email] = { email, active: null, completed: 0 };
    if (s.status === "in_progress" || s.status === "not_started") {
      byUser[email].active = s;
    }
    if (s.status === "completed") {
      byUser[email].completed += 1;
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

      {/* Summary stats */}
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

      {/* Per-user breakdown */}
      {Object.keys(byUser).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">By Disciple</p>
          {Object.values(byUser).map((u) => (
            <div
              key={u.email}
              className="rounded-xl px-4 py-3 cursor-pointer transition-colors hover:opacity-90"
              style={{background:'#EEF3FB',border:'1px solid #C8D8F0'}}
              onClick={() => setSelectedUser(u)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{color:'#1A1A40'}}>{u.email}</p>
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
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
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

      {selectedUser && (
        <MemberChallengeDetail
          memberEmail={selectedUser.email}
          memberName={allUsers.find((u) => u.email === selectedUser.email)?.full_name}
          olId={user?.id}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}