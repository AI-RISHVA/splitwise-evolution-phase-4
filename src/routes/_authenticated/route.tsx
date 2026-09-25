import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, LayoutDashboard, LogOut, User, Users, UsersRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe, logout } from "@/lib/api";
import { DEMO_MODE, tokens } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated")({
  component: AppLayout,
});

const soon = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Groups", icon: UsersRound },
  { label: "Activity", icon: Activity },
  { label: "Profile", icon: User },
];

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!tokens.access) navigate({ to: "/auth" });
    else setReady(true);
  }, [navigate]);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe, enabled: ready, retry: false });

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading your workspace…</div>;

  const doLogout = async () => {
    await logout();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 text-lg font-bold text-primary"><Wallet className="h-5 w-5" /> SplitEase</div>
        <nav className="space-y-1 text-sm">
          <Link to="/friends" className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sidebar-foreground hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
            <Users className="h-4 w-4" /> Friends
          </Link>
          {soon.map((s) => (
            <div key={s.label} className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground/70">
              <s.icon className="h-4 w-4" /> {s.label} <span className="ml-auto text-[10px] uppercase">Coming soon</span>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="text-sm text-muted-foreground">
            {DEMO_MODE && <span className="mr-3 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Demo environment</span>}
            Signed in as <span className="font-semibold text-foreground">{me ? `${me.firstname} ${me.lastname}` : "…"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={doLogout}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>
        </header>
        <main className="flex-1 p-6 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
