import type { AnalyticsDataInput, QueryFilter } from "../../lib/analytics/contracts";

export interface NormalizedDataset {
  columns: Array<{ key: string; label: string; type?: string | undefined }>;
  rows: Array<Record<string, string | number | boolean | null>>;
}

export function normalizeAnalyticsData(data: AnalyticsDataInput): NormalizedDataset {
  if (Array.isArray(data)) {
    if (data.length === 0) return { columns: [], rows: [] };
    const keys = Object.keys(data[0] ?? {});
    return {
      columns: keys.map((key) => ({ key, label: key })),
      rows: data.map((row) => {
        const mapped: Record<string, string | number | boolean | null> = {};
        for (const key of keys) mapped[key] = row[key] ?? null;
        return mapped;
      }),
    };
  }

  const columns = (data.columns ?? []).map((column) => ({
    key: column.key,
    label: column.label ?? column.key,
    type: column.type,
  }));
  const rows = (data.rows ?? []).map((row) => {
    if (Array.isArray(row)) {
      const mapped: Record<string, string | number | boolean | null> = {};
      for (let i = 0; i < columns.length; i += 1) mapped[columns[i]!.key] = row[i] ?? null;
      return mapped;
    }
    return row;
  });
  return { columns, rows };
}

export abstract class BaseAnalyticsWidget {
  protected root: HTMLElement;
  protected data: NormalizedDataset;
  protected filters: QueryFilter[];

  constructor(root: HTMLElement) {
    this.root = root;
    this.data = { columns: [], rows: [] };
    this.filters = [];
  }

  setData(data: AnalyticsDataInput) {
    this.data = normalizeAnalyticsData(data);
    this.render();
  }

  setFilters(filters: QueryFilter[]) {
    this.filters = filters.slice();
    this.render();
  }

  reload() {
    this.render();
  }

  destroy() {
    this.root.innerHTML = "";
  }

  protected createSvg(width: number, height: number) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.classList.add("ui-analyticsSvg");
    return svg;
  }

  protected animateMount() {
    this.root.classList.remove("ui-analyticsCanvas--enter");
    requestAnimationFrame(() => this.root.classList.add("ui-analyticsCanvas--enter"));
  }

  protected abstract render(): void;
}

