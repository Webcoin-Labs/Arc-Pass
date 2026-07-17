import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

/**
 * Circular container for a company logo. The circle clips the container,
 * never the logo itself — `object-contain` plus internal padding keeps
 * square, horizontal, vertical, and transparent-background logos intact.
 */
export function CompanyLogo({
  logoUrl,
  name,
  size = "md",
  className,
}: {
  logoUrl?: string | null;
  name?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  if (logoUrl && !imageFailed) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white", sizeMap[size], className)}>
        <img
          src={logoUrl}
          alt={name ? `${name} logo` : "Company logo"}
          className="h-full w-full object-contain p-1.5"
          crossOrigin="anonymous"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  const initials = (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-white font-semibold text-[#14264a]", sizeMap[size], className)}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}
