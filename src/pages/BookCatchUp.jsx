import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["catchupSlots", olId],
    queryFn: async () => {
      const { data } = await supabase
        .from('catch_up_slots')
        .select('*')
        .eq('oversight_leader_id', olId)
        .order('date', { ascending: true })
        .limit(200);
      return data || [];
    },
    enabled: !!olId,
  });

  const { data: leaderProfile } = useQuery({
    queryKey: ["leaderProfile", olId],
    queryFn: async () => {
      const { data } = await supabase
        .from('oversight_leader_profiles')
        .select('*')
        .eq('user_id', olId)
        .single();
      return data;
    },
    enabled: !!olId,
  });

  const { data: leaderUser } = useQuery({
    queryKey: ["leaderUser", olId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', olId)
        .single();
      return data;
    },
    enabled: !!olId,
  });

  const leaderName = leaderUser?.display_name || leaderUser?.full_name || "your Leader";

  const handleBook = async () => {
    if (!bookingSlot) return;
    setSaving(true);
    const bookerName = user?.full_name || user?.display_name || "A Disciple";
    const type = duration === 30 ? "phone" : "in_person";

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

    await supabase
      .from('catch_up_slots')
      .update({
        status: "booked",
        confirmed: false,
        type,
        duration,
        message: message.trim(),
        booked_by: bookerName,
        booked_by_user_id: user.id,
      })
      .eq('id', bookingSlot.id);

    for (const s of slotsToBlock) {
      if (s.id !== bookingSlot.id) {
        await supabase.from('catch_up_slots').delete().eq('id', s.id);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["catchupSlots"] });
    setBookingSlot(null);
    setMessage("");
    setSaving(false);
  };

  const handleCancelPending = async (slot) => {
    await supabase
      .from('catch_up_slots')
      .update({
        status: 'available',
        message: '',
        booked_by: '',
        booked_by_user_id: null,
        type: null,
        duration: null,
        confirmed: false,
        notification_sent: false,
      })
      .eq('id', slot.id);
    queryClient.invalidateQueries({ queryKey: ['catchupSlots'] });
  };

  const timezone = leaderProfile?.timezone || "Australia/Adelaide";
  const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));

  const myBookedSlots = slots.filter((s) => {
    if (s.status !== "booked") return false;
    if (s.booked_by_user_id !== user?.id) return false;
    if (!s.date || !s.time) return true;
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

      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Type</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDuration(30)}
            className="rounded-xl p-4 border-2 text-left transition-all"
            style={duration === 30 ? {borderColor:'#1E2D50', background:'#EEF3FB'} : {borderColor:'#C8D8F0', background:'#F0F5FF'}}
          >
            <Phone className="w-5 h-5 mb-2" style={{color: duration === 30 ? '#1E2D50' : '#6B82AA'}} />
            <p className="text-sm font-semibold" style={{color:'#1E2D50'}}>Phone Call</p>
            <p className="text-xs" style={{color:'#6B82AA'}}>30 minutes</p>
          </button>
          <button
            onClick={() => setDuration(60)}
            className="rounded-xl p-4 border-2 text-left transition-all"
            style={duration === 60 ? {borderColor:'#1E2D50', background:'#EEF3FB'} : {borderColor:'#C8D8F0', background:'#F0F5FF'}}
          >
            <MapPin className="w-5 h-5 mb-2" style={{color: duration === 60 ? '#1E2D50' : '#6B82AA'}} />
            <p className="text-sm font-semibold" style={{color:'#1E2D50'}}>In-Person</p>
            <p className="text-xs" style={{color:'#6B82AA'}}>60 minutes</p>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {duration === 30 ? "Available slots show single open 30-min blocks." : "Available slots show where two consecutive 30-min blocks are open."}
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
                  with <span className="font-semibold">{leaderName}</span> on{" "}
                  <span className="font-semibold">
                    {bookingSlot.date ? format(new Date(bookingSlot.date + "T00:00:00"), "EEEE, MMMM d") : ""}
                  </span>{" "}
                  at <span className="font-semibold">{bookingSlot.time}</span>
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