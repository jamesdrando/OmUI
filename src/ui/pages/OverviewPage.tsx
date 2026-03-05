import type { OverviewViewModel } from "../../types/view-models";
import { PageHeader } from "../chrome/PageHeader";
import { Card } from "../components/Card";
import { FeedList } from "../components/FeedList";
import { KpiCard } from "../components/KpiCard";
import { MeterRow } from "../components/MeterRow";
import { DashboardLayout } from "../layout/DashboardLayout";

interface OverviewPageProps {
  model: OverviewViewModel;
}

export function OverviewPage(props: OverviewPageProps) {
  const { model } = props;

  return (
    <DashboardLayout
      page={model.page}
      leftToggleId="overview-toggle-left"
      rightToggleId="overview-toggle-right"
      footerText='Use this page as a KPI/card baseline. Try setAppTheme("light") in console.'
    >
      <PageHeader title={model.page.title} subtitle={model.page.subtitle} actions={model.page.actions} />

      <section class="ui-grid" aria-label="KPI cards and widgets">
        {model.kpis.map((kpi) => (
          <KpiCard item={kpi} />
        ))}

        <article class="ui-card ui-span-8">
          <h2 class="ui-card__title">Pipeline health</h2>
          <div class="ui-card__body ui-meterList">
            {model.pipeline.map((row) => (
              <MeterRow item={row} />
            ))}
          </div>
        </article>

        <article class="ui-card ui-span-4">
          <h2 class="ui-card__title">Operating signals</h2>
          <div class="ui-card__body">
            <FeedList items={model.feed} />
          </div>
        </article>

        <Card span={12} title="Notes">
          <div class="ui-alert" data-tone="info">
            All values are static placeholders to demonstrate shell and component styling only.
          </div>
        </Card>
      </section>
    </DashboardLayout>
  );
}
