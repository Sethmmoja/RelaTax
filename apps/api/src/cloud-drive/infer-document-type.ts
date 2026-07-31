import { DocumentCategory, ReportType } from "@relatax/types";

/**
 * Best-effort mapping of an imported file's name to a category/report type.
 * Falls back to a generic category — an admin can always re-categorize later.
 */
export function inferDocumentType(fileName: string): { category: DocumentCategory; reportType?: ReportType } {
  const name = fileName.toLowerCase();

  // Supporting docs first — a "bank statement" contains "statement" but isn't a financial statement.
  if (name.includes("bank") || name.includes("mpesa") || name.includes("m-pesa"))
    return { category: DocumentCategory.SUPPORTING };
  if (name.includes("vat")) return { category: DocumentCategory.TAX_REPORT, reportType: ReportType.VAT };
  if (name.includes("paye")) return { category: DocumentCategory.TAX_REPORT, reportType: ReportType.PAYE };
  if (name.includes("corporation") || name.includes("corp tax") || name.includes("corp-tax"))
    return { category: DocumentCategory.TAX_REPORT, reportType: ReportType.CORPORATION_TAX };
  if (name.includes("profit") || name.includes("p&l") || name.includes("p-and-l") || name.includes("income statement"))
    return { category: DocumentCategory.FINANCIAL_STATEMENT, reportType: ReportType.PROFIT_AND_LOSS };
  if (name.includes("balance")) return { category: DocumentCategory.FINANCIAL_STATEMENT, reportType: ReportType.BALANCE_SHEET };
  if (name.includes("cash flow") || name.includes("cashflow") || name.includes("cash-flow"))
    return { category: DocumentCategory.FINANCIAL_STATEMENT, reportType: ReportType.CASH_FLOW };
  if (name.includes("trial balance") || name.includes("trial-balance"))
    return { category: DocumentCategory.FINANCIAL_STATEMENT, reportType: ReportType.TRIAL_BALANCE };
  if (name.includes("invoice")) return { category: DocumentCategory.INVOICE, reportType: ReportType.INVOICE };
  if (name.includes("receipt")) return { category: DocumentCategory.RECEIPT, reportType: ReportType.RECEIPT };
  if (name.includes("statement") || name.includes("financial")) return { category: DocumentCategory.FINANCIAL_STATEMENT };

  return { category: DocumentCategory.SUPPORTING };
}
