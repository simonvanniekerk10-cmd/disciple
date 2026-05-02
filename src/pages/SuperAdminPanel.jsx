import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import { Crown, Users, Copy, ChevronDown, ChevronUp, UserX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { differenceInDays, parseISO } from "date-fns";

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
  const [copied, setCopied] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [unassignedSelections, setUnassignedSelections] = useState({});
  const [assigningDiscipleId, setAssigningDiscipleId] = useState(null);

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: user?.role === "super_admin",
  });

  const { data: allSlots = [] } = useQuery({
    queryKey: ["allSlots"],
    queryFn: async () => {
      const { data } = await supabase.from('catch_up_slots').select('*').limit(500);
      return data || [];
    },
    enabled: user?.role === "super_admin",
  });

  const { data: allChallenges = [] } = useQuery({
    queryKey: ["allChallenges"],
    queryFn: async () => {
      const { data } = await supabase.from('challenge_selections').select('*').limit(500);
      return data || [];
    },
    enabled: user?.role === "super_admin",
  });

  if (user?.role !== "super_admin") return <Navigate to="/Home" replace />;

  const leaders = allUsers.filter((u) => u.role === "admin");
  const disciples = allUsers.filter((u) => u.role === "user");
  const unassignedDisciples = disciples.filter((u) => !u.oversight_leader_id);

  const discipleCountByLeader = {};
  disciples.filter((u) => u.oversight_leader_id).forEach((u) => {
    discipleCountByLeader[u.oversight_leader_id] = (discipleCountByLeader[u.oversight_leader_id] || 0) + 1;
  });

  const bookedCountByLeader = {};
  allSlots.filter((s) => s.status === "booked" && s.oversight_leader_id).forEach((s) => {
    bookedCountByLeader[s.oversight_leader_id] = (bookedCountByLeader[s.oversight_leader_id] || 0) + 1;
  });

  const handleReassign = async (disciple, leaderId) => {
    await supabase
      .from('profiles')
      .update({ oversight_leader_id: leaderId || null })
      .eq('id', disciple.id);
    queryClient.invalidateQueries({ queryKey: ["allUsers"] });
  };

  const handleAssignUnassigned = async (disciple, leaderId) => {
    if (!leaderId) return;
    setAssigningDiscipleId(disciple.id);
    await supabase
      .from('profiles')
      .update({ oversight_leader_id: leaderId })
      .eq('id', disciple.id);
    setUnassignedSelections((prev) => { const u = { ...prev }; delete u[disciple.id]; return u; });
    queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    setAssigningDiscipleId(null);
  };

  const handleConfirmRemoveMember = async () => {
    if (!removingMember) return;
    setConfirming(true);
    await supabase
      .from('profiles')
      .update({ oversight_leader_id: null })
      .eq('id', removingMember.id);
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Super Admin</h1>
          <p className="text-xs text-muted-foreground">Master dashboard — all groups</p>
        </div>
      </div>

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

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Leaders</h2>
        </div>
        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No leaders yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {leaders.map((leader) => {
              const discipleCount = discipleCountByLeader[leader.id] || 0;
              const bookings = bookedCountByLeader[leader.id] || 0;
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
                    </div>
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
                            const status = getActivityStatus(m.created_at?.split("T")[0]);
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
                      className="bg-primary text-primary-foreground text-xs h-8 font-semibold px-3"
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