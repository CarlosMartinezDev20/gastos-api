-- On Supabase, tables in `public` are reachable through the Data API with
-- the publishable key. The app only reaches its data through the NestJS API
-- (which connects as the table owner and filters every query by user), so
-- the Data API roles get no access at all: RLS on with no policies (deny
-- all) and no privileges. `public` is also removed from the exposed schemas
-- in supabase/config.toml. On a plain Postgres (local, CI) the roles don't
-- exist and only RLS is turned on, which the owner bypasses.
--
-- Every new table needs `ENABLE ROW LEVEL SECURITY` in its migration.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavingsGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    -- Tables created later by this role (Prisma migrations) start closed too.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
END
$$;
