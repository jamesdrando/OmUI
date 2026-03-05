function envFlag(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return fallback;
}

function envText(value: string | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function joinUrl(base: string, path: string) {
  const left = base.replace(/\/+$/g, "");
  const right = path.startsWith("/") ? path : `/${path}`;
  return `${left}${right}`;
}

const demoMode = envFlag(process.env.OMUI_DEMO_MODE, true);
const analyticsProxyBaseUrl = envText(process.env.OMUI_ANALYTICS_PROXY_BASE_URL) ?? envText(process.env.OMUI_BACKEND_BASE_URL);
const analyticsDatasetsPath = envText(process.env.OMUI_ANALYTICS_DATASETS_PATH) ?? "/api/analytics/datasets";
const analyticsQueryPath = envText(process.env.OMUI_ANALYTICS_QUERY_PATH) ?? "/api/analytics/query";

export const runtimeConfig = {
  demoMode,
  analyticsProxy:
    !demoMode && analyticsProxyBaseUrl
      ? {
          baseUrl: analyticsProxyBaseUrl,
          datasetsUrl: joinUrl(analyticsProxyBaseUrl, analyticsDatasetsPath),
          queryUrl: joinUrl(analyticsProxyBaseUrl, analyticsQueryPath),
        }
      : null,
};
