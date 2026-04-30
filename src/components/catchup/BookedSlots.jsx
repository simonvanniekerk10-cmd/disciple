import { useState } from "react";
import { format } from "date-fns";
import { Phone, MapPin, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export default function BookedSlots({ slots, onCancelPending, leaderName }) {
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const booked = slots.filter((s) => s.status === "booked");
  if (booked.length === 0 && !successMsg) return null;

  const handleConfirm = async () => {
    setCancelling(true);
    await onCancelPending(confirmSlot);
    setConfirmSlot(null);
    setCancelling(false);
    setSuccessMsg("Your catch-up has been cancelled.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Catch-Ups</h2>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          {successMsg}
        </div>
      )}

      {booked.map((slot) => {
        const isPending = !slot.confirmed;
        return (
          <div
            key={slot.id}
            className={`border rounded-2xl p-4 transition-colors ${
              isPending
                ? "bg-amber-50/60 border-amber-200"
                : "bg-primary/5 border-primary/20"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isPending ? "bg-amber-100" : "bg-primary/20"
                }`}>
                  {slot.type === "phone" ? (
                    <Phone className={`w-4 h-4 ${isPending ? "text-amber-600" : "text-primary"}`} />
                  ) : (
                    <MapPin className={`w-4 h-4 ${isPending ? "text-amber-600" : "text-primary"}`} />
                  )}
                </div>
                <div>
                  {isPending && (
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-0.5">Pending Confirmation</p>
                  )}
                  <p className="font-semibold text-sm">
                    {slot.date ? format(new Date(slot.date + "T00:00:00"), "EEE, MMM d") : ""} at {slot.time}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {slot.type === "phone" ? "Phone Call" : "In Person"}{slot.duration ? ` · ${slot.duration} min` : ""}
                  </p>
                  {slot.message && slot.message.trim() && (
                    <p className="text-xs text-muted-foreground mt-1 italic">"{slot.message}"</p>
                  )}
                  {isPending && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">⏳ Awaiting your leader's confirmation</p>
                  )}
                </div>
              </div>
              {/* Only allow cancelling PENDING (unconfirmed) bookings */}
              {!slot.confirmed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmSlot(slot)}
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      <Dialog open={!!confirmSlot} onOpenChange={() => setConfirmSlot(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Catch-Up?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this catch-up with <span className="font-semibold text-foreground">{leaderName || "your Leader"}</span>?
          </p>
          {confirmSlot && (
            <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
              {format(new Date(confirmSlot.date + "T00:00:00"), "EEE, MMM d, yyyy")} at {confirmSlot.time} · {confirmSlot.type === "phone" ? "Phone Call" : "In Person"}
            </p>
          )}
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmSlot(null)}>Keep It</Button>
            <Button variant="destructive" className="flex-1" disabled={cancelling} onClick={handleConfirm}>
              {cancelling ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}