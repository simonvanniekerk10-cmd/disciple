import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";

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

export default function ChallengeUpdateForm({ frequency = "monthly", editingUpdate, onSubmit, onCancel, saving }) {
  const [whatDone, setWhatDone] = useState(editingUpdate?.what_done || "");
  const [obstacles, setObstacles] = useState(editingUpdate?.obstacles || "");
  const [learnings, setLearnings] = useState(editingUpdate?.learnings || "");
  const [progress, setProgress] = useState([editingUpdate?.progress ?? 25]);

  const updateLabel = FREQ_UPDATE_LABEL[frequency] || "Progress Update";
  const doneLabel = FREQ_DONE_LABEL[frequency] || "What have you done?";

  const handleSubmit = () => {
    onSubmit({ whatDone, obstacles, learnings, progress: progress[0] });
  };

  return (
    <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {editingUpdate ? `Editing Update` : updateLabel}
        </h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{doneLabel}</label>
        <Textarea
          value={whatDone}
          onChange={(e) => setWhatDone(e.target.value)}
          className="bg-secondary border-0 mt-1.5 resize-none"
          rows={3}
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Challenges or obstacles?</label>
        <Textarea
          value={obstacles}
          onChange={(e) => setObstacles(e.target.value)}
          className="bg-secondary border-0 mt-1.5 resize-none"
          rows={3}
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Progress: {progress[0]}%
        </label>
        <div className="mt-3 px-1">
          <Slider
            value={progress}
            onValueChange={setProgress}
            min={0}
            max={100}
            step={25}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What did you learn?</label>
        <Textarea
          value={learnings}
          onChange={(e) => setLearnings(e.target.value)}
          className="bg-secondary border-0 mt-1.5 resize-none"
          rows={3}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={saving || !whatDone.trim()}
        className="w-full bg-primary text-primary-foreground font-semibold"
      >
        {saving ? "Saving..." : editingUpdate ? "Save Changes" : "Submit Update"}
      </Button>
    </div>
  );
}