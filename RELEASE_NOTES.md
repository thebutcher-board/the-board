# THE BOARD v0.3.0 — Master Database Foundation

## New
- Added a searchable master player database containing available players, keepers, and drafted players.
- Keepers remain available for player comparisons but are excluded from the live draft board.
- Added two-player comparison from player cards, the live board, recommendations, and the player database.
- Added draft/keeper/available status labels and owner visibility.
- Added a persistent comparison tray.

## Fixed
- James Cook is explicitly identified as Patti's keeper and cannot appear on Best Available or the live draft board.
- Corrected `George KittleO` to `George Kittle`.
- Replaced unsafe name normalization that could alter legitimate player names.
- Migrates existing v0.2 draft state into v0.3 local storage.

## Architecture
- Introduced `MASTER_PLAYERS` as the single player universe.
- Draft availability is now computed from player status rather than deleting keepers from the database.
- Added stable internal player IDs and a provider-ready record shape for future ESPN/news/projection integrations.

## Not yet live
- ESPN sync, live injury updates, live news, headshots, and category projections require a server-side provider layer and are planned for a later release.
