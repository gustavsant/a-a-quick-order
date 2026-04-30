import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders, formatBRL } from "@/lib/storage";
import { PAYMENT_LABELS } from "@/lib/types";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Açaí PDV" },
      { name: "description", content: "Análise de vendas, formas de pagamento e tamanhos." },
    ],
  }),
  component: Dashboard,
});

const COLORS = [
  "oklch(0.5 0.22 305)",
  "oklch(0.7 0.18 145)",
  "oklch(0.72 0.18 60)",
  "oklch(0.65 0.22 25)",
  "oklch(0.55 0.2 250)",
];

function Dashboard() {
  const [orders] = useOrders();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const inRange = useMemo(() => {
    const f = new Date(from);
    const t = new Date(to + "T23:59:59");
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= f && d <= t && o.status === "paid";
    });
  }, [orders, from, to]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 6 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const paid = orders.filter((o) => o.status === "paid");
    const sumIf = (since: number) =>
      paid.filter((o) => new Date(o.createdAt).getTime() >= since).reduce((s, o) => s + o.total, 0);
    return {
      today: sumIf(todayStart),
      week: sumIf(weekStart),
      month: sumIf(monthStart),
      range: inRange.reduce((s, o) => s + o.total, 0),
      count: inRange.length,
    };
  }, [orders, inRange]);

  const byPayment = useMemo(() => {
    const map = new Map<string, number>();
    inRange.forEach((o) => {
      const k = o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] : "—";
      map.set(k, (map.get(k) ?? 0) + o.total);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [inRange]);

  const bySize = useMemo(() => {
    const map = new Map<string, number>();
    inRange.forEach((o) =>
      o.items.forEach((it) => {
        map.set(it.name, (map.get(it.name) ?? 0) + it.qty);
      }),
    );
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [inRange]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    inRange.forEach((o) => {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + o.total);
    });
    return Array.from(map, ([date, total]) => ({
      date: date.slice(5).replace("-", "/"),
      total: Math.round(total * 100) / 100,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [inRange]);

  return (
    <AppShell>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <header className="mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-4xl font-display font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Análise das vendas pagas</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
          <StatCard label="Hoje" value={formatBRL(stats.today)} accent />
          <StatCard label="Últimos 7 dias" value={formatBRL(stats.week)} />
          <StatCard label="Mês atual" value={formatBRL(stats.month)} />
          <StatCard label={`Comandas (período)`} value={String(stats.count)} sub={formatBRL(stats.range)} />
        </div>

        <Card className="mb-6 border-0 shadow-[var(--shadow-md)]">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div>
              <Label>De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard title="Por forma de pagamento">
            {byPayment.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byPayment} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100} paddingAngle={2}>
                    {byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Tamanhos mais vendidos">
            {bySize.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={bySize} dataKey="value" nameKey="name" outerRadius={100}>
                    {bySize.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Vendas por dia">
          {byDay.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 305)" />
                <XAxis dataKey="date" stroke="oklch(0.5 0.04 300)" />
                <YAxis stroke="oklch(0.5 0.04 300)" />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="total" fill="oklch(0.55 0.22 305)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={`border-0 ${accent ? "text-white" : ""}`} style={accent ? { background: "var(--gradient-hero)" } : undefined}>
      <CardContent className="p-5">
        <div className={`text-xs uppercase tracking-wide ${accent ? "text-white/80" : "text-muted-foreground"}`}>{label}</div>
        <div className="font-display font-bold text-2xl mt-1">{value}</div>
        {sub && <div className={`text-sm mt-1 ${accent ? "text-white/70" : "text-muted-foreground"}`}>{sub}</div>}
      </CardContent>
    </Card>
  );
}
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-[var(--shadow-md)]">
      <CardHeader><CardTitle className="font-display">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
function Empty() {
  return <div className="py-12 text-center text-muted-foreground text-sm">Sem dados no período</div>;
}
