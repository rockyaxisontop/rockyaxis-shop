import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** "Section title … VIEW ALL" row used above every product row. */
export function SectionHeading({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-[22px]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-0.5 pb-0.5 text-[11px] font-bold tracking-wide text-brand uppercase hover:underline"
        >
          View all
          <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
