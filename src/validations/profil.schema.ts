import { z } from "zod";

export const createProfilSchema = z.object({
  code: z.string().min(1, "Code requis"),
  libelle: z.string().min(1, "Libellé requis"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export const updateProfilSchema = z.object({
  code: z.string().min(1).optional(),
  libelle: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export type CreateProfilInput = z.infer<typeof createProfilSchema>;
export type UpdateProfilInput = z.infer<typeof updateProfilSchema>;
