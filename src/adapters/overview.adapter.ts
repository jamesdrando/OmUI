import { getOverviewSnapshot } from "../db/repository";
import { runtimeConfig } from "../config/runtime";
import type { RouteAdapter } from "../types/adapters";
import type { OverviewViewModel } from "../types/view-models";
import { makePageSpec } from "./nav";

export const overviewAdapter: RouteAdapter<OverviewViewModel> = {
  async load(ctx) {
    if (!runtimeConfig.demoMode) {
      return {
        page: makePageSpec("overview", ctx),
        kpis: [],
        pipeline: [],
        feed: [],
      };
    }

    const snapshot = getOverviewSnapshot();
    return {
      page: makePageSpec("overview", ctx),
      kpis: snapshot.kpis,
      pipeline: snapshot.pipeline,
      feed: snapshot.feed,
    };
  },
};
