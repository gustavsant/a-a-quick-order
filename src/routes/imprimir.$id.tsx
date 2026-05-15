import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useOrders, useSettings } from "@/lib/storage";
import { Receipt } from "@/components/Receipt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/imprimir/$id")({
  head: () => ({
    meta: [{ title: "Comanda PDF" }],
  }),
  component: ImprimirPage,
});

function ImprimirPage() {
  const { id } = Route.useParams();
  const [orders] = useOrders();
  const [settings] = useSettings();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);
  const generatedRef = useRef(false);
  const [generating, setGenerating] = useState(false);

  const order = useMemo(() => orders.find((o) => o.id === id), [orders, id]);

  async function generatePdf() {
    if (!receiptRef.current || !order) return;
    setGenerating(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
      });
      // 58mm width receipt; height proportional
      const widthMm = 58;
      const heightMm = (canvas.height / canvas.width) * widthMm;
      const pdf = new jsPDF({
        unit: "mm",
        format: [widthMm, heightMm],
        orientation: "portrait",
      });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);
      pdf.save(`comanda-${order.number}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!order || generatedRef.current) return;
    generatedRef.current = true;
    const t = setTimeout(() => generatePdf(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="max-w-md mx-auto mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate({ to: "/historico" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Histórico
        </Button>
        <Button
          onClick={generatePdf}
          disabled={generating}
          className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-glow)] text-primary-foreground"
        >
          <Download className="h-4 w-4 mr-1" /> {generating ? "Gerando..." : "Baixar PDF"}
        </Button>
      </div>
      <div className="max-w-md mx-auto bg-white shadow-[var(--shadow-lg)] rounded-xl p-4">
        <Receipt ref={receiptRef} order={order} settings={settings} />
      </div>
    </div>
  );
}
