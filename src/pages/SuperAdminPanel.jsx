import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import { Crown, Users, Plus, Copy, ChevronDown, ChevronUp, UserX, AlertTriangle, Shield, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, differenceInDays, parseISO } from "date-fns";

function getActivityStatus(lastActiveDate) {
  if (!lastActiveDate) return "dormant";
  const days = differenceInDays(new Date(), parseISO(lastActiveDate));
  if (days <= 7) return "active";
  if (days <= 14) return "inactive";
  return "dormant";
}
const STATUS_CONFIG = {
  active:   { label: "Active",   className: "bg-emerald-500/15 text-emerald-400" },
  inactive: { label: "Inactive", className: "bg-yellow-500/15 text-yellow-400" },
  dormant:  { label: "Dormant",  className: "bg-muted text-muted-foreground" },
};

export default function SuperAdminPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [unassignedSelections, setUnassignedSelections] = useState({});
  const [assigningDiscipleId, setAssigningDiscipleId] = useState(null);

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
    enabled: user?.role === "super_admin",
  });

  const { data: allSlots = [] } = useQuery({
    queryKey: ["allSlots"],
    queryFn: () => base44.entities.CatchUpSlot.list("-created_date", 500),
    enabled: user?.role === "super_admin",
  });

  const { data: allChallenges = [] } = useQuery({
    queryKey: ["allChallenges"],
    queryFn: () => base44.entities.ChallengeSelection.list("-created_date", 500),
    enabled: user?.role === "super_admin",
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ["allLogs"],
    queryFn: () => base44.entities.DailyLog.list("-date", 1000),
    enabled: user?.role === "super_admin",
  });

  const { data: leaderRequests = [] } = useQuery({
    queryKey: ["leaderRequests"],
    queryFn: () => base44.entities.LeaderAccessRequest.filter({ status: "pending" }, "-created_date", 100),
    enabled: user?.role === "super_admin",
  });

  if (user?.role !== "super_admin") return <Navigate to="/Home" replace />;

  // Leaders = role: "admin" only (never super_admin, never user)
  const leaders = allUsers.filter((u) => u.role === "admin");
  // Disciples = role: "user" only
  const disciples = allUsers.filter((u) => u.role === "user");
  const unassignedDisciples = disciples.filter((u) => !u.oversight_leader_id);

  // Stats per leader (keyed by their user ID)
  const discipleCountByLeader = {};
  disciples.filter((u) => u.oversight_leader_id).forEach((u) => {
    discipleCountByLeader[u.oversight_leader_id] = (discipleCountByLeader[u.oversight_leader_id] || 0) + 1;
  });

  const bookedCountByLeader = {};
  allSlots.filter((s) => s.status === "booked" && s.oversight_leader_id).forEach((s) => {
    bookedCountByLeader[s.oversight_leader_id] = (bookedCountByLeader[s.oversight_leader_id] || 0) + 1;
  });

  const challengeCountByLeader = {};
  allChallenges.filter((c) => c.oversight_leader_id).forEach((c) => {
    challengeCountByLeader[c.oversight_leader_id] = (challengeCountByLeader[c.oversight_leader_id] || 0) + 1;
  });

  // Last active date per user email from logs
  const lastActiveDateByEmail = {};
  allLogs.forEach((l) => {
    if (!lastActiveDateByEmail[l.created_by] || l.date > lastActiveDateByEmail[l.created_by]) {
      lastActiveDateByEmail[l.created_by] = l.date;
    }
  });

  const handleInviteLeader = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    try {
      await base44.users.inviteUser(newEmail.trim(), "admin");
      setNewEmail("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveRequest = async (request) => {
    await base44.functions.invoke("processLeaderAccessRequest", { request_id: request.id, status: "approved" });
    queryClient.invalidateQueries({ queryKey: ["leaderRequests"] });
    queryClient.invalidateQueries({ queryKey: ["allUsers"] });
  };

  const handleDeclineRequest = async (request) => {
    await base44.functions.invoke("processLeaderAccessRequest", { request_id: request.id, status: "declined" });
    queryClient.invalidateQueries({ queryKey: ["leaderRequests"] });
  };

  const handleReassign = async (disciple, leaderId) => {
    await base44.entities.User.update(disciple.id, { oversight_leader_id: leaderId || null });
    queryClient.invalidateQueries({ queryKey: ["allUsers"] });
  };

  const handleAssignUnassigned = async (disciple, leaderId) => {
    if (!leaderId) return;
    setAssigningDiscipleId(disciple.id);
    try {
      await base44.entities.User.update(disciple.id, { oversight_leader_id: leaderId });
      setUnassignedSelections((prev) => { const u = { ...prev }; delete u[disciple.id]; return u; });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    } finally {
      setAssigningDiscipleId(null);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!removingMember) return;
    setConfirming(true);
    await base44.entities.User.update(removingMember.id, { oversight_leader_id: null });
    queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    setConfirming(false);
    setRemovingMember(null);
  };

  const copyInviteLink = (leaderId) => {
    const link = `${window.location.origin}/join?token=${leaderId}`;
    navigator.clipboard.writeText(link);
    setCopied(leaderId);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="px-5 pt-6 pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Super Admin</h1>
          <p className="text-xs text-muted-foreground">Master dashboard — all groups</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border text-center">
          <p className="text-2xl font-bold">{leaders.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Leaders</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border text-center">
          <p className="text-2xl font-bold">{disciples.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Disciples</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border text-center">
          <p className="text-2xl font-bold">{allSlots.filter((s) => s.status === "booked").length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bookings</p>
        </div>
      </div>

      {/* Leaders List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Leaders</h2>
          <Button
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
            className="bg-primary text-primary-foreground text-xs h-8 font-semibold rounded-full px-3"
          >
            <Plus className="w-3 h-3 mr-1" /> Invite Leader
          </Button>
        </div>

        {showCreate && (
          <div className="px-4 py-4 border-b border-border bg-secondary space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email *</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="leader@example.com" type="email" className="bg-card border-0 mt-1" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleInviteLeader} disabled={saving || !newEmail} className="flex-1 bg-primary text-primary-foreground text-xs h-8 font-semibold">
                {saving ? "Sending..." : "Send Invite"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-xs h-8">Cancel</Button>
            </div>
            <p className="text-[10px] text-muted-foreground">An invite email will be sent. They'll be added as a Leader (admin role).</p>
          </div>
        )}

        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No leaders yet. Invite one above.</p>
        ) : (
          <div className="divide-y divide-border">
            {leaders.map((leader) => {
              const discipleCount = discipleCountByLeader[leader.id] || 0;
              const bookings = bookedCountByLeader[leader.id] || 0;
              const challenges = challengeCountByLeader[leader.id] || 0;
              const isExpanded = expandedGroup === leader.id;
              const groupMembers = disciples.filter((u) => u.oversight_leader_id === leader.id);

              return (
                <div key={leader.id}>
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{leader.full_name || leader.email}</p>
                        <p className="text-xs text-muted-foreground">{leader.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => setExpandedGroup(isExpanded ? null : leader.id)}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {discipleCount}
                        {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{bookings} bookings</Badge>
                      <Badge variant="secondary" className="text-[10px]">{challenges} challenges</Badge>
                    </div>
                    {/* Invite link uses the leader's own Base44 user ID as token */}
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[10px] bg-secondary px-2 py-1.5 rounded-lg truncate text-muted-foreground">
                        {window.location.origin}/join?token={leader.id}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyInviteLink(leader.id)}>
                        <Copy className={`w-3 h-3 ${copied === leader.id ? "text-primary" : ""}`} />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-secondary/30">
                      {groupMembers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No members in this group.</p>
                      ) : (
                        <div className="divide-y divide-border">
                          {groupMembers.map((m) => {
                            const lastActive = lastActiveDateByEmail[m.email] || null;
                            const status = getActivityStatus(lastActive);
                            const sc = STATUS_CONFIG[status];
                            return (
                              <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-secondary border border-border shrink-0 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    {(m.full_name || m.email || "?")[0].toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-medium truncate">{m.full_name || m.email}</p>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${sc.className}`}>
                                      {sc.label}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <select
                                    className="text-[10px] bg-card border border-border rounded px-1.5 py-1 text-foreground"
                                    value={m.oversight_leader_id || ""}
                                    onChange={(e) => handleReassign(m, e.target.value)}
                                  >
                                    <option value="">Unassign</option>
                                    {leaders.map((l) => (
                                      <option key={l.id} value={l.id}>{l.full_name || l.email}</option>
                                    ))}
                                  </select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => setRemovingMember({ ...m, name: m.full_name || m.email })}
                                  >
                                    <UserX className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Leader Access Requests */}
      {leaderRequests.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Leader Requests ({leaderRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {leaderRequests.map((req) => (
              <div key={req.id} className="px-4 py-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold">{req.user_name}</p>
                  <p className="text-xs text-muted-foreground">{req.user_email}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-xs">
                  <p><span className="text-muted-foreground">Church:</span> {req.church}</p>
                  <p><span className="text-muted-foreground">Role:</span> {req.leadership_role}</p>
                  <p><span className="text-muted-foreground">Pastor Approved:</span> {req.pastor_approved ? "✓ Yes" : "✗ No"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApproveRequest(req)}>
                    <Check className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDeclineRequest(req)}>
                    <X className="w-3 h-3 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unassigned Disciples */}
      {unassignedDisciples.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Unassigned Disciples ({unassignedDisciples.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {unassignedDisciples.map((disciple) => {
              const selectedLeaderId = unassignedSelections[disciple.id];
              return (
                <div key={disciple.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{disciple.full_name || disciple.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{disciple.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground"
                      value={selectedLeaderId || ""}
                      onChange={(e) => setUnassignedSelections((prev) => ({ ...prev, [disciple.id]: e.target.value || null }))}
                    >
                      <option value="">Select leader...</option>
                      {leaders.map((l) => (
                        <option key={l.id} value={l.id}>{l.full_name || l.email}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground text-xs h-8 font-semibold px-3 whitespace-nowrap"
                      disabled={!selectedLeaderId || assigningDiscipleId === disciple.id}
                      onClick={() => handleAssignUnassigned(disciple, selectedLeaderId)}
                    >
                      {assigningDiscipleId === disciple.id ? "Assigning..." : "Assign"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Disciples */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Disciples</h2>
        </div>
        {disciples.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No disciples yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {disciples.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.full_name || d.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.email}</p>
                </div>
                <select
                  className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground shrink-0"
                  value={d.oversight_leader_id || ""}
                  onChange={(e) => handleReassign(d, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {leaders.map((l) => (
                    <option key={l.id} value={l.id}>{l.full_name || l.email}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove Member Dialog */}
      <Dialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Remove Member
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-foreground">{removingMember?.name}</span> from their group?
          </p>
          <p className="text-xs text-muted-foreground">Their data is preserved but they'll be unassigned and need a new invite link to rejoin.</p>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setRemovingMember(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={confirming} onClick={handleConfirmRemoveMember}>
              {confirming ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}