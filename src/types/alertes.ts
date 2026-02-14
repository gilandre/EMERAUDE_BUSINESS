export type CanalAlerte = "email" | "sms" | "push" | "webhook";

export interface Alerte {
  id: string;
  code: string;
  libelle: string;
  canaux: CanalAlerte[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  alerteId: string;
  canal: CanalAlerte;
  destinataire: string;
  sujet?: string;
  corps: string;
  envoyee: boolean;
  createdAt: string;
}
