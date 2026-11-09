import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Nothing here</h1>
      <p className="text-sm text-muted-foreground">This product or page doesn&apos;t exist.</p>
      <Link href="/search" className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
        Back to search
      </Link>
    </div>
  );
}
