export interface FeedItemModel {
  meta: string;
  text: string;
}

interface FeedListProps {
  items: FeedItemModel[];
}

export function FeedList(props: FeedListProps) {
  return (
    <div class="ui-feed">
      {props.items.map((item) => (
        <div class="ui-feed__item">
          <p class="ui-feed__meta">{item.meta}</p>
          <p class="ui-feed__text">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
