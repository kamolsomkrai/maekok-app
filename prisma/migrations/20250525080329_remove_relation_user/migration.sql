/*
  Warnings:

  - You are about to drop the column `userId` on the `WeekSubmission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "WeekSubmission" DROP CONSTRAINT "WeekSubmission_userId_fkey";

-- AlterTable
ALTER TABLE "WeekSubmission" DROP COLUMN "userId";
