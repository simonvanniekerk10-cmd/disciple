import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import GroupCard from "./GroupCard";

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AccountabilityGroupSection({ user }) {
  const [memberships, setMemberships] = useState([]);
  const [groupMap, setGroupMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newCode, setNewCode] = useState("");

  const loadGroups = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: mems } = await supabase
      .from('accountability_group_members')
      .select('*')
      .eq('user_id', user.id);
    setMemberships(mems || []);
    if (mems && mems.length > 0) {
      const groupIds = [...new Set(mems.map((m) => m.group_id))];
      const { data: groups } = await supabase
        .from('accountability_groups')
        .select('*')
        .in('id', groupIds);
      const map = {};
      (groups || []).forEach((g) => { map[g.id] = g; });
      setGroupMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { loadGroups(); }, [user?.id]);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setSaving(true);
    setError("");
    const code = generateInviteCode();
    const { data: grp } = await supabase
      .from('accountability_groups')
      .insert({
        name: groupName.trim(),
        created_by_user_id: user.id,
        invite_code: code,
      })
      .select()
      .single();
    await supabase.from('accountability_group_members').insert({
      group_id: grp.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
    });
    setNewCode(code);
    setSaving(false);
    loadGroups();
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setSaving(true);
    setError("");
    const { data: groups } = await supabase
      .from('accountability_groups')
      .select('*')
      .eq('invite_code', joinCode.trim().toUpperCase());
    if (!groups || groups.length === 0) {
      setError("No group found with that code.");
      setSaving(false);
      return;
    }
    const grp = groups[0];
    const existing = memberships.find((m) => m.group_id === grp.id);
    if (existing) {
      setError("You're already in this group.");
      setSaving(false);
      return;
    }
    await supabase.from('accountability_group_members').insert({
      group_id: grp.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
    });
    setSaving(false);
    setMode(null);
    setJoinCode("");
    loadGroups();
  };

  const resetForm = () => {
    setMode(null);
    setGroupName("");
    setJoinCode("");
    setError("");
    setNewCode("");
  };

  if (loading) {
    return (
      <div className="mt-6 pb-8">
        <h2 className="text-base font-bold mb-3" style={{ color: "#1E2D50" }}>Accountability Group</h2>
        <div className="h-16 rounded-2xl animate-pulse" style={{ background: "#E8EDF5" }} />
      </div>
    );
  }

  return (
    <div className="mt-6 pb-8 space-y-4">
      <h2 className="text-base font-bold" style={{ color: "#1E2D50" }}>Accountability Group</h2>

      {memberships.map((mem) => {
        const grp = groupMap[mem.group_id];
        if (!grp) return null;
        return (
          <GroupCard
            key={mem.id}
            group={grp}
            membership={mem}
            user={user}
            onLeft={loadGroups}
          />
        );
      })}

      {mode === "create" && !newCode && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "#FFFFFF", border: "1px solid #D0DAF0" }}>
          <p className="text-sm font-semibold" style={{ color: "#1E2D50" }}>Create a New Group</p>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (e.g. The Crew)"
            className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
            style={{ borderColor: "#D0DAF0", color: "#1E2D50", background: "#EEF2F9" }}
          />
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 py-2 rounded-xl text-sm border" style={{ borderColor: "#D0DAF0", color: "#7A8BAA" }}>Cancel</button>
            <button
              onClick={handleCreate}
              disabled={saving || !groupName.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#4A80C4", opacity: saving || !groupName.trim() ? 0.6 : 1 }}
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {mode === "create" && newCode && (
        <div className="rounded-2xl p-4 space-y-3 text-center" style={{ background: "#FFFFFF", border: "1px solid #D0DAF0" }}>
          <p className="text-sm font-semibold" style={{ color: "#1E2D50" }}>Group created! 🎉</p>
          <p className="text-xs" style={{ color: "#7A8BAA" }}>Share this code with friends to invite them:</p>
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border" style={{ background: "#EEF2F9", borderColor: "#D0DAF0", color: "#1E2D50" }}>{newCode}</span>
          </div>
          <button onClick={resetForm} className="text-xs underline" style={{ color: "#7A8BAA" }}>Done</button>
        </div>
      )}

      {mode === "join" && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "#FFFFFF", border: "1px solid #D0DAF0" }}>
          <p className="text-sm font-semibold" style={{ color: "#1E2D50" }}>Join a Group</p>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Paste invite code"
            className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none uppercase"
            style={{ borderColor: "#D0DAF0", color: "#1E2D50", background: "#EEF2F9" }}
          />
          {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 py-2 rounded-xl text-sm border" style={{ borderColor: "#D0DAF0", color: "#7A8BAA" }}>Cancel</button>
            <button
              onClick={handleJoin}
              disabled={saving || !joinCode.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#4A80C4", opacity: saving || !joinCode.trim() ? 0.6 : 1 }}
            >
              {saving ? "Joining..." : "Join"}
            </button>
          </div>
        </div>
      )}

      {mode === null && (
        <div className="flex gap-3">
          <button
            onClick={() => setMode("create")}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "#D0DAF0", color: "#4A80C4", background: "white" }}
          >
            + Create New Group
          </button>
          <button
            onClick={() => setMode("join")}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "#D0DAF0", color: "#4A80C4", background: "white" }}
          >
            + Join a Group
          </button>
        </div>
      )}
    </div>
  );
}