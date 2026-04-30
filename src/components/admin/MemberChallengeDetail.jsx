import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, CheckCircle2, Clock, PlayCircle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_COLOR = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-green-500/10 text-green-400",
};
const STATUS_LABEL = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

function UpdateCard({ update }) {
  return (
    <div className="bg-secondary/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">Week {update.week_number}</p>
        {update.progress != null && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
            {update.progress}% progress
          </span>
        )}
      </div>
      {update.what_done && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">What they did</p>
          <p className="text-sm text-foreground">{update.what_done}</p>
        </div>
      )}
      {update.obstacles && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Obstacles</p>
          <p className="text-sm text-foreground">{update.obstacles}</p>
        </div>
      )}
      {update.learnings && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Learnings</p>
          <p className="text-sm text-foreground">{update.learnings}</p>
        </div>
      )}
    </div>
  );
}

function ChallengeSection({ challenge, updates }) {
  const challengeUpdates = updates
    .filter((u) => u.challenge_id === challenge.id)
    .sort((a, b) => a.week_number - b.week_number);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{challenge.challenge_title}</p>
          <p className="text-xs text-muted-foreground">{challenge.challenge_category} · {challenge.month}</p>
        </div>
        <Badge className={`text-[10px] shrink-0 ${STATUS_COLOR[challenge.status]}`}>
          {STATUS_LABEL[challenge.status]}
        </Badge>
      </div>

      {challengeUpdates.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">No updates submitted yet.</p>
      ) : (
        <div className="space-y-2">
          {challengeUpdates.map((u) => <UpdateCard key={u.id} update={u} />)}
        </div>
      )}

      {challenge.final_summary && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
          <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wider mb-1">Final Summary</p>
          <p className="text-sm text-foreground">{challenge.final_summary}</p>
        </div>
      )}
    </div>
  );
}

export default function MemberChallengeDetail({ memberEmail, memberName, olId, onClose }) {
  const { data: selections = [], isLoading: loadingSelections } = useQuery({
    queryKey: ["memberSelections", memberEmail],
    queryFn: () =>
      base44.entities.ChallengeSelection.filter(
        { oversight_leader_id: olId },
        "-created_date",
        100
      ).then((d) => d.filter((s) => s.created_by === memberEmail)),
    enabled: !!memberEmail && !!olId,
  });

  const { data: updates = [], isLoading: loadingUpdates } = useQuery({
    queryKey: ["memberUpdates", memberEmail],
    queryFn: () =>
      base44.entities.WeeklyUpdate.filter(
        { oversight_leader_id: olId },
        "-created_date",
        200
      ).then((d) => d.filter((u) => u.created_by === memberEmail)),
    enabled: !!memberEmail && !!olId,
  });

  const active = selections.filter((s) => s.status === "in_progress" || s.status === "not_started");
  const completed = selections.filter((s) => s.status === "completed");
  const isLoading = loadingSelections || loadingUpdates;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col" style={{ maxHeight: "90dvh" }}>
        {/* Header — always visible */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 sticky top-0 bg-card z-10">
          <div>
            <p className="font-bold text-base">{memberName || memberEmail}</p>
            <p className="text-xs text-muted-foreground">{memberEmail}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && selections.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No challenges selected yet.</p>
            </div>
          )}

          {/* Active challenges */}
          {!isLoading && active.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5 text-primary" /> Active Challenge
              </p>
              {active.map((c) => (
                <ChallengeSection key={c.id} challenge={c} updates={updates} />
              ))}
            </div>
          )}

          {/* Completed challenges */}
          {!isLoading && completed.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Completed Challenges
              </p>
              {completed.map((c) => (
                <ChallengeSection key={c.id} challenge={c} updates={updates} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}