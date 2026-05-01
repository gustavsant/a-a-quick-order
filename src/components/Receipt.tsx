import { forwardRef } from "react";
import type { Order, Settings } from "@/lib/types";
import { PAYMENT_LABELS } from "@/lib/types";
import { formatBRL } from "@/lib/storage";

interface Props {
  order: Order;
  settings: Settings;
}

export const Receipt = forwardRef<HTMLDivElement, Props>(({ order, settings }, ref) => {
  const date = new Date(order.createdAt);
  return (
    <div ref={ref} className="print-receipt bg-white text-black mx-auto" style={{ width: "58mm", padding: "2mm", fontFamily: "'Courier New', monospace", fontSize: 15, lineHeight: 1.4, fontWeight: 700, color: "#000" }}>
      {settings.logoDataUrl && (
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <img src={settings.logoDataUrl} alt="logo" style={{ maxWidth: "40mm", maxHeight: "20mm", display: "inline-block" }} />
        </div>
      )}
      <div style={{ textAlign: "center", fontWeight: 900, fontSize: 18 }}>{settings.storeName}</div>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700 }}>
        {date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div style={{ textAlign: "center", fontWeight: 900, marginTop: 4, fontSize: 17 }}>COMANDA #{order.number}</div>
      <Divider />
      {order.customerName && (
        <>
          <div><b>Cliente:</b> {order.customerName}</div>
          <Divider />
        </>
      )}
      <div style={{ fontWeight: 900, marginBottom: 2, fontSize: 16 }}>ITENS</div>
      {order.items.map((it) => (
        <div key={it.id} style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span style={{ flex: 1, paddingRight: 4 }}>{it.qty}x {it.name}</span>
            <span>{formatBRL(it.qty * it.unitPrice)}</span>
          </div>
          {it.notes && <div style={{ fontSize: 13, fontStyle: "italic", paddingLeft: 8, fontWeight: 700 }}>↳ {it.notes}</div>}
        </div>
      ))}
      <Divider />
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 18 }}>
        <span>TOTAL</span><span>{formatBRL(order.total)}</span>
      </div>
      {order.paymentMethod && (
        <div style={{ marginTop: 2 }}><b>Pagto:</b> {PAYMENT_LABELS[order.paymentMethod]}</div>
      )}
      {order.notes && (
        <>
          <Divider />
          <div style={{ fontWeight: 700 }}>Obs:</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{order.notes}</div>
        </>
      )}
      {order.whatsappText && (
        <>
          <Divider />
          <div style={{ fontWeight: 900 }}>Pedido original:</div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, fontWeight: 700 }}>{order.whatsappText}</div>
        </>
      )}
      {settings.footerText && (
        <>
          <Divider />
          <div style={{ textAlign: "center", whiteSpace: "pre-wrap" }}>{settings.footerText}</div>
        </>
      )}
      <div style={{ height: 12 }} />
    </div>
  );
});
Receipt.displayName = "Receipt";

function Divider() {
  return <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />;
}
