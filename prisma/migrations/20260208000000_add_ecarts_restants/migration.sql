-- AlterTable User: failedLoginAttempts, lockedUntil
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);

-- CreateEnum StatutDecaissement
DO $$ BEGIN
  CREATE TYPE "StatutDecaissement" AS ENUM ('PREVU', 'VALIDE', 'PAYE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable Decaissement: statut
ALTER TABLE "Decaissement" ADD COLUMN IF NOT EXISTS "statut" "StatutDecaissement" NOT NULL DEFAULT 'VALIDE';
CREATE INDEX IF NOT EXISTS "Decaissement_statut_idx" ON "Decaissement"("statut");

-- AlterTable Notification: marche_id
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "marche_id" TEXT;
