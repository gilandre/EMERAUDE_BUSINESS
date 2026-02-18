export type ReportTable = "Marche" | "Accompte" | "Decaissement" | "Activite";

export type ReportColumn = string;

export type ReportFilter = {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: string | number | string[] | number[];
};

export type ReportAggregation = "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
export type ReportGroupBy = "month" | "category" | "type" | "statut" | "marche";

export interface ReportQueryConfig {
  tables: ReportTable[];
  columns: Array<{ table: ReportTable; field: string; alias?: string; aggregate?: ReportAggregation }>;
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy[];
  sortBy?: { field: string; order: "asc" | "desc" }[];
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportTemplate {
  code: string;
  libelle: string;
  type: string;
  config: ReportQueryConfig;
}
