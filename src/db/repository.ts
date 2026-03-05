import { getDb } from "./client";
import { ensureDemoDatabaseSeeded } from "./seed";
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

export interface TablePayload {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Array<string | number>>;
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

export function getOverviewSnapshot() {
  ensureDemoDatabaseSeeded();
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
  ensureDemoDatabaseSeeded();
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
  ensureDemoDatabaseSeeded();
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
  ensureDemoDatabaseSeeded();
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
  ensureDemoDatabaseSeeded();
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
  ensureDemoDatabaseSeeded();
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
  ensureDemoDatabaseSeeded();
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
  ensureDemoDatabaseSeeded();
  const db = getDb();
  const rows = db
    .query<CatalogRow, []>("SELECT dataset_key, label, table_name FROM dataset_catalog ORDER BY sort_order ASC")
    .all();
  return rows.map((row): DatasetOption => ({ key: row.dataset_key, label: row.label }));
}

function getDatasetTableName(datasetKey: string) {
  ensureDemoDatabaseSeeded();
  const db = getDb();
  const row = db
    .query<CatalogRow, [string]>("SELECT dataset_key, label, table_name FROM dataset_catalog WHERE dataset_key = ?")
    .get(datasetKey);
  return row?.table_name ?? null;
}

export function getDatasetPayload(datasetKey: string, maxRows = 2_000): TablePayload | null {
  ensureDemoDatabaseSeeded();
  const db = getDb();
  const tableName = getDatasetTableName(datasetKey);
  if (!tableName) return null;

  const columnsInfo = db.query<{ name: string }, []>(`PRAGMA table_info(${tableName})`).all();
  const columnNames = columnsInfo.map((col) => col.name);
  if (columnNames.length === 0) return null;

  const safeLimit = Math.max(1, Math.min(20_000, maxRows | 0));
  const rows = db
    .query<Record<string, string | number>, []>(`SELECT * FROM ${tableName} LIMIT ${safeLimit}`)
    .all()
    .map((row) =>
      columnNames.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return "";
        return value;
      }),
    );

  return {
    columns: columnNames.map((name) => ({ key: name, label: name })),
    rows,
  };
}
