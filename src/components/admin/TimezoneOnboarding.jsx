/**
 * LeaderOnboarding — shown on first admin login.
 * Step 1: Choose timezone
 * Step 2: Choose calendar integration (Automatic / Manual)
 */
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Globe, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const TIMEZONES = [
  { value: "Australia/Adelaide", label: "Australia/Adelaide — ACST/ACDT" },
  { value: "Australia/Sydney", label: "Australia/Sydney — AEST/AEDT" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne — AEST/AEDT" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane — AEST (no DST)" },
  { value: "Australia/Perth", label: "Australia/Perth — AWST" },
  { value: "Australia/Darwin", label: "Australia/Darwin — ACST (no DST)" },
  { value: "Australia/Hobart", label: "Australia/Hobart — AEST/AEDT" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland — NZST/NZDT" },
];

export default function TimezoneOnboarding({ userId, existingProfileId, onComplete }) {
  const [timezone, setTimezone] = useState("Australia/Adelaide");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = { user_id: userId, timezone, calendar_mode: "manual" };
    if (existingProfileId) {
      await base44.entities.OversightLeaderProfile.update(existingProfileId, data);
    } else {
      await base44.entities.OversightLeaderProfile.create(data);
    }
    setSaving(false);
    onComplete();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-8">
      <div className="bg-card rounded-2xl border border-border p-8 max-w-sm w-full space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Which timezone are you in?</h2>
          <p className="text-sm text-muted-foreground">
            This ensures catch-up times and emails show the correct local time for you and your disciples.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Your Timezone</Label>
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
          {saving ? "Saving..." : "Get Started"} <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}