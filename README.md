# Spyd

Spyd (tidligere Spott; repoet heter fortsatt MyMarketing) er en AI-markedsføringstjeneste fra S&S Marketing AS: en bedrift legger inn
nettsiden sin, får en innholdsplan med ferdige utkast, godkjenner dem, og innleggene publiseres til Facebook, Instagram og LinkedIn.

Plan, arkitektur og datamodell: https://claude.ai/artifact/2iY1ry2gfMp9kPmUSgPtt3

## Stack

- Next.js 16 (App Router, Cache Components) på Vercel
- Supabase: Postgres, Auth og Storage
- Egen publiseringsadapter per plattform (`src/lib/publishing`)

## Kom i gang

```bash
npm install
cp .env.example .env.local   # fyll inn verdier
npm run dev
```

Uten Supabase-verdiene starter appen likevel, men innlogging er slått av.

## Slik henger koden sammen

| Sti | Innhold |
| --- | --- |
| `src/proxy.ts` | Fornyer innloggingsøkten og sender uinnloggede til `/login` |
| `src/lib/auth.ts` | `requireUser` og `requireOrg`, brukt øverst i alt som krever innlogging |
| `src/app/page.tsx` | Forsiden. De fire stegene ligger i `src/components/journey.tsx` |
| `src/app/personvern` | Personvernerklæringen |
| `src/app/vilkar` | Vilkårene for å bruke Spyd. Godtas når kontoen opprettes og abonnementet startes |
| `src/app/sletting` | Slik ber man om sletting, og fjerner tilgangen hos Meta og LinkedIn. Lenken Meta krever |
| `src/lib/company.ts` | Selskapsopplysninger som vises i bunnteksten, personvernerklæringen og vilkårene |
| `src/app/login` | Innlogging og registrering med e-post og passord |
| `src/app/auth/confirm` | Mottar lenken fra bekreftelses-e-posten |
| `src/app/(app)/onboarding` | Oppretter bedriften ved første innlogging |
| `src/app/(app)/dashboard` | Oversikten, med sjekkliste over hva som gjenstår |
| `src/app/(app)/kom-i-gang` | Veiviser med fem spørsmål som fyller ut profilen |
| `src/app/(app)/profil` | Merkevareprofilen: import fra nettside, logoer/bilder/fonter og typografi |
| `src/app/(app)/merkevare` | Strategi: merkevareanalysen, som du leser, retter og godkjenner |
| `src/app/(app)/uke` | Innholdsplanen: uka som dagrader og valgt innlegg ved siden av. Lage utkast, rette, godkjenne, kopiere og merke som publisert |
| `src/app/api/weekly-plan` | Lager ukas utkast (POST) ut fra profil, analyse og bildebibliotek |
| `src/app/api/brand-analysis` | Lager (POST), henter (GET) og lagrer (PATCH) merkevareanalysen |
| `src/app/api/brand-intelligence` | Leser en nettside og importerer bilder til biblioteket |
| `src/app/api/assistant` | Spørsmål til AI-assistenten (ingen side bruker den ennå) |
| `src/app/api/mcp` | MCP-endepunkt for profil og filer (krever Supabase-token) |
| `src/lib/safe-fetch.ts` | All henting fra kunders nettsider. Kan ikke nå interne adresser |
| `src/lib/brand-crawler.ts` | Velger og henter de viktigste sidene på en nettside |
| `src/lib/brand-assets-extract.ts` | Finner bilder, farger og fonter i HTML og CSS |
| `src/lib/ai` | OpenAI-agentene, analyseskjemaet, ukeplan-agenten og kvotene |
| `src/lib/week.ts` | Uker, datoer i norsk tid og rydding av AI-utkast (testet i `tests/unit/week.test.mjs`) |
| `src/lib/publishing` | Felles grensesnitt for Facebook, Instagram og LinkedIn |
| `src/components/wordmark.tsx` | Spyd-logoen og spydspissen som SVG |
| `src/components/ui.ts` | Felles stiler for knapper og lenker |
| `src/components/icons.tsx` | Strekikonene |
| `src/images` | Bildene på forsiden |

