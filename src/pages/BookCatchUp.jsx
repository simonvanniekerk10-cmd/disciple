import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useGroupContext } from "@/components/hooks/useGroupContext";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, MapPin, AlertCircle, Loader2 } from "lucide-react";
import BookingCalendar from "../components/catchup/BookingCalendar";
import BookedSlots from "../components/catchup/BookedSlots";

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

function addMinutes(rawTime, mins) {
  const [h, m] = rawTime.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

export default function BookCatchUp() {
  const { user } = useAuth();
  const [duration, setDuration] = useState(30);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { oversight_leader_id: olId, isLoading: olCheckLoading } = useGroupContext();
  const olCheckDone = !olCheckLoading;

  // Fetch only the assigned OL's slots
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["catchupSlots", olId],
    queryFn: () => base44.entities.CatchUpSlot.filter({ oversight_leader_id: olId }, "date", 200),
    enabled: !!olId,
  });

  // Fetch the leader's user record for their name
  const { data: leaderUsers = [] } = useQuery({
    queryKey: ["leaderUser", olId],
    queryFn: () => base44.entities.User.filter({ id: olId }),
    enabled: !!olId,
  });
  const olUserRecord = leaderUsers[0] || null;
  const leaderName = olUserRecord?.full_name || "your Leader";

  // Fetch the leader's OversightLeaderProfile for notification email
  const { data: leaderProfiles = [] } = useQuery({
    queryKey: ["leaderProfile", olId],
    queryFn: () => base44.entities.OversightLeaderProfile.filter({ user_id: olId }),
    enabled: !!olId,
  });
  const leaderProfile = leaderProfiles[0] || null;

  const handleBook = async () => {
    if (!bookingSlot) return;
    setSaving(true);
    const currentUser = await base44.auth.me();
    const bookerName = currentUser?.full_name || "A Disciple";
    const type = duration === 30 ? "phone" : "in_person";
    const typeLabel = duration === 30 ? "Phone Call (30 min)" : "In-Person Catch-Up (60 min)";

    // Block all overlapping 30-min slots
    const startRaw = bookingSlot.time_raw || toRaw(bookingSlot.time);
    const slotsToBlock = [];
    let t = startRaw;
    for (let i = 0; i < duration / 30; i++) {
      const matching = slots.find(
        (s) => s.date === bookingSlot.date && s.status === "available" && (s.time_raw || toRaw(s.time)) === t
      );
      if (matching) slotsToBlock.push(matching);
      t = addMinutes(t, 30);
    }

    // Mark the first slot as "booked" (pending confirmation) with booking details, delete the rest
    await base44.entities.CatchUpSlot.update(bookingSlot.id, {
      status: "booked",
      confirmed: false,
      type,
      duration,
      message: message.trim(),
      booked_by: bookerName,
      booked_by_user_id: currentUser.id,
    });
    for (const s of slotsToBlock) {
      if (s.id !== bookingSlot.id) {
        await base44.entities.CatchUpSlot.delete(s.id);
      }
    }

    // Invalidate immediately so the UI updates with the new booking
    queryClient.invalidateQueries({ queryKey: ["catchupSlots"] });
    setBookingSlot(null);
    setMessage("");
    setSaving(false);

    // Leader email is sent automatically by the sendBookingNotification entity automation
  };

  const handleCancelPending = async (slot) => {
    // Users can only cancel PENDING (unconfirmed) bookings
    await base44.entities.CatchUpSlot.update(slot.id, {
      status: 'available',
      message: '',
      booked_by: '',
      booked_by_user_id: '',
      type: null,
      duration: null,
      confirmed: false,
      notification_sent: false,
    });
    queryClient.invalidateQueries({ queryKey: ['catchupSlots'] });
  };

  // Filter to only the current user's booked slots that are upcoming (not past)
  // Compare using the leader's timezone so an Aussie user doesn't see "past" slots due to UTC drift
  const timezone = leaderProfile?.timezone || "Australia/Adelaide";
  const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));

  const myBookedSlots = slots.filter((s) => {
    if (s.status !== "booked") return false;
    if (s.booked_by_user_id !== user?.id && s.created_by !== user?.email) return false;
    if (!s.date || !s.time) return true; // keep if no time info
    const raw = s.time_raw || toRaw(s.time);
    if (!raw) return true;
    const [h, m] = raw.split(":").map(Number);
    const [year, month, day] = s.date.split("-").map(Number);
    const slotDate = new Date(year, month - 1, day, h, m, 0);
    return slotDate >= nowInTz;
  });

  if (!olCheckDone) {
    return (
      <div className="px-5 pt-6 pb-10 space-y-4">
        <h1 className="text-2xl font-bold">Book a Catch-Up</h1>
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!olId) {
    return (
      <div className="px-5 pt-6 pb-10 space-y-4">
        <h1 className="text-2xl font-bold">Book a Catch-Up</h1>
        <div className="bg-card rounded-2xl border border-border p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">You're not linked to a Leader yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Ask your Leader to share their invite link with you to get connected.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Book a Catch-Up</h1>
        <p className="text-sm text-muted-foreground mt-1">Schedule time with your Leader</p>
      </div>

      {/* Duration Selector */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Type</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDuration(30)}
            className="rounded-xl p-4 border-2 text-left transition-all"
            style={duration === 30
              ? {borderColor:'#1E2D50', background:'#EEF3FB'}
              : {borderColor:'#C8D8F0', background:'#F0F5FF'}}
          >
            <Phone className="w-5 h-5 mb-2" style={{color: duration === 30 ? '#1E2D50' : '#6B82AA'}} />
            <p className="text-sm font-semibold" style={{color:'#1E2D50'}}>
              Phone Call
            </p>
            <p className="text-xs" style={{color:'#6B82AA'}}>30 minutes</p>
          </button>
          <button
            onClick={() => setDuration(60)}
            className="rounded-xl p-4 border-2 text-left transition-all"
            style={duration === 60
              ? {borderColor:'#1E2D50', background:'#EEF3FB'}
              : {borderColor:'#C8D8F0', background:'#F0F5FF'}}
          >
            <MapPin className="w-5 h-5 mb-2" style={{color: duration === 60 ? '#1E2D50' : '#6B82AA'}} />
            <p className="text-sm font-semibold" style={{color:'#1E2D50'}}>
              In-Person
            </p>
            <p className="text-xs" style={{color:'#6B82AA'}}>60 minutes</p>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {duration === 30
            ? "Available slots show single open 30-min blocks."
            : "Available slots show where two consecutive 30-min blocks are open."}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <BookingCalendar slots={slots} duration={duration} onBook={setBookingSlot} currentUserId={user?.id} />
          {myBookedSlots.length > 0 && (
            <BookedSlots slots={myBookedSlots} onCancelPending={handleCancelPending} leaderName={leaderName} />
          )}
        </>
      )}

      {/* Confirm Dialog */}
      <Dialog open={!!bookingSlot} onOpenChange={() => setBookingSlot(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Request Catch-Up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bookingSlot && (
              <div className="bg-secondary rounded-xl p-4 space-y-2">
                <p className="text-sm text-foreground">
                  You are requesting a{" "}
                  <span className="font-semibold">
                    {duration === 30 ? "30 minute phone call" : "60 minute in-person catch-up"}
                  </span>{" "}
                  with{" "}
                  <span className="font-semibold">{leaderName}</span> on{" "}
                  <span className="font-semibold">
                    {bookingSlot.date
                      ? format(new Date(bookingSlot.date + "T00:00:00"), "EEEE, MMMM d")
                      : ""}
                  </span>{" "}
                  at{" "}
                  <span className="font-semibold">{bookingSlot.time}</span>
                  {leaderProfile?.timezone ? (
                    <span className="text-muted-foreground"> ({leaderProfile.timezone})</span>
                  ) : null}.
                </p>
                <p className="text-xs text-muted-foreground">Your Leader will confirm this request in the app.</p>
              </div>
            )}
            <Textarea
              placeholder="Anything you'd like to discuss? (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-secondary border-0 resize-none"
              rows={3}
            />
            <Button
              onClick={handleBook}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground font-semibold"
            >
              {saving ? "Sending Request..." : "Send Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}