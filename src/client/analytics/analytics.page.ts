// @ts-nocheck
import type { AnalyticsQueryResponse, QueryFilter } from "../../lib/analytics/contracts";
import { AnalyticsApiClient } from "./data-adapter";
import { HistogramChart } from "./histogram-chart";
import { PieDonutChart } from "./pie-donut-chart";
import { TimeSeriesChart } from "./time-series-chart";

interface AnalyticsConfig {
  defaultDataset?: string;
  options?: Array<{ key: string; label: string }> | undefined;
  datasetsEndpoint?: string;
  queryEndpoint?: string;
}

interface FieldProfile {
  key: string;
  type: string;
  index: number;
  nonNull: number;
  distinct: number;
  numericRatio: number;
  dateRatio: number;
}

interface PickedFields {
  xField: string;
  yField: string;
  labelField: string;
  valueField: string;
  xType: string;
  yType: string;
  labelType: string;
}

function isDateLikeValue(value: unknown) {
  if (value == null) return false;
  if (typeof value === "number") return false;
  const text = String(value).trim();
  if (!text) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return true;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(text)) return true;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) return true;
  return false;
}

function looksLikeTemporalKey(key: string) {
  return /(^|_)(date|time|month|quarter|year|day|week|timestamp|at)$/.test(key.toLowerCase());
}

function looksLikeIdentifierKey(key: string) {
  return /(id|uuid|code|sku|email|order_no|account_code)$/i.test(key);
}

