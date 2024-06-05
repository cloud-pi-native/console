/*
  Warnings:

  - Changed the type of `role` on the `Role` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RoleChoice" AS ENUM ('owner', 'user');

-- AlterTable
ALTER TABLE  public."Role" ALTER COLUMN "role" TYPE "RoleChoice" USING
	case
		when role = 'owner' then 'owner'::"RoleChoice"
		else 'user'::"RoleChoice"
	end;