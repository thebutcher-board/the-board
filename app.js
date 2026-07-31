'use strict';

const APP_VERSION = '0.8.0';
const STORAGE_KEY = 'the-board-v8';
const LEGACY_STORAGE_KEYS = ['the-board-v7', 'the-board-v6', 'the-board-v5', 'the-board-v4', 'the-board-v3', 'the-board-v2', 'the-board-v1'];
const NAME_CORRECTIONS = {
  'George KittleO': 'George Kittle',
  'James Cook': 'James Cook III'
};
const defaultState = { drafted: [], slot: 8, teams: [...BASE_TEAMS], compare: [] };

const DRAFT_BLUEPRINT = [
  { rounds: 'R1', title: 'Secure QB2', positions: ['QB'], detail: 'Leave Round 1 with a legitimate weekly QB2 unless an elite value shock changes the room.' },
  { rounds: 'R2–4', title: 'Build RB/WR firepower', positions: ['RB','WR'], detail: 'Add three starting-caliber skill players and turn the flex into a weekly advantage.' },
  { rounds: 'R5', title: 'Add QB3 upside', positions: ['QB'], detail: 'Target a younger or discounted quarterback with trade value and injury protection.' },
  { rounds: 'R6', title: 'Add TE2', positions: ['TE'], detail: 'Back up McBride with a useful weekly option—not dead roster weight.' },
  { rounds: 'R7', title: 'Attack premium kicker scoring', positions: ['K'], detail: 'Use the league scoring edge rather than waiting for leftovers.' },
  { rounds: 'R8', title: 'Secure a difference-making defense', positions: ['DEF'], detail: 'Target pressure, turnover and scoring upside.' },
  { rounds: 'R9–11', title: 'Handcuffs and rookie swings', positions: ['RB','WR'], detail: 'Finish with contingent value, direct handcuffs and players who can become weekly starters.' }
];

const POSITION_WISHLISTS = {
  QB: ['Jalen Hurts','Brock Purdy','Dak Prescott','Jaxson Dart','Tyler Shough'],
  RB: ['Jeremiyah Love','Javonte Williams','Cam Skattebo','TreVeyon Henderson','Quinshon Judkins'],
  WR: ['Garrett Wilson','Davante Adams','Jaylen Waddle','Marvin Harrison Jr.','Mike Evans'],
  TE: ['Tyler Warren','Colston Loveland','George Kittle','Tucker Kraft','Sam LaPorta'],
  K: ['Brandon Aubrey','Cameron Dicker',"Ka'imi Fairbairn",'Harrison Mevis','Evan McPherson'],
  DEF: []
};

const PLAYER_SCOUTING = {
  'Jalen Hurts': 'Hurts gives this roster another week-winning quarterback through rushing touchdowns and red-zone usage. Pairing him with Drake Maye creates a weekly ceiling few teams can match.',
  'Brock Purdy': 'Purdy is the balanced QB2 play: efficient offense, stable coaching and enough weekly volume to keep the floor intact without forcing a hero-ball outcome.',
  'Dak Prescott': 'Dak is the veteran stabilizer. He will not create the same rushing edge as Hurts, but his passing volume can lock down QB2 and let the rest of the draft focus on flex firepower.',
  'Jaxson Dart': 'Dart is an upside bet rather than a safety play. His mobility raises the ceiling, but the weekly range is wider and the roster must be comfortable absorbing developmental volatility.',
  'Tyler Shough': 'Shough is the calculated swing: late-2025 momentum, functional rushing value and a price that can create major profit if the starting role holds.',
  'Garrett Wilson': 'Wilson has alpha-level target talent, but the quarterback ecosystem still determines whether the weekly ceiling becomes elite or merely frustrating.',
  'Davante Adams': 'Adams remains a route-winning volume receiver, but age and changing offensive context make price discipline essential.',
  'Jaylen Waddle': 'Waddle adds explosive PPR upside and can tilt weeks without requiring twenty touches, though target competition keeps the floor less secure than a true alpha.',
  'Cam Skattebo': 'Skattebo is a workload bet built on contact balance and receiving utility. He is appealing when the price reflects role uncertainty rather than assuming a full takeover.',
  'Brandon Aubrey': 'Aubrey is not a throwaway kicker in this scoring system. His range creates legitimate weekly separation and justifies an earlier investment than standard formats.'
};

let state = loadState();
let pendingPlayerName = null;
let livePlayerData = new Map();
let liveDataStatus = 'loading';
let marketPlayerData = new Map();
let marketDataStatus = 'loading';

function canonicalName(value) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (NAME_CORRECTIONS[raw]) return NAME_CORRECTIONS[raw];
  // Imported feeds sometimes append a one-letter injury designation directly to a name.
  return /[a-z.)][QDO]$/.test(raw) ? raw.slice(0, -1) : raw;
}

