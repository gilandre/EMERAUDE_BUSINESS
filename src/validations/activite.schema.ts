import { z } from "zod";

export const TYPES_ACTIVITE = ["MISSION", "EVENEMENT", "PROJET", "FORMATION", "FONCTIONNEMENT", "AUTRE"] as const;
export const STATUTS_ACTIVITE = ["ACTIVE", "CLOTUREE", "ARCHIVEE"] as const;

export const createActiviteSchema = z.object({
  libelle: z.string().min(1, "Libellé requis"),
  description: z.string().optional(),
  type: z.enum(TYPES_ACTIVITE).optional().default("AUTRE"),
  deviseId: z.string().optional(),
  deviseCode: z.string().optional(),
  budgetPrevisionnel: z.number().min(0).optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  responsableId: z.string().optional(),
});

export const updateActiviteSchema = z.object({
  libelle: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(TYPES_ACTIVITE).optional(),
  statut: z.enum(STATUTS_ACTIVITE).optional(),
  budgetPrevisionnel: z.number().min(0).nullable().optional(),
  dateDebut: z.string().nullable().optional(),
  dateFin: z.string().nullable().optional(),
  responsableId: z.string().nullable().optional(),
});

export type CreateActiviteInput = z.infer<typeof createActiviteSchema>;
export type UpdateActiviteInput = z.infer<typeof updateActiviteSchema>;
