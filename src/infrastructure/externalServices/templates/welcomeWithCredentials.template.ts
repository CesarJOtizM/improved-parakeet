import { emailLayout } from './emailLayout.template';

export interface WelcomeWithCredentialsTemplateVars {
  firstName: string;
  lastName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

export function welcomeWithCredentialsTemplate(vars: WelcomeWithCredentialsTemplateVars): string {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">Welcome to Nevada Inventory!</h2>
<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
  Hi ${vars.firstName} ${vars.lastName}, an administrator has created an account for you. Below are your temporary login credentials.
</p>

<div style="padding:20px;background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin:0 0 24px;">
  <p style="margin:0 0 12px;font-size:14px;color:#64748b;font-weight:600;">Your credentials</p>
  <p style="margin:0 0 8px;font-size:14px;color:#1e293b;">
    <strong>Email:</strong> ${vars.email}
  </p>
  <p style="margin:0;font-size:14px;color:#1e293b;">
    <strong>Temporary password:</strong>
  </p>
  <div style="margin:8px 0 0;padding:12px 16px;background-color:#ffffff;border:2px dashed #cbd5e1;border-radius:6px;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;color:#1e293b;letter-spacing:0.5px;">
    ${vars.temporaryPassword}
  </div>
</div>

<div style="padding:12px 16px;background-color:#fef3c7;border-radius:6px;border-left:4px solid #f59e0b;margin:0 0 24px;">
  <p style="margin:0;font-size:13px;color:#92400e;">
    <strong>Important:</strong> You must change this password on your first login. This temporary password will not be sent again.
  </p>
</div>

<div style="text-align:center;margin:0 0 24px;">
  <a href="${vars.loginUrl}" style="display:inline-block;padding:12px 32px;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
    Log In Now
  </a>
</div>

<p style="margin:0;font-size:13px;color:#94a3b8;">If you did not expect this email, please contact your administrator.</p>`;

  return emailLayout(
    {
      title: 'Welcome to Nevada Inventory - Your Account Credentials',
      preheader: `Welcome ${vars.firstName}! Your account credentials are inside.`,
    },
    content
  );
}
