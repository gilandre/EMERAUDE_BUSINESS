/**
 * Labels lisibles pour les codes internes de la base de données.
 * Utilisé dans l'UI et dans la génération de rapports.
 */

// ── Statut décaissement ────────────────────────────────────
export const STATUT_DECAISSEMENT_LABELS: Record<string, string> = {
  PREVU: "Prévu",
  VALIDE: "Validé",
  PAYE: "Payé",
  ANNULE: "Annulé",
};

// ── Source décaissement ────────────────────────────────────
export const SOURCE_LABELS: Record<string, string> = {
  TRESORERIE: "Trésorerie",
  PREFINANCEMENT: "Préfinancement",
};

// ── Statut marché ──────────────────────────────────────────
export const STATUT_MARCHE_LABELS: Record<string, string> = {
  actif: "Actif",
  termine: "Clôturé",
  suspendu: "Suspendu",
};

// ── Devises ────────────────────────────────────────────────
export const DEVISE_LABELS: Record<string, string> = {
  XOF: "XOF (Franc CFA)",
  EUR: "EUR (Euro)",
  USD: "USD (Dollar)",
  GBP: "GBP (Livre)",
};

// ── Type d'activité ──────────────────────────────────────
export const TYPE_ACTIVITE_LABELS: Record<string, string> = {
  MISSION: "Mission",
  EVENEMENT: "Événement",
  PROJET: "Projet",
  FORMATION: "Formation",
  FONCTIONNEMENT: "Fonctionnement",
  AUTRE: "Autre",
};

// ── Statut d'activité ────────────────────────────────────
export const STATUT_ACTIVITE_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  CLOTUREE: "Clôturée",
  ARCHIVEE: "Archivée",
};

// ── Sens mouvement ───────────────────────────────────────
export const SENS_MOUVEMENT_LABELS: Record<string, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
};

// ── Canaux d'alerte ────────────────────────────────────────
export const CANAL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
  webhook: "Webhook",
};

// ── Actions audit ──────────────────────────────────────────
export const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
};

// ── Entités audit ──────────────────────────────────────────
export const ENTITY_LABELS: Record<string, string> = {
  Marche: "Marché",
  Accompte: "Encaissement",
  Decaissement: "Décaissement",
  User: "Utilisateur",
  Profil: "Profil",
  Alerte: "Alerte",
  Prefinancement: "Préfinancement",
  Devise: "Devise",
  Menu: "Menu",
  Rapport: "Rapport",
  Activite: "Activité",
  MouvementActivite: "Mouvement activité",
};

// ── Helper générique ───────────────────────────────────────
export function label(map: Record<string, string>, code: string | null | undefined): string {
  if (!code) return "—";
  return map[code] ?? code;
}
