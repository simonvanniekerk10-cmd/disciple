import { BookOpen, Heart, Target } from "lucide-react";

export default function WeeklySummary({ weeklyBible, weeklyPrayer, activeChallenge }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-card rounded-2xl p-4 border border-border text-center">
        <BookOpen className="w-5 h-5 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold">{weeklyBible}</p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Min Bible</p>
      </div>
      <div className="bg-card rounded-2xl p-4 border border-border text-center">
        <Heart className="w-5 h-5 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold">{weeklyPrayer}</p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Min Prayer</p>
      </div>
      <div className="bg-card rounded-2xl p-4 border border-border text-center">
        <Target className="w-5 h-5 text-primary mx-auto mb-2" />
        <p className="text-lg font-bold leading-tight">{activeChallenge ? "Active" : "None"}</p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Challenge</p>
      </div>
    </div>
  );
}