/*
  Warnings:

  - You are about to drop the column `parentClusterId` on the `Kubeconfig` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Kubeconfig_parentClusterId_key";

-- AlterTable
ALTER TABLE "Kubeconfig" DROP COLUMN "parentClusterId";
