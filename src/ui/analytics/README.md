# Analytics Namespace

Put analytics-specific widgets in this folder.

Rules:
- Consume typed view models only.
- No direct backend calls from SSR UI components; client runtime adapters in `src/client/analytics` handle fetch/query.
- Reuse shared primitives from `src/ui/components`.
- Add render tests for every new analytics widget.
