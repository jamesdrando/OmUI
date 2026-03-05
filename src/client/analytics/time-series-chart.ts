import { buildTrendline, forecastTrend, type TrendlineMode, type TrendPoint } from "../../lib/analytics/trendline";
import type { AnalyticsDataInput } from "../../lib/analytics/contracts";
import { BaseAnalyticsWidget } from "./base-widget";

export interface TimeSeriesChartOptions {
  xField: string;
  xLabel: string;
  xType?: string | undefined;
  yField: string;
  yLabel: string;
  yType?: string | undefined;
  trendline?: { mode: TrendlineMode; degree?: number | undefined } | undefined;
  forecastPoints?: number | undefined;
}

function decimate(points: TrendPoint[], maxPoints = 240) {
  if (points.length <= maxPoints) return points;
  const stride = Math.ceil(points.length / maxPoints);
  const out: TrendPoint[] = [];
  for (let i = 0; i < points.length; i += stride) out.push(points[i]!);
  return out;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatMetric(value: number, type = "number", compact = false) {
  if (type === "currency_usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    }).format(value);
  }
  if (type === "percent") {
    const percent = Math.abs(value) <= 1.5 ? value * 100 : value;
    if (compact) return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(percent)}%`;
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(percent)}%`;
  }
  return compact
    ? formatCompactNumber(value)
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

interface AxisTick {
  x: number;
  label: string;
}

function asDateTimestamp(value: unknown) {
  if (value == null) return Number.NaN;
  const text = String(value).trim();
  if (!text) return Number.NaN;
  if (!/^\d{4}-\d{2}-\d{2}/.test(text) && !/^\d{2}:\d{2}/.test(text)) return Number.NaN;
  return Date.parse(text);
}

function formatDateTick(ts: number, mode: "month" | "day") {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: mode === "day" ? "numeric" : undefined,
    year: mode === "month" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(ts));
}

function compressTicks(ticks: AxisTick[], maxTicks = 7) {
  if (ticks.length <= maxTicks) return ticks;
  const out: AxisTick[] = [];
  const stride = (ticks.length - 1) / (maxTicks - 1);
  for (let i = 0; i < maxTicks; i += 1) {
    const index = Math.round(i * stride);
    out.push(ticks[Math.min(ticks.length - 1, index)]!);
  }
  const deduped: AxisTick[] = [];
  const seen = new Set<number>();
  for (const tick of out) {
    const key = Math.round(tick.x);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(tick);
  }
  return deduped;
}

function buildDateTicks(minX: number, maxX: number, maxTicks = 7) {
  const dayMs = 86_400_000;
  const spanDays = Math.max(1, Math.round((maxX - minX) / dayMs));
  const mode: "month" | "day" = spanDays >= 90 ? "month" : "day";
  const ticks: AxisTick[] = [];

  if (mode === "month") {
    const start = new Date(minX);
    const end = new Date(maxX);
    const startMonthTs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
    const totalMonths = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1;
    const monthStep = Math.max(1, Math.ceil(totalMonths / Math.max(2, maxTicks - 1)));
    for (let offset = 0; offset < totalMonths; offset += monthStep) {
      const tickDate = new Date(startMonthTs);
      tickDate.setUTCMonth(tickDate.getUTCMonth() + offset);
      const tickX = tickDate.getTime();
      if (tickX < minX || tickX > maxX) continue;
      ticks.push({ x: tickX, label: formatDateTick(tickX, mode) });
    }
  } else {
    const start = new Date(minX);
    const startDayTs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const dayStep = Math.max(1, Math.ceil(spanDays / Math.max(2, maxTicks - 1)));
    for (let tickX = startDayTs; tickX <= maxX; tickX += dayStep * dayMs) {
      if (tickX < minX) continue;
      ticks.push({ x: tickX, label: formatDateTick(tickX, mode) });
    }
  }

  ticks.unshift({ x: minX, label: formatDateTick(minX, mode) });
  ticks.push({ x: maxX, label: formatDateTick(maxX, mode) });

  const deduped: AxisTick[] = [];
  const seen = new Set<number>();
  for (const tick of ticks.sort((left, right) => left.x - right.x)) {
    const key = Math.round(tick.x);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(tick);
  }
  return compressTicks(deduped, maxTicks);
}

