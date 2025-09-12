import { formatPrice, applyDiscount, makeTitle } from "./utils";

export function subtotal(prices: Record<string, number>, qty: Record<string, number>): number {
  let sum = 0;
  for (const k of Object.keys(prices)) {
    const p = prices[k] ?? 0;
    const q = qty[k] ?? 0;
    sum += p * q;
  }
  return sum;
}

export function totalWithDairyDiscount(prices: Record<string, number>, qty: Record<string, number>): number {
  const dairy = new Set(["milk", "butter", "eggs"]);
  let sum = 0;
  for (const k of Object.keys(prices)) {
    const p = prices[k] ?? 0;
    const q = qty[k] ?? 0;
    const line = dairy.has(k) ? applyDiscount(p, 10) * q : p * q;
    sum += line;
  }
  return sum;
}

export function printReceipt(title: string, total: number): string {
  const t = makeTitle(title);
  return `${t}: ${formatPrice(total)}`;
}


