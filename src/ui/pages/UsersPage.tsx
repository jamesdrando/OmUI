import type { UsersViewModel } from "../../types/view-models";
import { PageHeader } from "../chrome/PageHeader";
import { ItemList } from "../components/ItemList";
import { DashboardLayout } from "../layout/DashboardLayout";

interface UsersPageProps {
  model: UsersViewModel;
}

export function UsersPage(props: UsersPageProps) {
  const { model } = props;

  return (
    <DashboardLayout
      page={model.page}
      leftToggleId="users-toggle-left"
      rightToggleId="users-toggle-right"
      footerText='Users directory demo data is seeded from SQLite. In production this should resolve from auth + identity services.'
    >
      <PageHeader
        title={model.page.title}
        subtitle={model.page.subtitle}
        trailing={
          <div class="ui-tablePanel__controls">
            <label class="ui-formRow__label" for="usersRoleReadout">
              Role
            </label>
            <select class="ui-select ui-tablePanel__select" id="usersRoleReadout" disabled>
              <option>{model.currentRoleLabel}</option>
            </select>
          </div>
        }
      />

      <section class="ui-grid" aria-label="Users list">
        <article class="ui-card ui-span-12 ui-itemPanel">
          <header class="ui-tablePanel__head">
            <h2 class="ui-tablePanel__title">User Directory</h2>
            <span class="ui-tablePanel__meta">{model.userCountLabel}</span>
          </header>
          <ItemList items={model.users} />
        </article>
      </section>
    </DashboardLayout>
  );
}
