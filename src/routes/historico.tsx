import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Printer, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrders, formatBRL } from "@/lib/storage";
import { PAYMENT_LABELS, type OrderStatus, type PaymentMethod } from "@/lib/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Comandas — Açaí PDV" },
      { name: "description", content: "Busque e gerencie todas as comandas." },
    ],
  }),
  component: Historico,
});

function Historico() {
  const [orders, setOrders] = useOrders();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (q && !(o.customerName || "").toLowerCase().includes(q.toLowerCase()) && !String(o.number).includes(q))
        return false;
      const d = new Date(o.createdAt);
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [orders, q, status, from, to]);

  function markPaid(id: string, method: PaymentMethod) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: "paid", paymentMethod: method, paidAt: new Date().toISOString() } : o,
      ),
    );
  }

  function remove(id: string) {
    if (!confirm("Excluir esta comanda?")) return;
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  const totalSum = filtered.reduce((s, o) => s + o.total, 0);

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-display font-bold">Histórico</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} comanda(s) · {formatBRL(totalSum)}</p>
        </header>

        <Card className="mb-6 border-0 shadow-[var(--shadow-md)]">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome ou nº..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">Nenhuma comanda encontrada.</CardContent></Card>
          )}
          {filtered.map((o) => (
            <Card key={o.id} className="border-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-glow)] text-primary-foreground flex items-center justify-center font-display font-bold text-sm shadow-[var(--shadow-glow)]">
                  #{o.number}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold">{o.customerName || "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString("pt-BR")} · {o.items.length} item(ns)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {o.status === "paid" ? (
                    <Badge className="bg-[color:var(--success)] text-[color:var(--success-foreground)] border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> {o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] : "Pago"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[color:var(--warning-foreground)] border-[color:var(--warning)] bg-[color:var(--warning)]/20">
                      <Clock className="h-3 w-3 mr-1" /> Pendente
                    </Badge>
                  )}
                </div>
                <div className="font-display font-bold text-xl text-primary w-28 text-right">{formatBRL(o.total)}</div>
                <div className="flex gap-1">
                  {o.status === "pending" && (
                    <Select onValueChange={(v) => markPaid(o.id, v as PaymentMethod)}>
                      <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Marcar pago" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                          <SelectItem key={m} value={m}>{PAYMENT_LABELS[m]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button asChild size="icon" variant="outline">
                    <Link to="/imprimir/$id" params={{ id: o.id }}><Printer className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(o.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
