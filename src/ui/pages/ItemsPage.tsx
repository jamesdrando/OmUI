import type { ItemsViewModel } from "../../types/view-models";
import { PageHeader } from "../chrome/PageHeader";
import { ItemList } from "../components/ItemList";
import { DashboardLayout } from "../layout/DashboardLayout";

interface ItemsPageProps {
  model: ItemsViewModel;
}

export function ItemsPage(props: ItemsPageProps) {
  const { model } = props;

  return (
    <DashboardLayout
      page={model.page}
      leftToggleId="items-toggle-left"
      rightToggleId="items-toggle-right"
      footerText='Delete actions appear only for admin role. In production, set data-user-role="admin" server-side.'
    >
      <PageHeader
        title={model.page.title}
        subtitle={model.page.subtitle}
        trailing={
          <div class="ui-tablePanel__controls">
            <label class="ui-formRow__label" for="roleReadout">
              Role
            </label>
            <select class="ui-select ui-tablePanel__select" id="roleReadout" disabled>
              <option>{model.currentRoleLabel}</option>
            </select>
          </div>
        }
      />

      <section class="ui-grid" aria-label="Items list">
        <article class="ui-card ui-span-12 ui-itemPanel">
          <header class="ui-tablePanel__head">
            <h2 class="ui-tablePanel__title">Saved Items</h2>
            <span class="ui-tablePanel__meta">{model.itemCountLabel}</span>
          </header>
          <ItemList items={model.items} />
        </article>
      </section>
    </DashboardLayout>
  );
}
