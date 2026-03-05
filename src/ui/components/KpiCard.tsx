export type KpiTone = "success" | "danger" | "neutral";

export interface KpiCardModel {
  label: string;
  value: string;
  trend: string;
  tone: KpiTone;
}

interface KpiCardProps {
  item: KpiCardModel;
}

export function KpiCard(props: KpiCardProps) {
  const { item } = props;

  return (
    <article class="ui-card ui-span-3">
      <div class="ui-kpi">
        <p class="ui-kpi__label">{item.label}</p>
        <p class="ui-kpi__value">{item.value}</p>
        <span class="ui-kpi__trend" data-tone={item.tone}>
          {item.trend}
        </span>
      </div>
    </article>
  );
}
