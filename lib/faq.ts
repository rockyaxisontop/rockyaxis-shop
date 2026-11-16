/**
 * FAQ content, shared by the FAQ page and its `FAQPage` structured data so the
 * visible answer and the machine-readable answer can never drift apart.
 */
export const FAQ_QUESTIONS = [
  {
    question: "What is MT Store?",
    answer:
      "MT Store helps you discover products and compare available offers from online retailers. You can browse curated suggestions or search for a particular product.",
  },
  {
    question: "How do I buy a product?",
    answer:
      "Open a product and choose a retailer offer, or use Buy now from your checkout list. You’ll continue to the retailer’s website to complete the purchase. The retailer handles its checkout, stock, shipping, and return terms.",
  },
  {
    question: "Are displayed prices final?",
    answer:
      "Prices and availability can change. Check the retailer’s listing for the latest price, shipping costs, taxes, and other terms before placing an order.",
  },
  {
    question: "How does a freebie campaign work?",
    answer:
      "Start a campaign for an eligible product and share its referral link. The campaign unlocks when 15 unique people with verified email accounts have helped within the campaign’s 7-day window. Helping does not require a purchase.",
  },
  {
    question: "What happens after my campaign is unlocked?",
    answer:
      "The campaign owner can place the free order from the campaign page. You’ll see an order confirmation after it is placed. Please refer to the confirmation and any follow-up from the store for delivery details.",
  },
  {
    question: "Do I need an account to use MT Store?",
    answer:
      "You can browse products without signing in. An account is required for features such as saving cart items, starting a freebie campaign, and counting a referral.",
  },
  {
    question: "How can I get help?",
    answer:
      "For questions about MT Store, contact support@mtstore.com. For an order completed on a retailer’s site, contact that retailer directly using its order confirmation.",
  },
] as const;
