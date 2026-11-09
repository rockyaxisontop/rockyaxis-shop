import * as React from "react";
import { ImageOff } from "lucide-react";
import type { OptionValue, Product } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatPrice,
  isOnSale,
  isSoldOut,
  leadOffer,
  pickHoverImage,
  pickImage,
  productImageUrl,
} from "@/lib/format";
import { swatchOption } from "@/lib/variants";

const MAX_SWATCHES = 10;

export interface ProductCardProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  product: Product;
  /**
   * Destination URL for the card. When set, the image and title render as a real
   * `<a href>` (crawlable, middle/cmd-clickable); a plain left-click still calls
   * {@link ProductCardProps.onSelect} for SPA navigation.
   */
  href?: string;
  onSelect?: (product: Product) => void;
  /**
   * Called when the card is hovered, focused, or touched — before activation.
   * Router-agnostic prefetch hook: wire it to your framework's route preloader
   * (e.g. TanStack Router `preloadRoute`, Next.js `router.prefetch`) so the
   * destination is warm by the time the user clicks. Fires at most once per
   * pointer entry/focus.
   */
  onPreload?: (product: Product) => void;
  /**
   * Called when a color swatch is clicked. Navigate to `value.product_id` (the
   * variant's own product) when set. Falls back to {@link ProductCardProps.onSelect}.
   */
  onSelectVariant?: (value: OptionValue) => void;
  showSwatches?: boolean;
  priority?: boolean;
  locale?: string;
}

