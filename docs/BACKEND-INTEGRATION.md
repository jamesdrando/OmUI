# Backend Integration Guide

This document is the operational handoff for connecting OmUI to a backend that this repo does not know in advance.

## 1) Integration Modes

### A. Fast path (recommended first): analytics proxy only
Use existing UI + charts immediately, with your backend powering dataset metadata/query APIs.

Environment:

```bash
OMUI_DEMO_MODE=0
OMUI_ANALYTICS_PROXY_BASE_URL=https://your-backend.example.com
# optional:
# OMUI_ANALYTICS_DATASETS_PATH=/api/analytics/datasets
# OMUI_ANALYTICS_QUERY_PATH=/api/analytics/query
```

Behavior:
- `/api/analytics/datasets` and `/api/analytics/query` are proxied upstream.
- Table and analytics pages fetch datasets dynamically at runtime.
- Unknown field names are supported through dataset descriptors.

### B. Full integration: replace page adapters
For non-analytics pages (`overview`, `items`, `users`) replace demo adapters with backend adapters.

Touchpoints:
- `src/adapters/overview.adapter.ts`
- `src/adapters/items.adapter.ts`
- `src/adapters/users.adapter.ts`
- `src/adapters/tables.adapter.ts` (optional if you want SSR dataset options)
- `src/adapters/analytics.adapter.ts` (optional if you want SSR dataset options)

Current non-demo fallback for these adapters is intentionally empty data, not demo data.

## 2) Request Context Contract

In non-demo mode, auth/context comes from headers:
- `x-user-id` (required for signed-in behavior)
- `x-user-name` (optional)
- `x-user-role` (`admin` or `member`)
- `x-provider` (optional system/provider key)
- `x-tenant-id` (optional tenant key)
- `x-authenticated` (`1|true|yes` accepted)

If `x-user-id` is missing, dashboard routes return `401 Unauthorized` with header guidance.

## 3) Analytics API Contract

Contract vs example:
- JSON snippets below are schema examples, not fixed payloads.
- Backend dataset keys, field keys, labels, values, and row counts are expected to vary.
- OmUI requires compatible shape and types, not specific business field names like `orders` or `total_usd`.

### GET `/api/analytics/datasets`

Expected response shape:

```json
{
  "datasets": [
    {
      "key": "orders",
      "label": "Orders",
      "fields": [
        { "key": "ordered_at", "label": "Ordered At", "type": "date" },
        { "key": "region", "label": "Region", "type": "string" },
        { "key": "total_usd", "label": "Total USD", "type": "currency_usd" }
      ],
      "capabilities": {
        "filterable": ["ordered_at", "region", "total_usd"],
        "sortable": ["ordered_at", "region", "total_usd"],
        "pageable": true
      }
    }
  ]
}
```

### POST `/api/analytics/query`

Request shape:

```json
{
  "dataset": "orders",
  "select": ["ordered_at", "region", "total_usd"],
  "filters": [{ "field": "region", "op": "eq", "value": "US South" }],
  "sort": [{ "field": "ordered_at", "dir": "desc" }],
  "page": { "offset": 0, "limit": 250 }
}
```

Response shape:

```json
{
  "columns": [
    { "key": "ordered_at", "label": "Ordered At", "type": "date" },
    { "key": "region", "label": "Region", "type": "string" },
    { "key": "total_usd", "label": "Total USD", "type": "currency_usd" }
  ],
  "rows": [
    ["2026-01-02", "US South", 12990.42]
  ],
  "totalRows": 48120,
  "capabilities": {
    "filterable": ["ordered_at", "region", "total_usd"],
    "sortable": ["ordered_at", "region", "total_usd"],
    "pageable": true
  }
}
```

Supported filter ops in local mode: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `between`, `in`.
Filter coverage for proxied backends is backend-defined; prefer supporting the full set above.

## 4) Unknown Field Handling

The analytics UI does not assume hard-coded field names:
- Field types and labels come from `datasets.fields`.
- Chart field selection is heuristic-based (`src/client/analytics/analytics.page.ts`).
- Table columns are generated directly from dataset descriptors.
- If your backend uses different domain vocabulary, do not rename fields to match examples in this doc.

Guidance:
- Always return accurate `type` values when possible.
- For date/time axes, include `date|datetime|time` types explicitly.
- For money/percent metrics, use `currency_usd` or `percent` to improve chart formatting.

## 5) Production Checklist

1. Set `OMUI_DEMO_MODE=0`.
2. Pass `x-user-id` (and role/name) headers from your gateway/session layer.
3. Configure analytics proxy env vars.
4. Verify `/api/analytics/datasets` and `/api/analytics/query` return live backend data.
5. Validate table + analytics pages against real datasets.
6. Replace non-analytics adapters if you need real overview/items/users content.
7. Run `bun run test` and `bun run typecheck`.

## 6) Common Failure Modes

- `401 Unauthorized` on dashboard routes: missing `x-user-id` header in non-demo mode.
- Empty dataset dropdowns: upstream datasets endpoint returned no datasets or failed.
- Charts showing `No plottable data`: query returned rows but chosen metric/category columns were non-numeric/empty.
- `502 Upstream analytics service unavailable`: proxy base URL/path is wrong or backend is unreachable.
