import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Plus, History, Settings as SettingsIcon, Sparkles, Inbox } from "lucide-react";
import { useSettings } from "@/lib/storage";
import { useEffect } from 'react';

const items = [
  { to: "/", label: "Nova", icon: Plus },
  { to: "/abertas", label: "Abertas", icon: Inbox },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/configuracoes", label: "Config", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [settings] = useSettings();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    const badge = document.findElementById("lovable-badge");
    badge.style.display = "none"
  }, [])

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar — desktop only */}
      <aside className="no-print hidden lg:flex w-64 shrink-0 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border">
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
                {it.label === "Nova" ? "Nova Comanda" : it.label === "Config" ? "Configurações" : it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 text-xs text-sidebar-foreground/50 border-t border-sidebar-border">
          v1.0 · localStorage
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Mobile top bar */}
        <header className="no-print lg:hidden sticky top-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-4 py-3 flex items-center gap-3 shadow-[var(--shadow-md)]">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-base truncate leading-tight">{settings.storeName}</div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wide">PDV Açaí</div>
          </div>
        </header>

        <div className="flex-1 pb-20 lg:pb-0">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground border-t border-sidebar-border grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {items.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  active
                    ? "text-white"
                    : "text-sidebar-foreground/60"
                }`}
              >
                <div className={`h-9 w-10 rounded-xl flex items-center justify-center transition ${active ? "bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary)] shadow-[var(--shadow-glow)]" : ""}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                {it.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
