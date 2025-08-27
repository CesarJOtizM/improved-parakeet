-- Migration: Add Materialized Views for Inventory Optimization
-- Date: 2025-08-27
-- Description: Creates materialized views for inventory balance and low stock alerts

-- Create materialized view for inventory balance
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

-- Create materialized view for low stock alerts
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

-- Create indexes for materialized views
CREATE INDEX idx_v_inventory_balance_org_id ON v_inventory_balance(org_id);
CREATE INDEX idx_v_inventory_balance_product_id ON v_inventory_balance(product_id);
CREATE INDEX idx_v_inventory_balance_warehouse_id ON v_inventory_balance(warehouse_id);
CREATE INDEX idx_v_inventory_balance_sku ON v_inventory_balance(sku);
CREATE INDEX idx_v_inventory_balance_category ON v_inventory_balance(category);

CREATE INDEX idx_v_low_stock_org_id ON v_low_stock(org_id);
CREATE INDEX idx_v_low_stock_stock_status ON v_low_stock(stock_status);
CREATE INDEX idx_v_low_stock_warehouse_id ON v_low_stock(warehouse_id);
CREATE INDEX idx_v_low_stock_product_id ON v_low_stock(product_id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_inventory_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_inventory_balance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_low_stock;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for automatic refresh
CREATE OR REPLACE FUNCTION trigger_refresh_inventory_views()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule async refresh to avoid blocking
    PERFORM pg_notify('refresh_inventory_views', '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on stock table
CREATE TRIGGER stock_changed_trigger
    AFTER INSERT OR UPDATE OR DELETE ON stock
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_inventory_views();

-- Add additional performance indexes
CREATE INDEX idx_stock_org_id_quantity ON stock(org_id, quantity);
CREATE INDEX idx_stock_warehouse_quantity ON stock(warehouse_id, quantity);
CREATE INDEX idx_products_org_active ON products(org_id, is_active);
CREATE INDEX idx_warehouses_org_active ON warehouses(org_id, is_active);
CREATE INDEX idx_movements_org_status ON movements(org_id, status);
CREATE INDEX idx_movements_org_type ON movements(org_id, type);
CREATE INDEX idx_movement_lines_org_product ON movement_lines(org_id, product_id);
CREATE INDEX idx_movement_lines_org_movement ON movement_lines(org_id, movement_id);

-- Add check constraints for data integrity
ALTER TABLE stock ADD CONSTRAINT check_quantity_non_negative CHECK (quantity >= 0);
ALTER TABLE stock ADD CONSTRAINT check_unit_cost_positive CHECK (unit_cost > 0);
ALTER TABLE products ADD CONSTRAINT check_price_positive CHECK (price > 0);
ALTER TABLE movements ADD CONSTRAINT check_movement_type CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'));
ALTER TABLE movements ADD CONSTRAINT check_movement_status CHECK (status IN ('DRAFT', 'POSTED', 'VOIDED', 'CANCELLED'));
