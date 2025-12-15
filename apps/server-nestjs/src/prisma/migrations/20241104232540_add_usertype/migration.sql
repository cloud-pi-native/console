-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('human', 'bot', 'ghost');

-- AlterEnum
ALTER TYPE "TokenStatus" ADD VALUE 'inactive';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "type" "UserType" NOT NULL DEFAULT 'human';
UPDATE "User" SET type = 'ghost' WHERE id = '04ac168a-2c4f-4816-9cce-af6c612e5912';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "type" DROP DEFAULT;
