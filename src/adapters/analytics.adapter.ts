import { getDatasetOptions } from "../db/repository";
import { runtimeConfig } from "../config/runtime";
import type { RouteAdapter } from "../types/adapters";
import type { AnalyticsViewModel } from "../types/view-models";
import { makePageSpec } from "./nav";

export const analyticsAdapter: RouteAdapter<AnalyticsViewModel> = {
  async load(ctx) {
    const datasetOptions = runtimeConfig.demoMode ? getDatasetOptions() : [];
    return {
      page: makePageSpec("analytics", ctx),
      datasetOptions,
      defaultDataset: datasetOptions[0]?.key ?? "",
    };
  },
};
