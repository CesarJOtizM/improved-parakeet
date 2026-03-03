import { emailLayout } from './emailLayout.template';

export interface LowStockItem {
  productId: string;
  productName?: string;
  warehouseId: string;
  warehouseName?: string;
  currentStock: number;
  minQuantity?: number;
  severity: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW';
}

export interface LowStockAlertTemplateVars {
  items: LowStockItem[];
  orgName?: string;
}

function severityColor(severity: string): { bg: string; text: string; label: string } {
  switch (severity) {
    case 'OUT_OF_STOCK':
      return { bg: '#fef2f2', text: '#dc2626', label: 'Out of Stock' };
    case 'CRITICAL':
      return { bg: '#fff7ed', text: '#ea580c', label: 'Critical' };
    case 'LOW':
      return { bg: '#fefce8', text: '#ca8a04', label: 'Low' };
    default:
      return { bg: '#f8fafc', text: '#64748b', label: severity };
  }
}

export function lowStockAlertTemplate(vars: LowStockAlertTemplateVars): string {
  const rows = vars.items
    .map(item => {
      const s = severityColor(item.severity);
      return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${item.productName || item.productId}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${item.warehouseName || item.warehouseId}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;text-align:center;">${item.currentStock}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;text-align:center;">${item.minQuantity ?? '-'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
        <span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;border-radius:9999px;background-color:${s.bg};color:${s.text};">${s.label}</span>
      </td>
    </tr>`;
    })
    .join('');

  const content = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">Low Stock Alert</h2>
<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
  The following products require attention due to low stock levels${vars.orgName ? ` in <strong>${vars.orgName}</strong>` : ''}:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
<tr style="background-color:#f1f5f9;">
  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">Product</th>
  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">Warehouse</th>
  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">Stock</th>
  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">Min Qty</th>
  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">Severity</th>
</tr>
${rows}
</table>
<p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
  Review and restock these items to avoid fulfillment issues.
</p>`;

  return emailLayout(
    {
      title: 'Low Stock Alert - Nevada Inventory',
      preheader: `${vars.items.length} product(s) need restocking`,
    },
    content
  );
}
