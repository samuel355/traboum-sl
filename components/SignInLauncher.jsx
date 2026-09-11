"use client";

import { useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Clerk's inline <SignIn /> widget renders its own (largely unstyleable)
// buttons/inputs/dividers — no amount of `appearance` overrides made that
// look like the rest of this app. Instead we show only our own card + button
// here, and open Clerk's flow as a modal on click — same auth logic, but it
// only appears once the user actually asks to sign in.
const MODAL_APPEARANCE = {
  layout: { logoPlacement: "none" },
  elements: {
    cardBox: "!max-w-[400px] shadow-panel",
    // The shared Clerk application is named "GetOnePlot" — its header
    // ("Sign in to GetOnePlot") comes from that instance-level name, not
    // styling, so there's no className override for the text itself. Hiding
    // the header is the only way to keep GetOnePlot's name out of this UI.
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    footer: "bg-transparent",
  },
};

export function SignInLauncher() {
  const { openSignIn } = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    setRedirecting(true);
    router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  function handleClick() {
    if (!isLoaded) return;
    if (isSignedIn) {
      setRedirecting(true);
      router.replace("/dashboard");
      return;
    }
    openSignIn({ appearance: MODAL_APPEARANCE, fallbackRedirectUrl: "/dashboard" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isLoaded || redirecting}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-3 text-sm font-semibold text-amber-300 shadow-sm hover:bg-navy-800 disabled:cursor-wait disabled:opacity-70"
    >
      {!isLoaded || redirecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
        </>
      ) : (
        <>
          Sign in
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
