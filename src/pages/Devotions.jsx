import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { Plus, X, Image, Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Devotions() {
  const { user } = useAuth();
  const olId = user?.oversight_leader_id || (user?.role === "admin" ? user?.id : null);
  const [showAdd, setShowAdd] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const queryClient = useQueryClient();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["devotions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('devotion_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setUploading(true);

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('devotions')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('devotions')
      .getPublicUrl(fileName);

    await supabase.from('devotion_entries').insert({
      user_id: user.id,
      image_url: publicUrl,
      note: note.trim() || "",
      date: format(new Date(), "yyyy-MM-dd"),
      oversight_leader_id: olId,
    });

    setFile(null);
    setPreview(null);
    setNote("");
    setShowAdd(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    queryClient.invalidateQueries({ queryKey: ["devotions"] });
    setUploading(false);
  };

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Devotions</h1>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-primary text-primary-foreground font-semibold rounded-full h-10 px-4"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No devotion entries yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Tap "Add" to upload your first devotion.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setViewEntry(entry)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border group"
            >
              <img
                src={entry.image_url}
                alt="Devotion"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-xs text-white/80 font-medium">
                  {entry.date ? format(new Date(entry.date), "MMM d") : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Add Devotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            {preview ? (
              <div className="relative rounded-xl overflow-hidden aspect-video">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Camera className="w-7 h-7 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Take a Photo</p>
                  <p className="text-[11px] text-muted-foreground">Opens camera</p>
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="w-7 h-7 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Upload from Device</p>
                  <p className="text-[11px] text-muted-foreground">Photo, screenshot, etc.</p>
                </button>
              </div>
            )}
            <Textarea
              placeholder="Add a note or caption (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-secondary border-0 resize-none"
              rows={3}
            />
            <Button
              onClick={handleSave}
              disabled={!file || uploading}
              className="w-full bg-primary text-primary-foreground font-semibold"
            >
              {uploading ? "Uploading..." : "Save Devotion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewEntry} onOpenChange={() => setViewEntry(null)}>
        <DialogContent className="bg-card border-border max-w-md p-0 overflow-hidden">
          {viewEntry && (
            <>
              <img src={viewEntry.image_url} alt="Devotion" className="w-full max-h-[60vh] object-contain bg-black" />
              <div className="p-5">
                <p className="text-sm text-muted-foreground font-medium">
                  {viewEntry.date ? format(new Date(viewEntry.date), "EEEE, MMMM d, yyyy") : ""}
                </p>
                {viewEntry.note && <p className="mt-2 text-sm">{viewEntry.note}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}