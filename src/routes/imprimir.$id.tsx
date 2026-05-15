import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useOrders, useSettings, formatBRL } from "@/lib/storage";
import { Receipt } from "@/components/Receipt";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PAYMENT_LABELS, type Order, type Settings } from "@/lib/types";

export const Route = createFileRoute("/imprimir/$id")({
  head: () => ({
    meta: [{ title: "Comanda PDF" }],
  }),
  component: ImprimirPage,
});

const WIDTH_MM = 58;
const MARGIN_MM = 3;
const CONTENT_W = WIDTH_MM - MARGIN_MM * 2;

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
    if (!order) return;
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      await buildReceiptPdf(jsPDF, order, settings);
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

async function buildReceiptPdf(
  JsPDF: typeof import("jspdf").default,
  order: Order,
  settings: Settings,
) {
  // First pass with a temp doc to measure total height
  const measure = new JsPDF({ unit: "mm", format: [WIDTH_MM, 1000], orientation: "portrait" });
  const totalHeight = renderReceipt(measure, order, settings, true);

  const pdf = new JsPDF({
    unit: "mm",
    format: [WIDTH_MM, Math.max(totalHeight + MARGIN_MM, 30)],
    orientation: "portrait",
  });

  // Embed logo if any
  let logoImg: HTMLImageElement | null = null;
  if (settings.logoDataUrl) {
    try {
      logoImg = await loadImage(settings.logoDataUrl);
    } catch {
      logoImg = null;
    }
  }

  renderReceipt(pdf, order, settings, false, logoImg);
  pdf.save(`comanda-${order.number}.pdf`);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type Pdf = import("jspdf").default;

function renderReceipt(
  pdf: Pdf,
  order: Order,
  settings: Settings,
  measureOnly: boolean,
  logoImg?: HTMLImageElement | null,
): number {
  let y = MARGIN_MM;
  const xL = MARGIN_MM;
  const xR = WIDTH_MM - MARGIN_MM;
  const center = WIDTH_MM / 2;

  // Logo
  if (settings.logoDataUrl) {
    const maxW = 30;
    const maxH = 18;
    let w = maxW;
    let h = maxH;
    if (logoImg) {
      const ratio = logoImg.width / logoImg.height;
      if (ratio > maxW / maxH) {
        w = maxW;
        h = maxW / ratio;
      } else {
        h = maxH;
        w = maxH * ratio;
      }
      if (!measureOnly) {
        pdf.addImage(logoImg, "PNG", center - w / 2, y, w, h);
      }
    }
    y += h + 1;
  }

  // Store name
  pdf.setFont("courier", "bold");
  pdf.setFontSize(13);
  if (!measureOnly) pdf.text(settings.storeName || "", center, y + 4, { align: "center" });
  y += 5;

  // Date
  const date = new Date(order.createdAt);
  const dateStr = `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  pdf.setFontSize(9);
  if (!measureOnly) pdf.text(dateStr, center, y + 3, { align: "center" });
  y += 4;

  // Number
  pdf.setFontSize(13);
  if (!measureOnly) pdf.text(`COMANDA #${order.number}`, center, y + 4, { align: "center" });
  y += 5;

  y = divider(pdf, y, xL, xR, measureOnly);

  // Customer
  if (order.customerName) {
    pdf.setFontSize(10);
    if (!measureOnly) pdf.text(`Cliente: ${order.customerName}`, xL, y + 3);
    y += 4;
    y = divider(pdf, y, xL, xR, measureOnly);
  }

  // Items header
  pdf.setFontSize(11);
  if (!measureOnly) pdf.text("ITENS", xL, y + 4);
  y += 5;

  pdf.setFontSize(10);
  for (const it of order.items) {
    const left = `${it.qty}x ${it.name}`;
    const right = formatBRL(it.qty * it.unitPrice);
    const rightW = pdf.getTextWidth(right);
    const leftMaxW = CONTENT_W - rightW - 1;
    const lines = pdf.splitTextToSize(left, leftMaxW) as string[];
    if (!measureOnly) {
      pdf.text(lines, xL, y + 3);
      pdf.text(right, xR, y + 3, { align: "right" });
    }
    y += lines.length * 3.5;

    if (it.notes) {
      pdf.setFontSize(9);
      const noteLines = pdf.splitTextToSize(`  > ${it.notes}`, CONTENT_W) as string[];
      if (!measureOnly) pdf.text(noteLines, xL, y + 3);
      y += noteLines.length * 3.2;
      pdf.setFontSize(10);
    }
    y += 0.5;
  }

  y = divider(pdf, y, xL, xR, measureOnly);

  // Total
  pdf.setFontSize(13);
  pdf.setFont("courier", "bold");
  if (!measureOnly) {
    pdf.text("TOTAL", xL, y + 4);
    pdf.text(formatBRL(order.total), xR, y + 4, { align: "right" });
  }
  y += 6;

  if (order.paymentMethod) {
    pdf.setFontSize(10);
    if (!measureOnly) pdf.text(`Pagto: ${PAYMENT_LABELS[order.paymentMethod]}`, xL, y + 3);
    y += 4;
  }

  if (order.notes) {
    y = divider(pdf, y, xL, xR, measureOnly);
    pdf.setFontSize(10);
    if (!measureOnly) pdf.text("Obs:", xL, y + 3);
    y += 3.5;
    const lines = pdf.splitTextToSize(order.notes, CONTENT_W) as string[];
    if (!measureOnly) pdf.text(lines, xL, y + 3);
    y += lines.length * 3.5;
  }

  if (order.whatsappText) {
    y = divider(pdf, y, xL, xR, measureOnly);
    pdf.setFontSize(10);
    if (!measureOnly) pdf.text("Pedido original:", xL, y + 3);
    y += 3.5;
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(order.whatsappText, CONTENT_W) as string[];
    if (!measureOnly) pdf.text(lines, xL, y + 3);
    y += lines.length * 3.2;
  }

  if (settings.footerText) {
    y = divider(pdf, y, xL, xR, measureOnly);
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(settings.footerText, CONTENT_W) as string[];
    if (!measureOnly) {
      for (let i = 0; i < lines.length; i++) {
        pdf.text(lines[i], center, y + 3 + i * 3.2, { align: "center" });
      }
    }
    y += lines.length * 3.2;
  }

  return y + 3;
}

function divider(pdf: Pdf, y: number, xL: number, xR: number, measureOnly: boolean) {
  if (!measureOnly) {
    pdf.setLineDashPattern([0.5, 0.5], 0);
    pdf.setLineWidth(0.2);
    pdf.line(xL, y + 1, xR, y + 1);
    pdf.setLineDashPattern([], 0);
  }
  return y + 2.5;
}
