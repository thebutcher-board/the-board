'use strict';
(function(){
  function loadScript(src,attr){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[${attr}]`);
      if(existing){
        if(existing.dataset.loaded==='true')resolve();
        else existing.addEventListener('load',resolve,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.setAttribute(attr,'true');
      script.addEventListener('load',()=>{script.dataset.loaded='true';resolve();},{once:true});
      script.addEventListener('error',reject,{once:true});
      document.body.appendChild(script);
    });
  }

  async function bootPhaseOne(){
    await loadScript('front-office-v12.js?v=4','data-front-office-v12');
    await loadScript('war-room-phase1-lock.js?v=1','data-war-room-phase1-lock');
    window.WarRoomV12?.render?.();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootPhaseOne,{once:true});
  else bootPhaseOne();
})();