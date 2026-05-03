import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature") as string;

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = await createClient();

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as "monthly" | "yearly";

      if (!userId) {
        console.error("No userId in session metadata");
        break;
      }

      // Update user role to premium
      await supabase
        .from("users")
        .update({ role: "premium" })
        .eq("id", userId);

      // Create or update subscription
      await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan: plan === "yearly" ? "premium" : "premium", // Both map to premium role for now
          status: "active",
          current_period_start: new Date().toISOString(),
          // We don't have the exact end date here easily, Stripe will send sub events later
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Downgrade user to student
        await supabase
          .from("users")
          .update({ role: "student" })
          .eq("id", userId);

        // Update subscription status
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", plan: "free" })
          .eq("user_id", userId);
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
