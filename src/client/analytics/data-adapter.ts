import type { AnalyticsDatasetDescriptor, AnalyticsQueryRequest, AnalyticsQueryResponse } from "../../lib/analytics/contracts";

export class AnalyticsApiClient {
  private datasetsEndpoint: string;
  private queryEndpoint: string;

  constructor(config: { datasetsEndpoint: string; queryEndpoint: string }) {
    this.datasetsEndpoint = config.datasetsEndpoint;
    this.queryEndpoint = config.queryEndpoint;
  }

  async getDatasets() {
    const response = await fetch(this.datasetsEndpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Datasets request failed (${response.status})`);
    const payload = (await response.json()) as { datasets: AnalyticsDatasetDescriptor[] };
    return payload.datasets ?? [];
  }

  async query(request: AnalyticsQueryRequest) {
    const response = await fetch(this.queryEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Query request failed (${response.status})`);
    return (await response.json()) as AnalyticsQueryResponse;
  }
}

