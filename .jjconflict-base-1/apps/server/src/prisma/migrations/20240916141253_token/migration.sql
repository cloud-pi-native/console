-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('active', 'revoked');

-- CreateTable
CREATE TABLE "AdminToken" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" BIGINT NOT NULL,
    "userId" UUID,
    "expirationDate" TIMESTAMP(3),
    "lastUse" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TokenStatus" NOT NULL DEFAULT 'active',
    "hash" TEXT NOT NULL,

    CONSTRAINT "AdminToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminToken_id_key" ON "AdminToken"("id");

-- AddForeignKey
ALTER TABLE "AdminToken" ADD CONSTRAINT "AdminToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
