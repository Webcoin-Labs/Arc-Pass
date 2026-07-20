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
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary sm:mx-0">
            <Share2 className="size-5" aria-hidden="true" />
          </div>
          <AlertDialogTitle>Share your {credential} Pass</AlertDialogTitle>
          <AlertDialogDescription>
            Your verified Arc credential is ready. Share the public pass link on X so others can verify it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleShare()}>Share on X</AlertDialogAction>
          <AlertDialogAction className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={dismissForever}>Already shared</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
