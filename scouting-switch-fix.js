'use strict';

// Targeted UI repair: preserve the fast runtime while restoring player photos,
// full-width layout, consistent typography and non-overlapping navigation.

const repairStyle = document.createElement('style');
repairStyle.textContent = `
  :root{
    --shell:#e7e8eb;--canvas:#f3f3f5;--surface:#ffffff;--surface-soft:#eceef1;
    --surface-smoke:#dfe2e6;--ink:#18191b;--ink-soft:#5d6168;
    --accent:#f47a00;--accent-dark:#a94f00;--border:#cfd2d7
  }
  html{scroll-padding-top:62px!important;background:var(--shell)!important}
  body{background:var(--shell)!important;color:var(--ink)!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important}
  body,button,input,select,textarea{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important;font-variation-settings:normal!important}

  /* The logo header scrolls away. Only the compact navigation stays pinned. */
  .topbar{position:relative!important;top:auto!important;z-index:20!important;background:linear-gradient(180deg,#f8f8f9,#eceef1)!important;border-bottom:1px solid var(--border)!important;box-shadow:none!important}
  .tabs{position:sticky!important;top:0!important;z-index:100!important;background:rgba(45,48,53,.96)!important;border-bottom:1px solid #202226!important;backdrop-filter:blur(14px)!important;box-shadow:0 5px 18px rgba(20,22,26,.18)!important}
  .tab{color:#d8dbe0!important;font-weight:700!important;letter-spacing:0!important;text-transform:none!important}
  .tab.active{background:var(--accent)!important;color:#fff!important}

  /* Use the whole browser width instead of a narrow floating document. */
  main{width:100%!important;max-width:none!important;margin:0!important;padding:18px clamp(14px,2.4vw,34px) 42px!important;background:linear-gradient(180deg,var(--canvas),var(--shell))!important}
  .front-office-shell,.front-office-layout{width:100%!important;max-width:none!important;margin:0!important}

  /* One typography hierarchy. */
  .brand h1{font-size:30px!important;font-weight:800!important;letter-spacing:-.035em!important;line-height:1!important}
  .brand p{font-size:11px!important;font-weight:650!important;letter-spacing:.045em!important}
  .front-office-topline h2,.goose-desk h2,.panel h2,.scouting-hero h2{font-size:clamp(24px,2.2vw,34px)!important;line-height:1.08!important;font-weight:750!important;letter-spacing:-.035em!important}
  .fo-panel h3,.goose-desk h3,.panel h3{font-size:17px!important;line-height:1.2!important;font-weight:720!important;letter-spacing:-.015em!important}
  .eyebrow,.gm-kicker{font-size:10px!important;font-weight:750!important;letter-spacing:.09em!important}
  p,small,.player-meta,.player-signal,.status-line,.scout-context{line-height:1.45!important}

  /* Smoky gray surfaces with orange reserved for action and priority. */
  .front-office-topline{background:linear-gradient(135deg,#35383e,#272a2f)!important;color:#fff!important;border:1px solid #202226!important;box-shadow:0 12px 30px rgba(35,38,44,.18)!important}
  .front-office-topline h2,.front-office-topline .eyebrow,.front-office-topline span,.front-office-topline strong{color:#fff!important}
  .fo-panel,.goose-desk,.panel{background:var(--surface)!important;border:1px solid var(--border)!important;box-shadow:0 7px 22px rgba(39,43,49,.08)!important}
  .organization-panel,.wishlist-panel{background:linear-gradient(180deg,#fff,#f6f7f8)!important}
  .scouting-panel,.radar-panel{background:linear-gradient(180deg,#f0f1f3,#e7e9ec)!important}
  .goose-desk{border-top:4px solid var(--accent)!important;background:linear-gradient(180deg,#fff,#f7f7f8)!important}
  .decision-panel{background:linear-gradient(180deg,#fff,#f1f2f4)!important}
  .projection-panel{background:linear-gradient(180deg,#f0f1f3,#e5e7ea)!important}

  .roster-command-row{background:#e8eaed!important;border:1px solid #d3d6db!important}
  .roster-command-row b{color:#24262a!important}
  .roster-command-row i{background:#fff!important;color:var(--accent-dark)!important;border:1px solid #efc49d!important}
  .roster-row{background:#f2f3f5!important;border:1px solid #dde0e4!important;box-shadow:none!important}
  .current-objective{background:#2e3136!important;color:#fff!important;border:0!important;box-shadow:none!important}
  .current-objective .eyebrow,.current-objective strong{color:#fff!important}
  .scouting-summary>div{background:#fff!important;border:1px solid #d4d7dc!important;box-shadow:none!important}
  .scouting-summary b{color:var(--accent-dark)!important}

  .future-path{background:#fff!important;border:1px solid #d4d7dc!important;box-shadow:none!important}
  .future-path.recommended{border-top:4px solid var(--accent)!important}
  .future-path>span{color:var(--accent-dark)!important}
  .projected-draft button,.wishlist-group button{background:#fff!important;border:1px solid #d4d7dc!important;box-shadow:none!important}
  .projected-draft button>span{background:#34373c!important;color:#fff!important}
  .radar-callout{background:#34373c!important;color:#fff!important;border:0!important;box-shadow:none!important}
  .radar-callout span,.radar-callout b,.radar-callout small{color:#fff!important}

  .scout-player,.board-player,.team-card{background:#fff!important;border:1px solid #d3d6db!important;box-shadow:0 4px 14px rgba(39,43,49,.07)!important}
  .player-photo{position:relative;overflow:hidden;background:linear-gradient(145deg,#eceef1,#d9dde2)!important;border-color:#c7cbd1!important}
  .player-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2}
  .modal-card,.player-modal-card{background:#f7f7f8!important;border-color:#cdd1d6!important}
  .analyst-take,.hotfix-intelligence-grid section,.hotfix-comparables,.detail-grid div,.scouting-actions{background:#fff!important;border-color:#d4d7dc!important}

  .btn.primary,.draft-btn{background:var(--accent)!important;color:#fff!important}
  .text-btn{color:var(--accent-dark)!important}
  .icon-btn,.btn.ghost,.btn.secondary,.details-btn,.quick-scout{background:#fff!important;color:#292b2f!important;border-color:#c9cdd2!important}
  .quick-scout.active{background:#fff0e3!important;color:var(--accent-dark)!important;border-color:#e9a365!important}

  .view,.panel,.scouting-hero{scroll-margin-top:58px!important}
  @media(max-width:900px){main{padding:14px 12px 34px!important}.tabs{top:0!important}}
`;
document.head.appendChild(repairStyle);

