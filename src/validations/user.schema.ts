import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  profilId: z.string().optional(),
  mobileAccess: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  profilId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  mobileAccess: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