Sider som leser innloggingen har en statisk ramme og henter resten bak `<Suspense>`.
Det er slik Cache Components krever det.

## Merkevare og design

Alt følger merkevareprofilen for Spyd (versjon 1.0, november 2026).

- **Farger** står som variabler i `src/app/globals.css`: krem (`paper`), blekk (`ink`), terrakotta (`terra`),
  dyp terrakotta (`terra-deep`), sand og leire (`clay`). Liten tekst skal aldri stå i lys terrakotta på krem (4,34:1).
  Bruk dyp terrakotta (6,29:1), eller hvit tekst på lys terrakotta (4,75:1). Knapper og lenker er dyp terrakotta.
- **Skrift:** Liberation Serif Regular i overskrifter og Open Sans i brødtekst og grensesnitt, lagret i `src/app/fonts`.
  Serif-fonten er et latinsk utsnitt med det interne navnet «Spyd Serif», fordi lisensen (OFL) reserverer navnet
  Liberation for originalen. Se `src/app/fonts/LICENSE.txt`.
- **Logo:** ordmerket og spydspissen er hentet som vektor fra merkevareprofilen. Bruk alltid `Wordmark`,
  aldri navnet satt med en font, og hold den minst 120 px bred (44 px høy). Faviconet er spydspissen på terrakotta.
- **Bilder:** fotoet av markedsføreren og kunden er fra merkevareprofilen (side 09). Hytta og miniatyrene er
  klippet fra designskissene og er bare 619 px brede. Har dere originalfilene, bytt filene i `src/images` med samme navn.
- **Fjordbygg** på forsiden er en tenkt bedrift. Kortene er merket «Eksempel».
- Ser du gamle farger i `npm run dev`, slett `.next` og start på nytt. Turbopack kan gjenbruke et gammelt stilark.

## Database

Skjemaet ligger i `supabase/migrations`. Alle tabeller har `org_id` og radnivåsikkerhet,
og innloggede brukere har bare de tilgangene migrasjonen gir dem eksplisitt.

- Kunder opprettes bare gjennom funksjonen `create_organization`.
- Hjelpefunksjonen RLS-reglene bruker ligger i skjemaet `private`, utenfor API-et.
- Plattform-tokens ligger i `social_account_tokens`, som bare serveren kan lese.
- Logoer, bilder og fonter ligger i den private lagringsbøtta `brand-assets`, i en mappe per bedrift.
  Samme fil kan bare ligge én gang per bedrift (`content_hash`), og hver bedrift har én hovedlogo.

Endringer i databasen skal alltid ligge som en fil i `supabase/migrations` før de kjøres.

## AI-kvoter

Alt som koster penger eller henter fra andres nettsider, går gjennom `public.claim_ai_quota`
i databasen. Funksjonen teller kall de siste 24 timene og sier nei når grensen er nådd:

| Type | Per bedrift | Totalt |
| --- | --- | --- |
| `brand_analysis` (ny merkevareanalyse) | 5 | 200 |
| `assistant` (spørsmål til assistenten) | 60 | 2000 |
| `website_import` (lese en nettside) | 20 | 1000 |
| `weekly_plan` (lage ukas utkast) | 10 | 500 |
| `post_rewrite` (skrive om ett innlegg) | 60 | 3000 |

Grensene endres i migrasjonen. Sett i tillegg et månedlig budsjett i OpenAI-kontoen.

Hvert kall får en rad i `ai_runs`. Når OpenAI har svart, fører serveren på modellen som svarte, antall
tokens (input + output) og anslått kostnad i USD etter pristabellen i `src/lib/ai/pricing.ts`. Det skjer
med service-nøkkelen (`record_ai_usage`), så brukerne kan lese radene til egen bedrift, men ikke endre dem.

## Betaling (Stripe)

- Produktet har én månedspris med oppslagsnøkkelen `spott_monthly_nok` (2 990 kr eks. mva.). Nøkkelen er fra før navnebyttet
  og vises ikke for kundene. Produktnavnet i Stripe er det kundene ser i betalingen og på fakturaen.
  Koden finner prisen med nøkkelen, så den samme koden virker i test og live.
