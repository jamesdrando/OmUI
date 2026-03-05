import type { DashboardPageSpec } from "./page-spec";
import type { FeedItemModel } from "../ui/components/FeedList";
import type { DatasetOption } from "../ui/components/DataTablePanel";
import type { ItemListEntry } from "../ui/components/ItemList";
import type { KpiCardModel } from "../ui/components/KpiCard";
import type { MeterRowModel } from "../ui/components/MeterRow";

export interface OverviewViewModel {
  page: DashboardPageSpec;
  kpis: KpiCardModel[];
  pipeline: MeterRowModel[];
  feed: FeedItemModel[];
}

export interface TablesViewModel {
  page: DashboardPageSpec;
  datasetOptions: DatasetOption[];
  defaultDataset: string;
}

export interface ItemsViewModel {
  page: DashboardPageSpec;
  itemCountLabel: string;
  items: ItemListEntry[];
  currentRoleLabel: string;
}

export interface UsersViewModel {
  page: DashboardPageSpec;
  userCountLabel: string;
  users: ItemListEntry[];
  currentRoleLabel: string;
}

export interface ShellViewModel {
  page: DashboardPageSpec;
}
