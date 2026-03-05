import { raw } from "hono/html";

export interface DatasetOption {
  key: string;
  label: string;
}

interface DataTablePanelProps {
  datasetOptions: DatasetOption[];
  defaultDataset: string;
}

export function DataTablePanel(props: DataTablePanelProps) {
  return (
    <article class="ui-card ui-span-12 ui-tablePanel">
      <header class="ui-tablePanel__head">
        <h2 class="ui-tablePanel__title">VirtualGridTable</h2>
        <div class="ui-tablePanel__tools">
          <div class="ui-tablePanel__controls">
            <label class="ui-formRow__label" for="tableDatasetSelect">
              Dataset
            </label>
            <select id="tableDatasetSelect" class="ui-select ui-tablePanel__select" aria-label="Choose dataset">
              {props.datasetOptions.map((option) => (
                <option value={option.key} selected={option.key === props.defaultDataset}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <span class="ui-tablePanel__meta" id="tableDatasetMeta">
            Ready
          </span>
        </div>
      </header>
      <div class="ui-tablePanel__body">
        <div id="tableGrid" data-vgt-host="table-grid" aria-label="Virtual data grid"></div>
      </div>
      <script id="tableDatasetConfig" type="application/json">
        {raw(
          JSON.stringify({
            defaultDataset: props.defaultDataset,
            options: props.datasetOptions,
            datasetsEndpoint: "/api/analytics/datasets",
            queryEndpoint: "/api/analytics/query",
          }),
        )}
      </script>
    </article>
  );
}
