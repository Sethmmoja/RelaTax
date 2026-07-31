import { calculatePayroll } from "../src/payroll/payroll-calculator";

describe("calculatePayroll", () => {
  it("matches a worked example: gross 40,000 splits NSSF into Tier I/II and taxes pay net of allowable deductions", () => {
    const result = calculatePayroll({ basicSalary: 40_000 });
    expect(result.nssfTier1).toBeCloseTo(540, 2); // 6% of the 9,000 lower earnings limit
    expect(result.nssfTier2).toBeCloseTo(1860, 2); // 6% of (40,000 - 9,000)
    expect(result.nssf).toBeCloseTo(2400, 2);
    expect(result.shif).toBeCloseTo(1100, 2); // 2.75% of gross
    expect(result.housingLevy).toBeCloseTo(600, 2); // 1.5% of gross
    expect(result.taxablePay).toBeCloseTo(35_900, 2); // gross minus NSSF+SHIF+Housing Levy
    expect(result.payeBeforeRelief).toBeCloseTo(5553.35, 2);
    expect(result.personalRelief).toBe(2400);
    expect(result.paye).toBeCloseTo(3153.35, 2);
  });

  it("splits NSSF at the lower earnings limit and caps Tier II at the upper earnings limit", () => {
    const belowLel = calculatePayroll({ basicSalary: 5_000 });
    expect(belowLel.nssfTier1).toBeCloseTo(300, 2);
    expect(belowLel.nssfTier2).toBe(0);

    const aboveUel = calculatePayroll({ basicSalary: 200_000 });
    expect(aboveUel.nssfTier1).toBeCloseTo(540, 2);
    expect(aboveUel.nssfTier2).toBeCloseTo((108_000 - 9_000) * 0.06, 2);
  });

  it("applies the SHIF minimum for low earners", () => {
    const result = calculatePayroll({ basicSalary: 5_000 });
    expect(result.shif).toBe(300);
  });

  it("nets out gross pay minus all statutory deductions", () => {
    const result = calculatePayroll({ basicSalary: 50_000 });
    expect(result.netPay).toBeCloseTo(
      result.grossPay - result.paye - result.nssf - result.shif - result.housingLevy,
      6
    );
  });

  it("never returns negative PAYE for very low earners", () => {
    const result = calculatePayroll({ basicSalary: 10_000 });
    expect(result.paye).toBe(0);
  });
});
