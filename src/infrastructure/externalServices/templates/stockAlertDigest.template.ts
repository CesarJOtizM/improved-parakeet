import { emailLayout } from './emailLayout.template';
import { type EmailLanguage, t } from './translations/email-translations';

export interface StockAlertDigestItem {
  productName: string;
  sku: string;
  warehouseName: string;
  currentStock: number;
  threshold: number;
  severity: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW';
}

export interface OverstockAlertDigestItem {
  productName: string;
  sku: string;
  warehouseName: string;
  currentStock: number;
  maxQuantity: number;
}

export interface StockAlertDigestTemplateVars {
  orgName: string;
  lowStockItems: StockAlertDigestItem[];
  overstockItems: OverstockAlertDigestItem[];
  generatedAt: Date;
  language?: EmailLanguage;
}

function severityColor(
  severity: string,
  lang: EmailLanguage
): { bg: string; text: string; label: string } {
  switch (severity) {
    case 'OUT_OF_STOCK':
      return { bg: '#fef2f2', text: '#dc2626', label: t(lang, 'digest', 'severityOutOfStock') };
    case 'CRITICAL':
      return { bg: '#fff7ed', text: '#ea580c', label: t(lang, 'digest', 'severityCritical') };
    case 'LOW':
      return { bg: '#fefce8', text: '#ca8a04', label: t(lang, 'digest', 'severityLow') };
    default:
      return { bg: '#f8fafc', text: '#64748b', label: severity };
  }
}

function severityOrder(severity: string): number {
  switch (severity) {
    case 'OUT_OF_STOCK':
      return 0;
    case 'CRITICAL':
      return 1;
    case 'LOW':
      return 2;
    default:
      return 3;
  }
}

function buildSummaryBanner(
  lowStockItems: StockAlertDigestItem[],
  overstockItems: OverstockAlertDigestItem[],
  lang: EmailLanguage
): string {
  const counts: { label: string; count: number; bg: string; text: string }[] = [];

  const outOfStock = lowStockItems.filter(i => i.severity === 'OUT_OF_STOCK').length;
  const critical = lowStockItems.filter(i => i.severity === 'CRITICAL').length;
  const low = lowStockItems.filter(i => i.severity === 'LOW').length;
  const overstock = overstockItems.length;

  if (outOfStock > 0)
    counts.push({
      label: t(lang, 'digest', 'severityOutOfStock'),
      count: outOfStock,
      bg: '#fef2f2',
      text: '#dc2626',
    });
  if (critical > 0)
    counts.push({
      label: t(lang, 'digest', 'severityCritical'),
      count: critical,
      bg: '#fff7ed',
      text: '#ea580c',
    });
  if (low > 0)
    counts.push({
      label: t(lang, 'digest', 'severityLowStock'),
      count: low,
      bg: '#fefce8',
      text: '#ca8a04',
    });
  if (overstock > 0)
    counts.push({
      label: t(lang, 'digest', 'severityOverstock'),
      count: overstock,
      bg: '#eff6ff',
      text: '#2563eb',
    });

  const badges = counts
    .map(
      c =>
        `<span style="display:inline-block;padding:4px 12px;margin:0 4px 4px 0;font-size:13px;font-weight:600;border-radius:9999px;background-color:${c.bg};color:${c.text};">${c.count} ${c.label}</span>`
    )
    .join('');

  const total = lowStockItems.length + overstockItems.length;

  return `
<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
  <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#334155;">${total} ${t(lang, 'digest', 'alertsDetected')}</p>
  <div>${badges}</div>
</div>`;
}

function buildLowStockTable(items: StockAlertDigestItem[], lang: EmailLanguage): string {
  if (items.length === 0) return '';

  const sorted = [...items].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));

  const rows = sorted
    .map(item => {
      const s = severityColor(item.severity, lang);
      return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${item.productName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;">${item.sku}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${item.warehouseName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;text-align:center;">${item.currentStock}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;text-align:center;">${item.threshold}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
        <span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;border-radius:9999px;background-color:${s.bg};color:${s.text};">${s.label}</span>
      </td>
    </tr>`;
    })
    .join('');

  return `
<h3 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1e293b;">${t(lang, 'digest', 'lowStockAlerts')}</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
<tr style="background-color:#f1f5f9;">
  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerProduct')}</th>
  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerSku')}</th>
  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerWarehouse')}</th>
  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerStock')}</th>
  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerThreshold')}</th>
  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerSeverity')}</th>
</tr>
${rows}
</table>`;
}

function buildOverstockTable(items: OverstockAlertDigestItem[], lang: EmailLanguage): string {
  if (items.length === 0) return '';

  const rows = items
    .map(
      item => `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${item.productName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;">${item.sku}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${item.warehouseName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;text-align:center;">${item.currentStock}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;text-align:center;">${item.maxQuantity}</td>
    </tr>`
    )
    .join('');

  return `
<h3 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1e293b;">${t(lang, 'digest', 'overstockAlerts')}</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
<tr style="background-color:#f1f5f9;">
  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerProduct')}</th>
  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerSku')}</th>
  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerWarehouse')}</th>
  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerStock')}</th>
  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t(lang, 'digest', 'headerMaxQty')}</th>
</tr>
${rows}
</table>`;
}

export function stockAlertDigestTemplate(vars: StockAlertDigestTemplateVars): string {
  const lang: EmailLanguage = vars.language ?? 'es';
  const totalAlerts = vars.lowStockItems.length + vars.overstockItems.length;
  const timestamp = vars.generatedAt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const content = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">${t(lang, 'digest', 'title')}</h2>
<p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
  ${t(lang, 'digest', 'description')} <strong>${vars.orgName}</strong>:
</p>
${buildSummaryBanner(vars.lowStockItems, vars.overstockItems, lang)}
${buildLowStockTable(vars.lowStockItems, lang)}
${buildOverstockTable(vars.overstockItems, lang)}
<p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
  ${t(lang, 'digest', 'generatedAt')} ${timestamp}
</p>`;

  return emailLayout(
    {
      title: `${t(lang, 'digest', 'title')} - Nevada Inventory`,
      preheader: `${totalAlerts} ${t(lang, 'digest', 'preheader')}`,
      language: lang,
    },
    content
  );
}
