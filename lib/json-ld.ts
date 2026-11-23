/**
 * Serialises structured data for a `<script type="application/ld+json">` tag.
 *
 * `</script>` inside a JSON string would close the tag early — the classic
 * JSON-LD injection hole. Escaping `<` makes that impossible while keeping the
 * JSON valid, so this is used everywhere structured data is emitted, even though
 * those values are currently constants.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
