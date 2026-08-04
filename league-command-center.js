'use strict';
(function(){
  const BOOT_VERSION='phase1-single-render-12.5';

  function loadScript(src,key){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-phase-one-key="${key}"]`);
      if(existing){
        if(existing.dataset.loaded==='true')resolve();
        else existing.addEventListener('load',resolve,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.dataset.phaseOneKey=key;
      script.addEventListener('load',()=>{script.dataset.loaded='true';resolve();},{once:true});
      script.addEventListener('error',reject,{once:true});
      document.body.appendChild(script);
    });
  }

  async function boot(){
    if(window.__THE_BOARD_FRONT_OFFICE_BOOT__===BOOT_VERSION)return;
    window.__THE_BOARD_FRONT_OFFICE_BOOT__=BOOT_VERSION;

    document.querySelectorAll('script[src*="front-office-v8"],script[src*="front-office-v9"],script[src*="front-office-v10"],script[src*="front-office-v11"]').forEach(script=>script.remove());

    await loadScript('front-office-v12.js?v=12.5.0','front-office');
    await loadScript('war-room-phase1-lock.js?v=12.5.0','render-lock');
    window.WarRoomV12?.render?.();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();