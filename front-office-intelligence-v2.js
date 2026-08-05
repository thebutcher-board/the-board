'use strict';
(function(){
  const VERSION='front-office-stable-4.0.0';
  if(window.__THE_BOARD_DECISION_INTELLIGENCE__===VERSION)return;
  window.__THE_BOARD_DECISION_INTELLIGENCE__=VERSION;
  let enhancing=false;
  let lastRunKey='';
  const VERIFIED_PHOTOS=new Set(['jalen hurts']);
  const num=text=>Number(String(text||'').replace(/[^0-9.-]/g,''))||0;
  const initials=name=>String(name||'').trim().split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  const heroName=root=>root.querySelector('.tb-hero-content h2')?.textContent?.trim()||'';

  function resetInjected(root){
    root.querySelectorAll('.tb-confidence,.tb-why-grid,.tb-fallout').forEach(node=>node.remove());
  }

  function compactBench(root){
    root.querySelectorAll('.tb-depth-group').forEach(group=>{
      if(group.querySelector('label')?.textContent?.trim()!=='BENCH')return;
      const holder=group.querySelector(':scope > div');
      if(!holder)return;
      const cards=[...holder.querySelectorAll(':scope > .tb-depth-card, :scope > .tb-bench-pair > .tb-depth-card')];
      if(cards.length!==6)return;
      holder.replaceChildren();
      for(let i=0;i<3;i++){
        const pair=document.createElement('div');
        pair.className='tb-bench-pair';
        cards.slice(i*2,i*2+2).forEach(card=>pair.appendChild(card));
        holder.appendChild(pair);
      }
      group.classList.add('tb-bench-compact');
    });
  }

  function sanitizePhotos(root){
    root.querySelectorAll('.tb-photo[data-photo-name]').forEach(node=>{
      const name=(node.dataset.photoName||'').trim();
      if(VERIFIED_PHOTOS.has(name.toLowerCase()))return;
      node.querySelector('img')?.remove();
      node.classList.add('is-fallback');
      let badge=node.querySelector('b');
      if(!badge){badge=document.createElement('b');node.appendChild(badge)}
      badge.textContent=initials(name);
    });
  }

  function improveCardNames(root){
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      const strong=card.querySelector('.tb-support-copy strong');
      const name=decodeURIComponent(card.dataset.explore||'').trim();
      if(!strong||!name)return;
      card.title=name;
      strong.textContent=name;
    });
  }

  function markSelected(root){
    const selected=heroName(root).toLowerCase();
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      const name=decodeURIComponent(card.dataset.explore||'').toLowerCase();
      card.classList.toggle('is-selected',!!selected&&name===selected);
    });
  }

  function addTeamDNA(root){
    const banner=root.querySelector('.tb-roster-banner .tb-banner-head');
    if(!banner||root.querySelector('.tb-team-dna'))return;
    const dna=document.createElement('div');
    dna.className='tb-team-dna';
    dna.innerHTML='<small>TEAM DNA</small><span>Building Ceiling</span><span>Aggressive Build</span><span>Balanced</span>';
    banner.appendChild(dna);
  }

  function animateOdds(root){
    root.querySelectorAll('.tb-banner-metrics span').forEach(node=>{
      const key=node.querySelector('small')?.textContent?.trim();
      if(!['PLAYOFF','CHAMPIONSHIP'].includes(key))return;
      node.style.setProperty('--odds',`${num(node.querySelector('b')?.textContent)}%`);
      node.classList.add('tb-live-odds');
    });
  }

  function detectRun(){
    let drafted=[];try{drafted=window.state?.drafted||[]}catch{}
    if(drafted.length<3)return;
    const recent=drafted.slice(-4).map(x=>x?.player||x).map(x=>x?.pos).filter(Boolean);
    const counts=recent.reduce((a,p)=>(a[p]=(a[p]||0)+1,a),{});
    const run=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    if(!run||run[1]<3)return;
    const key=`${drafted.length}-${run[0]}-${run[1]}`;if(key===lastRunKey)return;lastRunKey=key;
    const toast=document.createElement('div');
    toast.className='tb-run-alert';
    toast.innerHTML=`<small>DRAFT RUN</small><strong>${run[0]} run detected</strong><span>${run[1]} of the last ${recent.length} picks. Goose recalculated the board.</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(()=>toast.classList.add('is-live'));
    setTimeout(()=>{toast.classList.remove('is-live');setTimeout(()=>toast.remove(),350)},3300);
  }

  function enhance(){
    if(enhancing)return;
    const root=document.getElementById('frontOfficeRoot');
    if(!root||!root.querySelector('.tb-hero'))return;
    enhancing=true;
    try{resetInjected(root);compactBench(root);sanitizePhotos(root);improveCardNames(root);markSelected(root);addTeamDNA(root);animateOdds(root);detectRun();}
    finally{enhancing=false;}
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  function boot(){const root=document.getElementById('frontOfficeRoot');if(!root){setTimeout(boot,150);return;}observer.observe(root,{childList:true,subtree:true});enhance();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();