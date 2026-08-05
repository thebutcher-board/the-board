'use strict';
(function(){
  const VERSION='decision-intelligence-3.0.0';
  if(window.__THE_BOARD_DECISION_INTELLIGENCE__===VERSION)return;
  window.__THE_BOARD_DECISION_INTELLIGENCE__=VERSION;
  let enhancing=false;
  let lastRunKey='';
  const VERIFIED_PHOTOS=new Set(['jalen hurts']);

  const num=text=>Number(String(text||'').replace(/[^0-9.-]/g,''))||0;
  const heroName=root=>root.querySelector('.tb-hero-content h2')?.textContent?.trim()||'';
  const initials=name=>String(name||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();

  function compactBench(root){
    root.querySelectorAll('.tb-depth-group').forEach(group=>{
      if(group.querySelector('label')?.textContent?.trim()!=='BENCH'||group.classList.contains('tb-bench-compact'))return;
      const holder=group.querySelector(':scope > div');
      if(!holder)return;
      const cards=[...holder.children];
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
      const badge=node.querySelector('b');
      if(badge)badge.textContent=initials(name);
    });
  }

  function improveCardNames(root){
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      const strong=card.querySelector('.tb-support-copy strong');
      const name=decodeURIComponent(card.dataset.explore||'');
      if(!strong||!name)return;
      card.title=name;
      const parts=name.trim().split(/\s+/);
      if(parts.length>1){
        const last=parts.pop();
        strong.innerHTML=`<span>${parts.join(' ')}</span><span>${last}</span>`;
      }
    });
  }

  function markSelected(root){
    const selected=heroName(root).toLowerCase();
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      const name=decodeURIComponent(card.dataset.explore||'').toLowerCase();
      card.classList.toggle('is-selected',!!selected&&name===selected);
    });
  }

  function statMap(root){
    return [...root.querySelectorAll('.tb-hero-stats span')].reduce((acc,node)=>{
      const key=node.querySelector('small')?.textContent?.trim().toUpperCase();
      const value=node.querySelector('b')?.textContent?.trim();
      if(key)acc[key]=value;
      return acc;
    },{});
  }

  function addConfidence(root){
    const hero=root.querySelector('.tb-hero');
    const header=root.querySelector('.tb-hero-content>header');
    if(!hero||!header||hero.querySelector('.tb-confidence'))return;
    const grade=num(root.querySelector('.tb-hero-grade b')?.textContent);
    const label=grade>=92?'Elite':grade>=84?'Strong':grade>=74?'Playable':'Caution';
    const meter=document.createElement('section');
    meter.className='tb-confidence';
    meter.innerHTML=`<div><small>GOOSE CONFIDENCE</small><strong>${label}</strong></div><div class="tb-confidence-track"><i style="--confidence:${Math.max(0,Math.min(100,grade))}%"></i></div><b>${grade}%</b>`;
    header.insertAdjacentElement('afterend',meter);
  }

  function addWhyAndWindow(root){
    const hero=root.querySelector('.tb-hero');
    const note=root.querySelector('.tb-goose-note');
    if(!hero||!note||hero.querySelector('.tb-why-grid'))return;
    const stats=statMap(root);
    const survives=num(stats.SURVIVES);
    const scarcity=num(stats.SCARCITY);
    const fit=num(stats.FIT);
    const risk=stats.RISK||'Medium';
    const selected=heroName(root);
    const panel=document.createElement('section');
    panel.className='tb-why-grid';
    panel.innerHTML=`
      <div class="tb-why"><small>WHY GOOSE</small><ul><li>${fit>=85?'Elite roster fit':'Improves roster construction'}</li><li>${scarcity>=70?'Tier pressure is rising':'Value remains above market'}</li><li>${100-survives}% chance ${selected} is gone</li><li>${risk} risk profile</li></ul></div>
      <div class="tb-window"><small>OPPORTUNITY WINDOW</small><label>NOW <b>${100-survives}% urgency</b></label><span><i style="--window:${100-survives}%"></i></span><label>NEXT PICK <b>${survives}% survival</b></label><span><i style="--window:${survives}%"></i></span></div>`;
    note.insertAdjacentElement('afterend',panel);
  }

  function addTeamDNA(root){
    const banner=root.querySelector('.tb-roster-banner .tb-banner-head');
    if(!banner||root.querySelector('.tb-team-dna'))return;
    const roster=[];
    try{roster.push(...(window.rosterFor?.(window.state?.profile?.teamName||'The Butcher')||[]))}catch{}
    const highCeiling=roster.filter(p=>Number(p.proj||0)>=300).length;
    const lowRisk=roster.filter(p=>String(p.risk||'')==='Low').length;
    const positions=new Set(roster.map(p=>p.pos));
    const traits=[highCeiling>=2?'High Ceiling':'Building Ceiling',lowRisk>=2?'Stable Core':'Aggressive Build',positions.size>=4?'Balanced':'Position Focus'];
    const dna=document.createElement('div');
    dna.className='tb-team-dna';
    dna.innerHTML=`<small>TEAM DNA</small>${traits.map(t=>`<span>${t}</span>`).join('')}`;
    banner.appendChild(dna);
  }

  function addFallout(root){
    const hero=root.querySelector('.tb-hero');
    const stats=root.querySelector('.tb-hero-stats');
    if(!hero||!stats||hero.querySelector('.tb-fallout'))return;
    const selected=heroName(root);
    const values=statMap(root);
    const survives=num(values.SURVIVES);
    const currentGrade=num(root.querySelector('.tb-hero-grade b')?.textContent);
    const alternatives=[...root.querySelectorAll('.tb-side:first-of-type .tb-support-card')].filter(card=>decodeURIComponent(card.dataset.explore||'')!==selected);
    const next=alternatives[0];
    const nextName=next?decodeURIComponent(next.dataset.explore||''):'Next tier';
    const nextGrade=num(next?.querySelector('.tb-grade')?.textContent);
    const drop=nextGrade?Math.max(0,currentGrade-nextGrade):0;
    const nextMission=root.querySelector('.tb-live-ribbon span:last-child')?.textContent?.replace(' is the next roster mission','')||'Best available';
    const fallout=document.createElement('section');
    fallout.className='tb-fallout';
    fallout.innerHTML=`<div class="tb-fallout-title"><small>IF YOU PASS</small><strong>Decision fallout</strong></div><div><small>GONE BEFORE NEXT PICK</small><b>${100-survives}%</b></div><div><small>NEXT BEST PATH</small><b>${nextName}</b></div><div><small>GRADE DROP</small><b>${drop?`-${drop}`:'—'}</b></div><div><small>NEXT MISSION</small><b>${nextMission}</b></div>`;
    stats.insertAdjacentElement('afterend',fallout);
  }

  function addContextLabels(root){
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      if(card.querySelector('.tb-card-signal'))return;
      const pct=num(card.querySelector('.tb-support-copy footer i:last-child')?.textContent||'');
      const signal=document.createElement('span');
      signal.className='tb-card-signal';
      signal.textContent=pct<=20?'Closing fast':pct<=45?'Toss-up':'Likely there';
      card.appendChild(signal);
    });
  }

  function animateOdds(root){
    root.querySelectorAll('.tb-banner-metrics span').forEach(node=>{
      const key=node.querySelector('small')?.textContent?.trim();
      if(!['PLAYOFF','CHAMPIONSHIP'].includes(key))return;
      const value=num(node.querySelector('b')?.textContent);
      node.style.setProperty('--odds',`${value}%`);
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
    const toast=document.createElement('div');toast.className='tb-run-alert';toast.innerHTML=`<small>DRAFT RUN</small><strong>${run[0]} run detected</strong><span>${run[1]} of the last ${recent.length} picks. Goose recalculated the board.</span>`;document.body.appendChild(toast);requestAnimationFrame(()=>toast.classList.add('is-live'));setTimeout(()=>{toast.classList.remove('is-live');setTimeout(()=>toast.remove(),350)},3300);
  }

  function enhance(){
    if(enhancing)return;
    const root=document.getElementById('frontOfficeRoot');
    if(!root||!root.querySelector('.tb-hero'))return;
    enhancing=true;
    try{compactBench(root);sanitizePhotos(root);improveCardNames(root);markSelected(root);addConfidence(root);addWhyAndWindow(root);addFallout(root);addContextLabels(root);addTeamDNA(root);animateOdds(root);detectRun();}finally{enhancing=false;}
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  function boot(){const root=document.getElementById('frontOfficeRoot');if(!root){setTimeout(boot,150);return;}observer.observe(root,{childList:true,subtree:true});enhance();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();