import { z } from "zod";

export const STATUT_DECAISSEMENT = ["PREVU", "VALIDE", "PAYE"] as const;

export const createDecaissementSchema = z.object({
  marcheId: z.string().min(1, "Marché requis"),
  montant: z.number().min(0.01, "Montant requis et > 0"),
  dateDecaissement: z.string().min(1, "Date requise"),
  statut: z.enum(STATUT_DECAISSEMENT).optional().default("VALIDE"),
  reference: z.string().optional(),
  description: z.string().optional(),
});

export const updateDecaissementSchema = createDecaissementSchema.partial().omit({ marcheId: true });

export type CreateDecaissementInput = z.infer<typeof createDecaissementSchema>;
export type UpdateDecaissementInput = z.infer<typeof updateDecaissementSchema>;
