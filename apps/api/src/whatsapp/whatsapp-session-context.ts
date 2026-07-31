export interface ReportPeriodSelection {
  from: string;
  to: string;
  label: string;
}

export interface PendingInvoiceRequest {
  customerName?: string;
  customerKraPin?: string | null;
  itemDescription?: string;
  amount?: number;
}

export interface WhatsAppSessionContext {
  activeBusinessId?: string;
  pendingFlow?: "reports" | "taxes" | "invoices" | "receipts" | "payroll" | "documents";
  currentReportPeriod?: ReportPeriodSelection;
  recentRequests?: string[];
  pendingInvoiceRequest?: PendingInvoiceRequest;
}

export function pushRecentRequest(context: WhatsAppSessionContext, request: string): WhatsAppSessionContext {
  const recentRequests = [request, ...(context.recentRequests ?? [])].slice(0, 5);
  return { ...context, recentRequests };
}
