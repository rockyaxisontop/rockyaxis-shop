"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Search, LogOut, UserRound, House } from "lucide-react";

import { useAuth } from "@/components/providers";
import { signOutUser } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: House },
  { href: "/search", label: "Search", icon: Search },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const initial = (user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase();

  const authAction = loading ? (
    <div className="size-9 shrink-0 animate-pulse rounded-full bg-accent" />
  ) : user ? (
    <div className="flex shrink-0 items-center gap-1">
      <span
        className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        title={user.displayName ?? user.email ?? ""}
      >
        {initial}
      </span>
      <button
        type="button"
        onClick={() => {
          void signOutUser().then(() => router.refresh());
        }}
        aria-label="Sign out"
        className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:flex"
      >
        <LogOut className="size-4" />
        <span className="max-md:hidden">Sign out</span>
      </button>
    </div>
  ) : (
    <Link
      href="/login"
      className="flex size-9 shrink-0 items-center justify-center rounded-full border hover:bg-accent sm:size-auto sm:gap-1.5 sm:rounded-md sm:px-3 sm:py-1.5 sm:text-sm"
      aria-label="Sign in"
    >
      <UserRound className="size-4" />
      <span className="hidden sm:inline">Sign in</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      {/* Mobile: brand + icon actions */}
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 md:hidden">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MT<span className="text-muted-foreground">-Shop</span>
        </Link>
        <div className="ml-auto">{authAction}</div>
      </div>

      {/* Mobile: bottom-ish tab strip (sticky under the brand row) */}
      <nav className="mx-auto grid w-full max-w-6xl grid-cols-3 border-t text-sm md:hidden">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors active:bg-accent",
                active && "text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span
                className={cn(
                  "h-0.5 w-6 rounded-full transition-colors",
                  active ? "bg-foreground" : "bg-transparent",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop */}
      <div className="mx-auto hidden h-14 w-full max-w-6xl items-center gap-6 px-4 md:flex">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MT<span className="text-muted-foreground">-Shop</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                pathname === href && "bg-accent text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">{authAction}</div>
      </div>
    </header>
  );
}
