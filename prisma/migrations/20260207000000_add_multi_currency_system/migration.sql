-- CreateEnum
CREATE TYPE "PositionSymbole" AS ENUM ('BEFORE', 'AFTER');

-- CreateEnum
CREATE TYPE "SourceTaux" AS ENUM ('MANUEL', 'API', 'BCE', 'BCEAO', 'CUSTOM');

-- CreateTable
CREATE TABLE "devises" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "symbole" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "decimales" INTEGER NOT NULL DEFAULT 0,
    "separateur_milliers" TEXT NOT NULL DEFAULT ' ',
    "separateur_decimal" TEXT NOT NULL DEFAULT ',',
    "position_symbole" "PositionSymbole" NOT NULL DEFAULT 'AFTER',
    "taux_vers_xof" DECIMAL(15,6) NOT NULL DEFAULT 1,
    "pays" TEXT[],
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taux_changes" (
    "id" TEXT NOT NULL,
    "devise_source_id" TEXT NOT NULL,
    "devise_source_code" TEXT NOT NULL,
    "taux" DECIMAL(15,6) NOT NULL,
    "source" "SourceTaux" NOT NULL DEFAULT 'MANUEL',
    "date_debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taux_changes_pkey" PRIMARY KEY ("id")
);

-- Insert default XOF devise
INSERT INTO "devises" ("id", "code", "nom", "symbole", "is_active", "is_default", "decimales", "separateur_milliers", "separateur_decimal", "position_symbole", "taux_vers_xof", "pays", "created_at", "updated_at")
VALUES (
    'devise-xof-default',
    'XOF',
    'Franc CFA',
    'FCFA',
    true,
    true,
    0,
    ' ',
    ',',
    'AFTER',
    1,
    ARRAY['Sénégal', 'Mali', 'Côte d''Ivoire', 'Bénin', 'Togo', 'Burkina Faso', 'Niger', 'Guinée-Bissau'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Add columns to Marche (PostgreSQL uses quoted identifiers - Prisma uses "Marche" by default)
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "devise_id" TEXT;
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "devise_code" TEXT DEFAULT 'XOF';
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "montant_total" DECIMAL(15,2);
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "montant_encaisse" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "montant_decaisse" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "tresorerie_disponible" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "montant_total_xof" DECIMAL(15,2);
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "montant_encaisse_xof" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "montant_decaisse_xof" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "tresorerie_disponible_xof" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "taux_change_creation" DECIMAL(15,6);

-- Migrate Marche data: montant -> montant_total, set devise_id
UPDATE "Marche" SET
    "devise_id" = 'devise-xof-default',
    "montant_total" = COALESCE("montant", 0),
    "montant_total_xof" = COALESCE("montant", 0),
    "montant_encaisse" = 0,
    "montant_decaisse" = 0,
    "tresorerie_disponible" = COALESCE("montant", 0),
    "montant_encaisse_xof" = 0,
    "montant_decaisse_xof" = 0,
    "tresorerie_disponible_xof" = COALESCE("montant", 0),
    "taux_change_creation" = 1
WHERE "devise_id" IS NULL;

-- Drop old montant column and make new columns NOT NULL
ALTER TABLE "Marche" DROP COLUMN IF EXISTS "montant";
ALTER TABLE "Marche" ALTER COLUMN "devise_id" SET NOT NULL;
ALTER TABLE "Marche" ALTER COLUMN "montant_total" SET NOT NULL;
ALTER TABLE "Marche" ALTER COLUMN "montant_total_xof" SET NOT NULL;
ALTER TABLE "Marche" ALTER COLUMN "taux_change_creation" SET NOT NULL;

-- Add foreign key
ALTER TABLE "Marche" ADD CONSTRAINT "Marche_devise_id_fkey" FOREIGN KEY ("devise_id") REFERENCES "devises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add columns to Accompte
ALTER TABLE "Accompte" ADD COLUMN IF NOT EXISTS "montant_xof" DECIMAL(15,2);
ALTER TABLE "Accompte" ADD COLUMN IF NOT EXISTS "taux_change" DECIMAL(15,6);

UPDATE "Accompte" SET "montant_xof" = COALESCE("montant", 0), "taux_change" = 1 WHERE "montant_xof" IS NULL;

ALTER TABLE "Accompte" ALTER COLUMN "montant_xof" SET NOT NULL;
ALTER TABLE "Accompte" ALTER COLUMN "taux_change" SET NOT NULL;

-- Add columns to Decaissement
ALTER TABLE "Decaissement" ADD COLUMN IF NOT EXISTS "montant_xof" DECIMAL(15,2);
ALTER TABLE "Decaissement" ADD COLUMN IF NOT EXISTS "taux_change" DECIMAL(15,6);

UPDATE "Decaissement" SET "montant_xof" = COALESCE("montant", 0), "taux_change" = 1 WHERE "montant_xof" IS NULL;

ALTER TABLE "Decaissement" ALTER COLUMN "montant_xof" SET NOT NULL;
ALTER TABLE "Decaissement" ALTER COLUMN "taux_change" SET NOT NULL;

-- Prefinancement: add new columns, migrate, drop old
ALTER TABLE "Prefinancement" ADD COLUMN IF NOT EXISTS "montant" DECIMAL(15,2);
ALTER TABLE "Prefinancement" ADD COLUMN IF NOT EXISTS "montant_xof" DECIMAL(15,2);
ALTER TABLE "Prefinancement" ADD COLUMN IF NOT EXISTS "taux_change" DECIMAL(15,6);
ALTER TABLE "Prefinancement" ADD COLUMN IF NOT EXISTS "montant_utilise" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Prefinancement" ADD COLUMN IF NOT EXISTS "montant_utilise_xof" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Prefinancement" ADD COLUMN IF NOT EXISTS "montant_restant" DECIMAL(15,2);
ALTER TABLE "Prefinancement" ADD COLUMN IF NOT EXISTS "montant_restant_xof" DECIMAL(15,2);

UPDATE "Prefinancement" SET
    "montant" = COALESCE("montant_max", 0),
    "montant_xof" = COALESCE("montant_max", 0),
    "taux_change" = 1,
    "montant_utilise" = COALESCE("utilise", 0),
    "montant_utilise_xof" = COALESCE("utilise", 0),
    "montant_restant" = COALESCE("montant_max", 0) - COALESCE("utilise", 0),
    "montant_restant_xof" = COALESCE("montant_max", 0) - COALESCE("utilise", 0)
WHERE "montant" IS NULL;

ALTER TABLE "Prefinancement" ALTER COLUMN "montant" SET NOT NULL;
ALTER TABLE "Prefinancement" ALTER COLUMN "montant_xof" SET NOT NULL;
ALTER TABLE "Prefinancement" ALTER COLUMN "taux_change" SET NOT NULL;
ALTER TABLE "Prefinancement" ALTER COLUMN "montant_restant" SET NOT NULL;
ALTER TABLE "Prefinancement" ALTER COLUMN "montant_restant_xof" SET NOT NULL;

ALTER TABLE "Prefinancement" DROP COLUMN IF EXISTS "montant_max";
ALTER TABLE "Prefinancement" DROP COLUMN IF EXISTS "utilise";

-- CreateIndex
CREATE UNIQUE INDEX "devises_code_key" ON "devises"("code");
CREATE INDEX "devises_code_idx" ON "devises"("code");
CREATE INDEX "devises_is_default_idx" ON "devises"("is_default");

-- CreateIndex
ALTER TABLE "taux_changes" ADD CONSTRAINT "taux_changes_devise_source_id_fkey" FOREIGN KEY ("devise_source_id") REFERENCES "devises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "taux_changes_devise_source_id_date_debut_idx" ON "taux_changes"("devise_source_id", "date_debut");
CREATE INDEX "taux_changes_devise_source_code_date_debut_idx" ON "taux_changes"("devise_source_code", "date_debut");

-- CreateIndex
CREATE INDEX "Marche_devise_id_idx" ON "Marche"("devise_id");
