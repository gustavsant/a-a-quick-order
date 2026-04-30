import { useEffect, useState, useCallback } from "react";
import type { Order, Settings } from "./types";

const ORDERS_KEY = "acai.orders.v1";
const SETTINGS_KEY = "acai.settings.v1";

const DEFAULT_SETTINGS: Settings = {
  storeName: "Açaí Delícia",
  footerText: "Obrigado pela preferência! 💜",
  nextOrderNumber: 1001,
  sizes: [
    { id: "s1", name: "Açaí 300ml", price: 12 },
    { id: "s2", name: "Açaí 500ml", price: 17 },
    { id: "s3", name: "Açaí 700ml", price: 22 },
    { id: "s4", name: "Açaí 1L", price: 30 },
    { id: "s5", name: "Personalizado", price: 0, custom: true },
  ],
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(`storage:${key}`));
}

function useStorageValue<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    setValue(read(key, fallback));
    const handler = () => setValue(read(key, fallback));
    window.addEventListener(`storage:${key}`, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(`storage:${key}`, handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next =
          typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
        write(key, next);
        return next;
      });
    },
    [key],
  );
  return [value, update] as const;
}

export function useSettings() {
  return useStorageValue<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function useOrders() {
  return useStorageValue<Order[]>(ORDERS_KEY, []);
}

export function getSettings(): Settings {
  return read(SETTINGS_KEY, DEFAULT_SETTINGS);
}
export function saveSettings(s: Settings) {
  write(SETTINGS_KEY, s);
}
export function getOrders(): Order[] {
  return read(ORDERS_KEY, []);
}
export function saveOrders(o: Order[]) {
  write(ORDERS_KEY, o);
}

export function nextOrderNumber(): number {
  const s = getSettings();
  const n = s.nextOrderNumber;
  saveSettings({ ...s, nextOrderNumber: n + 1 });
  return n;
}

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
