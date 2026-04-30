import { CheckCircle } from "lucide-react";

export default function ChallengeCard({ challenge, isCompleted, isLocked, onSelect }) {
  return (
    <button
      onClick={() => !isCompleted && !isLocked && onSelect(challenge)}
      disabled={isCompleted || isLocked}
      className={`w-full text-left rounded-2xl p-4 border transition-all duration-200 ${
        isCompleted
          ? "bg-primary/5 border-primary/30 opacity-60"
          : isLocked
          ? "bg-muted/30 border-border opacity-40 cursor-not-allowed"
          : "bg-card border-border hover:border-primary/40 active:scale-[0.98]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              #{challenge.number}
            </span>
            {isCompleted && <CheckCircle className="w-4 h-4 text-primary" />}
          </div>
          <h3 className="font-semibold text-sm leading-snug">{challenge.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{challenge.description}</p>
        </div>
      </div>
    </button>
  );
}