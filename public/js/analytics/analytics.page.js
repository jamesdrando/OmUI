(() => {
  // src/client/analytics/data-adapter.ts
  class AnalyticsApiClient {
    datasetsEndpoint;
    queryEndpoint;
    constructor(config) {
      this.datasetsEndpoint = config.datasetsEndpoint;
      this.queryEndpoint = config.queryEndpoint;
    }
    async getDatasets() {
      const response = await fetch(this.datasetsEndpoint, { headers: { Accept: "application/json" } });
      if (!response.ok)
        throw new Error(`Datasets request failed (${response.status})`);
      const payload = await response.json();
      return payload.datasets ?? [];
    }
    async query(request) {
      const response = await fetch(this.queryEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(request)
      });
      if (!response.ok)
        throw new Error(`Query request failed (${response.status})`);
      return await response.json();
    }
  }

  // src/client/analytics/base-widget.ts
  function normalizeAnalyticsData(data) {
    if (Array.isArray(data)) {
      if (data.length === 0)
        return { columns: [], rows: [] };
      const keys = Object.keys(data[0] ?? {});
      return {
        columns: keys.map((key) => ({ key, label: key })),
        rows: data.map((row) => {
          const mapped = {};
          for (const key of keys)
            mapped[key] = row[key] ?? null;
          return mapped;
        })
      };
    }
    const columns = (data.columns ?? []).map((column) => ({
      key: column.key,
      label: column.label ?? column.key,
      type: column.type
    }));
    const rows = (data.rows ?? []).map((row) => {
      if (Array.isArray(row)) {
        const mapped = {};
        for (let i = 0;i < columns.length; i += 1)
          mapped[columns[i].key] = row[i] ?? null;
        return mapped;
      }
      return row;
    });
    return { columns, rows };
  }

  class BaseAnalyticsWidget {
    root;
    data;
    filters;
    constructor(root) {
      this.root = root;
      this.data = { columns: [], rows: [] };
      this.filters = [];
    }
    setData(data) {
      this.data = normalizeAnalyticsData(data);
      this.render();
    }
    setFilters(filters) {
      this.filters = filters.slice();
      this.render();
    }
    reload() {
      this.render();
    }
    destroy() {
      this.root.innerHTML = "";
    }
    createSvg(width, height) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.classList.add("ui-analyticsSvg");
      return svg;
    }
    animateMount() {
      this.root.classList.remove("ui-analyticsCanvas--enter");
      requestAnimationFrame(() => this.root.classList.add("ui-analyticsCanvas--enter"));
    }
  }

  // src/client/analytics/histogram-chart.ts
  function formatMetric(value, type = "number") {
    if (type === "currency_usd") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    }
    if (type === "percent") {
      const percent = Math.abs(value) <= 1.5 ? value * 100 : value;
      return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(percent)}%`;
    }
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  }

  class HistogramChart extends BaseAnalyticsWidget {
    options;
    constructor(root, options) {
      super(root);
      this.options = options;
    }
    setData(data) {
      super.setData(data);
    }
    render() {
      const grouped = new Map;
      const aggregation = this.options.aggregation ?? (this.options.valueType === "percent" ? "avg" : "sum");
      for (const row of this.data.rows) {
        const label = String(row[this.options.labelField] ?? "");
        const value = Number(row[this.options.valueField]);
        if (!label || !Number.isFinite(value))
          continue;
        const current = grouped.get(label) ?? { sum: 0, count: 0 };
        current.sum += value;
        current.count += 1;
        grouped.set(label, current);
      }
      const rows = Array.from(grouped.entries()).map(([label, values]) => ({
        label,
        value: aggregation === "avg" ? values.sum / Math.max(1, values.count) : values.sum
      })).sort((left, right) => right.value - left.value).slice(0, 8);
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
        for (let i = 0;i < rows.length; i += 1) {
          const row = rows[i];
          const widthPx = (width - padX * 2 - labelArea - rightValuePad) * row.value / max;
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
        for (let i = 0;i < rows.length; i += 1) {
          const row = rows[i];
          const barHeight = (height - padY * 2 - 14) * row.value / max;
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

  // src/client/analytics/pie-donut-chart.ts
  var palette = ["#4f9cff", "#2b8f74", "#f2a93d", "#cf6f97", "#9d7cf2", "#5faac8", "#d66d4b", "#85b25f"];
  function polarToCartesian(cx, cy, radius, angle) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  }
  function slicePath(cx, cy, outerRadius, innerRadius, start, end) {
    const startOuter = polarToCartesian(cx, cy, outerRadius, start);
    const endOuter = polarToCartesian(cx, cy, outerRadius, end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    if (innerRadius <= 0) {
      return [
        `M ${cx} ${cy}`,
        `L ${startOuter.x} ${startOuter.y}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
        "Z"
      ].join(" ");
    }
    const endInner = polarToCartesian(cx, cy, innerRadius, end);
    const startInner = polarToCartesian(cx, cy, innerRadius, start);
    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${endInner.x} ${endInner.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
      "Z"
    ].join(" ");
  }
  function buildSlices(rows, options) {
    const grouped = new Map;
    const aggregation = options.aggregation ?? (options.valueType === "percent" ? "avg" : "sum");
    for (const row of rows) {
      const label = String(row[options.labelField] ?? "");
      const value = Number(row[options.valueField]);
      if (!label || !Number.isFinite(value))
        continue;
      const current = grouped.get(label) ?? { sum: 0, count: 0 };
      current.sum += Math.max(0, value);
      current.count += 1;
      grouped.set(label, current);
    }
    const items = Array.from(grouped.entries()).map(([label, values]) => ({
      label,
      value: aggregation === "avg" ? values.sum / Math.max(1, values.count) : values.sum
    })).filter((item) => item.value > 0);
    items.sort((left, right) => right.value - left.value);
    const maxSlices = Math.max(1, options.maxSlices ?? 6);
    const top = items.slice(0, maxSlices);
    const remainder = items.slice(maxSlices).reduce((sum, item) => sum + item.value, 0);
    const merged = remainder > 0 ? top.concat({ label: "Other", value: remainder }) : top;
    const total = merged.reduce((sum, item) => sum + item.value, 0) || 1;
    return merged.map((item) => ({
      ...item,
      pct: item.value / total
    }));
  }
  function formatValue(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  }
  function formatMetric2(value, type = "number") {
    if (type === "currency_usd") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    }
    if (type === "percent") {
      const percent = Math.abs(value) <= 1.5 ? value * 100 : value;
      return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(percent)}%`;
    }
    return formatValue(value);
  }

  class PieDonutChart extends BaseAnalyticsWidget {
    options;
    constructor(root, options) {
      super(root);
      this.options = options;
    }
    setData(data) {
      super.setData(data);
    }
    render() {
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
      for (let i = 0;i < slices.length; i += 1) {
        const slice = slices[i];
        const sweep = slice.pct * Math.PI * 2;
        const next = angle + sweep;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const localStart = angle + gap / 2;
        const localEnd = next - gap / 2;
        const usableStart = localEnd <= localStart ? angle : localStart;
        const usableEnd = localEnd <= localStart ? next : localEnd;
        path.setAttribute("d", slicePath(cx, cy, radius, innerRadius, usableStart, usableEnd));
        path.setAttribute("fill", palette[i % palette.length]);
        path.classList.add("ui-pie-slice");
        path.setAttribute("data-label", slice.label);
        path.setAttribute("stroke", "rgba(8, 18, 34, 0.85)");
        path.setAttribute("stroke-width", "1.1");
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${slice.label}: ${formatMetric2(slice.value, this.options.valueType)} (${(slice.pct * 100).toFixed(1)}%)`;
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
        totalValue.textContent = formatMetric2(total, this.options.valueType);
        svg.append(totalValue);
      }
      this.root.innerHTML = "";
      this.root.append(svg);
      if (this.options.showLegend ?? true) {
        const legend = document.createElement("ul");
        legend.className = "ui-analyticsLegend";
        for (let i = 0;i < slices.length; i += 1) {
          const slice = slices[i];
          const li = document.createElement("li");
          li.innerHTML = `<span style="background:${palette[i % palette.length]};"></span><strong>${slice.label}</strong><em>${formatMetric2(slice.value, this.options.valueType)} · ${(slice.pct * 100).toFixed(1)}%</em>`;
          legend.append(li);
        }
        this.root.append(legend);
      }
      this.animateMount();
    }
  }

  // src/lib/analytics/trendline.ts
  function solveLinearSystem(a, b) {
    const n = a.length;
    for (let i = 0;i < n; i += 1) {
      let maxRow = i;
      for (let k = i + 1;k < n; k += 1) {
        if (Math.abs(a[k]?.[i] ?? 0) > Math.abs(a[maxRow]?.[i] ?? 0))
          maxRow = k;
      }
      [a[i], a[maxRow]] = [a[maxRow], a[i]];
      [b[i], b[maxRow]] = [b[maxRow], b[i]];
      const pivot = a[i]?.[i] ?? 0;
      if (Math.abs(pivot) < 0.000000000001)
        continue;
      for (let k = i + 1;k < n; k += 1) {
        const factor = (a[k]?.[i] ?? 0) / pivot;
        for (let j = i;j < n; j += 1) {
          a[k][j] = (a[k]?.[j] ?? 0) - factor * (a[i]?.[j] ?? 0);
        }
        b[k] = (b[k] ?? 0) - factor * (b[i] ?? 0);
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1;i >= 0; i -= 1) {
      let sum = b[i] ?? 0;
      for (let j = i + 1;j < n; j += 1)
        sum -= (a[i]?.[j] ?? 0) * x[j];
      const pivot = a[i]?.[i] ?? 0;
      x[i] = Math.abs(pivot) < 0.000000000001 ? 0 : sum / pivot;
    }
    return x;
  }
  function fitLinear(points) {
    const n = points.length;
    if (n === 0)
      return { predict: (x) => 0 };
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumXX += point.x * point.x;
    }
    const denom = n * sumXX - sumX * sumX;
    const slope = Math.abs(denom) < 0.000000000001 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { predict: (x) => slope * x + intercept };
  }
  function fitPolynomial(points, requestedDegree = 2) {
    const degree = Math.max(2, Math.min(4, Math.floor(requestedDegree)));
    const dim = degree + 1;
    const a = Array.from({ length: dim }, () => new Array(dim).fill(0));
    const b = new Array(dim).fill(0);
    for (let row = 0;row < dim; row += 1) {
      for (let col = 0;col < dim; col += 1) {
        let sum = 0;
        for (const p of points)
          sum += p.x ** (row + col);
        a[row][col] = sum;
      }
      let rhs = 0;
      for (const p of points)
        rhs += p.y * p.x ** row;
      b[row] = rhs;
    }
    const coeffs = solveLinearSystem(a, b);
    return {
      predict: (x) => coeffs.reduce((total, coeff, idx) => total + coeff * x ** idx, 0)
    };
  }
  function fitLogarithmic(points) {
    const transformed = points.filter((point) => point.x > 0).map((point) => ({ x: Math.log(point.x), y: point.y }));
    const linear = fitLinear(transformed);
    return { predict: (x) => x > 0 ? linear.predict(Math.log(x)) : 0 };
  }
  function fitExponential(points) {
    const transformed = points.filter((point) => point.y > 0).map((point) => ({ x: point.x, y: Math.log(point.y) }));
    const linear = fitLinear(transformed);
    return { predict: (x) => Math.exp(linear.predict(x)) };
  }
  function buildTrendline(points, options) {
    if (options.mode === "polynomial")
      return fitPolynomial(points, options.degree);
    if (options.mode === "logarithmic")
      return fitLogarithmic(points);
    if (options.mode === "exponential")
      return fitExponential(points);
    return fitLinear(points);
  }
  function forecastTrend(points, options, forecastPoints) {
    if (!Number.isFinite(forecastPoints) || forecastPoints <= 0)
      return [];
    if (points.length === 0)
      return [];
    const model = buildTrendline(points, options);
    const sorted = points.slice().sort((left, right) => left.x - right.x);
    const lastX = sorted[sorted.length - 1]?.x ?? 0;
    const priorX = sorted.length > 1 ? sorted[sorted.length - 2]?.x ?? lastX - 1 : lastX - 1;
    const step = Math.max(0.000001, lastX - priorX);
    const out = [];
    for (let i = 1;i <= forecastPoints; i += 1) {
      const x = lastX + step * i;
      out.push({ x, y: model.predict(x) });
    }
    return out;
  }

  // src/client/analytics/time-series-chart.ts
  function decimate(points, maxPoints = 240) {
    if (points.length <= maxPoints)
      return points;
    const stride = Math.ceil(points.length / maxPoints);
    const out = [];
    for (let i = 0;i < points.length; i += stride)
      out.push(points[i]);
    return out;
  }
  function formatCompactNumber(value) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  function formatMetric3(value, type = "number", compact = false) {
    if (type === "currency_usd") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : 0
      }).format(value);
    }
    if (type === "percent") {
      const percent = Math.abs(value) <= 1.5 ? value * 100 : value;
      if (compact)
        return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(percent)}%`;
      return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(percent)}%`;
    }
    return compact ? formatCompactNumber(value) : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  }
  function asDateTimestamp(value) {
    if (value == null)
      return Number.NaN;
    const text = String(value).trim();
    if (!text)
      return Number.NaN;
    if (!/^\d{4}-\d{2}-\d{2}/.test(text) && !/^\d{2}:\d{2}/.test(text))
      return Number.NaN;
    return Date.parse(text);
  }
  function formatDateTick(ts, mode) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: mode === "day" ? "numeric" : undefined,
      year: mode === "month" ? "numeric" : undefined,
      timeZone: "UTC"
    }).format(new Date(ts));
  }
  function compressTicks(ticks, maxTicks = 7) {
    if (ticks.length <= maxTicks)
      return ticks;
    const out = [];
    const stride = (ticks.length - 1) / (maxTicks - 1);
    for (let i = 0;i < maxTicks; i += 1) {
      const index = Math.round(i * stride);
      out.push(ticks[Math.min(ticks.length - 1, index)]);
    }
    const deduped = [];
    const seen = new Set;
    for (const tick of out) {
      const key = Math.round(tick.x);
      if (seen.has(key))
        continue;
      seen.add(key);
      deduped.push(tick);
    }
    return deduped;
  }
  function buildDateTicks(minX, maxX, maxTicks = 7) {
    const dayMs = 86400000;
    const spanDays = Math.max(1, Math.round((maxX - minX) / dayMs));
    const mode = spanDays >= 90 ? "month" : "day";
    const ticks = [];
    if (mode === "month") {
      const start = new Date(minX);
      const end = new Date(maxX);
      const startMonthTs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
      const totalMonths = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1;
      const monthStep = Math.max(1, Math.ceil(totalMonths / Math.max(2, maxTicks - 1)));
      for (let offset = 0;offset < totalMonths; offset += monthStep) {
        const tickDate = new Date(startMonthTs);
        tickDate.setUTCMonth(tickDate.getUTCMonth() + offset);
        const tickX = tickDate.getTime();
        if (tickX < minX || tickX > maxX)
          continue;
        ticks.push({ x: tickX, label: formatDateTick(tickX, mode) });
      }
    } else {
      const start = new Date(minX);
      const startDayTs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
      const dayStep = Math.max(1, Math.ceil(spanDays / Math.max(2, maxTicks - 1)));
      for (let tickX = startDayTs;tickX <= maxX; tickX += dayStep * dayMs) {
        if (tickX < minX)
          continue;
        ticks.push({ x: tickX, label: formatDateTick(tickX, mode) });
      }
    }
    ticks.unshift({ x: minX, label: formatDateTick(minX, mode) });
    ticks.push({ x: maxX, label: formatDateTick(maxX, mode) });
    const deduped = [];
    const seen = new Set;
    for (const tick of ticks.sort((left, right) => left.x - right.x)) {
      const key = Math.round(tick.x);
      if (seen.has(key))
        continue;
      seen.add(key);
      deduped.push(tick);
    }
    return compressTicks(deduped, maxTicks);
  }
  function buildNumericTicks(minX, maxX, labelsByX, maxTicks = 7) {
    if (maxX <= minX)
      return [{ x: minX, label: labelsByX.get(minX) ?? formatCompactNumber(minX) }];
    const ticks = [];
    const step = (maxX - minX) / Math.max(1, maxTicks - 1);
    for (let i = 0;i < maxTicks; i += 1) {
      const x = minX + step * i;
      const nearest = Math.round(x);
      ticks.push({
        x,
        label: labelsByX.get(nearest) ?? labelsByX.get(x) ?? formatCompactNumber(x)
      });
    }
    return compressTicks(ticks, maxTicks);
  }

  class TimeSeriesChart extends BaseAnalyticsWidget {
    options;
    constructor(root, options) {
      super(root);
      this.options = options;
    }
    setData(data) {
      super.setData(data);
    }
    render() {
      const width = 620;
      const height = 188;
      const padX = 42;
      const padTop = 18;
      const padBottom = 34;
      const xField = this.options.xField;
      const yField = this.options.yField;
      const source = this.data.rows.map((row, rowIndex) => {
        const xValue = row[xField];
        const yValue = row[yField];
        const xDate = asDateTimestamp(xValue);
        const parsedAsDate = Number.isFinite(xDate);
        const numericX = Number(xValue);
        const xNum = parsedAsDate ? xDate : Number.isFinite(numericX) ? numericX : rowIndex + 1;
        const yNum = Number(yValue);
        if (!Number.isFinite(xNum) || !Number.isFinite(yNum))
          return null;
        return {
          x: xNum,
          y: yNum,
          isDate: parsedAsDate,
          xLabel: parsedAsDate ? new Date(xDate).toISOString().slice(0, 10) : String(xValue ?? rowIndex + 1)
        };
      }).filter((value) => Boolean(value)).sort((left, right) => left.x - right.x);
      if (source.length === 0) {
        this.root.innerHTML = `<div class="ui-empty">No plottable data</div>`;
        return;
      }
      const points = decimate(source.map((point) => ({ x: point.x, y: point.y })));
      const labelsByX = new Map(source.map((point) => [point.x, point.xLabel]));
      const dateAxis = source.filter((point) => point.isDate).length / source.length >= 0.66;
      const minX = points[0].x;
      const maxX = points[points.length - 1].x;
      const minY = Math.min(...points.map((point) => point.y));
      const maxY = Math.max(...points.map((point) => point.y));
      const xSpan = Math.max(1, maxX - minX);
      const ySpan = Math.max(1, maxY - minY);
      const scaleX = (x) => padX + (x - minX) / xSpan * (width - padX * 2);
      const scaleY = (y) => height - padBottom - (y - minY) / ySpan * (height - padTop - padBottom);
      const xTicks = dateAxis ? buildDateTicks(minX, maxX, 7) : buildNumericTicks(minX, maxX, labelsByX, 7);
      const svg = this.createSvg(width, height);
      const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
      grid.classList.add("ui-ts-grid");
      for (let i = 0;i <= 4; i += 1) {
        const y = padTop + (height - padTop - padBottom) * i / 4;
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
        const value = maxY - (maxY - minY) * i / 4;
        yLabel.textContent = formatMetric3(value, this.options.yType, true);
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
      seriesPath.setAttribute("d", points.map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x).toFixed(2)},${scaleY(point.y).toFixed(2)}`).join(" "));
      svg.append(seriesPath);
      const step = Math.max(1, Math.floor(points.length / 7));
      for (let i = 0;i < points.length; i += step) {
        const point = points[i];
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", String(scaleX(point.x)));
        dot.setAttribute("cy", String(scaleY(point.y)));
        dot.setAttribute("r", "3.2");
        dot.setAttribute("class", "ui-ts-dot");
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        const xLabel = labelsByX.get(point.x) ?? String(point.x);
        title.textContent = `${xLabel} | ${this.options.yLabel}: ${formatMetric3(point.y, this.options.yType)}`;
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
        trendPath.setAttribute("d", allTrend.map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x).toFixed(2)},${scaleY(point.y).toFixed(2)}`).join(" "));
        svg.append(trendPath);
      }
      for (let i = 0;i < xTicks.length; i += 1) {
        const tick = xTicks[i];
        const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        xLabel.setAttribute("x", String(scaleX(tick.x)));
        xLabel.setAttribute("y", String(height - 16));
        xLabel.setAttribute("class", "ui-ts-axis-label");
        if (i === 0)
          xLabel.setAttribute("text-anchor", "start");
        else if (i === xTicks.length - 1)
          xLabel.setAttribute("text-anchor", "end");
        else
          xLabel.setAttribute("text-anchor", "middle");
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
      const last = points[points.length - 1];
      latest.textContent = `Latest: ${formatMetric3(last.y, this.options.yType)}`;
      svg.append(latest);
      this.root.innerHTML = "";
      this.root.append(svg);
      this.animateMount();
    }
  }

  // src/client/analytics/analytics.page.ts
  function isDateLikeValue(value) {
    if (value == null)
      return false;
    if (typeof value === "number")
      return false;
    const text = String(value).trim();
    if (!text)
      return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text))
      return true;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(text))
      return true;
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(text))
      return true;
    return false;
  }
  function looksLikeTemporalKey(key) {
    return /(^|_)(date|time|month|quarter|year|day|week|timestamp|at)$/.test(key.toLowerCase());
  }
  function looksLikeIdentifierKey(key) {
    return /(id|uuid|code|sku|email|order_no|account_code)$/i.test(key);
  }
  function toTitleCase(text) {
    return text.replaceAll(/[_-]+/g, " ").trim().replace(/\b\w/g, (char) => char.toUpperCase());
  }
  function fieldLabel(payload, field) {
    const col = payload.columns.find((item) => item.key === field);
    const raw = String(col?.label ?? field);
    return toTitleCase(raw);
  }
  function formatTypeLabel(type) {
    if (type === "currency_usd")
      return "USD";
    if (type === "percent")
      return "Percent";
    if (type === "date")
      return "Date";
    if (type === "datetime")
      return "Datetime";
    if (type === "time")
      return "Time";
    if (type === "number")
      return "Number";
    return "Text";
  }
  function profileFields(payload) {
    const rowObjects = payload.rows.map((row) => {
      const mapped = {};
      for (let i = 0;i < payload.columns.length; i += 1) {
        const key = payload.columns[i]?.key;
        if (!key)
          continue;
        mapped[key] = row[i] ?? null;
      }
      return mapped;
    });
    const profiles = payload.columns.map((column, index) => {
      const values = rowObjects.map((row) => row[column.key]);
      const nonNull = values.filter((value) => value != null && String(value).trim() !== "").length;
      let numericCount = 0;
      let dateCount = 0;
      const distinct = new Set;
      for (const value of values) {
        if (value == null || String(value).trim() === "")
          continue;
        distinct.add(String(value));
        const numeric = Number(value);
        if (Number.isFinite(numeric))
          numericCount += 1;
        if (isDateLikeValue(value))
          dateCount += 1;
      }
      return {
        key: column.key,
        type: String(column.type ?? "string"),
        index,
        nonNull,
        distinct: distinct.size,
        numericRatio: nonNull > 0 ? numericCount / nonNull : 0,
        dateRatio: nonNull > 0 ? dateCount / nonNull : 0
      };
    });
    return profiles;
  }
  function pickFields(payload) {
    const profiles = profileFields(payload);
    const rowCount = payload.rows.length;
    const numericProfiles = profiles.filter((profile) => {
      const typedNumeric = profile.type === "number" || profile.type === "currency_usd" || profile.type === "percent";
      return typedNumeric || profile.numericRatio >= 0.92;
    }).sort((left, right) => {
      const leftTyped = left.type === "currency_usd" || left.type === "number" || left.type === "percent" ? 1 : 0;
      const rightTyped = right.type === "currency_usd" || right.type === "number" || right.type === "percent" ? 1 : 0;
      if (leftTyped !== rightTyped)
        return rightTyped - leftTyped;
      if (left.distinct !== right.distinct)
        return right.distinct - left.distinct;
      return left.index - right.index;
    });
    const yProfile = numericProfiles[0];
    const temporalProfiles = profiles.filter((profile) => {
      const typedTemporal = profile.type === "date" || profile.type === "datetime" || profile.type === "time";
      const temporalish = typedTemporal || looksLikeTemporalKey(profile.key) || profile.dateRatio >= 0.75;
      return temporalish && profile.distinct > 1;
    }).sort((left, right) => {
      const leftTyped = left.type === "date" || left.type === "datetime" || left.type === "time" ? 1 : 0;
      const rightTyped = right.type === "date" || right.type === "datetime" || right.type === "time" ? 1 : 0;
      if (leftTyped !== rightTyped)
        return rightTyped - leftTyped;
      if (left.dateRatio !== right.dateRatio)
        return right.dateRatio - left.dateRatio;
      return left.index - right.index;
    });
    const xTemporal = temporalProfiles[0];
    const firstCategory = profiles.filter((profile) => profile.key !== yProfile?.key && profile.key !== xTemporal?.key).map((profile) => ({ ...profile, typedString: profile.type === "string" ? 1 : 0 })).sort((left, right) => {
      if (left.typedString !== right.typedString)
        return right.typedString - left.typedString;
      return left.index - right.index;
    })[0];
    const maxUsefulBuckets = Math.max(3, Math.min(14, Math.floor(rowCount * 0.28)));
    const categoryProfiles = profiles.filter((profile) => profile.key !== yProfile?.key && profile.key !== xTemporal?.key).filter((profile) => profile.distinct >= 2 && profile.distinct <= maxUsefulBuckets).filter((profile) => !looksLikeIdentifierKey(profile.key)).sort((left, right) => {
      const leftTemporalPenalty = looksLikeTemporalKey(left.key) ? 1 : 0;
      const rightTemporalPenalty = looksLikeTemporalKey(right.key) ? 1 : 0;
      if (leftTemporalPenalty !== rightTemporalPenalty)
        return leftTemporalPenalty - rightTemporalPenalty;
      const leftDistance = Math.abs(left.distinct - 6);
      const rightDistance = Math.abs(right.distinct - 6);
      if (leftDistance !== rightDistance)
        return leftDistance - rightDistance;
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
      labelType: labelChosen.type ?? "string"
    };
  }
  (function initAnalyticsPage() {
    const configEl = document.getElementById("analyticsConfig");
    const datasetSelect = document.getElementById("analyticsDatasetSelect");
    const textFilter = document.getElementById("analyticsTextFilter");
    const minFilter = document.getElementById("analyticsMinFilter");
    const maxFilter = document.getElementById("analyticsMaxFilter");
    const applyButton = document.getElementById("analyticsApplyBtn");
    const refreshButton = document.querySelector('[data-action="refresh-analytics"]');
    const meta = document.getElementById("analyticsMeta");
    if (!configEl || !datasetSelect || !textFilter || !minFilter || !maxFilter || !applyButton || !meta)
      return;
    const config = JSON.parse(configEl.textContent || "{}");
    const adapter = new AnalyticsApiClient({
      datasetsEndpoint: config.datasetsEndpoint ?? "/api/analytics/datasets",
      queryEndpoint: config.queryEndpoint ?? "/api/analytics/query"
    });
    let datasetOptions = Array.isArray(config.options) ? config.options.slice() : [];
    function applyDatasetOptions(options, preferred) {
      datasetSelect.innerHTML = "";
      for (const option of options) {
        const el = document.createElement("option");
        el.value = option.key;
        el.textContent = option.label;
        datasetSelect.append(el);
      }
      const selected = options.some((option) => option.key === preferred) ? preferred : options[0]?.key ?? "";
      if (selected)
        datasetSelect.value = selected;
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
      histH: document.getElementById("analyticsHistogramHorizontal")
    };
    if (!roots.time || !roots.donut || !roots.pie || !roots.histV || !roots.histH)
      return;
    const titleEls = {
      time: document.getElementById("analyticsTimeSeriesTitle"),
      donut: document.getElementById("analyticsDonutTitle"),
      pie: document.getElementById("analyticsPieTitle"),
      histV: document.getElementById("analyticsHistogramVerticalTitle"),
      histH: document.getElementById("analyticsHistogramHorizontalTitle")
    };
    const metaEls = {
      time: document.getElementById("analyticsTimeSeriesMeta"),
      donut: document.getElementById("analyticsDonutMeta"),
      pie: document.getElementById("analyticsPieMeta"),
      histV: document.getElementById("analyticsHistogramVerticalMeta"),
      histH: document.getElementById("analyticsHistogramHorizontalMeta")
    };
    let activeWidgets = [];
    let activeLoadToken = 0;
    function updateWidgetDescriptions(payload, fields) {
      const agg = fields.yType === "percent" ? "average" : "sum";
      const xLabel = fieldLabel(payload, fields.xField);
      const yLabel = fieldLabel(payload, fields.yField);
      const categoryLabel = fieldLabel(payload, fields.labelField);
      const yUnit = formatTypeLabel(fields.yType);
      if (titleEls.time)
        titleEls.time.textContent = `${yLabel} Over ${xLabel}`;
      if (metaEls.time)
        metaEls.time.textContent = `X: ${xLabel} (${formatTypeLabel(fields.xType)}) · Y: ${yLabel} (${yUnit})`;
      if (roots.time)
        roots.time.setAttribute("aria-label", `Time series of ${yLabel} over ${xLabel}`);
      if (titleEls.donut)
        titleEls.donut.textContent = `${yLabel} by ${categoryLabel}`;
      if (metaEls.donut)
        metaEls.donut.textContent = `${agg} ${yLabel} grouped by ${categoryLabel}`;
      if (roots.donut)
        roots.donut.setAttribute("aria-label", `Donut chart of ${yLabel} by ${categoryLabel}`);
      if (titleEls.pie)
        titleEls.pie.textContent = `${yLabel} by ${categoryLabel}`;
      if (metaEls.pie)
        metaEls.pie.textContent = `${agg} ${yLabel} grouped by ${categoryLabel}`;
      if (roots.pie)
        roots.pie.setAttribute("aria-label", `Pie chart of ${yLabel} by ${categoryLabel}`);
      if (titleEls.histV)
        titleEls.histV.textContent = `${yLabel} by ${categoryLabel} (Vertical)`;
      if (metaEls.histV)
        metaEls.histV.textContent = `${agg} ${yLabel} grouped by ${categoryLabel}`;
      if (roots.histV)
        roots.histV.setAttribute("aria-label", `Vertical histogram of ${yLabel} by ${categoryLabel}`);
      if (titleEls.histH)
        titleEls.histH.textContent = `${yLabel} by ${categoryLabel} (Horizontal)`;
      if (metaEls.histH)
        metaEls.histH.textContent = `${agg} ${yLabel} grouped by ${categoryLabel}`;
      if (roots.histH)
        roots.histH.setAttribute("aria-label", `Horizontal histogram of ${yLabel} by ${categoryLabel}`);
    }
    function getBasicFilters(fields) {
      const filters = [];
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
    function renderWidgets(payload) {
      const fields = pickFields(payload);
      updateWidgetDescriptions(payload, fields);
      for (const widget of activeWidgets)
        widget.destroy();
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
        forecastPoints: 6
      });
      const donut = new PieDonutChart(roots.donut, {
        labelField: fields.labelField,
        valueField: fields.valueField,
        valueType: fields.yType,
        aggregation,
        innerRadius: 36,
        showLegend: true,
        maxSlices: 5
      });
      const pie = new PieDonutChart(roots.pie, {
        labelField: fields.labelField,
        valueField: fields.valueField,
        valueType: fields.yType,
        aggregation,
        showLegend: true,
        maxSlices: 5
      });
      const histV = new HistogramChart(roots.histV, {
        labelField: fields.labelField,
        valueField: fields.valueField,
        valueType: fields.yType,
        aggregation,
        orientation: "vertical"
      });
      const histH = new HistogramChart(roots.histH, {
        labelField: fields.labelField,
        valueField: fields.valueField,
        valueType: fields.yType,
        aggregation,
        orientation: "horizontal"
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
        for (const widget of activeWidgets)
          widget.destroy();
        activeWidgets = [];
        return;
      }
      applyButton.disabled = true;
      if (refreshButton)
        refreshButton.disabled = true;
      meta.textContent = "Loading...";
      try {
        const baseline = await adapter.query({
          dataset,
          page: { offset: 0, limit: 600 }
        });
        const fields = pickFields(baseline);
        const filters = getBasicFilters(fields);
        const payload = filters.length > 0 ? await adapter.query({
          dataset,
          filters,
          page: { offset: 0, limit: 600 }
        }) : baseline;
        if (loadToken !== activeLoadToken)
          return;
        renderWidgets(payload);
        meta.textContent = `${dataset} | ${payload.totalRows.toLocaleString()} rows | ${payload.columns.length} fields`;
      } catch (error) {
        if (loadToken !== activeLoadToken)
          return;
        console.error(error);
        meta.textContent = "Failed to load analytics data";
      } finally {
        if (loadToken === activeLoadToken) {
          applyButton.disabled = false;
          if (refreshButton)
            refreshButton.disabled = false;
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
    bootstrap();
    window.addEventListener("pageshow", (event) => {
      if (event.persisted)
        bootstrap();
    });
  })();
})();
