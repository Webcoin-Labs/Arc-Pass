import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SiX } from "react-icons/si";
import { DiscordIcon } from "@/components/discord-icon";
import {
  clearPendingEligibilityIdentity,
  identityOAuthHref,
  pendingIdentityLabel,
  readPendingEligibilityIdentity,
} from "@/lib/pending-eligibility";

export function LoginModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const currentRoute = typeof window === "undefined" ? "/dashboard" : `${window.location.pathname}${window.location.search}`;
  const returnTo = currentRoute === "/" ? "/dashboard" : currentRoute;
  const pendingIdentity = readPendingEligibilityIdentity();
  const oauthHref = (provider: "x" | "discord") => identityOAuthHref(provider, returnTo, pendingIdentity);
  const checkedAccountLabel = pendingIdentity ? pendingIdentityLabel(pendingIdentity) : null;
  const checkAnother = () => {
    clearPendingEligibilityIdentity();
    onOpenChange(false);
    window.location.assign("/#check-status");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{pendingIdentity ? "Continue with the account you checked" : "Sign in to verify your identity"}</DialogTitle>
          <DialogDescription className="text-center">
            {pendingIdentity
              ? `Connect ${checkedAccountLabel} on ${pendingIdentity.platform === "x" ? "X" : "Discord"} so the eligibility check and verified account belong to the same person.`
              : "Verify ownership and access your Arc Pass dashboard."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          {(!pendingIdentity || pendingIdentity.platform === "x") && (
            <Button variant="outline" size="lg" className="h-12 justify-start gap-3 px-4 font-medium" asChild>
              <a href={oauthHref("x")}>
                <SiX className="h-4 w-4" aria-hidden="true" />
                {pendingIdentity ? `Continue with X ${checkedAccountLabel}` : "Continue with X"}
              </a>
            </Button>
          )}
          {(!pendingIdentity || pendingIdentity.platform === "discord") && (
            <Button variant="outline" size="lg" className="h-12 justify-start gap-3 px-4 font-medium" asChild>
              <a href={oauthHref("discord")}>
                <DiscordIcon className="h-4 w-5 text-[#5865F2]" />
                {pendingIdentity ? `Continue with Discord ${checkedAccountLabel}` : "Continue with Discord"}
              </a>
            </Button>
          )}
          {pendingIdentity && (
            <Button type="button" variant="ghost" size="sm" onClick={checkAnother}>Check another username</Button>
          )}
        </div>
        {import.meta.env.DEV && (
          <div className="rounded-xl border border-dashed border-amber-400/40 bg-amber-400/10 p-3">
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Local testing only</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild><a href="/api/auth/dev-test/x?returnTo=/dashboard"><SiX className="h-3.5 w-3.5" /> Test X</a></Button>
              <Button variant="outline" size="sm" asChild><a href="/api/auth/dev-test/discord?returnTo=/dashboard"><DiscordIcon className="h-3.5 w-4 text-[#5865F2]" /> Test Discord</a></Button>
            </div>
          </div>
        )}
        <p className="px-2 text-center text-xs leading-5 text-muted-foreground">Your identity and verification status are processed by Webcoin Labs. Connected providers only share the permissions you approve.</p>
      </DialogContent>
    </Dialog>
  );
}
