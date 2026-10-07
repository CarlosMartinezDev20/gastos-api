-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "goalId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_goalId_idx" ON "Transaction"("goalId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Link contributions made before this column existed ("Ahorro: <goal name>").
UPDATE "Transaction" t
SET "goalId" = g."id"
FROM "SavingsGoal" g
WHERE t."userId" = g."userId"
  AND t."goalId" IS NULL
  AND t."title" = 'Ahorro: ' || g."name";
