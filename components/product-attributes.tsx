import * as React from "react";
import type { Product } from "@/lib/products/types";

import { cn } from "@/lib/utils";

interface Attribute {
  label: string;
  value: string;
}

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));

const humanizeKey = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Flattens a product's extracted attributes into a deduplicated list of
 * label/value rows: `category`, then each `structured_attributes` entry,
 * `materials`, `gender`, and `age`. A `material(s)` structured entry is dropped
 * when the richer `materials` array is present so the same fact isn't shown
 * twice.
 */
function buildAttributes(product: Product, shipsFrom?: string): Attribute[] {
  const rows: Attribute[] = [];

  // Delivery terms first: they are the thing shoppers look for on this page,
  // and both are the visitor's own country (the same one their prices use).
  if (shipsFrom) {
    rows.push({ label: "Ships From", value: shipsFrom });
    rows.push({ label: "Delivery", value: "24-48 hrs" });
    rows.push({ label: "Shipping", value: "Free" });
  }

  if (product.category?.title) {
    rows.push({ label: "Category", value: product.category.title });
  }

  const materials = unique((product.materials ?? []).map((value) => value.trim()).filter(Boolean));
  const hasMaterials = materials.length > 0;

  for (const [key, values] of Object.entries(product.structured_attributes ?? {})) {
    // Strip separators AND spaces: the stored keys are humanised ("Ships from"),
    // so without this the delivery filter below silently never matched.
    const normalized = key.replace(/[\s_-]+/g, "").toLowerCase();
    if (hasMaterials && (normalized === "material" || normalized === "materials")) {
      continue;
    }
    // Delivery terms are always ours (see the rows above). Seller-supplied
    // "ships from"/"delivery"/"shipping" values are dropped even when they were
    // stored in Firestore before this rule existed — otherwise the page shows
    // two contradictory answers ("United States" and "Ships from LK").
    if (normalized === "shipsfrom" || normalized === "delivery" || normalized === "shipping") {
      continue;
    }
    const cleaned = unique((values ?? []).map((value) => String(value).trim()).filter(Boolean));
    if (cleaned.length === 0) {
      continue;
    }
    rows.push({ label: humanizeKey(key), value: cleaned.join(", ") });
  }

  if (hasMaterials) {
    rows.push({
      label: materials.length > 1 ? "Materials" : "Material",
      value: materials.join(", "),
    });
  }
  if (product.gender) {
    rows.push({ label: "Gender", value: titleCase(product.gender) });
  }
  if (product.age) {
    rows.push({ label: "Age", value: titleCase(product.age) });
  }

  return rows;
}

export interface ProductAttributesProps extends React.ComponentProps<"dl"> {
  product: Product;
  /** The visitor's country — where we ship from and deliver to. */
  shipsFrom?: string;
}

export function ProductAttributes({ product, shipsFrom, className, ...props }: ProductAttributesProps) {
  const attributes = buildAttributes(product, shipsFrom);
  if (attributes.length === 0) {
    return null;
  }

  return (
    <dl
      data-slot="product-attributes"
      className={cn(
        "grid grid-cols-[minmax(5rem,auto)_1fr] gap-x-6 gap-y-2 text-sm",
        className,
      )}
      {...props}
    >
      {attributes.map(({ label, value }) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-foreground">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
