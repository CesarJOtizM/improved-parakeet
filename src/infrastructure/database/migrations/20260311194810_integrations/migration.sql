-- AlterTable
ALTER TABLE "integration_connections" ADD COLUMN     "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "encryptedAccessToken" TEXT,
ADD COLUMN     "encryptedRefreshToken" TEXT,
ADD COLUMN     "meliUserId" TEXT,
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tokenStatus" TEXT;

-- CreateIndex
CREATE INDEX "integration_connections_meliUserId_idx" ON "integration_connections"("meliUserId");
