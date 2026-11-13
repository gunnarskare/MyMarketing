# MyMarketing

AI-markedsføringstjeneste: en bedrift legger inn nettsiden sin, får en ukeplan med ferdige
utkast, godkjenner dem, og innleggene publiseres til Facebook, Instagram og LinkedIn.

Plan, arkitektur og datamodell: https://claude.ai/artifact/2iY1ry2gfMp9kPmUSgPtt3

## Stack

- Next.js (App Router) på Vercel
- Supabase: Postgres, Auth og Storage
- Egen publiseringsadapter per plattform (`src/lib/publishing`)

## Kom i gang

```bash
npm install
cp .env.example .env.local   # fyll inn verdier
npm run dev
```

## Database

Skjemaet ligger i `supabase/migrations`. Kjør det mot Supabase-prosjektet med
`supabase db push`, eller lim inn SQL-en i SQL-editoren.

Alle tabeller har `org_id` og radnivåsikkerhet. Plattform-tokens ligger i
`social_account_tokens`, som bare serveren kan lese.

## Deploy

Vercel bygger og deployer automatisk ved push til `main`.

## Status

- [x] Fase 0: prosjekt, datamodell, adapter-grensesnitt
- [ ] Fase 1: merkevareprofil, ukeplan og utkast
- [ ] Fase 2: Facebook-side og LinkedIn
- [ ] Fase 3: godkjenning, kø og jobbkjører
- [ ] Fase 4: Instagram og bilder
- [ ] Fase 5: tall og pilotkunde
