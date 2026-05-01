import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}

export const PLANS = {
  monthly: { priceId: process.env.STRIPE_PRICE_MONTHLY_ID ?? "", amount: 699, label: "$6.99/mo" },
  yearly:  { priceId: process.env.STRIPE_PRICE_YEARLY_ID  ?? "", amount: 5999, label: "$59.99/yr" },
} as const;

export type PlanKey = keyof typeof PLANS;
