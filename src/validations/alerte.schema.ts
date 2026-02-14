import { z } from "zod";

const canalAlerte = z.enum(["email", "sms", "push", "webhook"]);
const typeDestinataire = z.enum(["user", "email", "phone"]);

export const destinataireSchema = z.object({
  type: typeDestinataire.default("email"),
  valeur: z.string().min(1, "Destinataire requis"),
  canal: canalAlerte.default("email"),
});

export const createAlerteSchema = z.object({
  code: z.string().min(1, "Code requis"),
  libelle: z.string().min(1, "Libellé requis"),
  description: z.string().optional().nullable(),
  canaux: z.array(canalAlerte).min(1, "Au moins un canal"),
  regle: z.record(z.unknown()).optional().nullable(),
  seuils: z.record(z.unknown()).optional().nullable(),
  active: z.boolean().optional().default(true),
  alerteDestinataires: z.array(destinataireSchema).optional(),
});

export const updateAlerteSchema = z.object({
  code: z.string().min(1).optional(),
  libelle: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  canaux: z.array(canalAlerte).optional(),
  regle: z.record(z.unknown()).optional().nullable(),
  seuils: z.record(z.unknown()).optional().nullable(),
  active: z.boolean().optional(),
  alerteDestinataires: z.array(destinataireSchema).optional(),
});

export type CreateAlerteInput = z.infer<typeof createAlerteSchema>;
export type UpdateAlerteInput = z.infer<typeof updateAlerteSchema>;
