export type ItemAction = "open" | "edit" | "delete";

export interface ItemListEntry {
  id: string;
  title: string;
  meta: string;
  actions: ItemAction[];
}

interface ItemListProps {
  items: ItemListEntry[];
}

function actionLabel(action: ItemAction) {
  if (action === "open") return "Open";
  if (action === "edit") return "Edit";
  return "Delete";
}

export function ItemList(props: ItemListProps) {
  return (
    <div class="ui-itemList" role="list" aria-label="Saved items list">
      {props.items.map((item) => (
        <article class="ui-itemRow" role="listitem" data-item-id={item.id}>
          <div class="ui-itemInfo">
            <h3 class="ui-itemTitle">{item.title}</h3>
            <p class="ui-itemMeta">{item.meta}</p>
          </div>
          <div class="ui-itemActions">
            {item.actions.map((action) => (
              <button class={`ui-itemBtn${action === "delete" ? " ui-itemBtn--danger" : ""}`}>
                {actionLabel(action)}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
