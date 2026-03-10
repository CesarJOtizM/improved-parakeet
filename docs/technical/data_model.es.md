> [English](./data_model.md) | **[Español](./data_model.es.md)**

# Modelo de Datos

## 0) Principios de diseno

- **Multi-tenant:** todo pertenece a una `organizacion` (org_id).
- **Trazabilidad total:** todo movimiento genera rastro (usuario, fecha, origen, destino, motivo).
- **Normalizacion pragmatica:** catalogo unico de `productos`, `unidades`, `categorias` y `bodegas`.
- **Valorizacion:** costo por **Promedio Ponderado Movil** (PPM) por producto y bodega (defecto).
- **Integridad:** claves foraneas, restricciones de stock >= 0, SKU unico.
- **Auditoria:** tabla de auditoria con _before/after_ en JSON.
  ***

## 1) Entidades (diccionario de datos)

> Claves: id = UUID v4.
>
> Timestamps: `created_at`, `updated_at` (UTC).
>
> `org_id` presente en todas las tablas "de negocio".

### 1.1 Organizacion & Seguridad

- **organizations**: `id`, `name`, `tax_id`, `settings(jsonb)`, `timezone`, `currency`, `date_format`
- **organization_branding**: `id`, `org_id`, `logo_url`, `logo_alt_text`, `primary_color`, `secondary_color`, `accent_color`, `font_family`, `custom_css`
- **users**: `id`, `org_id`, `email(unico por org)`, `username(unico por org)`, `password_hash`, `name`, `status` (`ACTIVE`,`INACTIVE`,`LOCKED`), `last_login_at`, `failed_login_attempts`, `locked_until`
- **user_sessions**: `id`, `user_id`, `token_hash`, `refresh_token_hash`, `ip_address`, `user_agent`, `expires_at`, `created_at`
- **roles**: `id`, `org_id`, `name`, `description`, `is_system_role` (para roles predefinidos)
- **permissions**: `id`, `org_id`, `module` (`USERS`,`PRODUCTS`,`WAREHOUSES`,`MOVEMENTS`,`REPORTS`,`IMPORTS`,`SETTINGS`), `action` (`CREATE`,`READ`,`UPDATE`,`DELETE`,`POST`,`VOID`,`IMPORT`), `description`
- **user_roles**: `user_id`, `role_id` (PK compuesta)
- **role_permissions**: `role_id`, `permission_id` (PK compuesta)

### 1.2 Maestros

- **units**: `id`, `org_id`, `code` (ej. `UND`, `KG`), `name`, `precision` (decimales)
- **categories**: `id`, `org_id`, `name`, `parent_id(NULL)`
- **warehouses**: `id`, `org_id`, `code`, `name`, `address`
- **locations**: `id`, `org_id`, `warehouse_id`, `code`, `name`, `is_default`
- **products**: `id`, `org_id`, `sku(unico por org)`, `name`, `description`, `unit_id`,
  `barcode(NULL)`, `brand(NULL)`, `model(NULL)`, `status`
  `cost_method` ENUM(`AVG`=promedio, `FIFO`) -- _default `AVG`_
- **product_prices** _(opcional)_: `id`, `org_id`, `product_id`, `currency`, `price_type` (ej. `LIST`, `WHOLESALE`), `amount`
- **reorder_rules**: `id`, `org_id`, `product_id`, `warehouse_id`, `min_qty`, `max_qty`, `safety_qty`

### 1.3 Movimientos (Kardex)

- **movements** (encabezado): `id`, `org_id`, `type` ENUM(`IN`,`OUT`,`ADJUST_IN`,`ADJUST_OUT`,`TRANSFER_OUT`,`TRANSFER_IN`),
  `status` ENUM(`DRAFT`,`POSTED`,`VOID`), `warehouse_id`, `reference` (doc externo),
  `reason` ENUM(`PURCHASE`,`SALE`,`RETURN_SUPPLIER`,`RETURN_CUSTOMER`,`CONSUMPTION`,`CORRECTION`,`OTHER`),
  `note`, `posted_at`, `created_by`
- **movement_lines** (detalle): `id`, `org_id`, `movement_id`, `product_id`, `location_id`,
  `qty` (signo positivo SIEMPRE; el signo real lo determina `type`),
  `unit_cost` (afecta PPM solo en entradas), `currency`, `extra(jsonb)`
- **transfers** (flujo de bodega a bodega): `id`, `org_id`, `from_warehouse_id`, `to_warehouse_id`,
  `status` ENUM(`DRAFT`,`IN_TRANSIT`,`PARTIAL`,`RECEIVED`,`REJECTED`,`CANCELED`), `created_by`
