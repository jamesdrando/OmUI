import type { DashboardPageSpec } from "../../types/page-spec";
import type { DatasetOption } from "../components/DataTablePanel";
import { PageHeader } from "../chrome/PageHeader";
import { AnalyticsPanel } from "../components/AnalyticsPanel";
import { DashboardLayout } from "../layout/DashboardLayout";

interface AnalyticsExamplesPageProps {
  page: DashboardPageSpec;
  datasetOptions: DatasetOption[];
  defaultDataset: string;
}

export function AnalyticsExamplesPage(props: AnalyticsExamplesPageProps) {
  const { page, datasetOptions, defaultDataset } = props;

  return (
    <DashboardLayout
      page={{
        ...page,
        title: "Analytics Examples (Demo)",
        subtitle: "Curated mock datasets to showcase each chart with intentional values.",
        scripts: ["/public/js/analytics/analytics.page.js"],
      }}
      leftToggleId="analytics-examples-toggle-left"
      rightToggleId="analytics-examples-toggle-right"
      footerText="Demo datasets and routes are enabled only in demo mode."
    >
      <PageHeader title="Analytics Examples (Demo)" subtitle="Curated mock datasets to showcase each chart with intentional values." />
      <section class="ui-grid" aria-label="Analytics example page content">
        <AnalyticsPanel
          datasetOptions={datasetOptions}
          defaultDataset={defaultDataset}
          datasetsEndpoint="/api/demo/analytics/datasets"
          queryEndpoint="/api/demo/analytics/query"
        />
      </section>
    </DashboardLayout>
  );
}

