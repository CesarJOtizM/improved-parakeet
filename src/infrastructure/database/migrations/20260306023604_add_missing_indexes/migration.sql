-- CreateIndex
CREATE INDEX "movement_lines_movementId_idx" ON "movement_lines"("movementId");

-- CreateIndex
CREATE INDEX "movement_lines_movementId_orgId_idx" ON "movement_lines"("movementId", "orgId");

-- CreateIndex
CREATE INDEX "movement_lines_productId_orgId_idx" ON "movement_lines"("productId", "orgId");

-- CreateIndex
CREATE INDEX "roles_orgId_idx" ON "roles"("orgId");

-- CreateIndex
CREATE INDEX "roles_orgId_isActive_idx" ON "roles"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "transfer_lines_transferId_idx" ON "transfer_lines"("transferId");

-- CreateIndex
CREATE INDEX "transfer_lines_transferId_orgId_idx" ON "transfer_lines"("transferId", "orgId");

-- CreateIndex
CREATE INDEX "transfers_orgId_fromWarehouseId_idx" ON "transfers"("orgId", "fromWarehouseId");

-- CreateIndex
CREATE INDEX "transfers_orgId_toWarehouseId_idx" ON "transfers"("orgId", "toWarehouseId");

-- CreateIndex
CREATE INDEX "transfers_orgId_status_idx" ON "transfers"("orgId", "status");

-- CreateIndex
CREATE INDEX "transfers_orgId_createdAt_idx" ON "transfers"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_orgId_isActive_idx" ON "users"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "warehouses_orgId_idx" ON "warehouses"("orgId");

-- CreateIndex
CREATE INDEX "warehouses_orgId_isActive_idx" ON "warehouses"("orgId", "isActive");
