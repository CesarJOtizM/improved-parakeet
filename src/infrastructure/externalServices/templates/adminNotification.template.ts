import { emailLayout } from './emailLayout.template';

export interface AdminNotificationTemplateVars {
  newUserEmail: string;
  firstName: string;
  lastName: string;
  activationUrl: string;
}

export function adminNotificationTemplate(vars: AdminNotificationTemplateVars): string {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">New User Registration</h2>
<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
  A new user has registered and requires activation:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f8fafc;border-radius:6px;padding:16px;">
<tr><td style="padding:16px;">
  <p style="margin:0 0 8px;font-size:14px;color:#64748b;"><strong>Name:</strong> ${vars.firstName} ${vars.lastName}</p>
  <p style="margin:0;font-size:14px;color:#64748b;"><strong>Email:</strong> ${vars.newUserEmail}</p>
</td></tr>
</table>
<div style="text-align:center;margin:0 0 24px;">
  <a href="${vars.activationUrl}" style="display:inline-block;padding:12px 32px;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
    Review &amp; Activate User
  </a>
</div>`;

  return emailLayout(
    {
      title: 'New User Registration - Nevada Inventory',
      preheader: `New registration: ${vars.firstName} ${vars.lastName}`,
    },
    content
  );
}
