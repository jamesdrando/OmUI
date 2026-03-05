export interface MeterRowModel {
  label: string;
  valueLabel: string;
  percent: number;
}

interface MeterRowProps {
  item: MeterRowModel;
}

export function MeterRow(props: MeterRowProps) {
  const width = Math.max(0, Math.min(100, props.item.percent));

  return (
    <div class="ui-meterRow">
      <div class="ui-meterRow__head">
        <span>{props.item.label}</span>
        <span>{props.item.valueLabel}</span>
      </div>
      <div class="ui-meter">
        <div class="ui-meter__bar" style={`width: ${width}%`}></div>
      </div>
    </div>
  );
}
