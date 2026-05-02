import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useGroupContext } from "@/components/hooks/useGroupContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Plus, X, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function TestimoniesSection() {
  const { user } = useAuth();
  const { oversight_leader_id } = useGroupContext();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [testimonyText, setTestimonyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: testimonies = [] } = useQuery({
    queryKey: ["testimonies", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('testimonies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleSubmit = async () => {
    if (!title.trim() || !testimonyText.trim()) return;
    setSaving(true);
    await supabase.from('testimonies').insert({
      user_id: user.id,
      oversight_leader_id,
      title,
      testimony_text: testimonyText,
    });
    queryClient.invalidateQueries({ queryKey: ["testimonies"] });
    setTitle("");
    setTestimonyText("");
    setShowForm(false);
    setSubmitted(true);
    setSaving(false);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-3.5 h-3.5 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Testimonies</h2>
      </div>

      {submitted && (
        <div className="flex items-center gap-2 bg-green-500/10 text-green-600 rounded-2xl px-4 py-3 mb-3 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Your testimony has been shared with your Leader.
        </div>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)} variant="outline" className="w-full border-dashed text-muted-foreground gap-2 mb-4">
          <Plus className="w-4 h-4" /> Share a Testimony
        </Button>
      )}

      {showForm && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Share a Testimony</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
            <Input placeholder="e.g. Healing, Salvation, Breakthrough" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-0 mt-1.5" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Testimony</label>
            <Textarea placeholder="Share what God has done..." value={testimonyText} onChange={(e) => setTestimonyText(e.target.value)} className="bg-secondary border-0 mt-1.5 resize-none" rows={5} />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !title.trim() || !testimonyText.trim()} className="w-full bg-primary text-primary-foreground font-semibold">
            {saving ? "Sharing..." : "Share Testimony"}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {testimonies.map((t) => (
          <div key={t.id} className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">{t.title}</p>
              <span className="text-[10px] text-muted-foreground">{format(parseISO(t.created_at), "d MMM yyyy")}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>{t.testimony_text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}