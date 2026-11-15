import { Star } from 'lucide-react';

export default function StarRating({
  value,
  count,
}: {
  value: number;
  count?: number;
}) {
  const full = Math.round(value);
  return (
    <span
      className="star-rating"
      role="img"
      aria-label={`Nota: ${value} de 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          aria-hidden="true"
          fill={i < full ? 'currentColor' : 'none'}
        />
      ))}
      {count !== undefined && (
        <span className="star-rating-count">({count})</span>
      )}
    </span>
  );
}
