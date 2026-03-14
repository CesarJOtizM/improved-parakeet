-- DropForeignKey
ALTER TABLE "integration_sku_mappings" DROP CONSTRAINT "integration_sku_mappings_connectionId_fkey";

-- DropForeignKey
ALTER TABLE "integration_sync_logs" DROP CONSTRAINT "integration_sync_logs_connectionId_fkey";

-- AddForeignKey
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sku_mappings" ADD CONSTRAINT "integration_sku_mappings_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
