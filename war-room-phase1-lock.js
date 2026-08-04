'use strict';
(function(){
  const LEGACY_SELECTORS=[
    '#warRoomV11','#warRoomV10','#warRoomV9','#warRoomV8','#decisionArenaV7',
    '#warRoomLive','#cockpitV5','.draft-track','.draft-heartbeat-summary',
    '.front-office-topline','.front-office-layout','.projection-panel'
  ];

  function phaseOneRender(){
    if(window.WarRoomV12?.render) window.WarRoomV12.render();
  }

  function removeLegacy(){
    const root=document.getElementById('warRoomV12');
    const shell=document.querySelector('#warroom .front-office-shell');
    if(shell){
      [...shell.children].forEach(node=>{
        if(node!==root) node.remove();
      });
    }
    document.querySelectorAll(LEGACY_SELECTORS.join(',')).forEach(node=>{
      if(node.id!=='warRoomV12') node.remove();
    });
  }

  function lock(){
    if(!window.WarRoomV12?.render){setTimeout(lock,25);return;}
    window.renderWarroom=phaseOneRender;
    phaseOneRender();
    removeLegacy();

    const war=document.getElementById('warroom');
    if(war){
      new MutationObserver(()=>{
        removeLegacy();
        if(!document.getElementById('warRoomV12')) phaseOneRender();
      }).observe(war,{childList:true,subtree:true});
    }

    window.addEventListener('the-board:render',phaseOneRender);
    setInterval(()=>{
      removeLegacy();
      if(document.querySelector('#warroom.view.active')) phaseOneRender();
    },1000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',lock,{once:true});
  else lock();
})();