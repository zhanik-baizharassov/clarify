import { Star } from "lucide-react";

type StarRatingProps = {
  /** Рейтинг от 0 до 5, допускается дробное значение. */
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export default function StarRating({
  value,
  size = "md",
  className = "",
}: StarRatingProps) {
  const safe = Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
  const iconClass = SIZE_CLASS[size];

  return (
    <span
      role="img"
      aria-label={`Рейтинг ${safe.toFixed(1)} из 5`}
      className={["inline-flex items-center gap-0.5", className].join(" ")}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.min(1, Math.max(0, safe - index));

        return (
          <span key={index} className={`relative inline-block ${iconClass}`}>
            <Star
              aria-hidden
              className={`absolute inset-0 ${iconClass} text-muted-foreground/40`}
            />
            <span
              aria-hidden
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className={`${iconClass} max-w-none fill-amber-400 text-amber-400`}
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}
