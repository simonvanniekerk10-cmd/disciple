import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * Modal for unassigned users to join a group using a leader's code
 */
export default function JoinCodeForm({ open, onOpenChange, onSuccess }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const leaderId = code.trim();
    if (!leaderId) {
      setError("Please enter a code");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      // Write directly — no User list lookup needed, user always has permission to update their own record
      await base44.auth.updateMe({ oversight_leader_id: leaderId });

      // Confirm by reading back the current user's own record only
      const verifiedUser = await base44.auth.me();
      if (verifiedUser.oversight_leader_id === leaderId) {
        setStatus("success");
        setTimeout(() => {
          window.location.replace("/Home");
        }, 1500);
      } else {
        setStatus("error");
        setError("That code doesn't seem to be working. Please check it with your Leader and try again.");
      }
    } catch {
      setStatus("error");
      setError("That code doesn't seem to be working. Please check it with your Leader and try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Group</DialogTitle>
          <DialogDescription>
            Enter the code your leader gave you to join their group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {status === "idle" && (
            <>
              <Input
                placeholder="Enter your join code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-secondary border-0"
                disabled={status === "loading"}
              />
              <Button
                onClick={handleSubmit}
                disabled={!code.trim() || status === "loading"}
                className="w-full bg-primary text-primary-foreground font-semibold"
              >
                Join Group
              </Button>
            </>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Joining group...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="text-center">
                <p className="text-sm font-semibold">You're connected!</p>
                <p className="text-xs text-muted-foreground">You've been linked to your leader's group.</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <div className="flex gap-2 items-start bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <Button
                onClick={() => {
                  setStatus("idle");
                  setError("");
                }}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}