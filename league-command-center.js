'use strict';
(function(){
  const BOOT_VERSION='clean-front-office-1.2.0';
  function addStyle(href){
    document.querySelectorAll('link[data-front-office-clean]').forEach(n=>n.remove());
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.frontOfficeClean='true';document.head.appendChild(link);
  }
  function addScript(src){
    return new Promise((resolve,reject)=>{
      document.querySelectorAll('script[data-front-office-clean]').forEach(n=>n.remove());
      const script=document.createElement('script');script.src=src;script.dataset.frontOfficeClean='true';script.onload=resolve;script.onerror=reject;document.body.appendChild(script);
    });
  }
  function mount(){
    const war=document.getElementById('warroom');if(!war)return null;
    war.replaceChildren();war.className='view active';
    const root=document.createElement('div');root.id='frontOfficeRoot';war.appendChild(root);return root;
  }
  async function boot(){
    if(window.__THE_BOARD_FRONT_OFFICE_BOOT__===BOOT_VERSION)return;
    window.__THE_BOARD_FRONT_OFFICE_BOOT__=BOOT_VERSION;
    document.querySelectorAll('script[src*="front-office-phase1"],script[src*="front-office-polish"],script[src*="front-office-photo-fix"],style#phaseOneStyles,link[data-front-office-clean],script[data-front-office-clean]').forEach(n=>n.remove());
    mount();
    addStyle('front-office-clean.css?v=1.2.0');
    await addScript('front-office-clean.js?v=1.2.0');
    window.renderWarroom=()=>window.CleanFrontOffice?.render?.();
    window.renderWarroom();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();