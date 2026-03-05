export type AnalyticsScalar = string | number | boolean | null;

export type AnalyticsColumnType =
  | "string"
  | "number"
  | "currency_usd"
  | "percent"
  | "date"
  | "datetime"
  | "time";

export interface AnalyticsColumn {
  key: string;
  label: string;
  type?: AnalyticsColumnType | undefined;
}

export type AnalyticsRowObject = Record<string, AnalyticsScalar>;

export type AnalyticsDataInput =
  | AnalyticsRowObject[]
  | {
      columns: AnalyticsColumn[];
      rows: Array<AnalyticsScalar[] | AnalyticsRowObject>;
    };

export interface QueryFilter {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "between" | "in";
  value: AnalyticsScalar | AnalyticsScalar[];
}

export interface QuerySort {
  field: string;
  dir: "asc" | "desc";
}

export interface AnalyticsQueryRequest {
  dataset: string;
  select?: string[] | undefined;
  filters?: QueryFilter[] | undefined;
  sort?: QuerySort[] | undefined;
  page?: { offset: number; limit: number } | undefined;
}

export interface AnalyticsQueryResponse {
  columns: Array<{ key: string; label: string; type?: string | undefined }>;
  rows: AnalyticsScalar[][];
  totalRows: number;
  capabilities: { filterable: string[]; sortable: string[]; pageable: boolean };
}

export interface AnalyticsDatasetDescriptor {
  key: string;
  label: string;
  fields: AnalyticsColumn[];
  capabilities: { filterable: string[]; sortable: string[]; pageable: boolean };
}
