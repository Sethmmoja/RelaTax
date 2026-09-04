import Link from "next/link";
import { BreadcrumbSchema, type Crumb } from "../seo/StructuredData";

/**
 * Visible breadcrumb trail plus its matching BreadcrumbList markup. Both come
 * from the same `crumbs` array deliberately — Google penalises structured data
 * that describes a trail the page doesn't actually show.
 *
 * "Home" is prepended here so callers only describe their own position.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const trail: Crumb[] = [{ name: "Home", href: "/" }, ...crumbs];

  return (
    <>
      <BreadcrumbSchema crumbs={trail} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {trail.map((crumb, i) => {
            const isLast = i === trail.length - 1;
            return (
              <li key={crumb.name} className="flex items-center gap-2">
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-primary hover:underline">
                    {crumb.name}
                  </Link>
                ) : (
                  // The current page is not a link, and aria-current tells a
                  // screen reader where in the trail the user actually is.
                  <span aria-current="page" className="text-foreground">
                    {crumb.name}
                  </span>
                )}
                {!isLast && (
                  <span aria-hidden="true" className="text-border">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
