-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "business_members_businessId_idx" ON "business_members"("businessId");

-- CreateIndex
CREATE INDEX "business_requests_requestedByUserId_idx" ON "business_requests"("requestedByUserId");

-- CreateIndex
CREATE INDEX "documents_businessId_createdAt_idx" ON "documents"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "documents_periodId_idx" ON "documents"("periodId");

-- CreateIndex
CREATE INDEX "employee_documents_employeeId_idx" ON "employee_documents"("employeeId");

-- CreateIndex
CREATE INDEX "financial_reports_periodId_idx" ON "financial_reports"("periodId");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_requests_businessId_idx" ON "invoice_requests"("businessId");

-- CreateIndex
CREATE INDEX "invoices_businessId_createdAt_idx" ON "invoices"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "invoices_createdById_idx" ON "invoices"("createdById");

-- CreateIndex
CREATE INDEX "knowledge_base_chunks_businessId_idx" ON "knowledge_base_chunks"("businessId");

-- CreateIndex
CREATE INDEX "knowledge_base_chunks_sourceType_sourceRef_idx" ON "knowledge_base_chunks"("sourceType", "sourceRef");

-- CreateIndex
CREATE INDEX "notifications_businessId_readAt_idx" ON "notifications"("businessId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "payroll_runs_businessId_idx" ON "payroll_runs"("businessId");

-- CreateIndex
CREATE INDEX "payslips_payrollRunId_idx" ON "payslips"("payrollRunId");

-- CreateIndex
CREATE INDEX "payslips_employeeId_idx" ON "payslips"("employeeId");

-- CreateIndex
CREATE INDEX "receipts_businessId_idx" ON "receipts"("businessId");

-- CreateIndex
CREATE INDEX "report_periods_businessId_idx" ON "report_periods"("businessId");

-- CreateIndex
CREATE INDEX "sale_line_items_saleId_idx" ON "sale_line_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_line_items_productId_idx" ON "sale_line_items"("productId");

-- CreateIndex
CREATE INDEX "sales_businessId_createdAt_idx" ON "sales"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "staff_business_assignments_businessId_idx" ON "staff_business_assignments"("businessId");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");

-- CreateIndex
CREATE INDEX "sync_logs_businessId_startedAt_idx" ON "sync_logs"("businessId", "startedAt");

-- CreateIndex
CREATE INDEX "tax_records_businessId_idx" ON "tax_records"("businessId");

-- CreateIndex
CREATE INDEX "tax_records_periodId_idx" ON "tax_records"("periodId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_activeBusinessId_idx" ON "whatsapp_sessions"("activeBusinessId");
