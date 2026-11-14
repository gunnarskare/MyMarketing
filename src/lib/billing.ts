import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type BillingStatus = "none" | "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "paused";

export type BillingAccount = {
  status: BillingStatus;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  complimentary: boolean;
};

// past_due gir fortsatt tilgang mens Stripe prøver betalingen på nytt.
const PAID = new Set<BillingStatus>(["active", "trialing", "past_due"]);

export function hasAccess(account: BillingAccount | null): boolean {
  return Boolean(account && (account.complimentary || PAID.has(account.status)));
}

/** Leser bedriftens abonnement med innloggingen til brukeren (tilgangsreglene gjelder). */
export async function getBillingAccount(supabase: SupabaseClient, orgId: string): Promise<BillingAccount | null> {
  const { data } = await supabase
    .from("billing_accounts")
    .select("status,stripe_customer_id,current_period_end,cancel_at_period_end,complimentary")
    .eq("org_id", orgId)
    .maybeSingle();
  return (data as BillingAccount | null) ?? null;
}

export const PAYWALL_MESSAGE = "Dette krever et aktivt Spott-abonnement. Du kan starte det under Abonnement.";

/** Skriver abonnementet fra Stripe inn i databasen. Henter alltid siste versjon, så rekkefølgen på hendelser ikke spiller noen rolle. */
export async function syncSubscription(subscription: Stripe.Subscription, orgIdHint?: string | null): Promise<void> {
  const admin = createAdminClient();
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  let orgId = orgIdHint ?? subscription.metadata?.org_id ?? null;
  if (!orgId) {
    const { data } = await admin.from("billing_accounts").select("org_id").eq("stripe_customer_id", customerId).maybeSingle();
    orgId = data?.org_id ?? null;
  }
  if (!orgId) throw new Error(`Fant ingen bedrift for Stripe-kunden ${customerId}.`);

  // En forsinket hendelse om et gammelt, avsluttet abonnement skal ikke overskrive et nyere som er aktivt.
  const { data: current } = await admin.from("billing_accounts").select("stripe_subscription_id,status").eq("org_id", orgId).maybeSingle();
  if (current?.stripe_subscription_id && current.stripe_subscription_id !== subscription.id
    && PAID.has(current.status as BillingStatus) && !PAID.has(subscription.status as BillingStatus)) {
    return;
  }

  const item = subscription.items.data[0];
  const { error } = await admin.from("billing_accounts").upsert({
    org_id: orgId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: item?.price.id ?? null,
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
    updated_at: new Date().toISOString(),
  }, { onConflict: "org_id" });
  if (error) throw new Error("Kunne ikke lagre abonnementet: " + error.message);
}
