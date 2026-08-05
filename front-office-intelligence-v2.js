'use strict';
(function(){
  const VERSION='front-office-liquid-5.0.0';
  if(window.__THE_BOARD_DECISION_INTELLIGENCE__===VERSION)return;
  window.__THE_BOARD_DECISION_INTELLIGENCE__=VERSION;
  let enhancing=false,lastRunKey='';
  const num=text=>Number(String(text||'').replace(/[^0-9.-]/g,''))||0;

  function compactBench(root){
    root.querySelectorAll('.tb-depth-group').forEach(group=>{
      if(group.querySelector('label')?.textContent?.trim()!=='BENCH')return;
      const holder=group.querySelector(':scope > div');if(!holder)return;
      const cards=[...holder.querySelectorAll(':scope > .tb-depth-card, :scope > .tb-bench-pair > .tb-depth-card')];
      if(cards.length!==6)return;
      holder.replaceChildren();
      for(let i=0;i<3;i++){
        const pair=document.createElement('div');pair.className='tb-bench-pair';cards.slice(i*2,i*2+2).forEach(card=>pair.appendChild(card));holder.appendChild(pair);
      }
      group.classList.add('tb-bench-compact');
    });
  }
  function improveCardNames(root){
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      const strong=card.querySelector('.tb-support-copy strong'),name=decodeURIComponent(card.dataset.explore||'').trim();
      if(!strong||!name)return;card.title=name;strong.textContent=name;
    });
  }
  function markSelected(root){
    const selected=root.querySelector('.tb-hero-identity h2')?.textContent?.trim().toLowerCase()||'';
    root.querySelectorAll('.tb-support-card').forEach(card=>card.classList.toggle('is-selected',decodeURIComponent(card.dataset.explore||'').toLowerCase()===selected));
  }
  function addTeamDNA(root){
    const franchise=root.querySelector('.tb-franchise');if(!franchise||root.querySelector('.tb-team-dna'))return;
    const dna=document.createElement('div');dna.className='tb-team-dna';dna.innerHTML='<small>TEAM DNA</small><span>Building Ceiling</span><span>Aggressive Build</span><span>Balanced</span>';franchise.appendChild(dna);
  }
  function animateOdds(root){
    root.querySelectorAll('.tb-banner-metrics span').forEach(node=>{
      const key=node.querySelector('small')?.textContent?.trim();if(!['PLAYOFF','CHAMPIONSHIP'].includes(key))return;
      node.style.setProperty('--odds',`${num(node.querySelector('b')?.textContent)}%`);node.classList.add('tb-live-odds');
    });
  }
  function detectRun(){
    let drafted=[];try{drafted=window.state?.drafted||[]}catch{}
    if(drafted.length<3)return;
    const recent=drafted.slice(-4).map(x=>x?.player||x).map(x=>x?.pos).filter(Boolean),counts=recent.reduce((a,p)=>(a[p]=(a[p]||0)+1,a),{}),run=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    if(!run||run[1]<3)return;
    const key=`${drafted.length}-${run[0]}-${run[1]}`;if(key===lastRunKey)return;lastRunKey=key;
    const toast=document.createElement('div');toast.className='tb-run-alert';toast.innerHTML=`<small>DRAFT RUN</small><strong>${run[0]} run detected</strong><span>${run[1]} of the last ${recent.length} picks. Goose recalculated the board.</span>`;document.body.appendChild(toast);requestAnimationFrame(()=>toast.classList.add('is-live'));setTimeout(()=>{toast.classList.remove('is-live');setTimeout(()=>toast.remove(),350)},3300);
  }
  function enhance(){
    if(enhancing)return;const root=document.getElementById('frontOfficeRoot');if(!root||!root.querySelector('.tb-hero'))return;enhancing=true;
    try{compactBench(root);improveCardNames(root);markSelected(root);addTeamDNA(root);animateOdds(root);detectRun();}finally{enhancing=false;}
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  function boot(){const root=document.getElementById('frontOfficeRoot');if(!root){setTimeout(boot,150);return;}observer.observe(root,{childList:true,subtree:true});enhance();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();