function buildNumericTicks(minX: number, maxX: number, labelsByX: Map<number, string>, maxTicks = 7) {
  if (maxX <= minX) return [{ x: minX, label: labelsByX.get(minX) ?? formatCompactNumber(minX) }];
  const ticks: AxisTick[] = [];
  const step = (maxX - minX) / Math.max(1, maxTicks - 1);
  for (let i = 0; i < maxTicks; i += 1) {
    const x = minX + step * i;
    const nearest = Math.round(x);
    ticks.push({
      x,
      label: labelsByX.get(nearest) ?? labelsByX.get(x) ?? formatCompactNumber(x),
    });
  }
  return compressTicks(ticks, maxTicks);
}

export class TimeSeriesChart extends BaseAnalyticsWidget {
  private options: TimeSeriesChartOptions;

  constructor(root: HTMLElement, options: TimeSeriesChartOptions) {
    super(root);
    this.options = options;
  }

  override setData(data: AnalyticsDataInput) {
    super.setData(data);
  }

  protected override render() {
    const width = 620;
    const height = 188;
    const padX = 42;
    const padTop = 18;
    const padBottom = 34;
    const xField = this.options.xField;
    const yField = this.options.yField;

    const source = this.data.rows
      .map((row, rowIndex) => {
        const xValue = row[xField];
        const yValue = row[yField];
        const xDate = asDateTimestamp(xValue);
        const parsedAsDate = Number.isFinite(xDate);
        const numericX = Number(xValue);
        const xNum = parsedAsDate ? xDate : Number.isFinite(numericX) ? numericX : rowIndex + 1;
        const yNum = Number(yValue);
        if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) return null;
        return {
          x: xNum,
          y: yNum,
          isDate: parsedAsDate,
          xLabel: parsedAsDate ? new Date(xDate).toISOString().slice(0, 10) : String(xValue ?? rowIndex + 1),
        };
      })
      .filter((value): value is { x: number; y: number; xLabel: string; isDate: boolean } => Boolean(value))
      .sort((left, right) => left.x - right.x);

    if (source.length === 0) {
      this.root.innerHTML = `<div class="ui-empty">No plottable data</div>`;
      return;
    }

    const points = decimate(source.map((point) => ({ x: point.x, y: point.y })));
    const labelsByX = new Map(source.map((point) => [point.x, point.xLabel]));
    const dateAxis = source.filter((point) => point.isDate).length / source.length >= 0.66;
    const minX = points[0]!.x;
    const maxX = points[points.length - 1]!.x;
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const xSpan = Math.max(1, maxX - minX);
    const ySpan = Math.max(1, maxY - minY);
    const scaleX = (x: number) => padX + ((x - minX) / xSpan) * (width - padX * 2);
    const scaleY = (y: number) => height - padBottom - ((y - minY) / ySpan) * (height - padTop - padBottom);
    const xTicks = dateAxis ? buildDateTicks(minX, maxX, 7) : buildNumericTicks(minX, maxX, labelsByX, 7);

    const svg = this.createSvg(width, height);
    const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
    grid.classList.add("ui-ts-grid");
    for (let i = 0; i <= 4; i += 1) {
      const y = padTop + ((height - padTop - padBottom) * i) / 4;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(padX));
      line.setAttribute("y1", String(y));
      line.setAttribute("x2", String(width - padX));
      line.setAttribute("y2", String(y));
      grid.append(line);

