import { z } from "zod";

export const STATUT_DECAISSEMENT = ["PREVU", "VALIDE", "PAYE"] as const;
export const SOURCES_DECAISSEMENT = ["TRESORERIE", "PREFINANCEMENT"] as const;
export const MODES_PAIEMENT = ["especes", "virement", "cheque", "mobile_money"] as const;

export const createDecaissementSchema = z.object({
  marcheId: z.string().min(1, "Marché requis"),
  montant: z.number().min(0.01, "Montant requis et > 0"),
  dateDecaissement: z.string().min(1, "Date requise"),
  statut: z.enum(STATUT_DECAISSEMENT).optional().default("VALIDE"),
  reference: z.string().optional(),
  description: z.string().optional(),
  motif: z.string().min(1, "Motif requis"),
  beneficiaire: z.string().min(1, "Bénéficiaire requis"),
  modePaiement: z.enum(MODES_PAIEMENT).optional(),
  source: z.enum(SOURCES_DECAISSEMENT).optional().default("TRESORERIE"),
});

export const updateDecaissementSchema = createDecaissementSchema.partial().omit({ marcheId: true });

export type CreateDecaissementInput = z.infer<typeof createDecaissementSchema>;
export type UpdateDecaissementInput = z.infer<typeof updateDecaissementSchema>;
