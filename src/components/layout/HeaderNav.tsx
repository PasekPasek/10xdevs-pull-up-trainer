import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/db/supabase.client";
import { Dumbbell, LayoutDashboard, History, ShieldCheck, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface HeaderNavProps {
  currentPath: string;
}

export function HeaderNav({ currentPath }: HeaderNavProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setIsAdmin(data.user.app_metadata?.role === "admin");
      }
    });
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabaseClient.auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      toast.error("Failed to sign out. Please try again.");
      setIsLoading(false);
    }
  };

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
      show: isAdmin,
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
          {user && (
            <div className="hidden sm:block text-sm text-muted-foreground">{user.email}</div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isLoading}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign Out</span>
          </Button>
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
                    currentPath === item.href
                      ? "text-primary"
                      : "text-muted-foreground"
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
