import type { DashboardPageId, TabLink } from "../../types/nav";
import { Tabs } from "./Tabs";

interface TopNavProps {
  currentPage: DashboardPageId;
  tabs: TabLink[];
  leftToggleId: string;
  userName: string;
  showLogout: boolean;
}

export function TopNav(props: TopNavProps) {
  const { currentPage, tabs, leftToggleId, userName, showLogout } = props;

  return (
    <header class="dash__topbar ui-topbar" data-slot="top-nav">
      <div class="ui-topbar__left">
        <label class="dash__menuBtn ui-btn ui-btn--ghost" for={leftToggleId} role="button" tabindex={0}>
          Menu
        </label>
        <a class="ui-topbar__brand" href="/dashboard/overview">
          OmUI Console
        </a>
      </div>

      <div class="ui-topbar__spacer"></div>

      <div class="ui-topbar__right">
        <Tabs currentPage={currentPage} links={tabs} />
        {showLogout ? (
          <form method="post" action="/logout" style="display: inline-flex; align-items: center; gap: 8px; margin: 0;">
            <span class="ui-roleTag">{userName}</span>
            <button class="ui-btn ui-btn--ghost" type="submit">
              Logout
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
