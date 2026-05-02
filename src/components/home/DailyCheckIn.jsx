import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Heart, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function DailyCheckIn({ todayLog, streak, olId }) {
  const { user } = useAuth();
  const [bibleMinutes, setBibleMinutes] = useState("");
  const [prayerMinutes, setPrayerMinutes] = useState("");
  const [savingBible, setSavingBible] = useState(false);
  const [savingPrayer, setSavingPrayer] = useState(false);
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const logBible = async () => {
    setSavingBible(true);
    const mins = parseInt(bibleMinutes) || 0;
    if (todayLog) {
      await supabase
        .from('daily_logs')
        .update({ bible_reading_minutes: (todayLog.bible_reading_minutes || 0) + mins })
        .eq('id', todayLog.id);
    } else {
      await supabase.from('daily_logs').insert({
        user_id: user.id,
        date: today,
        bible_reading_minutes: mins,
        prayer_minutes: 0,
        oversight_leader_id: olId,
      });
    }
    setBibleMinutes("");
    queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
    setSavingBible(false);
  };

  const logPrayer = async () => {
    setSavingPrayer(true);
    const mins = parseInt(prayerMinutes) || 0;
    if (todayLog) {
      await supabase
        .from('daily_logs')
        .update({ prayer_minutes: (todayLog.prayer_minutes || 0) + mins })
        .eq('id', todayLog.id);
    } else {
      await supabase.from('daily_logs').insert({
        user_id: user.id,
        date: today,
        bible_reading_minutes: 0,
        prayer_minutes: mins,
        oversight_leader_id: olId,
      });
    }
    setPrayerMinutes("");
    queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
    setSavingPrayer(false);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#FFFFFF', borderColor: '#B8CCE8' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: '#4A80C4' }} />
            <span className="font-semibold text-sm" style={{ color: '#1E2D50' }}>Bible Reading</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: '#1E2D50' }}>
              <Flame className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-bold text-white">{streak}-day streak</span>
            </div>
          )}
        </div>
        {todayLog?.bible_reading_minutes > 0 && (
          <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
            Today: {todayLog.bible_reading_minutes} min logged
          </p>
        )}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Minutes"
            value={bibleMinutes}
            onChange={(e) => setBibleMinutes(e.target.value)}
            className="font-medium"
            style={{ backgroundColor: '#EEF2F9', borderColor: '#B8CCE8', color: '#1E2D50' }}
          />
          <Button
            onClick={logBible}
            disabled={savingBible || !bibleMinutes}
            className="font-semibold shrink-0 text-white"
            style={{ backgroundColor: '#4A80C4' }}
          >
            {savingBible ? "..." : "Log Today"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#FFFFFF', borderColor: '#B8CCE8' }}>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5" style={{ color: '#4A80C4' }} />
          <span className="font-semibold text-sm" style={{ color: '#1E2D50' }}>Prayer/Worship Time</span>
        </div>
        {todayLog?.prayer_minutes > 0 && (
          <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
            Today: {todayLog.prayer_minutes} min logged
          </p>
        )}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Minutes"
            value={prayerMinutes}
            onChange={(e) => setPrayerMinutes(e.target.value)}
            className="font-medium"
            style={{ backgroundColor: '#EEF2F9', borderColor: '#B8CCE8', color: '#1E2D50' }}
          />
          <Button
            onClick={logPrayer}
            disabled={savingPrayer || !prayerMinutes}
            className="font-semibold shrink-0 text-white"
            style={{ backgroundColor: '#4A80C4' }}
          >
            {savingPrayer ? "..." : "Log Today"}
          </Button>
        </div>
      </div>
    </div>
  );
}