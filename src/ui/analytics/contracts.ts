export interface AnalyticsSeriesPoint {
  x: string;
  y: number;
}

export interface AnalyticsWidgetModel {
  id: string;
  title: string;
  series: AnalyticsSeriesPoint[];
}