- **transfer_lines**: `id`, `org_id`, `transfer_id`, `product_id`, `qty`, `from_location_id(NULL)`, `to_location_id(NULL)`
  - Al _postear_ la transferencia se generan dos movimientos enlazados: `TRANSFER_OUT` y `TRANSFER_IN` (cuando recibe).

### 1.4 Inventario calculado & auditoria

- **inventory_snapshots** _(opcional)_: `id`, `org_id`, `as_of_date`, `warehouse_id(NULL)`, `payload(jsonb)`
- **audit_log**: `id`, `org_id`, `entity`, `entity_id`, `action` (`CREATE|UPDATE|DELETE|POST|VOID|IMPORT`),
  `user_id`, `at`, `before(jsonb)`, `after(jsonb)`, `ip(NULL)`

### 1.5 Importaciones (Excel/CSV)

- **import_batches**: `id`, `org_id`, `type` (`PRODUCTS`,`STOCK_ADJUSTMENT`,`PRICES`), `status` (`RECEIVED`,`VALIDATED`,`APPLIED`,`FAILED`), `created_by`
- **import_rows**: `id`, `batch_id`, `row_number`, `raw(jsonb)`, `is_valid`, `errors(text[])`, `applied_at(NULL)`

### 1.6 Contactos

- **contacts**: `id`, `org_id`, `name`, `identification(unico por org)`, `type` ENUM(`CUSTOMER`, `SUPPLIER`, `OTHER`), `email(NULL)`, `phone(NULL)`, `address(NULL)`, `notes(NULL)`, `created_at`, `updated_at`
  - Los contactos representan clientes, proveedores u otras partes de negocio asociadas a ventas e integraciones.

### 1.7 Integraciones

- **integration_connections**: `id`, `org_id`, `provider` ENUM(`VTEX`), `account_name`, `store_name(NULL)`, `status` ENUM(`CONNECTED`, `DISCONNECTED`, `ERROR`), `sync_strategy` ENUM(`POLLING`, `WEBHOOK`, `BOTH`), `sync_direction` ENUM(`INBOUND`, `OUTBOUND`, `BIDIRECTIONAL`), `encrypted_app_key`, `encrypted_app_token`, `webhook_secret(NULL)`, `default_warehouse_id(NULL)`, `default_contact_id(NULL)`, `last_sync_at(NULL)`, `created_by`, `created_at`, `updated_at`
  - Almacena credenciales (encriptadas) y configuracion de cada conexion a plataforma externa.

- **integration_sku_mappings**: `id`, `org_id`, `connection_id`, `external_sku`, `product_id`, `created_at`, `updated_at`
  - Mapea SKUs externos (ej. IDs de producto VTEX) a IDs de producto internos.

- **integration_sync_logs**: `id`, `org_id`, `connection_id`, `external_order_id`, `action` ENUM(`SYNCED`, `FAILED`, `RETRYING`), `sale_id(NULL)`, `contact_id(NULL)`, `error_message(NULL)`, `raw_payload(jsonb, NULL)`, `processed_at(NULL)`, `created_at`, `updated_at`
  - Registra cada intento de sincronizacion con payload completo para depuracion y reintentos.

### 1.8 Personalizacion y Configuracion

- **organization_settings**: `id`, `org_id`, `key`, `value`, `type` (`STRING`,`NUMBER`,`BOOLEAN`,`JSON`), `description`
- **user_preferences**: `id`, `user_id`, `key`, `value`, `type` (`STRING`,`NUMBER`,`BOOLEAN`,`JSON`)
- **notification_settings**: `id`, `org_id`, `user_id(NULL)`, `type` (`EMAIL`,`SMS`,`PUSH`,`IN_APP`), `events` (array de eventos), `enabled`, `config(jsonb)`

---

## 2) Relaciones (ERD Mermaid)

