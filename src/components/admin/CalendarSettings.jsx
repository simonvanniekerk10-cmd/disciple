/**
 * CalendarSettings — shown in AdminPanel for leaders to change their
 * timezone and calendar integration mode after initial onboarding.
 */
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Globe, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMEZONES } from "./TimezoneOnboarding";

export default function CalendarSettings({ leaderProfile, onSaved }) {
  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState(leaderProfile?.timezone || "Australia/Adelaide");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.OversightLeaderProfile.update(leaderProfile.id, { timezone, calendar_mode: "manual" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Calendar Settings</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Timezone */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Timezone
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="bg-secondary border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground font-semibold"
          >
            {saved ? "Saved!" : saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}