const PHOTO_CACHE_KEY = 'the-board-player-photo-map-v1';
let playerPhotoMap = new Map();
let photoLoadStarted = false;

function normalizePhotoName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function loadCachedPhotoMap() {
  try {
    const cached = JSON.parse(localStorage.getItem(PHOTO_CACHE_KEY) || '{}');
    playerPhotoMap = new Map(Object.entries(cached));
  } catch {
    playerPhotoMap = new Map();
  }
}

function playerNameForPhotoNode(node) {
  const row = node.closest('[data-player-row]');
  if (row?.dataset.playerRow) return decodeURIComponent(row.dataset.playerRow);
  const clickable = node.closest('[data-player]');
  if (clickable?.dataset.player) return decodeURIComponent(clickable.dataset.player);
  const modal = node.closest('#playerModalContent');
  const modalName = modal?.querySelector('.player-profile-head h2')?.textContent;
  if (modalName) return modalName.trim();
  const cardName = node.closest('article,button,div')?.querySelector?.('.player-name')?.textContent;
  return cardName?.trim() || '';
}

function applyPlayerPhotos(root = document) {
  root.querySelectorAll('.player-photo').forEach(node => {
    if (node.querySelector('img')) return;
    const name = normalizePhotoName(playerNameForPhotoNode(node));
    const playerId = playerPhotoMap.get(name);
    if (!playerId) return;
    const img = document.createElement('img');
    img.alt = playerNameForPhotoNode(node);
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
    img.addEventListener('error', () => img.remove(), { once: true });
    node.prepend(img);
  });
}

async function loadPlayerPhotosLazily() {
  if (photoLoadStarted) return;
  photoLoadStarted = true;
  loadCachedPhotoMap();
  applyPlayerPhotos();
  if (playerPhotoMap.size > 200) return;
  try {
    const response = await fetch('https://api.sleeper.app/v1/players/nfl?active=true');
    if (!response.ok) return;
    const payload = await response.json();
    const compact = {};
    Object.entries(payload).forEach(([id, player]) => {
      const name = player.full_name || [player.first_name, player.last_name].filter(Boolean).join(' ');
      if (name) compact[normalizePhotoName(name)] = id;
    });
    playerPhotoMap = new Map(Object.entries(compact));
    try { localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(compact)); } catch {}
    applyPlayerPhotos();
  } catch {}
}

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches('.player-photo') || node.querySelector('.player-photo')) {
        applyPlayerPhotos(node.matches('.player-photo') ? node.parentElement || node : node);
      }
    });
  }
});
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('load', () => {
  const schedule = window.requestIdleCallback || (callback => setTimeout(callback, 2500));
  schedule(loadPlayerPhotosLazily, { timeout: 5000 });
}, { once: true });
