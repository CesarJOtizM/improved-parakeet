-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "settings" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "pickedAt" TIMESTAMP(3),
ADD COLUMN     "pickedBy" TEXT,
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippedBy" TEXT,
ADD COLUMN     "shippingCarrier" TEXT,
ADD COLUMN     "shippingNotes" TEXT,
ADD COLUMN     "trackingNumber" TEXT;
