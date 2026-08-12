'use strict';
(function(){
  const BOOT_VERSION='the-board-my-team-23.0.1';
  function addStyle(href,key){document.querySelectorAll(`link[data-front-office-style="${key}"]`).forEach(n=>n.remove());const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.frontOfficeStyle=key;document.head.appendChild(link)}
  function addScript(src,key){return new Promise((resolve,reject)=>{document.querySelectorAll(`script[data-front-office-script="${key}"]`).forEach(n=>n.remove());const script=document.createElement('script');script.src=src;script.dataset.frontOfficeScript=key;script.onload=resolve;script.onerror=reject;document.body.appendChild(script)})}
  function mount(){const war=document.getElementById('warroom');if(!war)return null;war.replaceChildren();war.className='view active';const root=document.createElement('div');root.id='frontOfficeRoot';war.appendChild(root);return root}
  async function boot(){
    if(window.__THE_BOARD_FRONT_OFFICE_BOOT__===BOOT_VERSION)return;
    if(!window.BoardCore)throw new Error('THE BOARD app core unavailable');
    window.__THE_BOARD_FRONT_OFFICE_BOOT__=BOOT_VERSION;
    document.documentElement.dataset.cockpitReady='false';
    window.__TB_COCKPIT_OBSERVER__?.disconnect?.();window.__TB_COCKPIT_OBSERVER__=null;
    document.querySelectorAll('script[src*="front-office-phase1"],script[src*="front-office-polish"],script[src*="front-office-photo-fix"],script[src*="front-office-photo-integrity"],script[src*="front-office-position-colors"],script[src*="front-office-intelligence-v2"],script[src*="command-surface"],script[src*="cockpit-v1"],script[src*="cockpit-v2"],script[src*="cockpit-v3"],script[src*="cockpit-v4"],script[src*="cockpit-v5"],script[src*="cockpit-route-sync"],script[src*="integrated-board"],script[src*="live-draft-engine"],script[src*="state-bridge"],script[src*="my-team-intelligence"],script[src*="my-team-cockpit"],style#phaseOneStyles,link[data-front-office-clean],link[data-front-office-style],script[data-front-office-clean],script[data-front-office-script]').forEach(n=>n.remove());
    document.body.className=document.body.className.replace(/\btbv\S+/g,'').trim();mount();
    const v='23.0.1';
    addStyle(`front-office-clean.css?v=${v}`,'base');addStyle(`front-office-layout-v2.css?v=${v}`,'layout');addStyle(`front-office-intelligence-v2.css?v=${v}`,'intelligence-css');addStyle(`front-office-liquid.css?v=${v}`,'liquid');addStyle(`command-surface-v14.css?v=${v}`,'sidecards-base');addStyle(`command-surface-v15.css?v=${v}`,'hero-base');addStyle(`cockpit-v5-2-shell.css?v=${v}`,'cockpit-v52-shell');addStyle(`cockpit-v5-2.css?v=${v}`,'cockpit-v52');addStyle(`foundation-controls-v1.css?v=${v}`,'foundation-controls');addStyle(`cockpit-visual-system-v2.css?v=${v}`,'cockpit-visual-system');addStyle(`integrated-board-v1.css?v=${v}`,'integrated-board');addStyle(`live-draft-engine-v2.css?v=${v}`,'live-draft-engine');
    await addScript(`state-bridge-v1.js?v=${v}`,'state-bridge');
    await addScript(`foundation-controls-v1.js?v=${v}`,'foundation-controls');
    await addScript(`my-team-intelligence-v1.js?v=${v}`,'my-team-intelligence');
    await addScript(`front-office-clean.js?v=${v}`,'renderer');
    window.renderWarroom=()=>window.CleanFrontOffice?.render?.();window.renderWarroom();
    await addScript(`cockpit-v5-2.js?v=${v}`,'cockpit-v52');window.BoardCockpitV52?.apply?.();
    await addScript(`my-team-cockpit-v1.js?v=${v}`,'my-team-cockpit');
    await addScript(`cockpit-route-sync-v1.js?v=${v}`,'route-sync');window.BoardRouteSync?.wire?.();
    await addScript(`integrated-board-v2.js?v=${v}`,'integrated-board');window.IntegratedBoardV2?.render?.();
    await addScript(`live-draft-engine-v2.js?v=${v}`,'live-draft-engine');window.BoardDraftEngine?.refresh?.();window.BoardPresentation?.apply?.();
    window.BoardMyTeam?.refresh?.('cockpit-ready');window.BoardMyTeamCockpit?.render?.();
    document.documentElement.dataset.cockpitReady='true';window.dispatchEvent(new CustomEvent('theboard:app-ready',{detail:{version:BOOT_VERSION,core:window.BoardCore.version,myTeam:window.BoardMyTeam?.version||null}}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
