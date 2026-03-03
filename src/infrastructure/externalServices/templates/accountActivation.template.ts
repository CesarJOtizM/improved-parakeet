import { emailLayout } from './emailLayout.template';

export interface AccountActivationTemplateVars {
  firstName: string;
  lastName: string;
  loginUrl: string;
}

export function accountActivationTemplate(vars: AccountActivationTemplateVars): string {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">Account Activated</h2>
<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
  Hi ${vars.firstName} ${vars.lastName}, great news! Your account has been activated by an administrator. You can now log in and start using Nevada Inventory.
</p>
<div style="text-align:center;margin:0 0 24px;">
  <a href="${vars.loginUrl}" style="display:inline-block;padding:12px 32px;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
    Log In Now
  </a>
</div>
<div style="padding:16px;background-color:#ecfdf5;border-radius:6px;border-left:4px solid #10b981;">
  <p style="margin:0;font-size:13px;color:#065f46;">
    Your account is now fully active. If you have any questions, don't hesitate to reach out to your administrator.
  </p>
</div>`;

  return emailLayout(
    {
      title: 'Account Activated - Nevada Inventory',
      preheader: 'Your account has been activated!',
    },
    content
  );
}
