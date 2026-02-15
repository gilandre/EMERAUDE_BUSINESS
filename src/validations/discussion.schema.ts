import { z } from "zod";

export const createDiscussionSchema = z.object({
  entityType: z.enum(["Marche", "Decaissement"]),
  entityId: z.string().min(1),
  sujet: z.string().optional(),
});

export const createMessageSchema = z.object({
  contenu: z.string().min(1, "Message requis"),
  type: z.enum(["MESSAGE", "SYSTEME", "FICHIER"]).optional().default("MESSAGE"),
});

export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
