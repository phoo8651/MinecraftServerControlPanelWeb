export function fmt2(v: unknown, fallback = "-"): string {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n.toFixed(2);
}
export const fmtPct2 = (v: unknown) => `${fmt2(v)}%`;
export const fmtKbps2 = (v: unknown) => `${fmt2(v)} kbps`;