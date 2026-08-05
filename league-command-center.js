'use strict';
(function(){
  const BOOT_VERSION='liquid-front-office-11.0.0';
  function addStyle(href,key){
    document.querySelectorAll(`link[data-front-office-style="${key}"]`).forEach(n=>n.remove());
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.frontOfficeStyle=key;document.head.appendChild(link);
  }
  function addScript(src,key){
    return new Promise((resolve,reject)=>{document.querySelectorAll(`script[data-front-office-script="${key}"]`).forEach(n=>n.remove());const script=document.createElement('script');script.src=src;script.dataset.frontOfficeScript=key;script.onload=resolve;script.onerror=reject;document.body.appendChild(script);});
  }
  function mount(){
    const war=document.getElementById('warroom');if(!war)return null;war.replaceChildren();war.className='view active';const root=document.createElement('div');root.id='frontOfficeRoot';war.appendChild(root);return root;
  }
  async function boot(){
    if(window.__THE_BOARD_FRONT_OFFICE_BOOT__===BOOT_VERSION)return;
    window.__THE_BOARD_FRONT_OFFICE_BOOT__=BOOT_VERSION;
    document.querySelectorAll('script[src*="front-office-phase1"],script[src*="front-office-polish"],script[src*="front-office-photo-fix"],script[src*="command-surface"],style#phaseOneStyles,link[data-front-office-clean],link[data-front-office-style],script[data-front-office-clean],script[data-front-office-script]').forEach(n=>n.remove());
    mount();
    addStyle('front-office-clean.css?v=11.0.0','base');
    addStyle('front-office-layout-v2.css?v=11.0.0','layout');
    addStyle('front-office-intelligence-v2.css?v=11.0.0','intelligence');
    addStyle('front-office-liquid.css?v=11.0.0','liquid');
    addStyle('command-surface-v7.css?v=11.0.0','command-surface');
    addStyle('command-surface-v8.css?v=11.0.0','command-surface-polish');
    addStyle('command-surface-v9.css?v=11.0.0','command-surface-final-polish');
    addStyle('command-surface-v10.css?v=11.0.0','command-surface-sketch-polish');
    addStyle('command-surface-v11.css?v=11.0.0','command-surface-microcards');
    await addScript('front-office-clean.js?v=11.0.0','renderer');
    window.renderWarroom=()=>window.CleanFrontOffice?.render?.();window.renderWarroom();
    await addScript('front-office-position-colors.js?v=11.0.0','position-colors');
    await addScript('front-office-intelligence-v2.js?v=11.0.0','intelligence');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();