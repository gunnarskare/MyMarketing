import type { Metadata } from "next";
import { Suspense } from "react";
import { SubmitButton } from "@/components/form";
import { Loading } from "@/components/loading";
import { Notice } from "@/components/notice";
import { requireOrg } from "@/lib/auth";
import { getBillingAccount, hasAccess, syncSubscription, type BillingAccount } from "@/lib/billing";
import { getStripe, getSubscriptionPrice } from "@/lib/stripe";
import { openBillingPortal, startCheckout } from "./actions";

export const metadata: Metadata = { title: "Abonnement" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const INCLUDED = [
  "Merkevareprofil og AI-analyse av nettsiden",
  "Bibliotek for logoer, bilder og fonter",
  "Ukas innlegg til Facebook, Instagram og LinkedIn, klare til godkjenning",
  "Ingen bindingstid. Si opp når du vil, og behold tilgangen ut perioden",
];

function kroner(amountInOre: number): string {
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(amountInOre / 100) + " kr";
}

function date(value: string): string {
  return new Intl.DateTimeFormat("nb-NO", { dateStyle: "long" }).format(new Date(value));
}

export default function SubscriptionPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Abonnement</h1>
        <p className="max-w-2xl text-ink-soft">Én pris, alt inkludert. Betaling og fakturaer håndteres trygt av Stripe.</p>
      </header>
      <Suspense fallback={<Loading />}>
        <SubscriptionContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SubscriptionContent({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, org } = await requireOrg();
  const { betaling } = await searchParams;
  let account = await getBillingAccount(supabase, org.id);

  // Kommer brukeren rett fra betalingen før webhooken har kommet fram, hentes abonnementet direkte fra Stripe.
  if (betaling === "fullfort" && !hasAccess(account) && account?.stripe_customer_id) {
    try {
      const { data } = await getStripe().subscriptions.list({ customer: account.stripe_customer_id, status: "all", limit: 1 });
      if (data[0]) {
        await syncSubscription(data[0], org.id);
        account = await getBillingAccount(supabase, org.id);
      }
    } catch (error) {
      console.error("Subscription sync after checkout failed:", error instanceof Error ? error.message : error);
    }
  }

  let amount = 299000;
  try {
    amount = (await getSubscriptionPrice()).unit_amount ?? amount;
  } catch {
    // Vis standardprisen hvis Stripe ikke svarer. Betalingen bruker uansett prisen i Stripe.
  }

  const active = hasAccess(account);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex flex-col gap-5 rounded-3xl border border-line p-6 sm:p-8" aria-labelledby="pris">
        <div>
          <h2 id="pris" className="text-lg font-bold">Spott</h2>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="text-5xl font-black tracking-tight tabular-nums">{kroner(amount)}</span>
            <span className="text-ink-soft">per måned, eks. mva.</span>
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-spot" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Messages betaling={typeof betaling === "string" ? betaling : undefined} active={active} />
        {active ? <ActiveStatus account={account!} /> : (
          <form action={startCheckout}>
            <SubmitButton>Start abonnement</SubmitButton>
          </form>
        )}
      </section>
      <aside className="flex flex-col gap-3 rounded-3xl bg-mist p-6 text-sm leading-relaxed text-ink-soft">
        <h2 className="text-base font-bold text-ink">Slik fungerer betalingen</h2>
        <p>Du betaler med kort på Stripes betalingsside. Legg inn organisasjonsnummeret, så kommer det på fakturaen.</p>
        <p>Abonnementet fornyes hver måned. Kvittering og faktura kommer på e-post.</p>
        <p>Kort, fakturaer og oppsigelse finner du under «Administrer abonnement».</p>
      </aside>
    </div>
  );
}

function Messages({ betaling, active }: { betaling?: string; active: boolean }) {
  if (betaling === "fullfort") {
    return active
      ? <Notice tone="success">Takk! Abonnementet er aktivt.</Notice>
      : <Notice tone="info">Betalingen er mottatt. Abonnementet aktiveres i løpet av noen sekunder. Last siden på nytt om litt.</Notice>;
  }
  if (betaling === "avbrutt") return <Notice tone="info">Betalingen ble avbrutt. Ingenting er trukket.</Notice>;
  if (betaling === "feil") return <Notice tone="error">Vi fikk ikke kontakt med betalingstjenesten. Prøv igjen om litt.</Notice>;
  return null;
}

function ActiveStatus({ account }: { account: BillingAccount }) {
  if (account.complimentary && !account.stripe_customer_id) {
    return <Notice tone="success">Bedriften har gratis tilgang til Spott.</Notice>;
  }
  return (
    <div className="flex flex-col gap-4">
      {account.status === "past_due" ? (
        <Notice tone="error">Siste betaling gikk ikke gjennom. Oppdater kortet, så prøver vi igjen.</Notice>
      ) : account.cancel_at_period_end && account.current_period_end ? (
        <Notice tone="info">Abonnementet er sagt opp og avsluttes {date(account.current_period_end)}.</Notice>
      ) : (
        <Notice tone="success">
          Abonnementet er aktivt{account.current_period_end ? `. Neste trekk ${date(account.current_period_end)}.` : "."}
        </Notice>
      )}
      <form action={openBillingPortal}>
        <SubmitButton variant="secondary">Administrer abonnement</SubmitButton>
      </form>
    </div>
  );
}