function normalize(value) {
  return canonicalName(value).toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

const keeperOwnership = new Map();
Object.entries(KEEPERS).forEach(([owner, names]) => names.forEach(name => keeperOwnership.set(normalize(name), owner)));

const MASTER_PLAYERS = PLAYERS.map((source, index) => {
  const correctedName = canonicalName(source.name);
  const keeperOwner = keeperOwnership.get(normalize(correctedName)) || null;
  return {
    ...source,
    id: source.id || `${source.pos || 'P'}-${index + 1}-${normalize(correctedName).replace(/[^a-z0-9]+/g, '-')}`,
    name: correctedName,
    sourceName: source.name,
    keeperOwner,
    comparable: true
  };
});


function initials(name) {
  return canonicalName(name).split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
}


function marketInfo(player) {
  return marketPlayerData.get(normalize(player.name)) || null;
}

function ordinal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({1:'st',2:'nd',3:'rd'})[n % 10] || 'th'}`;
}

function recommendationStrength(player) {
  const score = comparisonScore(player);
  if (score >= 116) return { label: 'SMASH PICK', detail: 'The value, roster fit and positional leverage all line up.' };
  if (score >= 106) return { label: 'STRONG', detail: 'THE BOARD sees a meaningful advantage at this pick.' };
  if (score >= 96) return { label: 'SOLID', detail: 'A sound selection without forcing the draft.' };
  return { label: 'WATCH', detail: 'Useful player, but the price or roster fit is not ideal yet.' };
}

function tierCount(player) {
  return available().filter(p => p.pos === player.pos && p.tier === player.tier).length;
}

function marketLine(player) {
  const market = marketInfo(player);
  if (!market) return 'FantasyPros market data will appear when the server API key is connected.';
  const parts = [];
  if (market.ecr) parts.push(`ECR ${market.ecr}`);
  if (market.adp) parts.push(`ADP ${Number(market.adp).toFixed(1)}`);
  if (market.tier) parts.push(`Market Tier ${market.tier}`);
  return parts.join(' · ') || 'Market profile connected.';
}

function analystTake(player) {
  if (PLAYER_SCOUTING[player.name]) return PLAYER_SCOUTING[player.name];
  const counts = positionCounts('The Butcher');
  const live = liveInfo(player);
  const market = marketInfo(player);
  const pos = player.pos;
  let lead = '';
  if (pos === 'QB') {
    lead = (counts.QB || 0) < 2
      ? `${player.name} gives you a weekly starter in the most punishing position to chase in a 2QB room.`
      : `${player.name} gives the quarterback room another bankable weekly option and protects you from injury or matchup volatility.`;
  } else if (pos === 'RB') {
    lead = `${player.name} is a bet on touches, scoring chances and lineup flexibility—not merely another running back on the bench.`;
  } else if (pos === 'WR') {
    lead = `${player.name} adds weekly target volume and lineup ceiling, the two things that keep a PPR roster from becoming touchdown-dependent.`;
  } else if (pos === 'TE') {
    lead = `${player.name} matters because tight end value is about separating from the weekly streaming pile, not simply filling the position.`;
  } else if (pos === 'K') {
    lead = `${player.name} carries real lineup value in this league's elevated kicker scoring, where a top option can outscore ordinary flex depth.`;
  } else if (pos === 'DEF') {
    lead = `${player.name} offers a weekly scoring edge at a position your league rewards more heavily than standard formats.`;
  } else {
    lead = `${player.name} profiles as a useful roster piece at the current cost.`;
  }
  const context = [];
  if (market?.adp) context.push(`FantasyPros market cost sits around pick ${Number(market.adp).toFixed(1)}.`);
  if (live?.depth_chart_order) context.push(`Sleeper currently lists him ${ordinal(live.depth_chart_order)} in the team depth-chart order.`);
  if (injuryLabel(player) !== 'Healthy') context.push(`${injuryLabel(player)} is an active concern and should be priced into the pick.`);
  return `${lead} ${context.join(' ')}`;
}

async function enrichMarketData() {
  try {
    const response = await fetch('/api/fantasypros');
    if (!response.ok) throw new Error('FantasyPros feed unavailable');
    const payload = await response.json();
    marketPlayerData = new Map((payload.players || []).map(player => [normalize(player.name), player]));
    marketDataStatus = 'live';
    render();
  } catch (error) {
    marketDataStatus = 'offline';
  }
}

function liveInfo(player) {
  return livePlayerData.get(normalize(player.name)) || null;
}

function playerPhoto(player, className = 'player-photo') {
  const live = liveInfo(player);
  const src = live?.player_id ? `https://sleepercdn.com/content/nfl/players/thumb/${live.player_id}.jpg` : '';
  return `<div class="${className}">${src ? `<img src="${src}" alt="${escapeHtml(player.name)}" loading="lazy" onerror="this.remove();this.parentElement.classList.add('photo-fallback')">` : ''}<span>${initials(player.name)}</span></div>`;
}

function injuryLabel(player) {
  const live = liveInfo(player);
  return live?.injury_status || live?.status === 'Inactive' ? (live.injury_status || 'Inactive') : 'Healthy';
}

function intelFor(player) {
  const live = liveInfo(player);
  const status = injuryLabel(player);
  const lines = [];
  if (status !== 'Healthy') lines.push(`${status} designation is active in the latest player feed.`);
  if (live?.depth_chart_position) lines.push(`Listed ${live.depth_chart_position} on the current depth chart.`);
  lines.push(player.note || `${player.tier} tier option with a ${player.risk.toLowerCase()}-risk profile.`);
  return lines.slice(0, 2);
}

async function enrichPlayers() {
  try {
    const response = await fetch('https://api.sleeper.app/v1/players/nfl?active=true');
    if (!response.ok) throw new Error('Player feed unavailable');
    const payload = await response.json();
    livePlayerData = new Map(Object.entries(payload).map(([player_id, player]) => {
      const fullName = player.full_name || [player.first_name, player.last_name].filter(Boolean).join(' ');
      return [normalize(fullName), { ...player, player_id }];
    }));
    liveDataStatus = 'live';
    render();
  } catch (error) {
    liveDataStatus = 'offline';
  }
}

function playerByName(name) {
  return MASTER_PLAYERS.find(player => normalize(player.name) === normalize(name));
}

function isValidState(candidate) {
  return candidate &&
    Array.isArray(candidate.drafted) &&
    Number.isInteger(Number(candidate.slot)) &&
    Number(candidate.slot) >= 1 && Number(candidate.slot) <= 10 &&
    Array.isArray(candidate.teams) && candidate.teams.length === 10;
}

function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = LEGACY_STORAGE_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
    const saved = raw ? JSON.parse(raw) : null;
    if (!isValidState(saved)) return structuredClone(defaultState);
    return {
      drafted: saved.drafted.filter(p => p && p.name && p.draftedBy).map(p => ({ ...p, name: canonicalName(p.name) })),
      slot: Number(saved.slot),
      teams: [...saved.teams],
      compare: Array.isArray(saved.compare) ? saved.compare.map(canonicalName).slice(0, 2) : []
    };
  } catch (error) {
    return structuredClone(defaultState);
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showToast('Could not save draft state');
  }
}

function draftOrderAt(index) {
  const round = Math.floor(index / 10);
  const withinRound = index % 10;
  return round % 2 === 0 ? state.teams[withinRound] : state.teams[9 - withinRound];
}

function currentTeam() { return draftOrderAt(state.drafted.length); }

