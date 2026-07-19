import { Github, LockKeyhole, LogOut, RotateCcw, WalletCards } from "lucide-react";
import { SiX } from "react-icons/si";
import { useLogout } from "@workspace/api-client-react";
import { DiscordIcon } from "@/components/discord-icon";
import { Button } from "@/components/ui/button";
import {
  clearPendingEligibilityIdentity,
  identityOAuthHref,
  pendingIdentityLabel,
  pendingProviderIsConnected,
  type PendingEligibilityIdentity,
} from "@/lib/pending-eligibility";

type IdentityProfile = {
  connections?: {
    x?: { connected?: boolean; username?: string | null };
    discord?: { connected?: boolean; username?: string | null; discriminator?: string | null };
  };
};

export function IdentityVerificationGate({
  authenticated,
  profile,
  pending,
  returnTo,
  builderJourney = false,
}: {
  authenticated: boolean;
  profile?: IdentityProfile | null;
  pending: PendingEligibilityIdentity | null;
  returnTo: string;
  builderJourney?: boolean;
}) {
  const logout = useLogout();
  const expectedProviderConnected = pending ? pendingProviderIsConnected(profile, pending) : false;
  const providerLabel = pending?.platform === "discord" ? "Discord" : "X";
  const expectedLabel = pending ? pendingIdentityLabel(pending) : null;

  const checkAnother = () => {
    clearPendingEligibilityIdentity();
    window.location.assign("/#check-status");
  };

  const providerButton = (provider: "x" | "discord", label: string) => (
    <Button key={provider} variant="outline" size="lg" className="h-12 w-full gap-2" asChild>
      <a href={identityOAuthHref(provider, returnTo, pending)}>
        {provider === "x" ? <SiX className="size-4" aria-hidden="true" /> : <DiscordIcon className="h-4 w-5 text-[#5865F2]" />}
        {label}
      </a>
    </Button>
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
      <div className="mb-5 grid size-14 place-items-center rounded-2xl border bg-card shadow-sm">
        <LockKeyhole className="size-6 text-primary" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold text-balance">
        {pending ? `Continue with the ${providerLabel} account you checked` : "Verify your social identity"}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-pretty text-muted-foreground">
        {pending
          ? `You checked ${expectedLabel} on ${providerLabel}. Connect that exact account so the private verification belongs to the same person.`
          : "Start with X or Discord. GitHub and wallet ownership are verified separately in the next steps."}
      </p>

      <div className="mt-7 flex w-full max-w-sm flex-col gap-3">
        {pending ? (
          expectedProviderConnected ? (
            <>
              <div role="alert" className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-left text-sm leading-6 text-amber-900 dark:text-amber-100">
                This session is connected to a different {providerLabel} account. Sign out before continuing with {expectedLabel}.
              </div>
              <Button
                size="lg"
                className="h-12 gap-2"
                disabled={logout.isPending}
                onClick={() => logout.mutate(undefined, { onSuccess: () => window.location.reload() })}
              >
                <LogOut className="size-4" aria-hidden="true" /> {logout.isPending ? "Signing out…" : "Sign out and use the correct account"}
              </Button>
            </>
          ) : providerButton(pending.platform, `${authenticated ? "Connect" : "Continue with"} ${providerLabel} ${expectedLabel}`)
        ) : (
          <>
            {providerButton("x", "Continue with X")}
            {providerButton("discord", "Continue with Discord")}
          </>
        )}
        <Button type="button" variant="ghost" size="lg" className="h-11 gap-2" onClick={checkAnother}>
          <RotateCcw className="size-4" aria-hidden="true" /> Go back and check another username
        </Button>
      </div>

      {builderJourney && (
        <div className="mt-8 w-full max-w-sm rounded-2xl border bg-card p-3 text-left">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Builder verification path</p>
          <div className="space-y-1.5">
            <LockedStep icon={Github} label="Connect GitHub" detail="Unlocks after social identity" />
            <LockedStep icon={WalletCards} label="Verify wallet ownership" detail="Unlocks after GitHub" />
          </div>
        </div>
      )}
    </div>
  );
}

function LockedStep({ icon: Icon, label, detail }: { icon: typeof Github; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/35 px-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background"><Icon className="size-4 text-muted-foreground" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div>
      <LockKeyhole className="size-3.5 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
