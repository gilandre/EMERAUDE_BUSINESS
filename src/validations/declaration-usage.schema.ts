import { z } from "zod";

export const createDeclarationUsageSchema = z.object({
  marcheId: z.string().min(1),
  montantRecu: z.number().positive(),
  dateReception: z.string().min(1),
  lignes: z.array(z.object({
    libelle: z.string().min(1),
    montant: z.number().positive(),
  })).optional().default([]),
});

export const updateDeclarationUsageSchema = z.object({
  statut: z.enum(["BROUILLON", "SOUMIS", "APPROUVE", "REJETE"]).optional(),
  motifRejet: z.string().optional(),
});

export const createDeclarationLigneSchema = z.object({
  libelle: z.string().min(1),
  montant: z.number().positive(),
});

export type CreateDeclarationUsageInput = z.infer<typeof createDeclarationUsageSchema>;
export type UpdateDeclarationUsageInput = z.infer<typeof updateDeclarationUsageSchema>;
export type CreateDeclarationLigneInput = z.infer<typeof createDeclarationLigneSchema>;
