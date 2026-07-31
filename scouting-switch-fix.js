'use strict';

// Intercept scouting changes before the legacy render path.
document.addEventListener('click', event => {
  const button = event.target.closest('[data-scout]');
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const player = playerByName(decodeURIComponent(button.dataset.scoutPlayer));
  if (!player) return;

  const key = normalize(player.name);
  const selectedTag = button.dataset.scout;
  const nextTag = state.scouting?.[key] === selectedTag ? null : selectedTag;

  state.scouting = state.scouting || {};
  if (nextTag) state.scouting[key] = nextTag;
  else delete state.scouting[key];

  // Update every visible copy of this player's controls immediately.
  const encodedName = encodeURIComponent(player.name);
  document.querySelectorAll(`[data-scout-player="${CSS.escape(encodedName)}"]`).forEach(control => {
    const active = Boolean(nextTag && control.dataset.scout === nextTag);
    control.classList.toggle('active', active);
    control.setAttribute('aria-pressed', String(active));
  });

  clearTimeout(window.__boardScoutingSaveTimer);
  window.__boardScoutingSaveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { showToast('Could not save scouting state'); }
  }, 150);

  showToast(nextTag ? `${player.name}: ${nextTag.replace('_', ' ')}` : `${player.name}: scouting tag cleared`);

  // Refresh dependent summaries only after the tap has painted.
  requestAnimationFrame(() => setTimeout(() => {
    renderScoutingSummary();
    renderPositionTargets();
  }, 40));
}, true);

const instantTagStyle = document.createElement('style');
instantTagStyle.textContent = `.quick-scout,.scout-btn{transition:none!important;touch-action:manipulation}`;
document.head.appendChild(instantTagStyle);
