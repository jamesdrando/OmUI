import type { AnalyticsViewModel } from "../../types/view-models";
import { PageHeader } from "../chrome/PageHeader";
import { AnalyticsPanel } from "../components/AnalyticsPanel";
import { DashboardLayout } from "../layout/DashboardLayout";

interface AnalyticsPageProps {
  model: AnalyticsViewModel;
}

export function AnalyticsPage(props: AnalyticsPageProps) {
  const { model } = props;

  return (
    <DashboardLayout
      page={{ ...model.page, scripts: ["/public/js/analytics/analytics.page.js"] }}
      leftToggleId="analytics-toggle-left"
      rightToggleId="analytics-toggle-right"
      footerText="Client-side SVG analytics with unified query/filter adapter."
    >
      <PageHeader title={model.page.title} subtitle={model.page.subtitle} actions={model.page.actions} />
      <section class="ui-grid" aria-label="Analytics page content">
        <AnalyticsPanel datasetOptions={model.datasetOptions} defaultDataset={model.defaultDataset} />
      </section>
    </DashboardLayout>
  );
}
