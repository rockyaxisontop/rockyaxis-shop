"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Headphones,
  House,
  Laptop,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  Smartphone,
  UserRound,
  Watch,
  X,
} from "lucide-react";

import { useAuth } from "@/components/providers";
import { signOutUser } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/", label: "Home", icon: House },
  { href: "/search", label: "Search", icon: Search },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
];

const categories = [
  { label: "Smartphones", icon: Smartphone, q: "smartphones" },
  { label: "Laptops", icon: Laptop, q: "laptops" },
  { label: "Headphones", icon: Headphones, q: "headphones" },
  { label: "Smartwatches", icon: Watch, q: "smartwatches" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const showGlobalSearch = pathname !== "/search";
  const router = useRouter();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const initial = (user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase();

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setMenuOpen(false);
  }

  const authAction = loading ? (
    <div className="size-9 shrink-0 animate-pulse rounded-full bg-surface-2" />
  ) : user ? (
    <div className="flex shrink-0 items-center gap-2">
      <span
        className="grid size-9 place-items-center rounded-full bg-brand text-xs font-semibold text-white"
        title={user.displayName ?? user.email ?? ""}
      >
        {initial}
      </span>
      <button
        type="button"
        onClick={() => {
          void signOutUser().then(() => router.refresh());
        }}
        className="hidden items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink lg:flex"
      >
        <LogOut className="size-3.5" />
        Sign out
      </button>
    </div>
  ) : (
    <Link
      href="/login"
      className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
    >
      <UserRound className="size-4" />
      Login / Register
    </Link>
  );

  const searchField = (
    <form onSubmit={submitSearch} role="search" className="relative w-full">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft"
      />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products, brands…"
        aria-label="Search products"
        className="h-11 w-full rounded-full border border-border bg-surface-2 pr-24 pl-11 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
      />
      <button
        type="submit"
        className="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-full bg-brand px-4 text-xs font-semibold text-white transition hover:brightness-110"
      >
        Search
      </button>
    </form>
  );

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_var(--color-border)]">
      {/* Top info bar — desktop only */}
      <div className="hidden border-b border-border bg-surface-2 lg:block">
        <div className="mx-auto flex h-9 w-full max-w-7xl items-center justify-between px-4 text-[11px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-brand" />
            Store Location: Kathmandu Valley
          </span>
          <div className="flex items-center gap-5">
            <span>Free delivery on every order</span>
            <Link href="/search" className="font-medium text-brand hover:underline">
              Dashain – Tihar Offers →
            </Link>
          </div>
        </div>
      </div>

      {/* Main row: logo + search + account */}
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 lg:gap-8">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-ink lg:hidden"
        >
          {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-brand text-sm font-black text-white">
            MT
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight text-ink sm:block">
            MT Shop
          </span>
        </Link>

        {showGlobalSearch ? <div className="hidden flex-1 md:block">{searchField}</div> : null}

        <div className="ml-auto flex shrink-0 items-center gap-4">
          {authAction}
        </div>
      </div>

      {/* Search on phones sits on its own row */}
      {showGlobalSearch ? <div className="px-4 pb-3 md:hidden">{searchField}</div> : null}

      {/* Category nav — desktop */}
      <nav className="hidden border-t border-border lg:block">
        <div className="mx-auto flex h-11 w-full max-w-7xl items-center gap-1 px-4 text-sm">
          {primaryLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium text-ink transition-colors hover:bg-surface-2",
                pathname === href && "bg-surface-2 text-brand",
              )}
            >
              {label}
            </Link>
          ))}
          <span className="mx-2 h-4 w-px bg-border" />
          {categories.map(({ label, q }) => (
            <Link
              key={q}
              href={`/search?q=${encodeURIComponent(q)}`}
              className="rounded-md px-3 py-1.5 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile menu sheet */}
      {menuOpen ? (
        <nav className="border-t border-border bg-white lg:hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-2">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 border-b border-border py-2.5 text-sm font-semibold text-ink"
            >
              <House className="size-4 text-brand" />
              Home
              <ChevronRight className="ml-auto size-4 text-ink-soft" />
            </Link>
            <p className="pt-3 pb-1 text-[11px] font-bold tracking-wider text-ink-soft uppercase">
              Shop by category
            </p>
            {categories.map(({ label, icon: Icon, q }) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 py-2.5 text-sm text-ink"
              >
                <Icon className="size-4 text-brand" />
                {label}
                <ChevronRight className="ml-auto size-4 text-ink-soft" />
              </Link>
            ))}
          </div>
        </nav>
      ) : null}

      {/* Bottom tab bar — mobile */}
      <nav className="grid grid-cols-3 border-t border-border bg-white lg:hidden">
        {primaryLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors active:bg-surface-2",
                active ? "text-brand" : "text-ink-soft",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
