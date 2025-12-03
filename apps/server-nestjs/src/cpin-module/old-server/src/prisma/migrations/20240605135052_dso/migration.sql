-- CreateEnum
CREATE TYPE "RoleList" AS ENUM ('owner', 'user');

-- AlterTable
ALTER TABLE  public."Role" ALTER COLUMN "role" TYPE "RoleList" USING
	case
		when role = 'owner' then 'owner'::"RoleList"
		else 'user'::"RoleList"
	end;