import type { HeaderAction } from "../../types/nav";

interface PageHeaderProps {
  title: string;
  subtitle?: string | undefined;
  actions?: HeaderAction[] | undefined;
  trailing?: any;
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <header class="ui-pageHeader">
      <div>
        <h1 class="ui-pageHeader__title">{props.title}</h1>
        {props.subtitle ? <p class="ui-pageHeader__sub">{props.subtitle}</p> : null}
      </div>

      {props.trailing ? (
        props.trailing
      ) : (
        <div>
          {(props.actions ?? []).map((action) =>
            action.href ? (
              <a class="ui-btn" href={action.href}>
                {action.label}
              </a>
            ) : (
              <button class="ui-btn" type={action.buttonType ?? "button"}>
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </header>
  );
}
