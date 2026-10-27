import Link from "next/link";
import { MapPin } from "lucide-react";
import StarRating from "@/components/ui/StarRating";
import { formatReviewsCount } from "@/shared/format";

export type PlaceListItem = {
  slug: string;
  name: string;
  city: string;
  address: string | null;
  avgRating: number;
  ratingCount: number;
  category: { name: string };
};

/** Server-rendered place card: a plain link, so crawlers can follow it. */
export default function PlaceListCard({ place }: { place: PlaceListItem }) {
  return (
    <Link href={`/place/${place.slug}`} className="clarify-card block p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="clarify-badge-premium w-fit">{place.category.name}</div>

          <h3 className="mt-4 line-clamp-2 text-lg font-semibold tracking-tight">
            {place.name}
          </h3>

          <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {place.city}
              {place.address ? ` • ${place.address}` : ""}
            </span>
          </div>
        </div>

        <div className="shrink-0 rounded-[16px] border border-primary-soft-border bg-primary-soft px-3 py-2 text-right">
          {place.ratingCount > 0 ? (
            <>
              <div className="text-lg font-semibold text-primary">
                {place.avgRating.toFixed(1)}
              </div>
              <StarRating value={place.avgRating} size="sm" className="mt-0.5" />
              <div className="mt-1 text-xs text-muted-foreground">
                {formatReviewsCount(place.ratingCount)}
              </div>
            </>
          ) : (
            <div className="max-w-[88px] text-xs leading-5 text-muted-foreground">
              Пока нет отзывов
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
