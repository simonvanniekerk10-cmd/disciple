import { Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusLabels = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

const statusColors = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-green-500/10 text-green-400",
};

export default function ActiveChallengeDisplay({ challenge, challengeData, onRemove }) {
  if (!challenge) return null;

  return (
    <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-2xl border border-primary/20 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Active Challenge</span>
      </div>
      <h2 className="text-lg font-bold leading-tight">{challenge.challenge_title}</h2>
      <p className="text-xs text-muted-foreground mt-1">{challenge.challenge_category}</p>
      {challengeData?.outcome && (
        <p className="text-sm text-muted-foreground mt-2">{challengeData.outcome}</p>
      )}
      <div className="flex items-center mt-4">
        <Badge className={statusColors[challenge.status]}>
          {statusLabels[challenge.status]}
        </Badge>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border"
        >
          <Trash2 className="w-3 h-3 mr-1.5" />
          Remove this challenge
        </Button>
      )}
    </div>
  );
}