```mermaid
erDiagram
  ORGANIZATIONS ||--o{ USERS : has
  ORGANIZATIONS ||--o{ ROLES : has
  ORGANIZATIONS ||--o{ ORGANIZATION_BRANDING : customizes
  ORGANIZATIONS ||--o{ ORGANIZATION_SETTINGS : configures
  ORGANIZATIONS ||--o{ NOTIFICATION_SETTINGS : notifies

  USERS }o--o{ ROLES : "USER_ROLES"
  USERS ||--o{ USER_SESSIONS : maintains
  USERS ||--o{ USER_PREFERENCES : configures
  USERS ||--o{ NOTIFICATION_SETTINGS : receives

  ROLES }o--o{ PERMISSIONS : "ROLE_PERMISSIONS"

  ORGANIZATIONS ||--o{ UNITS : has
  ORGANIZATIONS ||--o{ CATEGORIES : has
  ORGANIZATIONS ||--o{ WAREHOUSES : has
  WAREHOUSES ||--o{ LOCATIONS : has

  ORGANIZATIONS ||--o{ PRODUCTS : has
  CATEGORIES ||--o{ PRODUCTS : classifies
  UNITS ||--o{ PRODUCTS : measures

  PRODUCTS ||--o{ PRODUCT_PRICES : has
  PRODUCTS ||--o{ REORDER_RULES : "min/max por bodega"
  WAREHOUSES ||--o{ REORDER_RULES : rules

  WAREHOUSES ||--o{ MOVEMENTS : postsIn
  MOVEMENTS ||--o{ MOVEMENT_LINES : details
  PRODUCTS ||--o{ MOVEMENT_LINES : moves
  LOCATIONS ||--o{ MOVEMENT_LINES : affects
  USERS ||--o{ MOVEMENTS : createdBy

  TRANSFERS ||--o{ TRANSFER_LINES : has
  WAREHOUSES ||--o{ TRANSFERS : fromOrTo
  USERS ||--o{ TRANSFERS : createdBy

  ORGANIZATIONS ||--o{ IMPORT_BATCHES : has
  IMPORT_BATCHES ||--o{ IMPORT_ROWS : has

  ORGANIZATIONS ||--o{ AUDIT_LOG : writes
  USERS ||--o{ AUDIT_LOG : performs

  ORGANIZATIONS ||--o{ CONTACTS : has
  CONTACTS ||--o{ SALES : references

  ORGANIZATIONS ||--o{ INTEGRATION_CONNECTIONS : has
  INTEGRATION_CONNECTIONS ||--o{ INTEGRATION_SKU_MAPPINGS : has
  INTEGRATION_CONNECTIONS ||--o{ INTEGRATION_SYNC_LOGS : has
  PRODUCTS ||--o{ INTEGRATION_SKU_MAPPINGS : maps
  WAREHOUSES ||--o{ INTEGRATION_CONNECTIONS : defaultWarehouse
  CONTACTS ||--o{ INTEGRATION_CONNECTIONS : defaultContact

```

---

## 3) Estados de Transferencia

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> IN_TRANSIT: Confirmar despacho
  IN_TRANSIT --> RECEIVED: Confirmar recepcion total
  IN_TRANSIT --> PARTIAL: Recepcion parcial
  PARTIAL --> RECEIVED: Completar recepcion
  IN_TRANSIT --> REJECTED: Rechazar recepcion
  DRAFT --> CANCELED: Anular
  RECEIVED --> [*]
  REJECTED --> [*]
  CANCELED --> [*]

