import { format } from "date-fns";
import { Phone, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SlotList({ slots, onBook }) {
  const available = slots.filter((s) => s.status === "available");

  if (available.length === 0) {
    return (
      <div className="text-center py-10">
        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No available slots right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {available.map((slot) => (
        <div key={slot.id} className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {slot.type === "phone" ? (
                <Phone className="w-4 h-4 text-primary" />
              ) : (
                <MapPin className="w-4 h-4 text-primary" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {slot.date ? format(new Date(slot.date + "T00:00:00"), "EEE, MMM d") : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {slot.time} · {slot.type === "phone" ? "Phone Call" : "In Person"}
                {slot.duration ? ` · ${slot.duration} min` : ""}
              </p>
              {slot.location && (
                <p className="text-xs text-muted-foreground mt-0.5">{slot.location}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onBook(slot)}
            className="bg-primary text-primary-foreground font-semibold rounded-full"
          >
            Book
          </Button>
        </div>
      ))}
    </div>
  );
}