import type { RailSection } from "../../types/nav";

interface RightRailProps {
  sections?: RailSection[] | undefined;
}

export function RightRail(props: RightRailProps) {
  const sections = props.sections ?? [];

  return (
    <section class="ui-sidenav" aria-label="Supporting context">
      {sections.map((section) => (
        <section class="ui-sidenav__section">
          <h2 class="ui-sidenav__title">{section.title}</h2>
          {section.badgeText ? <span class="ui-roleTag">{section.badgeText}</span> : null}
          {(section.alerts ?? []).map((alert) => (
            <div class="ui-alert" data-tone={alert.tone}>
              {alert.text}
            </div>
          ))}
          {(section.links ?? []).map((link) => (
            <a class="ui-sidenav__item" href={link.href}>
              {link.label}
            </a>
          ))}
        </section>
      ))}
    </section>
  );
}
