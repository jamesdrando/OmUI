import type { AnalyticsDataInput } from "../../lib/analytics/contracts";
import { BaseAnalyticsWidget } from "./base-widget";

export interface HistogramChartOptions {
  labelField: string;
  valueField: string;
  valueType?: string | undefined;
  aggregation?: "sum" | "avg" | undefined;
  orientation?: "vertical" | "horizontal" | undefined;
}

function formatMetric(value: number, type = "number") {
  if (type === "currency_usd") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }
  if (type === "percent") {
    const percent = Math.abs(value) <= 1.5 ? value * 100 : value;
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(percent)}%`;
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export class HistogramChart extends BaseAnalyticsWidget {
  private options: HistogramChartOptions;

  constructor(root: HTMLElement, options: HistogramChartOptions) {
    super(root);
    this.options = options;
  }

  override setData(data: AnalyticsDataInput) {
    super.setData(data);
  }

  protected override render() {
    const grouped = new Map<string, { sum: number; count: number }>();
    const aggregation = this.options.aggregation ?? (this.options.valueType === "percent" ? "avg" : "sum");
    for (const row of this.data.rows) {
      const label = String(row[this.options.labelField] ?? "");
      const value = Number(row[this.options.valueField]);
      if (!label || !Number.isFinite(value)) continue;
      const current = grouped.get(label) ?? { sum: 0, count: 0 };
      current.sum += value;
      current.count += 1;
      grouped.set(label, current);
    }
    const rows = Array.from(grouped.entries())
      .map(([label, values]) => ({
        label,
        value: aggregation === "avg" ? values.sum / Math.max(1, values.count) : values.sum,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);

    if (rows.length === 0) {
      this.root.innerHTML = `<div class="ui-empty">No plottable data</div>`;
      return;
    }

    const width = 560;
    const height = 176;
    const padX = 24;
    const padY = 12;
    const max = Math.max(...rows.map((row) => row.value), 1);
    const svg = this.createSvg(width, height);

    if (this.options.orientation === "horizontal") {
      const labelArea = 124;
      const rightValuePad = 72;
      const barHeight = (height - padY * 2) / rows.length;
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]!;
        const widthPx = ((width - padX * 2 - labelArea - rightValuePad) * row.value) / max;
        const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bar.setAttribute("x", String(padX + labelArea));
        bar.setAttribute("y", String(padY + i * barHeight + 2));
        bar.setAttribute("width", String(Math.max(1, widthPx)));
        bar.setAttribute("height", String(Math.max(6, barHeight - 5)));
        bar.classList.add("ui-hist-bar");
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${row.label}: ${formatMetric(row.value, this.options.valueType)}`;
        bar.append(title);
        svg.append(bar);

        const y = padY + i * barHeight + barHeight * 0.62;
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", String(padX + labelArea - 4));
        label.setAttribute("y", String(y));
        label.setAttribute("text-anchor", "end");
        label.setAttribute("class", "ui-hist-label");
        label.textContent = row.label.length > 16 ? `${row.label.slice(0, 16)}...` : row.label;
        svg.append(label);

        const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        valueLabel.setAttribute("x", String(Math.min(width - padX - 2, padX + labelArea + widthPx + 6)));
        valueLabel.setAttribute("y", String(y));
        valueLabel.setAttribute("class", "ui-hist-value");
        valueLabel.textContent = formatMetric(row.value, this.options.valueType);
        svg.append(valueLabel);
      }
    } else {
      const barWidth = (width - padX * 2) / rows.length;
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]!;
        const barHeight = ((height - padY * 2 - 14) * row.value) / max;
        const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bar.setAttribute("x", String(padX + i * barWidth + 3));
        bar.setAttribute("y", String(height - padY - 14 - barHeight));
        bar.setAttribute("width", String(Math.max(10, barWidth - 6)));
        bar.setAttribute("height", String(barHeight));
        bar.classList.add("ui-hist-bar");
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${row.label}: ${formatMetric(row.value, this.options.valueType)}`;
        bar.append(title);
        svg.append(bar);

        const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        valueLabel.setAttribute("x", String(padX + i * barWidth + barWidth / 2));
        valueLabel.setAttribute("y", String(height - padY - 14 - barHeight - 4));
        valueLabel.setAttribute("text-anchor", "middle");
        valueLabel.setAttribute("class", "ui-hist-value");
        valueLabel.textContent = formatMetric(row.value, this.options.valueType);
        svg.append(valueLabel);

        const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        xLabel.setAttribute("x", String(padX + i * barWidth + barWidth / 2));
        xLabel.setAttribute("y", String(height - 1));
        xLabel.setAttribute("text-anchor", "middle");
        xLabel.setAttribute("class", "ui-hist-label");
        xLabel.textContent = row.label.length > 10 ? `${row.label.slice(0, 10)}...` : row.label;
        svg.append(xLabel);
      }
    }

    this.root.innerHTML = "";
    this.root.append(svg);
    this.animateMount();
  }
}
