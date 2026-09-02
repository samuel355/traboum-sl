"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

const SIGN_IN_KEY = "tsl-auth-audit-session";

export function AuthAuditTracker() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || sessionStorage.getItem(SIGN_IN_KEY)) return;

    sessionStorage.setItem(SIGN_IN_KEY, "1");
    fetch("/api/audit/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth.signed_in" }),
      keepalive: true,
    }).catch((error) => {
      console.error("Failed to record sign-in audit event", error);
      sessionStorage.removeItem(SIGN_IN_KEY);
    });
  }, [isLoaded, isSignedIn]);

  return null;
}
