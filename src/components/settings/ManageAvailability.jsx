import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, Phone, MapPin, User, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function ManageAvailability({ slots }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slotType, setSlotType] = useState("phone");
  const [slotDuration, setSlotDuration] = useState("30");
  const [slotLocation, setSlotLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setSlotDate(""); setSlotTime(""); setSlotType("phone");
    setSlotDuration("30"); setSlotLocation("");
  };

  const handleAdd = async () => {
    if (!slotDate || !slotTime) return;
    setSaving(true);
    // Format time nicely for display
    const [h, m] = slotTime.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const displayTime = `${displayHour}:${m} ${ampm}`;

    await base44.entities.CatchUpSlot.create({
      date: slotDate,
      time: displayTime,
      type: slotType,
      duration: parseInt(slotDuration),
      location: slotLocation.trim(),
      status: "available",
    });
    resetForm();
    setShowAdd(false);
    queryClient.invalidateQueries({ queryKey: ["catchupSlots"] });
    setSaving(false);
  };

  const handleDelete = async (slot) => {
    await base44.entities.CatchUpSlot.delete(slot.id);
    queryClient.invalidateQueries({ queryKey: ["catchupSlots"] });
  };

  const handleCancelBooking = async (slot) => {
    await base44.entities.CatchUpSlot.update(slot.id, {
      status: "available",
      message: "",
      booked_by: "",
    });
    queryClient.invalidateQueries({ queryKey: ["catchupSlots"] });
  };

  const upcoming = slots
    .filter((s) => s.date >= format(new Date(), "yyyy-MM-dd"))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Manage Availability
        </h2>
        <Button
          size="sm"
          onClick={() => setShowAdd(true)}
          className="bg-primary text-primary-foreground font-semibold rounded-full h-8 px-3"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Slot
        </Button>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No upcoming slots. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((slot) => (
            <div
              key={slot.id}
              className={`rounded-xl p-4 border ${
                slot.status === "booked"
                  ? "bg-primary/5 border-primary/20"
                  : "bg-secondary border-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shrink-0 mt-0.5">
                    {slot.type === "phone" ? (
                      <Phone className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {slot.date ? format(new Date(slot.date + "T00:00:00"), "EEE, MMM d") : ""} · {slot.time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slot.type === "phone" ? "Phone Call" : "In Person"}
                      {slot.duration ? ` · ${slot.duration} min` : ""}
                      {slot.location ? ` · ${slot.location}` : ""}
                    </p>
                    {slot.status === "booked" && (
                      <div className="mt-2 space-y-1">
                        {slot.booked_by && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <User className="w-3 h-3 text-primary" />
                            <span className="font-medium text-primary">{slot.booked_by}</span>
                          </div>
                        )}
                        {slot.message && (
                          <div className="flex items-start gap-1.5 text-xs">
                            <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-muted-foreground italic">"{slot.message}"</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    className={
                      slot.status === "booked"
                        ? "bg-primary/10 text-primary text-[10px]"
                        : "bg-muted text-muted-foreground text-[10px]"
                    }
                  >
                    {slot.status === "booked" ? "Booked" : "Available"}
                  </Badge>
                  {slot.status === "booked" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelBooking(slot)}
                      className="text-muted-foreground hover:text-destructive h-7 w-7"
                      title="Cancel booking"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(slot)}
                      className="text-muted-foreground hover:text-destructive h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Slot Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Add Available Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
              <Select value={slotType} onValueChange={setSlotType}>
                <SelectTrigger className="bg-secondary border-0 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="in_person">In-Person Catch-Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Date</Label>
              <Input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="bg-secondary border-0 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Time</Label>
              <Input
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                className="bg-secondary border-0 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Duration</Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger className="bg-secondary border-0 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {slotType === "phone" ? "Call Link" : "Location"}
              </Label>
              <Input
                value={slotLocation}
                onChange={(e) => setSlotLocation(e.target.value)}
                placeholder={slotType === "phone" ? "e.g. Zoom link or dial-in" : "e.g. City Campus office"}
                className="bg-secondary border-0 mt-1"
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={saving || !slotDate || !slotTime}
              className="w-full bg-primary text-primary-foreground font-semibold"
            >
              {saving ? "Adding..." : "Add Slot"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}