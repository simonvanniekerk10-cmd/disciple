import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import { ClipboardList, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek } from "date-fns";

const COLOR_EMOJI = { green: "🟢", amber: "🟡", red: "🔴" };
const COLOR_BADGE = {
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  amber: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
};

function LeaderCard({ leader }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-secondary rounded-xl border border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{COLOR_EMOJI[leader.status_color] || "⚪"}</span>
          <div>
            <p className="text-sm font-semibold leading-tight">{leader.name || leader.user_email}</p>
            <p className="text-xs text-muted-foreground">{leader.user_email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs border ${COLOR_BADGE[leader.status_color] || ""}`}>
            {leader.status_color?.toUpperCase() || "–"}
          </Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-card rounded-lg py-2 px-1">
              <p className="text-lg font-bold text-primary">{leader.devotion_days ?? "–"}</p>
              <p className="text-[10px] text-muted-foreground">Devotion Days</p>
            </div>
            <div className="bg-card rounded-lg py-2 px-1">
              <p className="text-lg font-bold text-primary">{leader.prayer_days ?? "–"}</p>
              <p className="text-[10px] text-muted-foreground">Prayer Days</p>
            </div>
            <div className="bg-card rounded-lg py-2 px-1">
              <p className="text-lg font-bold text-primary">{leader.devotion_uploads ?? "–"}</p>
              <p className="text-[10px] text-muted-foreground">Uploads</p>
            </div>
          </div>
          <div className="bg-card rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Challenge</span>
            <span className="text-xs font-medium capitalize">{leader.challenge_status || "none"}</span>
          </div>
          <div className="bg-card rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Update This Week</span>
            <span className="text-xs font-medium">{leader.latest_update_submitted ? "✅ Yes" : "❌ No"}</span>
          </div>
          {leader.pastoral_flag && (
            <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">Pastoral Note</p>
              <p className="text-sm italic text-foreground/80">{leader.pastoral_flag}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WeeklyCareSummary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: summaries = [] } = useQuery({
    queryKey: ["careSummaries", user?.id],
    queryFn: () => base44.entities.CareSummary.filter({ oversight_leader_id: user.id }, "-created_date", 5),
    enabled: !!user?.id,
  });

  const latest = summaries[0] || null;
  const leaders = latest?.summary_data ? (() => { try { return JSON.parse(latest.summary_data); } catch { return []; } })() : [];

  const handleGenerate = async () => {
    setGenerating(true);
    const conversation = await base44.agents.createConversation({
      agent_name: "weekly_care_summary",
      metadata: { name: "On-demand summary" },
    });
    await base44.agents.addMessage(conversation, {
      role: "user",
      content: `Generate the Weekly Care Summary for Leader user_id: ${user.id}. Do NOT send the email, just generate and store the summary.`,
    });
    // Poll for a moment then refresh
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["careSummaries", user?.id] });
      setGenerating(false);
    }, 12000);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Weekly Care Summary</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={handleGenerate}
          disabled={generating}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating…" : "Refresh"}
        </Button>
      </div>

      {latest ? (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{latest.week_label || `Week of ${latest.week_start_date}`}</span>
            <span>{latest.email_sent ? "📧 Email sent" : "📭 Email pending"}</span>
          </div>
          {leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No disciples found in your group yet.</p>
          ) : (
            <div className="space-y-2">
              {leaders.map((leader, i) => (
                <LeaderCard key={i} leader={leader} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-muted-foreground">No summary generated yet.</p>
          <p className="text-xs text-muted-foreground">Summaries are automatically sent every Monday at 8am, or you can generate one now.</p>
          <Button size="sm" onClick={handleGenerate} disabled={generating} className="mt-2">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating…" : "Generate Now"}
          </Button>
        </div>
      )}
    </div>
  );
}