import { useCallback, useState } from "react";
import { Dumbbell, LayoutDashboard, History, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface HeaderNavUser {
  email: string | null;
  isAdmin: boolean;
}

interface HeaderNavProps {
  currentPath: string;
  user: HeaderNavUser | null;
}

export function HeaderNav({ currentPath, user }: HeaderNavProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => undefined);
        const message = errorBody?.error?.message ?? "Failed to sign out. Please try again.";
        toast.error(message);
        setIsLoading(false);
        return;
      }

      window.location.href = "/login";
    } catch (error) {
      globalThis.reportError?.(error);
      toast.error("Failed to sign out. Please try again.");
      setIsLoading(false);
    }
  }, []);

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
      show: true,
    },
    {
      href: "/history",
      label: "History",
      icon: <History className="h-4 w-4" aria-hidden="true" />,
      show: true,
    },
    {
      href: "/admin",
      label: "Admin",
      icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
      show: user?.isAdmin ?? false,
    },
  ];

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-6 w-6" aria-hidden="true" />
            <span>Pull-Up Trainer</span>
          </a>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navItems.map(
              (item) =>
                item.show && (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      currentPath === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-current={currentPath === item.href ? "page" : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                )
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user?.email && <div className="hidden sm:block text-sm text-muted-foreground">{user.email}</div>}
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={isLoading} className="gap-2">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>{isLoading ? "Signing out..." : "Sign Out"}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Mobile navigation */}
      <nav className="md:hidden border-t px-4 py-2" aria-label="Mobile navigation">
        <div className="flex items-center justify-around">
          {navItems.map(
            (item) =>
              item.show && (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium rounded-md ${
                    currentPath === item.href ? "text-primary" : "text-muted-foreground"
                  }`}
                  aria-current={currentPath === item.href ? "page" : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              )
          )}
        </div>
      </nav>
    </header>
  );
}
