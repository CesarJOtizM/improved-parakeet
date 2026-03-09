import { describe, expect, it } from '@jest/globals';

import {
  stockAlertDigestTemplate,
  type StockAlertDigestItem,
  type StockAlertDigestTemplateVars,
  type OverstockAlertDigestItem,
} from '@infrastructure/externalServices/templates/stockAlertDigest.template';

// ---------------------------------------------------------------------------
// Helpers – reusable factory functions for test data
// ---------------------------------------------------------------------------

function makeLowStockItem(overrides: Partial<StockAlertDigestItem> = {}): StockAlertDigestItem {
  return {
    productName: 'Widget A',
    sku: 'WA-001',
    warehouseName: 'Main Warehouse',
    currentStock: 3,
    threshold: 10,
    severity: 'LOW',
    ...overrides,
  };
}

function makeOverstockItem(
  overrides: Partial<OverstockAlertDigestItem> = {}
): OverstockAlertDigestItem {
  return {
    productName: 'Widget B',
    sku: 'WB-001',
    warehouseName: 'Main Warehouse',
    currentStock: 150,
    maxQuantity: 100,
    ...overrides,
  };
}

function makeTemplateVars(
  overrides: Partial<StockAlertDigestTemplateVars> = {}
): StockAlertDigestTemplateVars {
  return {
    orgName: 'Acme Corp',
    lowStockItems: [makeLowStockItem()],
    overstockItems: [makeOverstockItem()],
    generatedAt: new Date('2025-06-15T12:30:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stockAlertDigestTemplate', () => {
  // -----------------------------------------------------------------------
  // 1. Main template function with valid variables
  // -----------------------------------------------------------------------
  describe('Given: valid template variables', () => {
    it('When: rendering the template Then: should return a complete HTML document', () => {
      const vars = makeTemplateVars();

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
      expect(html).toContain('Nevada Inventory');
    });

    it('When: rendering the template Then: should include the organization name', () => {
      const vars = makeTemplateVars({ orgName: 'Test Organization' });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Test Organization');
    });

    it('When: rendering the template Then: should include the formatted timestamp', () => {
      const vars = makeTemplateVars({
        generatedAt: new Date('2025-06-15T12:30:00Z'),
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('2025-06-15 12:30:00 UTC');
    });

    it('When: rendering the template Then: should include the preheader with total alert count', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem(), makeLowStockItem({ sku: 'WA-002' })],
        overstockItems: [makeOverstockItem()],
      });

      const html = stockAlertDigestTemplate(vars);

      // 2 low stock + 1 overstock = 3 total
      expect(html).toContain('3');
    });
  });

  // -----------------------------------------------------------------------
  // 2. Severity handling – all severity levels
  // -----------------------------------------------------------------------
  describe('Given: items with different severity levels', () => {
    it('When: item has OUT_OF_STOCK severity Then: should display out-of-stock label', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem({ severity: 'OUT_OF_STOCK' })],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      // Default language is 'es'
      expect(html).toContain('Sin Stock');
    });

    it('When: item has CRITICAL severity Then: should display critical label', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem({ severity: 'CRITICAL' })],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Cr\u00edtico');
    });

    it('When: item has LOW severity Then: should display low label', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem({ severity: 'LOW' })],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Bajo');
    });
  });

  // -----------------------------------------------------------------------
  // 3. Color mapping – verify correct colors for each severity
  // -----------------------------------------------------------------------
  describe('Given: items with varying severity', () => {
    it('When: severity is OUT_OF_STOCK Then: should apply red color (#dc2626)', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem({ severity: 'OUT_OF_STOCK' })],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('#dc2626');
      expect(html).toContain('#fef2f2');
    });

    it('When: severity is CRITICAL Then: should apply orange color (#ea580c)', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem({ severity: 'CRITICAL' })],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('#ea580c');
      expect(html).toContain('#fff7ed');
    });

    it('When: severity is LOW Then: should apply yellow color (#ca8a04)', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem({ severity: 'LOW' })],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('#ca8a04');
      expect(html).toContain('#fefce8');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Sorting – items sorted by severity (OUT_OF_STOCK first)
  // -----------------------------------------------------------------------
  describe('Given: low stock items in random severity order', () => {
    it('When: rendering the low stock table Then: should sort by severity: OUT_OF_STOCK, CRITICAL, LOW', () => {
      const items: StockAlertDigestItem[] = [
        makeLowStockItem({ productName: 'Low Item', severity: 'LOW', sku: 'LOW-1' }),
        makeLowStockItem({ productName: 'OOS Item', severity: 'OUT_OF_STOCK', sku: 'OOS-1' }),
        makeLowStockItem({ productName: 'Critical Item', severity: 'CRITICAL', sku: 'CRIT-1' }),
      ];

      const vars = makeTemplateVars({
        lowStockItems: items,
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      // OUT_OF_STOCK should appear before CRITICAL, and CRITICAL before LOW
      const oosIndex = html.indexOf('OOS Item');
      const criticalIndex = html.indexOf('Critical Item');
      const lowIndex = html.indexOf('Low Item');

      expect(oosIndex).toBeLessThan(criticalIndex);
      expect(criticalIndex).toBeLessThan(lowIndex);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Summary banner – badge generation with different alert counts
  // -----------------------------------------------------------------------
  describe('Given: various combinations of alert counts', () => {
    it('When: there are alerts of all types Then: summary should show total count and all badges', () => {
      const vars = makeTemplateVars({
        lowStockItems: [
          makeLowStockItem({ severity: 'OUT_OF_STOCK', sku: 'A' }),
          makeLowStockItem({ severity: 'CRITICAL', sku: 'B' }),
          makeLowStockItem({ severity: 'LOW', sku: 'C' }),
        ],
        overstockItems: [makeOverstockItem()],
      });

      const html = stockAlertDigestTemplate(vars);

      // Total = 3 low stock + 1 overstock = 4
      expect(html).toContain('4');
      expect(html).toContain('alerta(s) detectada(s)');
      // All severity badges present (es locale)
      expect(html).toContain('Sin Stock');
      expect(html).toContain('Cr\u00edtico');
      expect(html).toContain('Stock Bajo');
      expect(html).toContain('Exceso');
    });

    it('When: only OUT_OF_STOCK items exist Then: should only show the OOS badge', () => {
      const vars = makeTemplateVars({
        lowStockItems: [
          makeLowStockItem({ severity: 'OUT_OF_STOCK', sku: 'A' }),
          makeLowStockItem({ severity: 'OUT_OF_STOCK', sku: 'B' }),
        ],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('2 Sin Stock');
      expect(html).toContain('2 alerta(s) detectada(s)');
    });

    it('When: only overstock items exist Then: should only show the overstock badge', () => {
      const vars = makeTemplateVars({
        lowStockItems: [],
        overstockItems: [makeOverstockItem(), makeOverstockItem({ sku: 'WB-002' })],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('2 Exceso');
      expect(html).toContain('2 alerta(s) detectada(s)');
    });
  });

  // -----------------------------------------------------------------------
  // 6. Low stock table – HTML table generation
  // -----------------------------------------------------------------------
  describe('Given: low stock items', () => {
    it('When: rendering Then: should produce a table with correct headers', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem()],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      // ES locale headers
      expect(html).toContain('Producto');
      expect(html).toContain('SKU');
      expect(html).toContain('Almac\u00e9n');
      expect(html).toContain('Stock');
      expect(html).toContain('Umbral');
      expect(html).toContain('Severidad');
    });

    it('When: rendering Then: should include product data in table rows', () => {
      const item = makeLowStockItem({
        productName: 'Fancy Gadget',
        sku: 'FG-100',
        warehouseName: 'North Warehouse',
        currentStock: 5,
        threshold: 20,
        severity: 'CRITICAL',
      });

      const vars = makeTemplateVars({
        lowStockItems: [item],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Fancy Gadget');
      expect(html).toContain('FG-100');
      expect(html).toContain('North Warehouse');
      expect(html).toContain('>5<');
      expect(html).toContain('>20<');
    });

    it('When: rendering Then: should include the low stock alerts section heading', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem()],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Alertas de Stock Bajo');
    });
  });

  // -----------------------------------------------------------------------
  // 7. Overstock table – HTML table generation
  // -----------------------------------------------------------------------
  describe('Given: overstock items', () => {
    it('When: rendering Then: should produce a table with correct headers', () => {
      const vars = makeTemplateVars({
        lowStockItems: [],
        overstockItems: [makeOverstockItem()],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Producto');
      expect(html).toContain('SKU');
      expect(html).toContain('Almac\u00e9n');
      expect(html).toContain('Stock');
      expect(html).toContain('Cant. M\u00e1x');
    });

    it('When: rendering Then: should include overstock product data in table rows', () => {
      const item = makeOverstockItem({
        productName: 'Bulk Item',
        sku: 'BI-200',
        warehouseName: 'South Warehouse',
        currentStock: 500,
        maxQuantity: 200,
      });

      const vars = makeTemplateVars({
        lowStockItems: [],
        overstockItems: [item],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Bulk Item');
      expect(html).toContain('BI-200');
      expect(html).toContain('South Warehouse');
      expect(html).toContain('>500<');
      expect(html).toContain('>200<');
    });

    it('When: rendering Then: should include the overstock alerts section heading', () => {
      const vars = makeTemplateVars({
        lowStockItems: [],
        overstockItems: [makeOverstockItem()],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Alertas de Exceso de Stock');
    });
  });

  // -----------------------------------------------------------------------
  // 8. Edge cases – empty arrays, minimal data
  // -----------------------------------------------------------------------
  describe('Given: edge-case inputs', () => {
    it('When: both lowStockItems and overstockItems are empty Then: should still render a valid HTML document', () => {
      const vars = makeTemplateVars({
        lowStockItems: [],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
      expect(html).toContain('0 alerta(s) detectada(s)');
    });

    it('When: both arrays are empty Then: should not render low stock table heading', () => {
      const vars = makeTemplateVars({
        lowStockItems: [],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).not.toContain('Alertas de Stock Bajo');
    });

    it('When: both arrays are empty Then: should not render overstock table heading', () => {
      const vars = makeTemplateVars({
        lowStockItems: [],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).not.toContain('Alertas de Exceso de Stock');
    });

    it('When: lowStockItems is empty but overstockItems has items Then: should only render overstock table', () => {
      const vars = makeTemplateVars({
        lowStockItems: [],
        overstockItems: [makeOverstockItem()],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).not.toContain('Alertas de Stock Bajo');
      expect(html).toContain('Alertas de Exceso de Stock');
    });

    it('When: overstockItems is empty but lowStockItems has items Then: should only render low stock table', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem()],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Alertas de Stock Bajo');
      expect(html).not.toContain('Alertas de Exceso de Stock');
    });

    it('When: currentStock is zero Then: should render zero in the cell', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem({ currentStock: 0, severity: 'OUT_OF_STOCK' })],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('>0<');
    });

    it('When: many items are provided Then: should render all items', () => {
      const lowStockItems = Array.from({ length: 10 }, (_, i) =>
        makeLowStockItem({ sku: `SKU-${i}`, productName: `Product ${i}` })
      );

      const vars = makeTemplateVars({
        lowStockItems,
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      for (let i = 0; i < 10; i++) {
        expect(html).toContain(`Product ${i}`);
        expect(html).toContain(`SKU-${i}`);
      }
    });
  });

  // -----------------------------------------------------------------------
  // 9. Multilingual – test with ES and EN locales
  // -----------------------------------------------------------------------
  describe('Given: different language settings', () => {
    it('When: language is "es" (default) Then: should use Spanish translations', () => {
      const vars = makeTemplateVars({ language: 'es' });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Resumen de Alertas de Stock');
      expect(html).toContain('Se detectaron las siguientes alertas de stock para');
      expect(html).toContain('Generado el');
      expect(html).toContain('Todos los derechos reservados.');
    });

    it('When: language is "en" Then: should use English translations', () => {
      const vars = makeTemplateVars({ language: 'en' });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Stock Alert Digest');
      expect(html).toContain('The following stock alerts were detected for');
      expect(html).toContain('Generated at');
      expect(html).toContain('All rights reserved.');
    });

    it('When: language is not specified Then: should default to Spanish', () => {
      const vars = makeTemplateVars();
      delete vars.language;

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Resumen de Alertas de Stock');
    });

    it('When: language is "en" Then: severity labels should be in English', () => {
      const vars = makeTemplateVars({
        language: 'en',
        lowStockItems: [
          makeLowStockItem({ severity: 'OUT_OF_STOCK', sku: 'A' }),
          makeLowStockItem({ severity: 'CRITICAL', sku: 'B' }),
          makeLowStockItem({ severity: 'LOW', sku: 'C' }),
        ],
        overstockItems: [makeOverstockItem()],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Out of Stock');
      expect(html).toContain('Critical');
      expect(html).toContain('Low Stock');
      expect(html).toContain('Overstock');
    });

    it('When: language is "en" Then: table headers should be in English', () => {
      const vars = makeTemplateVars({ language: 'en' });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Product');
      expect(html).toContain('Warehouse');
      expect(html).toContain('Threshold');
      expect(html).toContain('Severity');
      expect(html).toContain('Max Qty');
    });

    it('When: language is "en" Then: section headings should be in English', () => {
      const vars = makeTemplateVars({ language: 'en' });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('Low Stock Alerts');
      expect(html).toContain('Overstock Alerts');
    });
  });

  // -----------------------------------------------------------------------
  // 10. HTML output – structural validation
  // -----------------------------------------------------------------------
  describe('Given: any valid input', () => {
    it('When: rendering Then: output should contain proper HTML structure', () => {
      const vars = makeTemplateVars();

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<body');
      expect(html).toContain('</body>');
      expect(html).toContain('</html>');
    });

    it('When: rendering Then: should contain a <title> tag with the digest title', () => {
      const vars = makeTemplateVars({ language: 'en' });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('<title>Stock Alert Digest - Nevada Inventory</title>');
    });

    it('When: rendering Then: should contain meta charset utf-8', () => {
      const vars = makeTemplateVars();

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('<meta charset="utf-8">');
    });

    it('When: rendering the low stock table Then: should use <table> elements with role="presentation"', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem()],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('role="presentation"');
      expect(html).toContain('<table');
      expect(html).toContain('<tr');
      expect(html).toContain('<td');
      expect(html).toContain('<th');
    });

    it('When: rendering Then: severity badges should use inline-block span elements with border-radius', () => {
      const vars = makeTemplateVars({
        lowStockItems: [makeLowStockItem({ severity: 'CRITICAL' })],
        overstockItems: [],
      });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('display:inline-block');
      expect(html).toContain('border-radius:9999px');
    });

    it('When: rendering Then: should contain a hidden preheader span for email clients', () => {
      const vars = makeTemplateVars({ language: 'en' });

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('display:none');
      expect(html).toContain('stock alert(s) require attention');
    });

    it('When: rendering Then: should include email layout footer with support link', () => {
      const vars = makeTemplateVars();

      const html = stockAlertDigestTemplate(vars);

      expect(html).toContain('support@nevadainventory.com');
    });
  });
});
