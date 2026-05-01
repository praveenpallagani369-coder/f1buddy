import { createClient } from "@/lib/supabase/server";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const plan = (url.searchParams.get("plan") ?? "monthly") as PlanKey;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/auth/login?redirect=/pricing`, request.url));
  }

  const selectedPlan = PLANS[plan];
  if (!selectedPlan?.priceId) {
    return NextResponse.redirect(new URL("/pricing?error=config", request.url));
  }

  try {
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      success_url: `${appUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: user.email ?? undefined,
      metadata: { userId: user.id, plan },
      subscription_data: { metadata: { userId: user.id, plan } },
    });

    return NextResponse.redirect(session.url!);
  } catch (e: unknown) {
    console.error("Stripe checkout error:", e instanceof Error ? e.message : e);
    return NextResponse.redirect(new URL("/pricing?error=stripe", request.url));
  }
}
