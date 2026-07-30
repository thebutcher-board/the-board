'use strict';

const APP_VERSION = '0.2.0';
const STORAGE_KEY = 'the-board-v2';
const LEGACY_STORAGE_KEY = 'the-board-v1';
const keeperSet = new Set(Object.values(KEEPERS).flat().map(normalize));
const defaultState = { drafted: [], slot: 8, teams: [...BASE_TEAMS] };
let state = loadState();
let pendingPlayerName = null;

function normalize(value) {
  return String(value || '')
    .replace(/[QDO]$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
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
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (!isValidState(saved)) return structuredClone(defaultState);
    return {
      drafted: saved.drafted.filter(p => p && p.name && p.draftedBy),
      slot: Number(saved.slot),
      teams: [...saved.teams]
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

function currentTeam() {
  return draftOrderAt(state.drafted.length);
}

function available() {
  const drafted = new Set(state.drafted.map(player => normalize(player.name)));
  return PLAYERS.filter(player =>
    !keeperSet.has(normalize(player.name)) && !drafted.has(normalize(player.name))
  );
}

function rosterFor(team) {
  const keepers = (KEEPERS[team] || []).map(name => {
    const player = PLAYERS.find(p => normalize(p.name) === normalize(name));
    return { name, pos: player?.pos || '—', keeper: true };
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

function targetCount(pos) {
  return ({ QB: 3, RB: 4, WR: 5, TE: 2, K: 1, DEF: 1 })[pos] || 1;
}

function rosterNeedScore(player, team = 'The Butcher') {
  const counts = positionCounts(team);
  const target = targetCount(player.pos);
  const shortage = Math.max(0, target - (counts[player.pos] || 0));
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

function openModal(id) {
  document.getElementById(id).hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
  if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open');
}

function requestDraft(name) {
  const player = PLAYERS.find(p => p.name === name);
  if (!player || !available().some(p => p.name === name)) return;
  pendingPlayerName = name;
  const team = currentTeam();
  document.getElementById('confirmPlayer').textContent = player.name;
  document.getElementById('confirmMeta').textContent = `${player.pos} · ${player.team} · ${Math.round(player.proj)} projected points`;
  document.getElementById('confirmTeam').textContent = team;
  openModal('confirmModal');
}

function confirmDraft() {
  const player = PLAYERS.find(p => p.name === pendingPlayerName);
  if (!player || !available().some(p => p.name === pendingPlayerName)) {
    closeModal('confirmModal');
    pendingPlayerName = null;
    return;
  }
  const team = currentTeam();
  state.drafted.push({ ...player, draftedBy: team, pick: state.drafted.length + 1 });
  save();
  closeModal('confirmModal');
  pendingPlayerName = null;
  render();
  showToast(`${player.name} drafted by ${team}`);
}

function undo() {
  const player = state.drafted.pop();
  if (!player) {
    showToast('No picks to undo');
    return;
  }
  save();
  render();
  showToast(`Undid ${player.name}`);
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
    reasons.push(`You have ${counts.QB || 0} quarterback. In this 2QB league, ${escapeHtml(player.name)} fills a starting spot.`);
  } else if ((counts[player.pos] || 0) < targetCount(player.pos)) {
    reasons.push(`${player.pos} is still a roster need; you currently have ${counts[player.pos] || 0}.`);
  }

  const samePosition = available()
    .filter(p => p.pos === player.pos)
    .sort((a, b) => Number(b.proj || 0) - Number(a.proj || 0));
  const next = samePosition.find(p => p.name !== player.name);
  if (next) {
    const gap = Math.max(0, Math.round(player.proj - next.proj));
    reasons.push(gap > 0
      ? `${gap}-point projection edge over the next available ${player.pos}.`
      : `Top remaining option in his ${player.pos} tier.`);
  }

  reasons.push(player.risk === 'Low'
    ? 'Low-risk profile fits your preference for dependable players.'
    : `${escapeHtml(player.risk)} risk is acceptable at this value, but it should factor into the final call.`);

  return reasons.slice(0, 3);
}

function playerCard(player, index, compact = false) {
  return `<div class="${compact ? 'mini-player' : 'player-card'}" data-player="${encodeURIComponent(player.name)}" role="button" tabindex="0" aria-label="View ${escapeHtml(player.name)}">
    <div class="rank">${index + 1}</div>
    <div><div class="player-name">${escapeHtml(player.name)}</div><div class="player-meta">${escapeHtml(player.team)} · ${escapeHtml(player.pos)} · ${escapeHtml(player.tier)}</div></div>
    <div class="score projection">${Math.round(player.proj)}</div>
    <button class="draft-btn" data-draft="${encodeURIComponent(player.name)}" aria-label="Draft ${escapeHtml(player.name)}">${compact ? '+' : 'Draft'}</button>
  </div>`;
}

function renderRecommendation(list) {
  const player = list[0];
  const element = document.getElementById('recommend');
  if (!player) {
    element.innerHTML = '<div class="empty">Draft complete.</div>';
    return;
  }
  const reasons = recommendationReasons(player).map(reason => `<li>${reason}</li>`).join('');
  element.innerHTML = `<div class="hero" data-player="${encodeURIComponent(player.name)}" role="button" tabindex="0">
      <div class="pos-badge">${escapeHtml(player.pos)}</div>
      <div><h2>${escapeHtml(player.name)}</h2><div class="muted">${escapeHtml(player.team)} · ${escapeHtml(player.tier)} tier</div></div>
    </div>
    <div class="metrics">
      <div class="metric"><b>${player.score}</b><span>BOARD SCORE</span></div>
      <div class="metric"><b>${Math.round(player.proj)}</b><span>PROJECTED PTS</span></div>
      <div class="metric"><b>${escapeHtml(player.fit)}</b><span>BUTCHER FIT</span></div>
      <div class="metric"><b>${escapeHtml(player.risk)}</b><span>RISK</span></div>
    </div>
    <div class="why-block"><h3>Why he's on the board</h3><ul>${reasons}</ul></div>
    <div class="actions"><button class="btn primary" data-draft="${encodeURIComponent(player.name)}">Draft ${escapeHtml(player.name)}</button><button class="btn secondary" data-jump="board">View Board</button></div>`;
}

function openPlayerDetails(name) {
  const player = PLAYERS.find(p => p.name === name);
  if (!player) return;
  const availableNow = available().some(p => p.name === name);
  const reasons = recommendationReasons(player).map(reason => `<li>${reason}</li>`).join('');
  document.getElementById('playerModalContent').innerHTML = `
    <div class="detail-head"><div class="pos-badge">${escapeHtml(player.pos)}</div><div><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.team)} · ${escapeHtml(player.tier)} tier</p></div></div>
    <div class="detail-grid">
      <div><span>Projection</span><b>${Math.round(player.proj)}</b></div>
      <div><span>Position Rank</span><b>#${player.posRank || '—'}</b></div>
      <div><span>Board Score</span><b>${player.score}</b></div>
      <div><span>Butcher Fit</span><b>${escapeHtml(player.fit)}</b></div>
      <div><span>Risk</span><b>${escapeHtml(player.risk)}</b></div>
      <div><span>Rostered</span><b>${Number(player.rost || 0).toFixed(1)}%</b></div>
    </div>
    <div class="why-block"><h3>Why he's here</h3><ul>${reasons}</ul></div>
    ${availableNow ? `<button class="btn primary full" data-draft="${encodeURIComponent(player.name)}">Draft ${escapeHtml(player.name)}</button>` : '<div class="unavailable">Already drafted or kept</div>'}`;
  openModal('playerModal');
}

function renderRoster() {
  const all = rosterFor('The Butcher');
  document.getElementById('myRoster').innerHTML = all.map(player => `<div class="roster-row"><b>${escapeHtml(player.pos)}</b><span>${escapeHtml(player.name)}</span><span class="keeper-label">${player.keeper ? 'KEEPER' : `PICK ${player.pick}`}</span></div>`).join('');
}

function renderBoard() {
  const query = document.getElementById('boardSearch').value.toLowerCase();
  const position = document.getElementById('boardPos').value;
  const players = ranked().filter(player =>
    (position === 'ALL' || player.pos === position) &&
    `${player.name} ${player.team}`.toLowerCase().includes(query)
  ).slice(0, 50);
  document.getElementById('availableCount').textContent = `${available().length} available`;
  document.getElementById('boardTable').innerHTML = players.length
    ? players.map((player, index) => playerCard(player, index)).join('')
    : '<div class="empty">No players found.</div>';
}

function renderLeague() {
  document.getElementById('rosters').innerHTML = state.teams.map(team => {
    const keepers = KEEPERS[team] || [];
    const drafted = state.drafted.filter(player => player.draftedBy === team);
    return `<div class="team-card ${team === 'The Butcher' ? 'me' : ''}"><h3>${escapeHtml(team)}</h3>
      ${keepers.map(name => { const p = PLAYERS.find(player => normalize(player.name) === normalize(name)); return `<div class="team-player"><span>${escapeHtml(name)}</span><b>${escapeHtml(p?.pos || '')} K</b></div>`; }).join('')}
      ${drafted.map(player => `<div class="team-player"><span>${escapeHtml(player.name)}</span><b>${escapeHtml(player.pos)} #${player.pick}</b></div>`).join('')}</div>`;
  }).join('');
}

function renderHistory() {
  const element = document.getElementById('draftHistory');
  element.innerHTML = state.drafted.length
    ? state.drafted.map(player => `<div class="history-row" data-player="${encodeURIComponent(player.name)}" role="button" tabindex="0"><b>#${player.pick}</b><span><strong>${escapeHtml(player.name)}</strong><br><small class="muted">${escapeHtml(player.pos)} · ${escapeHtml(player.team)}</small></span><span>${escapeHtml(player.draftedBy)}</span></div>`).join('')
    : '<div class="empty">No picks yet.</div>';
  document.getElementById('undoBtn').disabled = state.drafted.length === 0;
  document.getElementById('quickUndoBtn').disabled = state.drafted.length === 0;
}

function render() {
  const pick = state.drafted.length + 1;
  const list = ranked();
  document.getElementById('clockTeam').textContent = currentTeam();
  document.getElementById('clockPick').textContent = `Round ${Math.ceil(pick / 10)} · Pick ${pick}`;
  document.getElementById('pickBadge').textContent = pick;
  document.getElementById('versionLabel').textContent = `v${APP_VERSION}`;
  renderRecommendation(list);
  document.getElementById('nextFive').innerHTML = list.slice(1, 6).map((player, index) => playerCard(player, index + 1, true)).join('');
  renderRoster();
  renderBoard();
  renderLeague();
  renderHistory();
}

function populateSlots() {
  const select = document.getElementById('slotSelect');
  select.innerHTML = Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('');
  select.value = state.slot;
}

function openSettings() {
  populateSlots();
  openModal('settingsModal');
}

function applySlot() {
  const slot = Number(document.getElementById('slotSelect').value);
  const others = BASE_TEAMS.filter(team => team !== 'The Butcher');
  others.splice(slot - 1, 0, 'The Butcher');
  state.slot = slot;
  state.teams = others;
  save();
  closeModal('settingsModal');
  render();
  showToast(`Draft slot changed to ${slot}`);
}

document.addEventListener('click', event => {
  const draft = event.target.closest('[data-draft]');
  if (draft) {
    event.stopPropagation();
    requestDraft(decodeURIComponent(draft.dataset.draft));
    return;
  }
  const player = event.target.closest('[data-player]');
  if (player) {
    openPlayerDetails(decodeURIComponent(player.dataset.player));
    return;
  }
  const jump = event.target.closest('[data-jump]');
  if (jump) {
    showView(jump.dataset.jump);
    return;
  }
  const tab = event.target.closest('.tab');
  if (tab) showView(tab.dataset.view);
});

document.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-player]')) {
    event.preventDefault();
    openPlayerDetails(decodeURIComponent(event.target.dataset.player));
  }
  if (event.key === 'Escape') {
    ['confirmModal', 'playerModal', 'settingsModal'].forEach(closeModal);
  }
});

document.getElementById('boardSearch').addEventListener('input', renderBoard);
document.getElementById('boardPos').addEventListener('change', renderBoard);
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('quickUndoBtn').addEventListener('click', undo);
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('closeSettings').addEventListener('click', () => closeModal('settingsModal'));
document.getElementById('saveSettings').addEventListener('click', applySlot);
document.getElementById('cancelDraft').addEventListener('click', () => closeModal('confirmModal'));
document.getElementById('confirmDraft').addEventListener('click', confirmDraft);
document.getElementById('closePlayer').addEventListener('click', () => closeModal('playerModal'));
document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', event => {
  if (event.target === modal) closeModal(modal.id);
}));
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset every drafted player? Keepers remain.')) {
    state.drafted = [];
    save();
    closeModal('settingsModal');
    render();
    showToast('Draft reset');
  }
});

render();
