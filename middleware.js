import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Unlike get-plot, trabuom-sl has no public marketplace pages — everything
// behind the root is protected. Only the sign-in flow and Clerk's own
// satellite-domain handshake endpoint are left open.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/unauthorized"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!isPublicRoute(req) && !userId) {
    if (req.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Role-based access (tsl_secretary / tsl_admin / tsl_queen / tsl_chief /
  // sysadmin) is enforced server-side in app/(dashboard)/layout.jsx via
  // currentUser(), same pattern get-plot uses — always fresh from Clerk's
  // API rather than trusting a possibly-stale JWT claim.
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf|map)$).*)",
  ],
};