function draftedRecord(player) {
  return state.drafted.find(item => normalize(item.name) === normalize(player.name));
}

function playerStatus(player) {
  if (player.keeperOwner) return { key: 'keeper', label: 'KEEPER', owner: player.keeperOwner, draftable: false };
  const drafted = draftedRecord(player);
  if (drafted) return { key: 'drafted', label: 'DRAFTED', owner: drafted.draftedBy, draftable: false };
  return { key: 'available', label: 'AVAILABLE', owner: null, draftable: true };
}

function available() {
  return MASTER_PLAYERS.filter(player => playerStatus(player).draftable);
}

function rosterFor(team) {
  const keepers = (KEEPERS[team] || []).map(name => {
    const player = playerByName(name);
    return { name: canonicalName(name), pos: player?.pos || '—', keeper: true };
  });
  const drafted = state.drafted.filter(player => player.draftedBy === team);
  return [...keepers, ...drafted];
}

function positionCounts(team) {
  return rosterFor(team).reduce((counts, player) => {
    counts[player.pos] = (counts[player.pos] || 0) + 1;
    return counts;
  }, {});
}

function targetCount(pos) { return ({ QB: 3, RB: 4, WR: 5, TE: 2, K: 1, DEF: 1 })[pos] || 1; }

function rosterNeedScore(player, team = 'The Butcher') {
  const counts = positionCounts(team);
  const shortage = Math.max(0, targetCount(player.pos) - (counts[player.pos] || 0));
  const starterBonus = player.pos === 'QB' && (counts.QB || 0) < 2 ? 12 : 0;
  return shortage * 2.5 + starterBonus;
}

function ranked() {
  return available().slice().sort((a, b) => {
    const aTotal = Number(a.score || 0) + rosterNeedScore(a);
    const bTotal = Number(b.score || 0) + rosterNeedScore(b);
    return (bTotal - aTotal) || (Number(b.proj || 0) - Number(a.proj || 0));
  });
}

function showToast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => element.classList.remove('show'), 1800);
}

function openModal(id) { document.getElementById(id).hidden = false; document.body.classList.add('modal-open'); }
function closeModal(id) { document.getElementById(id).hidden = true; if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open'); }

function requestDraft(name) {
  if (!document.getElementById('compareModal').hidden) closeModal('compareModal');
  if (!document.getElementById('playerModal').hidden) closeModal('playerModal');
  const player = playerByName(name);
  if (!player || !playerStatus(player).draftable) return;
  pendingPlayerName = player.name;
  document.getElementById('confirmPlayer').textContent = player.name;
  document.getElementById('confirmMeta').textContent = `${player.pos} · ${player.team} · ${Math.round(player.proj)} projected points`;
  document.getElementById('confirmTeam').textContent = currentTeam();
  openModal('confirmModal');
}

function confirmDraft() {
  const player = playerByName(pendingPlayerName);
  if (!player || !playerStatus(player).draftable) { closeModal('confirmModal'); pendingPlayerName = null; return; }
  const team = currentTeam();
  state.drafted.push({ ...player, draftedBy: team, pick: state.drafted.length + 1 });
  save(); closeModal('confirmModal'); pendingPlayerName = null; render();
  showToast(`${player.name} drafted by ${team}`);
}

function undo() {
  const player = state.drafted.pop();
  if (!player) return showToast('No picks to undo');
  save(); render(); showToast(`Undid ${player.name}`);
}

function showView(id) {
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === id));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function recommendationReasons(player) {
  const counts = positionCounts('The Butcher');
  const reasons = [];
  if (player.pos === 'QB' && (counts.QB || 0) < 2) {
    reasons.push(`Starting-quarterback leverage: you currently have ${counts.QB || 0}, and this format starts two.`);
  } else if ((counts[player.pos] || 0) < targetCount(player.pos)) {
    reasons.push(`Roster construction: ${player.pos} remains a need with ${counts[player.pos] || 0} currently rostered.`);
  } else {
    reasons.push(`Roster construction: this is a depth-and-upside pick rather than an immediate lineup repair.`);
  }
  const samePosition = available().filter(p => p.pos === player.pos).sort((a, b) => Number(b.proj || 0) - Number(a.proj || 0));
  const next = samePosition.find(p => normalize(p.name) !== normalize(player.name));
  if (next) {
    const gap = Math.round(Number(player.proj || 0) - Number(next.proj || 0));
    reasons.push(gap > 4 ? `Tier pressure: a ${gap}-point projection drop follows at ${player.pos}.` : `Tier shape: comparable ${player.pos} value remains, so price discipline still matters.`);
  }
  reasons.push(player.risk === 'Low' ? 'Profile: dependable role and projection create a sturdy weekly floor.' : `${player.risk}-risk profile: the ceiling is useful, but the pick needs to be made at the right price.`);
  return reasons.slice(0, 3);
}
function compareButton(player) {
  const selected = state.compare.some(name => normalize(name) === normalize(player.name));
  return `<button class="compare-btn ${selected ? 'selected' : ''}" data-compare="${encodeURIComponent(player.name)}">${selected ? 'Selected' : 'Compare'}</button>`;
}

