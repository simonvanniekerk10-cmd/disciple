import { useState, useMemo } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { Phone, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIME_SLOTS = [];
for (let h = 7; h < 21; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${h.toString().padStart(2, "00")}:30`);
}

function formatTimeLabel(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${m === 0 ? "00" : m} ${ampm}`;
}

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

export default function BookingCalendar({ slots, duration, onBook, currentUserId }) {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Build available time set per date
  const availableByDate = useMemo(() => {
    const map = {};
    slots
      .filter((s) => s.status === "available")
      .forEach((s) => {
        const raw = s.time_raw || toRaw(s.time);
        if (!map[s.date]) map[s.date] = new Set();
        map[s.date].add(raw);
      });
    return map;
  }, [slots]);

  // Pending slots (booked but not confirmed)
  const pendingByDate = useMemo(() => {
    const map = {};
    slots
      .filter((s) => s.status === 'booked' && !s.confirmed)
      .forEach((s) => {
        const raw = s.time_raw || toRaw(s.time);
        if (!map[s.date]) map[s.date] = {};
        map[s.date][raw] = s;
      });
    return map;
  }, [slots]);

  // Confirmed booked slots
  const confirmedByDate = useMemo(() => {
    const map = {};
    slots
      .filter((s) => s.status === 'booked' && s.confirmed)
      .forEach((s) => {
        const raw = s.time_raw || toRaw(s.time);
        if (!map[s.date]) map[s.date] = new Set();
        map[s.date].add(raw);
      });
    return map;
  }, [slots]);

  // For a given date+time, check if enough consecutive 30-min slots exist for the chosen duration
  function isBookable(dateStr, rawTime) {
    const slotsNeeded = duration / 30;
    const available = availableByDate[dateStr];
    if (!available) return false;
    let t = rawTime;
    for (let i = 0; i < slotsNeeded; i++) {
      if (!available.has(t)) return false;
      t = addMinutes(t, 30);
    }
    return true;
  }

  function handleClick(dateStr, rawTime) {
    if (!isBookable(dateStr, rawTime)) return;
    // Find the slot object for this date+time
    const slot = slots.find(
      (s) => s.date === dateStr && s.status === "available" && (s.time_raw || toRaw(s.time)) === rawTime
    );
    if (slot) onBook(slot);
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Week nav */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Select a Time
        </span>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-400/70" />
          <span className="text-xs text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-300/80" />
          <span className="text-xs text-muted-foreground">Your pending request</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
          <span className="text-xs text-muted-foreground">Unavailable</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[580px]">
          {/* Day headers */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
            <div className="h-10" />
            {days.map((day) => {
              const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              return (
                <div key={day.toISOString()} className="h-10 flex flex-col items-center justify-center border-l border-border">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE")}
                  </span>
                  <span className={`text-xs font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time rows */}
          <div className="max-h-[380px] overflow-y-auto">
            {TIME_SLOTS.map((rawTime, idx) => (
              <div key={rawTime} className={`grid grid-cols-[56px_repeat(7,1fr)] ${idx < TIME_SLOTS.length - 1 ? "border-b border-border/40" : ""}`}>
                <div className="h-8 flex items-center justify-end pr-2">
                  {rawTime.endsWith(":00") && (
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {formatTimeLabel(rawTime)}
                    </span>
                  )}
                </div>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isPast = dateStr < format(today, 'yyyy-MM-dd');
                  const bookable = !isPast && isBookable(dateStr, rawTime);
                  const pendingSlot = pendingByDate[dateStr]?.[rawTime];
                  const isMyPending = pendingSlot && currentUserId && pendingSlot.booked_by_user_id === currentUserId;
                  const isOtherPending = pendingSlot && !isMyPending;
                  const isConfirmed = confirmedByDate[dateStr]?.has(rawTime);

                  let cellClass = 'h-8 border-l border-border/40 transition-all duration-100 flex items-center justify-center';
                  if (isMyPending) {
                    cellClass += ' bg-yellow-300/80 cursor-default';
                  } else if (isOtherPending || isConfirmed) {
                    cellClass += ' bg-muted/60 cursor-default';
                  } else if (bookable) {
                    cellClass += ' bg-amber-400/70 cursor-pointer hover:bg-amber-400 active:scale-95';
                  } else {
                    cellClass += ' cursor-default';
                  }

                  return (
                    <div
                      key={dateStr}
                      className={cellClass}
                      onClick={() => bookable && handleClick(dateStr, rawTime)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}