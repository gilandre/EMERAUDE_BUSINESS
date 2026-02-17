import { z } from "zod";

export const SENS_MOUVEMENT = ["ENTREE", "SORTIE"] as const;
export const MODES_PAIEMENT_MVT = ["especes", "virement", "cheque", "mobile_money"] as const;

export const createMouvementSchema = z.object({
  sens: z.enum(SENS_MOUVEMENT),
  montant: z.number().min(0.01, "Montant requis et > 0"),
  dateMouvement: z.string().min(1, "Date requise"),
  categorie: z.string().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
  motif: z.string().optional(),
  beneficiaire: z.string().optional(),
  beneficiaireId: z.string().optional(),
  modePaiement: z.enum(MODES_PAIEMENT_MVT).optional(),
});

export type CreateMouvementInput = z.infer<typeof createMouvementSchema>;

export const updateMouvementSchema = z.object({
  sens: z.enum(SENS_MOUVEMENT).optional(),
  montant: z.number().min(0.01, "Montant requis et > 0").optional(),
  dateMouvement: z.string().min(1, "Date requise").optional(),
  categorie: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  motif: z.string().nullable().optional(),
  beneficiaire: z.string().nullable().optional(),
  beneficiaireId: z.string().nullable().optional(),
  modePaiement: z.enum(MODES_PAIEMENT_MVT).nullable().optional(),
});

export type UpdateMouvementInput = z.infer<typeof updateMouvementSchema>;
