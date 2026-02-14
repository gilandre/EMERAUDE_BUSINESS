import { z } from "zod";

export const createPrefinancementSchema = z.object({
  marcheId: z.string().min(1, "Marché requis"),
  montant: z.number().min(0, "Plafond requis"),
  montantMax: z.number().min(0).optional(), // alias pour compat
  active: z.boolean().optional(),
});

export const updatePrefinancementSchema = z.object({
  montant: z.number().min(0).optional(),
  montantMax: z.number().min(0).optional(), // alias pour compat
  active: z.boolean().optional(),
});

export type CreatePrefinancementInput = z.infer<typeof createPrefinancementSchema>;
export type UpdatePrefinancementInput = z.infer<typeof updatePrefinancementSchema>;
