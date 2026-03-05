import type { RequestContext } from "./context";

export interface RouteAdapter<TViewModel> {
  load(ctx: RequestContext): Promise<TViewModel>;
}
