-- Accounts move to Supabase Auth: "User" keeps the profile, with the
-- Supabase user id as its id. Passwords and token versions live there now.
ALTER TABLE "User" DROP COLUMN "password",
DROP COLUMN "tokenVersion";

-- Dates as timestamptz. The old columns held UTC wall-clock values, so they
-- are read as UTC: every instant stays the same.
ALTER TABLE "Budget" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "CardPayment" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3) USING "date" AT TIME ZONE 'UTC',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "PaymentMethod" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "RecurringTransaction" ALTER COLUMN "nextDate" SET DATA TYPE TIMESTAMPTZ(3) USING "nextDate" AT TIME ZONE 'UTC',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "SavingsGoal" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "Transaction" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3) USING "date" AT TIME ZONE 'UTC';
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

-- Foreign keys that cascades and joins walk without an index.
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");
CREATE INDEX "CardPayment_fromMethodId_idx" ON "CardPayment"("fromMethodId");
CREATE INDEX "RecurringTransaction_categoryId_idx" ON "RecurringTransaction"("categoryId");
CREATE INDEX "RecurringTransaction_paymentMethodId_idx" ON "RecurringTransaction"("paymentMethodId");
CREATE INDEX "Transaction_recurringId_idx" ON "Transaction"("recurringId");

-- The rules the API validates, also held by the database.
-- Goal withdrawals are negative contributions; every other movement is positive.
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_amount_check"
  CHECK ("amount" > 0 OR ("goalId" IS NOT NULL AND "amount" <> 0));
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_amount_check" CHECK ("amount" > 0);
ALTER TABLE "CardPayment" ADD CONSTRAINT "CardPayment_amount_check" CHECK ("amount" > 0);
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_amount_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "RecurringTransaction_anchorDay_check" CHECK ("anchorDay" BETWEEN 1 AND 31);
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_targetAmount_check" CHECK ("targetAmount" > 0),
  ADD CONSTRAINT "SavingsGoal_savedAmount_check" CHECK ("savedAmount" >= 0);
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_creditLimit_check" CHECK ("creditLimit" > 0),
  ADD CONSTRAINT "PaymentMethod_statementDay_check" CHECK ("statementDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "PaymentMethod_dueDay_check" CHECK ("dueDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "PaymentMethod_last4_check" CHECK ("last4" ~ '^[0-9]{4}$');
