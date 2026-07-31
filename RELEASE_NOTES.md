# THE BOARD v0.6.0 — Front Office War Room

## Product architecture
- War Room is now the private strategy brain: roster construction, draft blueprint, positional shortlists, pick-window pressure, and current decision set.
- Board remains the live draftable pool.
- Players remains the master scouting/trade database, including keepers and drafted players.

## UX and integrity
- Removed the dead Live Player Feed header control.
- Comparison draft actions now close the comparison overlay before showing the confirmation flow.
- Replaced broad generic tiers with positional micro-tiers.
- Removed exposed Board Score and numeric Roster Need from primary decision views.
- Pressure indicators are clearly labeled as roster signals, not unsupported probabilities.

## Analysis foundation
- Added player-specific strategic profiles based on position rank, role class, market context, injury status, and risk.
- Added draft-window team pressure and position-needs analysis.
- Added a visible roadmap boundary for future situational splits: weather, venue, time-of-day, opponent trends, schedule, and historical performance.
