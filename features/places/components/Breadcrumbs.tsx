import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

/** Visible breadcrumb trail (the last item is the current page). */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Навигация по разделам" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "text-foreground" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? <ChevronRight className="h-3.5 w-3.5 opacity-60" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** schema.org BreadcrumbList for the same trail. */
export function breadcrumbJsonLd(origin: string, items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${origin}${item.href}` } : {}),
    })),
  };
}
