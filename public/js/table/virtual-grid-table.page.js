(() => {
  // src/client/table/virtual-grid-table.page.ts
  (function initDashboardTablePage() {
    const configEl = document.getElementById("tableDatasetConfig");
    const host = document.getElementById("tableGrid");
    const selector = document.getElementById("tableDatasetSelect");
    const meta = document.getElementById("tableDatasetMeta");
    if (!configEl || !host || !selector || !meta || typeof window.VirtualGridTable !== "function") {
      return;
    }
    let config = {
      defaultDataset: "",
      options: [],
      datasetsEndpoint: "/api/analytics/datasets",
      queryEndpoint: "/api/analytics/query"
    };
    function decodeHtmlEntities(text) {
      return text.replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
    }
    try {
      const raw = configEl.textContent || "{}";
      config = JSON.parse(raw);
    } catch {
      try {
        const raw = configEl.textContent || "{}";
        config = JSON.parse(decodeHtmlEntities(raw));
      } catch {
        config = {
          defaultDataset: "",
          options: [],
          datasetsEndpoint: "/api/analytics/datasets",
          queryEndpoint: "/api/analytics/query"
        };
      }
    }
    const grid = new window.VirtualGridTable("tableGrid", {
      demo_mode: false,
      width: "100%",
      height: "100%"
    });
    const datasetMetaCache = Object.create(null);
    const optionLabels = Object.create(null);
    function syncOptionLabels(options) {
      for (const key of Object.keys(optionLabels))
        delete optionLabels[key];
      for (const option of options)
        optionLabels[option.key] = option.label;
    }
    function renderSelectorOptions(options, preferred) {
      selector.innerHTML = "";
      for (const option of options) {
        const el = document.createElement("option");
        el.value = option.key;
        el.textContent = option.label;
        selector.append(el);
      }
      const selected = options.some((option) => option.key === preferred) ? preferred : options[0]?.key || "";
      if (selected)
        selector.value = selected;
      return selected;
    }
    if (Array.isArray(config.options) && config.options.length > 0) {
      syncOptionLabels(config.options);
      renderSelectorOptions(config.options, config.defaultDataset || "");
    }
    function formatMeta(key, totalRows, totalCols) {
      const label = optionLabels[key] || key;
      return label + " | " + Number(totalRows || 0).toLocaleString() + " rows | " + Number(totalCols || 0) + " columns";
    }
    async function fetchDatasetMeta() {
      const response = await fetch(config.datasetsEndpoint || "/api/analytics/datasets", { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error("Dataset metadata request failed: " + response.status);
      }
      const payload = await response.json();
      return payload.datasets || [];
    }
    async function ensureDatasetList() {
      if (Array.isArray(datasetMetaCache.__list) && datasetMetaCache.__list.length > 0) {
        return datasetMetaCache.__list;
      }
      const list = await fetchDatasetMeta();
      datasetMetaCache.__list = list;
      const options = list.map((item) => ({ key: item.key, label: item.label || item.key }));
      syncOptionLabels(options);
      renderSelectorOptions(options, selector.value || config.defaultDataset || "");
      return list;
    }
    async function queryDataset(body) {
      const response = await fetch(config.queryEndpoint || "/api/analytics/query", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok)
        throw new Error("Analytics query failed: " + response.status);
      return response.json();
    }
    function toQueryFilters(request, columns) {
      const filters = [];
      if (request.query && request.query.trim()) {
        if (request.searchColumn >= 0) {
          const col = columns[request.searchColumn];
          if (col?.key)
            filters.push({ field: col.key, op: "contains", value: request.query.trim() });
        } else {
          const first = columns[0];
          if (first?.key)
            filters.push({ field: first.key, op: "contains", value: request.query.trim() });
        }
      }
      for (const colFilter of request.columnFilters || []) {
        const col = columns[colFilter.colIndex];
        if (!col?.key)
          continue;
        const opMap = {
          like: "contains",
          "=": "eq",
          ">": "gt",
          "<": "lt",
          ">=": "gte",
          "<=": "lte",
          not: "neq",
          between: "between"
        };
        const op = opMap[colFilter.op];
        if (!op)
          continue;
        if (op === "between") {
          filters.push({ field: col.key, op, value: [colFilter.value, colFilter.valueTo] });
        } else {
          filters.push({ field: col.key, op, value: colFilter.value });
        }
      }
      return filters;
    }
    async function loadDataset(key) {
      grid.setLoading(true);
      meta.textContent = "Loading...";
      try {
        const list = await ensureDatasetList();
        if (!list.length) {
          grid.setData({ columns: [], rows: [] });
          meta.textContent = "No datasets available";
          return;
        }
        const selected = list.some((item) => item.key === key) ? key : list.some((item) => item.key === config.defaultDataset) ? config.defaultDataset : list[0]?.key;
        if (!selected) {
          grid.setData({ columns: [], rows: [] });
          meta.textContent = "No datasets available";
          return;
        }
        if (selector.value !== selected)
          selector.value = selected;
        const descriptor = list.find((item) => item.key === selected);
        if (!descriptor)
          throw new Error("Dataset metadata not found for " + selected);
        const columns = descriptor.fields.map((field) => ({ key: field.key, label: field.label || field.key }));
        const warmup = await queryDataset({ dataset: selected, page: { offset: 0, limit: 1 } });
        grid.setServerPaging({
          columns,
          pageSize: 250,
          totalRows: warmup.totalRows || 0,
          async fetchPage(request) {
            const filters = toQueryFilters(request, columns);
            const sort = request.sort ? [
              {
                field: columns[request.sort.colIndex]?.key || columns[0]?.key,
                dir: request.sort.dir
              }
            ] : [];
            const response = await queryDataset({
              dataset: selected,
              select: columns.map((col) => col.key),
              filters,
              sort,
              page: {
                offset: request.start,
                limit: request.size
              }
            });
            return {
              start: request.start,
              totalRows: response.totalRows,
              rows: response.rows
            };
          }
        });
        grid.clearSearch();
        grid.clearColumnFilters();
        grid.clearSort();
        meta.textContent = formatMeta(selected, warmup.totalRows, columns.length);
      } catch (error) {
        console.error(error);
        meta.textContent = "Failed to load dataset";
      } finally {
        grid.setLoading(false);
      }
    }
    selector.addEventListener("change", function(event) {
      loadDataset(event.target.value);
    });
    if (config.defaultDataset) {
      selector.value = config.defaultDataset;
    }
    loadDataset(selector.value || config.defaultDataset || "");
  })();
})();
