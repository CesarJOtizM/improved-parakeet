import { emailLayout } from './emailLayout.template';

export interface PasswordResetTemplateVars {
  firstName: string;
  lastName: string;
  otpCode: string;
  expiryMinutes: number;
}

export function passwordResetTemplate(vars: PasswordResetTemplateVars): string {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">Password Reset Request</h2>
<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
  Hi ${vars.firstName}, you requested a password reset for your account. Use the verification code below:
</p>
<div style="text-align:center;margin:0 0 24px;">
  <div style="display:inline-block;padding:16px 32px;background-color:#f1f5f9;border-radius:8px;border:2px dashed #cbd5e1;">
    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e293b;font-family:monospace;">${vars.otpCode}</span>
  </div>
</div>
<p style="margin:0 0 24px;font-size:14px;color:#64748b;text-align:center;">
  This code expires in <strong>${vars.expiryMinutes} minutes</strong>.
</p>
<div style="padding:16px;background-color:#fef3c7;border-radius:6px;border-left:4px solid #f59e0b;">
  <p style="margin:0;font-size:13px;color:#92400e;">
    <strong>Security notice:</strong> If you did not request this code, please ignore this email. Your account is safe.
  </p>
</div>`;

  return emailLayout(
    {
      title: 'Password Reset - Nevada Inventory',
      preheader: `Your verification code is ${vars.otpCode}`,
    },
    content
  );
}