function toTitleCase(text: string) {
  return text
    .replaceAll(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function fieldLabel(payload: AnalyticsQueryResponse, field: string) {
  const col = payload.columns.find((item) => item.key === field);
  const raw = String(col?.label ?? field);
  return toTitleCase(raw);
}

function formatTypeLabel(type: string) {
  if (type === "currency_usd") return "USD";
  if (type === "percent") return "Percent";
  if (type === "date") return "Date";
  if (type === "datetime") return "Datetime";
  if (type === "time") return "Time";
  if (type === "number") return "Number";
  return "Text";
}

function profileFields(payload: AnalyticsQueryResponse) {
  const rowObjects = payload.rows.map((row) => {
    const mapped: Record<string, string | number | boolean | null> = {};
    for (let i = 0; i < payload.columns.length; i += 1) {
      const key = payload.columns[i]?.key;
      if (!key) continue;
      mapped[key] = (row[i] as string | number | boolean | null) ?? null;
    }
    return mapped;
  });

  const profiles: FieldProfile[] = payload.columns.map((column, index) => {
    const values = rowObjects.map((row) => row[column.key]);
    const nonNull = values.filter((value) => value != null && String(value).trim() !== "").length;
    let numericCount = 0;
    let dateCount = 0;
    const distinct = new Set<string>();
    for (const value of values) {
      if (value == null || String(value).trim() === "") continue;
      distinct.add(String(value));
      const numeric = Number(value);
      if (Number.isFinite(numeric)) numericCount += 1;
      if (isDateLikeValue(value)) dateCount += 1;
    }
    return {
      key: column.key,
      type: String(column.type ?? "string"),
      index,
      nonNull,
      distinct: distinct.size,
      numericRatio: nonNull > 0 ? numericCount / nonNull : 0,
      dateRatio: nonNull > 0 ? dateCount / nonNull : 0,
    };
  });

  return profiles;
}

function pickFields(payload: AnalyticsQueryResponse): PickedFields {
  const profiles = profileFields(payload);
  const rowCount = payload.rows.length;

  const numericProfiles = profiles
    .filter((profile) => {
      const typedNumeric = profile.type === "number" || profile.type === "currency_usd" || profile.type === "percent";
      return typedNumeric || profile.numericRatio >= 0.92;
    })
    .sort((left, right) => {
      const leftTyped = left.type === "currency_usd" || left.type === "number" || left.type === "percent" ? 1 : 0;
      const rightTyped = right.type === "currency_usd" || right.type === "number" || right.type === "percent" ? 1 : 0;
      if (leftTyped !== rightTyped) return rightTyped - leftTyped;
      if (left.distinct !== right.distinct) return right.distinct - left.distinct;
      return left.index - right.index;
    });
  const yProfile = numericProfiles[0];

  const temporalProfiles = profiles
    .filter((profile) => {
      const typedTemporal = profile.type === "date" || profile.type === "datetime" || profile.type === "time";
      const temporalish = typedTemporal || looksLikeTemporalKey(profile.key) || profile.dateRatio >= 0.75;
      return temporalish && profile.distinct > 1;
    })
    .sort((left, right) => {
      const leftTyped = left.type === "date" || left.type === "datetime" || left.type === "time" ? 1 : 0;
      const rightTyped = right.type === "date" || right.type === "datetime" || right.type === "time" ? 1 : 0;
      if (leftTyped !== rightTyped) return rightTyped - leftTyped;
      if (left.dateRatio !== right.dateRatio) return right.dateRatio - left.dateRatio;
      return left.index - right.index;
    });
  const xTemporal = temporalProfiles[0];

  const firstCategory = profiles
    .filter((profile) => profile.key !== yProfile?.key && profile.key !== xTemporal?.key)
    .map((profile) => ({ ...profile, typedString: profile.type === "string" ? 1 : 0 }))
    .sort((left, right) => {
      if (left.typedString !== right.typedString) return right.typedString - left.typedString;
      return left.index - right.index;
    })[0];

  const maxUsefulBuckets = Math.max(3, Math.min(14, Math.floor(rowCount * 0.28)));
  const categoryProfiles = profiles
    .filter((profile) => profile.key !== yProfile?.key && profile.key !== xTemporal?.key)
    .filter((profile) => profile.distinct >= 2 && profile.distinct <= maxUsefulBuckets)
    .filter((profile) => !looksLikeIdentifierKey(profile.key))
    .sort((left, right) => {
      const leftTemporalPenalty = looksLikeTemporalKey(left.key) ? 1 : 0;
      const rightTemporalPenalty = looksLikeTemporalKey(right.key) ? 1 : 0;
      if (leftTemporalPenalty !== rightTemporalPenalty) return leftTemporalPenalty - rightTemporalPenalty;
      const leftDistance = Math.abs(left.distinct - 6);
      const rightDistance = Math.abs(right.distinct - 6);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return left.index - right.index;
    });
  const labelProfile = categoryProfiles[0] ?? firstCategory;

  const xProfile = xTemporal ?? profiles.find((profile) => profile.key !== yProfile?.key) ?? profiles[0];
  const fallback = profiles[0] ?? { key: "", type: "string" };
  const yChosen = yProfile ?? fallback;
  const xChosen = xProfile ?? fallback;
  const labelChosen = labelProfile ?? fallback;

  return {
    xField: xChosen.key ?? payload.columns[0]?.key ?? "",
    yField: yChosen.key ?? payload.columns[1]?.key ?? payload.columns[0]?.key ?? "",
    labelField: labelChosen.key ?? payload.columns[0]?.key ?? "",
    valueField: yChosen.key ?? payload.columns[1]?.key ?? payload.columns[0]?.key ?? "",
    xType: xChosen.type ?? "string",
    yType: yChosen.type ?? "number",
    labelType: labelChosen.type ?? "string",
  };
}

(function initAnalyticsPage() {
  const configEl = document.getElementById("analyticsConfig");
  const datasetSelect = document.getElementById("analyticsDatasetSelect") as HTMLSelectElement | null;
  const textFilter = document.getElementById("analyticsTextFilter") as HTMLInputElement | null;
  const minFilter = document.getElementById("analyticsMinFilter") as HTMLInputElement | null;
  const maxFilter = document.getElementById("analyticsMaxFilter") as HTMLInputElement | null;
  const applyButton = document.getElementById("analyticsApplyBtn") as HTMLButtonElement | null;
  const refreshButton = document.querySelector('[data-action="refresh-analytics"]') as HTMLButtonElement | null;
  const meta = document.getElementById("analyticsMeta");
  if (!configEl || !datasetSelect || !textFilter || !minFilter || !maxFilter || !applyButton || !meta) return;

  const config = JSON.parse(configEl.textContent || "{}") as AnalyticsConfig;
  const adapter = new AnalyticsApiClient({
    datasetsEndpoint: config.datasetsEndpoint ?? "/api/analytics/datasets",
    queryEndpoint: config.queryEndpoint ?? "/api/analytics/query",
  });
  let datasetOptions = Array.isArray(config.options) ? config.options.slice() : [];

  function applyDatasetOptions(options: Array<{ key: string; label: string }>, preferred: string) {
    datasetSelect.innerHTML = "";
    for (const option of options) {
      const el = document.createElement("option");
      el.value = option.key;
      el.textContent = option.label;
      datasetSelect.append(el);
    }
    const selected = options.some((option) => option.key === preferred) ? preferred : options[0]?.key ?? "";
    if (selected) datasetSelect.value = selected;
    config.defaultDataset = selected;
    datasetOptions = options;
    return selected;
  }

  if (datasetOptions.length > 0) {
    applyDatasetOptions(datasetOptions, config.defaultDataset ?? "");
  }

  async function ensureDatasetOptions() {
    try {
      const remote = await adapter.getDatasets();
      const mapped = remote.map((dataset) => ({ key: dataset.key, label: dataset.label || dataset.key }));
      if (mapped.length > 0) {
        applyDatasetOptions(mapped, datasetSelect.value || config.defaultDataset || mapped[0]?.key || "");
        return mapped;
      }
    } catch (error) {
      console.error(error);
    }
    return datasetOptions;
  }

  const roots = {
    time: document.getElementById("analyticsTimeSeries"),
    donut: document.getElementById("analyticsDonut"),
    pie: document.getElementById("analyticsPie"),
    histV: document.getElementById("analyticsHistogramVertical"),
    histH: document.getElementById("analyticsHistogramHorizontal"),
  };
  if (!roots.time || !roots.donut || !roots.pie || !roots.histV || !roots.histH) return;

  const titleEls = {
    time: document.getElementById("analyticsTimeSeriesTitle"),
    donut: document.getElementById("analyticsDonutTitle"),
    pie: document.getElementById("analyticsPieTitle"),
    histV: document.getElementById("analyticsHistogramVerticalTitle"),
    histH: document.getElementById("analyticsHistogramHorizontalTitle"),
  };
  const metaEls = {
    time: document.getElementById("analyticsTimeSeriesMeta"),
    donut: document.getElementById("analyticsDonutMeta"),
    pie: document.getElementById("analyticsPieMeta"),
    histV: document.getElementById("analyticsHistogramVerticalMeta"),
    histH: document.getElementById("analyticsHistogramHorizontalMeta"),
  };

  let activeWidgets: Array<{ destroy: () => void }> = [];
  let activeLoadToken = 0;

  function updateWidgetDescriptions(payload: AnalyticsQueryResponse, fields: PickedFields) {
    const agg = fields.yType === "percent" ? "average" : "sum";
    const xLabel = fieldLabel(payload, fields.xField);
    const yLabel = fieldLabel(payload, fields.yField);
    const categoryLabel = fieldLabel(payload, fields.labelField);
    const yUnit = formatTypeLabel(fields.yType);

    if (titleEls.time) titleEls.time.textContent = `${yLabel} Over ${xLabel}`;
    if (metaEls.time) metaEls.time.textContent = `X: ${xLabel} (${formatTypeLabel(fields.xType)}) · Y: ${yLabel} (${yUnit})`;
    if (roots.time) roots.time.setAttribute("aria-label", `Time series of ${yLabel} over ${xLabel}`);

    if (titleEls.donut) titleEls.donut.textContent = `${yLabel} by ${categoryLabel}`;
    if (metaEls.donut) metaEls.donut.textContent = `${agg} ${yLabel} grouped by ${categoryLabel}`;
    if (roots.donut) roots.donut.setAttribute("aria-label", `Donut chart of ${yLabel} by ${categoryLabel}`);

    if (titleEls.pie) titleEls.pie.textContent = `${yLabel} by ${categoryLabel}`;
    if (metaEls.pie) metaEls.pie.textContent = `${agg} ${yLabel} grouped by ${categoryLabel}`;
    if (roots.pie) roots.pie.setAttribute("aria-label", `Pie chart of ${yLabel} by ${categoryLabel}`);

    if (titleEls.histV) titleEls.histV.textContent = `${yLabel} by ${categoryLabel} (Vertical)`;
    if (metaEls.histV) metaEls.histV.textContent = `${agg} ${yLabel} grouped by ${categoryLabel}`;
    if (roots.histV) roots.histV.setAttribute("aria-label", `Vertical histogram of ${yLabel} by ${categoryLabel}`);

    if (titleEls.histH) titleEls.histH.textContent = `${yLabel} by ${categoryLabel} (Horizontal)`;
    if (metaEls.histH) metaEls.histH.textContent = `${agg} ${yLabel} grouped by ${categoryLabel}`;
    if (roots.histH) roots.histH.setAttribute("aria-label", `Horizontal histogram of ${yLabel} by ${categoryLabel}`);
  }

  function getBasicFilters(fields: { labelField: string; valueField: string }) {
    const filters: QueryFilter[] = [];
    const textValue = textFilter.value.trim();
    if (textValue.length > 0 && fields.labelField) {
      filters.push({ field: fields.labelField, op: "contains", value: textValue });
    }
    const minValue = minFilter.value.trim();
    const maxValue = maxFilter.value.trim();
    if (minValue && maxValue && fields.valueField) {
      filters.push({ field: fields.valueField, op: "between", value: [Number(minValue), Number(maxValue)] });
    } else if (minValue && fields.valueField) {
      filters.push({ field: fields.valueField, op: "gte", value: Number(minValue) });
    } else if (maxValue && fields.valueField) {
      filters.push({ field: fields.valueField, op: "lte", value: Number(maxValue) });
    }
    return filters;
  }

  function renderWidgets(payload: AnalyticsQueryResponse) {
    const fields = pickFields(payload);
    updateWidgetDescriptions(payload, fields);
    for (const widget of activeWidgets) widget.destroy();
    activeWidgets = [];
    const aggregation = fields.yType === "percent" ? "avg" : "sum";
    const xLabel = `${fieldLabel(payload, fields.xField)} (${formatTypeLabel(fields.xType)})`;
    const yLabel = `${fieldLabel(payload, fields.yField)} (${formatTypeLabel(fields.yType)})`;

    const timeSeries = new TimeSeriesChart(roots.time, {
      xField: fields.xField,
      xLabel,
      xType: fields.xType,
      yField: fields.yField,
      yLabel,
      yType: fields.yType,
      trendline: { mode: "linear" },
      forecastPoints: 6,
    });
    const donut = new PieDonutChart(roots.donut, {
      labelField: fields.labelField,
      valueField: fields.valueField,
      valueType: fields.yType,
      aggregation,
      innerRadius: 36,
      showLegend: true,
      maxSlices: 5,
    });
    const pie = new PieDonutChart(roots.pie, {
      labelField: fields.labelField,
      valueField: fields.valueField,
      valueType: fields.yType,
      aggregation,
      showLegend: true,
      maxSlices: 5,
    });
    const histV = new HistogramChart(roots.histV, {
      labelField: fields.labelField,
      valueField: fields.valueField,
      valueType: fields.yType,
      aggregation,
      orientation: "vertical",
    });
    const histH = new HistogramChart(roots.histH, {
      labelField: fields.labelField,
      valueField: fields.valueField,
      valueType: fields.yType,
      aggregation,
      orientation: "horizontal",
    });

    const data = { columns: payload.columns, rows: payload.rows };
    timeSeries.setData(data);
    donut.setData(data);
    pie.setData(data);
    histV.setData(data);
    histH.setData(data);
    activeWidgets.push(timeSeries, donut, pie, histV, histH);
  }

  async function loadData() {
    const loadToken = ++activeLoadToken;
    const dataset = datasetSelect.value || config.defaultDataset || "";
    if (!dataset) {
      meta.textContent = "No datasets available";
      for (const widget of activeWidgets) widget.destroy();
      activeWidgets = [];
      return;
    }
    applyButton.disabled = true;
    if (refreshButton) refreshButton.disabled = true;
    meta.textContent = "Loading...";
    try {
      const baseline = await adapter.query({
        dataset,
        page: { offset: 0, limit: 600 },
      });
      const fields = pickFields(baseline);
      const filters = getBasicFilters(fields);
      const payload =
        filters.length > 0
          ? await adapter.query({
              dataset,
              filters,
              page: { offset: 0, limit: 600 },
            })
          : baseline;
      if (loadToken !== activeLoadToken) return;
      renderWidgets(payload);
      meta.textContent = `${dataset} | ${payload.totalRows.toLocaleString()} rows | ${payload.columns.length} fields`;
    } catch (error) {
      if (loadToken !== activeLoadToken) return;
      console.error(error);
      meta.textContent = "Failed to load analytics data";
    } finally {
      if (loadToken === activeLoadToken) {
        applyButton.disabled = false;
        if (refreshButton) refreshButton.disabled = false;
      }
    }
  }

  applyButton.addEventListener("click", () => {
    loadData();
  });
  datasetSelect.addEventListener("change", () => {
    loadData();
  });
  refreshButton?.addEventListener("click", () => {
    loadData();
  });
  datasetSelect.value = config.defaultDataset || datasetSelect.value;
  async function bootstrap() {
    await ensureDatasetOptions();
    await loadData();
  }
  void bootstrap();
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void bootstrap();
  });
})();
