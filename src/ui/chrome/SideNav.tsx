import type { SideNavSection } from "../../types/nav";

interface SideNavProps {
  sections: SideNavSection[];
}

export function SideNav(props: SideNavProps) {
  return (
    <nav class="ui-sidenav" aria-label="Main sections">
      {props.sections.map((section) => (
        <section class="ui-sidenav__section">
          <h2 class="ui-sidenav__title">{section.title}</h2>
          {section.items.map((item) => (
            <a
              class="ui-sidenav__item"
              href={item.href}
              data-current={item.current ? "page" : undefined}
              data-active={item.active ? "true" : undefined}
            >
              {item.label}
            </a>
          ))}
        </section>
      ))}
    </nav>
  );
}
