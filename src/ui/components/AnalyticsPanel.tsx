import { raw } from "hono/html";
import type { DatasetOption } from "./DataTablePanel";

interface AnalyticsPanelProps {
  datasetOptions: DatasetOption[];
  defaultDataset: string;
  datasetsEndpoint?: string | undefined;
  queryEndpoint?: string | undefined;
}

export function AnalyticsPanel(props: AnalyticsPanelProps) {
  return (
    <section class="ui-analyticsPanel ui-span-12" aria-label="Analytics widgets">
      <article class="ui-card ui-analyticsToolbar">
        <header class="ui-analyticsToolbar__head">
          <h2 class="ui-card__title">Analytics Controls</h2>
        </header>
        <div class="ui-analyticsToolbar__body">
          <div class="ui-formRow">
            <label class="ui-formRow__label" for="analyticsDatasetSelect">
              Dataset
            </label>
            <select id="analyticsDatasetSelect" class="ui-select">
              {props.datasetOptions.map((option) => (
                <option value={option.key} selected={option.key === props.defaultDataset}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div class="ui-formRow">
            <label class="ui-formRow__label" for="analyticsTextFilter">
              Text filter
            </label>
            <input id="analyticsTextFilter" class="ui-input" type="search" placeholder="Contains..." />
          </div>
          <div class="ui-formRow">
            <label class="ui-formRow__label" for="analyticsMinFilter">
              Numeric min
            </label>
            <input id="analyticsMinFilter" class="ui-input" type="number" placeholder="0" />
          </div>
          <div class="ui-formRow">
            <label class="ui-formRow__label" for="analyticsMaxFilter">
              Numeric max
            </label>
            <input id="analyticsMaxFilter" class="ui-input" type="number" placeholder="1000" />
          </div>
          <button id="analyticsApplyBtn" class="ui-btn" type="button">
            Apply Filters
          </button>
          <span id="analyticsMeta" class="ui-analyticsToolbar__meta">
            Ready
          </span>
        </div>
      </article>

      <article class="ui-card ui-span-6 ui-analyticsWidget">
        <div class="ui-analyticsWidget__head">
          <h3 id="analyticsTimeSeriesTitle" class="ui-card__title">Time Series</h3>
          <p id="analyticsTimeSeriesMeta" class="ui-analyticsWidget__meta">Awaiting data</p>
        </div>
        <div id="analyticsTimeSeries" class="ui-analyticsCanvas" role="img" aria-label="Time series chart"></div>
      </article>
      <article class="ui-card ui-span-3 ui-analyticsWidget">
        <div class="ui-analyticsWidget__head">
          <h3 id="analyticsDonutTitle" class="ui-card__title">Donut</h3>
          <p id="analyticsDonutMeta" class="ui-analyticsWidget__meta">Awaiting data</p>
        </div>
        <div id="analyticsDonut" class="ui-analyticsCanvas" role="img" aria-label="Donut chart"></div>
      </article>
      <article class="ui-card ui-span-3 ui-analyticsWidget">
        <div class="ui-analyticsWidget__head">
          <h3 id="analyticsPieTitle" class="ui-card__title">Pie</h3>
          <p id="analyticsPieMeta" class="ui-analyticsWidget__meta">Awaiting data</p>
        </div>
        <div id="analyticsPie" class="ui-analyticsCanvas" role="img" aria-label="Pie chart"></div>
      </article>
      <article class="ui-card ui-span-6 ui-analyticsWidget">
        <div class="ui-analyticsWidget__head">
          <h3 id="analyticsHistogramVerticalTitle" class="ui-card__title">Histogram (Vertical)</h3>
          <p id="analyticsHistogramVerticalMeta" class="ui-analyticsWidget__meta">Awaiting data</p>
        </div>
        <div id="analyticsHistogramVertical" class="ui-analyticsCanvas" role="img" aria-label="Vertical histogram"></div>
      </article>
      <article class="ui-card ui-span-6 ui-analyticsWidget">
        <div class="ui-analyticsWidget__head">
          <h3 id="analyticsHistogramHorizontalTitle" class="ui-card__title">Histogram (Horizontal)</h3>
          <p id="analyticsHistogramHorizontalMeta" class="ui-analyticsWidget__meta">Awaiting data</p>
        </div>
        <div id="analyticsHistogramHorizontal" class="ui-analyticsCanvas" role="img" aria-label="Horizontal histogram"></div>
      </article>

      <script id="analyticsConfig" type="application/json">
        {raw(
          JSON.stringify({
            defaultDataset: props.defaultDataset,
            options: props.datasetOptions,
            datasetsEndpoint: props.datasetsEndpoint ?? "/api/analytics/datasets",
            queryEndpoint: props.queryEndpoint ?? "/api/analytics/query",
          }),
        )}
      </script>
    </section>
  );
}
