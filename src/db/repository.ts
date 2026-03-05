import { getDb } from "./client";
import { ensureDemoDatabaseSeeded } from "./seed";
import { runtimeConfig } from "../config/runtime";
import type {
  AnalyticsColumn,
  AnalyticsDatasetDescriptor,
  AnalyticsQueryRequest,
  AnalyticsQueryResponse,
  AnalyticsScalar,
} from "../lib/analytics/contracts";
import type { FeedItemModel } from "../ui/components/FeedList";
import type { ItemAction, ItemListEntry } from "../ui/components/ItemList";
import type { KpiCardModel } from "../ui/components/KpiCard";
import type { MeterRowModel } from "../ui/components/MeterRow";
import type { DatasetOption } from "../ui/components/DataTablePanel";

interface RawKpiRow {
  label: string;
  value: string;
  trend: string;
  tone: KpiCardModel["tone"];
}

interface RawPipelineRow {
  label: string;
  value_label: string;
  percent: number;
}

interface RawFeedRow {
  meta: string;
  text: string;
}

interface RawItemRow {
  id: string;
  title: string;
  meta: string;
}

interface RawUserRow {
  id: string;
  full_name: string;
  app_role: "member" | "admin";
  role_title: string;
  email: string;
  region: string;
  territory: string;
  last_active: string;
}

interface AuthStateRow {
  signed_in: number;
  user_id: string | null;
  user_name: string;
  role: "member" | "admin";
  provider: string;
  tenant_id: string;
}

interface CatalogRow {
  dataset_key: string;
  label: string;
  table_name: string;
}

interface TableInfoRow {
  name: string;
  type: string;
}

export interface AuthState {
  signedIn: boolean;
  userId: string;
  userName: string;
  role: "member" | "admin";
  provider: string;
  tenantId: string;
}

export interface SignInUserOption {
  id: string;
  fullName: string;
  appRole: "member" | "admin";
  roleTitle: string;
}

function ensureSeedDataForDemo() {
  if (runtimeConfig.demoMode) ensureDemoDatabaseSeeded();
}

export function getOverviewSnapshot() {
  ensureSeedDataForDemo();
  const db = getDb();
  const kpis = db
    .query<RawKpiRow, []>("SELECT label, value, trend, tone FROM kpi_metrics ORDER BY sort_order ASC")
    .all()
    .map((row) => ({
      label: row.label,
      value: row.value,
      trend: row.trend,
      tone: row.tone,
    }));

  const pipeline = db
    .query<RawPipelineRow, []>("SELECT label, value_label, percent FROM pipeline_metrics ORDER BY sort_order ASC")
    .all()
    .map((row): MeterRowModel => ({
      label: row.label,
      valueLabel: row.value_label,
      percent: row.percent,
    }));

  const feed = db
    .query<RawFeedRow, []>("SELECT meta, text FROM signal_feed ORDER BY sort_order ASC")
    .all()
    .map((row): FeedItemModel => ({
      meta: row.meta,
      text: row.text,
    }));

  return { kpis, pipeline, feed };
}

export function getSavedItems(role: "member" | "admin") {
  ensureSeedDataForDemo();
  const db = getDb();
  const rows = db.query<RawItemRow, []>("SELECT id, title, meta FROM saved_items ORDER BY sort_order ASC").all();
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    meta: row.meta,
    actions: role === "admin" ? (["open", "edit", "delete"] as ItemAction[]) : (["open", "edit"] as ItemAction[]),
  }));
}

export function getUsers(role: "member" | "admin") {
  ensureSeedDataForDemo();
  const db = getDb();
  const rows = db
    .query<RawUserRow, []>(
      "SELECT id, full_name, app_role, role_title, email, region, territory, last_active FROM users ORDER BY sort_order ASC",
    )
    .all();

  return rows.map((row): ItemListEntry => ({
    id: row.id,
    title: row.full_name,
    meta: `${row.role_title} | ${row.region} (${row.territory}) | ${row.email} | Last active: ${row.last_active}`,
    actions: role === "admin" ? (["open", "edit", "delete"] as ItemAction[]) : (["open", "edit"] as ItemAction[]),
  }));
}

