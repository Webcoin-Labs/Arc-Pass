import { useEffect, useRef, useState } from "react";
import { Loader2, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { ApiError, useCreateSupportChatReply } from "@workspace/api-client-react";
import { ArcMascot } from "@/components/arc-mascot";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 1_200;
const DAILY_REPLY_LIMIT = 5;

const QUICK_QUESTIONS = [
  "How do I qualify for a Builder Pass?",
  "How do claim and onchain minting differ?",
  "How do I connect GitHub or a wallet?",
  "Why is a verification unavailable?",
  "How does the Founder Pass request work?",
  "I need to report an issue",
];

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type SupportLimitPayload = {
  error?: string;
  remaining?: number;
  resetsAt?: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi — I’m Webcoin Labs Support. I can explain Arc Pass, verification, claiming, minting, and connected accounts. I cannot access or change an account, so please never send seed phrases, private keys, passwords, or codes.",
};

function formatResetTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as SupportLimitPayload | null;
    return data?.error || error.message.replace(/^HTTP \d+ [^:]+:\s*/, "");
  }
  return "Chat support is temporarily unavailable. Please try again later or email contact@webcoinlabs.com.";
}

export function SupportAssistant({ isLanding = false, floating = false }: { isLanding?: boolean; floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetsAt, setResetsAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const supportChat = useCreateSupportChatReply();
  const limitReached = remaining === 0;
  const resetLabel = formatResetTime(resetsAt);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [messages, open, supportChat.isPending]);

  const sendMessage = (candidate: string) => {
    const message = candidate.trim();
    if (!message || supportChat.isPending || limitReached) return;

    setNotice(null);
    setInput("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: message }]);

    supportChat.mutate(
      { data: { message } },
      {
        onSuccess: (reply) => {
          setRemaining(reply.remaining);
          setResetsAt(reply.resetsAt);
          setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: reply.answer }]);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 429) {
            const data = error.data as SupportLimitPayload | null;
            setRemaining(data?.remaining ?? 0);
            setResetsAt(data?.resetsAt ?? null);
          }
          setNotice(errorMessage(error));
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open Arc Pass chat support"
        aria-expanded={open}
        className={cn(
          "group relative size-11 shrink-0 overflow-visible rounded-full border p-0 shadow-[0_12px_36px_rgba(0,0,0,.28)] transition-transform hover:scale-[1.03] focus-visible:scale-[1.03]",
          floating
            ? "border-white/15 bg-[#0a1025]/92 text-white hover:bg-[#111a3a] hover:text-white"
            : isLanding
            ? "border-white/15 bg-white/[0.055] text-white hover:bg-white/10 hover:text-white"
            : "border-border bg-background text-foreground hover:bg-accent",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-[calc(100%+0.45rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-lg xl:inline-flex",
            floating || isLanding ? "border-white/15 bg-[#0a1025]/95 text-white/90" : "border-border bg-background text-foreground",
          )}
        >
          How can I help you?
        </span>
        <ArcMascot compact variant="helpbot" className="!h-10 sm:!h-11" />
        <span className="sr-only">Chat support</span>
      </Button>

      <SheetContent
        side="right"
        className="flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden border-white/10 bg-[#0a0d18] p-0 text-white sm:w-[430px] sm:max-w-none"
      >
        <SheetHeader className="border-b border-white/[0.09] bg-[radial-gradient(circle_at_82%_0%,rgba(54,87,255,.25),transparent_48%)] px-5 pb-5 pt-7 text-left sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#7892ff]/35 bg-[#4766ff]/15">
              <img src="/logo/helpbot.webp" alt="" className="size-full object-contain" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold text-white">Webcoin Labs Support</SheetTitle>
              <SheetDescription className="mt-1.5 text-sm leading-5 text-white/58">
                Product help, verification guidance, and troubleshooting.
              </SheetDescription>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200/15 bg-amber-100/[0.06] px-3 py-2.5 text-xs leading-5 text-white/62">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-amber-200/80" aria-hidden="true" />
            <p>I cannot access your account or review a claim. Never share wallet seed phrases, private keys, passwords, or codes here.</p>
          </div>
        </SheetHeader>

        <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "rounded-br-md bg-[#4c63ff] text-white"
                    : "rounded-bl-md border border-white/[0.09] bg-white/[0.055] text-white/82",
                )}>
                  {message.content}
                </div>
              </div>
            ))}
            {supportChat.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/[0.09] bg-white/[0.055] px-3.5 py-3 text-sm text-white/65">
                  <Loader2 className="size-4 animate-spin text-[#aab9ff]" aria-hidden="true" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {messages.length === 1 && !supportChat.isPending && (
            <div className="mt-6">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/42">Common questions</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    disabled={limitReached}
                    className="rounded-xl border border-white/[0.1] bg-white/[0.035] px-3 py-2 text-left text-xs leading-5 text-white/72 transition-colors hover:border-[#879bff]/35 hover:bg-[#536cff]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.09] bg-[#0c101d] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          {notice && (
            <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2.5 text-xs leading-5 text-amber-100/85">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}
          {limitReached ? (
            <p className="mb-3 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-2.5 text-xs leading-5 text-white/62">
              You have used all {DAILY_REPLY_LIMIT} support replies for this 24-hour period{resetLabel ? `. Available again ${resetLabel}.` : "."}
            </p>
          ) : (
            <p className="mb-2 text-xs text-white/42">
              {remaining === null ? `Up to ${DAILY_REPLY_LIMIT} replies per 24 hours.` : `${remaining} of ${DAILY_REPLY_LIMIT} replies remain in this 24-hour period.`}
            </p>
          )}
          <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); sendMessage(input); }}>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              placeholder="Ask about Arc Pass or describe an issue…"
              aria-label="Support question"
              disabled={supportChat.isPending || limitReached}
              maxLength={MAX_MESSAGE_LENGTH}
              className="min-h-[54px] max-h-32 resize-y rounded-2xl border-white/10 bg-black/20 px-3.5 py-3 text-sm leading-5 text-white placeholder:text-white/35 focus-visible:border-[#7085ff] focus-visible:ring-[#7085ff]/60"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || supportChat.isPending || limitReached}
              className="mb-0.5 size-11 shrink-0 rounded-2xl bg-[#5369ff] text-white hover:bg-[#4158f3]"
              aria-label="Send support question"
            >
              {supportChat.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            </Button>
          </form>
          <p className="mb-0 mt-2 text-[11px] leading-4 text-white/35">For account-specific help, email <a className="text-[#aab8ff] hover:text-white" href="mailto:contact@webcoinlabs.com">contact@webcoinlabs.com</a>.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
