'use strict';
(function(){
  const BOOT_VERSION='draft-cockpit-20.5.0';
  function addStyle(href,key){document.querySelectorAll(`link[data-front-office-style="${key}"]`).forEach(n=>n.remove());const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.frontOfficeStyle=key;document.head.appendChild(link)}
  function addScript(src,key){return new Promise((resolve,reject)=>{document.querySelectorAll(`script[data-front-office-script="${key}"]`).forEach(n=>n.remove());const script=document.createElement('script');script.src=src;script.dataset.frontOfficeScript=key;script.onload=resolve;script.onerror=reject;document.body.appendChild(script)})}
  function mount(){const war=document.getElementById('warroom');if(!war)return null;war.replaceChildren();war.className='view active';const root=document.createElement('div');root.id='frontOfficeRoot';war.appendChild(root);return root}
  async function boot(){
    if(window.__THE_BOARD_FRONT_OFFICE_BOOT__===BOOT_VERSION)return;
    window.__THE_BOARD_FRONT_OFFICE_BOOT__=BOOT_VERSION;
    document.documentElement.dataset.cockpitReady='false';
    window.__TB_COCKPIT_OBSERVER__?.disconnect?.();window.__TB_COCKPIT_OBSERVER__=null;
    document.querySelectorAll('script[src*="front-office-phase1"],script[src*="front-office-polish"],script[src*="front-office-photo-fix"],script[src*="front-office-photo-integrity"],script[src*="front-office-position-colors"],script[src*="front-office-intelligence-v2"],script[src*="command-surface"],script[src*="cockpit-v1"],script[src*="cockpit-v2"],script[src*="cockpit-v3"],script[src*="cockpit-v4"],script[src*="cockpit-v5"],script[src*="cockpit-route-sync"],style#phaseOneStyles,link[data-front-office-clean],link[data-front-office-style],script[data-front-office-clean],script[data-front-office-script]').forEach(n=>n.remove());
    document.body.className=document.body.className.replace(/\btbv\S+/g,'').trim();mount();
    addStyle('front-office-clean.css?v=20.5.0','base');
    addStyle('front-office-layout-v2.css?v=20.5.0','layout');
    addStyle('front-office-intelligence-v2.css?v=20.5.0','intelligence-css');
    addStyle('front-office-liquid.css?v=20.5.0','liquid');
    addStyle('command-surface-v14.css?v=20.5.0','sidecards-base');
    addStyle('command-surface-v15.css?v=20.5.0','hero-base');
    addStyle('cockpit-v5-2-shell.css?v=20.5.0','cockpit-v52-shell');
    addStyle('cockpit-v5-2.css?v=20.5.0','cockpit-v52');
    addStyle('foundation-controls-v1.css?v=20.5.0','foundation-controls');
    addStyle('cockpit-visual-system-v2.css?v=20.5.0','cockpit-visual-system');
    await addScript('foundation-controls-v1.js?v=20.5.0','foundation-controls');
    await addScript('front-office-clean.js?v=20.5.0','renderer');
    window.renderWarroom=()=>window.CleanFrontOffice?.render?.();
    window.renderWarroom();
    await addScript('cockpit-v5-2.js?v=20.5.0','cockpit-v52');
    window.BoardCockpitV52?.apply?.();
    await addScript('cockpit-route-sync-v1.js?v=20.5.0','route-sync');
    window.BoardRouteSync?.wire?.();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();