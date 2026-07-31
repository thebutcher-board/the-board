# THE BOARD data setup

## FantasyPros
1. Request or activate your personal FantasyPros API key.
2. In Vercel, open the project and go to Settings → Environment Variables.
3. Add `FANTASYPROS_API_KEY` with the API key as its value.
4. Add it for Production, Preview, and Development if desired.
5. Redeploy the project.

The browser never receives the API key. `/api/fantasypros` runs on Vercel, merges ECR, ADP, tiers, and player news, and returns a cached response to THE BOARD.

Optional: set `FANTASY_SEASON=2026` in Vercel. The app defaults to 2026.

## Sleeper
Sleeper enrichment remains browser-based and supplies player photos, injury status, active status, and depth-chart metadata. The large player feed should eventually be moved behind a cached server endpoint for production scale.

## NFL.com
NFL.com is not wired into this release. Do not scrape its pages. For official schedule, transactions, and injury-report data, add a licensed or documented provider endpoint later and normalize it through THE BOARD's server data layer.
