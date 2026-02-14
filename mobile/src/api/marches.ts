import { apiFetch } from './client';

export interface MarcheDetail {
  id: string;
  code: string;
  libelle: string;
  montantTotal: number;
  montantTotalXOF: number;
  deviseCode: string;
  statut: string;
  dateDebut: string | null;
  dateFin: string | null;
  accomptes: Accompte[];
  decaissements: Decaissement[];
  prefinancement: Prefinancement | null;
  synthese?: {
    totalEncaissements: number;
    totalDecaissements: number;
    totalEncaissementsXOF?: number;
    totalDecaissementsXOF?: number;
    solde: number;
    soldeXOF: number;
    prefinancementMax: number;
    prefinancementUtilise: number;
  };
}

export interface Accompte {
  id: string;
  marcheId: string;
  montant: number;
  dateEncaissement: string;
  reference?: string | null;
  description?: string | null;
}

export interface Decaissement {
  id: string;
  marcheId: string;
  montant: number;
  dateDecaissement: string;
  statut: string;
  reference?: string | null;
  description?: string | null;
  motif?: string;
  beneficiaire?: string;
  modePaiement?: string | null;
  source?: string;
}

export interface Prefinancement {
  id: string;
  marcheId: string;
  montant: number;
  montantUtilise: number;
  montantRestant: number;
  active: boolean;
}

export function getMarche(id: string): Promise<MarcheDetail> {
  return apiFetch<MarcheDetail>(`/api/marches/${id}`);
}

export function createMarche(data: {
  libelle: string;
  montant: number;
  deviseCode?: string;
  dateDebut?: string;
  dateFin?: string;
}): Promise<{ id: string; code: string; libelle: string }> {
  return apiFetch('/api/marches', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createAccompte(data: {
  marcheId: string;
  montant: number;
  dateEncaissement: string;
  reference?: string;
  description?: string;
}): Promise<Accompte> {
  return apiFetch<Accompte>('/api/accomptes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createDecaissement(data: {
  marcheId: string;
  montant: number;
  dateDecaissement: string;
  statut?: string;
  reference?: string;
  description?: string;
  motif: string;
  beneficiaire: string;
  modePaiement?: string;
  source?: string;
}): Promise<Decaissement> {
  return apiFetch<Decaissement>('/api/decaissements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getPrefinancement(marcheId: string): Promise<Prefinancement | null> {
  return apiFetch<Prefinancement | null>(`/api/prefinancements?marcheId=${marcheId}`);
}

export function createOrUpdatePrefinancement(data: {
  marcheId: string;
  montant: number;
  active?: boolean;
}): Promise<Prefinancement> {
  return apiFetch<Prefinancement>('/api/prefinancements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
