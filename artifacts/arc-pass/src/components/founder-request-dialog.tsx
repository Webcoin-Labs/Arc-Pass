import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useCreateFounderApplication } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_WORDS = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHandle(value: string): string {
  return value.replace(/^\s*@+/, "").replace(/\s+/g, "");
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function FounderRequestDialog({
  open,
  onOpenChange,
  defaultXUsername = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultXUsername?: string;
}) {
  const [xUsername, setXUsername] = useState(defaultXUsername);
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const createApplication = useCreateFounderApplication();
  const words = useMemo(() => wordCount(description), [description]);
  const isDescriptionValid = words > 0 && words <= MAX_WORDS;
  const isEmailValid = EMAIL_PATTERN.test(email.trim());

  useEffect(() => {
    if (!open) return;
    setXUsername((current) => current || defaultXUsername);
  }, [defaultXUsername, open]);

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSubmitted(false);
      createApplication.reset();
    }
    onOpenChange(nextOpen);
  };

  const submit = () => {
    if (!isDescriptionValid || !xUsername.trim() || !isEmailValid) return;
    createApplication.mutate(
      { data: { xUsername: normalizeHandle(xUsername), email: email.trim(), description: description.trim() } },
      { onSuccess: () => setSubmitted(true) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[560px] gap-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#1a1b20] p-0 text-white shadow-[0_28px_100px_rgba(0,0,0,.64)] sm:w-full">
        <div className="border-b border-white/[0.08] bg-[radial-gradient(circle_at_85%_0%,rgba(43,119,255,.2),transparent_38%)] px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
          <div className="mb-5 grid size-10 place-items-center rounded-2xl border border-[#4d76ff]/35 bg-[#315dff]/15 text-[#aab9ff]">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Request Founder Pass</DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-6 text-white/58">
              Founder Pass remains invite-only. Tell the Webcoin Labs team why you should be considered.
            </DialogDescription>
          </DialogHeader>
        </div>

        {submitted ? (
          <div className="px-6 py-8 text-center sm:px-8 sm:py-10">
            <div className="mx-auto grid size-14 place-items-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-emerald-300">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">Request received</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/60">Your Founder Pass request is now under review. We will contact you through your verified identity if it is selected.</p>
            <Button className="mt-7 h-12 w-full rounded-xl bg-[#178ce5] font-semibold text-white hover:bg-[#0d7ed0]" onClick={() => close(false)}>Done</Button>
          </div>
        ) : (
          <form className="space-y-5 px-6 py-6 sm:px-8 sm:py-7" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <div className="space-y-2">
              <Label htmlFor="founder-request-x" className="text-sm font-semibold text-white">X username</Label>
              <Input
                id="founder-request-x"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={32}
                value={xUsername}
                onChange={(event) => setXUsername(normalizeHandle(event.target.value))}
                placeholder="username"
                className="h-14 rounded-2xl border-white/10 bg-black/20 px-4 text-base text-white placeholder:text-white/35 focus-visible:border-[#258fe3] focus-visible:ring-2 focus-visible:ring-[#258fe3]/65"
                required
              />
              <p className="text-xs text-white/42">Enter your username without @. Each X account can submit one request.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="founder-request-email" className="text-sm font-semibold text-white">Email</Label>
              <Input
                id="founder-request-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-14 rounded-2xl border-white/10 bg-black/20 px-4 text-base text-white placeholder:text-white/35 focus-visible:border-[#258fe3] focus-visible:ring-2 focus-visible:ring-[#258fe3]/65"
                required
              />
              <p className="text-xs text-white/42">We'll confirm your request here and follow up if you're selected. A company or business email is preferred.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="founder-request-description" className="text-sm font-semibold text-white">Why should we consider you?</Label>
                <span className={words > MAX_WORDS ? "text-xs font-medium text-red-300" : "text-xs text-white/42"}>{words} / {MAX_WORDS} words</span>
              </div>
              <Textarea
                id="founder-request-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Share what you are building, the progress you have made, and why an Arc Founder Pass matters to you."
                className="min-h-40 resize-y rounded-2xl border-white/10 bg-black/20 px-4 py-3 text-base leading-6 text-white placeholder:text-white/35 focus-visible:border-[#258fe3] focus-visible:ring-2 focus-visible:ring-[#258fe3]/65"
                aria-describedby="founder-request-description-help"
                required
              />
              <p id="founder-request-description-help" className="text-xs leading-5 text-white/42">Maximum 500 words. Please do not include wallet seed phrases, passwords, or private keys.</p>
            </div>

            {createApplication.isError && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-3 text-sm leading-5 text-red-200">{createApplication.error instanceof Error ? createApplication.error.message.replace(/^HTTP \d+ [^:]+:\s*/, "") : "We could not submit your request. Please try again."}</p>}

            <Button type="submit" className="h-12 w-full rounded-2xl bg-[#178ce5] text-base font-semibold text-white hover:bg-[#0d7ed0] disabled:bg-[#178ce5]/40" disabled={createApplication.isPending || !xUsername.trim() || !isEmailValid || !isDescriptionValid}>
              {createApplication.isPending ? <><Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> Sending request…</> : "Send request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
