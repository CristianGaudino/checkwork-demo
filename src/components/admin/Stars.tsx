// Five stars with the number in words for a screen reader. The stars are for the eye.
export function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="whitespace-nowrap text-body tracking-wider text-warning">
      {"★".repeat(rating)}
      <span className="text-hairline">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
