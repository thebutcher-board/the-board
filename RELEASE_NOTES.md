# THE BOARD v0.2.0

## Added
- Confirmation step before every draft selection.
- Undo Last button in both War Room and History.
- Player detail modal with projection, rank, board score, fit, risk, roster percentage, and recommendation context.
- Dynamic "On the Board" reasons based on The Butcher roster needs and positional value.
- Keyboard support for player cards and Escape-to-close modals.

## Reliability and security
- HTML escaping for player and team data before rendering.
- Validation and migration of locally saved draft state.
- Draft availability rechecked before confirmation to prevent duplicate picks.
- Existing draft state remains stored locally in the browser.

## Regression checklist
- Navigation tabs work.
- Search and position filters work.
- Keepers remain excluded from available players.
- Confirmed picks advance the snake draft.
- Undo restores the previous team and player.
- Reset Draft preserves keepers.
- Vercel-compatible static deployment retained.
