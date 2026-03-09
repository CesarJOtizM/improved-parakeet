-- CreateTable
CREATE TABLE "base_entities" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,

    CONSTRAINT "base_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "phone" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "language" TEXT DEFAULT 'en',
    "jobTitle" TEXT,
    "department" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "barcode" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "price" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'COP',
    "costMethod" TEXT NOT NULL DEFAULT 'AVG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "statusChangedBy" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "companyId" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "statusChangedBy" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'BIN',
    "warehouseId" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_rules" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "minQty" DECIMAL(10,6) NOT NULL,
    "maxQty" DECIMAL(10,6) NOT NULL,
    "safetyQty" DECIMAL(10,6) NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reorder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movements" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "warehouseId" TEXT NOT NULL,
    "contactId" TEXT,
    "reference" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "returnedAt" TIMESTAMP(3),
    "returnedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_lines" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2),
    "currency" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "movement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "initiatedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_lines" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "warehouseId" TEXT NOT NULL,
    "customerReference" TEXT,
    "contactId" TEXT,
    "externalReference" TEXT,
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "pickedAt" TIMESTAMP(3),
    "pickedBy" TEXT,
    "shippedAt" TIMESTAMP(3),
    "shippedBy" TEXT,
    "trackingNumber" TEXT,
    "shippingCarrier" TEXT,
    "shippingNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "returnedAt" TIMESTAMP(3),
    "returnedBy" TEXT,
    "movementId" TEXT,
    "createdBy" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_lines" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "quantity" DECIMAL(10,6) NOT NULL,
    "salePrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "extra" JSONB,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "warehouseId" TEXT NOT NULL,
    "saleId" TEXT,
    "sourceMovementId" TEXT,
    "returnMovementId" TEXT,
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_lines" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "quantity" DECIMAL(10,6) NOT NULL,
    "originalSalePrice" DECIMAL(10,2),
    "originalUnitCost" DECIMAL(10,2),
    "currency" TEXT NOT NULL,
    "extra" JSONB,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "performedBy" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "httpMethod" TEXT,
    "httpUrl" TEXT,
    "httpStatusCode" INTEGER,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "defaultParameters" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "parameters" JSONB NOT NULL,
    "templateId" TEXT,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "format" TEXT,
    "exportedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "validationErrors" JSONB,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_number_sequences" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_line_swaps" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "originalLineId" TEXT NOT NULL,
    "newLineId" TEXT,
    "originalProductId" TEXT NOT NULL,
    "originalQuantity" DECIMAL(10,6) NOT NULL,
    "originalSalePrice" DECIMAL(10,2) NOT NULL,
    "originalCurrency" TEXT NOT NULL,
    "replacementProductId" TEXT NOT NULL,
    "replacementQuantity" DECIMAL(10,6) NOT NULL,
    "replacementSalePrice" DECIMAL(10,2) NOT NULL,
    "replacementCurrency" TEXT NOT NULL,
    "originalWarehouseId" TEXT NOT NULL,
    "sourceWarehouseId" TEXT NOT NULL,
    "isCrossWarehouse" BOOLEAN NOT NULL DEFAULT false,
    "returnMovementId" TEXT,
    "deductMovementId" TEXT,
    "pricingStrategy" TEXT NOT NULL,
    "reason" TEXT,
    "performedBy" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_line_swaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identification" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configurations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "cronFrequency" TEXT NOT NULL DEFAULT 'EVERY_HOUR',
    "notifyLowStock" BOOLEAN NOT NULL DEFAULT true,
    "notifyCriticalStock" BOOLEAN NOT NULL DEFAULT true,
    "notifyOutOfStock" BOOLEAN NOT NULL DEFAULT true,
    "recipientEmails" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "syncStrategy" TEXT NOT NULL DEFAULT 'BOTH',
    "syncDirection" TEXT NOT NULL DEFAULT 'BIDIRECTIONAL',
    "encryptedAppKey" TEXT NOT NULL,
    "encryptedAppToken" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "defaultWarehouseId" TEXT NOT NULL,
    "defaultContactId" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "companyId" TEXT,
    "orgId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_logs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "saleId" TEXT,
    "contactId" TEXT,
    "errorMessage" TEXT,
    "rawPayload" JSONB,
    "orgId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sku_mappings" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalSku" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_sku_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_orgId_isActive_idx" ON "users"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "roles_isSystem_idx" ON "roles"("isSystem");

