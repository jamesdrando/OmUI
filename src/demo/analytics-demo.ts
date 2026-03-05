import type {
  AnalyticsColumn,
  AnalyticsDatasetDescriptor,
  AnalyticsQueryRequest,
  AnalyticsQueryResponse,
  AnalyticsScalar,
  QueryFilter,
} from "../lib/analytics/contracts";

interface DemoDataset {
  key: string;
  label: string;
  fields: AnalyticsColumn[];
  rows: AnalyticsScalar[][];
}

const demoDatasets: DemoDataset[] = [
  {
    key: "monthly_revenue",
    label: "Monthly Revenue (USD)",
    fields: [
      { key: "month", label: "month", type: "date" },
      { key: "revenue_usd", label: "revenue_usd", type: "currency_usd" },
      { key: "gross_margin_pct", label: "gross_margin_pct", type: "percent" },
      { key: "region", label: "region", type: "string" },
    ],
    rows: [
      ["2025-01-01", 1240000, 0.2812, "US South"],
      ["2025-02-01", 1195000, 0.2748, "US West"],
      ["2025-03-01", 1312000, 0.2884, "US Midwest"],
      ["2025-04-01", 1381000, 0.2962, "US Northeast"],
      ["2025-05-01", 1425000, 0.3018, "US South"],
      ["2025-06-01", 1478000, 0.3094, "US West"],
      ["2025-07-01", 1524000, 0.3141, "US Midwest"],
      ["2025-08-01", 1589000, 0.3197, "US Northeast"],
      ["2025-09-01", 1632000, 0.3222, "US South"],
      ["2025-10-01", 1684000, 0.3275, "US West"],
      ["2025-11-01", 1721000, 0.3329, "US Midwest"],
      ["2025-12-01", 1793000, 0.3394, "US Northeast"],
    ],
  },
  {
    key: "channel_mix",
    label: "Channel Mix",
    fields: [
      { key: "channel", label: "channel", type: "string" },
      { key: "spend_usd", label: "spend_usd", type: "currency_usd" },
      { key: "conversion_rate", label: "conversion_rate", type: "percent" },
      { key: "month", label: "month", type: "date" },
    ],
    rows: [
      ["Search", 420000, 0.0731, "2025-12-01"],
      ["Email", 210000, 0.1224, "2025-12-01"],
      ["Partner", 265000, 0.0941, "2025-12-01"],
      ["Direct", 315000, 0.0817, "2025-12-01"],
      ["Social", 178000, 0.0562, "2025-12-01"],
      ["Events", 231000, 0.0633, "2025-12-01"],
    ],
  },
  {
    key: "product_margins",
    label: "Product Margins",
    fields: [
      { key: "product_line", label: "product_line", type: "string" },
      { key: "net_sales_usd", label: "net_sales_usd", type: "currency_usd" },
      { key: "margin_pct", label: "margin_pct", type: "percent" },
      { key: "quarter", label: "quarter", type: "string" },
    ],
    rows: [
      ["Cutting Tools", 910000, 0.3372, "Q4 2025"],
      ["Hydraulics", 780000, 0.2918, "Q4 2025"],
      ["Power Tools", 845000, 0.3045, "Q4 2025"],
      ["Fasteners", 662000, 0.2494, "Q4 2025"],
      ["Safety PPE", 504000, 0.2216, "Q4 2025"],
      ["Material Handling", 588000, 0.2712, "Q4 2025"],
    ],
  },
];

function toRecord(row: AnalyticsScalar[], fields: AnalyticsColumn[]) {
  const record: Record<string, AnalyticsScalar> = {};
  for (let i = 0; i < fields.length; i += 1) record[fields[i]!.key] = row[i] ?? null;
  return record;
}

