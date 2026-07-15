import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, KeyRound, Loader2, LockKeyhole, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminSidebar, ADMIN_SECTIONS, type AdminSection } from "@/components/admin-sidebar";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { FounderPassesPanel } from "@/components/admin/founder-passes-panel";
import { BuilderPassesPanel } from "@/components/admin/builder-passes-panel";
import { ReviewsPanel } from "@/components/admin/reviews-panel";
import { TierConfigPanel } from "@/components/admin/tier-config-panel";
import { MintRecordsPanel } from "@/components/admin/mint-records-panel";
import { SettingsPanel } from "@/components/admin/settings-panel";

export default function AdminPage() {
  const [authState, setAuthState] = useState<"loading" | "signed_out" | "signed_in">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [section, setSection] = useState<AdminSection>("overview");

  useEffect(() => {
    fetch("/api/admin/auth/session", { credentials: "include" }).then((response) => setAuthState(response.ok ? "signed_in" : "signed_out")).catch(() => setAuthState("signed_out"));
  }, []);

  if (authState === "loading") return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-5 animate-spin" aria-label="Checking administrator session" /></div>;

  if (authState === "signed_out") return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full bg-[#f3efe5] text-black [color-scheme:light] sm:min-h-[calc(100dvh-4.5rem)]">
      <div className="mx-auto grid w-full max-w-7xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden flex-col justify-between border-r border-black bg-[#ff5a1f] p-14 lg:flex">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:opacity-60">
              <ArrowLeft className="size-4" aria-hidden="true" /> Back to Arc Pass
            </Link>
            <p className="mt-14 font-mono text-xs font-semibold uppercase">Restricted Webcoin Labs system</p>
            <h1 className="mt-4 max-w-lg text-5xl font-semibold leading-[0.95] text-balance sm:text-6xl">Admin Portal</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-pretty text-black/70">
              Operate founder invitations, Builder verification, tier rules, and onchain issuance from one protected console.
            </p>
          </div>
          <div className="mt-14 grid gap-3 border-t border-black/25 pt-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <p className="flex items-center gap-2 text-xs font-medium"><BadgeCheck className="size-4" aria-hidden="true" /> Dedicated admin auth</p>
            <p className="flex items-center gap-2 text-xs font-medium"><KeyRound className="size-4" aria-hidden="true" /> Rate limited access</p>
            <p className="flex items-center gap-2 text-xs font-medium"><LockKeyhole className="size-4" aria-hidden="true" /> Social login blocked</p>
          </div>
        </section>

        <section className="grid place-items-center p-5 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="mb-5 flex items-end justify-between lg:hidden">
              <div>
                <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-black/55 hover:text-black"><ArrowLeft className="size-3.5" aria-hidden="true" /> Arc Pass</Link>
                <h1 className="mt-3 text-3xl font-semibold text-balance">Admin Portal</h1>
              </div>
              <span className="size-3 bg-[#ff5a1f]" aria-hidden="true" />
            </div>
            <form className="w-full border border-black bg-white p-6 shadow-lg sm:p-9" onSubmit={async (event) => {
            event.preventDefault(); setSubmitting(true); setAuthError("");
            try {
              const response = await fetch("/api/admin/auth/login", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
              if (!response.ok) {
                const contentType = response.headers.get("content-type") ?? "";
                const body = contentType.includes("application/json")
                  ? await response.json().catch(() => null) as { error?: string } | null
                  : null;
                throw new Error(body?.error || (response.status >= 500 ? "Administrator service is temporarily unavailable. Please try again." : "Administrator sign-in failed."));
              }
              setPassword(""); setAuthState("signed_in");
            } catch (error) { setAuthError(error instanceof Error ? error.message : "Administrator sign-in failed."); }
            finally { setSubmitting(false); }
          }}>
            <div className="mb-7 flex items-center justify-between border-b border-black/15 pb-5">
              <div className="grid size-11 place-items-center bg-black text-white"><ShieldAlert className="size-5" aria-hidden="true" /></div>
              <span className="font-mono text-xs text-black/45">SECURE ACCESS</span>
            </div>
            <h2 className="text-3xl font-semibold text-balance">Sign in to the console</h2>
            <p className="mt-2 text-sm leading-6 text-pretty text-black/55">Use your dedicated Webcoin Labs administrator credentials.</p>
            <div className="mt-7 space-y-2"><Label htmlFor="admin-email" className="text-black">Work email</Label><Input className="h-12 rounded-none border-black bg-white text-black placeholder:text-black/35 focus-visible:ring-black" id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@webcoinlabs.com" /></div>
            <div className="mt-5 space-y-2"><Label htmlFor="admin-password" className="text-black">Password</Label><Input className="h-12 rounded-none border-black bg-white text-black focus-visible:ring-black" id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!authError} aria-describedby={authError ? "admin-auth-error" : undefined} /></div>
            {authError && <p id="admin-auth-error" role="alert" className="mt-4 border-l-2 border-red-600 pl-3 text-sm text-red-700">{authError}</p>}
            <Button className="mt-7 h-12 w-full rounded-none bg-black text-white hover:bg-black/80" disabled={submitting}>{submitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}Sign in securely</Button>
            {import.meta.env.DEV && <p className="mt-4 border border-black/10 bg-[#f3efe5] p-3 text-xs leading-5 text-black/60">Local setup: when development bootstrap is enabled, the first sign-in with the configured admin email securely creates the administrator account using the password entered here.</p>}
            <p className="mt-4 text-center text-xs leading-5 text-black/45">Access attempts may be logged for security review.</p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );

  const activeLabel = ADMIN_SECTIONS.find((s) => s.key === section)?.label;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-8 flex items-center gap-3 border-b pb-6">
        <div className="flex size-10 items-center justify-center bg-destructive/10 text-destructive">
          <ShieldAlert className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-balance">Admin Console</h1>
          <p className="text-sm text-pretty text-muted-foreground">Manage credentials, tiers, and verification records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <AdminSidebar active={section} onChange={setSection} />

        <div>
          <h2 className="mb-5 text-lg font-semibold">{activeLabel}</h2>
          {section === "overview" && <OverviewPanel />}
          {section === "founders" && <FounderPassesPanel />}
          {section === "builders" && <BuilderPassesPanel />}
          {section === "reviews" && <ReviewsPanel />}
          {section === "tiers" && <TierConfigPanel />}
          {section === "mints" && <MintRecordsPanel />}
          {section === "settings" && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}
