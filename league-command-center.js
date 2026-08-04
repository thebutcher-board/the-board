'use strict';
(function(){
  function loadWarRoomV11(){
    if(document.querySelector('script[data-front-office-v11]'))return;
    const script=document.createElement('script');
    script.src='front-office-v11.js?v=1';
    script.dataset.frontOfficeV11='true';
    script.addEventListener('load',()=>{
      if(typeof activeView!=='undefined'&&activeView==='warroom'&&typeof renderWarroom==='function')renderWarroom();
      window.WarRoomV11?.render?.();
    },{once:true});
    document.body.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadWarRoomV11,{once:true});
  else loadWarRoomV11();
})();