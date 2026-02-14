import { z } from "zod";

export const createMarcheSchema = z.object({
  code: z.string().min(1, "Code requis").optional(),
  libelle: z.string().min(1, "Libellé requis"),
  montant: z.number().min(0, "Montant >= 0"),
  deviseId: z.string().optional(),
  deviseCode: z.string().optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  statut: z.enum(["actif", "termine", "suspendu"]).optional(),
});

export const updateMarcheSchema = createMarcheSchema.partial();

export type CreateMarcheInput = z.infer<typeof createMarcheSchema>;
export type UpdateMarcheInput = z.infer<typeof updateMarcheSchema>;
