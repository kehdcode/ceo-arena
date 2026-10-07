export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR";

const CURRENCY_META: Record<CurrencyCode, { symbol: string; locale: string }> = {
  NGN: { symbol: "₦", locale: "en-NG" },
  USD: { symbol: "$", locale: "en-US" },
  GBP: { symbol: "£", locale: "en-GB" },
  EUR: { symbol: "€", locale: "en-IE" },
};

export const DEFAULT_CURRENCY: CurrencyCode = "NGN";

export function formatCompactCurrency(value: number, code: CurrencyCode = DEFAULT_CURRENCY) {
  const meta = CURRENCY_META[code];
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1_000_000_000) return `${sign}${meta.symbol}${(absolute / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}b`;
  if (absolute >= 1_000_000) return `${sign}${meta.symbol}${(absolute / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (absolute >= 1_000) return `${sign}${meta.symbol}${(absolute / 1_000).toFixed(absolute >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `${sign}${meta.symbol}${Math.round(absolute).toLocaleString(meta.locale)}`;
}

export function formatFullCurrency(value: number, code: CurrencyCode = DEFAULT_CURRENCY) {
  const meta = CURRENCY_META[code];
  return `${value < 0 ? "−" : ""}${meta.symbol}${Math.round(Math.abs(value)).toLocaleString(meta.locale)}`;
}
