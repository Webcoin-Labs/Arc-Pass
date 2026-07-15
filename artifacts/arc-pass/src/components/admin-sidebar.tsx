import { LayoutDashboard, ShieldCheck, Users, ListChecks, Settings2, Image, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "founders", label: "Founder Passes", icon: ShieldCheck },
  { key: "builders", label: "Builder Passes", icon: Users },
  { key: "reviews", label: "Reviews & Upgrades", icon: ListChecks },
  { key: "tiers", label: "Tier Configuration", icon: Settings2 },
  { key: "mints", label: "Mint Records", icon: ScrollText },
  { key: "settings", label: "Settings", icon: Image },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

export function AdminSidebar({ active, onChange, className }: { active: AdminSection; onChange: (section: AdminSection) => void; className?: string }) {
  return (
    <nav className={cn("-mx-4 flex gap-0 overflow-x-auto border-y px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:border", className)} aria-label="Admin sections">
      {ADMIN_SECTIONS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-2.5 border-r px-4 py-2 text-sm font-medium transition-colors duration-150 lg:w-full lg:border-b lg:border-r-0",
            active === key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-current={active === key ? "page" : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}
