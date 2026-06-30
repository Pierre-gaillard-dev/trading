/*
  Warnings:

  - You are about to drop the column `params` on the `BotConfig` table. All the data in the column will be lost.
  - You are about to drop the column `strategyKey` on the `BotConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BotConfig" DROP COLUMN "params",
DROP COLUMN "strategyKey",
ADD COLUMN     "strategies" JSONB NOT NULL DEFAULT '[]';
