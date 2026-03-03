import { emailLayout } from './emailLayout.template';

export interface WelcomeTemplateVars {
  firstName: string;
  lastName: string;
  email: string;
  loginUrl: string;
}

export function welcomeTemplate(vars: WelcomeTemplateVars): string {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">Welcome to Nevada Inventory!</h2>
<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
  Hi ${vars.firstName} ${vars.lastName}, your account has been created successfully. You're all set to start managing your inventory.
</p>
<div style="text-align:center;margin:0 0 24px;">
  <a href="${vars.loginUrl}" style="display:inline-block;padding:12px 32px;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
    Get Started
  </a>
</div>
<p style="margin:0 0 8px;font-size:14px;color:#64748b;font-weight:600;">Quick tips to get started:</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#64748b;line-height:1.8;">
  <li>Set up your warehouses and categories</li>
  <li>Add your first products</li>
  <li>Track stock movements in real time</li>
</ul>
<p style="margin:0;font-size:13px;color:#94a3b8;">Your login email: <strong>${vars.email}</strong></p>`;

  return emailLayout(
    {
      title: 'Welcome to Nevada Inventory',
      preheader: `Welcome ${vars.firstName}! Your account is ready.`,
    },
    content
  );
}
