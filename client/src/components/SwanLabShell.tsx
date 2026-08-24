import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import {
  Activity,
  Bell,
  Bot,
  Braces,
  CircleGauge,
  Code2,
  Database,
  Files,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  PanelsTopLeft,
  RadioTower,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type NavItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
};

const primaryNav: NavItem[] = [
  { label: "Overview", path: "/app/overview", icon: LayoutDashboard },
  { label: "Projects", path: "/app/projects", icon: PanelsTopLeft },
  { label: "Infrastructure", path: "/app/infrastructure", icon: CircleGauge },
  { label: "Databases", path: "/app/databases", icon: Database },
  { label: "Networking", path: "/app/networking", icon: Network },
  { label: "Solana", path: "/app/solana", icon: WalletCards },
  { label: "AI Assistant", path: "/app/ai", icon: Bot },
];

const productNav: NavItem[] = [
  { label: "Developer", path: "/app/developer", icon: Code2 },
  { label: "Monitoring", path: "/app/monitoring", icon: Activity },
  { label: "Usage", path: "/app/usage", icon: RadioTower },
  { label: "Team", path: "/app/team", icon: Users },
  { label: "Settings", path: "/app/settings", icon: Settings },
];

const titleFromPath = (path: string) => {
  const section = path.split("/").filter(Boolean).at(-1) ?? "overview";
  return section === "app" ? "Overview" : section.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
};

export function SwanLabShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const title = titleFromPath(location);

  const navigate = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  const nav = (items: NavItem[]) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = location === item.path || (item.path !== "/app/overview" && location.startsWith(`${item.path}/`));
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`swan-nav-item ${active ? "swan-nav-item-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4" strokeWidth={1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="swan-grid pointer-events-none fixed inset-0 opacity-40" />
      <header className="relative z-30 flex h-16 items-center justify-between border-b border-black bg-background px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setOpen((value) => !value)}
            className="grid size-9 place-items-center border border-black bg-white lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <button type="button" onClick={() => navigate("/app/overview")} className="flex items-center gap-2.5 text-left">
            <span className="swan-mark" aria-hidden="true" />
            <span className="text-[15px] font-bold tracking-[-0.04em]">SwanLab</span>
          </button>
          <span className="hidden h-4 w-px bg-black/30 sm:block" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-black/50 sm:block">Cloud control plane</span>
        </div>

        <div className="hidden max-w-md flex-1 px-8 md:block">
          <button type="button" className="flex h-9 w-full items-center justify-between border border-black/25 bg-white px-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-black/45 transition-colors hover:border-black">
            <span>Search commands, projects, resources</span>
            <kbd className="border border-black/25 px-1.5 py-0.5 text-[9px] text-black/60">⌘ K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" aria-label="Notifications" className="grid size-9 place-items-center border border-transparent transition-colors hover:border-black">
            <Bell className="size-4" strokeWidth={1.8} />
          </button>
          <div className="h-5 w-px bg-black/20" />
          {isAuthenticated ? (
            <button type="button" onClick={logout} className="flex items-center gap-2 border border-black bg-black px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white transition-transform active:scale-[0.97]">
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <button type="button" onClick={() => startLogin()} className="border border-black bg-black px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white transition-transform active:scale-[0.97]">
              Secure sign in
            </button>
          )}
        </div>
      </header>

      <div className="relative z-20 flex min-h-[calc(100vh-4rem)]">
        <aside className={`swan-sidebar ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
          <div className="border-b border-black p-4"><WorkspaceSwitcher /></div>

          <nav className="flex-1 overflow-y-auto p-3" aria-label="Product navigation">
            <p className="swan-eyebrow px-2 pb-2 pt-1">Workspace</p>
            {nav(primaryNav)}
            <div className="my-4 h-px bg-black/20" />
            <p className="swan-eyebrow px-2 pb-2">Operate</p>
            {nav(productNav)}
          </nav>

          <div className="border-t border-black p-3">
            <button type="button" onClick={() => navigate("/app/developer")} className="flex w-full items-center gap-2 border border-black/30 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.1em] transition-colors hover:border-black">
              <Braces className="size-3.5" /> Developer docs
            </button>
            <p className="mt-3 flex items-center gap-1.5 px-1 font-mono text-[9px] uppercase tracking-[0.11em] text-black/45"><ShieldCheck className="size-3" /> server-authorized access</p>
          </div>
        </aside>

        {open && <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 bg-black/10 lg:hidden" onClick={() => setOpen(false)} />}

        <main className="relative z-0 min-w-0 flex-1">
          <div className="flex min-h-14 items-center justify-between border-b border-black/25 bg-white/90 px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="swan-section-index">{String([...primaryNav, ...productNav].findIndex((item) => item.label.toLowerCase() === title.toLowerCase()) + 1).padStart(2, "0")}</span>
              <h1 className="text-sm font-semibold uppercase tracking-[0.08em]">{title}</h1>
            </div>
            <span className={`hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] sm:flex ${isAuthenticated ? "text-black/55" : "text-red-700"}`}>
              <span className={`size-1.5 ${isAuthenticated ? "bg-black" : "bg-red-600"}`} />
              {isAuthenticated ? "authenticated session" : "read-only preview"}
            </span>
          </div>
          {!isAuthenticated && (
            <div className="flex items-center justify-between gap-4 border-b border-red-700 bg-red-600 px-4 py-2 text-white lg:px-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em]">Read-only preview. Connect your secure identity to create workspaces and manage infrastructure.</p>
              <button type="button" onClick={() => startLogin()} className="shrink-0 border border-white px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] hover:bg-white hover:text-black">Connect</button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
