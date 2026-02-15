import { z } from "zod";

export const createFraisDeplacementSchema = z.object({
  marcheId: z.string().min(1),
  libelle: z.string().min(1, "Libellé requis"),
  montant: z.number().positive("Le montant doit être positif"),
  devise: z.string().optional().default("XOF"),
  categorie: z.enum(["transport", "hebergement", "restauration", "carburant", "divers"]),
  date: z.string().min(1, "Date requise"),
  description: z.string().optional(),
});

export const updateFraisDeplacementSchema = z.object({
  libelle: z.string().min(1).optional(),
  montant: z.number().positive().optional(),
  categorie: z.enum(["transport", "hebergement", "restauration", "carburant", "divers"]).optional(),
  date: z.string().optional(),
  statut: z.enum(["EN_ATTENTE", "VALIDE", "PAYE", "REJETE"]).optional(),
  description: z.string().optional(),
});

export type CreateFraisDeplacementInput = z.infer<typeof createFraisDeplacementSchema>;
export type UpdateFraisDeplacementInput = z.infer<typeof updateFraisDeplacementSchema>;
