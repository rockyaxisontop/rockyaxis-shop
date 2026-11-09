"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Search, LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/components/providers";
import { signOutUser } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/cart", label: "Cart" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const initial = (user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MT<span className="text-muted-foreground">-Shop</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href && "bg-accent text-foreground",
              )}
            >
              {link.href === "/search" && <Search className="size-4" />}
              {link.href === "/cart" && <ShoppingBag className="size-4" />}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-accent" />
          ) : user ? (
            <>
              <span
                className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                title={user.displayName ?? user.email ?? ""}
              >
                {initial}
              </span>
              <button
                type="button"
                onClick={() => {
                  void signOutUser().then(() => router.refresh());
                }}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" />
                <span className="max-sm:hidden">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <UserRound className="size-4" />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
