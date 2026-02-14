-- CreateEnum
CREATE TYPE "SourceDecaissement" AS ENUM ('TRESORERIE', 'PREFINANCEMENT');

-- AlterTable: Add new columns with defaults for existing data
ALTER TABLE "Decaissement" ADD COLUMN "motif" TEXT NOT NULL DEFAULT 'Non renseigné';
ALTER TABLE "Decaissement" ADD COLUMN "beneficiaire" TEXT NOT NULL DEFAULT 'Non renseigné';
ALTER TABLE "Decaissement" ADD COLUMN "mode_paiement" TEXT;
ALTER TABLE "Decaissement" ADD COLUMN "source" "SourceDecaissement" NOT NULL DEFAULT 'TRESORERIE';

-- CreateIndex
CREATE INDEX "Decaissement_source_idx" ON "Decaissement"("source");
CREATE INDEX "Decaissement_beneficiaire_idx" ON "Decaissement"("beneficiaire");
