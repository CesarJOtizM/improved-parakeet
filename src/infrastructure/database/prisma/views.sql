-- Vistas Materializadas para el Sistema de Inventarios
-- Estas vistas optimizan las consultas frecuentes de inventario

-- Vista materializada para saldos de inventario
CREATE MATERIALIZED VIEW v_inventory_balance AS
SELECT 
    s.product_id,
    s.warehouse_id,
    s.org_id,
    p.sku,
    p.name as product_name,
    p.category,
    p.unit,
    w.code as warehouse_code,
    w.name as warehouse_name,
    s.quantity,
    s.unit_cost,
    (s.quantity * s.unit_cost) as total_value,
    p.is_active as product_active,
    w.is_active as warehouse_active,
    s.updated_at as last_stock_update
FROM stock s
JOIN products p ON s.product_id = p.id
JOIN warehouses w ON s.warehouse_id = w.id
WHERE s.org_id = p.org_id 
  AND s.org_id = w.org_id
  AND p.is_active = true 
  AND w.is_active = true;

-- Vista materializada para productos con stock bajo
CREATE MATERIALIZED VIEW v_low_stock AS
SELECT 
    s.product_id,
    s.warehouse_id,
    s.org_id,
    p.sku,
    p.name as product_name,
    p.category,
    p.unit,
    w.code as warehouse_code,
    w.name as warehouse_name,
    s.quantity,
    s.unit_cost,
    (s.quantity * s.unit_cost) as total_value,
    CASE 
        WHEN s.quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN s.quantity <= 5 THEN 'CRITICAL'
        WHEN s.quantity <= 10 THEN 'LOW'
        ELSE 'NORMAL'
    END as stock_status,
    s.updated_at as last_stock_update
FROM stock s
JOIN products p ON s.product_id = p.id
JOIN warehouses w ON s.warehouse_id = w.id
WHERE s.org_id = p.org_id 
  AND s.org_id = w.org_id
  AND p.is_active = true 
  AND w.is_active = true
  AND s.quantity <= 10;

-- Índices para optimizar las vistas materializadas
CREATE INDEX idx_v_inventory_balance_org_id ON v_inventory_balance(org_id);
CREATE INDEX idx_v_inventory_balance_product_id ON v_inventory_balance(product_id);
CREATE INDEX idx_v_inventory_balance_warehouse_id ON v_inventory_balance(warehouse_id);
CREATE INDEX idx_v_inventory_balance_sku ON v_inventory_balance(sku);
CREATE INDEX idx_v_inventory_balance_category ON v_inventory_balance(category);

CREATE INDEX idx_v_low_stock_org_id ON v_low_stock(org_id);
CREATE INDEX idx_v_low_stock_stock_status ON v_low_stock(stock_status);
CREATE INDEX idx_v_low_stock_warehouse_id ON v_low_stock(warehouse_id);
CREATE INDEX idx_v_low_stock_product_id ON v_low_stock(product_id);

-- Función para refrescar las vistas materializadas
CREATE OR REPLACE FUNCTION refresh_inventory_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_inventory_balance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_low_stock;
END;
$$ LANGUAGE plpgsql;

-- Trigger para refrescar vistas cuando cambie el stock
CREATE OR REPLACE FUNCTION trigger_refresh_inventory_views()
RETURNS TRIGGER AS $$
BEGIN
    -- Programar refresco asíncrono para evitar bloqueos
    PERFORM pg_notify('refresh_inventory_views', '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_changed_trigger
    AFTER INSERT OR UPDATE OR DELETE ON stock
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_inventory_views();
