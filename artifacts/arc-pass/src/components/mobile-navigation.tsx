import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, LockKeyhole, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { User } from "@workspace/api-client-react";
import { ArcPassBrand } from "@/components/arc-pass-brand";

export function MobileNavigation({
  user,
  onLoginClick,
  onLogout,
  isLanding = false,
}: {
  user?: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  isLanding?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const linkClass = cn(
    "flex min-h-12 cursor-pointer items-center justify-between border-b py-3 text-lg font-semibold",
    isLanding ? "border-white/10 text-white" : "border-black/15 text-black",
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("cursor-pointer lg:hidden", isLanding && "text-white hover:bg-white/10 hover:text-white")} aria-label="Open menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className={cn(
        "w-[min(92vw,380px)] p-0 sm:max-w-[380px]",
        isLanding ? "border-l border-white/10 bg-[#070912] text-white" : "border-l border-black bg-[#f3efe5] text-black",
      )}>
        <div className="flex min-h-dvh flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5">
          <SheetHeader className={cn("border-b pb-5", isLanding ? "border-white/10" : "border-black")}>
            <SheetTitle className={cn("flex items-center text-left", isLanding ? "text-white" : "text-black")}>
              <span className={cn(!isLanding && "rounded-lg bg-[#080a12] px-3 py-2")}>
                <ArcPassBrand />
              </span>
            </SheetTitle>
          </SheetHeader>

          <nav className="mt-5 flex flex-col" aria-label="Mobile navigation">
            <Link href="/#passes" onClick={() => setOpen(false)} className={linkClass}>Passes <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/#how-it-works" onClick={() => setOpen(false)} className={linkClass}>How it works <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/faq" onClick={() => setOpen(false)} className={linkClass}>FAQ <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/docs" onClick={() => setOpen(false)} className={linkClass}>Documentation <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/admin" onClick={() => setOpen(false)} className={linkClass}>
              <span className="flex items-center gap-2"><LockKeyhole className="size-4" aria-hidden="true" /> Admin Portal</span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            {user && <Link href="/dashboard" onClick={() => setOpen(false)} className={linkClass}>My Passes <ArrowUpRight className="size-4" aria-hidden="true" /></Link>}
          </nav>

          <div className="mt-auto pt-8">
            <p className={cn("mb-4 font-mono text-xs", isLanding ? "text-white/35" : "text-black/45")}>A WEBCOIN LABS CREDENTIAL</p>
            <div className={cn("flex items-center justify-between border-t pt-5", isLanding ? "border-white/10" : "border-black")}>
              {!isLanding && <ThemeToggle />}
              {user ? (
                <Button variant="outline" className="border-black bg-transparent text-black hover:bg-black hover:text-white" onClick={() => { setOpen(false); onLogout(); }}>Log out</Button>
              ) : (
                <Button className={cn("cursor-pointer", isLanding ? "rounded-full bg-[#4f63ff] text-white hover:bg-[#4055ef]" : "bg-black text-white hover:bg-black/80")} onClick={() => { setOpen(false); onLoginClick(); }}>Sign in securely</Button>
              )}
              {isLanding && <span className="ml-auto size-3 rounded-full bg-[#4f63ff]" aria-hidden="true" />}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
