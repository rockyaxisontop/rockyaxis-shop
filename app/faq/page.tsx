import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, Mail } from "lucide-react";

import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about shopping, offers, freebie campaigns, and your MT Store account.",
};

const questions = [
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
];

export default function FAQPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-9 py-4 sm:gap-12 sm:py-8">
      <header className="rounded-3xl bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4] px-6 py-9 text-white sm:px-9 sm:py-11">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <CircleHelp className="size-3.5" />
          Help center
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
          Quick answers about finding products, comparing offers, and using freebie campaigns.
        </p>
      </header>

      <section aria-label="Questions and answers" className="divide-y divide-border rounded-2xl border border-border bg-white px-5 sm:px-7">
        {questions.map(({ question, answer }) => (
          <details key={question} className="group py-4 first:pt-5 last:pb-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink marker:hidden sm:text-base">
              {question}
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-brand transition group-open:rotate-45">
                <span aria-hidden className="text-lg leading-none">+</span>
              </span>
            </summary>
            <p className="max-w-3xl pt-3 pr-9 text-sm leading-6 text-ink-soft">{answer}</p>
          </details>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-brand/20 bg-brand-tint/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-bold text-ink">Still need a hand?</h2>
          <p className="mt-1 text-sm text-ink-soft">Our support team can help with questions about MT Store.</p>
        </div>
        <a
          href="mailto:support@mtstore.com"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Mail className="size-4" />
          Email support
        </a>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/about" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
          About MT Store <ArrowRight className="size-4" />
        </Link>
        <Link href="/search" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
          Browse products <ArrowRight className="size-4" />
        </Link>
      </div>

      <ProductSuggestions />
    </div>
  );
}
