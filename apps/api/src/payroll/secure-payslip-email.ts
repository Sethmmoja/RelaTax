export interface SecurePayslipEmailData {
  employeeName: string;
  businessName: string;
  brandColor: string;
  periodLabel: string;
  generatedAt: Date;
}

/**
 * The payslip PDF itself is password-protected (userPassword = the
 * employee's National ID, set in PayslipPdfService.render) — this email just
 * explains that and attaches the file. Written from scratch for RelaTax
 * rather than reusing any third-party product's copy or branding.
 */
export function buildSecurePayslipEmail(data: SecurePayslipEmailData): { subject: string; html: string; text: string } {
  const subject = `Your payslip for ${data.periodLabel} — ${data.businessName}`;
  const generated = data.generatedAt.toLocaleString();

  const text = [
    `Hi ${data.employeeName},`,
    ``,
    `Your payslip for ${data.periodLabel} from ${data.businessName} is attached to this email as a PDF.`,
    ``,
    `The file is password-protected. Open it with your National ID number exactly as it appears in ${data.businessName}'s records.`,
    ``,
    `Keep this document and your National ID number confidential — don't forward this email or share the password with anyone else.`,
    ``,
    `If the password doesn't work, contact ${data.businessName} to confirm the National ID number on file for you.`,
    ``,
    `Generated ${generated} · Sent by RelaTax on behalf of ${data.businessName}.`
  ].join("\n");

  const html = `
<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f7f7f5; border: 1px solid #e5e5e0;">
  <div style="background: ${data.brandColor}; padding: 24px 32px;">
    <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Your Payslip Is Ready</p>
  </div>
  <div style="padding: 32px;">
    <p style="font-size: 14px; color: #222;">Hi <strong>${data.employeeName}</strong>,</p>
    <p style="font-size: 14px; color: #222;">
      Your payslip for <strong>${data.periodLabel}</strong> from <strong>${data.businessName}</strong> is attached to this email as a PDF.
    </p>

    <div style="margin: 20px 0; padding: 16px 20px; background: #fdf6e8; border: 1px solid #e8d9ad; border-radius: 6px;">
      <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #8a6d1d;">🔒 THIS PDF IS PASSWORD-PROTECTED</p>
      <p style="margin: 0; font-size: 13px; color: #6b5a2c;">
        Open it with your <strong>National ID number</strong>, entered exactly as it appears in ${data.businessName}'s records.
      </p>
    </div>

    <table style="width: 100%; font-size: 13px; color: #333; border-top: 3px solid ${data.brandColor}; padding-top: 12px;">
      <tr><td style="padding: 3px 0;">Pay period</td><td style="padding: 3px 0; text-align: right;">${data.periodLabel}</td></tr>
      <tr><td style="padding: 3px 0;">Format</td><td style="padding: 3px 0; text-align: right;">Password-protected PDF</td></tr>
      <tr><td style="padding: 3px 0;">Generated</td><td style="padding: 3px 0; text-align: right;">${generated}</td></tr>
    </table>

    <p style="font-size: 13px; color: #555; margin-top: 20px;">
      Please keep this document and your National ID number confidential — avoid forwarding this email or sharing the
      password with anyone else. If the password doesn't work, contact ${data.businessName} to confirm the National
      ID on file for you.
    </p>

    <p style="font-size: 11px; color: #999; margin-top: 28px;">
      Sent by RelaTax on behalf of ${data.businessName}. This is an automated message.
    </p>
  </div>
</div>`.trim();

  return { subject, html, text };
}
