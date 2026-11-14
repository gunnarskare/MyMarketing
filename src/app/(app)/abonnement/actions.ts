"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { getBillingAccount, hasAccess } from "@/lib/billing";
import { getStripe, getSubscriptionPrice } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

/** Finner bedriftens Stripe-kunde, eller lager én. Én kunde per bedrift. */
async function ensureCustomer(org: { id: string; name: string }, email: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  const stripe = getStripe();
  const customer = await stripe.customers.create(
    { name: org.name, email: email || undefined, metadata: { org_id: org.id }, preferred_locales: ["nb"] },
    { idempotencyKey: `customer-${org.id}` },
  );
  const { error } = await createAdminClient().from("billing_accounts").upsert(
    { org_id: org.id, stripe_customer_id: customer.id, updated_at: new Date().toISOString() },
    { onConflict: "org_id" },
  );
  if (error) throw new Error("Kunne ikke lagre kunden.");
  return customer.id;
}

export async function startCheckout() {
  const { supabase, org, email } = await requireOrg();
  const account = await getBillingAccount(supabase, org.id);
  // Har bedriften allerede et abonnement, skal den ikke kunne starte et til.
  if (hasAccess(account)) redirect("/abonnement");

  let url: string | null = null;
  try {
    const customer = await ensureCustomer(org, email, account?.stripe_customer_id ?? null);
    const price = await getSubscriptionPrice();
    const base = await origin();
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: org.id,
      metadata: { org_id: org.id },
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { metadata: { org_id: org.id }, billing_mode: { type: "flexible" } },
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      allow_promotion_codes: true,
      locale: "nb",
      success_url: `${base}/abonnement?betaling=fullfort`,
      cancel_url: `${base}/abonnement?betaling=avbrutt`,
    });
    url = session.url;
  } catch (error) {
    console.error("Checkout failed:", error instanceof Error ? error.message : error);
  }
  if (!url) redirect("/abonnement?betaling=feil");
  redirect(url);
}

export async function openBillingPortal() {
  const { supabase, org } = await requireOrg();
  const account = await getBillingAccount(supabase, org.id);
  if (!account?.stripe_customer_id) redirect("/abonnement");

  let url: string | null = null;
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${await origin()}/abonnement`,
      locale: "nb",
    });
    url = session.url;
  } catch (error) {
    console.error("Billing portal failed:", error instanceof Error ? error.message : error);
  }
  if (!url) redirect("/abonnement?betaling=feil");
  redirect(url);
}
