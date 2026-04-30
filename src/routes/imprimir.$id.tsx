import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useOrders, useSettings } from "@/lib/storage";
import { Receipt } from "@/components/Receipt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/imprimir/$id")({
  head: () => ({
    meta: [{ title: "Imprimir Comanda" }],
  }),
  component: ImprimirPage,
});

function ImprimirPage() {
  const { id } = Route.useParams();
  const [orders] = useOrders();
  const [settings] = useSettings();
  const navigate = useNavigate();
  const printedRef = useRef(false);

  const order = useMemo(() => orders.find((o) => o.id === id), [orders, id]);

  useEffect(() => {
    if (!order || printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [order]);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Comanda não encontrada.</p>
          <Button asChild className="mt-4"><Link to="/">Voltar</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-8">
      <div className="no-print max-w-md mx-auto mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate({ to: "/historico" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Histórico
        </Button>
        <Button onClick={() => window.print()} className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-glow)] text-primary-foreground">
          <Printer className="h-4 w-4 mr-1" /> Imprimir novamente
        </Button>
      </div>
      <div className="max-w-md mx-auto bg-white shadow-[var(--shadow-lg)] rounded-xl p-4">
        <Receipt order={order} settings={settings} />
      </div>
    </div>
  );
}
