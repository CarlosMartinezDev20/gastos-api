-- AlterEnum
ALTER TYPE "RecurrenceFrequency" ADD VALUE 'YEARLY';

-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN     "service" TEXT;