export function listSignInUsers() {
  ensureSeedDataForDemo();
  const db = getDb();
  return db
    .query<RawUserRow, []>("SELECT id, full_name, app_role, role_title, email, region, territory, last_active FROM users ORDER BY sort_order ASC")
    .all()
    .map((row): SignInUserOption => ({
      id: row.id,
      fullName: row.full_name,
      appRole: row.app_role,
      roleTitle: row.role_title,
    }));
}

export function getAuthState() {
  ensureSeedDataForDemo();
  const db = getDb();
  const row = db
    .query<AuthStateRow, []>("SELECT signed_in, user_id, user_name, role, provider, tenant_id FROM auth_state WHERE singleton_id = 1")
    .get();

  if (!row || row.signed_in !== 1 || !row.user_id) {
    return {
      signedIn: false,
      userId: "guest",
      userName: "Guest",
      role: "member" as const,
      provider: "bi",
      tenantId: "tenant-demo",
    };
  }

  return {
    signedIn: true,
    userId: row.user_id,
    userName: row.user_name,
    role: row.role,
    provider: row.provider,
    tenantId: row.tenant_id,
  };
}

export function signInByUserId(userId: string, provider = "bi", tenantId = "tenant-demo") {
  ensureSeedDataForDemo();
  const db = getDb();
  const user = db
    .query<RawUserRow, [string]>("SELECT id, full_name, app_role, role_title, email, region, territory, last_active FROM users WHERE id = ?")
    .get(userId);

  if (!user) return false;

  db.query(
    `
      INSERT INTO auth_state (singleton_id, signed_in, user_id, user_name, role, provider, tenant_id)
      VALUES (1, 1, ?, ?, ?, ?, ?)
      ON CONFLICT(singleton_id) DO UPDATE SET
        signed_in = excluded.signed_in,
        user_id = excluded.user_id,
        user_name = excluded.user_name,
        role = excluded.role,
        provider = excluded.provider,
        tenant_id = excluded.tenant_id
    `,
  ).run(user.id, user.full_name, user.app_role, provider, tenantId);

  return true;
}

export function signOut() {
  ensureSeedDataForDemo();
  const db = getDb();
  db.query(
    `
      INSERT INTO auth_state (singleton_id, signed_in, user_id, user_name, role, provider, tenant_id)
      VALUES (1, 0, NULL, 'Guest', 'member', 'bi', 'tenant-demo')
      ON CONFLICT(singleton_id) DO UPDATE SET
        signed_in = 0,
        user_id = NULL,
        user_name = 'Guest',
        role = 'member',
        provider = 'bi',
        tenant_id = 'tenant-demo'
    `,
  ).run();
}

export function getDatasetOptions() {
  ensureSeedDataForDemo();
  const db = getDb();
  const rows = db
    .query<CatalogRow, []>("SELECT dataset_key, label, table_name FROM dataset_catalog ORDER BY sort_order ASC")
    .all();
  return rows.map((row): DatasetOption => ({ key: row.dataset_key, label: row.label }));
}

function toSafeIdentifier(name: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;
  return `"${name.replaceAll('"', '""')}"`;
}

function guessDateTypeFromValue(value: AnalyticsScalar | undefined) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return "date" as const;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) return "time" as const;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(text)) return "datetime" as const;
  return null;
}

