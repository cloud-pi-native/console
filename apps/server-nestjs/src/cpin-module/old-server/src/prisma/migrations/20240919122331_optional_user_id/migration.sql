-- DropForeignKey
ALTER TABLE "Log" DROP CONSTRAINT "Log_userId_fkey";

-- AlterTable
ALTER TABLE "Log" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
