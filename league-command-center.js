'use strict';
(function(){
  function loadWarRoomV12(){
    if(document.querySelector('script[data-front-office-v12]'))return;
    const script=document.createElement('script');
    script.src='front-office-v12.js?v=1';
    script.dataset.frontOfficeV12='true';
    script.addEventListener('load',()=>{
      if(typeof activeView!=='undefined'&&activeView==='warroom'&&typeof renderWarroom==='function')renderWarroom();
    },{once:true});
    document.body.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadWarRoomV12,{once:true});
  else loadWarRoomV12();
})();