import { resolveDateRange } from "../src/whatsapp/date-range.util";

describe("resolveDateRange", () => {
  it("returns a month range that starts on the 1st and ends on the last day", () => {
    const { from, to, label } = resolveDateRange("month");
    expect(label).toBe("This Month");
    expect(new Date(from).getUTCDate()).toBe(1);
    const toDate = new Date(to);
    const nextDay = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
    expect(nextDay.getUTCDate()).toBe(1);
  });

  it("returns a quarter range spanning exactly 3 months", () => {
    const { from, to } = resolveDateRange("quarter");
    const months = (new Date(to).getUTCFullYear() - new Date(from).getUTCFullYear()) * 12 +
      (new Date(to).getUTCMonth() - new Date(from).getUTCMonth());
    expect(months).toBe(2);
  });

  it("returns a full calendar year range", () => {
    const { from, to } = resolveDateRange("year");
    expect(new Date(from).getUTCMonth()).toBe(0);
    expect(new Date(to).getUTCMonth()).toBe(11);
  });
});