```

---

## 4) Reglas & validaciones clave

- **SKU unico** por organizacion.
- **Stock nunca negativo** al postear `OUT`/`TRANSFER_OUT`/`ADJUST_OUT`.
- **PPM**: `nuevo_cost = (existencias*ppm + entrada*unit_cost) / (existencias + entrada)` (por producto+bodega).
- **Transferencias**: solo se completan al pasar a `RECEIVED`.
- **Permisos**: operadores restringidos a su(s) bodega(s).
- **Autenticacion**: contrasenas con bcrypt (salt rounds: 12), JWT con expiracion configurable.
- **Sesiones**: blacklisting de tokens en logout, rate limiting por IP/usuario.

## 4.1) Roles Predefinidos del Sistema

### **Administrador (ADMIN)**

- Acceso total a todos los modulos
- Gestion de usuarios, roles y permisos
- Configuracion de organizacion y personalizacion
- Importaciones masivas y auditoria completa

### **Operador de Bodega (WAREHOUSE_OPERATOR)**

- Gestion de productos en bodegas asignadas
- Registro de entradas, salidas y transferencias
- Consulta de reportes basicos
- Importaciones si esta habilitado

### **Consultor/Auditor (CONSULTANT)**

- Solo lectura en todos los modulos
- Acceso a reportes y auditoria
- Sin capacidad de modificacion

### **Supervisor (SUPERVISOR)**

- Gestion de movimientos y transferencias
- Aprobacion de ajustes de inventario
- Reportes avanzados
- Sin gestion de usuarios

## 4.2) Modulos y Permisos

| Modulo     | CREATE               | READ  | UPDATE            | DELETE     | POST       | VOID       | IMPORT              |
| ---------- | -------------------- | ----- | ----------------- | ---------- | ---------- | ---------- | ------------------- |
| USERS      | ADMIN                | ALL   | ADMIN             | ADMIN      | -          | -          | -                   |
| PRODUCTS   | ADMIN, SUPERVISOR    | ALL   | ADMIN, SUPERVISOR | ADMIN      | -          | ADMIN      | ADMIN, SUPERVISOR\* |
| WAREHOUSES | ADMIN                | ALL   | ADMIN             | ADMIN      | -          | -          | -                   |
| MOVEMENTS  | OPERATOR, SUPERVISOR | ALL   | DRAFT only        | DRAFT only | SUPERVISOR | SUPERVISOR | -                   |
| REPORTS    | -                    | ALL   | -                 | -          | -          | -          | -                   |
| SETTINGS   | ADMIN                | ADMIN | ADMIN             | ADMIN      | -          | -          | -                   |

\*Solo si esta habilitado por administrador

---

## 5) Vistas y consultas recomendadas

- **v_inventory_balance**: saldo por `product_id`, `warehouse_id`, `location_id`

  ```sql
  CREATE VIEW v_inventory_balance AS
  SELECT
    ml.org_id,
    ml.product_id,
    m.warehouse_id,
    ml.location_id,
    SUM(
      CASE m.type
        WHEN 'IN' THEN ml.qty
        WHEN 'ADJUST_IN' THEN ml.qty
        WHEN 'TRANSFER_IN' THEN ml.qty
        ELSE -ml.qty
      END
    ) AS qty
  FROM movement_lines ml
  JOIN movements m ON m.id = ml.movement_id
  WHERE m.status = 'POSTED'
  GROUP BY ml.org_id, ml.product_id, m.warehouse_id, ml.location_id;

  ```

- **v_low_stock**: productos bajo minimo

  ```sql
  CREATE VIEW v_low_stock AS
  SELECT
    r.org_id, r.product_id, r.warehouse_id, r.min_qty, b.qty AS on_hand
  FROM reorder_rules r
  LEFT JOIN (
    SELECT org_id, product_id, warehouse_id, SUM(qty) qty
    FROM v_inventory_balance
    GROUP BY org_id, product_id, warehouse_id
  ) b ON b.org_id=r.org_id AND b.product_id=r.product_id AND b.warehouse_id=r.warehouse_id
  WHERE COALESCE(b.qty,0) < r.min_qty;

  ```

- **v_inventory_valuation** (PPM): costo total por producto+bodega (`qty * ppm_actual`).

---

## 6) Indices sugeridos

- `products(org_id, sku)` **UNIQUE**
- `movement_lines(movement_id)`
- `movements(org_id, status, posted_at)`
- `v_inventory_balance(product_id, warehouse_id)` _(indice en materialized view si se usa)_
- `reorder_rules(org_id, product_id, warehouse_id)` **UNIQUE**

---

## 6.1) Personalizacion de Marca

### **Configuracion de Colores**

- **Primary Color**: Color principal de la marca (hex)
- **Secondary Color**: Color secundario (hex)
- **Accent Color**: Color de acento para botones y enlaces (hex)
- **Font Family**: Familia de fuente principal (ej: 'Inter', 'Roboto')

### **Logo y Branding**

- **Logo URL**: URL del logo de la organizacion
- **Logo Alt Text**: Texto alternativo para accesibilidad
- **Custom CSS**: CSS personalizado adicional (opcional)

### **Configuraciones de Organizacion**

- **Timezone**: Zona horaria por defecto (ej: 'America/Bogota')
- **Currency**: Moneda por defecto (ej: 'COP', 'USD')
- **Date Format**: Formato de fecha (ej: 'DD/MM/YYYY', 'MM/DD/YYYY')

## 7) Plantillas de Importacion (Excel/CSV)

### 7.1 Ajuste/Inicializacion de stock

Campos soportados (cabecera exacta):

- `Ubicacion`, `Codigo` (SKU), `Nombre` (opcional), `Unidad de medida`, `Cantidad`,
  `Costo Unitario`, `Costo Total` _(opcional; si viene, valida ~ Cantidad x Costo Unitario)_,
  `Precio Venta Unitario` _(opcional)_, `Precio Venta Total` _(opcional)_

Ejemplo (CSV):

```
Ubicacion,Codigo,Nombre,Unidad de medida,Cantidad,Costo Unitario,Costo Total,Precio Venta Unitario,Precio Venta Total
BOD-CENTRO:A1,SKU-001,Tornillo 1",UND,100,120,12000,200,20000
BOD-CENTRO:B2,SKU-002,Arandela 10mm,UND,50,80,4000,150,7500

