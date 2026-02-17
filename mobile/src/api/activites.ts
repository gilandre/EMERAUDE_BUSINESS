import { apiFetch } from './client';

export interface Activite {
  id: string;
  code: string;
  libelle: string;
  description?: string | null;
  type: string;
  statut: string;
  deviseCode: string;
  budgetPrevisionnel?: number | null;
  totalEntrees: number;
  totalSorties: number;
  solde: number;
  soldeXOF: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  responsable?: { id: string; name: string; email: string } | null;
  _count?: { mouvements: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface MouvementActivite {
  id: string;
  sens: 'ENTREE' | 'SORTIE';
  montant: number;
  montantXOF: number;
  dateMouvement: string;
  categorie?: string | null;
  reference?: string | null;
  description?: string | null;
  motif?: string | null;
  beneficiaire?: string | null;
  modePaiement?: string | null;
}

export interface ActivitesResponse {
  data: Activite[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MouvementsResponse {
  data: MouvementActivite[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getActivites(params: URLSearchParams): Promise<ActivitesResponse> {
  return apiFetch<ActivitesResponse>(`/api/activites?${params}`);
}

export function getActivite(id: string): Promise<Activite> {
  return apiFetch<Activite>(`/api/activites/${id}`);
}

export function createActivite(data: {
  libelle: string;
  description?: string;
  type?: string;
  budgetPrevisionnel?: number;
  deviseCode?: string;
  dateDebut?: string;
  dateFin?: string;
}): Promise<Activite> {
  return apiFetch<Activite>('/api/activites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getMouvements(
  activiteId: string,
  params?: URLSearchParams,
): Promise<MouvementsResponse> {
  const qs = params ? `?${params}` : '';
  return apiFetch<MouvementsResponse>(`/api/activites/${activiteId}/mouvements${qs}`);
}

export function createMouvement(
  activiteId: string,
  data: {
    sens: 'ENTREE' | 'SORTIE';
    montant: number;
    dateMouvement: string;
    categorie?: string;
    reference?: string;
    description?: string;
    motif?: string;
    beneficiaire?: string;
    modePaiement?: string;
  },
): Promise<MouvementActivite> {
  return apiFetch<MouvementActivite>(`/api/activites/${activiteId}/mouvements`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteMouvement(
  activiteId: string,
  mouvementId: string,
): Promise<void> {
  return apiFetch<void>(`/api/activites/${activiteId}/mouvements/${mouvementId}`, {
    method: 'DELETE',
  });
}