export function ProductCard({
  product,
  href,
  onSelect,
  onPreload,
  onSelectVariant,
  showSwatches = true,
  priority = false,
  locale,
  className,
  ...props
}: ProductCardProps) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [useRaw, setUseRaw] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [brokenPreview, setBrokenPreview] = React.useState<string | null>(null);
  const [imageHovered, setImageHovered] = React.useState(false);
  const [brokenHover, setBrokenHover] = React.useState<string | null>(null);
  const cardId = React.useId();
  const activePreview = preview && preview !== brokenPreview ? preview : null;

  // Only the image under the pointer shows its secondary shot. Entering one
  // image clears any other that missed mouseleave.
  React.useEffect(() => {
    const onHover = (event: Event) => {
      const activeId = (event as CustomEvent<string>).detail;
      if (activeId !== cardId) setImageHovered(false);
    };
    window.addEventListener("channel3-product-card-hover", onHover);
    return () => window.removeEventListener("channel3-product-card-hover", onHover);
  }, [cardId]);

  // A server-rendered image can finish decoding before hydration, so `onLoad`
  // never fires on the client — reveal it on mount if it's already complete.
  const revealIfComplete = React.useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) {
      setImageLoaded(true);
    }
  }, []);

  const image = pickImage(product.images);
  const imageSrc = image
    ? productImageUrl(image, { preferCleaned: !useRaw })
    : null;
  const secondImage = pickHoverImage(product.images, { excludeUrl: image?.url });
  const hoverSrc = secondImage ? productImageUrl(secondImage, { preferCleaned: true }) : null;
  const distinctHover = hoverSrc && hoverSrc !== imageSrc ? hoverSrc : null;
  const activeHover =
    imageHovered && distinctHover && distinctHover !== brokenHover ? distinctHover : null;
  const brand = product.brands?.[0]?.name;
  const offer = leadOffer(product.offers);
  const soldOut = isSoldOut(product.offers);
  const interactive = typeof onSelect === "function" || typeof onSelectVariant === "function";

  const option = showSwatches && product.variants ? swatchOption(product.variants) : undefined;
  const swatchValues = (option?.values ?? []).filter((value) => value.thumbnail_url);
  const visibleSwatches = swatchValues.slice(0, MAX_SWATCHES);
  const overflowSwatches = swatchValues.length - visibleSwatches.length;

  const onSwatch = (value: OptionValue) => {
    if (onSelectVariant) {
      onSelectVariant(value);
    } else {
      onSelect?.(product);
    }
  };

  const displayedSrc = activePreview ?? activeHover ?? imageSrc;

  const media = (
    <div
      className="relative aspect-square overflow-hidden rounded-md bg-muted"
      onMouseEnter={() => {
        setImageHovered(true);
        window.dispatchEvent(
          new CustomEvent("channel3-product-card-hover", { detail: cardId }),
        );
      }}
      onMouseLeave={() => setImageHovered(false)}
    >
      {displayedSrc && !imageFailed ? (
        <img
          src={displayedSrc}
          alt={activePreview || activeHover ? "" : (image?.alt_text ?? "")}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className={cn(
            "size-full object-cover transition duration-300",
            imageLoaded || activePreview || activeHover ? "opacity-100" : "opacity-0",
            !activePreview && !distinctHover && "hover:scale-105",
          )}
          ref={revealIfComplete}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            if (activePreview) {
              setBrokenPreview(activePreview);
              return;
            }
            if (activeHover) {
              setBrokenHover(activeHover);
              return;
            }
            if (!useRaw && image?.cleaned_url && image.cleaned_url !== image.url) {
              setUseRaw(true);
              setImageLoaded(false);
              return;
            }
            setImageFailed(true);
          }}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImageOff className="size-8" aria-hidden />
        </div>
      )}
      {soldOut ? (
        <Badge variant="secondary" className="absolute right-2 top-2">
          Sold out
        </Badge>
      ) : null}
    </div>
  );

  // Swatch row only exists when there ARE swatches. (It used to render a
  // circular copy of the product image as a stand-in, which looked like a
  // stray duplicate thumbnail on mobile.)
  const thumbnails =
    showSwatches && (visibleSwatches.length > 0 || overflowSwatches > 0) ? (
      <div className="flex flex-wrap items-center gap-1 pt-1.5">
        {visibleSwatches.map((value) => (
          <button
            key={value.label}
            type="button"
            title={value.label}
            aria-label={value.label}
            onClick={() => onSwatch(value)}
            onMouseEnter={() => setPreview(value.thumbnail_url ?? null)}
            onMouseLeave={() => setPreview(null)}
            onFocus={() => setPreview(value.thumbnail_url ?? null)}
            onBlur={() => setPreview(null)}
            // Small visual dot, padded hit area so it stays tappable on phones.
            className="group/swatch -m-1 p-1 ring-0 cursor-pointer focus-visible:outline-none"
          >
            <span className="block size-5 overflow-hidden rounded-full ring-1 ring-border transition group-hover/swatch:ring-ring group-focus-visible/swatch:ring-2 group-focus-visible/swatch:ring-ring">
              <img
                src={value.thumbnail_url ?? undefined}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            </span>
          </button>
        ))}
        {overflowSwatches > 0 ? (
          <span className="text-xs text-muted-foreground">{`+${overflowSwatches}`}</span>
        ) : null}
      </div>
    ) : null;

  const meta = (
    <div className="flex flex-col gap-0.5 pt-2 sm:gap-1 sm:pt-2.5">
      {brand ? (
        <span className="truncate text-[11px] text-muted-foreground sm:text-xs">{brand}</span>
      ) : null}
      {/* Phones get three clamped lines (most titles fit whole at this column
          width); wider screens truncate to one line as before. */}
      <span className="line-clamp-3 text-[13px] leading-[1.25] font-medium break-words sm:line-clamp-1 sm:text-sm sm:leading-snug">
        {product.title}
      </span>
      <div className="mt-auto flex items-baseline gap-1.5 pt-0.5 sm:min-h-[1.5rem] sm:gap-2 sm:pt-1">
        {offer ? (
          <>
            <span className="text-[13px] font-semibold sm:text-sm">
              {formatPrice(offer.price, locale)}
            </span>
            {isOnSale(offer.price) && offer.price.compare_at_price ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(offer.price.compare_at_price, offer.price.currency, locale)}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );

  const tapClass =
    "block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const preload = onPreload ? () => onPreload(product) : undefined;

  // Real href stays crawlable; a plain left-click is SPA via onSelect.
  const tap = (children: React.ReactNode) => {
    if (href) {
      return (
        <a
          href={href}
          className={tapClass}
          onMouseEnter={preload}
          onFocus={preload}
          onTouchStart={preload}
          onClick={(event) => {
            if (
              onSelect &&
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              onSelect(product);
            }
          }}
        >
          {children}
        </a>
      );
    }
    if (interactive) {
      return (
        <button
          type="button"
          onClick={() => onSelect?.(product)}
          onMouseEnter={preload}
          onFocus={preload}
          onTouchStart={preload}
          className={tapClass}
        >
          {children}
        </button>
      );
    }
    return children;
  };

  return (
    <div
      data-slot="product-card"
      className={cn("isolate flex h-full min-w-0 flex-col", className)}
      {...props}
    >
      {tap(media)}
      {thumbnails}
      {tap(meta)}
    </div>
  );
}

export function ProductCardSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="product-card-skeleton" className={cn("flex h-full flex-col", className)} {...props}>
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="flex flex-col gap-2 pt-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-1 h-4 w-1/4" />
      </div>
    </div>
  );
}
