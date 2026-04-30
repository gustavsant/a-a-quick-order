import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Plus, History, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useSettings } from "@/lib/storage";

const items = [
  { to: "/", label: "Nova Comanda", icon: Plus },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/configuracoes", label: "Configurações", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [settings] = useSettings();
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-screen flex w-full">
      <aside className="no-print w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight">{settings.storeName}</div>
              <div className="text-xs text-sidebar-foreground/60">PDV Açaí</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-glow)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 text-xs text-sidebar-foreground/50 border-t border-sidebar-border">
          v1.0 · localStorage
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
