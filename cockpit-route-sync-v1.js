'use strict';
(function(){
  const DRAFT_HASH='#warroom';
  function normalizeDraftRoute(){
    const warroom=document.getElementById('warroom');
    if(warroom?.classList.contains('active')&&location.hash!==DRAFT_HASH){
      history.replaceState({view:'warroom'},'',DRAFT_HASH);
    }
  }
  function wire(){
    document.querySelectorAll('[data-v52-view]').forEach(button=>{
      const view=button.dataset.v52View;
      button.addEventListener('click',()=>{
        const hash=view==='warroom'?DRAFT_HASH:`#${view}`;
        history.pushState({view},'',hash);
      });
    });
    normalizeDraftRoute();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(wire),{once:true});
  else requestAnimationFrame(wire);
  window.addEventListener('popstate',()=>{
    const view=(location.hash||DRAFT_HASH).slice(1)||'warroom';
    document.querySelector(`.tabs .tab[data-view="${view}"]`)?.click();
  });
  window.BoardRouteSync={wire,normalizeDraftRoute};
})();
