import { Link, useLocation } from "wouter";
import { CheckCircle2, UserCircle, Link2, LogOut, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@workspace/api-client-react";

export function AccountDropdown({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [location] = useLocation();

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    if (location !== "/dashboard") return;
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `/dashboard#${id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 gap-2 rounded-full px-2">
          <Avatar className="h-7 w-7 border border-border">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
            <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">{user.displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center gap-2 p-2">
          <div className="flex flex-col space-y-0.5 leading-none">
            <p className="text-sm font-medium">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
            My Passes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard#account" onClick={scrollToSection("account")} className="flex w-full items-center">
            <UserCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard#connections" onClick={scrollToSection("connections")} className="flex w-full items-center">
            <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Connected Accounts
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/admin" className="flex w-full items-center">
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
