'use strict';

// Targeted UI repair: preserve the fast runtime while restoring sticky navigation
// and loading player headshots only after the app is already interactive.

const repairStyle = document.createElement('style');
repairStyle.textContent = `
  .topbar{position:sticky!important;top:0!important;z-index:100!important}
  .tabs{position:sticky!important;top:97px!important;z-index:90!important}
  .player-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2}
  .player-photo{position:relative;overflow:hidden}
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
  } catch {
    // Initials remain as the graceful fallback.
  }
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
