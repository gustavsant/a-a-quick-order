export type PaymentMethod = "pix" | "card" | "cash";
export type OrderStatus = "pending" | "paid" | "cancelled";

export interface AcaiSize {
  id: string;
  name: string; // ex: "300ml", "Açaí 17"
  price: number; // 0 = preço customizado obrigatório
  custom?: boolean;
}

export interface OrderItem {
  id: string;
  sizeId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  number: number;
  customerName?: string;
  whatsappText?: string;
  items: OrderItem[];
  notes?: string;
  total: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string; // ISO
  paidAt?: string;
}

export interface Settings {
  storeName: string;
  logoDataUrl?: string;
  footerText?: string;
  sizes: AcaiSize[];
  nextOrderNumber: number;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  card: "Cartão",
  cash: "Espécie",
};
