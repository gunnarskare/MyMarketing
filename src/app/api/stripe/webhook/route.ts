import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { syncSubscription } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

// Hendelser som kan endre et abonnement. For hver av dem hentes abonnementet på nytt fra Stripe
// og lagres, så det ikke spiller noen rolle om hendelsene kommer dobbelt eller i feil rekkefølge.
const SUBSCRIPTION_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]);

function subscriptionIdOf(event: Stripe.Event): { id: string | null; orgId: string | null } {
  const object = event.data.object as unknown as Record<string, unknown>;
  if (event.type === "checkout.session.completed") {
    const session = object as unknown as Stripe.Checkout.Session;
    const id = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
    return { id, orgId: session.client_reference_id ?? session.metadata?.org_id ?? null };
  }
  if (event.type.startsWith("customer.subscription.")) return { id: (object as { id: string }).id, orgId: null };
  // Fakturaer: abonnementet ligger under parent.subscription_details.
  const invoice = object as unknown as Stripe.Invoice;
  const sub = invoice.parent?.subscription_details?.subscription;
  return { id: typeof sub === "string" ? sub : sub?.id ?? null, orgId: null };
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Mangler signatur eller hemmelighet." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Ugyldig signatur." }, { status: 400 });
  }

  if (!SUBSCRIPTION_EVENTS.has(event.type)) return NextResponse.json({ received: true });

  const { id, orgId } = subscriptionIdOf(event);
  if (!id) return NextResponse.json({ received: true });
  try {
    const subscription = await getStripe().subscriptions.retrieve(id);
    await syncSubscription(subscription, orgId);
  } catch (error) {
    console.error("Stripe webhook failed:", event.type, event.id, error instanceof Error ? error.message : error);
    // 500 gjør at Stripe prøver igjen senere.
    return NextResponse.json({ error: "Kunne ikke behandle hendelsen." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