function inferAnalyticsType(sqliteType: string, columnName = "", sampleValue?: AnalyticsScalar): AnalyticsColumn["type"] {
  const normalized = sqliteType.toLowerCase();
  const key = columnName.toLowerCase();
  const dateHint = /(^|_)(date|time|month|quarter|year|week|day|timestamp|at)$/.test(key);

  if (normalized.includes("date") || normalized.includes("time")) {
    if (normalized.includes("time") && normalized.includes("date")) return "datetime";
    if (normalized.includes("time")) return "time";
    return "date";
  }

  if (dateHint) {
    const fromValue = guessDateTypeFromValue(sampleValue);
    if (fromValue) return fromValue;
    return key.endsWith("_at") || key.includes("time") ? "datetime" : "date";
  }

  if (key.endsWith("_usd") || key.includes("revenue") || key.includes("price") || key.includes("amount") || key.includes("value")) {
    return "currency_usd";
  }
  if (key.includes("pct") || key.includes("percent") || key.includes("ratio") || key.includes("rate")) {
    return "percent";
  }

  if (normalized.includes("int") || normalized.includes("real") || normalized.includes("numeric") || normalized.includes("dec")) {
    return "number";
  }

  const dateFromValue = guessDateTypeFromValue(sampleValue);
  if (dateFromValue) return dateFromValue;

  return "string";
}

function getDatasetCatalogRow(datasetKey: string) {
  ensureSeedDataForDemo();
  const db = getDb();
  return (
    db
      .query<CatalogRow, [string]>("SELECT dataset_key, label, table_name FROM dataset_catalog WHERE dataset_key = ?")
      .get(datasetKey) ?? null
  );
}

function getDatasetColumns(tableName: string): TableInfoRow[] {
  const safeTable = toSafeIdentifier(tableName);
  if (!safeTable) return [];
  const db = getDb();
  return db.query<TableInfoRow, []>(`PRAGMA table_info(${safeTable})`).all();
}

function getDatasetSampleRow(tableName: string): Record<string, AnalyticsScalar> | null {
  const safeTable = toSafeIdentifier(tableName);
  if (!safeTable) return null;
  const db = getDb();
  return db.query<Record<string, AnalyticsScalar>, []>(`SELECT * FROM ${safeTable} LIMIT 1`).get() ?? null;
}

export function listAnalyticsDatasets(): AnalyticsDatasetDescriptor[] {
  ensureSeedDataForDemo();
  const db = getDb();
  let rows: CatalogRow[] = [];
  try {
    rows = db
      .query<CatalogRow, []>("SELECT dataset_key, label, table_name FROM dataset_catalog ORDER BY sort_order ASC")
      .all();
  } catch {
    return [];
  }

  return rows
    .map((row) => {
      const safeTable = toSafeIdentifier(row.table_name);
      if (!safeTable) return null;
      const sampleRow = getDatasetSampleRow(row.table_name);
      const fields = getDatasetColumns(row.table_name).map((column): AnalyticsColumn => ({
        key: column.name,
        label: column.name,
        type: inferAnalyticsType(column.type, column.name, sampleRow?.[column.name]),
      }));
      const names = fields.map((field) => field.key);
      return {
        key: row.dataset_key,
        label: row.label,
        fields,
        capabilities: {
          filterable: names,
          sortable: names,
          pageable: true,
        },
      };
    })
    .filter((dataset): dataset is AnalyticsDatasetDescriptor => Boolean(dataset));
}

function isScalar(value: unknown): value is AnalyticsScalar {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null;
}

