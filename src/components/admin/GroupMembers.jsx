import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { format, differenceInDays, parseISO } from "date-fns";
import { Users, UserX, Copy, Check, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

function MemberCard({ member, onRemove }) {
  const status = getActivityStatus(member.lastActiveDate);
  const sc = STATUS_CONFIG[status];
  const joinedDate = member.joinedDate ? format(parseISO(member.joinedDate), "d MMM yyyy") : "Unknown";

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors">
      <div className="w-9 h-9 rounded-full bg-secondary border border-border shrink-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-muted-foreground">
          {(member.name || "?")[0].toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{member.name || member.email}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0 ${sc.className}`}>
            {sc.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Joined {joinedDate}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(member)}
      >
        <UserX className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function GroupMembers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [removingMember, setRemovingMember] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["groupMembers", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('oversight_leader_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["groupLogs", user?.id],
    queryFn: async () => {
      const memberIds = members.map(m => m.id);
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .in('user_id', memberIds)
        .order('date', { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: members.length > 0,
  });

  const enrichedMembers = members.map((m) => {
    const memberLogs = logs.filter((l) => l.user_id === m.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastLog = memberLogs[0];
    return {
      ...m,
      name: m.display_name || m.full_name || m.email,
      lastActiveDate: lastLog?.date || m.created_at?.split("T")[0] || null,
      joinedDate: m.created_at?.split("T")[0] || null,
    };
  });

  const inviteLink = user ? `${window.location.origin}/join?token=${user.id}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    setConfirming(true);
    await supabase
      .from('profiles')
      .update({ oversight_leader_id: null })
      .eq('id', removingMember.id);
    queryClient.invalidateQueries({ queryKey: ["groupMembers", user?.id] });
    setRemovingMember(null);
    setConfirming(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex-1">My Group</h2>
        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-medium">
          {enrichedMembers.length} {enrichedMembers.length === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Invite Link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] bg-white px-3 py-2 rounded-lg truncate min-w-0 border border-border font-mono">
            {inviteLink}
          </code>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyLink}>
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
        {copied && <p className="text-xs text-primary mt-1">Copied to clipboard!</p>}
      </div>

      {isLoading ? (
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
            <MemberCard key={m.id} member={m} onRemove={setRemovingMember} />
          ))}
        </div>
      )}

      <Dialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Remove Member
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <span className="font-semibold text-foreground">{removingMember?.name}</span> from your group?
          </p>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setRemovingMember(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={confirming} onClick={handleConfirmRemove}>
              {confirming ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}