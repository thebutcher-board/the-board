'use strict';
(function(){
  const VERSION='decision-intelligence-2.0.0';
  if(window.__THE_BOARD_DECISION_INTELLIGENCE__===VERSION)return;
  window.__THE_BOARD_DECISION_INTELLIGENCE__=VERSION;
  let enhancing=false;
  let lastRunKey='';

  const num=text=>Number(String(text||'').replace(/[^0-9.-]/g,''))||0;
  const heroName=root=>root.querySelector('.tb-hero-content h2')?.textContent?.trim()||'';

  function markSelected(root){
    const selected=heroName(root).toLowerCase();
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      const name=decodeURIComponent(card.dataset.explore||'').toLowerCase();
      card.classList.toggle('is-selected',!!selected&&name===selected);
    });
  }

  function addFallout(root){
    const hero=root.querySelector('.tb-hero');
    const stats=root.querySelector('.tb-hero-stats');
    if(!hero||!stats||hero.querySelector('.tb-fallout'))return;

    const selected=heroName(root);
    const statValues=[...stats.querySelectorAll('span')].reduce((acc,node)=>{
      const key=node.querySelector('small')?.textContent?.trim().toUpperCase();
      const value=node.querySelector('b')?.textContent?.trim();
      if(key)acc[key]=value;
      return acc;
    },{});
    const survives=num(statValues.SURVIVES);
    const gone=Math.max(0,100-survives);
    const currentGrade=num(root.querySelector('.tb-hero-grade b')?.textContent);
    const alternatives=[...root.querySelectorAll('.tb-side:first-of-type .tb-support-card')]
      .filter(card=>decodeURIComponent(card.dataset.explore||'')!==selected);
    const next=alternatives[0];
    const nextName=next?decodeURIComponent(next.dataset.explore||''):'Next tier';
    const nextGrade=num(next?.querySelector('.tb-grade')?.textContent);
    const drop=nextGrade?Math.max(0,currentGrade-nextGrade):0;
    const nextMission=root.querySelector('.tb-live-ribbon span:last-child')?.textContent?.replace(' is the next roster mission','')||'Best available';

    const fallout=document.createElement('section');
    fallout.className='tb-fallout';
    fallout.innerHTML=`
      <div class="tb-fallout-title"><small>IF YOU PASS</small><strong>Decision fallout</strong></div>
      <div><small>GONE BEFORE NEXT PICK</small><b>${gone}%</b></div>
      <div><small>NEXT BEST PATH</small><b>${nextName}</b></div>
      <div><small>GRADE DROP</small><b>${drop?`-${drop}`:'—'}</b></div>
      <div><small>NEXT MISSION</small><b>${nextMission}</b></div>`;
    stats.insertAdjacentElement('afterend',fallout);
  }

  function addContextLabels(root){
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      if(card.querySelector('.tb-card-signal'))return;
      const live=card.querySelector('.tb-support-copy footer i:last-child')?.textContent||'';
      const pct=num(live);
      const signal=document.createElement('span');
      signal.className='tb-card-signal';
      signal.textContent=pct<=20?'Closing fast':pct<=45?'Toss-up':'Likely there';
      card.appendChild(signal);
    });
  }

  function detectRun(root){
    let drafted=[];
    try{drafted=window.state?.drafted||[]}catch{}
    if(drafted.length<3)return;
    const recent=drafted.slice(-4).map(x=>x?.player||x).map(x=>x?.pos).filter(Boolean);
    if(recent.length<3)return;
    const counts=recent.reduce((a,p)=>(a[p]=(a[p]||0)+1,a),{});
    const run=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    if(!run||run[1]<3)return;
    const key=`${drafted.length}-${run[0]}-${run[1]}`;
    if(key===lastRunKey)return;
    lastRunKey=key;
    const toast=document.createElement('div');
    toast.className='tb-run-alert';
    toast.innerHTML=`<small>DRAFT RUN</small><strong>${run[0]} run detected</strong><span>${run[1]} of the last ${recent.length} picks. Goose has recalculated the board.</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(()=>toast.classList.add('is-live'));
    setTimeout(()=>{toast.classList.remove('is-live');setTimeout(()=>toast.remove(),350)},3300);
  }

  function enhance(){
    if(enhancing)return;
    const root=document.getElementById('frontOfficeRoot');
    if(!root||!root.querySelector('.tb-hero'))return;
    enhancing=true;
    try{
      markSelected(root);
      addFallout(root);
      addContextLabels(root);
      detectRun(root);
    }finally{enhancing=false;}
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  function boot(){
    const root=document.getElementById('frontOfficeRoot');
    if(!root){setTimeout(boot,150);return;}
    observer.observe(root,{childList:true,subtree:true});
    enhance();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();