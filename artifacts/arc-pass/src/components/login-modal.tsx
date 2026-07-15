import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SiDiscord, SiX } from "react-icons/si";

export function LoginModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const returnTo = typeof window === "undefined" ? "/dashboard" : `${window.location.pathname}${window.location.search}`;
  const oauthHref = (provider: "x" | "discord") => `/api/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Sign in to verify your identity</DialogTitle>
          <DialogDescription className="text-center">Verify ownership and access your Arc Pass dashboard.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button variant="outline" size="lg" className="h-12 justify-start gap-3 px-4 font-medium" asChild>
            <a href={oauthHref("x")}>
              <SiX className="h-4 w-4" aria-hidden="true" />
              Continue with X
            </a>
          </Button>
          <Button variant="outline" size="lg" className="h-12 justify-start gap-3 px-4 font-medium" asChild>
            <a href={oauthHref("discord")}>
              <SiDiscord className="h-4 w-4 text-[#5865F2]" aria-hidden="true" />
              Continue with Discord
            </a>
          </Button>
        </div>
        <p className="px-2 text-center text-xs leading-5 text-muted-foreground">Your identity and verification status are processed by Webcoin Labs. Connected providers only share the permissions you approve.</p>
      </DialogContent>
    </Dialog>
  );
}