- `/abonnement` starter Stripe Checkout og åpner kundeportalen (kort, fakturaer, oppsigelse ved periodens slutt).
- `/api/stripe/webhook` speiler abonnementet til `billing_accounts`. Den er åpen i proxyen og sjekker Stripe-signaturen.
- AI-analysen og assistenten krever aktivt abonnement (`active`, `trialing` eller `past_due`), eller
  `complimentary = true` i `billing_accounts` for gratis tilgang.
- Miljøvariabler: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY` (eller `SUPABASE_SERVICE_ROLE_KEY`).

## Sikkerhet

- **Kundeskillet** ligger i databasen (radnivåsikkerhet), ikke bare i appen. Uinnloggede har ingen tilganger.
- **Grenser i databasen**: tekstlengder, størrelse på analysen og maks 300 filer per bedrift i biblioteket
  (`20261114110000_abuse_limits.sql`). De gjelder også for den som snakker rett med databasen.
- **AI-kall** har kvote (se over), tidsgrense og kappet inndata, så ett kall aldri kan bli uvanlig dyrt.
- **Feilmeldinger** til brukeren er bare de som er skrevet for brukeren (`src/lib/public-error.ts`).
  Alt annet logges på serveren og vises som en nøytral melding.
- **Sikkerhetshoder** (CSP, X-Frame-Options med flere) settes i `next.config.ts`. Skal siden hente noe fra
  et nytt domene (skript, bilder, fonter), må domenet legges til der.
- **Henting fra kunders nettsider** går alltid gjennom `src/lib/safe-fetch.ts`.
- API-kall uten innlogging får `401` som JSON. Sider sendes til `/login`.

## Slette en kunde

`/sletting` lover at vi sletter innen én måned etter en e-post. Slik gjøres det:

1. Sjekk at e-posten kommer fra adressen som er logget inn på kontoen.
2. Finn bedriften: `select o.id, o.name from public.organizations o join public.memberships m on m.org_id = o.id join auth.users u on u.id = m.user_id where u.email = '<e-post>';`
3. Har bedriften abonnement: si det opp straks i Stripe (ikke ved periodens slutt), og vent til webhooken har kommet fram.
   Kunden og fakturaene blir liggende i Stripe, fordi bokføringsloven krever det.
4. Når tilkobling til sosiale medier finnes: trekk tilbake tilgangen hos plattformen.
5. Slett mappen `<org_id>/` i lagringsbøtta `brand-assets`.
6. Slett bedriften: `delete from public.organizations where id = '<org_id>';`. Alt annet med `org_id` slettes med.
7. Slett brukeren under Authentication → Users, hvis hen ikke er med i andre bedrifter.
8. Svar på e-posten at alt er slettet.

## Tester

```bash
npm test            # alt
npm run test:unit   # henting, crawler, uttrekk, uker og feilmeldinger (uten nettverk)
npm run test:rls    # kundeskillet, mot en Postgres i minnet
```

## Supabase-oppsett

Supabase-prosjektet er koblet til Vercel-prosjektet `mymarketing2026` gjennom Vercels
integrasjon, som legger inn miljøvariablene. Migrasjonene i `supabase/migrations` er kjørt.

I Supabase-prosjektet må appens adresse legges inn under Authentication → URL Configuration,
både som Site URL og under Redirect URLs (`https://<domene>/auth/confirm`).
Ellers peker lenken i bekreftelses-e-posten feil.

## Deploy

Vercel bygger og deployer automatisk ved push til `main`. Andre grener får en forhåndsvisning.
Funksjonene kjører i Stockholm (`arn1`), samme område som databasen.

## Status

- [x] Fase 0: prosjekt, datamodell, adapter-grensesnitt
- [x] Fase 1: innlogging, bedrift, profil, bibliotek, typografi, AI-merkevareanalyse, abonnement og ukas utkast
- [x] Nytt navn og ny merkevare: Spyd
- [ ] Fase 2: Facebook-side og LinkedIn
- [ ] Fase 3: godkjenning, kø og jobbkjører
- [ ] Fase 4: Instagram og bilder
- [ ] Fase 5: tall og pilotkunde