      const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      yLabel.setAttribute("x", String(padX - 8));
      yLabel.setAttribute("y", String(y + 5));
      yLabel.setAttribute("text-anchor", "end");
      yLabel.setAttribute("class", "ui-ts-axis-label");
      const value = maxY - ((maxY - minY) * i) / 4;
      yLabel.textContent = formatMetric(value, this.options.yType, true);
      grid.append(yLabel);
    }
    for (const tick of xTicks) {
      const x = scaleX(tick.x);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(x));
      line.setAttribute("y1", String(padTop));
      line.setAttribute("x2", String(x));
      line.setAttribute("y2", String(height - padBottom));
      line.setAttribute("opacity", "0.28");
      grid.append(line);
    }
    svg.append(grid);

    const seriesPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    seriesPath.classList.add("ui-ts-line");
    seriesPath.setAttribute(
      "d",
      points
        .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x).toFixed(2)},${scaleY(point.y).toFixed(2)}`)
        .join(" "),
    );
    svg.append(seriesPath);

    const step = Math.max(1, Math.floor(points.length / 7));
    for (let i = 0; i < points.length; i += step) {
      const point = points[i]!;
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", String(scaleX(point.x)));
      dot.setAttribute("cy", String(scaleY(point.y)));
      dot.setAttribute("r", "3.2");
      dot.setAttribute("class", "ui-ts-dot");
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      const xLabel = labelsByX.get(point.x) ?? String(point.x);
      title.textContent = `${xLabel} | ${this.options.yLabel}: ${formatMetric(point.y, this.options.yType)}`;
      dot.append(title);
      svg.append(dot);
    }

    if (this.options.trendline) {
      const model = buildTrendline(points, this.options.trendline);
      const trendPoints = points.map((point) => ({ x: point.x, y: model.predict(point.x) }));
      const forecastPoints = forecastTrend(points, this.options.trendline, this.options.forecastPoints ?? 0);
      const allTrend = trendPoints.concat(forecastPoints);
      const trendPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      trendPath.classList.add("ui-ts-trend");
      trendPath.setAttribute(
        "d",
        allTrend
          .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x).toFixed(2)},${scaleY(point.y).toFixed(2)}`)
          .join(" "),
      );
      svg.append(trendPath);
    }

    for (let i = 0; i < xTicks.length; i += 1) {
      const tick = xTicks[i]!;
      const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      xLabel.setAttribute("x", String(scaleX(tick.x)));
      xLabel.setAttribute("y", String(height - 16));
      xLabel.setAttribute("class", "ui-ts-axis-label");
      if (i === 0) xLabel.setAttribute("text-anchor", "start");
      else if (i === xTicks.length - 1) xLabel.setAttribute("text-anchor", "end");
      else xLabel.setAttribute("text-anchor", "middle");
      xLabel.textContent = tick.label;
      svg.append(xLabel);
    }

    const yAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yAxisTitle.setAttribute("x", String(padX));
    yAxisTitle.setAttribute("y", "11");
    yAxisTitle.setAttribute("class", "ui-ts-axis-title");
    yAxisTitle.textContent = this.options.yLabel;
    svg.append(yAxisTitle);

    const xAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xAxisTitle.setAttribute("x", String(width / 2));
    xAxisTitle.setAttribute("y", String(height - 2));
    xAxisTitle.setAttribute("text-anchor", "middle");
    xAxisTitle.setAttribute("class", "ui-ts-axis-title");
    xAxisTitle.textContent = this.options.xLabel;
    svg.append(xAxisTitle);

    const latest = document.createElementNS("http://www.w3.org/2000/svg", "text");
    latest.setAttribute("x", String(width - padX));
    latest.setAttribute("y", String(padTop + 12));
    latest.setAttribute("text-anchor", "end");
    latest.setAttribute("class", "ui-ts-latest");
    const last = points[points.length - 1]!;
    latest.textContent = `Latest: ${formatMetric(last.y, this.options.yType)}`;
    svg.append(latest);

    this.root.innerHTML = "";
    this.root.append(svg);
    this.animateMount();
  }
}
