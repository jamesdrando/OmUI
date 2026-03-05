import type { DashboardPageId, HeaderAction, RailSection, SideNavSection, TabLink } from "./nav";

export interface DashboardPageSpec {
  pageId: DashboardPageId;
  title: string;
  subtitle?: string;
  userName: string;
  rightRail: "on" | "off";
  role: "member" | "admin";
  demoMode: boolean;
  topTabs: TabLink[];
  sideNav: SideNavSection[];
  rightRailSections?: RailSection[] | undefined;
  actions?: HeaderAction[] | undefined;
  scripts?: string[] | undefined;
}