function playerCard(player, index, compact = false) {
  const injury = injuryLabel(player);
  return `<article class="${compact ? 'mini-player' : 'player-card'}" data-player="${encodeURIComponent(player.name)}" role="button" tabindex="0" aria-label="View ${escapeHtml(player.name)}">
    <div class="rank">${index + 1}</div>${playerPhoto(player, compact ? 'player-photo small' : 'player-photo')}
    <div class="player-copy"><div class="player-title-line"><div class="player-name">${escapeHtml(player.name)}</div>${injury !== 'Healthy' ? `<span class="injury-badge">${escapeHtml(injury)}</span>` : ''}</div><div class="player-meta">${escapeHtml(player.team)} · ${escapeHtml(player.pos)} · ${escapeHtml(player.tier)} tier</div>${compact ? '' : `<div class="player-signal">#${player.posRank || '—'} ${player.pos} <span>•</span> ${Math.round(player.proj)} pts <span>•</span> ${escapeHtml(player.risk)} risk</div>`}</div>
    <div class="score projection"><strong>${Number(player.score).toFixed(1)}</strong><span>BOARD</span></div>
    ${compact ? '' : compareButton(player)}
    <button class="draft-btn" data-draft="${encodeURIComponent(player.name)}" aria-label="Draft ${escapeHtml(player.name)}">${compact ? '+' : 'Draft'}</button>
  </article>`;
}

function renderRecommendation(list) {
  const player = list[0];
  const element = document.getElementById('recommend');
  if (!player) { element.innerHTML = '<div class="empty">Draft complete.</div>'; return; }
  const strength = recommendationStrength(player);
  const market = marketInfo(player);
  const impact = rosterImpactLabel(player);
  const pressure = positionPressure(player.pos).length;
  element.innerHTML = `<div class="front-office-player" data-player="${encodeURIComponent(player.name)}" role="button" tabindex="0">
      <div class="player-stage">${playerPhoto(player, 'player-photo hero-photo')}<span class="position-tag">${escapeHtml(player.pos)}</span></div>
      <div class="player-decision-copy"><span class="decision-label ${strength.label.toLowerCase().replace(/\s+/g,'-')}">${strength.label}</span><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.team)} · ${escapeHtml(microTier(player))}</p>
      <div class="decision-facts"><span><b>${Math.round(player.proj)}</b> projected pts</span><span><b>#${player.posRank || '—'}</b> position rank</span><span><b>${escapeHtml(impact)}</b> roster impact</span></div></div>
    </div>
    <div class="analyst-take premium"><span class="eyebrow">GOOSE'S CALL</span><p>${escapeHtml(analystTake(player))}</p></div>
    <div class="why-now-grid"><div><span>WHY NOW</span><b>${pressure ? `${pressure} teams ahead show ${player.pos} pressure` : 'Draft room is flexible'}</b></div><div><span>MARKET</span><b>${market?.adp ? `ADP ${Number(market.adp).toFixed(1)}` : 'Awaiting FP feed'}</b></div><div><span>RISK</span><b>${escapeHtml(player.risk)}</b></div></div>
    <div class="actions"><button class="btn primary" data-draft="${encodeURIComponent(player.name)}">Draft ${escapeHtml(player.name)}</button>${compareButton(player)}<button class="btn secondary" data-jump="board">See Full Board</button></div>`;
}
function openPlayerDetails(name) {
  const player = playerByName(name); if (!player) return;
  const status = playerStatus(player);
  const reasons = recommendationReasons(player).map(reason => `<li>${escapeHtml(reason)}</li>`).join('');
  const market = marketInfo(player);
  const intel = intelFor(player).map(line => `<div class="news-item"><span class="news-dot"></span><div><b>PLAYER INTEL</b><p>${escapeHtml(line)}</p></div></div>`).join('');
  const marketNews = (market?.news || []).slice(0, 2).map(item => `<div class="news-item"><span class="news-dot"></span><div><b>FANTASYPROS · ${escapeHtml(item.category || 'NEWS')}</b><p>${escapeHtml(item.title)}</p></div></div>`).join('');
  document.getElementById('playerModalContent').innerHTML = `<div class="player-profile-head">${playerPhoto(player, 'player-photo profile-photo')}<div><span class="position-tag">${escapeHtml(player.pos)}</span><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.team)} · ${escapeHtml(player.tier)} tier</p></div></div>
    <div class="status-banner ${status.key}"><b>${status.label}</b>${status.owner ? `<span>${escapeHtml(status.owner)}</span>` : `<span class="health-chip ${injuryLabel(player) === 'Healthy' ? 'healthy' : 'alert'}">${escapeHtml(injuryLabel(player))}</span>`}</div>
    <div class="analyst-take"><span class="eyebrow">GOOSE'S TAKE</span><p>${escapeHtml(analystTake(player))}</p></div>
    <div class="detail-grid"><div><span>Projection</span><b>${Math.round(player.proj)}</b></div><div><span>FP ADP</span><b>${market?.adp ? Number(market.adp).toFixed(1) : '—'}</b></div><div><span>FP ECR</span><b>${market?.ecr ? `#${market.ecr}` : '—'}</b></div><div><span>Board Score</span><b>${player.score}</b></div><div><span>Tier Left</span><b>${tierCount(player)}</b></div><div><span>Risk</span><b>${escapeHtml(player.risk)}</b></div></div>
    <section class="news-panel"><div class="section-title"><span class="eyebrow">PLAYER NEWS & INTEL</span><span>${marketDataStatus === 'live' ? 'FantasyPros + Sleeper' : 'Sleeper + Board evaluation'}</span></div>${marketNews || ''}${intel}</section>
    <div class="why-block"><h3>Draft-room evaluation</h3><ul>${reasons}</ul></div>
    <div class="modal-actions">${compareButton(player)}${status.draftable ? `<button class="btn primary" data-draft="${encodeURIComponent(player.name)}">Draft ${escapeHtml(player.name)}</button>` : ''}</div>`;
  openModal('playerModal');
}
function toggleCompare(name) {
  const canonical = playerByName(name)?.name; if (!canonical) return;
  const existing = state.compare.findIndex(item => normalize(item) === normalize(canonical));
  if (existing >= 0) state.compare.splice(existing, 1);
  else if (state.compare.length < 2) state.compare.push(canonical);
  else { state.compare.shift(); state.compare.push(canonical); showToast('Replaced the oldest comparison player'); }
  save(); renderCompareTray(); renderBoard(); renderDatabase();
  if (state.compare.length === 2) openComparison();
}

function comparisonScore(player) {
  return Number(player.score || 0) + rosterNeedScore(player) - (player.risk === 'High' ? 4 : player.risk === 'Medium' ? 2 : 0);
}

function comparisonWinner(a, b) {
  const diff = comparisonScore(a) - comparisonScore(b);
  return Math.abs(diff) < 1.5 ? null : diff > 0 ? a : b;
}

function openComparison() {
  const [a, b] = state.compare.map(playerByName).filter(Boolean); if (!a || !b) return;
  const winner = comparisonWinner(a, b);
  const edge = Math.abs(comparisonScore(a) - comparisonScore(b));
  const row = (label, left, right, prefer = 'high') => {
    const ln = Number(left), rn = Number(right);
    const lwin = Number.isFinite(ln) && Number.isFinite(rn) && (prefer === 'high' ? ln > rn : ln < rn);
    const rwin = Number.isFinite(ln) && Number.isFinite(rn) && (prefer === 'high' ? rn > ln : rn < ln);
    return `<div class="compare-row"><span class="${lwin ? 'edge' : ''}">${escapeHtml(left)}${lwin ? ' ✓' : ''}</span><b>${label}</b><span class="${rwin ? 'edge' : ''}">${escapeHtml(right)}${rwin ? ' ✓' : ''}</span></div>`;
  };
  const statusA = playerStatus(a), statusB = playerStatus(b);
  const verdictTitle = winner ? `${edge > 12 ? 'Strong edge' : edge > 5 ? 'Moderate edge' : 'Slight edge'}: ${winner.name}` : 'No forced pick here';
  const verdictText = winner ? `${winner.name} is the better selection right now after combining production, roster need, risk, and position scarcity.` : 'The grades are nearly even. Let positional need and the chance each player survives to your next pick break the tie.';
  document.getElementById('compareModalContent').innerHTML = `<span class="eyebrow">WAR ROOM COMPARISON</span><div class="compare-head"><div>${playerPhoto(a, 'player-photo compare-photo')}<span class="position-tag">${a.pos}</span><h2>${escapeHtml(a.name)}</h2><p>${a.team} · ${statusA.label}</p></div><div class="versus">VS</div><div>${playerPhoto(b, 'player-photo compare-photo')}<span class="position-tag">${b.pos}</span><h2>${escapeHtml(b.name)}</h2><p>${b.team} · ${statusB.label}</p></div></div>
    <div class="overall-edge"><span>OVERALL EDGE</span><strong>${winner ? escapeHtml(winner.name) : 'EVEN'}</strong><small>${winner ? `${edge > 12 ? 'Strong' : edge > 5 ? 'Moderate' : 'Slight'} recommendation advantage` : 'No meaningful separation'}</small></div>
    <div class="compare-table">${row('Projection', Math.round(a.proj), Math.round(b.proj))}${row('Position Rank', a.posRank || '—', b.posRank || '—', 'low')}${row('Risk', a.risk, b.risk)}${row('Roster Impact', rosterImpactLabel(a), rosterImpactLabel(b))}</div>
    <div class="draft-impact-grid"><div><span class="eyebrow">IF YOU DRAFT ${escapeHtml(a.name).toUpperCase()}</span><p>${escapeHtml(strategicProfile(a))}</p><b>${tierCount(a)} comparable ${a.pos} option${tierCount(a) === 1 ? '' : 's'} remain in tier</b></div><div><span class="eyebrow">IF YOU DRAFT ${escapeHtml(b.name).toUpperCase()}</span><p>${escapeHtml(strategicProfile(b))}</p><b>${tierCount(b)} comparable ${b.pos} option${tierCount(b) === 1 ? '' : 's'} remain in tier</b></div></div>
    <div class="verdict"><span class="eyebrow">THE BOARD VERDICT</span><h3>${escapeHtml(verdictTitle)}</h3><p>${escapeHtml(verdictText)}</p></div>
    <div class="modal-actions"><button class="btn secondary" data-clear-compare>Clear</button>${statusA.draftable ? `<button class="btn primary" data-draft="${encodeURIComponent(a.name)}">Draft ${escapeHtml(a.name)}</button>` : ''}${statusB.draftable ? `<button class="btn primary" data-draft="${encodeURIComponent(b.name)}">Draft ${escapeHtml(b.name)}</button>` : ''}</div>`;
  openModal('compareModal');
}

function renderCompareTray() {
  const tray = document.getElementById('compareTray');
  if (!state.compare.length) { tray.hidden = true; return; }
  tray.hidden = false;
  tray.innerHTML = `<div><span class="eyebrow">WAR ROOM COMPARE</span><b>${state.compare.map(escapeHtml).join(' vs. ')}</b></div><div class="tray-actions">${state.compare.length === 2 ? '<button class="btn primary compact" data-open-compare>Compare Now</button>' : '<span class="muted">Choose one more</span>'}<button class="btn secondary compact" data-clear-compare>Clear</button></div>`;
}


function rosterImpactLabel(player, team = 'The Butcher') {
  const counts = positionCounts(team);
  if (player.pos === 'QB' && (counts.QB || 0) < 2) return 'Immediate starter';
  if ((counts[player.pos] || 0) < targetCount(player.pos)) return 'Roster-building need';
  if ((counts[player.pos] || 0) === targetCount(player.pos)) return 'Premium depth';
  return 'Luxury selection';
}

function microTier(player) {
  const rank = Number(player.posRank || 99);
  const pos = player.pos;
  if (pos === 'QB') {
    if (rank <= 4) return 'QB1A · Difference-maker';
    if (rank <= 9) return 'QB1B · High-end starter';
    if (rank <= 15) return 'QB2A · Strong weekly QB2';
    if (rank <= 22) return 'QB2B · Viable starter';
    if (rank <= 30) return 'QB3 · Upside/depth';
    return 'Emergency QB depth';
  }
  if (pos === 'RB') {
    if (rank <= 8) return 'RB1A · Foundation back';
    if (rank <= 16) return 'RB1B · Weekly starter';
    if (rank <= 28) return 'RB2 · Flex starter';
    if (rank <= 42) return 'RB3 · Upside depth';
    return 'RB stash';
  }
  if (pos === 'WR') {
    if (rank <= 10) return 'WR1A · Target hog';
    if (rank <= 22) return 'WR1B · Weekly starter';
    if (rank <= 36) return 'WR2 · Flex starter';
    if (rank <= 52) return 'WR3 · Upside depth';
    return 'WR stash';
  }
  if (pos === 'TE') {
    if (rank <= 4) return 'TE1A · Weekly separator';
    if (rank <= 10) return 'TE1B · Locked starter';
    if (rank <= 18) return 'TE2 · Matchup value';
    return 'TE depth';
  }
  return `${pos} target tier`;
}

function strategicProfile(player) {
  const market = marketInfo(player);
  const live = liveInfo(player);
  const rank = Number(player.posRank || 99);
  const name = player.name;
  const traits = [];
  if (player.pos === 'QB') {
    if (rank <= 5) traits.push(`${name} brings week-winning quarterback upside rather than merely filling QB2.`);
    else if (rank <= 12) traits.push(`${name} offers the kind of bankable weekly volume that stabilizes a 2QB lineup.`);
    else if (rank <= 22) traits.push(`${name} is a price-sensitive QB2: usable every week, but not someone to force ahead of a better tier.`);
    else traits.push(`${name} belongs in the QB3 conversation, not as the answer to your second starting spot.`);
  } else if (player.pos === 'RB') {
    if (rank <= 12) traits.push(`${name} profiles as a lineup-driving back with enough workload equity to matter every Sunday.`);
    else if (rank <= 28) traits.push(`${name} is a flex-caliber back whose value depends on receiving work, touchdown access and role stability.`);
    else traits.push(`${name} is an upside bench bet; the path to touches matters more than the raw projection.`);
  } else if (player.pos === 'WR') {
    if (rank <= 18) traits.push(`${name} can change the weekly ceiling of the lineup through target volume and explosive-play access.`);
    else if (rank <= 40) traits.push(`${name} fits as a flex/WR depth target, but quarterback quality and route volume must justify the price.`);
    else traits.push(`${name} is a bench swing whose breakout case needs a clear role-expansion story.`);
  } else if (player.pos === 'TE') {
    traits.push(rank <= 8 ? `${name} can create a weekly positional edge instead of forcing you into the streaming pile.` : `${name} is depth insurance; the role has to be clear enough to justify carrying a second tight end.`);
  } else {
    traits.push(`${name} has value only when the price creates a real weekly scoring edge in this league's custom format.`);
  }
  if (market?.adp) traits.push(`The current market price is around pick ${Number(market.adp).toFixed(1)}, giving us a real cost benchmark.`);
  if (live?.injury_status) traits.push(`${live.injury_status} is an active risk flag and should lower the price, not be ignored.`);
  else if (player.risk === 'Low') traits.push('The role and availability profile support a dependable floor.');
  else if (player.risk === 'High') traits.push('The upside is real, but the path contains enough volatility that cost discipline matters.');
  return traits.join(' ');
}

