import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useOrders, useSettings } from "@/lib/storage";
import { Receipt } from "@/components/Receipt";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

      // Clone the receipt into a detached container with safe colors,
      // because html2canvas v1 cannot parse modern CSS color functions
      // (oklch, color-mix) used by the app's design tokens.
      const source = receiptRef.current;
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-10000px";
      wrapper.style.top = "0";
      wrapper.style.background = "#ffffff";
      wrapper.style.color = "#000000";
      wrapper.style.padding = "0";
      wrapper.style.margin = "0";
      const clone = source.cloneNode(true) as HTMLElement;
      // Force safe colors on clone subtree
      clone.style.background = "#ffffff";
      clone.style.color = "#000000";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(clone, {
          scale: 3,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
        });
      } finally {
        document.body.removeChild(wrapper);
      }

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
      toast.success("PDF gerado");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Falha ao gerar PDF: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!order || generatedRef.current) return;
    generatedRef.current = true;
    const t = setTimeout(() => generatePdf(), 500);
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
