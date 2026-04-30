import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGroupContext } from "@/components/hooks/useGroupContext";
import { useAuth } from "@/lib/AuthContext";
import ActiveChallengeDisplay from "../components/challenge/ActiveChallengeDisplay";
import ChallengeUpdatesSection from "../components/challenge/ChallengeUpdatesSection";

const FREQ_LABELS = {
  weekly: "Weekly Challenge",
  fortnightly: "Fortnightly Challenge",
  monthly: "Monthly Challenge",
  none: "Challenge",
};

export default function Challenge() {
  const [confirmChallenge, setConfirmChallenge] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const currentPeriod = format(new Date(), "MMMM yyyy");

  const { oversight_leader_id, isLoading: loadingCtx } = useGroupContext();

  // Fetch the OL's challenge pool
  const { data: pool = [], isLoading: loadingPool } = useQuery({
    queryKey: ["groupChallenges", oversight_leader_id],
    queryFn: () =>
      base44.entities.GroupChallenge.filter(
        { oversight_leader_id },
        "sort_order",
        200
      ),
    enabled: !!oversight_leader_id,
  });

  // Fetch group frequency setting
  const { data: groupSettings } = useQuery({
    queryKey: ["groupSettings", oversight_leader_id],
    queryFn: () =>
      base44.entities.GroupSettings.filter(
        { oversight_leader_id },
        "-created_date",
        1
      ),
    enabled: !!oversight_leader_id,
    select: (data) => data[0] || null,
  });

  const frequency = groupSettings?.challenge_frequency || "monthly";
  const pageTitle = FREQ_LABELS[frequency] || "Challenges";

  const { user } = useAuth();

  // Fetch my selections — scoped to current user only
  const { data: selections = [] } = useQuery({
    queryKey: ["challenges", user?.email],
    queryFn: () => base44.entities.ChallengeSelection.filter({ created_by: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  const activeChallenge = selections.find(
    (c) => c.status === "in_progress" || c.status === "not_started"
  );
  const completedSourceIds = new Set(
    selections.filter((c) => c.status === "completed" && c.challenge_source_id).map((c) => c.challenge_source_id)
  );
  const completedTitles = new Set(
    selections.filter((c) => c.status === "completed").map((c) => c.challenge_title)
  );

  // Count completions per category
  const categoryCounts = {};
  selections.filter((c) => c.status === "completed").forEach((c) => {
    categoryCounts[c.challenge_category] = (categoryCounts[c.challenge_category] || 0) + 1;
  });

  const handleRemove = async () => {
    if (!activeChallenge) return;
    await base44.entities.ChallengeSelection.delete(activeChallenge.id);
    queryClient.invalidateQueries({ queryKey: ["challenges"] }); // prefix match catches ["challenges", email]
  };

  const handleSelect = async () => {
    if (!confirmChallenge) return;
    setSaving(true);
    await base44.entities.ChallengeSelection.create({
      challenge_source_id: confirmChallenge.id,
      challenge_number: confirmChallenge.default_number || null,
      challenge_title: confirmChallenge.title,
      challenge_category: confirmChallenge.category,
      month: currentPeriod,
      status: "in_progress",
      oversight_leader_id,
    });
    setConfirmChallenge(null);
    queryClient.invalidateQueries({ queryKey: ["challenges"] }); // prefix match catches ["challenges", email]
    setSaving(false);
  };

  // Group pool by category
  const byCategory = {};
  pool.forEach((ch) => {
    const cat = ch.category || "Uncategorised";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(ch);
  });

  const isLoading = loadingCtx || (!!oversight_leader_id && loadingPool);

  return (
    <div className="px-5 pt-6 pb-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pageTitle}</p>
        </div>
        <Link to="/ChallengeHistory">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <History className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      {activeChallenge && (
        <>
          <ActiveChallengeDisplay challenge={activeChallenge} onRemove={handleRemove} />
          <ChallengeUpdatesSection challenge={activeChallenge} frequency={frequency} />
        </>
      )}

      {!activeChallenge && !isLoading && (
        <div className="bg-card rounded-2xl p-5 border border-border text-center">
          <p className="text-sm text-muted-foreground">No active challenge. Choose one below!</p>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {!isLoading && pool.length === 0 && (
        <div className="bg-card rounded-2xl p-6 border border-border text-center">
          <p className="text-sm text-muted-foreground">
            Your Oversight Leader hasn't set up challenges yet. Check back soon!
          </p>
        </div>
      )}

      {!isLoading && Object.entries(byCategory).map(([cat, challenges]) => (
        <div key={cat}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">{cat}</h2>
            <span className="text-xs text-muted-foreground">
              {categoryCounts[cat] || 0} completed
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {challenges.map((ch) => {
              const isCompleted = completedSourceIds.has(ch.id) || completedTitles.has(ch.title);
              const isActive = activeChallenge?.challenge_source_id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => !isCompleted && !activeChallenge && setConfirmChallenge(ch)}
                  disabled={isCompleted || !!activeChallenge}
                  className={`w-full text-left rounded-2xl p-4 border transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 border-primary/40"
                      : isCompleted
                      ? "bg-primary/5 border-primary/20 opacity-60"
                      : activeChallenge
                      ? "bg-card border-border opacity-40 cursor-not-allowed"
                      : "bg-card border-border hover:border-primary/40 active:scale-[0.98]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm leading-snug">{ch.title}</h3>
                      {ch.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ch.description}</p>
                      )}
                      {ch.time_frame_override && ch.time_frame_override !== "group_default" && (
                        <span className="inline-block mt-1.5 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {ch.time_frame_override === "none" ? "No Time Frame" : ch.time_frame_override.charAt(0).toUpperCase() + ch.time_frame_override.slice(1)}
                        </span>
                      )}
                    </div>
                    {isCompleted && (
                      <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full shrink-0">
                        Done
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={!!confirmChallenge} onOpenChange={() => setConfirmChallenge(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Start Challenge?</DialogTitle>
          </DialogHeader>
          {confirmChallenge && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold">{confirmChallenge.title}</h3>
                {confirmChallenge.description && (
                  <p className="text-sm text-muted-foreground mt-1">{confirmChallenge.description}</p>
                )}
                {confirmChallenge.outcome && (
                  <div className="mt-3 bg-secondary rounded-xl p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expected Outcome</p>
                    <p className="text-sm">{confirmChallenge.outcome}</p>
                  </div>
                )}
              </div>
              <Button
                onClick={handleSelect}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground font-semibold"
              >
                {saving ? "Starting..." : "Start Challenge"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}