import type { Child } from "hono/jsx";

interface CardProps {
  span?: 3 | 4 | 6 | 8 | 12;
  title?: string;
  children?: Child;
  bodyClass?: string;
  style?: string;
}

export function Card(props: CardProps) {
  const span = props.span ?? 12;

  return (
    <article class={`ui-card ui-span-${span}`} style={props.style}>
      {props.title ? <h2 class="ui-card__title">{props.title}</h2> : null}
      {props.children ? <div class={`ui-card__body${props.bodyClass ? ` ${props.bodyClass}` : ""}`}>{props.children}</div> : null}
    </article>
  );
}
