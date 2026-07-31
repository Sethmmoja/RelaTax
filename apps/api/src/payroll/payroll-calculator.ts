/**
 * Kenyan statutory payroll deductions. Rates below reflect the bands in force
 * as of mid-2026: Finance Act 2023 PAYE bands, SHIF at 2.75% since it replaced
 * NHIF in Oct 2024, the Affordable Housing Levy at 1.5%, and NSSF's Year-4
 * limits (LEL 9,000 / UEL 108,000) under the NSSF Act 2013 Second Schedule
 * phase-in, which started Feb 2023 and steps up every February. NSSF, SHIF,
 * and the Housing Levy are all allowable (pre-tax) deductions under current
 * law, so PAYE is calculated on pay net of those, not on gross pay directly.
 * These figures need a yearly check against KRA/NSSF/SHIF publications
 * before being trusted for a live payroll run.
 */

const PAYE_BANDS: { upTo: number; rate: number }[] = [
  { upTo: 24_000, rate: 0.1 },
  { upTo: 32_333, rate: 0.25 },
  { upTo: 500_000, rate: 0.3 },
  { upTo: 800_000, rate: 0.325 },
  { upTo: Infinity, rate: 0.35 }
];
const PERSONAL_RELIEF = 2_400;

const NSSF_LOWER_EARNINGS_LIMIT = 9_000;
const NSSF_UPPER_EARNINGS_LIMIT = 108_000;
const NSSF_RATE = 0.06;

const SHIF_RATE = 0.0275;
const SHIF_MINIMUM = 300;

const HOUSING_LEVY_RATE = 0.015;

function calculatePaye(taxablePay: number): number {
  let remaining = taxablePay;
  let tax = 0;
  let lowerBound = 0;
  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;
    const bandWidth = band.upTo - lowerBound;
    const taxableInBand = Math.min(remaining, bandWidth);
    tax += taxableInBand * band.rate;
    remaining -= taxableInBand;
    lowerBound = band.upTo;
  }
  return tax;
}

export interface PayrollCalculationInput {
  basicSalary: number;
}

export interface PayrollCalculationResult {
  grossPay: number;
  nssfTier1: number;
  nssfTier2: number;
  nssf: number;
  shif: number;
  housingLevy: number;
  taxablePay: number;
  payeBeforeRelief: number;
  personalRelief: number;
  paye: number;
  netPay: number;
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const grossPay = input.basicSalary;

  const nssfTier1 = NSSF_RATE * Math.min(grossPay, NSSF_LOWER_EARNINGS_LIMIT);
  const nssfTier2 = NSSF_RATE * Math.max(0, Math.min(grossPay, NSSF_UPPER_EARNINGS_LIMIT) - NSSF_LOWER_EARNINGS_LIMIT);
  const nssf = nssfTier1 + nssfTier2;

  const shif = Math.max(SHIF_MINIMUM, grossPay * SHIF_RATE);
  const housingLevy = grossPay * HOUSING_LEVY_RATE;

  const taxablePay = Math.max(0, grossPay - nssf - shif - housingLevy);
  const payeBeforeRelief = calculatePaye(taxablePay);
  const personalRelief = PERSONAL_RELIEF;
  const paye = Math.max(0, payeBeforeRelief - personalRelief);

  const netPay = grossPay - nssf - shif - housingLevy - paye;

  return {
    grossPay,
    nssfTier1,
    nssfTier2,
    nssf,
    shif,
    housingLevy,
    taxablePay,
    payeBeforeRelief,
    personalRelief,
    paye,
    netPay
  };
}
