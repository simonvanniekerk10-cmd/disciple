import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHALLENGE_CATEGORIES } from "@/components/data/challengeData";

const TIME_FRAME_OPTIONS = [
  { value: "group_default", label: "Group Default" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "none", label: "No Time Frame" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  outcome: "",
  category: "",
  time_frame_override: "group_default",
};

export default function ChallengeBuilder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const [newCategory, setNewCategory] = useState("");

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["groupChallenges", user?.id],
    queryFn: () =>
      base44.entities.GroupChallenge.filter({ oversight_leader_id: user.id }, "sort_order", 200),
    enabled: !!user?.id,
  });

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditingChallenge("new");
  };

  const openEdit = (ch) => {
    setForm({
      title: ch.title || "",
      description: ch.description || "",
      outcome: ch.outcome || "",
      category: ch.category || "",
      time_frame_override: ch.time_frame_override || "group_default",
    });
    setEditingChallenge(ch);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.category.trim()) return;
    setSaving(true);
    const categoryToUse = form.category === "__new__" ? newCategory.trim() : form.category;
    if (!categoryToUse) { setSaving(false); return; }

    const payload = { ...form, category: categoryToUse, oversight_leader_id: user.id };

    if (editingChallenge === "new") {
      payload.sort_order = challenges.length;
      await base44.entities.GroupChallenge.create(payload);
    } else {
      await base44.entities.GroupChallenge.update(editingChallenge.id, payload);
    }
    queryClient.invalidateQueries({ queryKey: ["groupChallenges"] });
    setEditingChallenge(null);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.GroupChallenge.delete(id);
    queryClient.invalidateQueries({ queryKey: ["groupChallenges"] });
  };

  // Group by category
  const byCategory = {};
  challenges.forEach((ch) => {
    const cat = ch.category || "Uncategorised";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(ch);
  });

  const allCategories = [
    ...CHALLENGE_CATEGORIES.map((c) => c.name),
    ...Object.keys(byCategory).filter(
      (k) => !CHALLENGE_CATEGORIES.find((c) => c.name === k)
    ),
    "__new__",
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base">Challenge Builder</h2>
        </div>
        <Button size="sm" onClick={openNew} className="bg-primary text-primary-foreground text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Challenge
        </Button>
      </div>



      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {Object.entries(byCategory).map(([cat, chs]) => {
        const isExpanded = expandedCats[cat] !== false;
        return (
          <div key={cat} className="border border-border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-secondary hover:bg-secondary/80 transition-colors"
              onClick={() => setExpandedCats((p) => ({ ...p, [cat]: !isExpanded }))}
            >
              <span className="font-semibold text-sm">{cat}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{chs.length}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {isExpanded && (
              <div className="divide-y divide-border">
                {chs.map((ch) => (
                  <div key={ch.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug">{ch.title}</p>
                      {ch.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ch.description}</p>
                      )}
                      {ch.time_frame_override && ch.time_frame_override !== "group_default" && (
                        <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {TIME_FRAME_OPTIONS.find((t) => t.value === ch.time_frame_override)?.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(ch)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ch.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit / Create Dialog */}
      <Dialog open={!!editingChallenge} onOpenChange={() => setEditingChallenge(null)}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChallenge === "new" ? "New Challenge" : "Edit Challenge"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="bg-secondary border-0 mt-1.5"
                placeholder="Short challenge name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-secondary border-0 mt-1.5 resize-none"
                rows={3}
                placeholder="What does the leader need to do?"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Outcome</label>
              <Textarea
                value={form.outcome}
                onChange={(e) => setForm((p) => ({ ...p, outcome: e.target.value }))}
                className="bg-secondary border-0 mt-1.5 resize-none"
                rows={2}
                placeholder="What growth or result is expected?"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full mt-1.5 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select category…</option>
                {allCategories
                  .filter((c) => c !== "__new__")
                  .map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                <option value="__new__">+ Create new category</option>
              </select>
              {form.category === "__new__" && (
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-secondary border-0 mt-2"
                  placeholder="New category name"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time Frame</label>
              <select
                value={form.time_frame_override}
                onChange={(e) => setForm((p) => ({ ...p, time_frame_override: e.target.value }))}
                className="w-full mt-1.5 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {TIME_FRAME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.category.trim()}
              className="w-full bg-primary text-primary-foreground font-semibold"
            >
              {saving ? "Saving..." : editingChallenge === "new" ? "Create Challenge" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}