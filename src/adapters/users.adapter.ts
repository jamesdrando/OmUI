import { getUsers } from "../db/repository";
import type { RouteAdapter } from "../types/adapters";
import type { UsersViewModel } from "../types/view-models";
import { makePageSpec } from "./nav";

export const usersAdapter: RouteAdapter<UsersViewModel> = {
  async load(ctx) {
    const users = getUsers(ctx.role);
    return {
      page: makePageSpec("users", ctx),
      userCountLabel: `${users.length} users | sorted by team priority`,
      users,
      currentRoleLabel: ctx.role,
    };
  },
};
