import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Copy, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function InviteLinkPanel() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // The invite token IS the leader's Base44 user ID — no extra table needed
  const inviteLink = user ? `${window.location.origin}/join?token=${user.id}` : "";
  const joinCode = user?.id || "";

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(joinCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Invite Link</h2>
      </div>

      <div className="space-y-4">
        {/* Join Code */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block font-semibold">Join Code</Label>
          <p className="text-xs text-muted-foreground mb-2">Share this code with Disciples who already have an account.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono px-3 py-2 rounded-lg font-semibold tracking-wider border"
              style={{ background: '#EEF2F9', borderColor: '#D0DAF0', color: '#1E2D50' }}>
              {joinCode}
            </code>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyCode}>
              <Copy className={`w-3.5 h-3.5 ${codeCopied ? "text-primary" : ""}`} />
            </Button>
          </div>
          {codeCopied && <p className="text-xs text-primary mt-1">Code copied!</p>}
        </div>

        {/* Invite Link */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block font-semibold">Invite Link</Label>
          <p className="text-xs text-muted-foreground mb-2">Share this link to invite new Disciples directly.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] px-3 py-2 rounded-lg truncate border"
              style={{ background: '#EEF2F9', borderColor: '#D0DAF0', color: '#1E2D50' }}>
              {inviteLink}
            </code>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyLink}>
              <Copy className={`w-3.5 h-3.5 ${copied ? "text-primary" : ""}`} />
            </Button>
          </div>
          {copied && <p className="text-xs text-primary mt-1">Copied to clipboard!</p>}
        </div>
      </div>
    </div>
  );
}