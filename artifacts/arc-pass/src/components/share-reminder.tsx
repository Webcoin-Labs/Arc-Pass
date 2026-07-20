import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SharePassType = "founder" | "builder";

function reminderStorageKey(passType: SharePassType, passId: number): string {
  return `arc-pass:share-reminder-dismissed:${passType}:${passId}`;
}

export function ShareReminder({
  passType,
  passId,
  claimed,
  onShare,
}: {
  passType: SharePassType;
  passId: number;
  claimed: boolean;
  onShare: () => Promise<void>;
}) {
  const storageKey = reminderStorageKey(passType, passId);
  const [dismissed, setDismissed] = useState(() => {
    try { return window.localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (claimed && !dismissed) setOpen(true);
  }, [claimed, dismissed]);

  const dismissForever = () => {
    try { window.localStorage.setItem(storageKey, "1"); } catch { /* Continue if storage is unavailable. */ }
    setDismissed(true);
    setOpen(false);
  };

  const handleShare = async () => {
    try {
      await onShare();
      dismissForever();
    } catch {
      setOpen(true);
    }
  };

  if (!claimed || dismissed) return null;

  const credential = passType === "founder" ? "Founder" : "Builder";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-[380px] gap-0 border-white/10 bg-[#111318] p-7 text-left sm:rounded-2xl">
        <AlertDialogHeader className="space-y-0 text-left">
          <div className="grid size-11 place-items-center rounded-xl border border-[#f26625]/30 bg-[#f26625]/10 text-[#f26625]">
            <Share2 className="size-5" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="mt-5 text-xl font-bold leading-tight tracking-tight text-white">
            Share your {credential} Pass
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-sm leading-6 text-white/55">
            Your verified Arc credential is ready. Share the public pass link on X so others can verify it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex-col items-stretch gap-4 space-x-0 sm:flex-col sm:items-stretch sm:space-x-0">
          <AlertDialogAction
            onClick={() => void handleShare()}
            className="h-11 w-full rounded-lg bg-[#f26625] text-sm font-semibold text-white shadow-none hover:bg-[#d9591c]"
          >
            Share on X
          </AlertDialogAction>
          <div className="flex items-center justify-center gap-4 text-xs">
            <AlertDialogCancel className="mt-0 h-auto w-auto border-0 bg-transparent px-1 py-2 font-medium text-white/45 shadow-none hover:bg-transparent hover:text-white/80">
              Not now
            </AlertDialogCancel>
            <span aria-hidden="true" className="text-white/20">·</span>
            <AlertDialogAction onClick={dismissForever} className="h-auto w-auto border-0 bg-transparent px-1 py-2 font-medium text-white/45 shadow-none hover:bg-transparent hover:text-white/80">
              Already shared
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
