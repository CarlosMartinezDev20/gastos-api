-- AlterTable
ALTER TABLE "Budget" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "CardPayment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "PaymentMethod" ALTER COLUMN "creditLimit" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "RecurringTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "SavingsGoal" ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "savedAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

