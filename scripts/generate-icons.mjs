/**
 * Generates every icon the site ships with, from the real logo artwork.
 *
 * Source: mt-store-white.png — a wide white-background lockup. A 255×57 wordmark
 * is unreadable at 16px, so the square icons are built from the "Mt" mark on a
 * brand-navy tile, which keeps the brand recognisable at favicon size.
 *
 * Run: node scripts/generate-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const SRC = "mt-store-white.png";
const NAVY = "#011627"; // --color-brand-dark
const OUT = "public";
const MARK = { left: 0, top: 19, width: 112, height: 42 };

/**
 * The "Mt" mark on transparent.
 *
 * The logo is navy ink on white. We keep the ink colours untouched and make
 * only the near-white *background* transparent — recolouring it would throw
 * away the yellow bars that make the mark recognisable.
 */
async function markTransparent() {
  const { data, info } = await sharp(SRC)
    .extract(MARK)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const brightness = (r + g + b) / 3;
    // Anything near white becomes fully transparent; ink stays fully opaque.
    // The narrow ramp between keeps the letterform's anti-aliased edges smooth.
    data[i + 3] = brightness >= 245 ? 0 : brightness <= 215 ? 255 : Math.round(((245 - brightness) / 30) * 255);
  }

  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * A square icon: navy tile + centred mark.
 * `padding` is the fraction of the tile reserved as breathing room; the maskable
 * variant needs ~20% so Android's circle mask never clips the artwork.
 */
async function squareIcon(size, { padding = 0.18, radius = 0, plate = true, markScale } = {}) {
  const mark = await markTransparent();

  // The mark is navy ink, so it needs a light plate to sit on. The plate is
  // inset from the tile edge, giving the app-icon "badge" look at every size.
  // Small sizes need a proportionally larger mark: at 16–48px the browser has
  // no pixels to spare, so the artwork fills most of the plate.
  const scale = markScale ?? (size <= 48 ? 0.94 : 0.8);
  const inner = Math.round(size * (1 - padding * 2));
  const scaled = await sharp(mark)
    .resize({
      width: plate ? Math.round(inner * scale) : inner,
      height: plate ? Math.round(inner * scale) : inner,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  const layers = [];
  if (plate) {
    const plateInset = Math.round(size * padding * 0.55);
    const plateSize = size - plateInset * 2;
    const plateRadius = Math.round(plateSize * 0.26);
    layers.push({
      input: Buffer.from(
        `<svg width="${size}" height="${size}"><rect x="${plateInset}" y="${plateInset}" width="${plateSize}" height="${plateSize}" rx="${plateRadius}" ry="${plateRadius}" fill="#ffffff"/></svg>`,
      ),
    });
  }
  layers.push({ input: scaled, gravity: "center" });

  // Rounded tile corners for non-maskable icons (iOS masks Apple icons itself).
  const maskSvg =
    radius > 0
      ? Buffer.from(
          `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * radius)}" ry="${Math.round(size * radius)}" fill="#fff"/></svg>`,
        )
      : null;

  const tile = await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite(layers)
    .png()
    .toBuffer();

  const masked = maskSvg
    ? await sharp(tile).composite([{ input: maskSvg, blend: "dest-in" }]).png().toBuffer()
    : tile;

  return sharp(masked).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });

  // Multi-resolution .ico for legacy browsers and OS favourites.
  const icoSizes = [16, 32, 48];
  // Minimal padding at favicon sizes so the mark stays readable.
  const icoPngs = await Promise.all(
    icoSizes.map((s) => squareIcon(s, { padding: 0.05, radius: 0.2, markScale: 1 })),
  );
  const ico = buildIco(icoPngs, icoSizes);
  await writeFile(join(OUT, "favicon.ico"), ico);

  // Modern PNG favicon (what browsers actually use most of the time).
  await writeFile(
    join(OUT, "favicon-32x32.png"),
    await squareIcon(32, { padding: 0.05, radius: 0.2, markScale: 1 }),
  );
  await writeFile(
    join(OUT, "favicon-48x48.png"),
    await squareIcon(48, { padding: 0.06, radius: 0.2, markScale: 1 }),
  );

  // Apple touch icon: no transparency, iOS rounds the corners itself.
  await writeFile(join(OUT, "apple-touch-icon.png"), await squareIcon(180, { padding: 0.16 }));

  // PWA icons. "any" can be rounded; "maskable" must be a full-bleed square
  // with the mark safely inside the 80% safe zone.
  await writeFile(join(OUT, "icon-192.png"), await squareIcon(192, { padding: 0.16, radius: 0.18 }));
  await writeFile(join(OUT, "icon-512.png"), await squareIcon(512, { padding: 0.16, radius: 0.18 }));
  await writeFile(
    join(OUT, "icon-maskable-192.png"),
    await squareIcon(192, { padding: 0.24, radius: 0 }),
  );
  await writeFile(
    join(OUT, "icon-maskable-512.png"),
    await squareIcon(512, { padding: 0.24, radius: 0 }),
  );

  // Wide social card used by the app splash/lockup contexts.
  await writeFile(join(OUT, "icon-1024.png"), await squareIcon(1024, { padding: 0.16, radius: 0.18 }));

  console.log("icons written to", OUT);
}

/**
 * Minimal ICO writer: a 6-byte directory header plus one PNG entry per size.
 * Windows and every modern browser accept PNG-compressed ICO entries.
 */
function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += pngBuffers[i].length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

// Keep `dirname` referenced for clarity when relocating the output.
void dirname;

await main();
