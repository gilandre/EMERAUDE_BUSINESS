export interface Marche {
  id: string;
  code?: string;
  libelle: string;
  montant?: number;
  dateDebut?: string;
  dateFin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Accompte {
  id: string;
  marcheId: string;
  montant: number;
  dateEncaissement: string;
  createdAt: string;
}

export interface Decaissement {
  id: string;
  marcheId: string;
  montant: number;
  dateDecaissement: string;
  createdAt: string;
}

export interface Prefinancement {
  id: string;
  marcheId: string;
  montant: number;
  montantMax?: number; // alias compat
  utilise: number;
  createdAt: string;
}
