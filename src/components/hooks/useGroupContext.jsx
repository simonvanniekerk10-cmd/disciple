import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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

    // Check profile directly from Supabase
    supabase
      .from('profiles')
      .select('oversight_leader_id')
      .eq('id', user?.id)
      .single()
      .then(({ data }) => {
        setResolvedOlId(data?.oversight_leader_id || null);
        setIsLoading(false);
      });

    // Subscribe to real-time profile changes
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user?.id}`
      }, (payload) => {
        setResolvedOlId(payload.new?.oversight_leader_id || null);
        setIsLoading(false);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, user?.oversight_leader_id, role]);

  if (role === "super_admin") {
    return { role, oversight_leader_id: null, isLoading: false };
  }
  if (role === "admin") {
    return { role, oversight_leader_id: user?.id || null, isLoading: false };
  }
  return { role, oversight_leader_id: resolvedOlId, isLoading };
}