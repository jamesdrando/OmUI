import { getDatasetOptions } from "../db/repository";
import { runtimeConfig } from "../config/runtime";
import type { RouteAdapter } from "../types/adapters";
import type { TablesViewModel } from "../types/view-models";
import { makePageSpec } from "./nav";

export const tablesAdapter: RouteAdapter<TablesViewModel> = {
  async load(ctx) {
    const datasetOptions = runtimeConfig.demoMode ? getDatasetOptions() : [];
    return {
      page: makePageSpec("tables", ctx),
      datasetOptions,
      defaultDataset: datasetOptions[0]?.key ?? "",
    };
  },
};
