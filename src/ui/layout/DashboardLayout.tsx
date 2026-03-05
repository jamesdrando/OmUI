import type { Child } from "hono/jsx";
import type { DashboardPageSpec } from "../../types/page-spec";
import { RightRail } from "../chrome/RightRail";
import { SideNav } from "../chrome/SideNav";
import { TopNav } from "../chrome/TopNav";
import { HtmlDocument } from "./HtmlDocument";

interface DashboardLayoutProps {
  page: DashboardPageSpec;
  children: Child;
  footerText: string;
  leftToggleId: string;
  rightToggleId: string;
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const { page, children, footerText, leftToggleId, rightToggleId } = props;

  return (
    <HtmlDocument title={page.title} scripts={page.scripts}>
      <div class="dash" data-right-rail={page.rightRail} data-user-role={page.role} aria-label={`${page.title} dashboard shell`}>
        <input class="dash__toggle dash__toggleLeft" id={leftToggleId} type="checkbox" />
        <input class="dash__toggle dash__toggleRight" id={rightToggleId} type="checkbox" />

        <TopNav
          currentPage={page.pageId}
          tabs={page.topTabs}
          leftToggleId={leftToggleId}
          userName={page.userName}
          showLogout={true}
        />

        <label class="dash__backdrop dash__backdrop--left" for={leftToggleId} aria-hidden="true"></label>
        <label class="dash__backdrop dash__backdrop--right" for={rightToggleId} aria-hidden="true"></label>

        <aside class="dash__left" data-slot="left-nav" aria-label="Primary navigation">
          <SideNav sections={page.sideNav} />
        </aside>

        <section class="dash__mainWrap" aria-label="Main content wrapper">
          <main class="dash__main" data-slot="main-content">
            {children}
          </main>

          <footer class="dash__footer" data-slot="main-footer">
            <small>{footerText}</small>
          </footer>
        </section>

        {page.rightRail === "on" ? (
          <>
            <label class="dash__railHandle dash__railHandle--open" for={rightToggleId} role="button" tabindex={0} aria-label="Open right rail">
              &lt;
            </label>
            <label class="dash__railHandle dash__railHandle--close" for={rightToggleId} role="button" tabindex={0} aria-label="Collapse right rail">
              &gt;
            </label>
          </>
        ) : null}

        <aside class="dash__right" data-slot="right-rail" aria-label="Context rail">
          <RightRail sections={page.rightRailSections} />
        </aside>
      </div>
    </HtmlDocument>
  );
}
