'use strict';

const HOTFIX_VERSION = '1.3.1';
let scoutingSaveTimer = null;

function hotfixPersistState() {
  clearTimeout(scoutingSaveTimer);
  scoutingSaveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { showToast('Could not save scouting state'); }
  }, 120);
}

function hotfixSetScoutingTag(name, tag, sourceButton) {
  const player = playerByName(name); if (!player) return;
  state.scouting = state.scouting || {};
  const key = normalize(player.name);
  const nextTag = state.scouting[key] === tag ? null : tag;
  if (nextTag) state.scouting[key] = nextTag; else delete state.scouting[key];

  const row = sourceButton?.closest('[data-player-row], .board-player, .player-modal-card');
  if (row) row.querySelectorAll('[data-scout]').forEach(button => button.classList.toggle('active', nextTag && button.dataset.scout === nextTag));

  hotfixPersistState();
  showToast(nextTag ? `${player.name}: ${nextTag.replace('_', ' ')}` : `${player.name}: scouting tag cleared`);
  requestAnimationFrame(() => setTimeout(() => { renderScoutingSummary(); renderPositionTargets(); }, 0));
}

function hotfixComparablePlayers(player) {
  return MASTER_PLAYERS.filter(candidate => playerStatus(candidate).draftable && candidate.pos === player.pos && normalize(candidate.name) !== normalize(player.name))
    .sort((a, b) => Math.abs(Number(a.posRank || 999) - Number(player.posRank || 999)) - Math.abs(Number(b.posRank || 999) - Number(player.posRank || 999)) || Number(b.proj || 0) - Number(a.proj || 0))
    .slice(0, 3);
}

function hotfixPlayerIntelligence(player) {
  const counts = positionCounts(state.profile.teamName);
  const market = marketInfo(player);
  const status = injuryLabel(player);
  const role = roleLabel(player);
  const rank = Number(player.posRank || 999);
  let ceiling, floor, fit, strategy;

  if (player.pos === 'QB') {
    ceiling = rank <= 8 ? 'High-end weekly quarterback production with enough touchdown volume to create a meaningful 2QB advantage.' : 'Reliable QB2 production when the offense is healthy, with the ceiling tied primarily to passing volume and touchdowns.';
    floor = `${status === 'Healthy' ? 'The starting role supports a usable weekly floor.' : `${status} lowers the immediate floor.`} Limited rushing production increases reliance on passing efficiency.`;
    fit = (counts.QB || 0) < 2 ? `You currently have ${counts.QB || 0} quarterback. He directly fills the open QB2 starting spot in this 2QB, six-point passing-touchdown league.` : 'Your starting quarterback spots are covered, so his value shifts toward QB3 protection and trade leverage.';
    strategy = (counts.QB || 0) < 2 ? 'Treat him as a price-sensitive QB2. Select him when the remaining higher-upside starters are gone or the room begins a quarterback run.' : 'Do not force the pick. Take him only when the value clearly beats the available RB/WR tier.';
  } else if (player.pos === 'RB') {
    ceiling = role === 'Lead back' ? 'Three-down workload and scoring access create weekly RB1 upside.' : 'A role expansion or injury ahead of him could unlock strong flex or RB2 production.';
    floor = role === 'Lead back' ? 'Bankable touches protect the weekly floor, though game script and health still matter.' : 'Shared work creates volatile weekly usage and a lower touch floor.';
    fit = `You currently have ${counts.RB || 0} running backs. His value is tied to workload, receiving involvement, and whether he improves the weekly flex.`;
    strategy = `Draft inside ${draftWindow(player)} only when the role supports the price. Do not pay for a workload that has not been earned.`;
  } else if (player.pos === 'WR') {
    ceiling = rank <= 18 ? 'Alpha-level target volume and explosive-play access provide legitimate WR1 weeks.' : 'A stable route share can produce useful flex weeks with occasional spike games.';
    floor = role === 'Starter' ? 'A secure route share protects the PPR floor, while quarterback quality controls consistency.' : 'Target competition and uncertain route volume create a lower weekly floor.';
    fit = `You currently have ${counts.WR || 0} receivers. He fits when his target profile improves your starting flex rather than merely adding bench depth.`;
    strategy = `Use ${draftWindow(player)} as the working window, then compare his target security against nearby RB and WR alternatives.`;
  } else if (player.pos === 'TE') {
    ceiling = rank <= 8 ? 'Can create weekly separation at tight end rather than simply filling the position.' : 'Offers matchup-driven production with occasional touchdown upside.';
    floor = rank <= 12 ? 'A stable route role supports a playable weekly floor.' : 'A secondary receiving role makes the floor touchdown-dependent.';
    fit = `You currently have ${counts.TE || 0} tight ends. He should either provide a weekly edge or meaningful insurance behind your starter.`;
    strategy = 'Draft only when his role separates him from replacement-level tight ends available later.';
  } else {
    ceiling = 'Can provide a weekly scoring edge within this league’s custom format.';
    floor = 'Production is more replaceable than at premium positions, so price discipline matters.';
    fit = `Your league’s scoring gives ${player.pos} more value than standard formats.`;
    strategy = 'Select when the top tier is clearly separated from the remaining field.';
  }
  if (market?.adp) strategy += ` Current FantasyPros ADP is ${Number(market.adp).toFixed(1)}.`;
  if (player.risk === 'High') floor += ' The current profile carries elevated volatility.';
  return { ceiling, floor, fit, strategy, projection: Math.round(Number(player.proj || 0)) };
}

