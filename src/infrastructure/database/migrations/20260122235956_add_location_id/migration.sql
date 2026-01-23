/*
  Warnings:

  - A unique constraint covering the columns `[productId,warehouseId,locationId,orgId]` on the table `stock` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "stock_productId_warehouseId_orgId_key";

-- AlterTable
ALTER TABLE "return_lines" ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sale_lines" ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "stock" ADD COLUMN     "locationId" TEXT;

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

-- CreateIndex
CREATE INDEX "locations_warehouseId_orgId_idx" ON "locations"("warehouseId", "orgId");

-- CreateIndex
CREATE INDEX "locations_parentId_idx" ON "locations"("parentId");

-- CreateIndex
CREATE INDEX "locations_orgId_isActive_idx" ON "locations"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_warehouseId_orgId_key" ON "locations"("code", "warehouseId", "orgId");

-- CreateIndex
CREATE INDEX "return_lines_locationId_idx" ON "return_lines"("locationId");

-- CreateIndex
CREATE INDEX "sale_lines_locationId_idx" ON "sale_lines"("locationId");

-- CreateIndex
CREATE INDEX "stock_locationId_idx" ON "stock"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_productId_warehouseId_locationId_orgId_key" ON "stock"("productId", "warehouseId", "locationId", "orgId");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement_lines" ADD CONSTRAINT "movement_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
