-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedBy" TEXT;
