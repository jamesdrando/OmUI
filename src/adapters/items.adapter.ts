import { getSavedItems } from "../db/repository";
import { runtimeConfig } from "../config/runtime";
import type { RouteAdapter } from "../types/adapters";
import type { ItemsViewModel } from "../types/view-models";
import { makePageSpec } from "./nav";

export const itemsAdapter: RouteAdapter<ItemsViewModel> = {
  async load(ctx) {
    if (!runtimeConfig.demoMode) {
      return {
        page: makePageSpec("items", ctx),
        itemCountLabel: "0 items",
        items: [],
        currentRoleLabel: ctx.role,
      };
    }

    const items = getSavedItems(ctx.role);

    return {
      page: makePageSpec("items", ctx),
      itemCountLabel: `${items.length} items | sorted by recently updated`,
      items,
      currentRoleLabel: ctx.role,
    };
  },
};
