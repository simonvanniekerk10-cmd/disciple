import { format } from "date-fns";
import { BookOpen, Heart, Target, ClipboardList } from "lucide-react";

export default function RecentActivity({ logs, updates }) {
  const activities = [];

  (logs || []).forEach((log) => {
    if (log.bible_reading_minutes > 0) {
      activities.push({
        type: "bible",
        text: `Bible reading: ${log.bible_reading_minutes} min`,
        date: log.date || log.created_date,
        icon: BookOpen,
      });
    }
    if (log.prayer_minutes > 0) {
      activities.push({
        type: "prayer",
        text: `Prayer time: ${log.prayer_minutes} min`,
        date: log.date || log.created_date,
        icon: Heart,
      });
    }
  });

  (updates || []).forEach((u) => {
    activities.push({
      type: "update",
      text: `Challenge update: ${u.challenge_title || "Week " + u.week_number}`,
      date: u.created_date,
      icon: ClipboardList,
    });
  });

  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = activities.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border text-center">
        <p className="text-muted-foreground text-sm">No recent activity yet. Start logging!</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border">
        {recent.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.text}</p>
                <p className="text-xs text-muted-foreground">
                  {a.date ? format(new Date(a.date), "MMM d, yyyy") : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}