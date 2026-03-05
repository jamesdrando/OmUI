import type { TablesViewModel } from "../../types/view-models";
import { PageHeader } from "../chrome/PageHeader";
import { DataTablePanel } from "../components/DataTablePanel";
import { DashboardLayout } from "../layout/DashboardLayout";

interface TablesPageProps {
  model: TablesViewModel;
}

export function TablesPage(props: TablesPageProps) {
  const { model } = props;

  return (
    <DashboardLayout
      page={{ ...model.page, scripts: ["/js/VirtualGridTable.js", "/public/js/virtual-grid-table.page.js"] }}
      leftToggleId="tables-toggle-left"
      rightToggleId="tables-toggle-right"
      footerText='Using setData(...) in regular mode (no chunking). Try setAppTheme("light") in console.'
    >
      <PageHeader title={model.page.title} subtitle={model.page.subtitle} actions={model.page.actions} />

      <section class="ui-grid" aria-label="Table page content">
        <DataTablePanel datasetOptions={model.datasetOptions} defaultDataset={model.defaultDataset} />
      </section>
    </DashboardLayout>
  );
}
