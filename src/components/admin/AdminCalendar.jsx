import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, addDays, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

// Generate 30-min time slots from 7:00 AM to 9:00 PM
const TIME_SLOTS = [];
for (let h = 7; h < 21; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
}
TIME_SLOTS.push("21:00");

function formatTimeLabel(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${m === 0 ? "00" : m} ${ampm}`;
}

function slotKey(dateStr, time) {
  return `${dateStr}__${time}`;
}

export default function AdminCalendar({ slots }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = new Date();
  const [weekStart, setWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  const [pending, setPending] = useState({}); // key -> true (to add) or false (to remove)
  const [saving, setSaving] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Build a lookup of existing slots by date+time
  const existingMap = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      map[slotKey(s.date, s.time_raw || toRaw(s.time))] = s;
    });
    return map;
  }, [slots]);

  function toRaw(displayTime) {
    if (!displayTime) return "";
    // convert "9:00 AM" -> "09:00", "3:30 PM" -> "15:30"
    const match = displayTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return displayTime;
    let h = parseInt(match[1]);
    const m = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m}`;
  }

  function getCellState(dateStr, rawTime) {
    const key = slotKey(dateStr, rawTime);
    if (pending[key] !== undefined) {
      if (pending[key] === false) return 'removing';
      if (pending[key] === true) return 'adding';
    }
    const existing = existingMap[key];
    if (!existing) return 'empty';
    if (existing.status === 'booked' && !existing.confirmed) return 'pending_booking';
    if (existing.status === 'booked' && existing.confirmed) return 'confirmed';
    if (existing.status === 'available') return 'available';
    return 'empty';
  }

  function handleToggle(dateStr, rawTime) {
    const key = slotKey(dateStr, rawTime);
    const existing = existingMap[key];
    const isPending = pending[key];

    // If booked (pending or confirmed), do nothing
    if (existing?.status === 'booked') return;

    setPending((prev) => {
      const next = { ...prev };
      if (isPending !== undefined) {
        // cancel the pending change
        delete next[key];
      } else if (existing?.status === "available") {
        next[key] = false; // mark to remove
      } else {
        next[key] = true; // mark to add
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const ops = Object.entries(pending);
    for (const [key, add] of ops) {
      const [dateStr, rawTime] = key.split("__");
      if (add) {
        // create new available slot
        await base44.entities.CatchUpSlot.create({
          date: dateStr,
          time: formatTimeLabel(rawTime),
          time_raw: rawTime,
          type: "phone",
          duration: 30,
          status: "available",
          oversight_leader_id: user?.id,
        });
      } else {
        // delete existing available slot
        const existing = existingMap[key];
        if (existing) {
          await base44.entities.CatchUpSlot.delete(existing.id);
        }
      }
    }
    setPending({});
    queryClient.invalidateQueries({ queryKey: ["catchupSlots"] });
    setSaving(false);
  }

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Manage Availability
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          >
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
          <span className="text-xs text-muted-foreground">Pending request</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
          <span className="text-xs text-muted-foreground">Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-2 border-primary border-dashed" />
          <span className="text-xs text-muted-foreground">To add</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-2 border-destructive border-dashed" />
          <span className="text-xs text-muted-foreground">To remove</span>
        </div>
      </div>

      {/* Calendar Grid */}
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
          <div className="max-h-[420px] overflow-y-auto">
            {TIME_SLOTS.map((rawTime, idx) => (
              <div key={rawTime} className={`grid grid-cols-[56px_repeat(7,1fr)] ${idx < TIME_SLOTS.length - 1 ? "border-b border-border/40" : ""}`}>
                {/* Time label */}
                <div className="h-8 flex items-center justify-end pr-2">
                  {rawTime.endsWith(":00") && (
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {formatTimeLabel(rawTime)}
                    </span>
                  )}
                </div>
                {/* Day cells */}
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const state = getCellState(dateStr, rawTime);
                  const isPast = dateStr < format(today, "yyyy-MM-dd");
                  const isLastSlot = rawTime === "21:00";

                  let cellClass = 'h-8 border-l border-border/40 cursor-pointer transition-all duration-100 relative flex items-center justify-center';
                  if (isPast || isLastSlot) {
                    cellClass += ' opacity-30 cursor-not-allowed';
                  } else if (state === 'pending_booking') {
                    cellClass += ' bg-yellow-300/80 cursor-not-allowed';
                  } else if (state === 'confirmed') {
                    cellClass += ' bg-muted/60 cursor-not-allowed';
                  } else if (state === 'available') {
                    cellClass += ' bg-amber-400/70 hover:bg-amber-400';
                  } else if (state === 'adding') {
                    cellClass += ' bg-primary/20 border-2 border-dashed border-primary';
                  } else if (state === 'removing') {
                    cellClass += ' bg-destructive/20 border-2 border-dashed border-destructive';
                  } else {
                    cellClass += ' hover:bg-secondary';
                  }

                  return (
                    <div
                      key={dateStr}
                      className={cellClass}
                      onClick={() => !isPast && !isLastSlot && handleToggle(dateStr, rawTime)}
                    >
                      {state === 'pending_booking' && (
                        <span className="text-[7px] text-amber-800 font-bold leading-tight text-center px-0.5">
                          Pending
                        </span>
                      )}
                      {state === 'confirmed' && (
                        <span className="text-[7px] text-muted-foreground font-medium leading-tight text-center px-0.5">
                          Booked
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Bar */}
      {pendingCount > 0 && (
        <div className="px-4 py-3 border-t border-border bg-secondary flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {pendingCount} change{pendingCount !== 1 ? "s" : ""} pending
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPending({})}
              className="text-xs h-8"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground text-xs h-8 font-semibold"
            >
              <Save className="w-3 h-3 mr-1" />
              {saving ? "Saving..." : "Save Availability"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}