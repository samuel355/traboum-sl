"use client";

import { useClerk } from "@clerk/nextjs";

export function SignOutAuditButton({ className = "", children = "Sign out" }) {
  const { signOut } = useClerk();

  async function handleSignOut() {
    try {
      await fetch("/api/audit/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auth.signed_out" }),
        keepalive: true,
      });
    } catch (error) {
      console.error("Failed to record sign-out audit event", error);
    } finally {
      sessionStorage.removeItem("tsl-auth-audit-session");
      await signOut({ redirectUrl: "/sign-in" });
    }
  }

  return (
    <button type="button" onClick={handleSignOut} className={className}>
      {children}
    </button>
  );
}
