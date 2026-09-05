import { ShieldCheck, MapPinned, ScrollText } from "lucide-react";
import { SignInLauncher } from "@/components/SignInLauncher";
import { BrandMark } from "@/components/BrandMark";

const FEATURES = [
  { icon: MapPinned, text: "Live map of every stool-land plot and its status" },
  { icon: ScrollText, text: "Allocation & transfer documents, generated and filed automatically" },
  { icon: ShieldCheck, text: "Full audit trail for every action, open to crosscheck" },
];

// A simplified silhouette of a traditional Akan stool — seat, flared legs,
// base — rendered in gold on navy to nod at "stool lands" (land held by a
// traditional authority) rather than a generic placemark/building icon.
export default function SignInPage() {
  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <svg viewBox="0 0 40 40" fill="#FFFFFF" className="pointer-events-none absolute -bottom-16 -right-16 h-[420px] w-[420px] opacity-[0.05]">
          <rect x="5" y="7" width="30" height="7" rx="3.5" />
          <polygon points="13,14 19,14 16,31 8,31" />
          <polygon points="21,14 27,14 32,31 24,31" />
          <rect x="5" y="31" width="30" height="4" rx="2" />
        </svg>

        <div className="relative">
          <div className="flex items-center gap-3">
            <BrandMark size={48} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                Trabuom Stool Lands
              </p>
              <p className="mt-0.5 text-xs text-navy-300">Land Management System</p>
            </div>
          </div>
          <h1 className="mt-8 text-4xl font-bold text-white leading-tight">
            Trabuom
            <br />
            Stool Lands
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-navy-200">
            The single place for the Trabuom Stool secretariat to manage plot allocations,
            transfers, and records — with a full audit trail for every action.
          </p>
        </div>

        <ul className="relative space-y-5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/20">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm text-navy-100 leading-6">{text}</span>
            </li>
          ))}
        </ul>

        <div className="relative flex items-center gap-2.5">
          <BrandMark size={26} />
          <p className="text-xs text-navy-300">
            © {new Date().getFullYear()} Trabuom Stool Lands Secretariat
          </p>
        </div>
      </div>

      {/* Auth panel */}
      <div className="relative flex w-full lg:w-1/2 items-center justify-center overflow-hidden bg-[#F7F8FB] p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-navy-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />

        <div className="relative w-full max-w-md rounded-2xl border border-navy-100 bg-white p-8 shadow-panel md:p-10">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <BrandMark size={44} />
            <h1 className="mt-4 text-2xl font-bold text-navy-900 lg:hidden">Trabuom Stool Lands</h1>
            <h2 className="mt-4 hidden text-2xl font-bold text-navy-900 lg:block">Sign in</h2>
            <p className="mt-1.5 text-sm text-navy-500">Continue to your Trabuom Stool Lands account.</p>
          </div>

          <SignInLauncher />
          <p className="mt-4 text-center text-xs text-navy-400 lg:text-left">
            You&apos;ll sign in with your email, phone, or Google account.
          </p>
        </div>
      </div>
    </div>
  );
}
