'use strict';

const APP_VERSION = '0.3.0';
const STORAGE_KEY = 'the-board-v3';
const LEGACY_STORAGE_KEYS = ['the-board-v2', 'the-board-v1'];
const NAME_CORRECTIONS = {
  'George KittleO': 'George Kittle'
};
const defaultState = { drafted: [], slot: 8, teams: [...BASE_TEAMS], compare: [] };
let state = loadState();
let pendingPlayerName = null;

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
  if (player.pos === 'QB' && (counts.QB || 0) < 2) reasons.push(`You have ${counts.QB || 0} quarterback. In this 2QB league, ${escapeHtml(player.name)} fills a starting spot.`);
  else if ((counts[player.pos] || 0) < targetCount(player.pos)) reasons.push(`${player.pos} is still a roster need; you currently have ${counts[player.pos] || 0}.`);
  const samePosition = available().filter(p => p.pos === player.pos).sort((a, b) => Number(b.proj || 0) - Number(a.proj || 0));
  const next = samePosition.find(p => normalize(p.name) !== normalize(player.name));
  if (next) {
    const gap = Math.max(0, Math.round(player.proj - next.proj));
    reasons.push(gap > 0 ? `${gap}-point projection edge over the next available ${player.pos}.` : `Near the top of the remaining ${player.pos} tier.`);
  }
  reasons.push(player.risk === 'Low' ? 'Low-risk profile fits your preference for dependable players.' : `${escapeHtml(player.risk)} risk lowers confidence and should affect the price.`);
  return reasons.slice(0, 3);
}

function compareButton(player) {
  const selected = state.compare.some(name => normalize(name) === normalize(player.name));
  return `<button class="compare-btn ${selected ? 'selected' : ''}" data-compare="${encodeURIComponent(player.name)}">${selected ? 'Selected' : 'Compare'}</button>`;
}

function playerCard(player, index, compact = false) {
  return `<div class="${compact ? 'mini-player' : 'player-card'}" data-player="${encodeURIComponent(player.name)}" role="button" tabindex="0" aria-label="View ${escapeHtml(player.name)}">
    <div class="rank">${index + 1}</div>
    <div><div class="player-name">${escapeHtml(player.name)}</div><div class="player-meta">${escapeHtml(player.team)} · ${escapeHtml(player.pos)} · ${escapeHtml(player.tier)}</div></div>
    <div class="score projection">${Math.round(player.proj)}</div>
    ${compact ? '' : compareButton(player)}
    <button class="draft-btn" data-draft="${encodeURIComponent(player.name)}" aria-label="Draft ${escapeHtml(player.name)}">${compact ? '+' : 'Draft'}</button>
  </div>`;
}

function renderRecommendation(list) {
  const player = list[0];
  const element = document.getElementById('recommend');
  if (!player) { element.innerHTML = '<div class="empty">Draft complete.</div>'; return; }
  const reasons = recommendationReasons(player).map(reason => `<li>${reason}</li>`).join('');
  element.innerHTML = `<div class="hero" data-player="${encodeURIComponent(player.name)}" role="button" tabindex="0"><div class="pos-badge">${escapeHtml(player.pos)}</div><div><h2>${escapeHtml(player.name)}</h2><div class="muted">${escapeHtml(player.team)} · ${escapeHtml(player.tier)} tier</div></div></div>
    <div class="metrics"><div class="metric"><b>${player.score}</b><span>BOARD SCORE</span></div><div class="metric"><b>${Math.round(player.proj)}</b><span>PROJECTED PTS</span></div><div class="metric"><b>${escapeHtml(player.fit)}</b><span>BUTCHER FIT</span></div><div class="metric"><b>${escapeHtml(player.risk)}</b><span>RISK</span></div></div>
    <div class="why-block"><h3>Why he's on the board</h3><ul>${reasons}</ul></div>
    <div class="actions"><button class="btn primary" data-draft="${encodeURIComponent(player.name)}">Draft ${escapeHtml(player.name)}</button>${compareButton(player)}<button class="btn secondary" data-jump="board">View Board</button></div>`;
}

