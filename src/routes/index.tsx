import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Minus, Trash2, Printer, Save, Sparkles, ClipboardPaste, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSettings, useOrders, formatBRL, nextOrderNumber } from "@/lib/storage";
import { parseWhatsappText } from "@/lib/parseWhatsapp";
import type { OrderItem, Order, PaymentMethod } from "@/lib/types";
import { PAYMENT_LABELS } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova Comanda — Açaí PDV" },
      { name: "description", content: "Crie comandas rápido a partir de pedidos do WhatsApp." },
    ],
  }),
  component: NovaComanda,
});

const DRAFT_KEY = "acai.draft.v1";

function NovaComanda() {
  const [settings] = useSettings();
  const [, setOrders] = useOrders();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState("");
  const [whatsappText, setWhatsappText] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>();
  const [waOpen, setWaOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setCustomerName(d.customerName || "");
        setWhatsappText(d.whatsappText || "");
        setNotes(d.notes || "");
        setItems(d.items || []);
      }
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ customerName, whatsappText, notes, items }),
    );
  }, [customerName, whatsappText, notes, items]);

  const total = useMemo(
    () => items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
    [items],
  );

  function addSize(sizeId: string) {
    const size = settings.sizes.find((s) => s.id === sizeId);
    if (!size) return;
    setItems((prev) => {
      const existing = prev.find((p) => p.sizeId === sizeId && !size.custom);
      if (existing) {
        return prev.map((p) => (p.id === existing.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          sizeId: size.id,
          name: size.name,
          qty: 1,
          unitPrice: size.price,
        },
      ];
    });
  }

  function updateItem(id: string, patch: Partial<OrderItem>) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setWhatsappText(text);
      setWaOpen(true);
      const parsed = parseWhatsappText(text, settings.sizes);
      if (parsed.length) {
        setItems((prev) => [...prev, ...parsed]);
        toast.success(`${parsed.length} item(ns) extraído(s)`);
      } else {
        toast.info("Texto colado. Nenhum item reconhecido.");
      }
    } catch {
      toast.error("Não consegui ler a área de transferência");
    }
  }

  function importFromText() {
    const parsed = parseWhatsappText(whatsappText, settings.sizes);
    if (!parsed.length) {
      toast.info("Nenhum item reconhecido");
      return;
    }
    setItems((prev) => [...prev, ...parsed]);
    toast.success(`${parsed.length} item(ns) adicionado(s)`);
  }

  function clearDraft() {
    setCustomerName("");
    setWhatsappText("");
    setNotes("");
    setItems([]);
    setPaymentMethod(undefined);
    localStorage.removeItem(DRAFT_KEY);
  }

  function save(printAfter: boolean, paid: boolean) {
    if (!items.length) {
      toast.error("Adicione ao menos um item");
      return;
    }
    if (paid && !paymentMethod) {
      toast.error("Escolha a forma de pagamento");
      return;
    }
    const order: Order = {
      id: crypto.randomUUID(),
      number: nextOrderNumber(),
      customerName: customerName || undefined,
      whatsappText: whatsappText || undefined,
      items,
      notes: notes || undefined,
      total,
      status: paid ? "paid" : "pending",
      paymentMethod,
      createdAt: new Date().toISOString(),
      paidAt: paid ? new Date().toISOString() : undefined,
    };
    setOrders((prev) => [order, ...prev]);
    clearDraft();
    toast.success(`Comanda #${order.number} salva`);
    if (printAfter) {
      navigate({ to: "/imprimir/$id", params: { id: order.id } });
    } else {
      navigate({ to: "/historico" });
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save(false, false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        save(true, false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, customerName, whatsappText, notes, paymentMethod]);

  return (
    <AppShell>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-44 lg:pb-8">
        <header className="mb-4 lg:mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-4xl font-display font-bold text-foreground">Nova Comanda</h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 hidden lg:block">Atalhos: Ctrl+S salvar · Ctrl+P imprimir</p>
          </div>
          <div className="hidden lg:flex gap-2">
            <Button variant="outline" onClick={clearDraft}>Limpar</Button>
            <Button variant="secondary" onClick={() => save(false, false)}>
              <Save className="h-4 w-4 mr-1" /> Salvar pendente
            </Button>
            <Button onClick={() => save(true, false)} className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-glow)] text-primary-foreground shadow-[var(--shadow-glow)]">
              <Printer className="h-4 w-4 mr-1" /> Salvar e imprimir
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Cliente + WhatsApp colapsável (mobile primeiro) */}
            <Card className="border-0 shadow-[var(--shadow-md)]">
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label htmlFor="cn" className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</Label>
                  <Input id="cn" placeholder="Nome (opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-12 text-base" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11" onClick={pasteFromClipboard}>
                    <ClipboardPaste className="h-4 w-4 mr-2" /> Colar do WhatsApp
                  </Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setWaOpen((v) => !v)} aria-label="Mostrar texto">
                    {waOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </div>
                {waOpen && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" /> Texto bruto
                    </div>
                    <Textarea
                      rows={5}
                      placeholder={`Cole aqui.\nEx:\n2x Açaí 17\n1x 500ml`}
                      value={whatsappText}
                      onChange={(e) => setWhatsappText(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tamanhos rápidos */}
            <Card className="border-0 shadow-[var(--shadow-md)]" style={{ background: "var(--gradient-card)" }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <Sparkles className="h-5 w-5 text-primary" /> Tamanhos rápidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {settings.sizes.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSize(s.id)}
                      className="group relative rounded-2xl border-2 border-border bg-card p-3 lg:p-4 text-left active:scale-95 active:border-primary hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all min-h-[88px]"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.custom ? "Custom" : "Açaí"}</div>
                      <div className="font-semibold text-foreground text-sm leading-tight">{s.name}</div>
                      <div className="text-primary font-display font-bold text-base lg:text-lg mt-1">
                        {s.custom ? "R$ ?" : formatBRL(s.price)}
                      </div>
                      <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <Plus className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Itens */}
            <Card className="border-0 shadow-[var(--shadow-md)]">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="font-display text-lg">Itens</CardTitle>
                <span className="text-xs text-muted-foreground">{items.length} item(ns)</span>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Toque nos tamanhos acima para adicionar
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {items.map((it) => (
                      <li key={it.id} className="p-3 rounded-xl bg-muted/40 border border-border">
                        {/* Linha 1: nome + remover */}
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            className="flex-1 min-w-0 h-10"
                            value={it.name}
                            onChange={(e) => updateItem(it.id, { name: e.target.value })}
                          />
                          <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)} className="h-10 w-10 shrink-0">
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                        {/* Linha 2: qty / preço / total */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => updateItem(it.id, { qty: Math.max(1, it.qty - 1) })}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-bold text-lg">{it.qty}</span>
                            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => updateItem(it.id, { qty: it.qty + 1 })}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <span className="text-xs text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              className="h-10 flex-1 min-w-0"
                              value={it.unitPrice}
                              onChange={(e) => updateItem(it.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="font-display font-bold text-primary text-right whitespace-nowrap">
                            {formatBRL(it.qty * it.unitPrice)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            <Card className="border-0 shadow-[var(--shadow-md)]">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={2} placeholder="Sem granola, entregar às 19h..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita / desktop only — total + pagamento */}
          <div className="hidden lg:block space-y-6">
            <Card className="border-0 overflow-hidden sticky top-4" style={{ background: "var(--gradient-hero)" }}>
              <CardContent className="p-6 text-white">
                <div className="text-sm opacity-80 uppercase tracking-wide">Total</div>
                <div className="font-display font-bold text-5xl mt-1">{formatBRL(total)}</div>
                <div className="mt-4">
                  <Label className="text-white/80 text-xs uppercase">Pagamento</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 rounded-lg text-sm font-semibold transition ${
                          paymentMethod === m
                            ? "bg-white text-primary"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        {PAYMENT_LABELS[m]}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={() => save(true, true)}
                    variant="secondary"
                    className="w-full mt-3 bg-white text-primary hover:bg-white/90"
                  >
                    <Printer className="h-4 w-4 mr-1" /> Pagar e imprimir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom action bar (acima do bottom-nav) */}
      <div className="no-print lg:hidden fixed left-0 right-0 z-30 px-3 pb-[calc(64px+env(safe-area-inset-bottom))] bottom-0 pointer-events-none">
        <div className="pointer-events-auto rounded-2xl p-3 shadow-[var(--shadow-lg)] text-white" style={{ background: "var(--gradient-hero)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] opacity-80 uppercase tracking-wide leading-none">Total</div>
              <div className="font-display font-bold text-2xl leading-tight mt-0.5">{formatBRL(total)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <Button onClick={() => save(false, false)} variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-0 h-11">
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
            <Button onClick={() => save(true, false)} variant="secondary" className="bg-white text-primary hover:bg-white/90 h-11 font-semibold">
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
