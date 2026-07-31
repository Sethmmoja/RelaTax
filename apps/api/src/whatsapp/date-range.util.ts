export function resolveDateRange(option: "month" | "quarter" | "year"): { from: string; to: string; label: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  if (option === "month") {
    const from = new Date(Date.UTC(year, month, 1));
    const to = new Date(Date.UTC(year, month + 1, 0));
    return { from: from.toISOString(), to: to.toISOString(), label: "This Month" };
  }

  if (option === "quarter") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    const from = new Date(Date.UTC(year, quarterStartMonth, 1));
    const to = new Date(Date.UTC(year, quarterStartMonth + 3, 0));
    return { from: from.toISOString(), to: to.toISOString(), label: "This Quarter" };
  }

  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31));
  return { from: from.toISOString(), to: to.toISOString(), label: "This Year" };
}
