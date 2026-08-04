'use strict';
(function(){
  function loadWarRoomV9(){
    if(document.querySelector('script[data-front-office-v9]'))return;
    const script=document.createElement('script');
    script.src='front-office-v9.js?v=1';
    script.dataset.frontOfficeV9='true';
    script.addEventListener('load',()=>{
      if(typeof activeView!=='undefined'&&activeView==='warroom'&&typeof renderWarroom==='function')renderWarroom();
    },{once:true});
    document.body.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadWarRoomV9,{once:true});
  else loadWarRoomV9();
})();