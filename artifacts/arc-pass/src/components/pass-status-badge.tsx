import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusMeta } from "@/lib/pass-status";

export function PassStatusBadge({ meta, className }: { meta: StatusMeta; className?: string }) {
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5 font-medium", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
