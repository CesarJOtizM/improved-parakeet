export interface EmailLayoutOptions {
  title: string;
  preheader?: string;
}

export function emailLayout(options: EmailLayoutOptions, content: string): string {
  const { title, preheader } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title}</title>
${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
<style>
  body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#1e293b,#334155);padding:24px 32px;text-align:center;">
<h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.025em;">Nevada Inventory</h1>
</td>
</tr>

<!-- Content -->
<tr>
<td style="padding:32px;">
${content}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} Nevada Inventory. All rights reserved.</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">Need help? Contact <a href="mailto:support@nevadainventory.com" style="color:#6366f1;text-decoration:none;">support@nevadainventory.com</a></p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