-- CreateIndex
CREATE INDEX "roles_orgId_idx" ON "roles"("orgId");

-- CreateIndex
CREATE INDEX "roles_orgId_isActive_idx" ON "roles"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_orgId_key" ON "roles"("name", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_orgId_key" ON "user_roles"("userId", "roleId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_orgId_idx" ON "sessions"("userId", "orgId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_isActive_idx" ON "sessions"("isActive");

-- CreateIndex
CREATE INDEX "otp_email_type_orgId_idx" ON "otp"("email", "type", "orgId");

-- CreateIndex
CREATE INDEX "otp_expiresAt_idx" ON "otp"("expiresAt");

-- CreateIndex
CREATE INDEX "otp_isUsed_idx" ON "otp"("isUsed");

-- CreateIndex
CREATE INDEX "otp_orgId_idx" ON "otp"("orgId");

-- CreateIndex
CREATE INDEX "products_orgId_idx" ON "products"("orgId");

-- CreateIndex
CREATE INDEX "products_orgId_isActive_idx" ON "products"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "products_orgId_companyId_idx" ON "products"("orgId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_orgId_key" ON "products"("sku", "orgId");

-- CreateIndex
CREATE INDEX "warehouses_orgId_idx" ON "warehouses"("orgId");

-- CreateIndex
CREATE INDEX "warehouses_orgId_isActive_idx" ON "warehouses"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_orgId_key" ON "warehouses"("code", "orgId");

-- CreateIndex
CREATE INDEX "locations_warehouseId_orgId_idx" ON "locations"("warehouseId", "orgId");

-- CreateIndex
CREATE INDEX "locations_parentId_idx" ON "locations"("parentId");

-- CreateIndex
CREATE INDEX "locations_orgId_isActive_idx" ON "locations"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_warehouseId_orgId_key" ON "locations"("code", "warehouseId", "orgId");

-- CreateIndex
CREATE INDEX "stock_orgId_warehouseId_idx" ON "stock"("orgId", "warehouseId");

-- CreateIndex
CREATE INDEX "stock_orgId_productId_idx" ON "stock"("orgId", "productId");

-- CreateIndex
CREATE INDEX "stock_locationId_idx" ON "stock"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_productId_warehouseId_locationId_orgId_key" ON "stock"("productId", "warehouseId", "locationId", "orgId");

-- CreateIndex
CREATE INDEX "reorder_rules_productId_orgId_idx" ON "reorder_rules"("productId", "orgId");

-- CreateIndex
CREATE INDEX "reorder_rules_warehouseId_orgId_idx" ON "reorder_rules"("warehouseId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "reorder_rules_productId_warehouseId_orgId_key" ON "reorder_rules"("productId", "warehouseId", "orgId");

-- CreateIndex
CREATE INDEX "movements_orgId_warehouseId_idx" ON "movements"("orgId", "warehouseId");

-- CreateIndex
CREATE INDEX "movements_orgId_status_createdAt_idx" ON "movements"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "movement_lines_movementId_idx" ON "movement_lines"("movementId");

-- CreateIndex
CREATE INDEX "movement_lines_movementId_orgId_idx" ON "movement_lines"("movementId", "orgId");

-- CreateIndex
CREATE INDEX "movement_lines_productId_orgId_idx" ON "movement_lines"("productId", "orgId");

-- CreateIndex
CREATE INDEX "transfers_orgId_fromWarehouseId_idx" ON "transfers"("orgId", "fromWarehouseId");

-- CreateIndex
CREATE INDEX "transfers_orgId_toWarehouseId_idx" ON "transfers"("orgId", "toWarehouseId");

-- CreateIndex
CREATE INDEX "transfers_orgId_status_idx" ON "transfers"("orgId", "status");

-- CreateIndex
CREATE INDEX "transfers_orgId_createdAt_idx" ON "transfers"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "transfer_lines_transferId_idx" ON "transfer_lines"("transferId");

-- CreateIndex
CREATE INDEX "transfer_lines_transferId_orgId_idx" ON "transfer_lines"("transferId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_movementId_key" ON "sales"("movementId");

-- CreateIndex
CREATE INDEX "sales_status_orgId_idx" ON "sales"("status", "orgId");

-- CreateIndex
CREATE INDEX "sales_orgId_warehouseId_idx" ON "sales"("orgId", "warehouseId");

-- CreateIndex
CREATE INDEX "sales_orgId_contactId_idx" ON "sales"("orgId", "contactId");

-- CreateIndex
CREATE INDEX "sales_orgId_status_createdAt_idx" ON "sales"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "sales_orgId_createdAt_idx" ON "sales"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sales_saleNumber_orgId_key" ON "sales"("saleNumber", "orgId");

-- CreateIndex
CREATE INDEX "sale_lines_saleId_idx" ON "sale_lines"("saleId");

-- CreateIndex
CREATE INDEX "sale_lines_productId_orgId_idx" ON "sale_lines"("productId", "orgId");

-- CreateIndex
CREATE INDEX "sale_lines_locationId_idx" ON "sale_lines"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "returns_returnMovementId_key" ON "returns"("returnMovementId");

-- CreateIndex
CREATE INDEX "returns_status_orgId_idx" ON "returns"("status", "orgId");

-- CreateIndex
CREATE INDEX "returns_type_orgId_idx" ON "returns"("type", "orgId");

-- CreateIndex
CREATE INDEX "returns_saleId_orgId_idx" ON "returns"("saleId", "orgId");

-- CreateIndex
CREATE INDEX "returns_sourceMovementId_orgId_idx" ON "returns"("sourceMovementId", "orgId");

-- CreateIndex
CREATE INDEX "returns_orgId_warehouseId_idx" ON "returns"("orgId", "warehouseId");

-- CreateIndex
CREATE INDEX "returns_orgId_status_createdAt_idx" ON "returns"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "returns_orgId_createdAt_idx" ON "returns"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "returns_returnNumber_orgId_key" ON "returns"("returnNumber", "orgId");

-- CreateIndex
CREATE INDEX "return_lines_returnId_idx" ON "return_lines"("returnId");

-- CreateIndex
CREATE INDEX "return_lines_productId_orgId_idx" ON "return_lines"("productId", "orgId");

-- CreateIndex
CREATE INDEX "return_lines_locationId_idx" ON "return_lines"("locationId");

-- CreateIndex
CREATE INDEX "categories_orgId_idx" ON "categories"("orgId");

-- CreateIndex
CREATE INDEX "categories_orgId_parentId_idx" ON "categories"("orgId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_orgId_key" ON "categories"("name", "orgId");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_createdAt_idx" ON "audit_logs"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_entityType_createdAt_idx" ON "audit_logs"("orgId", "entityType", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_entityId_entityType_idx" ON "audit_logs"("orgId", "entityId", "entityType");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_performedBy_createdAt_idx" ON "audit_logs"("orgId", "performedBy", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_action_createdAt_idx" ON "audit_logs"("orgId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "report_templates_orgId_type_idx" ON "report_templates"("orgId", "type");

-- CreateIndex
CREATE INDEX "report_templates_orgId_isActive_idx" ON "report_templates"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "report_templates_orgId_name_key" ON "report_templates"("orgId", "name");

-- CreateIndex
CREATE INDEX "reports_orgId_type_idx" ON "reports"("orgId", "type");

-- CreateIndex
CREATE INDEX "reports_orgId_status_idx" ON "reports"("orgId", "status");

-- CreateIndex
CREATE INDEX "reports_orgId_generatedAt_idx" ON "reports"("orgId", "generatedAt");

-- CreateIndex
CREATE INDEX "reports_orgId_generatedBy_idx" ON "reports"("orgId", "generatedBy");

-- CreateIndex
CREATE INDEX "import_batches_orgId_type_idx" ON "import_batches"("orgId", "type");

-- CreateIndex
CREATE INDEX "import_batches_orgId_status_idx" ON "import_batches"("orgId", "status");

-- CreateIndex
CREATE INDEX "import_batches_orgId_createdBy_idx" ON "import_batches"("orgId", "createdBy");

-- CreateIndex
CREATE INDEX "import_batches_orgId_createdAt_idx" ON "import_batches"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "import_rows_importBatchId_idx" ON "import_rows"("importBatchId");

-- CreateIndex
CREATE INDEX "import_rows_orgId_isValid_idx" ON "import_rows"("orgId", "isValid");

-- CreateIndex
CREATE UNIQUE INDEX "import_rows_importBatchId_rowNumber_key" ON "import_rows"("importBatchId", "rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "document_number_sequences_orgId_type_year_key" ON "document_number_sequences"("orgId", "type", "year");

-- CreateIndex
CREATE INDEX "processed_events_orgId_eventType_idx" ON "processed_events"("orgId", "eventType");

-- CreateIndex
CREATE INDEX "processed_events_processedAt_idx" ON "processed_events"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "processed_events_eventType_eventId_orgId_key" ON "processed_events"("eventType", "eventId", "orgId");

-- CreateIndex
CREATE INDEX "sale_line_swaps_saleId_orgId_idx" ON "sale_line_swaps"("saleId", "orgId");

-- CreateIndex
CREATE INDEX "sale_line_swaps_orgId_createdAt_idx" ON "sale_line_swaps"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "contacts_orgId_idx" ON "contacts"("orgId");

-- CreateIndex
CREATE INDEX "contacts_orgId_type_idx" ON "contacts"("orgId", "type");

-- CreateIndex
CREATE INDEX "contacts_orgId_isActive_idx" ON "contacts"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "contacts_email_orgId_idx" ON "contacts"("email", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_identification_orgId_key" ON "contacts"("identification", "orgId");

-- CreateIndex
CREATE INDEX "companies_orgId_idx" ON "companies"("orgId");

-- CreateIndex
CREATE INDEX "companies_orgId_isActive_idx" ON "companies"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_orgId_key" ON "companies"("code", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_orgId_key" ON "companies"("name", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "alert_configurations_orgId_key" ON "alert_configurations"("orgId");

-- CreateIndex
CREATE INDEX "integration_connections_orgId_provider_idx" ON "integration_connections"("orgId", "provider");

-- CreateIndex
CREATE INDEX "integration_connections_status_idx" ON "integration_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_provider_accountName_orgId_key" ON "integration_connections"("provider", "accountName", "orgId");

-- CreateIndex
CREATE INDEX "integration_sync_logs_connectionId_idx" ON "integration_sync_logs"("connectionId");

-- CreateIndex
CREATE INDEX "integration_sync_logs_orgId_externalOrderId_idx" ON "integration_sync_logs"("orgId", "externalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_sync_logs_connectionId_externalOrderId_key" ON "integration_sync_logs"("connectionId", "externalOrderId");

-- CreateIndex
CREATE INDEX "integration_sku_mappings_connectionId_idx" ON "integration_sku_mappings"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_sku_mappings_connectionId_externalSku_key" ON "integration_sku_mappings"("connectionId", "externalSku");

-- CreateIndex
CREATE INDEX "_ProductCategories_B_index" ON "_ProductCategories"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement_lines" ADD CONSTRAINT "movement_lines_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement_lines" ADD CONSTRAINT "movement_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement_lines" ADD CONSTRAINT "movement_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_lines" ADD CONSTRAINT "transfer_lines_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_lines" ADD CONSTRAINT "transfer_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_sourceMovementId_fkey" FOREIGN KEY ("sourceMovementId") REFERENCES "movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_returnMovementId_fkey" FOREIGN KEY ("returnMovementId") REFERENCES "movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_swaps" ADD CONSTRAINT "sale_line_swaps_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_swaps" ADD CONSTRAINT "sale_line_swaps_originalProductId_fkey" FOREIGN KEY ("originalProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_swaps" ADD CONSTRAINT "sale_line_swaps_replacementProductId_fkey" FOREIGN KEY ("replacementProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configurations" ADD CONSTRAINT "alert_configurations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_defaultWarehouseId_fkey" FOREIGN KEY ("defaultWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_defaultContactId_fkey" FOREIGN KEY ("defaultContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sku_mappings" ADD CONSTRAINT "integration_sku_mappings_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sku_mappings" ADD CONSTRAINT "integration_sku_mappings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
