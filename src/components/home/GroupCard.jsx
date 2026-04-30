import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react";

function CopyChip({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border"
      style={{ background: "#EEF2F9", borderColor: "#D0DAF0", color: "#1E2D50" }}
    >
      {code}
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" style={{ color: "#7A8BAA" }} />}
      <span className="font-sans font-normal" style={{ color: "#7A8BAA" }}>Share</span>
    </button>
  );
}

export default function GroupCard({ group, membership, user, onLeft }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #D0DAF0" }}>
      <button
        className="w-full flex items-center justify-between px-4 py-4 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="font-bold text-base" style={{ color: "#1E2D50" }}>{group?.name}</span>
        {expanded
          ? <ChevronDown className="w-5 h-5 shrink-0" style={{ color: "#7A8BAA" }} />
          : <ChevronRight className="w-5 h-5 shrink-0" style={{ color: "#7A8BAA" }} />
        }
      </button>
      {expanded && (
        <div className="border-t p-4" style={{ borderColor: "#EEF2F9" }}>
          <p className="text-sm text-center py-4" style={{ color: "#7A8BAA" }}>
            Group details coming soon — being migrated to Supabase.
          </p>
        </div>
      )}
    </div>
  );
}