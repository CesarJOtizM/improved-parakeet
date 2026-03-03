import { emailLayout } from './emailLayout.template';

export interface AccountDeactivationTemplateVars {
  firstName: string;
  lastName: string;
  reason?: string;
}

export function accountDeactivationTemplate(vars: AccountDeactivationTemplateVars): string {
  const reasonBlock = vars.reason
    ? `
<div style="padding:12px 16px;background-color:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;margin:0 0 24px;">
  <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Reason</p>
  <p style="margin:0;font-size:14px;color:#1e293b;">${vars.reason}</p>
</div>`
    : '';

  const content = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">Account Deactivated</h2>
<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
  Hi ${vars.firstName} ${vars.lastName}, your account on Nevada Inventory has been deactivated by an administrator.
</p>
${reasonBlock}
<div style="padding:12px 16px;background-color:#fef2f2;border-radius:6px;border-left:4px solid #ef4444;margin:0 0 24px;">
  <p style="margin:0;font-size:13px;color:#991b1b;">
    You will no longer be able to log in. If you believe this is an error, please contact your administrator to have your account reactivated.
  </p>
</div>

<p style="margin:0;font-size:13px;color:#94a3b8;">This is an automated notification. No action is required on your part.</p>`;

  return emailLayout(
    {
      title: 'Account Deactivated - Nevada Inventory',
      preheader: 'Your Nevada Inventory account has been deactivated.',
    },
    content
  );
}