openPlayerDetails = function(name) {
  const player = playerByName(name); if (!player) return;
  const status = playerStatus(player), market = marketInfo(player), intelligence = hotfixPlayerIntelligence(player), comparable = hotfixComparablePlayers(player), tag = scoutingTag(player);
  const statusText = status.owner ? `${status.label} · ${escapeHtml(status.owner)}` : status.label;
  const comparableMarkup = comparable.length ? comparable.map(candidate => `<button class="hotfix-comparable" data-player="${encodeURIComponent(candidate.name)}"><span>${escapeHtml(candidate.name)}</span><small>${escapeHtml(candidate.team)} · ${escapeHtml(candidate.pos)} · #${candidate.posRank || '—'} · ${Math.round(candidate.proj || 0)} pts</small></button>`).join('') : '<p class="muted">No close available alternatives found.</p>';

  document.getElementById('playerModalContent').innerHTML = `<div class="player-profile-head">${playerPhoto(player, 'player-photo profile-photo')}<div><span class="position-tag">${escapeHtml(player.pos)}</span><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.team)} · ${escapeHtml(microTier(player))}</p></div></div>
    <div class="status-banner ${status.key}"><b>${statusText}</b><span class="health-chip ${injuryLabel(player) === 'Healthy' ? 'healthy' : 'alert'}">${escapeHtml(injuryLabel(player))}</span></div>
    <div class="analyst-take"><span class="eyebrow">SCOUT'S TAKE</span><p>${escapeHtml(analystTake(player))}</p></div>
    <div class="detail-grid"><div><span>Projection</span><b>${intelligence.projection}</b></div><div><span>FP ADP</span><b>${market?.adp ? Number(market.adp).toFixed(1) : '—'}</b></div><div><span>FP ECR</span><b>${market?.ecr ? `#${market.ecr}` : '—'}</b></div><div><span>Draft Window</span><b>${draftWindow(player)}</b></div><div><span>Risk</span><b>${escapeHtml(player.risk)}</b></div></div>
    <div class="hotfix-intelligence-grid"><section><span class="eyebrow">CEILING</span><p>${escapeHtml(intelligence.ceiling)}</p></section><section><span class="eyebrow">FLOOR & RISK</span><p>${escapeHtml(intelligence.floor)}</p></section><section><span class="eyebrow">TEAM & LEAGUE FIT</span><p>${escapeHtml(intelligence.fit)}</p></section><section><span class="eyebrow">DRAFT STRATEGY</span><p>${escapeHtml(intelligence.strategy)}</p></section></div>
    <section class="hotfix-comparables"><div class="section-title"><span class="eyebrow">COMPARABLE OPTIONS</span><span>Available ${escapeHtml(player.pos)} alternatives</span></div>${comparableMarkup}</section>
    <div class="scouting-actions"><span class="eyebrow">SCOUTING TAG</span><div>${[['must_have','Target'],['watch','Watch'],['value_only','Value Only'],['fade','Fade']].map(([value,label]) => `<button class="scout-btn ${tag === value ? 'active' : ''}" data-scout="${value}" data-scout-player="${encodeURIComponent(player.name)}">${label}</button>`).join('')}</div></div>
    <section class="hotfix-engine-note"><span class="eyebrow">GM EVALUATION</span><p>Player intelligence is active. Full roster-, opponent-, and live-draft recommendations will come from the future Decision Engine.</p></section>
    <div class="modal-actions">${status.draftable ? `<button class="btn primary" data-draft="${encodeURIComponent(player.name)}">Draft ${escapeHtml(player.name)}</button>` : ''}</div>`;
  openModal('playerModal');
};

function hotfixApplyGmName() {
  const gmName = state.profile.gmName || 'Goose';
  const gmHeading = document.querySelector('.gm-identity h3'); if (gmHeading) gmHeading.textContent = gmName;
  const heroCopy = document.querySelector('.scouting-hero p'); if (heroCopy) heroCopy.textContent = `One tap tells ${gmName} how you see a player. The AI handles timing, urgency and alternatives.`;
}

document.addEventListener('click', event => {
  const scout = event.target.closest('[data-scout]');
  if (scout) { event.preventDefault(); event.stopImmediatePropagation(); hotfixSetScoutingTag(decodeURIComponent(scout.dataset.scoutPlayer), scout.dataset.scout, scout); return; }
  const clickable = event.target.closest('.scouting-photo, .scout-player .player-name');
  if (clickable) {
    const row = clickable.closest('[data-player-row]');
    if (row) { event.preventDefault(); event.stopImmediatePropagation(); openPlayerDetails(decodeURIComponent(row.dataset.playerRow)); }
  }
}, true);

const style = document.createElement('style');
style.textContent = `.scouting-photo,.scout-player .player-name{cursor:pointer}.scout-player .player-name:hover{text-decoration:underline}.hotfix-intelligence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}.hotfix-intelligence-grid section,.hotfix-comparables,.hotfix-engine-note{padding:16px;border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(255,255,255,.035)}.hotfix-intelligence-grid p,.hotfix-engine-note p{margin:8px 0 0;line-height:1.5}.hotfix-comparables{margin:18px 0}.hotfix-comparable{width:100%;display:flex;justify-content:space-between;gap:16px;align-items:center;text-align:left;padding:12px;margin-top:8px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(0,0,0,.18);color:inherit;cursor:pointer}.hotfix-comparable small{color:var(--muted,#9ca3af)}@media(max-width:700px){.hotfix-intelligence-grid{grid-template-columns:1fr}.hotfix-comparable{align-items:flex-start;flex-direction:column;gap:3px}}`;
document.head.appendChild(style);

if (!state.profile.gmName) state.profile.gmName = 'Goose';
const settingsSection = document.querySelector('#settingsModal .settings-section');
if (settingsSection && !document.getElementById('gmNameInput')) {
  const wrapper = document.createElement('label'); wrapper.innerHTML = 'GM name<input id="gmNameInput" type="text" maxlength="30">'; settingsSection.appendChild(wrapper);
}
const originalOpenSettings = openSettings;
openSettings = function() { originalOpenSettings(); const input = document.getElementById('gmNameInput'); if (input) input.value = state.profile.gmName || 'Goose'; };
document.getElementById('saveSettings')?.addEventListener('click', () => { const input = document.getElementById('gmNameInput'); if (input) { state.profile.gmName = input.value.trim() || 'Goose'; hotfixPersistState(); hotfixApplyGmName(); } }, true);

hotfixApplyGmName();
const versionNode = document.getElementById('versionLabel'); if (versionNode) versionNode.textContent = `v${HOTFIX_VERSION}`;
const statusFilter = document.getElementById('databaseStatus'); if (statusFilter && statusFilter.value === 'ALL') { statusFilter.value = 'available'; renderDatabase(); }