function pickDistanceToTeam(teamName = 'The Butcher') {
  const start = state.drafted.length;
  for (let i = start + 1; i < start + 30; i += 1) if (draftOrderAt(i) === teamName) return i - start;
  return 10;
}

function teamsBeforeNextPick() {
  const distance = pickDistanceToTeam('The Butcher');
  return Array.from({ length: Math.max(0, distance - 1) }, (_, index) => draftOrderAt(state.drafted.length + index + 1));
}

function positionPressure(pos) {
  const teams = teamsBeforeNextPick();
  return teams.filter(team => {
    const counts = positionCounts(team);
    if (pos === 'QB') return (counts.QB || 0) < 2;
    return (counts[pos] || 0) < Math.min(targetCount(pos), pos === 'TE' ? 1 : 2);
  });
}


function availabilityOutlook(player) {
  const pressure = positionPressure(player.pos).length;
  const positionRankAmongAvailable = ranked().filter(p => p.pos === player.pos).findIndex(p => normalize(p.name) === normalize(player.name)) + 1;
  if (pressure >= 3 && positionRankAmongAvailable <= 3) return { label: 'HIGH PICK RISK', detail: 'Multiple teams ahead can remove this option.' };
  if (pressure >= 1 && positionRankAmongAvailable <= 5) return { label: 'WATCH CLOSELY', detail: 'This player sits inside an active positional window.' };
  return { label: 'ROOM TO WAIT', detail: 'Current roster pressure does not force the pick yet.' };
}

