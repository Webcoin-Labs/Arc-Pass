import arcPassLogo from "../../../../public/logo/arcpasslogowhite.webp";
import { cn } from "@/lib/utils";

export function ArcPassBrand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 flex-col items-start", className)}>
      <span
        className={cn(
          "relative block shrink-0 overflow-hidden",
          compact ? "h-[17px] w-[94px]" : "h-[21px] w-[117px] sm:h-[23px] sm:w-[128px]",
        )}
      >
        <img
          src={arcPassLogo}
          alt="Arc Pass"
          className="absolute -left-[14%] -top-[89%] h-[269%] w-[127%] max-w-none"
          width={2031}
          height={774}
        />
      </span>
      <span className={cn("mt-1 whitespace-nowrap text-white/45", compact ? "text-[9px]" : "text-[9px] sm:text-[10px]")}>by Webcoin Labs</span>
    </span>
  );
}
