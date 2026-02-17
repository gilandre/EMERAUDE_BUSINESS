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
  password: z.string().min(8, "Minimum 8 caractères").optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  profilId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  mobileAccess: z.boolean().optional(),
  failedLoginAttempts: z.number().int().min(0).optional(),
  lockedUntil: z.coerce.date().nullable().optional(),
  mustChangePassword: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
