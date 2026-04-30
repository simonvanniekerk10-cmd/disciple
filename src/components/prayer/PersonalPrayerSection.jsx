import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Lock, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function PersonalPrayerSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const recordIdRef = useRef(null);
  const autoSaveTimer = useRef(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["personalPrayer", user?.email],
    queryFn: () => base44.entities.PersonalPrayerItem.filter({ created_by: user.email }, "-created_date", 1),
    enabled: !!user?.email,
  });

  // Load saved text on first fetch
  useEffect(() => {
    if (items.length > 0) {
      setText(items[0].title || "");
      recordIdRef.current = items[0].id;
    }
  }, [items]);

  const saveText = async (value) => {
    setSaving(true);
    if (recordIdRef.current) {
      await base44.entities.PersonalPrayerItem.update(recordIdRef.current, { title: value });
    } else {
      const created = await base44.entities.PersonalPrayerItem.create({ title: value });
      recordIdRef.current = created.id;
    }
    queryClient.invalidateQueries({ queryKey: ["personalPrayer", user?.email] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    setSaved(false);

    // Auto-save after 2 seconds of no typing
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveText(value);
    }, 2000);
  };

  const handleSave = () => {
    clearTimeout(autoSaveTimer.current);
    saveText(text);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Personal Prayer List</h2>
        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">Private</span>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        This list is completely private — your leader cannot see it.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={handleChange}
            placeholder="Write your prayer list here — people, situations, anything on your heart..."
            className="bg-card border border-border resize-none text-sm leading-relaxed"
            rows={10}
            style={{ whiteSpace: "pre-wrap" }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {saving ? "Saving..." : saved ? (
                <span className="flex items-center gap-1 text-green-600"><Check className="w-3 h-3" /> Saved</span>
              ) : "Auto-saves as you type"}
            </span>
            <Button onClick={handleSave} disabled={saving} size="sm" className="bg-primary text-primary-foreground">
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}