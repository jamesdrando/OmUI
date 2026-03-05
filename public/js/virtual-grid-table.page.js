(function initDashboardTablePage() {
  const configEl = document.getElementById("tableDatasetConfig");
  const host = document.getElementById("tableGrid");
  const selector = document.getElementById("tableDatasetSelect");
  const meta = document.getElementById("tableDatasetMeta");

  if (!configEl || !host || !selector || !meta || typeof window.VirtualGridTable !== "function") {
    return;
  }

  let config = { defaultDataset: "orders", options: [], datasetEndpointBase: "/api/datasets" };
  function decodeHtmlEntities(text) {
    return text
      .replaceAll("&quot;", "\"")
      .replaceAll("&#39;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&");
  }
  try {
    const raw = configEl.textContent || "{}";
    config = JSON.parse(raw);
  } catch {
    try {
      const raw = configEl.textContent || "{}";
      config = JSON.parse(decodeHtmlEntities(raw));
    } catch {
      config = { defaultDataset: "orders", options: [], datasetEndpointBase: "/api/datasets" };
    }
  }

  const grid = new window.VirtualGridTable("tableGrid", {
    demo_mode: false,
    width: "100%",
    height: "100%",
  });

  const cache = Object.create(null);
  const optionLabels = Object.create(null);

  for (const option of Array.isArray(config.options) ? config.options : []) {
    optionLabels[option.key] = option.label;
  }

  function formatMeta(key, payload) {
    const label = optionLabels[key] || key;
    return label + " | " + payload.rows.length.toLocaleString() + " rows | " + payload.columns.length + " columns";
  }

  async function fetchDataset(key) {
    const endpoint = (config.datasetEndpointBase || "/api/datasets").replace(/\/$/, "") + "/" + encodeURIComponent(key);
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error("Dataset request failed: " + response.status);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.columns) || !Array.isArray(payload.rows)) {
      throw new Error("Unexpected dataset payload shape");
    }

    return payload;
  }

  async function loadDataset(key) {
    const selected = optionLabels[key] ? key : (config.defaultDataset || "orders");
    grid.setLoading(true);
    meta.textContent = "Loading...";

    try {
      if (!cache[selected]) {
        cache[selected] = await fetchDataset(selected);
      }

      const payload = cache[selected];
      grid.setData(payload);
      grid.clearSearch();
      grid.clearColumnFilters();
      grid.clearSort();
      meta.textContent = formatMeta(selected, payload);
    } catch (error) {
      console.error(error);
      meta.textContent = "Failed to load dataset";
    } finally {
      grid.setLoading(false);
    }
  }

  selector.addEventListener("change", function (event) {
    loadDataset(event.target.value);
  });

  if (config.defaultDataset) {
    selector.value = config.defaultDataset;
  }

  loadDataset(selector.value || "orders");
})();
