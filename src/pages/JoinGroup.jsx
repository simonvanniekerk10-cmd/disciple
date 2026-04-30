/**
 * JoinGroup page — handles invite link flow.
 * URL: /join?token=LEADER_USER_ID
 *
 * Flow:
 * 1. Capture token from URL → store in localStorage (survives login redirect)
 * 2. Redirect unauthenticated users to login
 * 3. Once authenticated, write token directly to oversight_leader_id via updateMe
 * 4. Show success and auto-redirect to Home after 2s
 */
import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TOKEN_KEY = "ol_invite_token";

export default function JoinGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | already_assigned | invalid | error
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1: Capture token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }, []);

  const doAssign = useCallback(async () => {
    setStatus("loading");

    const token = new URLSearchParams(window.location.search).get("token")
      || localStorage.getItem(TOKEN_KEY);

    if (!token || !token.trim()) {
      setStatus("invalid");
      return;
    }

    // Already assigned to this leader — nothing to do
    if (user?.oversight_leader_id === token) {
      setStatus("already_assigned");
      return;
    }

    // Write directly to the current user's own record — no elevated permissions needed
    await base44.auth.updateMe({ oversight_leader_id: token });

    localStorage.removeItem(TOKEN_KEY);
    setStatus("success");

    setTimeout(() => { window.location.replace("/Home"); }, 2000);
  }, [user?.id, navigate]);

  // Step 2: Run assignment once user is available
  useEffect(() => {
    if (!user) {
      // Not logged in — redirect to login which will return to this URL after auth
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (user.oversight_leader_id) {
      setStatus("already_assigned");
      return;
    }

    doAssign().catch((err) => {
      console.error("[JoinGroup] Assignment failed:", err);
      setErrorMsg("We couldn't save your group assignment. Please try again.");
      setStatus("error");
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-card rounded-2xl border border-border p-8 text-center space-y-4">

        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Connecting you to your group...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">You're connected!</h2>
            <p className="text-sm text-muted-foreground">
              You've been linked to your leader's group. Redirecting you now...
            </p>
            <Button asChild className="w-full bg-primary text-primary-foreground font-semibold">
              <Link to="/Home">Go to Home</Link>
            </Button>
          </>
        )}

        {status === "already_assigned" && (
          <>
            <CheckCircle className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Already connected</h2>
            <p className="text-sm text-muted-foreground">You're already assigned to a Leader.</p>
            <Button asChild className="w-full bg-primary text-primary-foreground font-semibold">
              <Link to="/Home">Go to Home</Link>
            </Button>
          </>
        )}

        {status === "invalid" && (
          <>
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Invalid invite link</h2>
            <p className="text-sm text-muted-foreground">
              Please ask your Leader for a new link.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/Home">Go to Home</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button
              className="w-full bg-primary text-primary-foreground font-semibold"
              onClick={() => doAssign().catch((err) => {
                setErrorMsg("We couldn't save your group assignment. Please try again.");
                setStatus("error");
              })}
            >
              Retry
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/Home">Go to Home</Link>
            </Button>
          </>
        )}

      </div>
    </div>
  );
}