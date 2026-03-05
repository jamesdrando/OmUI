import { makePageSpec } from "./nav";
import type { RouteAdapter } from "../types/adapters";
import type { ShellViewModel } from "../types/view-models";

export const shellAdapter: RouteAdapter<ShellViewModel> = {
  async load(ctx) {
    return {
      page: makePageSpec("shell", ctx),
    };
  },
};