export function queryAnalyticsDataset(request: AnalyticsQueryRequest): AnalyticsQueryResponse | null {
  ensureSeedDataForDemo();
  const db = getDb();
  let catalog: CatalogRow | null;
  try {
    catalog = getDatasetCatalogRow(request.dataset);
  } catch {
    return null;
  }
  if (!catalog) return null;

  const safeTable = toSafeIdentifier(catalog.table_name);
  if (!safeTable) return null;

  const tableColumns = getDatasetColumns(catalog.table_name);
  const fieldMap = new Map<string, TableInfoRow>();
  for (const column of tableColumns) fieldMap.set(column.name, column);
  if (fieldMap.size === 0) return null;

  const selectFields = (request.select ?? []).filter((field) => fieldMap.has(field));
  const effectiveFields = selectFields.length > 0 ? selectFields : tableColumns.map((column) => column.name);
  const selectSql = effectiveFields.map((field) => toSafeIdentifier(field)).filter((field): field is string => Boolean(field)).join(", ");
  if (!selectSql) return null;

  const whereClauses: string[] = [];
  const bindings: Array<string | number | boolean | null> = [];
  for (const filter of request.filters ?? []) {
    if (!fieldMap.has(filter.field)) continue;
    const safeField = toSafeIdentifier(filter.field);
    if (!safeField) continue;

    if (filter.op === "eq" && isScalar(filter.value)) {
      whereClauses.push(`${safeField} = ?`);
      bindings.push(filter.value);
      continue;
    }
    if (filter.op === "neq" && isScalar(filter.value)) {
      whereClauses.push(`${safeField} != ?`);
      bindings.push(filter.value);
      continue;
    }
    if ((filter.op === "gt" || filter.op === "gte" || filter.op === "lt" || filter.op === "lte") && isScalar(filter.value)) {
      const opMap = { gt: ">", gte: ">=", lt: "<", lte: "<=" } as const;
      whereClauses.push(`${safeField} ${opMap[filter.op]} ?`);
      bindings.push(filter.value);
      continue;
    }
    if (filter.op === "contains" && typeof filter.value === "string") {
      whereClauses.push(`LOWER(CAST(${safeField} AS TEXT)) LIKE ?`);
      bindings.push(`%${filter.value.toLowerCase()}%`);
      continue;
    }
    if (filter.op === "between" && Array.isArray(filter.value) && filter.value.length >= 2) {
      const [start, end] = filter.value;
      if (isScalar(start) && isScalar(end)) {
        whereClauses.push(`${safeField} BETWEEN ? AND ?`);
        bindings.push(start, end);
      }
      continue;
    }
    if (filter.op === "in" && Array.isArray(filter.value)) {
      const values = filter.value.filter((value): value is AnalyticsScalar => isScalar(value)).slice(0, 100);
      if (values.length > 0) {
        whereClauses.push(`${safeField} IN (${values.map(() => "?").join(", ")})`);
        bindings.push(...values);
      }
    }
  }
  const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

  const orderClauses: string[] = [];
  for (const sort of request.sort ?? []) {
    if (!fieldMap.has(sort.field)) continue;
    const safeField = toSafeIdentifier(sort.field);
    if (!safeField) continue;
    orderClauses.push(`${safeField} ${sort.dir === "desc" ? "DESC" : "ASC"}`);
  }
  if (orderClauses.length === 0) {
    const firstField = toSafeIdentifier(effectiveFields[0] ?? tableColumns[0]?.name ?? "");
    if (firstField) orderClauses.push(`${firstField} ASC`);
  }
  const orderSql = ` ORDER BY ${orderClauses.join(", ")}`;

  const limit = Math.max(1, Math.min(5_000, request.page?.limit ?? 250));
  const offset = Math.max(0, request.page?.offset ?? 0);

  const rowsQuery = `SELECT ${selectSql} FROM ${safeTable}${whereSql}${orderSql} LIMIT ? OFFSET ?`;
  let rowRecords: Record<string, AnalyticsScalar>[];
  try {
    rowRecords = db.query<Record<string, AnalyticsScalar>, any[]>(rowsQuery).all(...bindings, limit, offset);
  } catch {
    return null;
  }
  const rows = rowRecords.map((record) => effectiveFields.map((field) => record[field] ?? null));
  const sampleByField = new Map<string, AnalyticsScalar>();
  for (const field of effectiveFields) {
    const firstValue = rowRecords.find((record) => record[field] != null)?.[field];
    if (firstValue !== undefined) sampleByField.set(field, firstValue);
  }

  const countQuery = `SELECT COUNT(*) as total FROM ${safeTable}${whereSql}`;
  const total = db.query<{ total: number }, any[]>(countQuery).get(...bindings)?.total ?? 0;

  const capabilitiesFields = tableColumns.map((column) => column.name);
  return {
    columns: effectiveFields.map((field) => {
      const info = fieldMap.get(field);
      return {
        key: field,
        label: field,
        type: inferAnalyticsType(info?.type ?? "text", field, sampleByField.get(field)),
      };
    }),
    rows,
    totalRows: total,
    capabilities: {
      filterable: capabilitiesFields,
      sortable: capabilitiesFields,
      pageable: true,
    },
  };
}
