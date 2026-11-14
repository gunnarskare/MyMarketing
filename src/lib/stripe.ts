import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Stripe-klienten. Den hemmelige nøkkelen finnes bare på serveren. */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY mangler på serveren.");
  client = new Stripe(key, { appInfo: { name: "Spott", url: "https://www.spott.no" } });
  return client;
}

export const PRICE_LOOKUP_KEY = "spott_monthly_nok";

/** Prisen hentes med oppslagsnøkkel, så samme kode virker i test- og live-modus. */
export async function getSubscriptionPrice(): Promise<Stripe.Price> {
  const { data } = await getStripe().prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, expand: ["data.product"], limit: 1 });
  if (!data[0]) throw new Error(`Fant ingen aktiv pris med oppslagsnøkkel ${PRICE_LOOKUP_KEY} i Stripe.`);
  return data[0];
}
