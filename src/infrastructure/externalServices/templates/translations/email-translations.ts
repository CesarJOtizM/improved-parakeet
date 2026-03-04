export type EmailLanguage = 'en' | 'es';

interface LayoutTranslations {
  allRightsReserved: string;
  needHelp: string;
}

interface DigestTranslations {
  title: string;
  description: string;
  alertsDetected: string;
  generatedAt: string;
  lowStockAlerts: string;
  overstockAlerts: string;
  headerProduct: string;
  headerSku: string;
  headerWarehouse: string;
  headerStock: string;
  headerThreshold: string;
  headerSeverity: string;
  headerMaxQty: string;
  severityOutOfStock: string;
  severityCritical: string;
  severityLow: string;
  severityOverstock: string;
  severityLowStock: string;
  subjectCritical: string;
  subjectNormal: string;
  preheader: string;
}

interface EmailTranslationSet {
  layout: LayoutTranslations;
  digest: DigestTranslations;
}

const translations: Record<EmailLanguage, EmailTranslationSet> = {
  en: {
    layout: {
      allRightsReserved: 'All rights reserved.',
      needHelp: 'Need help? Contact',
    },
    digest: {
      title: 'Stock Alert Digest',
      description: 'The following stock alerts were detected for',
      alertsDetected: 'alert(s) detected',
      generatedAt: 'Generated at',
      lowStockAlerts: 'Low Stock Alerts',
      overstockAlerts: 'Overstock Alerts',
      headerProduct: 'Product',
      headerSku: 'SKU',
      headerWarehouse: 'Warehouse',
      headerStock: 'Stock',
      headerThreshold: 'Threshold',
      headerSeverity: 'Severity',
      headerMaxQty: 'Max Qty',
      severityOutOfStock: 'Out of Stock',
      severityCritical: 'Critical',
      severityLow: 'Low',
      severityOverstock: 'Overstock',
      severityLowStock: 'Low Stock',
      subjectCritical: 'CRITICAL: Stock Alert Digest',
      subjectNormal: 'Stock Alert Digest',
      preheader: 'stock alert(s) require attention',
    },
  },
  es: {
    layout: {
      allRightsReserved: 'Todos los derechos reservados.',
      needHelp: '¿Necesitas ayuda? Contacta a',
    },
    digest: {
      title: 'Resumen de Alertas de Stock',
      description: 'Se detectaron las siguientes alertas de stock para',
      alertsDetected: 'alerta(s) detectada(s)',
      generatedAt: 'Generado el',
      lowStockAlerts: 'Alertas de Stock Bajo',
      overstockAlerts: 'Alertas de Exceso de Stock',
      headerProduct: 'Producto',
      headerSku: 'SKU',
      headerWarehouse: 'Almacén',
      headerStock: 'Stock',
      headerThreshold: 'Umbral',
      headerSeverity: 'Severidad',
      headerMaxQty: 'Cant. Máx',
      severityOutOfStock: 'Sin Stock',
      severityCritical: 'Crítico',
      severityLow: 'Bajo',
      severityOverstock: 'Exceso',
      severityLowStock: 'Stock Bajo',
      subjectCritical: 'CRÍTICO: Resumen de Alertas de Stock',
      subjectNormal: 'Resumen de Alertas de Stock',
      preheader: 'alerta(s) de stock requieren atención',
    },
  },
};

type Section = keyof EmailTranslationSet;
type KeyOf<S extends Section> = keyof EmailTranslationSet[S];

/**
 * Get a translated string for email templates.
 * Falls back to 'es' if the language is not supported.
 */
export function t<S extends Section>(lang: EmailLanguage, section: S, key: KeyOf<S>): string {
  const dict = translations[lang] ?? translations.es;
  return dict[section][key] as string;
}
