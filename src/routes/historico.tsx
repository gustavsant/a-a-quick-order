import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Printer, CheckCircle2, Clock, Trash2, Filter } from "lucide-react";
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
  const [showFilters, setShowFilters] = useState(false);

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
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <header className="mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-4xl font-display font-bold">Histórico</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} comanda(s) · {formatBRL(totalSum)}</p>
        </header>

        {/* Busca sempre visível, filtros toggle no mobile */}
        <Card className="mb-4 border-0 shadow-[var(--shadow-md)]">
          <CardContent className="p-3 lg:p-4 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-11" placeholder="Buscar nome ou nº..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" className="h-11 w-11 lg:hidden" onClick={() => setShowFilters((v) => !v)} aria-label="Filtros">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <div className={`${showFilters ? "grid" : "hidden"} lg:grid grid-cols-1 sm:grid-cols-3 gap-2`}>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card className="border-dashed"><CardContent className="p-10 text-center text-muted-foreground text-sm">Nenhuma comanda encontrada.</CardContent></Card>
          )}
          {filtered.map((o) => (
            <Card key={o.id} className="border-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition">
              <CardContent className="p-3 lg:p-4">
                {/* Topo: número + nome/data + total */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-glow)] text-primary-foreground flex items-center justify-center font-display font-bold text-xs lg:text-sm shadow-[var(--shadow-glow)] shrink-0">
                    #{o.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{o.customerName || "Sem nome"}</div>
                    <div className="text-[11px] lg:text-xs text-muted-foreground truncate">
                      {new Date(o.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {o.items.length} item(ns)
                    </div>
                  </div>
                  <div className="font-display font-bold text-lg lg:text-xl text-primary text-right whitespace-nowrap">{formatBRL(o.total)}</div>
                </div>

                {/* Status + ações */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {o.status === "paid" ? (
                    <Badge className="bg-[color:var(--success)] text-[color:var(--success-foreground)] border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> {o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] : "Pago"}
                    </Badge>
                  ) : o.status === "cancelled" ? (
                    <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                      Cancelada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[color:var(--warning-foreground)] border-[color:var(--warning)] bg-[color:var(--warning)]/20">
                      <Clock className="h-3 w-3 mr-1" /> Pendente
                    </Badge>
                  )}
                  <div className="flex-1" />
                  {o.status === "pending" && (
                    <Select onValueChange={(v) => markPaid(o.id, v as PaymentMethod)}>
                      <SelectTrigger className="w-[130px] h-10"><SelectValue placeholder="Marcar pago" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                          <SelectItem key={m} value={m}>{PAYMENT_LABELS[m]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button asChild size="icon" variant="outline" className="h-10 w-10">
                    <Link to="/imprimir/$id" params={{ id: o.id }}><Printer className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(o.id)} className="h-10 w-10">
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
