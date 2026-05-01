import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer, CheckCircle2, Clock, XCircle, Eye, MoreVertical, Trash2, FileText, Inbox } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrders, useSettings, formatBRL } from "@/lib/storage";
import { PAYMENT_LABELS, type Order, type PaymentMethod } from "@/lib/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Receipt } from "@/components/Receipt";
import { toast } from "sonner";

export const Route = createFileRoute("/abertas")({
  head: () => ({
    meta: [
      { title: "Comandas Abertas — Açaí PDV" },
      { name: "description", content: "Comandas em aberto, aguardando pagamento." },
    ],
  }),
  component: Abertas,
});

function Abertas() {
  const [orders, setOrders] = useOrders();
  const [settings] = useSettings();
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const open = useMemo(
    () =>
      orders
        .filter((o) => o.status === "pending")
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [orders],
  );

  const detailsOrder = useMemo(
    () => orders.find((o) => o.id === detailsId) || null,
    [orders, detailsId],
  );

  function markPaid(id: string, method: PaymentMethod) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: "paid", paymentMethod: method, paidAt: new Date().toISOString() } : o,
      ),
    );
    toast.success(`Comanda marcada como paga (${PAYMENT_LABELS[method]})`);
  }

  function cancel(id: string) {
    if (!confirm("Cancelar esta comanda? Ela ficará marcada como cancelada.")) return;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)));
    setDetailsId(null);
    toast.success("Comanda cancelada");
  }

  function remove(id: string) {
    if (!confirm("Excluir definitivamente esta comanda?")) return;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setDetailsId(null);
    toast.success("Comanda excluída");
  }

  const totalAberto = open.reduce((s, o) => s + o.total, 0);

  return (
    <AppShell>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24 lg:pb-8">
        <header className="mb-4 lg:mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl lg:text-4xl font-display font-bold">Comandas Abertas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {open.length} pendente(s) · <span className="text-primary font-semibold">{formatBRL(totalAberto)}</span>
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-glow)] text-primary-foreground">
            <Link to="/">+ Nova</Link>
          </Button>
        </header>

        {open.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">Nenhuma comanda aberta. Tudo em dia! 🎉</p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/">Criar nova comanda</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {open.map((o) => (
              <Card key={o.id} className="border-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition">
                <CardContent className="p-3 lg:p-4">
                  <button
                    onClick={() => setDetailsId(o.id)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-glow)] text-primary-foreground flex items-center justify-center font-display font-bold text-xs lg:text-sm shadow-[var(--shadow-glow)] shrink-0">
                      #{o.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{o.customerName || "Sem nome"}</div>
                      <div className="text-[11px] lg:text-xs text-muted-foreground truncate">
                        {new Date(o.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {o.items.length} item(ns)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-lg lg:text-xl text-primary whitespace-nowrap">{formatBRL(o.total)}</div>
                      <Badge variant="outline" className="mt-0.5 text-[color:var(--warning-foreground)] border-[color:var(--warning)] bg-[color:var(--warning)]/20">
                        <Clock className="h-3 w-3 mr-1" /> Pendente
                      </Badge>
                    </div>
                  </button>

                  {/* Quick actions */}
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <Button size="sm" variant="outline" className="h-10" onClick={() => setDetailsId(o.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-10" asChild>
                      <Link to="/imprimir/$id" params={{ id: o.id }}>
                        <Printer className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="h-10 col-span-1 bg-[color:var(--success)] text-[color:var(--success-foreground)] hover:opacity-90">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                          <DropdownMenuItem key={m} onClick={() => markPaid(o.id, m)}>
                            Pago em {PAYMENT_LABELS[m]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-10">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailsId(o.id)}>
                          <FileText className="h-4 w-4 mr-2" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => cancel(o.id)} className="text-orange-600">
                          <XCircle className="h-4 w-4 mr-2" /> Cancelar comanda
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => remove(o.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Details dialog */}
      <Dialog open={!!detailsOrder} onOpenChange={(v) => !v && setDetailsId(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comanda #{detailsOrder?.number}</DialogTitle>
          </DialogHeader>
          {detailsOrder && (
            <DetailsBody
              order={detailsOrder}
              settings={settings}
              onMarkPaid={(m) => markPaid(detailsOrder.id, m)}
              onCancel={() => cancel(detailsOrder.id)}
              onRemove={() => remove(detailsOrder.id)}
            />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" asChild>
              <Link to="/imprimir/$id" params={{ id: detailsOrder?.id || "" }}>
                <Printer className="h-4 w-4 mr-1" /> Reimprimir
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function DetailsBody({
  order, settings, onMarkPaid, onCancel, onRemove,
}: {
  order: Order;
  settings: ReturnType<typeof useSettings>[0];
  onMarkPaid: (m: PaymentMethod) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-muted/40 rounded-xl p-3 text-sm space-y-1">
        <div><span className="text-muted-foreground">Cliente:</span> <strong>{order.customerName || "—"}</strong></div>
        <div><span className="text-muted-foreground">Criada:</span> {new Date(order.createdAt).toLocaleString("pt-BR")}</div>
        <div><span className="text-muted-foreground">Total:</span> <strong className="text-primary">{formatBRL(order.total)}</strong></div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <Receipt order={order} settings={settings} />
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Marcar como pago</div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
            <Button key={m} onClick={() => onMarkPaid(m)} className="h-11 bg-[color:var(--success)] text-[color:var(--success-foreground)] hover:opacity-90">
              {PAYMENT_LABELS[m]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancel} className="h-11 text-orange-600 border-orange-300">
          <XCircle className="h-4 w-4 mr-1" /> Cancelar
        </Button>
        <Button variant="outline" onClick={onRemove} className="h-11 text-destructive border-destructive/40">
          <Trash2 className="h-4 w-4 mr-1" /> Excluir
        </Button>
      </div>
    </div>
  );
}
