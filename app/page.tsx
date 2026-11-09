import Link from "next/link";
import { ArrowRight, PackageSearch, Tag, Zap } from "lucide-react";

const categories = [
  "Home & kitchen",
  "Phones",
  "Headphones",
  "Skincare",
  "Sneakers",
  "Backpacks",
];

const perks = [
  {
    icon: PackageSearch,
    title: "Every store, one search",
    text: "Products from thousands of shops, all in one place with one consistent catalog.",
  },
  {
    icon: Tag,
    title: "Best price first",
    text: "Offers are compared per product so you always see the lowest current price.",
  },
  {
    icon: Zap,
    title: "Fast by design",
    text: "Firebase runs straight from the browser — no backend, no extra hops.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10 py-4 sm:gap-16 sm:py-10">
      <section className="flex flex-col items-center gap-4 px-1 pt-4 text-center sm:gap-6 sm:pt-0">
        <h1 className="max-w-3xl text-[2rem] leading-[1.12] font-semibold tracking-tight text-balance sm:text-6xl">
          Find it anywhere.
          <br />
          <span className="text-muted-foreground">Buy it for less.</span>
        </h1>
        <p className="max-w-xl text-pretty text-[15px] text-muted-foreground sm:text-base">
          Search products from thousands of shops, compare live prices and keep your favourites in
          one place.
        </p>

        <Link
          href="/search"
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.99] sm:w-auto sm:rounded-lg"
        >
          Start searching
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <div className="flex w-full flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/search?q=${encodeURIComponent(category)}`}
              className="rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground sm:py-1.5"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {perks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border p-4 sm:p-5">
            <Icon className="mb-2 size-5 text-muted-foreground sm:mb-3" />
            <h2 className="mb-1 font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
