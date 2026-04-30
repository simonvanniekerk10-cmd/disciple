/**
 * useGroupContext — resolves the current user's oversight_leader_id.
 * Uses native Base44 role field (user.role) — no roles array.
 * For admins, their own user ID is their leader ID.
 * For users, their oversight_leader_id points to their leader.
 */
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export function useGroupContext() {
  const { user } = useAuth();
  const role = user?.role || "user";

  const [resolvedOlId, setResolvedOlId] = useState(user?.oversight_leader_id || null);
  const [isLoading, setIsLoading] = useState(role === "user" && !user?.oversight_leader_id);

  useEffect(() => {
    if (role !== "user") return;

    if (user?.oversight_leader_id) {
      setResolvedOlId(user.oversight_leader_id);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    // Single immediate check in case DB is ahead of auth context
    base44.auth.me().then((me) => {
      if (cancelled) return;
      setResolvedOlId(me?.oversight_leader_id || null);
      setIsLoading(false);
    });

    // Subscribe to real-time User entity changes
    const unsub = base44.entities.User.subscribe(async (event) => {
      if (cancelled) return;
      if (event.type === "update" && event.data?.id === user?.id) {
        const me = await base44.auth.me();
        if (!cancelled) {
          setResolvedOlId(me?.oversight_leader_id || null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user?.id, user?.oversight_leader_id, role]);

  if (role === "super_admin") {
    return { role, oversight_leader_id: null, isLoading: false };
  }
  if (role === "admin") {
    return { role, oversight_leader_id: user?.id || null, isLoading: false };
  }
  return { role, oversight_leader_id: resolvedOlId, isLoading };
}