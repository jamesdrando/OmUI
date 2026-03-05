import { getUsers } from "../db/repository";
import { runtimeConfig } from "../config/runtime";
import type { RouteAdapter } from "../types/adapters";
import type { UsersViewModel } from "../types/view-models";
import { makePageSpec } from "./nav";

export const usersAdapter: RouteAdapter<UsersViewModel> = {
  async load(ctx) {
    if (!runtimeConfig.demoMode) {
      return {
        page: makePageSpec("users", ctx),
        userCountLabel: "0 users",
        users: [],
        currentRoleLabel: ctx.role,
      };
    }

    const users = getUsers(ctx.role);
    return {
      page: makePageSpec("users", ctx),
      userCountLabel: `${users.length} users | sorted by team priority`,
      users,
      currentRoleLabel: ctx.role,
    };
  },
};
