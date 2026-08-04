'use strict';
(function(){
  function loadWarRoomV10(){
    if(document.querySelector('script[data-front-office-v10]'))return;
    const script=document.createElement('script');
    script.src='front-office-v10.js?v=1';
    script.dataset.frontOfficeV10='true';
    script.addEventListener('load',()=>{
      if(typeof activeView!=='undefined'&&activeView==='warroom'&&typeof renderWarroom==='function')renderWarroom();
    },{once:true});
    document.body.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadWarRoomV10,{once:true});
  else loadWarRoomV10();
})();