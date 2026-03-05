import type { Database } from "bun:sqlite";
import { getDb } from "./client";

export interface SeedOptions {
  reset?: boolean;
  db?: Database;
}

interface InsertOrderRow {
  order_no: string;
  customer_name: string;
  status: string;
  region: string;
  line_items: number;
  total_usd: number;
  ordered_at: string;
}

interface InsertAccountRow {
  account_code: string;
  company_name: string;
  buyer_email: string;
  region: string;
  lifetime_value_usd: number;
  order_count: number;
  last_purchase_date: string;
}

interface InsertInventoryRow {
  sku: string;
  product_name: string;
  category: string;
  on_hand_units: number;
  reorder_point: number;
  warehouse: string;
  inventory_health: string;
}

function runSqlBatch(db: Database, sql: string) {
  for (const statement of sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)) {
    db.run(statement);
  }
}

export function seedDemoDatabase(options: SeedOptions = {}) {
  const db = options.db ?? getDb();

  if (options.reset) {
    runSqlBatch(
      db,
      `
      DROP TABLE IF EXISTS kpi_metrics;
      DROP TABLE IF EXISTS pipeline_metrics;
      DROP TABLE IF EXISTS signal_feed;
      DROP TABLE IF EXISTS saved_items;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS dataset_catalog;
      DROP TABLE IF EXISTS dataset_orders;
      DROP TABLE IF EXISTS dataset_accounts;
      DROP TABLE IF EXISTS dataset_inventory;
    `,
    );
  }

  runSqlBatch(
    db,
    `
    CREATE TABLE IF NOT EXISTS kpi_metrics (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      trend TEXT NOT NULL,
      tone TEXT NOT NULL CHECK (tone IN ('success', 'danger', 'neutral')),
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pipeline_metrics (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      value_label TEXT NOT NULL,
      percent INTEGER NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signal_feed (
      id TEXT PRIMARY KEY,
      meta TEXT NOT NULL,
      text TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      meta TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      app_role TEXT NOT NULL CHECK (app_role IN ('member', 'admin')),
      role_title TEXT NOT NULL,
      email TEXT NOT NULL,
      region TEXT NOT NULL,
      territory TEXT NOT NULL,
      last_active TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_state (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      signed_in INTEGER NOT NULL CHECK (signed_in IN (0, 1)),
      user_id TEXT,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
      provider TEXT NOT NULL,
      tenant_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dataset_catalog (
      dataset_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      table_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dataset_orders (
      order_no TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      status TEXT NOT NULL,
      region TEXT NOT NULL,
      line_items INTEGER NOT NULL,
      total_usd REAL NOT NULL,
      ordered_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dataset_accounts (
      account_code TEXT NOT NULL,
      company_name TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      region TEXT NOT NULL,
      lifetime_value_usd REAL NOT NULL,
      order_count INTEGER NOT NULL,
      last_purchase_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dataset_inventory (
      sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      on_hand_units INTEGER NOT NULL,
      reorder_point INTEGER NOT NULL,
      warehouse TEXT NOT NULL,
      inventory_health TEXT NOT NULL
    );
  `,
  );

  runSqlBatch(
    db,
    `
    DELETE FROM kpi_metrics;
    DELETE FROM pipeline_metrics;
    DELETE FROM signal_feed;
    DELETE FROM saved_items;
    DELETE FROM users;
    DELETE FROM auth_state;
    DELETE FROM dataset_catalog;
    DELETE FROM dataset_orders;
    DELETE FROM dataset_accounts;
    DELETE FROM dataset_inventory;
  `,
  );

  const insertKpi = db.prepare(`
    INSERT INTO kpi_metrics (id, label, value, trend, tone, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPipeline = db.prepare(`
    INSERT INTO pipeline_metrics (id, label, value_label, percent, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertFeed = db.prepare(`
    INSERT INTO signal_feed (id, meta, text, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertItems = db.prepare(`
    INSERT INTO saved_items (id, title, meta, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertUser = db.prepare(`
    INSERT INTO users (id, full_name, app_role, role_title, email, region, territory, last_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const upsertAuthState = db.prepare(`
    INSERT INTO auth_state (singleton_id, signed_in, user_id, user_name, role, provider, tenant_id)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(singleton_id) DO UPDATE SET
      signed_in = excluded.signed_in,
      user_id = excluded.user_id,
      user_name = excluded.user_name,
      role = excluded.role,
      provider = excluded.provider,
      tenant_id = excluded.tenant_id
  `);

  const insertCatalog = db.prepare(`
    INSERT INTO dataset_catalog (dataset_key, label, table_name, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertOrder = db.prepare(`
    INSERT INTO dataset_orders (order_no, customer_name, status, region, line_items, total_usd, ordered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAccount = db.prepare(`
    INSERT INTO dataset_accounts (account_code, company_name, buyer_email, region, lifetime_value_usd, order_count, last_purchase_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInventory = db.prepare(`
    INSERT INTO dataset_inventory (sku, product_name, category, on_hand_units, reorder_point, warehouse, inventory_health)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    const kpis = [
      ["monthly-sales", "Monthly Tool Sales", "$3.42M", "+9.6%", "success", 1],
      ["gross-margin", "Gross Margin", "28.4%", "+0.4%", "neutral", 2],
      ["active-accounts", "Active Contractor Accounts", "1,284", "+3.1%", "success", 3],
      ["backorder-rate", "Backorder Rate (30d)", "4.7%", "+0.8%", "danger", 4],
    ] as const;

    for (const row of kpis) {
      insertKpi.run(...row);
    }

    const pipeline = [
      ["quote-to-po", "Quote to Purchase Order", "62%", 62, 1],
      ["po-to-fulfillment", "PO to Fulfillment", "71%", 71, 2],
      ["fulfillment-to-invoice", "Fulfillment to Invoice", "88%", 88, 3],
    ] as const;

    for (const row of pipeline) {
      insertPipeline.run(...row);
    }

    const feed = [
      ["capacity", "Warehouse Capacity", "Dallas distribution center is running at 81% utilization.", 1],
      ["logistics", "Logistics", "Average outbound freight cost is down 2.4% week-over-week.", 2],
      ["service", "Service Desk", "Field service ticket response time improved to 3h 12m.", 3],
    ] as const;

    for (const row of feed) {
      insertFeed.run(...row);
    }

    const items = [
      [
        "revenue-by-region",
        "Revenue by Region | Cutting Tools",
        "Updated 2h ago | Owner: Sales Ops | Scope: Regional distribution",
        1,
      ],
      [
        "margin-by-supplier",
        "Margin by Supplier | Heavy Machinery",
        "Updated 5h ago | Owner: Procurement | Scope: Supplier performance",
        2,
      ],
      [
        "inventory-turns",
        "Inventory Turns | Consumables",
        "Updated 9h ago | Owner: Inventory Control | Scope: National",
        3,
      ],
      [
        "service-backlog",
        "Field Service Backlog | Lift Equipment",
        "Updated 13h ago | Owner: Service Ops | Scope: Branch-level",
        4,
      ],
      [
        "freight-exceptions",
        "Freight Exceptions | Oversized Loads",
        "Updated 1d ago | Owner: Logistics | Scope: Multi-warehouse",
        5,
      ],
      [
        "top-accounts",
        "Top 50 Accounts by Annual Spend",
        "Updated 1d ago | Owner: Commercial Finance | Scope: Enterprise",
        6,
      ],
    ] as const;

    for (const row of items) {
      insertItems.run(...row);
    }

    const users = [
      ["u-1001", "Maya Ortiz", "admin", "Regional Sales Manager", "maya.ortiz@omui-demo.com", "US South", "Texas Gulf", "15m ago", 1],
      ["u-1002", "Grant Howell", "member", "Inventory Planner", "grant.howell@omui-demo.com", "US Midwest", "Great Lakes", "43m ago", 2],
      ["u-1003", "Selene Park", "admin", "Service Operations Lead", "selene.park@omui-demo.com", "US West", "Pacific Northwest", "1h ago", 3],
      ["u-1004", "Ravi Singh", "member", "Procurement Analyst", "ravi.singh@omui-demo.com", "US South", "Lower Plains", "2h ago", 4],
      ["u-1005", "Elena Foster", "member", "Key Account Executive", "elena.foster@omui-demo.com", "US Northeast", "Metro NY", "3h ago", 5],
      ["u-1006", "Theo Brennan", "member", "Warehouse Supervisor", "theo.brennan@omui-demo.com", "US Midwest", "Central Hub", "5h ago", 6],
    ] as const;

    for (const row of users) {
      insertUser.run(...row);
    }

    upsertAuthState.run(1, "u-1001", "Maya Ortiz", "admin", "bi", "tenant-demo");

    const catalog = [
      ["orders", "Orders", "dataset_orders", 1],
      ["accounts", "Accounts", "dataset_accounts", 2],
      ["inventory", "Inventory", "dataset_inventory", 3],
    ] as const;

    for (const row of catalog) {
      insertCatalog.run(...row);
    }

    const orderRows: InsertOrderRow[] = [];
    const accountRows: InsertAccountRow[] = [];
    const inventoryRows: InsertInventoryRow[] = [];

    const customers = [
      "Atlas Torque Supply",
      "Summit Steelworks",
      "Keystone Fabrication",
      "Blue River Construction",
      "Apex Drill Systems",
      "Vector Industrial Services",
      "Ironline Energy",
      "Highland Mechanical",
    ];
    const regions = ["US South", "US West", "US Midwest", "US Northeast"];
    const orderStatuses = ["new", "processing", "fulfilled", "backordered"];
    const categories = ["Cutting Tools", "Hydraulics", "Power Tools", "Fasteners", "Safety PPE", "Material Handling"];
    const warehouses = ["Dallas DC", "Phoenix DC", "Cleveland DC", "Atlanta DC"];
    const health = ["healthy", "watch", "at-risk"];

    for (let i = 0; i < 420; i += 1) {
      // Spread orders across many months so time-series charts produce meaningful time ticks.
      const orderedAt = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000).toISOString().slice(0, 19).replace("T", " ");
      const customer = customers[i % customers.length] ?? customers[0]!;
      const status = orderStatuses[i % orderStatuses.length] ?? orderStatuses[0]!;
      const region = regions[i % regions.length] ?? regions[0]!;
      orderRows.push({
        order_no: `SO-${(910000 + i).toString()}`,
        customer_name: `${customer} #${(i % 53) + 1}`,
        status,
        region,
        line_items: (i % 12) + 1,
        total_usd: Number(((i % 750) * 36.2 + 240).toFixed(2)),
        ordered_at: orderedAt,
      });
    }

    for (let i = 0; i < 320; i += 1) {
      const customer = customers[i % customers.length] ?? customers[0]!;
      const region = regions[i % regions.length] ?? regions[0]!;
      accountRows.push({
        account_code: `ACCT-${(5000 + i).toString()}`,
        company_name: `${customer} Partners ${i % 27}`,
        buyer_email: `buyer${i}@industry-demo.com`,
        region,
        lifetime_value_usd: Number(((i % 9000) * 18.4 + 2_500).toFixed(2)),
        order_count: (i % 60) + 3,
        last_purchase_date: new Date(Date.UTC(2026, 1, 28) - i * 86_400_000).toISOString().slice(0, 10),
      });
    }

    for (let i = 0; i < 360; i += 1) {
      const category = categories[i % categories.length] ?? categories[0]!;
      const warehouse = warehouses[i % warehouses.length] ?? warehouses[0]!;
      const healthValue = health[i % health.length] ?? health[0]!;
      inventoryRows.push({
        sku: `SKU-${(310000 + i).toString()}`,
        product_name: `Industrial ${category} Item ${i % 114}`,
        category,
        on_hand_units: (i % 420) + 12,
        reorder_point: (i % 120) + 20,
        warehouse,
        inventory_health: healthValue,
      });
    }

    for (const row of orderRows) {
      insertOrder.run(row.order_no, row.customer_name, row.status, row.region, row.line_items, row.total_usd, row.ordered_at);
    }

    for (const row of accountRows) {
      insertAccount.run(
        row.account_code,
        row.company_name,
        row.buyer_email,
        row.region,
        row.lifetime_value_usd,
        row.order_count,
        row.last_purchase_date,
      );
    }

    for (const row of inventoryRows) {
      insertInventory.run(
        row.sku,
        row.product_name,
        row.category,
        row.on_hand_units,
        row.reorder_point,
        row.warehouse,
        row.inventory_health,
      );
    }
  })();
}

export function ensureDemoDatabaseSeeded() {
  const db = getDb();
  const tableExists = (tableName: string) =>
    Boolean(
      db.query<{ name: string }, [string]>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName),
    );

  const columnExists = (tableName: string, columnName: string) => {
    if (!tableExists(tableName)) return false;
    const cols = db.query<{ name: string }, []>(`PRAGMA table_info(${tableName})`).all();
    return cols.some((col) => col.name === columnName);
  };

  const requiredTables = [
    "kpi_metrics",
    "pipeline_metrics",
    "signal_feed",
    "saved_items",
    "users",
    "dataset_catalog",
    "dataset_orders",
    "dataset_accounts",
    "dataset_inventory",
  ];

  const missingCoreTable = requiredTables.some((table) => !tableExists(table));
  if (missingCoreTable) {
    seedDemoDatabase({ db });
    return;
  }

  if (!tableExists("auth_state")) {
    runSqlBatch(
      db,
      `
      CREATE TABLE IF NOT EXISTS auth_state (
        singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
        signed_in INTEGER NOT NULL CHECK (signed_in IN (0, 1)),
        user_id TEXT,
        user_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
        provider TEXT NOT NULL,
        tenant_id TEXT NOT NULL
      );
    `,
    );
  }

  if (!columnExists("users", "app_role")) {
    db.run(`ALTER TABLE users ADD COLUMN app_role TEXT NOT NULL DEFAULT 'member';`);
    db.run(`UPDATE users SET app_role = 'admin' WHERE id IN ('u-1001', 'u-1003');`);
  }

  const kpiCount = db.query<{ total: number }, []>("SELECT COUNT(*) as total FROM kpi_metrics").get()?.total ?? 0;
  if (kpiCount === 0) {
    seedDemoDatabase({ db });
    return;
  }

  const authCount = db.query<{ total: number }, []>("SELECT COUNT(*) as total FROM auth_state").get()?.total ?? 0;
  if (authCount === 0) {
    const preferred = db
      .query<{ id: string; full_name: string; app_role: "member" | "admin" }, []>(
        "SELECT id, full_name, app_role FROM users ORDER BY CASE WHEN app_role = 'admin' THEN 0 ELSE 1 END, sort_order ASC LIMIT 1",
      )
      .get();

    if (preferred) {
      db.query(
        `
          INSERT INTO auth_state (singleton_id, signed_in, user_id, user_name, role, provider, tenant_id)
          VALUES (1, 1, ?, ?, ?, 'bi', 'tenant-demo')
        `,
      ).run(preferred.id, preferred.full_name, preferred.app_role);
    } else {
      db.query(
        `
          INSERT INTO auth_state (singleton_id, signed_in, user_id, user_name, role, provider, tenant_id)
          VALUES (1, 0, NULL, 'Guest', 'member', 'bi', 'tenant-demo')
        `,
      ).run();
    }
  }
}
