import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Shield, LogOut, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import LeaderAccessForm from "@/components/role/LeaderAccessForm";

const TIMEZONES = [
  { value: "Australia/Adelaide", label: "Australia/Adelaide — ACST/ACDT" },
  { value: "Australia/Sydney", label: "Australia/Sydney — AEST/AEDT" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne — AEST/AEDT" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane — AEST (no DST)" },
  { value: "Australia/Perth", label: "Australia/Perth — AWST" },
  { value: "Australia/Darwin", label: "Australia/Darwin — ACST (no DST)" },
  { value: "Australia/Hobart", label: "Australia/Hobart — AEST/AEDT" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland — NZST/NZDT" },
];

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isDiscipleOnly = user?.role === "user";
  const [userName, setUserName] = useState("");
  const [leaderDisplayName, setLeaderDisplayName] = useState("Not yet assigned to a group.");
  const [dailyReminder, setDailyReminder] = useState(true);
  const [timezone, setTimezone] = useState("Australia/Adelaide");
  const [leaderProfileId, setLeaderProfileId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showLeaderAccessForm, setShowLeaderAccessForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setUserName(user.display_name || user.full_name || "");
      setDailyReminder(user.daily_reminder !== false);

      // Fetch leader name from their user record (for disciples)
      const olId = user.oversight_leader_id;
      if (olId) {
        base44.entities.User.filter({ id: olId }).then((results) => {
          const leader = results[0];
          if (leader) {
            setLeaderDisplayName(leader.display_name || leader.full_name || leader.email || "Unknown Leader");
          } else {
            setLeaderDisplayName("Not yet assigned to a group.");
          }
        });
      } else {
        setLeaderDisplayName("Not yet assigned to a group.");
      }

      // Fetch admin's own OversightLeaderProfile for timezone
      if (isAdmin) {
        base44.entities.OversightLeaderProfile.filter({ user_id: user.id }).then((results) => {
          if (results[0]) {
            setLeaderProfileId(results[0].id);
            setTimezone(results[0].timezone || "Australia/Adelaide");
          }
        });
      }
    }
  }, [user?.id]);

  const handleSaveSettings = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      display_name: userName,
      daily_reminder: dailyReminder,
    });
    // Save timezone to OversightLeaderProfile for admins
    if (isAdmin) {
      if (leaderProfileId) {
        await base44.entities.OversightLeaderProfile.update(leaderProfileId, { timezone });
      } else {
        const created = await base44.entities.OversightLeaderProfile.create({ user_id: user.id, timezone });
        setLeaderProfileId(created.id);
      }
    }
    setSaving(false);
  };

  return (
    <div className="px-5 pt-6 pb-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/Home" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profile</h2>
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Your Name</Label>
          <Input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="bg-secondary border-0 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Leader Name</Label>
          <Input
            value={leaderDisplayName}
            disabled
            className="mt-1 border-0 cursor-default select-none"
            style={{ background: "#F0F0F0", color: "#888", outline: "none", boxShadow: "none" }}
          />
        </div>
        {isAdmin && (
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Your Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="bg-secondary border-0 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">Used for all calendar invites and appointment times.</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Daily Reminders</p>
            <p className="text-xs text-muted-foreground">Bible reading & prayer</p>
          </div>
          <Switch checked={dailyReminder} onCheckedChange={setDailyReminder} />
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground font-semibold"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Leader Access Request - only for Disciples without leader access */}
      {isDiscipleOnly && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Request Leader Access</h2>
              <p className="text-xs text-muted-foreground mt-1">
                If you're stepping into a leadership role, request access to manage your own group.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowLeaderAccessForm(true)}
            className="w-full bg-primary text-primary-foreground font-semibold"
          >
            Request Leader Access
          </Button>
        </div>
      )}

      {/* Account Actions */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account</h2>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 justify-start text-foreground"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 justify-start text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </Button>
      </div>

      <LeaderAccessForm open={showLeaderAccessForm} onOpenChange={setShowLeaderAccessForm} />

      {/* Delete Account Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete your account? All your data will be permanently removed. This cannot be undone.
          </p>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await base44.auth.deleteMe();
                base44.auth.logout();
              }}
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}