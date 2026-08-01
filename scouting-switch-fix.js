'use strict';

// THE BOARD v1.4.2 — zero-blocking scouting controls.
// The tap path only updates local state and the visible controls.

let scoutingSaveTimer = null;
let scoutingIntelTimer = null;

function persistScoutingLater() {
  clearTimeout(scoutingSaveTimer);
  scoutingSaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast('Could not save scouting state');
    }
  }, 250);
}

function refreshScoutingIntelligenceLater() {
  clearTimeout(scoutingIntelTimer);
  scoutingIntelTimer = setTimeout(() => {
    const work = () => {
      try {
        renderScoutingSummary();
        renderPositionTargets();
      } catch (error) {
        console.warn('Deferred scouting refresh failed', error);
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(work, { timeout: 1500 });
    } else {
      setTimeout(work, 0);
    }
  }, 400);
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-scout]');
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const player = playerByName(decodeURIComponent(button.dataset.scoutPlayer));
  if (!player) return;

  state.scouting = state.scouting || {};
  const key = normalize(player.name);
  const selectedTag = button.dataset.scout;
  const nextTag = state.scouting[key] === selectedTag ? null : selectedTag;

  if (nextTag) state.scouting[key] = nextTag;
  else delete state.scouting[key];

  // Update only this player's visible controls. No list or page render occurs here.
  const encodedName = encodeURIComponent(player.name);
  document.querySelectorAll(`[data-scout-player="${CSS.escape(encodedName)}"]`).forEach(control => {
    const active = Boolean(nextTag && control.dataset.scout === nextTag);
    control.classList.toggle('active', active);
    control.setAttribute('aria-pressed', String(active));
  });

  persistScoutingLater();
  refreshScoutingIntelligenceLater();
  showToast(nextTag ? `${player.name}: ${nextTag.replace('_', ' ')}` : `${player.name}: scouting tag cleared`);
}, true);

const instantTagStyle = document.createElement('style');
instantTagStyle.textContent = `
  .quick-scout,.scout-btn{
    transition:none!important;
    touch-action:manipulation;
    -webkit-tap-highlight-color:transparent;
  }
`;
document.head.appendChild(instantTagStyle);

const versionNode = document.getElementById('versionLabel');
if (versionNode) versionNode.textContent = 'v1.4.2';
