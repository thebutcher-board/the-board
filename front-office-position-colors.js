'use strict';
(function(){
  const VALID=new Set(['QB','RB','WR','TE','FLEX','K','DEF','ANY']);
  function normalize(value){
    const pos=String(value||'').trim().toUpperCase().replace(/[^A-Z]/g,'');
    return VALID.has(pos)?pos:(pos==='DST'?'DEF':'ANY');
  }
  function annotate(root=document){
    root.querySelectorAll('#frontOfficeRoot .tb-mini-pos, #frontOfficeRoot .tb-support-pos, #frontOfficeRoot .tb-position').forEach(badge=>{
      const pos=normalize(badge.textContent);
      badge.dataset.pos=pos;
      const card=badge.closest('.tb-depth-card,.tb-support-card,.tb-hero-player,.tb-hero');
      if(card)card.dataset.pos=pos;
    });
  }
  function start(){
    const root=document.getElementById('frontOfficeRoot');
    if(!root)return;
    annotate(root);
    const observer=new MutationObserver(()=>annotate(root));
    observer.observe(root,{childList:true,subtree:true});
    window.__THE_BOARD_POSITION_OBSERVER__?.disconnect?.();
    window.__THE_BOARD_POSITION_OBSERVER__=observer;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
