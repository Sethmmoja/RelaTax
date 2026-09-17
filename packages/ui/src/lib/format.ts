/**
 * Money and figure formatting shared by every portal table and statement.
 *
 * One formatter instead of `toLocaleString()` scattered per page, because the
 * scatter produced three different renderings of the same shilling figure
 * (0, 1 or 2 decimals depending on the value) — and in a column, mixed
 * decimals stop the digits lining up, which is the one thing an accounting
 * table exists to do.
 */
const kes = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

/** "KES 184,250.00" — always two decimals so columns align. */
export function formatKes(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `KES ${kes.format(n)}`;
}

/** "184,250.00" — the figure alone, for columns whose header already names the currency. */
export function formatAmount(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return kes.format(n);
}

/** "1,240" — counts and quantities. */
export function formatCount(value: number): string {
  return whole.format(value);
}
