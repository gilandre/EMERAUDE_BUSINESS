import { z } from "zod";

export const createJustificatifSchema = z.object({
  entityType: z.enum(["Decaissement", "FraisDeplacement", "DeclarationLigne"]),
  entityId: z.string().min(1),
  description: z.string().optional(),
});

export type CreateJustificatifInput = z.infer<typeof createJustificatifSchema>;
