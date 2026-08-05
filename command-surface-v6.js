'use strict';
(function(){
  const VERSION='command-surface-v6';
  if(window.__TB_COMMAND_SURFACE__===VERSION)return;
  window.__TB_COMMAND_SURFACE__=VERSION;

  const clean=v=>String(v||'').trim();
  const getTeam=()=>window.state?.profile?.teamName||'The Butcher';
  const currentOwner=()=>{try{return window.draftOrderAt?.(window.state?.drafted?.length||0)||'League'}catch{return'League'}};
  const currentRoster=()=>{try{return window.rosterFor?.(getTeam())||[]}catch{return[]}};

  function priority(){
    const roster=currentRoster();
    const counts=roster.reduce((a,p)=>{const pos=p?.pos||window.playerByName?.(p?.name)?.pos;a[pos]=(a[pos]||0)+1;return a;},{});
    const targets={QB:2,RB:2,WR:2,TE:1};
    return ['QB','RB','WR','TE'].find(pos=>(counts[pos]||0)<targets[pos])||'WR';
  }

  function tickerMessage(root){
    const hero=root.querySelector('.tb-hero');
    const name=clean(hero?.querySelector('.tb-hero-identity h2')?.textContent)||'top target';
    const survives=clean([...root.querySelectorAll('.tb-hero-stats span')].find(x=>x.querySelector('small')?.textContent==='SURVIVES')?.querySelector('b')?.textContent)||'—';
    const pos=priority();
    const gone=survives==='—'?'':`${Math.max(0,100-parseInt(survives,10))}% chance ${name} is gone`;
    const owner=currentOwner();
    const ribbon=root.querySelector('.tb-live-ribbon');
    if(!ribbon)return;
    ribbon.setAttribute('role','status');
    ribbon.setAttribute('aria-live','polite');
    ribbon.innerHTML=`<b>GOOSE INTEL</b><span>${owner} is selecting</span><span>${gone||`${name} market updating`}</span><span>${pos} pressure is building</span>`;
  }

  function normalizeCards(root){
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      const name=clean(card.getAttribute('title'));
      const strong=card.querySelector('.tb-support-copy strong');
      if(strong&&name){strong.textContent=name;strong.title=name;}
      const img=card.querySelector('img');
      if(img&&name)img.alt=name;
    });
  }

  function apply(){
    const root=document.getElementById('frontOfficeRoot');
    if(!root)return;
    tickerMessage(root);
    normalizeCards(root);
  }

  let raf=0;
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(apply);};
  const observer=new MutationObserver(schedule);
  function start(){
    const root=document.getElementById('frontOfficeRoot');
    if(!root){setTimeout(start,120);return;}
    observer.observe(root,{childList:true,subtree:true});
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();