function openPlayerDetails(name) {
  const player = playerByName(name); if (!player) return;
  const status = playerStatus(player);
  const reasons = recommendationReasons(player).map(reason => `<li>${reason}</li>`).join('');
  document.getElementById('playerModalContent').innerHTML = `<div class="detail-head"><div class="pos-badge">${escapeHtml(player.pos)}</div><div><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.team)} · ${escapeHtml(player.tier)} tier</p></div></div>
    <div class="status-banner ${status.key}"><b>${status.label}</b>${status.owner ? `<span>${escapeHtml(status.owner)}</span>` : ''}</div>
    <div class="detail-grid"><div><span>Projection</span><b>${Math.round(player.proj)}</b></div><div><span>Position Rank</span><b>#${player.posRank || '—'}</b></div><div><span>Board Score</span><b>${player.score}</b></div><div><span>Butcher Fit</span><b>${escapeHtml(player.fit)}</b></div><div><span>Risk</span><b>${escapeHtml(player.risk)}</b></div><div><span>Rostered</span><b>${Number(player.rost || 0).toFixed(1)}%</b></div></div>
    <div class="why-block"><h3>Current evaluation</h3><ul>${reasons}</ul></div>
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

function comparisonWinner(a, b) {
  const scoreA = Number(a.score || 0) + rosterNeedScore(a) - (a.risk === 'High' ? 4 : a.risk === 'Medium' ? 2 : 0);
  const scoreB = Number(b.score || 0) + rosterNeedScore(b) - (b.risk === 'High' ? 4 : b.risk === 'Medium' ? 2 : 0);
  if (Math.abs(scoreA - scoreB) < 1.5) return null;
  return scoreA > scoreB ? a : b;
}

function openComparison() {
  const [a, b] = state.compare.map(playerByName).filter(Boolean); if (!a || !b) return;
  const winner = comparisonWinner(a, b);
  const row = (label, left, right, prefer = 'high') => {
    const ln = Number(left), rn = Number(right);
    const lwin = Number.isFinite(ln) && Number.isFinite(rn) && (prefer === 'high' ? ln > rn : ln < rn);
    const rwin = Number.isFinite(ln) && Number.isFinite(rn) && (prefer === 'high' ? rn > ln : rn < ln);
    return `<div class="compare-row"><span>${escapeHtml(left)}${lwin ? ' ✓' : ''}</span><b>${label}</b><span>${escapeHtml(right)}${rwin ? ' ✓' : ''}</span></div>`;
  };
  const statusA = playerStatus(a), statusB = playerStatus(b);
  document.getElementById('compareModalContent').innerHTML = `<span class="eyebrow">PLAYER COMPARISON</span><div class="compare-head"><div><div class="pos-badge">${a.pos}</div><h2>${escapeHtml(a.name)}</h2><p>${a.team} · ${statusA.label}</p></div><div class="versus">VS</div><div><div class="pos-badge">${b.pos}</div><h2>${escapeHtml(b.name)}</h2><p>${b.team} · ${statusB.label}</p></div></div>
    <div class="compare-table">${row('Projection', Math.round(a.proj), Math.round(b.proj))}${row('Position Rank', a.posRank || '—', b.posRank || '—', 'low')}${row('Board Score', a.score, b.score)}${row('Risk', a.risk, b.risk)}${row('Butcher Fit', a.fit, b.fit)}</div>
    <div class="verdict"><span class="eyebrow">THE BOARD VERDICT</span><h3>${winner ? `${escapeHtml(winner.name)} has the edge` : 'This is a roster-context decision'}</h3><p>${winner ? `${escapeHtml(winner.name)} grades better after combining board score, your current roster need, and risk.` : 'Their grades are close. Use positional need and how long each player is likely to remain available as the tiebreaker.'}</p></div>
    <div class="modal-actions"><button class="btn secondary" data-clear-compare>Clear</button>${statusA.draftable ? `<button class="btn primary" data-draft="${encodeURIComponent(a.name)}">Draft ${escapeHtml(a.name)}</button>` : ''}${statusB.draftable ? `<button class="btn primary" data-draft="${encodeURIComponent(b.name)}">Draft ${escapeHtml(b.name)}</button>` : ''}</div>`;
  openModal('compareModal');
}

function renderCompareTray() {
  const tray = document.getElementById('compareTray');
  if (!state.compare.length) { tray.hidden = true; return; }
  tray.hidden = false;
  tray.innerHTML = `<div><span class="eyebrow">COMPARE</span><b>${state.compare.map(escapeHtml).join(' vs. ')}</b></div><div class="tray-actions">${state.compare.length === 2 ? '<button class="btn primary compact" data-open-compare>Compare Now</button>' : '<span class="muted">Choose one more</span>'}<button class="btn secondary compact" data-clear-compare>Clear</button></div>`;
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
  return `<div class="database-player" data-player="${encodeURIComponent(player.name)}"><div><div class="player-name">${escapeHtml(player.name)}</div><div class="player-meta">${player.team} · ${player.pos} · #${player.posRank || '—'} · ${Math.round(player.proj)} pts</div></div><span class="status-chip ${status.key}">${status.label}${status.owner ? ` · ${escapeHtml(status.owner)}` : ''}</span>${compareButton(player)}${status.draftable ? `<button class="draft-btn" data-draft="${encodeURIComponent(player.name)}">Draft</button>` : ''}</div>`;
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
  renderRecommendation(list); document.getElementById('nextFive').innerHTML = list.slice(1, 6).map((player, index) => playerCard(player, index + 1, true)).join('');
  renderRoster(); renderBoard(); renderDatabase(); renderLeague(); renderHistory(); renderCompareTray();
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
