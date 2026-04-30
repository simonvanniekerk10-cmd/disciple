import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { ArrowLeft, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function ChallengeHistory() {
  const { user } = useAuth();

  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges", user?.email],
    queryFn: () => base44.entities.ChallengeSelection.filter({ created_by: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["weeklyUpdates", user?.email],
    queryFn: () => base44.entities.WeeklyUpdate.filter({ created_by: user.email }, "-created_date", 100),
    enabled: !!user?.email,
  });

  const completed = challenges.filter((c) => c.status === "completed");

  const getLastUpdate = (challengeId) => {
    return updates
      .filter((u) => u.challenge_id === challengeId)
      .sort((a, b) => b.week_number - a.week_number)[0];
  };

  return (
    <div className="px-5 pt-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/Challenge" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Challenge History</h1>
      </div>

      {completed.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No completed challenges yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Complete your first challenge to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completed.map((ch) => {
            const lastUpdate = getLastUpdate(ch.id);
            return (
              <div key={ch.id} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-sm">{ch.challenge_title}</h3>
                    <p className="text-xs text-muted-foreground">{ch.challenge_category}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary shrink-0">
                    <Trophy className="w-3 h-3 mr-1" />
                    Done
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                  <span>{ch.month}</span>
                  {ch.completed_date && (
                    <span>Completed {format(new Date(ch.completed_date), "MMM d, yyyy")}</span>
                  )}
                </div>
                {lastUpdate && (
                  <div className="mt-3 bg-secondary rounded-xl p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Final Update</p>
                    <p className="text-sm">{lastUpdate.what_done}</p>
                    {lastUpdate.learnings && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{lastUpdate.learnings}"</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}