function teamNeedLabels(team) {
  const counts = positionCounts(team);
  const needs = [];
  if ((counts.QB || 0) < 2) needs.push('QB2');
  if ((counts.RB || 0) < 3) needs.push('RB');
  if ((counts.WR || 0) < 3) needs.push('WR');
  if ((counts.TE || 0) < 1) needs.push('TE');
  if ((counts.K || 0) < 1) needs.push('K');
  if ((counts.DEF || 0) < 1) needs.push('DEF');
  return needs;
}

function blueprintStatus(step, index) {
  const butcherPicks = state.drafted.filter(p => p.draftedBy === 'The Butcher');
  const round = butcherPicks.length + 1;
  const counts = positionCounts('The Butcher');
  if (index === 0 && (counts.QB || 0) >= 2) return 'complete';
  if (index === 1 && ((counts.RB || 0) + (counts.WR || 0)) >= 6) return 'complete';
  if (index === 2 && (counts.QB || 0) >= 3) return 'complete';
  if (index === 3 && (counts.TE || 0) >= 2) return 'complete';
  if (index === 4 && (counts.K || 0) >= 1) return 'complete';
  if (index === 5 && (counts.DEF || 0) >= 1) return 'complete';
  const windows = [[1,1],[2,4],[5,5],[6,6],[7,7],[8,8],[9,11]];
  const [start,end] = windows[index];
  if (round >= start && round <= end) return 'active';
  if (round > end) return 'missed';
  return 'upcoming';
}

function wishlistCandidates(pos) {
  const configured = (POSITION_WISHLISTS[pos] || []).map(playerByName).filter(Boolean).filter(p => playerStatus(p).draftable);
  const fallbacks = ranked().filter(p => p.pos === pos && !configured.some(c => normalize(c.name) === normalize(p.name)));
  return [...configured, ...fallbacks].slice(0, 5);
}

function renderRosterSummary() {
  const counts = positionCounts('The Butcher');
  const positions = ['QB','RB','WR','TE','K','DEF'];
  document.getElementById('rosterSummary').innerHTML = positions.map(pos => {
    const have = counts[pos] || 0;
    const need = targetCount(pos);
    const stateLabel = pos === 'QB' && have < 2 ? 'Critical' : have >= need ? 'Complete' : have >= Math.max(1, need - 1) ? 'Stable' : 'Needs work';
    return `<div class="metric-card roster-metric ${stateLabel.toLowerCase().replace(' ','-')}"><span>${pos}</span><b>${have}/${need}</b><small>${stateLabel}</small></div>`;
  }).join('');
}

