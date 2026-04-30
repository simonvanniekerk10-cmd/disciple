import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useGroupContext } from "@/components/hooks/useGroupContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import ChallengeUpdateForm from "./ChallengeUpdateForm";

export default function ChallengeUpdatesSection({ challenge, frequency }) {
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [showUpdates, setShowUpdates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { oversight_leader_id } = useGroupContext();

  const { data: updates = [] } = useQuery({
    queryKey: ["weeklyUpdates", user?.email],
    queryFn: () => base44.entities.WeeklyUpdate.filter({ created_by: user.email }, "-created_date", 100),
    enabled: !!user?.email,
  });

  const currentMonth = format(new Date(), "MMMM yyyy");
  const dayOfMonth = new Date().getDate();
  const weekNumber = Math.min(4, Math.ceil(dayOfMonth / 7));

  const challengeUpdates = updates.filter((u) => u.challenge_id === challenge.id);

  const handleEdit = (update) => {
    setEditingUpdate(update);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUpdate(null);
  };

  const handleSubmit = async ({ whatDone, obstacles, learnings, progress }) => {
    setSaving(true);
    const payload = {
      challenge_id: challenge.id,
      challenge_title: challenge.challenge_title,
      week_number: editingUpdate ? editingUpdate.week_number : weekNumber,
      month: editingUpdate ? editingUpdate.month : currentMonth,
      what_done: whatDone,
      obstacles,
      progress,
      learnings,
      oversight_leader_id,
    };

    if (editingUpdate) {
      await base44.entities.WeeklyUpdate.update(editingUpdate.id, payload);
    } else {
      await base44.entities.WeeklyUpdate.create(payload);
      if (challenge.status === "not_started") {
        await base44.entities.ChallengeSelection.update(challenge.id, { status: "in_progress" });
        queryClient.invalidateQueries({ queryKey: ["challenges"] });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["weeklyUpdates"] });
    setSaving(false);
    setShowForm(false);
    setEditingUpdate(null);
  };

  const handleComplete = async () => {
    setCompleting(true);
    await base44.entities.ChallengeSelection.update(challenge.id, {
      status: "completed",
      completed_date: format(new Date(), "yyyy-MM-dd"),
    });
    queryClient.invalidateQueries({ queryKey: ["challenges"] });
    setCompleting(false);
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Submit Update button (when form is not shown) */}
      {!showForm && (
        <div className="flex gap-2">
          <Button
            onClick={() => { setEditingUpdate(null); setShowForm(true); }}
            className="flex-1 bg-primary text-primary-foreground font-semibold"
          >
            Submit Update
          </Button>
          <Button
            onClick={handleComplete}
            disabled={completing}
            variant="outline"
            className="border-primary/30 text-primary"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            {completing ? "..." : "Complete"}
          </Button>
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <ChallengeUpdateForm
          frequency={frequency}
          editingUpdate={editingUpdate}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          saving={saving}
        />
      )}

      {/* My Updates collapsible */}
      {challengeUpdates.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary/40 transition-colors"
            onClick={() => setShowUpdates(!showUpdates)}
          >
            <span>My Updates ({challengeUpdates.length})</span>
            {showUpdates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showUpdates && (
            <div className="divide-y divide-border">
              {challengeUpdates.map((u) => (
                <div key={u.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        {u.month} · Week {u.week_number}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{u.progress}%</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => handleEdit(u)}
                    >
                      <Pencil className="w-3 h-3" />
                      <span className="text-xs">Edit</span>
                    </Button>
                  </div>
                  {u.what_done && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">What I did</p>
                      <p className="text-sm">{u.what_done}</p>
                    </div>
                  )}
                  {u.obstacles && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Obstacles</p>
                      <p className="text-sm">{u.obstacles}</p>
                    </div>
                  )}
                  {u.learnings && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">What I learned</p>
                      <p className="text-sm">{u.learnings}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}