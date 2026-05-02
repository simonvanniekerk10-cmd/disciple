import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ClipboardList, Pencil } from "lucide-react";
import { useGroupContext } from "@/components/hooks/useGroupContext";
import { useAuth } from "@/lib/AuthContext";

const FREQ_UPDATE_LABEL = {
  weekly: "This Week's Update",
  fortnightly: "This Fortnight's Update",
  monthly: "This Month's Update",
  none: "Progress Update",
};

const FREQ_DONE_LABEL = {
  weekly: "What have you done this week?",
  fortnightly: "What have you done this fortnight?",
  monthly: "What have you done this month?",
  none: "What have you done so far?",
};

export default function Updates() {
  const [whatDone, setWhatDone] = useState("");
  const [obstacles, setObstacles] = useState("");
  const [learnings, setLearnings] = useState("");
  const [progress, setProgress] = useState([25]);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const queryClient = useQueryClient();

  const { oversight_leader_id, isLoading: loadingCtx } = useGroupContext();
  const { user } = useAuth();

  const { data: groupSettings } = useQuery({
    queryKey: ["groupSettings", oversight_leader_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('group_settings')
        .select('*')
        .eq('oversight_leader_id', oversight_leader_id)
        .single();
      return data;
    },
    enabled: !!oversight_leader_id,
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenge_selections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["weeklyUpdates", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_updates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const frequency = groupSettings?.challenge_frequency || "monthly";
  const updateLabel = FREQ_UPDATE_LABEL[frequency] || "Progress Update";
  const doneLabel = FREQ_DONE_LABEL[frequency] || "What have you done?";

  if (loadingCtx) {
    return (
      <div className="px-5 pt-6 pb-10 flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeChallenge = challenges.find(
    (c) => c.status === "in_progress" || c.status === "not_started"
  );

  const currentMonth = format(new Date(), "MMMM yyyy");
  const dayOfMonth = new Date().getDate();
  const weekNumber = Math.min(4, Math.ceil(dayOfMonth / 7));

  const activeUpdates = updates.filter(
    (u) => activeChallenge && u.challenge_id === activeChallenge.id
  );

  const handleEdit = (update) => {
    setEditingUpdate(update);
    setWhatDone(update.what_done || "");
    setObstacles(update.obstacles || "");
    setLearnings(update.learnings || "");
    setProgress([update.progress ?? 25]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingUpdate(null);
    setWhatDone("");
    setObstacles("");
    setLearnings("");
    setProgress([25]);
  };

  const handleSubmit = async () => {
    if (!activeChallenge) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      challenge_id: activeChallenge.id,
      challenge_title: activeChallenge.challenge_title,
      week_number: editingUpdate ? editingUpdate.week_number : weekNumber,
      month: editingUpdate ? editingUpdate.month : currentMonth,
      what_done: whatDone,
      obstacles,
      progress: progress[0],
      learnings,
      oversight_leader_id,
    };

    if (editingUpdate) {
      await supabase.from('weekly_updates').update(payload).eq('id', editingUpdate.id);
    } else {
      await supabase.from('weekly_updates').insert(payload);
      if (activeChallenge.status === "not_started") {
        await supabase
          .from('challenge_selections')
          .update({ status: "in_progress" })
          .eq('id', activeChallenge.id);
      }
    }

    setEditingUpdate(null);
    setWhatDone("");
    setObstacles("");
    setLearnings("");
    setProgress([25]);
    queryClient.invalidateQueries({ queryKey: ["weeklyUpdates"] });
    queryClient.invalidateQueries({ queryKey: ["challenges"] });
    setSaving(false);
  };

  const handleComplete = async () => {
    if (!activeChallenge) return;
    setCompleting(true);
    await supabase
      .from('challenge_selections')
      .update({ status: "completed", completed_date: format(new Date(), "yyyy-MM-dd") })
      .eq('id', activeChallenge.id);
    queryClient.invalidateQueries({ queryKey: ["challenges"] });
    setCompleting(false);
  };

  return (
    <div className="px-5 pt-6 pb-10 space-y-6">
      <h1 className="text-2xl font-bold">Updates</h1>

      {activeChallenge ? (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Active Challenge</p>
            <h2 className="font-bold">{activeChallenge.challenge_title}</h2>
            <p className="text-xs text-muted-foreground">{activeChallenge.challenge_category} · {activeChallenge.month}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingUpdate ? `Editing Update #${editingUpdate.week_number}` : updateLabel}
              </h3>
              {editingUpdate && (
                <button onClick={handleCancelEdit} className="text-xs text-muted-foreground underline">
                  Cancel Edit
                </button>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{doneLabel}</label>
              <Textarea value={whatDone} onChange={(e) => setWhatDone(e.target.value)} className="bg-secondary border-0 mt-1.5 resize-none" rows={3} />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Challenges or obstacles?</label>
              <Textarea value={obstacles} onChange={(e) => setObstacles(e.target.value)} className="bg-secondary border-0 mt-1.5 resize-none" rows={3} />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress: {progress[0]}%</label>
              <div className="mt-3 px-1">
                <Slider value={progress} onValueChange={setProgress} min={0} max={100} step={25} className="w-full" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What did you learn?</label>
              <Textarea value={learnings} onChange={(e) => setLearnings(e.target.value)} className="bg-secondary border-0 mt-1.5 resize-none" rows={3} />
            </div>

            <Button onClick={handleSubmit} disabled={saving || !whatDone.trim()} className="w-full bg-primary text-primary-foreground font-semibold">
              {saving ? "Saving..." : editingUpdate ? "Save Changes" : "Submit Update"}
            </Button>

            {!editingUpdate && progress[0] === 100 && (
              <Button onClick={handleComplete} disabled={completing} variant="outline" className="w-full border-primary text-primary font-semibold">
                <CheckCircle className="w-4 h-4 mr-2" />
                {completing ? "Completing..." : "Mark Challenge as Completed"}
              </Button>
            )}
          </div>

          {activeUpdates.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Updates</h2>
              {activeUpdates.map((u) => (
                <div key={u.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">{u.month} · Week {u.week_number}</span>
                      <Badge variant="outline" className="text-[10px]">{u.progress}%</Badge>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1" onClick={() => handleEdit(u)}>
                      <Pencil className="w-3 h-3" />
                      <span className="text-xs">Edit</span>
                    </Button>
                  </div>
                  {u.what_done && <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">What I did</p><p className="text-sm">{u.what_done}</p></div>}
                  {u.obstacles && <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Obstacles</p><p className="text-sm">{u.obstacles}</p></div>}
                  {u.learnings && <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">What I learned</p><p className="text-sm">{u.learnings}</p></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 bg-card rounded-2xl border border-border">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No active challenge.</p>
          <p className="text-muted-foreground text-xs mt-1">Start a challenge first to submit updates.</p>
        </div>
      )}
    </div>
  );
}