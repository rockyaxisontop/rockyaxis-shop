// temporary SEO verification: product + search + faq pages
export default async function run(page) {
  const out = {};

  await page.goto("http://localhost:3000/products/Aiun3k6", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);
  out.product = await page.evaluate(() => {
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
      JSON.parse(s.textContent),
    );
    const product = ld.find((x) => x["@type"] === "Product");
    const crumb = ld.find((x) => x["@type"] === "BreadcrumbList");
    return {
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
      productLd: product
        ? {
            name: product.name,
            price: product.offers?.price,
            currency: product.offers?.priceCurrency,
            availability: product.offers?.availability,
            brand: product.brand?.name,
            images: product.images?.length,
          }
        : null,
      breadcrumb: crumb?.itemListElement?.map((i) => `${i.position}.${i.name}`),
    };
  });

  await page.goto("http://localhost:3000/search?q=headphones", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  out.searchWithQuery = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
  }));

  await page.goto("http://localhost:3000/search", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  out.searchNoQuery = await page.evaluate(() => ({
    title: document.title,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
  }));

  await page.goto("http://localhost:3000/faq", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  out.faq = await page.evaluate(() => {
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
      JSON.parse(s.textContent),
    );
    const faq = ld.find((x) => x["@type"] === "FAQPage");
    return {
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      questions: faq?.mainEntity?.length,
      firstQuestion: faq?.mainEntity?.[0]?.name,
    };
  });

  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  out.login = await page.evaluate(() => ({
    title: document.title,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
  }));

  return out;

}
