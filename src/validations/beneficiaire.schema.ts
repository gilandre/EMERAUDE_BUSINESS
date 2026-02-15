import { z } from "zod";

export const createBeneficiaireSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  type: z.enum(["entreprise", "individu", "fournisseur"]).optional().default("entreprise"),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  adresse: z.string().optional(),
  modePaiement: z.enum(["virement", "mobile_money", "cheque", "especes"]).optional(),
  banque: z.string().optional(),
  compteBancaire: z.string().optional(),
});

export const updateBeneficiaireSchema = createBeneficiaireSchema.partial();

export type CreateBeneficiaireInput = z.infer<typeof createBeneficiaireSchema>;
export type UpdateBeneficiaireInput = z.infer<typeof updateBeneficiaireSchema>;
