/*
  Warnings:

  - Added the required column `province` to the `Hospital` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "province" TEXT NOT NULL;
