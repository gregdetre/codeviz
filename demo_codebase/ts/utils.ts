export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function applyDiscount(price: number, percent: number): number {
  return price * (1 - percent / 100);
}

export function makeTitle(name: string): string {
  return name.trim().replace(/\b\w/g, (m) => m.toUpperCase());
}


