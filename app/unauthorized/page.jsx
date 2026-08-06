import { SignOutButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-panel">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-navy-900">Access restricted</h1>
        <p className="mt-2 text-sm text-navy-500 leading-6">
          Your account isn&apos;t set up for Trabuom Stool Lands yet. If you believe this is a
          mistake, contact a system administrator to have a role assigned.
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button className="mt-6 w-full rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
