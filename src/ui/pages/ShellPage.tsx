import type { ShellViewModel } from "../../types/view-models";
import { PageHeader } from "../chrome/PageHeader";
import { Card } from "../components/Card";
import { DashboardLayout } from "../layout/DashboardLayout";

interface ShellPageProps {
  model: ShellViewModel;
}

export function ShellPage(props: ShellPageProps) {
  const { model } = props;

  return (
    <DashboardLayout
      page={model.page}
      leftToggleId="shell-toggle-left"
      rightToggleId="shell-toggle-right"
      footerText="Shell-only reference page. Pair with docs/COMPONENTS.md."
    >
      <PageHeader title={model.page.title} subtitle={model.page.subtitle} actions={model.page.actions} />

      <section class="ui-grid" aria-label="Summary and content cards">
        <Card span={4} title="Top nav">
          <p class="ui-card__value">Sticky</p>
        </Card>

        <Card span={4} title="Left rail">
          <p class="ui-card__value">Sectioned nav</p>
        </Card>

        <Card span={4} title="Right rail">
          <p class="ui-card__value">Context blocks</p>
        </Card>

        <Card span={8} title="SSR hooks">
          <ul class="ui-list">
            <li class="ui-list__item">
              <code>data-slot=&quot;top-nav|left-nav|right-rail|main-content|main-footer&quot;</code>
            </li>
            <li class="ui-list__item">
              <code>data-current=&quot;page&quot;</code> for active links
            </li>
            <li class="ui-list__item">
              <code>data-active=&quot;true&quot;</code> for highlighted controls
            </li>
            <li class="ui-list__item">
              <code>data-right-rail=&quot;off&quot;</code> to collapse the right rail
            </li>
          </ul>
        </Card>

        <Card span={4} title="Examples" bodyClass="ui-feed">
          <div class="ui-feed__item">
            <a class="ui-sidenav__item" href="/dashboard/overview">
              KPI Overview
            </a>
          </div>
          <div class="ui-feed__item">
            <a class="ui-sidenav__item" href="/dashboard/tables">
              Data Tables
            </a>
          </div>
          <div class="ui-feed__item">
            <a class="ui-sidenav__item" href="/dashboard/items">
              Items
            </a>
          </div>
        </Card>
      </section>
    </DashboardLayout>
  );
}
