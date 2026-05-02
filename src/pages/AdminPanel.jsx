import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AdminCalendar from "../components/admin/AdminCalendar";
import PastBookingsLog from "../components/admin/PastBookingsLog";
import GroupMembers from "../components/admin/GroupMembers";
import ChallengeBuilder from "../components/admin/ChallengeBuilder";
import ChallengeDashboard from "../components/admin/ChallengeDashboard";
import WeeklyCareSummary from "../components/admin/WeeklyCareSummary";
import CorporatePrayerAdmin from "../components/admin/CorporatePrayerAdmin";
import TimezoneOnboarding from "../components/admin/TimezoneOnboarding";
import PendingBookings from "../components/admin/PendingBookings";
import CalendarSettings from "../components/admin/CalendarSettings";

export default function AdminPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAllowed = user && (user.role === "admin" || user.role === "super_admin");

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["catchupSlots", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('catch_up_slots')
        .select('*')
        .eq('oversight_leader_id', user.id)
        .order('date', { ascending: true })
        .limit(500);
      return data || [];
    },
    enabled: !!user?.id && isAllowed,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const { data: leaderProfiles = [], isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["leaderProfile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('oversight_leader_profiles')
        .select('*')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id && isAllowed,
    staleTime: 0,
  });

  if (!isAllowed) return <Navigate to="/Home" replace />;

  const leaderProfile = leaderProfiles[0] || null;
  const timezoneSet = !!leaderProfile?.timezone;

  const handleCancelBooking = async (slot) => {
    await supabase.from('catch_up_slots').delete().eq('id', slot.id);
    queryClient.invalidateQueries({ queryKey: ['catchupSlots', user?.id] });
  };

  if (!profileLoading && !timezoneSet) {
    return (
      <TimezoneOnboarding
        userId={user?.id}
        existingProfileId={leaderProfile?.id || null}
        onComplete={() => refetchProfile()}
      />
    );
  }

  return (
    <div className="px-5 pt-6 pb-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D50' }}>Admin</h1>
          <p className="text-xs" style={{ color: '#7A8BAA' }}>Your group management tools</p>
        </div>
      </div>

      {isLoading || profileLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <PendingBookings
            slots={slots}
            leaderProfile={leaderProfile}
            leaderName={user?.full_name || "Leader"}
            leaderEmail={leaderProfile?.notification_email || user?.email}
            onConfirmed={() => queryClient.invalidateQueries({ queryKey: ["catchupSlots", user?.id] })}
          />
          <GroupMembers />
          <AdminCalendar slots={slots} />
          <PastBookingsLog slots={slots} leaderTimezone={leaderProfile?.timezone} onCancelBooking={handleCancelBooking} />
          <CalendarSettings leaderProfile={leaderProfile} onSaved={() => queryClient.invalidateQueries({ queryKey: ["leaderProfile", user?.id] })} />
          <ChallengeBuilder />
          <ChallengeDashboard />
          <CorporatePrayerAdmin />
          <WeeklyCareSummary />
        </>
      )}
    </div>
  );
}