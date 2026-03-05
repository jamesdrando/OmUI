import type { AnalyticsDataInput } from "../../lib/analytics/contracts";
import { BaseAnalyticsWidget } from "./base-widget";

interface PieSlice {
  label: string;
  value: number;
  pct: number;
}

export interface PieDonutChartOptions {
  labelField: string;
  valueField: string;
  valueType?: string | undefined;
  aggregation?: "sum" | "avg" | undefined;
  innerRadius?: number | undefined;
  showLegend?: boolean | undefined;
  maxSlices?: number | undefined;
}

const palette = ["#4f9cff", "#2b8f74", "#f2a93d", "#cf6f97", "#9d7cf2", "#5faac8", "#d66d4b", "#85b25f"];

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function slicePath(cx: number, cy: number, outerRadius: number, innerRadius: number, start: number, end: number) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, start);
  const endOuter = polarToCartesian(cx, cy, outerRadius, end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  if (innerRadius <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${startOuter.x} ${startOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
      "Z",
    ].join(" ");
  }

  const endInner = polarToCartesian(cx, cy, innerRadius, end);
  const startInner = polarToCartesian(cx, cy, innerRadius, start);
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function buildSlices(rows: Array<Record<string, string | number | boolean | null>>, options: PieDonutChartOptions) {
  const grouped = new Map<string, { sum: number; count: number }>();
  const aggregation = options.aggregation ?? (options.valueType === "percent" ? "avg" : "sum");
  for (const row of rows) {
    const label = String(row[options.labelField] ?? "");
    const value = Number(row[options.valueField]);
    if (!label || !Number.isFinite(value)) continue;
    const current = grouped.get(label) ?? { sum: 0, count: 0 };
    current.sum += Math.max(0, value);
    current.count += 1;
    grouped.set(label, current);
  }
  const items = Array.from(grouped.entries())
    .map(([label, values]) => ({
      label,
      value: aggregation === "avg" ? values.sum / Math.max(1, values.count) : values.sum,
    }))
    .filter((item) => item.value > 0);
  items.sort((left, right) => right.value - left.value);
  const maxSlices = Math.max(1, options.maxSlices ?? 6);
  const top = items.slice(0, maxSlices);
  const remainder = items.slice(maxSlices).reduce((sum, item) => sum + item.value, 0);
  const merged = remainder > 0 ? top.concat({ label: "Other", value: remainder }) : top;
  const total = merged.reduce((sum, item) => sum + item.value, 0) || 1;
  return merged.map((item) => ({
    ...item,
    pct: item.value / total,
  }));
}

function formatValue(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatMetric(value: number, type = "number") {
  if (type === "currency_usd") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }
  if (type === "percent") {
    const percent = Math.abs(value) <= 1.5 ? value * 100 : value;
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(percent)}%`;
  }
  return formatValue(value);
}

export class PieDonutChart extends BaseAnalyticsWidget {
  private options: PieDonutChartOptions;

  constructor(root: HTMLElement, options: PieDonutChartOptions) {
    super(root);
    this.options = options;
  }

  override setData(data: AnalyticsDataInput) {
    super.setData(data);
  }

  protected override render() {
    const width = 320;
    const height = 180;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 64;
    const innerRadius = Math.max(0, this.options.innerRadius ?? 0);
    const gap = 0.02;
    const slices = buildSlices(this.data.rows, this.options);

    if (slices.length === 0) {
      this.root.innerHTML = `<div class="ui-empty">No plottable data</div>`;
      return;
    }

    const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
    const svg = this.createSvg(width, height);
    let angle = -Math.PI / 2;
    for (let i = 0; i < slices.length; i += 1) {
      const slice = slices[i]!;
      const sweep = slice.pct * Math.PI * 2;
      const next = angle + sweep;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const localStart = angle + gap / 2;
      const localEnd = next - gap / 2;
      const usableStart = localEnd <= localStart ? angle : localStart;
      const usableEnd = localEnd <= localStart ? next : localEnd;
      path.setAttribute("d", slicePath(cx, cy, radius, innerRadius, usableStart, usableEnd));
      path.setAttribute("fill", palette[i % palette.length]!);
      path.classList.add("ui-pie-slice");
      path.setAttribute("data-label", slice.label);
      path.setAttribute("stroke", "rgba(8, 18, 34, 0.85)");
      path.setAttribute("stroke-width", "1.1");
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${slice.label}: ${formatMetric(slice.value, this.options.valueType)} (${(slice.pct * 100).toFixed(1)}%)`;
      path.append(title);
      svg.append(path);
      angle = next;
    }

    if (innerRadius > 0) {
      const totalLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      totalLabel.setAttribute("x", String(cx));
      totalLabel.setAttribute("y", String(cy - 6));
      totalLabel.setAttribute("text-anchor", "middle");
      totalLabel.setAttribute("class", "ui-pie-center-label");
      totalLabel.textContent = "Total";
      svg.append(totalLabel);

      const totalValue = document.createElementNS("http://www.w3.org/2000/svg", "text");
      totalValue.setAttribute("x", String(cx));
      totalValue.setAttribute("y", String(cy + 14));
      totalValue.setAttribute("text-anchor", "middle");
      totalValue.setAttribute("class", "ui-pie-center-value");
      totalValue.textContent = formatMetric(total, this.options.valueType);
      svg.append(totalValue);
    }

    this.root.innerHTML = "";
    this.root.append(svg);

    if (this.options.showLegend ?? true) {
      const legend = document.createElement("ul");
      legend.className = "ui-analyticsLegend";
      for (let i = 0; i < slices.length; i += 1) {
        const slice = slices[i]!;
        const li = document.createElement("li");
        li.innerHTML = `<span style="background:${palette[i % palette.length]};"></span><strong>${slice.label}</strong><em>${formatMetric(slice.value, this.options.valueType)} · ${(slice.pct * 100).toFixed(1)}%</em>`;
        legend.append(li);
      }
      this.root.append(legend);
    }
    this.animateMount();
  }
}
