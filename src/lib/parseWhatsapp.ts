import type { AcaiSize, OrderItem } from "./types";

// Extrai itens como "2x 17", "3x açaí 500ml", "1 - Açaí 26"
export function parseWhatsappText(text: string, sizes: AcaiSize[]): OrderItem[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const items: OrderItem[] = [];
  const re = /(\d+)\s*[x×\-:]\s*([^\n,;]+?)(?:\s*[-=R\$]+\s*(\d+(?:[.,]\d+)?))?$/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(re);
    if (!m) continue;
    const qty = parseInt(m[1], 10);
    const desc = m[2].trim();
    const explicitPrice = m[3] ? parseFloat(m[3].replace(",", ".")) : undefined;

    // tenta achar tamanho conhecido
    const lowered = desc.toLowerCase();
    const size =
      sizes.find((s) => lowered.includes(s.name.toLowerCase())) ||
      sizes.find((s) => {
        const num = s.name.match(/\d+/)?.[0];
        return num && lowered.includes(num);
      });

    const unitPrice = explicitPrice ?? size?.price ?? 0;
    if (qty <= 0) continue;
    items.push({
      id: crypto.randomUUID(),
      sizeId: size?.id,
      name: size?.name ?? desc,
      qty,
      unitPrice,
    });
  }
  return items;
}
