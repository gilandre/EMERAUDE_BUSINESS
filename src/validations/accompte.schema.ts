import { z } from "zod";

export const createAccompteSchema = z.object({
  marcheId: z.string().min(1, "Marché requis"),
  montant: z.number().min(0.01, "Montant requis et > 0"),
  dateEncaissement: z.string().min(1, "Date requise"),
  reference: z.string().optional(),
  description: z.string().optional(),
});

export const updateAccompteSchema = createAccompteSchema.partial().omit({ marcheId: true });

export type CreateAccompteInput = z.infer<typeof createAccompteSchema>;
export type UpdateAccompteInput = z.infer<typeof updateAccompteSchema>;
