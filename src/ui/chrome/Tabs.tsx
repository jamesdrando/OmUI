import type { DashboardPageId, TabLink } from "../../types/nav";

interface TabsProps {
  currentPage: DashboardPageId;
  links: TabLink[];
}

export function Tabs(props: TabsProps) {
  const { currentPage, links } = props;

  return (
    <nav class="ui-tabs" aria-label="Primary tabs">
      {links.map((link) => (
        <a class="ui-tab" href={link.href} data-active={link.key === currentPage ? "true" : undefined}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
