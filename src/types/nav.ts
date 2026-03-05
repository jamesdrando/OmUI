export type DashboardPageId = "overview" | "tables" | "items" | "users" | "shell";

export interface TabLink {
  key: DashboardPageId;
  label: string;
  href: string;
}

export interface SideNavItem {
  key: string;
  label: string;
  href: string;
  current?: boolean;
  active?: boolean;
}

export interface SideNavSection {
  title: string;
  items: SideNavItem[];
}

export interface RailSection {
  title: string;
  alerts?: Array<{ tone: "info" | "success"; text: string }>;
  links?: Array<{ label: string; href: string }>;
  badgeText?: string;
}

export interface HeaderAction {
  label: string;
  href?: string;
  buttonType?: "button" | "submit";
}
