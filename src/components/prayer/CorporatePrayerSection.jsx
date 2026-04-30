import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useGroupContext } from "@/components/hooks/useGroupContext";
import { Users, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function CorporatePrayerSection() {
  const { oversight_leader_id, isLoading } = useGroupContext();

  const { data: items = [] } = useQuery({
    queryKey: ["corporatePrayer", oversight_leader_id],
    queryFn: () => base44.entities.CorporatePrayerItem.filter({ oversight_leader_id }, "-created_date", 100),
    enabled: !!oversight_leader_id
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-3.5 h-3.5 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Corporate Prayer</h2>
        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Assigned by your leader</span>
      </div>

      {isLoading &&
      <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }

      {!isLoading && items.length === 0 &&
      <div className="text-center py-6 bg-card rounded-2xl border border-border">
          <p className="text-sm text-muted-foreground">No corporate prayer items from your leader yet.</p>
        </div>
      }

      <div className="space-y-2">
        {items.map((item) =>
        <div key={item.id} className="bg-card rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground mt-1" style={{ whiteSpace: "pre-wrap" }}>{item.description}</p>}
            {item.date &&
          <div className="flex items-center gap-1 mt-2">
                <CalendarDays className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{format(parseISO(item.date), "d MMM yyyy")}</span>
              </div>
          }
          </div>
        )}
      </div>

      {!oversight_leader_id && !isLoading &&
      <div className="text-center py-6 bg-card rounded-2xl border border-border">
          <p className="text-sm text-muted-foreground">Connect to a group to see corporate prayer items.</p>
        </div>
      }
    </div>);

}