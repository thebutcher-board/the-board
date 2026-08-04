'use strict';
(function(){
  const BOOT_VERSION='phase1-owned-mount-13.0';
  let ownedShell=null;
  let observer=null;

  function loadScript(src,key){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-phase-one-key="${key}"]`);
      if(existing){
        if(existing.dataset.loaded==='true') resolve();
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

  function createOwnedMount(){
    const war=document.getElementById('warroom');
    if(!war) return null;

    // The original HTML contained a complete legacy Front Office. Remove that
    // markup entirely so old render functions have no visible DOM to repaint.
    war.replaceChildren();
    war.className='view active war-room-v12';

    ownedShell=document.createElement('div');
    ownedShell.className='front-office-shell';
    ownedShell.dataset.phaseOneOwner='true';
    war.appendChild(ownedShell);
    return ownedShell;
  }

  function enforceSingleMount(){
    const war=document.getElementById('warroom');
    if(!war) return;

    if(!ownedShell || !ownedShell.isConnected){
      createOwnedMount();
      window.WarRoomV12?.render?.();
      return;
    }

    [...war.children].forEach(node=>{
      if(node!==ownedShell) node.remove();
    });

    [...ownedShell.children].forEach(node=>{
      if(node.id!=='warRoomV12') node.remove();
    });

    document.querySelectorAll(
      '#warRoomV11,#warRoomV10,#warRoomV9,#warRoomV8,#decisionArenaV7,'+
      '#warRoomLive,#cockpitV5,.draft-track,.draft-heartbeat-summary,'+
      '.front-office-topline,.front-office-layout,.projection-panel'
    ).forEach(node=>node.remove());
  }

  function ownedRender(){
    enforceSingleMount();
    window.WarRoomV12?.render?.();
    enforceSingleMount();
  }

  async function boot(){
    if(window.__THE_BOARD_FRONT_OFFICE_BOOT__===BOOT_VERSION) return;
    window.__THE_BOARD_FRONT_OFFICE_BOOT__=BOOT_VERSION;

    document.querySelectorAll(
      'script[src*="front-office-v8"],script[src*="front-office-v9"],'+
      'script[src*="front-office-v10"],script[src*="front-office-v11"],'+
      'script[src*="war-room-phase1-lock"]'
    ).forEach(script=>script.remove());

    createOwnedMount();
    await loadScript('front-office-v12.js?v=13.0.0','front-office-v13');

    // Replace the legacy global render entry point instead of racing it.
    window.renderWarroom=ownedRender;
    ownedRender();

    const war=document.getElementById('warroom');
    observer?.disconnect();
    observer=new MutationObserver(()=>queueMicrotask(enforceSingleMount));
    if(war) observer.observe(war,{childList:true,subtree:true});

    // Cover delayed legacy timers during the first load without maintaining a
    // permanent polling loop.
    [250,750,1500,3000,5000,7500,10000,15000].forEach(delay=>{
      setTimeout(()=>{
        enforceSingleMount();
        if(!document.getElementById('warRoomV12')) ownedRender();
      },delay);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();