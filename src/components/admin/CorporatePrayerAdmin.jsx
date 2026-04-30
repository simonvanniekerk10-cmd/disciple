import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Pencil, Trash2, X, Check } from "lucide-react";

export default function CorporatePrayerAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["corporatePrayer", user?.id],
    queryFn: () => base44.entities.CorporatePrayerItem.filter({ oversight_leader_id: user.id }, "-created_date", 100),
    enabled: !!user?.id,
  });

  const openNew = () => {
    setEditingItem(null);
    setTitle(""); setDescription(""); setDate("");
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setDate(item.date || "");
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    setTitle(""); setDescription(""); setDate("");
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const payload = { oversight_leader_id: user.id, title, description, date: date || null };
    if (editingItem) {
      await base44.entities.CorporatePrayerItem.update(editingItem.id, payload);
    } else {
      await base44.entities.CorporatePrayerItem.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["corporatePrayer"] });
    handleCancel();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.CorporatePrayerItem.delete(id);
    queryClient.invalidateQueries({ queryKey: ["corporatePrayer"] });
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex-1">Corporate Prayer</h2>
        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{items.length} items</span>
      </div>

      {showForm && (
        <div className="p-4 border-b border-border space-y-3 bg-secondary/30">
          <Input
            placeholder="Prayer item title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card border-border"
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-card border-border"
            rows={4}
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-card border-border"
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 bg-primary text-primary-foreground">
              {saving ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="px-4 py-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No corporate prayer items yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add items for your whole group to pray for.</p>
        </div>
      )}

      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && <p className="text-xs text-muted-foreground mt-0.5" style={{ whiteSpace: "pre-wrap" }}>{item.description}</p>}
              {item.date && <p className="text-[10px] text-muted-foreground mt-0.5">{item.date}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(item)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border">
        <Button onClick={openNew} variant="outline" className="w-full border-dashed text-muted-foreground gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Prayer Item
        </Button>
      </div>
    </div>
  );
}