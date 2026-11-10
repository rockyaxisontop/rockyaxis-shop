import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Music2, Phone, Youtube } from "lucide-react";



const popularSearches = [
  "mobile phones",
  "samsung phone",
  "nothing phone",
  "apple iphone",
  "ipad",
  "tab",
  "earbuds",
  "airpods pro",
  "smartwatch",
  "bluetooth speaker",
  "headphones",
  "sony headphones",
  "dji drones",
  "drones",
];

const navigation = [
  { label: "Homepage", href: "/" },
  { label: "Category", href: "/#shop-by-category" },
  { label: "Brands", href: "/search" },
  { label: "About us", href: "/#about" },
  { label: "My orders", href: "/cart" },
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/maketrendstore", icon: Instagram },
  { label: "Facebook", href: "https://facebook.com/maketrendstore", icon: Facebook },
  { label: "TikTok", href: "https://www.tiktok.com/@maketrendstore", icon: Music2 },
  { label: "YouTube", href: "https://www.youtube.com/@maketrendstore", icon: Youtube },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-white">
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="grid gap-9 py-10 sm:py-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-10">
          <section id="about" aria-labelledby="footer-about-title" className="max-w-lg">
            <Link href="/" aria-label="MT Store home" className="inline-flex">
              <span className="text-xl font-extrabold tracking-tight text-ink">
                MT<span className="text-brand">-Shop</span>
              </span>
            </Link>
            <h2 id="footer-about-title" className="mt-4 text-sm font-bold text-ink">
              About MT Store
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Maketrend.com is a tech buying platform where customers can discover, compare, and buy
              genuine gadgets with confidence. MTstore combines curated buying guides, expert
              recommendations, and hands-on experience zones to help you choose the right tech for
              your needs.
            </p>
          </section>

          <section aria-labelledby="footer-contact-title">
            <h2 id="footer-contact-title" className="text-sm font-bold text-ink">Contact</h2>
            <address className="mt-4 flex flex-col gap-3 text-sm not-italic text-ink-soft">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>Lalitpur, Kathmandu, Nepal</span>
              </p>
              <a className="flex items-center gap-2.5 hover:text-brand" href="tel:+9779714501791">
                <Phone className="size-4 shrink-0 text-brand" />
                +977-9714501791
              </a>
              <a className="flex items-center gap-2.5 hover:text-brand" href="mailto:support@mtstore.com">
                <Mail className="size-4 shrink-0 text-brand" />
                support@mtstore.com
              </a>
            </address>
          </section>

          <section aria-labelledby="footer-social-title">
            <h2 id="footer-social-title" className="text-sm font-bold text-ink">Connect with us</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 md:flex md:flex-wrap md:items-center md:gap-2">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={`${label} @maketrendstore`}
                    title={label}
                    className="grid size-10 place-items-center rounded-full border border-border text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Icon className="size-5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-8 border-t border-border py-8 md:grid-cols-[1fr_auto] md:gap-12">
          <section aria-labelledby="footer-popular-title">
            <h2 id="footer-popular-title" className="text-sm font-bold text-ink">Popular searches</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              {popularSearches.map((query) => (
                <li key={query}>
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    className="text-xs text-ink-soft transition-colors hover:text-brand hover:underline"
                  >
                    {query}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <nav aria-label="Footer navigation" className="md:min-w-36">
            <h2 className="text-sm font-bold text-ink">Navigation</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 md:grid-cols-1">
              {navigation.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs text-ink-soft transition-colors hover:text-brand hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-5 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MT Store. All rights reserved.</p>
          <p>Shop genuine tech with confidence.</p>
        </div>
      </div>
    </footer>
  );
}
