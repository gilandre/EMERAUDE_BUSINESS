import type { ReportTemplate } from "./types";

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    code: "RAPPORT_FINANCIER_MENSUEL",
    libelle: "Rapport Financier Mensuel",
    type: "financier",
    config: {
      tables: ["Marche", "Accompte", "Decaissement"],
      columns: [
        { table: "Marche", field: "code", alias: "Code marché" },
        { table: "Marche", field: "libelle", alias: "Libellé" },
        { table: "Accompte", field: "montant", aggregate: "SUM" },
        { table: "Decaissement", field: "montant", aggregate: "SUM" },
      ],
      groupBy: ["marche", "month"],
      dateFrom: "month",
      dateTo: "month",
    },
  },
  {
    code: "RAPPORT_TRESORERIE_PAR_MARCHE",
    libelle: "Rapport Trésorerie par Marché",
    type: "trésorerie",
    config: {
      tables: ["Marche", "Accompte", "Decaissement"],
      columns: [
        { table: "Marche", field: "code", alias: "Code" },
        { table: "Marche", field: "libelle", alias: "Marché" },
        { table: "Marche", field: "montant", alias: "Montant total" },
        { table: "Accompte", field: "montant", aggregate: "SUM", alias: "Encaissé" },
        { table: "Decaissement", field: "montant", aggregate: "SUM", alias: "Décaissé" },
      ],
      groupBy: ["marche"],
    },
  },
  {
    code: "RAPPORT_ACCOMPTES_DECAIEMENTS",
    libelle: "Rapport Accomptes/Décaissements",
    type: "flux",
    config: {
      tables: ["Accompte", "Decaissement"],
      columns: [
        { table: "Accompte", field: "dateEncaissement", alias: "Date" },
        { table: "Accompte", field: "montant", alias: "Encaissement" },
        { table: "Decaissement", field: "dateDecaissement", alias: "Date" },
        { table: "Decaissement", field: "montant", alias: "Décaissement" },
      ],
      groupBy: ["month"],
    },
  },
  {
    code: "RAPPORT_PREFINANCEMENTS",
    libelle: "Rapport Préfinancements",
    type: "préfinancement",
    config: {
      tables: ["Marche"],
      columns: [
        { table: "Marche", field: "code", alias: "Code" },
        { table: "Marche", field: "libelle", alias: "Marché" },
        { table: "Marche", field: "montant", alias: "Montant" },
      ],
      filters: [{ field: "statut", operator: "eq", value: "actif" }],
    },
  },
  {
    code: "RAPPORT_ALERTES_DECLENCHEES",
    libelle: "Rapport Alertes Déclenchées",
    type: "alertes",
    config: {
      tables: ["Marche"],
      columns: [],
    },
  },
  {
    code: "RAPPORT_AUDIT_UTILISATEURS",
    libelle: "Rapport Audit Utilisateurs",
    type: "audit",
    config: {
      tables: ["Marche"],
      columns: [],
    },
  },
];
