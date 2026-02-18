-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "TypeActivite" AS ENUM ('MISSION', 'EVENEMENT', 'PROJET', 'FORMATION', 'FONCTIONNEMENT', 'AUTRE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatutActivite" AS ENUM ('ACTIVE', 'CLOTUREE', 'ARCHIVEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SensMouvement" AS ENUM ('ENTREE', 'SORTIE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "activites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "type" "TypeActivite" NOT NULL DEFAULT 'AUTRE',
    "statut" "StatutActivite" NOT NULL DEFAULT 'ACTIVE',
    "budget_previsionnel" DECIMAL(15,2),
    "budget_previsionnel_xof" DECIMAL(15,2),
    "devise_id" TEXT NOT NULL,
    "devise_code" TEXT NOT NULL DEFAULT 'XOF',
    "taux_change_creation" DECIMAL(15,6) NOT NULL,
    "total_entrees" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_entrees_xof" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_sorties" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_sorties_xof" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "solde" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "solde_xof" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "date_debut" TIMESTAMP(3),
    "date_fin" TIMESTAMP(3),
    "responsable_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mouvements_activite" (
    "id" TEXT NOT NULL,
    "activite_id" TEXT NOT NULL,
    "sens" "SensMouvement" NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "montant_xof" DECIMAL(15,2) NOT NULL,
    "taux_change" DECIMAL(15,6) NOT NULL,
    "date_mouvement" TIMESTAMP(3) NOT NULL,
    "categorie" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "motif" TEXT,
    "beneficiaire" TEXT,
    "beneficiaire_id" TEXT,
    "mode_paiement" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mouvements_activite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "activites_code_key" ON "activites"("code");
CREATE INDEX IF NOT EXISTS "activites_statut_idx" ON "activites"("statut");
CREATE INDEX IF NOT EXISTS "activites_type_idx" ON "activites"("type");
CREATE INDEX IF NOT EXISTS "activites_updated_at_idx" ON "activites"("updated_at" DESC);
CREATE INDEX IF NOT EXISTS "activites_devise_id_idx" ON "activites"("devise_id");
CREATE INDEX IF NOT EXISTS "activites_responsable_id_idx" ON "activites"("responsable_id");

CREATE INDEX IF NOT EXISTS "mouvements_activite_activite_id_idx" ON "mouvements_activite"("activite_id");
CREATE INDEX IF NOT EXISTS "mouvements_activite_date_mouvement_idx" ON "mouvements_activite"("date_mouvement" DESC);
CREATE INDEX IF NOT EXISTS "mouvements_activite_sens_idx" ON "mouvements_activite"("sens");
CREATE INDEX IF NOT EXISTS "mouvements_activite_beneficiaire_id_idx" ON "mouvements_activite"("beneficiaire_id");

-- AddForeignKey (use mapped table names: "devises" not "Devise")
DO $$ BEGIN
  ALTER TABLE "activites" ADD CONSTRAINT "activites_devise_id_fkey"
    FOREIGN KEY ("devise_id") REFERENCES "devises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "activites" ADD CONSTRAINT "activites_responsable_id_fkey"
    FOREIGN KEY ("responsable_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "mouvements_activite" ADD CONSTRAINT "mouvements_activite_activite_id_fkey"
    FOREIGN KEY ("activite_id") REFERENCES "activites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "mouvements_activite" ADD CONSTRAINT "mouvements_activite_beneficiaire_id_fkey"
    FOREIGN KEY ("beneficiaire_id") REFERENCES "Beneficiaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
