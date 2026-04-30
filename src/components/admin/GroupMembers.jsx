import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, differenceInDays, parseISO } from "date-fns";
import { Users, UserX, Copy, Check, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import MemberProfile from "@/components/admin/MemberProfile";

function getActivityStatus(lastActiveDate) {
  if (!lastActiveDate) return "dormant";
  const days = differenceInDays(new Date(), parseISO(lastActiveDate));
  if (days <= 7) return "active";
  if (days <= 14) return "inactive";
  return "dormant";
}

const STATUS_CONFIG = {
  active:   { label: "Active",   className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  inactive: { label: "Inactive", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  dormant:  { label: "Dormant",  className: "bg-muted text-muted-foreground border-border" },
};

function MemberCard({ member, onRemove, onClick }) {
  const status = getActivityStatus(member.lastActiveDate);
  const sc = STATUS_CONFIG[status];
  const joinedDate = member.joinedDate ? format(parseISO(member.joinedDate), "d MMM yyyy") : "Unknown";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-secondary border border-border shrink-0 overflow-hidden flex items-center justify-center">
        {member.profile_photo_url ? (
          <img src={member.profile_photo_url} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {(member.name || "?")[0].toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{member.name || member.email}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0 ${sc.className}`}>
            {sc.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-[10px] text-muted-foreground">Joined {joinedDate}</p>
          {member.challengeStatus && (
            <p className="text-[10px] text-muted-foreground">
              Challenge: <span className="capitalize">{member.challengeStatus.replace("_", " ")}</span>
            </p>
          )}
        </div>
      </div>

      {/* Remove */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onRemove(member); }}
      >
        <UserX className="w-3.5 h-3.5" />
      </Button>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
    </div>
  );
}

export default function GroupMembers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [removingMember, setRemovingMember] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  // Query via backend function to bypass User entity RLS (admins can't read other users directly)
  const { data: members = [], isLoading: loadingMembers, refetch } = useQuery({
    queryKey: ["groupMembers", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getGroupMembers', {});
      return res.data?.members || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ["adminChallengeSelections", user?.id],
    queryFn: () => base44.entities.ChallengeSelection.filter({ oversight_leader_id: user.id }, "-created_date", 200),
    enabled: !!user?.id,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["groupLogs", user?.id],
    queryFn: () => base44.entities.DailyLog.filter({ oversight_leader_id: user.id }, "-date", 500),
    enabled: !!user?.id,
  });

  // Invite link uses the leader's own user ID as token — no profile entity needed
  const profile = user ? { user_id: user.id } : null;

  // Real-time subscription to User changes
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.User.subscribe(() => {
      refetch();
    });
    return unsub;
  }, [user?.id, refetch]);

  // Enrich members with challenge status and last active date
  const enrichedMembers = members.map((m) => {
    const memberChallenges = challenges.filter((c) => c.created_by === m.email);
    const active = memberChallenges.find((c) => c.status === "in_progress" || c.status === "not_started");
    const memberLogs = logs.filter((l) => l.created_by === m.email).sort((a, b) => b.date.localeCompare(a.date));
    const lastLog = memberLogs[0];
    return {
      ...m,
      name: m.full_name || m.email,  // Use full_name from User entity
      challengeStatus: active?.status || null,
      lastActiveDate: lastLog?.date || m.created_date?.split("T")[0] || null,
      joinedDate: m.created_date?.split("T")[0] || null,
    };
  });

  // Token is the leader's real Base44 user ID
  const inviteLink = profile ? `${window.location.origin}/join?token=${profile.user_id}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    setConfirming(true);
    setRemoveError(null);
    try {
      const res = await base44.functions.invoke('removeMember', { memberId: removingMember.id });
      // Check for application-level error returned in 2xx response
      if (res.data?.error) throw new Error(res.data.error);
      // Optimistically remove from cache immediately
      queryClient.setQueryData(["groupMembers", user?.id], (old = []) =>
        old.filter((m) => m.id !== removingMember.id)
      );
      setRemovingMember(null);
      // Also trigger a background refetch to sync
      queryClient.invalidateQueries({ queryKey: ["groupMembers", user?.id] });
    } catch (err) {
      // Unwrap axios error if present
      const msg = err?.response?.data?.error || err?.message || "Failed to remove member. Please try again.";
      setRemoveError(msg);
    } finally {
      setConfirming(false);
    }
  };

  if (selectedMember) {
    return (
      <MemberProfile
        member={selectedMember}
        olId={user?.id}
        onBack={() => setSelectedMember(null)}
      />
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex-1">My Group</h2>
        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-medium">
          {enrichedMembers.length} {enrichedMembers.length === 1 ? "member" : "members"}
        </span>
      </div>

      {/* Invite Link */}
      {profile && (
        <div className="px-4 py-3 border-b border-border bg-sage-code-bg">
          <p className="text-[10px] text-sage-label uppercase tracking-wider font-semibold mb-1.5">Invite Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] bg-white px-3 py-2 rounded-lg truncate text-sage-code-text min-w-0 border border-sage-card-border font-mono">
              {inviteLink}
            </code>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyLink}>
              {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          {copied && <p className="text-xs text-primary mt-1">Copied to clipboard!</p>}
        </div>
      )}

      {/* Member List */}
      {loadingMembers ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : enrichedMembers.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No members yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Share your invite link to get started.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {enrichedMembers.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              onRemove={setRemovingMember}
              onClick={() => setSelectedMember(m)}
            />
          ))}
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removingMember} onOpenChange={() => { setRemovingMember(null); setRemoveError(null); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Remove Member
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <span className="font-semibold text-foreground">{removingMember?.name}</span> from your group? They will become unassigned.
          </p>
          {removeError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{removeError}</p>
          )}
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setRemovingMember(null); setRemoveError(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={confirming}
              onClick={handleConfirmRemove}
            >
              {confirming ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}