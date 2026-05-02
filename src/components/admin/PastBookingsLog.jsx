import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Phone, MapPin, User, MessageSquare, Calendar, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

function toRaw(displayTime) {
  if (!displayTime) return "";
  const match = displayTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return displayTime;
  let h = parseInt(match[1]);
  const m = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${m}`;
}

export default function PastBookingsLog({ slots, leaderTimezone, onCancelBooking }) {
  const [userMap, setUserMap] = useState({});
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const userIds = [...new Set(
      slots.filter((s) => s.booked_by_user_id).map((s) => s.booked_by_user_id)
    )];
    if (userIds.length === 0) return;
    supabase
      .from('profiles')
      .select('id, display_name, full_name, email')
      .in('id', userIds)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((u) => {
          map[u.id] = u.display_name || u.full_name || u.email;
        });
        setUserMap(map);
      });
  }, [slots]);

  const timezone = leaderTimezone || "Australia/Adelaide";
  const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  const todayInTz = format(nowInTz, "yyyy-MM-dd");

  const pastBooked = slots
    .filter((s) => {
      if (!s.booked_by && s.status !== "cancelled") return false;
      if (s.date > todayInTz) return false;
      if (s.date < todayInTz) return true;
      const raw = s.time_raw || toRaw(s.time);
      if (!raw) return true;
      const [h, m] = raw.split(":").map(Number);
      const [yr, mo, d] = s.date.split("-").map(Number);
      return new Date(yr, mo - 1, d, h, m) < nowInTz;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const upcomingBooked = slots
    .filter((s) => {
      if (s.status !== "booked" || !s.confirmed) return false;
      if (s.date < todayInTz) return false;
      if (s.date > todayInTz) return true;
      const raw = s.time_raw || toRaw(s.time);
      if (!raw) return true;
      const [h, m] = raw.split(":").map(Number);
      const [yr, mo, d] = s.date.split("-").map(Number);
      return new Date(yr, mo - 1, d, h, m) >= nowInTz;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const handleConfirmCancel = async () => {
    setCancelling(true);
    await onCancelBooking(confirmSlot);
    setConfirmSlot(null);
    setCancelling(false);
    setSuccessMsg("Catch-up cancelled.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const renderSlot = (slot, showCancel = false) => (
    <div key={slot.id} className="flex items-start gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
        {slot.type === "phone" ? (
          <Phone className="w-3.5 h-3.5 text-primary" />
        ) : (
          <MapPin className="w-3.5 h-3.5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {slot.date ? format(new Date(slot.date + "T00:00:00"), "EEE, MMM d, yyyy") : ""} · {slot.time}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={slot.status === "booked" ? "bg-primary/10 text-primary text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
              {slot.status === "booked" ? "Booked" : slot.status}
            </Badge>
            {showCancel && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setConfirmSlot(slot)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {slot.type === "phone" ? "Phone Call" : "In Person"}
          {slot.duration ? ` · ${slot.duration} min` : ""}
        </p>
        {(slot.booked_by_user_id || slot.booked_by) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <User className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              {userMap[slot.booked_by_user_id] || slot.booked_by}
            </span>
          </div>
        )}
        {slot.message && (
          <div className="flex items-start gap-1.5 mt-1">
            <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground italic">"{slot.message}"</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          {successMsg}
        </div>
      )}

      {upcomingBooked.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Confirmed Bookings</h2>
          </div>
          <div className="divide-y divide-border">
            {upcomingBooked.map((s) => renderSlot(s, true))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past Bookings Log</h2>
        </div>
        {pastBooked.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No past bookings yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {pastBooked.map((s) => renderSlot(s, false))}
          </div>
        )}
      </div>

      <Dialog open={!!confirmSlot} onOpenChange={() => setConfirmSlot(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Catch-Up?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this catch-up with{" "}
            <span className="font-semibold text-foreground">{confirmSlot?.booked_by || "this Disciple"}</span>?
          </p>
          {confirmSlot && (
            <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
              {format(new Date(confirmSlot.date + "T00:00:00"), "EEE, MMM d, yyyy")} at {confirmSlot.time} · {confirmSlot.type === "phone" ? "Phone Call" : "In Person"}
            </p>
          )}
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmSlot(null)}>Keep It</Button>
            <Button variant="destructive" className="flex-1" disabled={cancelling} onClick={handleConfirmCancel}>
              {cancelling ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}