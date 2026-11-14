-- Abonnement per bedrift, speilet fra Stripe.
-- Bare serveren skriver hit (Stripe-webhooken og betalingsflyten, med service-nøkkelen).
-- Innloggede medlemmer kan lese sin egen bedrifts rad, så appen kan vise status og stenge betalte funksjoner.

create table public.billing_accounts (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'none'
    check (status in ('none', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Gratis tilgang uten Stripe, for egne bedrifter og pilotkunder. Settes manuelt i databasen.
  complimentary boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.billing_accounts enable row level security;
revoke all on public.billing_accounts from anon, authenticated;
grant select on public.billing_accounts to authenticated;

create policy billing_accounts_member_read on public.billing_accounts
  for select to authenticated using (private.is_org_member(org_id));
