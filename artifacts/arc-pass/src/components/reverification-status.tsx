import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export function ReverificationStatus({
  nextVerificationAt,
  isPending,
  onReverify,
  className,
}: {
  nextVerificationAt?: string | null;
  isPending: boolean;
  onReverify: () => void;
  className?: string;
}) {
  const cooldownActive = !!nextVerificationAt && new Date(nextVerificationAt) > new Date();

  if (isPending) {
    return (
      <Button variant="outline" className={className} disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reviewing Updated Activity
      </Button>
    );
  }

  if (cooldownActive) {
    return (
      <div className={className}>
        <Button variant="outline" className="w-full" disabled>
          Re-verification available on {formatDate(nextVerificationAt)}
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" className={className} onClick={onReverify}>
      <RefreshCw className="mr-2 h-4 w-4" /> Re-verify Eligibility
    </Button>
  );
}
