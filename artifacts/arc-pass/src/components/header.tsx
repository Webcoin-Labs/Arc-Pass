import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LockKeyhole } from "lucide-react";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginModal } from "@/components/login-modal";
import { AccountDropdown } from "@/components/account-dropdown";
import { MobileNavigation } from "@/components/mobile-navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const logout = useLogout();
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isLanding = location === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => window.location.reload() });
  };

  return (
    <header
      className={cn(
        "z-40 w-full transition-shadow duration-150",
        isLanding ? "fixed inset-x-0 top-0 border-0 bg-transparent px-3 pt-3 text-white" : "sticky top-0 border-b border-border bg-background/95 text-foreground",
        scrolled && !isLanding && "shadow-sm",
      )}
    >
      <div className={cn(
        "mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-5",
        isLanding && "h-14 rounded-full border border-white/15 bg-[#080a12]/80 shadow-lg backdrop-blur-xl",
      )}>
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Arc Pass home">
          <img src="/favicon.svg" alt="" className="size-9 shrink-0" width={36} height={36} />
          <div className="min-w-0 leading-none">
            <span className="block text-sm font-semibold sm:text-base">Arc Pass</span>
            <span className={cn("mt-1 block truncate text-[10px]", isLanding ? "text-white/45" : "text-muted-foreground")}>by Webcoin Labs</span>
          </div>
        </Link>

        <nav className={cn("hidden items-center lg:flex", isLanding ? "gap-1 rounded-full border border-white/10 bg-white/5 p-1" : "gap-6")} aria-label="Primary navigation">
          <Link href="/#passes" className={cn("cursor-pointer text-sm font-medium transition-colors duration-150", isLanding ? "rounded-full px-3.5 py-2 text-white/65 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:text-foreground")}>Passes</Link>
          <Link href="/#how-it-works" className={cn("cursor-pointer text-sm font-medium transition-colors duration-150", isLanding ? "rounded-full px-3.5 py-2 text-white/65 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:text-foreground")}>How it works</Link>
          <Link href="/faq" className={cn("cursor-pointer text-sm font-medium transition-colors duration-150", isLanding ? "rounded-full px-3.5 py-2 text-white/65 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:text-foreground")}>FAQ</Link>
          <Link href="/docs" className={cn("cursor-pointer text-sm font-medium transition-colors duration-150", isLanding ? "rounded-full px-3.5 py-2 text-white/65 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:text-foreground")}>Docs</Link>
          <Link href="/admin" className={cn("flex cursor-pointer items-center gap-1.5 text-sm font-medium transition-colors duration-150", isLanding ? "rounded-full px-3.5 py-2 text-white/65 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:text-foreground")}>
            <LockKeyhole className="size-3.5" aria-hidden="true" /> Admin Portal
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isLanding && <div className="hidden sm:block"><ThemeToggle /></div>}

          {isLoading ? (
            <div className="size-9 animate-pulse bg-muted" />
          ) : user ? (
            <div className="hidden md:block"><AccountDropdown user={user} onLogout={handleLogout} /></div>
          ) : (
            <Button
              className={cn("hidden cursor-pointer md:inline-flex", isLanding && "rounded-full border border-white/10 bg-[#4f63ff] text-white hover:bg-[#4055ef]")}
              onClick={() => setLoginOpen(true)}
            >
              Sign in
            </Button>
          )}

          <MobileNavigation user={user} onLoginClick={() => setLoginOpen(true)} onLogout={handleLogout} isLanding={isLanding} />
        </div>
      </div>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}