```

**Mapeo**:

- `Ubicacion` -> `locations.code`
- `Codigo` -> `products.sku` _(si no existe y se permite, se crea con `Nombre` y `Unidad de medida`)_
- `Cantidad` -> `movement_lines.qty` (tipo `ADJUST_IN` si es inicializacion positiva)
- `Costo Unitario` -> `movement_lines.unit_cost` (afecta PPM)
- `Precio Venta Unitario` -> `product_prices.amount` (`price_type='LIST'`)

### 7.2 Catalogo de productos

```
SKU,Nombre,Unidad,Categoria,Barcode,Marca,Modelo,Estado
SKU-001,Tornillo 1",UND,FERRETERIA,7701234567890,ACME,TX-1,ACTIVE

```

Validaciones de carga:

- SKU no duplicado; unidad existente; cantidades >= 0; costos >= 0.
- Reporte de errores por fila en `import_rows.errors`.

---

## 8) DDL base (PostgreSQL, extracto)

> Nota: Ejemplo abreviado para tablas criticas.

```sql
-- PRODUCTS
CREATE TABLE products (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  unit_id uuid NOT NULL,
  barcode text,
  brand text,
  model text,
  status text NOT NULL DEFAULT 'ACTIVE',
  cost_method text NOT NULL DEFAULT 'AVG',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, sku),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- MOVEMENTS
CREATE TABLE movements (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  warehouse_id uuid NOT NULL,
  reason text,
  reference text,
  note text,
  posted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- MOVEMENT_LINES
CREATE TABLE movement_lines (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  movement_id uuid NOT NULL,
  product_id uuid NOT NULL,
  location_id uuid NOT NULL,
  qty numeric(18,6) NOT NULL CHECK (qty > 0),
  unit_cost numeric(18,6),
  currency text DEFAULT 'COP',
  extra jsonb,
  FOREIGN KEY (movement_id) REFERENCES movements(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

```

---

## 9) Diagramas de tipos (Mermaid)

```mermaid
classDiagram-v2
direction TB

class MovementType {
  <<enumeration>>
  IN
  OUT
  ADJUST_IN
  ADJUST_OUT
  TRANSFER_OUT
  TRANSFER_IN
}

class MovementStatus {
  <<enumeration>>
  DRAFT
  POSTED
  VOID
}

class TransferStatus {
  <<enumeration>>
  DRAFT
  IN_TRANSIT
  PARTIAL
  RECEIVED
  REJECTED
  CANCELED
}

class Reason {
  <<enumeration>>
  PURCHASE
  SALE
  RETURN_SUPPLIER
  RETURN_CUSTOMER
  CONSUMPTION
  CORRECTION
  OTHER
}

```

---

## 10) Notas de implementacion

- **API**: expone endpoints para catalogo, movimientos (posteo y reversa), transferencias y reportes.
- **Concurrencia**: aplicar _row-level locking_ al postear movimientos por `(org_id, product_id, warehouse_id)` para integridad de PPM y stock.
- **Materializacion**: si el volumen crece, materializar `v_inventory_balance` y refrescar por lotes.

## 10.1) Implementacion de JWT y Seguridad

### **Estructura del Token JWT**

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "org_id": "organization_id",
    "roles": ["ADMIN", "SUPERVISOR"],
    "permissions": ["PRODUCTS:CREATE", "MOVEMENTS:POST"],
    "iat": 1516239022,
    "exp": 1516242622,
    "jti": "unique_token_id"
  }
}
```

### **Estrategia de Refresh Token**

- **Access Token**: 15 minutos de duracion
- **Refresh Token**: 7 dias de duracion
- **Rotacion**: Nuevo refresh token en cada renovacion
- **Blacklisting**: Tokens invalidados en logout

### **Rate Limiting**

- **Por IP**: 100 requests/minuto
- **Por Usuario**: 1000 requests/hora
- **Por Endpoint**: Configurable por tipo de operacion

### **Validacion de Permisos**

- Middleware de autorizacion en cada endpoint
- Validacion de `org_id` en todas las operaciones
- Cache de permisos del usuario (5 minutos)
- Auditoria de accesos denegados
