import Link from "next/link";
import { ArrowRight, PackageSearch, Tag, Zap } from "lucide-react";

const categories = ["Sneakers", "Hoodies", "Watches", "Headphones", "Jackets", "Bags"];

const perks = [
  {
    icon: PackageSearch,
    title: "Every store, one search",
    text: "Channel3 indexes products across thousands of retailers with one consistent schema.",
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
    <div className="flex flex-col gap-16 py-10">
      <section className="flex flex-col items-center gap-6 text-center">
        <p className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Powered by Channel3
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Find it anywhere.
          <br />
          <span className="text-muted-foreground">Buy it for less.</span>
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Search products from thousands of shops, compare live prices and keep your favourites in
          one place.
        </p>

        <Link
          href="/search"
          className="group inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start searching
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/search?q=${encodeURIComponent(category)}`}
              className="rounded-full border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {perks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border p-5">
            <Icon className="mb-3 size-5 text-muted-foreground" />
            <h2 className="mb-1 font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
