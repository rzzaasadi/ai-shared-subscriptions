/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Pool` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Pool" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pool_code_key" ON "Pool"("code");
