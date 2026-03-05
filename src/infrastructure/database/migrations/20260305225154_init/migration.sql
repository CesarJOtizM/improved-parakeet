-- AlterTable
ALTER TABLE "products" ADD COLUMN     "companyId" TEXT;

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

-- CreateIndex
CREATE INDEX "sale_line_swaps_saleId_orgId_idx" ON "sale_line_swaps"("saleId", "orgId");

-- CreateIndex
CREATE INDEX "sale_line_swaps_orgId_createdAt_idx" ON "sale_line_swaps"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "companies_orgId_idx" ON "companies"("orgId");

-- CreateIndex
CREATE INDEX "companies_orgId_isActive_idx" ON "companies"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_orgId_key" ON "companies"("code", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_orgId_key" ON "companies"("name", "orgId");

-- CreateIndex
CREATE INDEX "products_orgId_companyId_idx" ON "products"("orgId", "companyId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_swaps" ADD CONSTRAINT "sale_line_swaps_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_swaps" ADD CONSTRAINT "sale_line_swaps_originalProductId_fkey" FOREIGN KEY ("originalProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_swaps" ADD CONSTRAINT "sale_line_swaps_replacementProductId_fkey" FOREIGN KEY ("replacementProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