function renderBlueprint() {
  const counts = positionCounts('The Butcher');
  const items = [
    ['PRIMARY OBJECTIVE', (counts.QB || 0) < 2 ? 'Secure a trustworthy QB2 before the reliable starter tier dries up.' : 'QB2 secured. Shift capital toward RB/WR firepower.'],
    ['SECONDARY OBJECTIVES', 'Build the flex through high-volume WRs and pass-catching backs; add a tradeable QB3 in the middle rounds.'],
    ['AVOID', 'Full-price injury risk, committee backs without receiving work, and receivers attached to unstable quarterback play.'],
    ['LATE TARGETS', 'Premium kicker, difference-making defense, direct handcuffs and rookies with a real path to weekly work.'],
    ['EMERGENCY PLAN', 'If the QB tier collapses, take the best remaining starter immediately and recover value at RB/WR on the next turn.']
  ];
  document.getElementById('draftBlueprint').innerHTML = items.map(([label,text],index) => `<div class="philosophy-item ${index===0?'primary':''}"><span>${label}</span><p>${text}</p></div>`).join('');
}

function renderPositionTargets() {
  const groups = ['QB','RB','WR','TE','K','DEF'];
  const labels = ['DREAM','LIKELY','VALUE','SLEEPER','LOTTERY'];
  document.getElementById('positionTargets').innerHTML = groups.map(pos => {
    const candidates = wishlistCandidates(pos);
    if (!candidates.length) return '';
    const pressure = positionPressure(pos).length;
    const rows = candidates.map((p,i) => `<button class="wishlist-row" data-player="${encodeURIComponent(p.name)}"><span class="wishlist-type">${labels[i] || 'TARGET'}</span>${playerPhoto(p,'player-photo tiny')}<div><b>${escapeHtml(p.name)}</b><small>${escapeHtml(microTier(p))}</small></div></button>`).join('');
    return `<div class="wishlist-group"><div class="wishlist-head"><b>${pos}</b><span>${pressure ? `${pressure} teams ahead may need ${pos}` : 'Low immediate pressure'}</span></div>${rows}</div>`;
  }).join('');
}

function renderDraftPressure() {
  const teams = teamsBeforeNextPick();
  const rows = teams.map((team,index) => {
    const needs = teamNeedLabels(team);
    const primary = needs[0] || 'VALUE';
    return `<div class="threat-row"><span class="pick-order">${state.drafted.length + index + 2}</span><div><b>${escapeHtml(team)}</b><small>${needs.length ? `Needs: ${needs.join(' · ')}` : 'Can draft pure value'}</small></div><span class="threat-chip ${primary==='QB2'?'hot':''}">${primary}</span></div>`;
  }).join('');
  const qbThreats = teams.filter(t => teamNeedLabels(t).includes('QB2')).length;
  document.getElementById('draftPressure').innerHTML = `<div class="threat-summary"><span>THREAT LEVEL</span><b>${qbThreats >= 3 ? 'HIGH' : qbThreats ? 'ACTIVE' : 'LOW'}</b><p>${qbThreats ? `${qbThreats} teams before your next turn still need a second quarterback.` : 'No immediate QB2 pressure before your next turn.'}</p></div><div class="opponent-board">${rows || '<div class="target-empty">You are on the clock.</div>'}</div>`;
}

function renderGooseThinking(list) {
  const player = list[0];
  const teams = teamsBeforeNextPick();
  const qbThreats = teams.filter(t => teamNeedLabels(t).includes('QB2')).length;
  const counts = positionCounts('The Butcher');
  let copy = '';
  if (!player) copy = 'The draft is complete. Time to grade the room.';
  else if ((counts.QB || 0) < 2 && player.pos === 'QB') copy = `${player.name} solves the only open starting slot. ${qbThreats ? `${qbThreats} quarterback-needy teams pick before your next turn, so waiting carries real downside.` : 'The room is not forcing panic, but the tier still matters more than raw ADP.'}`;
  else copy = `${player.name} is the best current fit, but I am watching the next tier more than the headline projection. The goal is to improve the starting lineup without paying for risk we can buy later.`;
  document.getElementById('gooseThinking').innerHTML = `<p>${escapeHtml(copy)}</p><div class="goose-actions">${player ? `<button class="text-btn" data-player="${encodeURIComponent(player.name)}">Open dossier</button>` : ''}<button class="text-btn" data-jump="board">Challenge the call</button></div>`;
}

function renderRoster() {
  document.getElementById('myRoster').innerHTML = rosterFor('The Butcher').map(player => `<div class="roster-row"><b>${escapeHtml(player.pos)}</b><span>${escapeHtml(player.name)}</span><span class="keeper-label">${player.keeper ? 'KEEPER' : `PICK ${player.pick}`}</span></div>`).join('');
}

function renderBoard() {
  const query = document.getElementById('boardSearch').value.toLowerCase();
  const position = document.getElementById('boardPos').value;
  const players = ranked().filter(player => (position === 'ALL' || player.pos === position) && `${player.name} ${player.team}`.toLowerCase().includes(query)).slice(0, 75);
  document.getElementById('availableCount').textContent = `${available().length} available`;
  document.getElementById('boardTable').innerHTML = players.length ? players.map((player, index) => playerCard(player, index)).join('') : '<div class="empty">No players found.</div>';
}

function databaseCard(player) {
  const status = playerStatus(player);
  return `<div class="database-player" data-player="${encodeURIComponent(player.name)}">${playerPhoto(player, 'player-photo small')}<div><div class="player-name">${escapeHtml(player.name)}</div><div class="player-meta">${player.team} · ${player.pos} · #${player.posRank || '—'} · ${Math.round(player.proj)} pts</div></div><span class="status-chip ${status.key}">${status.label}${status.owner ? ` · ${escapeHtml(status.owner)}` : ''}</span>${compareButton(player)}${status.draftable ? `<button class="draft-btn" data-draft="${encodeURIComponent(player.name)}">Draft</button>` : ''}</div>`;
}

