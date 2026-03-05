import { getSavedItems } from "../db/repository";
import type { RouteAdapter } from "../types/adapters";
import type { ItemsViewModel } from "../types/view-models";
import { makePageSpec } from "./nav";

export const itemsAdapter: RouteAdapter<ItemsViewModel> = {
  async load(ctx) {
    const items = getSavedItems(ctx.role);

    return {
      page: makePageSpec("items", ctx),
      itemCountLabel: `${items.length} items | sorted by recently updated`,
      items,
      currentRoleLabel: ctx.role,
    };
  },
};
