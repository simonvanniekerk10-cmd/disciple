/**
 * PendingBookings — shows unconfirmed booking requests to the leader.
 * - Auto-expires past pending requests on mount (returns slot to available, no email)
 * - Confirm: emails disciple only
 * - Deny: emails disciple, deletes booking record, returns slot to available
 */
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Phone, MapPin, User, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";

function toRaw(displayTime) {
  if (!displayTime) return null;
  const match = displayTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return displayTime;
  let h = parseInt(match[1]);
  const m = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${m}`;
}

function isSlotInPast(slot, timezone) {
  const raw = slot.time_raw || toRaw(slot.time);
  if (!raw || !slot.date) return false;
  const [year, month, day] = slot.date.split("-").map(Number);
  const [hour, minute] = raw.split(":").map(Number);
  const slotDate = new Date(year, month - 1, day, hour, minute, 0);
  const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: timezone || "Australia/Adelaide" }));
  return slotDate < nowInTz;
}

export default function PendingBookings({ slots, leaderProfile, leaderName, leaderEmail, onConfirmed }) {
  const [confirming, setConfirming] = useState({});
  const [denyTarget, setDenyTarget] = useState(null);
  const [denying, setDenying] = useState(false);
  const [denySuccess, setDenySuccess] = useState(false);

  // Fix 2: Auto-expire past pending requests on mount
  useEffect(() => {
    const pending = slots.filter((s) => s.status === "booked" && !s.confirmed);
    if (pending.length === 0) return;
    const timezone = leaderProfile?.timezone || "Australia/Adelaide";
    const expired = pending.filter((s) => isSlotInPast(s, timezone));
    if (expired.length === 0) return;
    // Fire-and-forget: restore each expired slot to available
    expired.forEach((slot) => {
      base44.entities.CatchUpSlot.update(slot.id, {
        status: "available",
        message: "",
        booked_by: "",
        booked_by_user_id: "",
        type: null,
        duration: null,
        confirmed: false,
        booking_email_sent: false,
      });
    });
    // Trigger a re-fetch after cleanup
    onConfirmed();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timezone = leaderProfile?.timezone || "Australia/Adelaide";
  const pending = slots
    .filter((s) => s.status === "booked" && !s.confirmed && !isSlotInPast(s, timezone))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time_raw || "").localeCompare(b.time_raw || ""));

  if (pending.length === 0 && !denySuccess) return null;

  const handleConfirm = async (slot) => {
    setConfirming((prev) => ({ ...prev, [slot.id]: true }));
    await base44.entities.CatchUpSlot.update(slot.id, { confirmed: true });

    if (slot.booked_by_user_id) {
      base44.functions.invoke('catchupEmails', {
        scenario: 'confirm',
        booked_by_user_id: slot.booked_by_user_id,
        oversight_leader_id: slot.oversight_leader_id,
        leaderName,
        userName: slot.booked_by || 'User',
        date: slot.date,
        time: slot.time,
        time_raw: slot.time_raw,
        type: slot.type,
        duration: slot.duration,
      });
    }

    setConfirming((prev) => ({ ...prev, [slot.id]: false }));
    onConfirmed();
  };

  const handleDeny = async () => {
    if (!denyTarget) return;
    setDenying(true);

    // Delete the slot entirely — denied bookings do not return to available
    await base44.entities.CatchUpSlot.delete(denyTarget.id);

    if (denyTarget.booked_by_user_id) {
      base44.functions.invoke('catchupEmails', {
        scenario: 'deny',
        booked_by_user_id: denyTarget.booked_by_user_id,
        oversight_leader_id: denyTarget.oversight_leader_id,
        leaderName,
        userName: denyTarget.booked_by || 'User',
        date: denyTarget.date,
        time: denyTarget.time,
        time_raw: denyTarget.time_raw,
        type: denyTarget.type,
        duration: denyTarget.duration,
      });
    }

    setDenying(false);
    setDenyTarget(null);
    setDenySuccess(true);
    setTimeout(() => setDenySuccess(false), 4000);
    onConfirmed();
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-amber-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-200 bg-amber-50 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
          Pending Requests
        </h2>
        {pending.length > 0 && (
          <span className="ml-auto bg-amber-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {pending.length}
          </span>
        )}
      </div>

      {denySuccess && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-200">
          <p className="text-sm text-green-700 font-medium">Catch-up request denied and user notified.</p>
        </div>
      )}

      {pending.length === 0 ? null : (
        <div className="divide-y divide-border">
          {pending.map((slot) => (
            <div key={slot.id} className="px-4 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  {slot.type === "phone" ? (
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {slot.date ? format(new Date(slot.date + "T00:00:00"), "EEE, MMM d, yyyy") : ""} · {slot.time}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {slot.type === "phone" ? "Phone Call" : "In Person"}
                    {slot.duration ? ` · ${slot.duration} min` : ""}
                  </p>
                  {slot.booked_by && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <User className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-primary">{slot.booked_by}</span>
                    </div>
                  )}
                  {slot.message && slot.message.trim() && (
                    <div className="flex items-start gap-1.5 mt-1">
                      <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-xs text-muted-foreground italic">"{slot.message}"</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDenyTarget(slot)}
                  className="flex-1 text-xs font-semibold h-8 border-border"
                  style={{ color: "#7A8BAA", background: "white" }}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Deny
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleConfirm(slot)}
                  disabled={confirming[slot.id]}
                  className="flex-1 bg-primary text-primary-foreground text-xs font-semibold h-8"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {confirming[slot.id] ? "Confirming..." : "Confirm Catch-Up"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deny confirmation dialog */}
      <Dialog open={!!denyTarget} onOpenChange={() => setDenyTarget(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Deny Catch-Up Request?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deny this catch-up request?
            {denyTarget && (
              <span className="block mt-2 text-xs bg-secondary rounded-lg px-3 py-2 text-foreground font-medium">
                {denyTarget.booked_by} — {denyTarget.date ? format(new Date(denyTarget.date + "T00:00:00"), "EEE, MMM d, yyyy") : ""} at {denyTarget.time}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">The user will be notified. This slot will be permanently removed from available slots.</p>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDenyTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={denying} onClick={handleDeny}>
              {denying ? "Denying..." : "Yes, Deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}