function renderDatabase() {
  const query = document.getElementById('databaseSearch').value.toLowerCase();
  const position = document.getElementById('databasePos').value;
  const statusFilter = document.getElementById('databaseStatus').value;
  const players = MASTER_PLAYERS.filter(player => {
    const status = playerStatus(player);
    return (position === 'ALL' || player.pos === position) && (statusFilter === 'ALL' || status.key === statusFilter) && `${player.name} ${player.team} ${status.owner || ''}`.toLowerCase().includes(query);
  }).sort((a, b) => Number(a.butcherRank || 9999) - Number(b.butcherRank || 9999));
  document.getElementById('databaseCount').textContent = `${players.length} players`;
  document.getElementById('databaseList').innerHTML = players.length ? players.map(databaseCard).join('') : '<div class="empty">No players found.</div>';
}

function renderLeague() {
  document.getElementById('rosters').innerHTML = state.teams.map(team => {
    const keepers = KEEPERS[team] || []; const drafted = state.drafted.filter(player => player.draftedBy === team);
    return `<div class="team-card ${team === 'The Butcher' ? 'me' : ''}"><h3>${escapeHtml(team)}</h3>${keepers.map(name => { const p = playerByName(name); return `<div class="team-player" data-player="${encodeURIComponent(canonicalName(name))}"><span>${escapeHtml(canonicalName(name))}</span><b>${escapeHtml(p?.pos || '')} K</b></div>`; }).join('')}${drafted.map(player => `<div class="team-player" data-player="${encodeURIComponent(player.name)}"><span>${escapeHtml(player.name)}</span><b>${escapeHtml(player.pos)} #${player.pick}</b></div>`).join('')}</div>`;
  }).join('');
}

function renderHistory() {
  document.getElementById('draftHistory').innerHTML = state.drafted.length ? state.drafted.map(player => `<div class="history-row" data-player="${encodeURIComponent(player.name)}" role="button" tabindex="0"><b>#${player.pick}</b><span><strong>${escapeHtml(player.name)}</strong><br><small class="muted">${escapeHtml(player.pos)} · ${escapeHtml(player.team)}</small></span><span>${escapeHtml(player.draftedBy)}</span></div>`).join('') : '<div class="empty">No picks yet.</div>';
  document.getElementById('undoBtn').disabled = state.drafted.length === 0; document.getElementById('quickUndoBtn').disabled = state.drafted.length === 0;
}

function render() {
  const pick = state.drafted.length + 1; const list = ranked();
  document.getElementById('clockTeam').textContent = currentTeam(); document.getElementById('clockPick').textContent = `Round ${Math.ceil(pick / 10)} · Pick ${pick}`; document.getElementById('pickBadge').textContent = pick; document.getElementById('versionLabel').textContent = `v${APP_VERSION}`;
  renderRecommendation(list); renderGooseThinking(list); document.getElementById('nextFive').innerHTML = list.slice(1, 5).map((player, index) => playerCard(player, index, true)).join('');
  renderRosterSummary(); renderBlueprint(); renderPositionTargets(); renderDraftPressure(); renderRoster(); renderBoard(); renderDatabase(); renderLeague(); renderHistory(); renderCompareTray();
}

function populateSlots() { const select = document.getElementById('slotSelect'); select.innerHTML = Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join(''); select.value = state.slot; }
function openSettings() { populateSlots(); openModal('settingsModal'); }
function applySlot() { const slot = Number(document.getElementById('slotSelect').value); const others = BASE_TEAMS.filter(team => team !== 'The Butcher'); others.splice(slot - 1, 0, 'The Butcher'); state.slot = slot; state.teams = others; save(); closeModal('settingsModal'); render(); showToast(`Draft slot changed to ${slot}`); }

document.addEventListener('click', event => {
  const draft = event.target.closest('[data-draft]'); if (draft) { event.stopPropagation(); requestDraft(decodeURIComponent(draft.dataset.draft)); return; }
  const compare = event.target.closest('[data-compare]'); if (compare) { event.stopPropagation(); toggleCompare(decodeURIComponent(compare.dataset.compare)); return; }
  if (event.target.closest('[data-open-compare]')) { openComparison(); return; }
  if (event.target.closest('[data-clear-compare]')) { state.compare = []; save(); closeModal('compareModal'); render(); return; }
  const player = event.target.closest('[data-player]'); if (player) { openPlayerDetails(decodeURIComponent(player.dataset.player)); return; }
  const jump = event.target.closest('[data-jump]'); if (jump) { showView(jump.dataset.jump); return; }
  const tab = event.target.closest('.tab'); if (tab) showView(tab.dataset.view);
});

document.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-player]')) { event.preventDefault(); openPlayerDetails(decodeURIComponent(event.target.dataset.player)); }
  if (event.key === 'Escape') ['confirmModal', 'playerModal', 'compareModal', 'settingsModal'].forEach(closeModal);
});

['boardSearch', 'databaseSearch'].forEach(id => document.getElementById(id).addEventListener('input', id === 'boardSearch' ? renderBoard : renderDatabase));
['boardPos'].forEach(id => document.getElementById(id).addEventListener('change', renderBoard));
['databasePos', 'databaseStatus'].forEach(id => document.getElementById(id).addEventListener('change', renderDatabase));
document.getElementById('undoBtn').addEventListener('click', undo); document.getElementById('quickUndoBtn').addEventListener('click', undo); document.getElementById('settingsBtn').addEventListener('click', openSettings); document.getElementById('closeSettings').addEventListener('click', () => closeModal('settingsModal')); document.getElementById('saveSettings').addEventListener('click', applySlot); document.getElementById('cancelDraft').addEventListener('click', () => closeModal('confirmModal')); document.getElementById('confirmDraft').addEventListener('click', confirmDraft); document.getElementById('closePlayer').addEventListener('click', () => closeModal('playerModal')); document.getElementById('closeCompare').addEventListener('click', () => closeModal('compareModal'));
document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) closeModal(modal.id); }));
document.getElementById('resetBtn').addEventListener('click', () => { if (confirm('Reset every drafted player? Keepers remain.')) { state.drafted = []; save(); closeModal('settingsModal'); render(); showToast('Draft reset'); } });

render();
enrichPlayers();
enrichMarketData();
