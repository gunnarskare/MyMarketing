# Spott

Spott (repoet heter fortsatt MyMarketing) er en AI-markedsføringstjeneste fra S&S Marketing AS: en bedrift legger inn nettsiden sin, får en ukeplan med ferdige
utkast, godkjenner dem, og innleggene publiseres til Facebook, Instagram og LinkedIn.

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
| `src/app/page.tsx` | Forsiden |
| `src/app/personvern` | Personvernerklæringen |
| `src/lib/company.ts` | Selskapsopplysninger som vises i bunnteksten og personvernerklæringen |
| `src/app/login` | Innlogging og registrering med e-post og passord |
| `src/app/auth/confirm` | Mottar lenken fra bekreftelses-e-posten |
| `src/app/(app)/onboarding` | Oppretter bedriften ved første innlogging |
| `src/app/(app)/profil` | Merkevareprofilen AI-en skriver ut fra |
| `src/lib/publishing` | Felles grensesnitt for Facebook, Instagram og LinkedIn |

Sider som leser innloggingen har en statisk ramme og henter resten bak `<Suspense>`.
Det er slik Cache Components krever det.

## Database

Skjemaet ligger i `supabase/migrations`. Alle tabeller har `org_id` og radnivåsikkerhet,
og innloggede brukere har bare de tilgangene migrasjonen gir dem eksplisitt.

- Kunder opprettes bare gjennom funksjonen `create_organization`.
- Hjelpefunksjonen RLS-reglene bruker ligger i skjemaet `private`, utenfor API-et.
- Plattform-tokens ligger i `social_account_tokens`, som bare serveren kan lese.

Kundeskillet testes mot en Postgres i minnet:

```bash
npm run test:rls
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
- [ ] Fase 1: innlogging, bedrift og merkevareprofil er bygget. Gjenstår: AI-generert profil, ukeplan og utkast
- [ ] Fase 2: Facebook-side og LinkedIn
- [ ] Fase 3: godkjenning, kø og jobbkjører
- [ ] Fase 4: Instagram og bilder
- [ ] Fase 5: tall og pilotkunde