function compareValues(left: AnalyticsScalar, right: AnalyticsScalar) {
  const leftNumber = typeof left === "number" ? left : Number(left);
  const rightNumber = typeof right === "number" ? right : Number(right);
  const numeric = Number.isFinite(leftNumber) && Number.isFinite(rightNumber);
  if (numeric) return leftNumber - rightNumber;
  return String(left ?? "").localeCompare(String(right ?? ""));
}

function matchesFilter(row: Record<string, AnalyticsScalar>, filter: QueryFilter) {
  const value = row[filter.field];
  if (filter.op === "contains") {
    return String(value ?? "")
      .toLowerCase()
      .includes(String(filter.value ?? "").toLowerCase());
  }
  if (filter.op === "in" && Array.isArray(filter.value)) {
    return filter.value.some((item) => String(item) === String(value));
  }
  if (filter.op === "between" && Array.isArray(filter.value) && filter.value.length >= 2) {
    const start = filter.value[0];
    const end = filter.value[1];
    return compareValues(value ?? null, start ?? null) >= 0 && compareValues(value ?? null, end ?? null) <= 0;
  }
  if (filter.op === "eq") return String(value) === String(filter.value);
  if (filter.op === "neq") return String(value) !== String(filter.value);
  if (filter.op === "gt") return compareValues(value ?? null, Array.isArray(filter.value) ? null : filter.value) > 0;
  if (filter.op === "gte") return compareValues(value ?? null, Array.isArray(filter.value) ? null : filter.value) >= 0;
  if (filter.op === "lt") return compareValues(value ?? null, Array.isArray(filter.value) ? null : filter.value) < 0;
  if (filter.op === "lte") return compareValues(value ?? null, Array.isArray(filter.value) ? null : filter.value) <= 0;
  return true;
}

export function listDemoAnalyticsDatasets(): AnalyticsDatasetDescriptor[] {
  return demoDatasets.map((dataset) => ({
    key: dataset.key,
    label: dataset.label,
    fields: dataset.fields,
    capabilities: {
      filterable: dataset.fields.map((field) => field.key),
      sortable: dataset.fields.map((field) => field.key),
      pageable: true,
    },
  }));
}

export function queryDemoAnalyticsDataset(request: AnalyticsQueryRequest): AnalyticsQueryResponse | null {
  const dataset = demoDatasets.find((item) => item.key === request.dataset);
  if (!dataset) return null;

  const selected = request.select?.filter((field) => dataset.fields.some((col) => col.key === field));
  const activeFields = selected && selected.length > 0 ? selected : dataset.fields.map((field) => field.key);
  const records = dataset.rows.map((row) => toRecord(row, dataset.fields));

  const filtered = (request.filters ?? []).reduce((rows, filter) => rows.filter((row) => matchesFilter(row, filter)), records);

  const sorted = filtered.slice();
  for (const sort of request.sort ?? []) {
    if (!activeFields.includes(sort.field) && !dataset.fields.some((field) => field.key === sort.field)) continue;
    sorted.sort((left, right) => {
      const diff = compareValues(left[sort.field] ?? null, right[sort.field] ?? null);
      return sort.dir === "desc" ? -diff : diff;
    });
  }

  const offset = Math.max(0, request.page?.offset ?? 0);
  const limit = Math.max(1, Math.min(2000, request.page?.limit ?? 500));
  const paged = sorted.slice(offset, offset + limit);
  const rows = paged.map((row) => activeFields.map((field) => row[field] ?? null));

  return {
    columns: activeFields.map((field) => {
      const source = dataset.fields.find((item) => item.key === field);
      return {
        key: field,
        label: source?.label ?? field,
        type: source?.type,
      };
    }),
    rows,
    totalRows: sorted.length,
    capabilities: {
      filterable: dataset.fields.map((field) => field.key),
      sortable: dataset.fields.map((field) => field.key),
      pageable: true,
    },
  };
}

export function listDemoDatasetOptions() {
  return demoDatasets.map((dataset) => ({ key: dataset.key, label: dataset.label }));
}

