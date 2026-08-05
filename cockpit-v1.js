'use strict';
(function(){
  const VERSION='cockpit-1.0.0';
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const drafted=()=>window.state?.drafted||[];
  const ranked=()=>{try{return window.ranked?.()||[]}catch{return[]}};
  const ownerAt=i=>{try{return window.draftOrderAt?.(i)||'League'}catch{return'League'}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currentPick=()=>drafted().length;
  const pickLabel=i=>{const teams=Math.max(1,Number(window.state?.profile?.teamCount||10));return `${Math.floor(i/teams)+1}.${String((i%teams)+1).padStart(2,'0')}`};

  function predictionFor(index){
    const pool=ranked();
    if(index<drafted().length){const d=drafted()[index];return d?.player?.name||d?.name||'Drafted';}
    const offset=index-drafted().length;
    return pool[offset]?.name||'Open';
  }

  function buildRail(){
    const start=currentPick();
    const tiles=Array.from({length:10},(_,n)=>{
      const i=start+n,owner=ownerAt(i),player=predictionFor(i),mine=owner===teamName();
      return `<div class="tb-pick-tile ${n===0?'is-current':''} ${mine?'is-yours':''}"><small>${esc(pickLabel(i))} · ${esc(owner)}</small><b>${esc(player)}</b><span>${n===0?'ON THE CLOCK':mine?'YOUR PICK':'PROJECTED'}</span></div>`;
    }).join('');
    return `<section class="tb-live-rail" aria-label="Live draft flow">
      <div class="tb-live-status"><small>LIVE DRAFT</small><strong>${esc(ownerAt(start))}</strong><span>Pick ${esc(pickLabel(start))} · ${Math.max(0,Array.from({length:30},(_,i)=>i+1).find(i=>ownerAt(start+i)===teamName())||0)} picks until you</span></div>
      <div class="tb-pick-track">${tiles}</div>
      <div class="tb-draft-next"><small>GOOSE FORECAST</small><b>${esc(predictionFor(start))}</b><span>Current projected selection</span></div>
    </section>`;
  }

  function playerRows(players){
    return players.slice(0,24).map((p,i)=>`<div class="tb-drawer-player"><div><small>${esc(p.pos||'—')} · ${esc(p.team||'—')}</small><b>${esc(p.name)}</b></div><span>${Math.round(Number(p.proj||0))} pts</span></div>`).join('');
  }

  function rosterRows(){
    let roster=[];try{roster=(window.rosterFor?.(teamName())||[]).map(x=>window.playerByName?.(x.name)||x)}catch{}
    return playerRows(roster);
  }

  function drawerPanel(id){
    const pool=ranked();
    if(id==='players')return `<div class="tb-drawer-player-grid">${playerRows(pool)}</div>`;
    if(id==='team')return `<div class="tb-drawer-player-grid">${rosterRows()||'<div class="tb-drawer-empty">Your roster will populate as you draft.</div>'}</div>`;
    if(id==='queue'||id==='targets')return `<div class="tb-drawer-player-grid">${playerRows(pool.slice(0,12))}</div>`;
    if(id==='analytics')return `<div class="tb-drawer-empty">Goose analytics will live here: survival odds, tier pressure, roster fit and scenario comparisons.</div>`;
    if(id==='history')return `<div class="tb-drawer-player-grid">${playerRows(drafted().map(d=>d.player||d).filter(Boolean))}</div>`;
    return `<div class="tb-drawer-empty">League tendencies and upcoming owner needs will live here.</div>`;
  }

  function buildDrawer(){
    const tabs=[['players','Players'],['queue','Queue'],['team','My Team'],['targets','Targets'],['analytics','Analytics'],['history','History'],['league','League']];
    return `<section class="tb-command-drawer" aria-label="Draft command drawer">
      <button class="tb-drawer-handle" aria-label="Open command drawer" aria-expanded="false"></button>
      <nav class="tb-drawer-bar">${tabs.map(([id,label],i)=>`<button class="tb-drawer-tab ${i===0?'is-active':''}" data-drawer-tab="${id}">${label}</button>`).join('')}</nav>
      <div class="tb-drawer-content">${tabs.map(([id],i)=>`<div class="tb-drawer-panel ${i===0?'is-active':''}" data-drawer-panel="${id}">${drawerPanel(id)}</div>`).join('')}</div>
    </section>`;
  }

  function wire(root){
    const drawer=root.querySelector('.tb-command-drawer'),handle=root.querySelector('.tb-drawer-handle');
    if(!drawer||!handle)return;
    const toggle=force=>{const open=typeof force==='boolean'?force:!drawer.classList.contains('is-open');drawer.classList.toggle('is-open',open);handle.setAttribute('aria-expanded',String(open));handle.setAttribute('aria-label',open?'Close command drawer':'Open command drawer');};
    handle.onclick=()=>toggle();
    root.querySelectorAll('[data-drawer-tab]').forEach(btn=>btn.onclick=()=>{
      root.querySelectorAll('[data-drawer-tab]').forEach(x=>x.classList.toggle('is-active',x===btn));
      root.querySelectorAll('[data-drawer-panel]').forEach(x=>x.classList.toggle('is-active',x.dataset.drawerPanel===btn.dataset.drawerTab));
      toggle(true);
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false)});
  }

  function apply(){
    const surface=document.querySelector('#frontOfficeRoot .tb-command-surface');
    if(!surface||surface.dataset.cockpitVersion===VERSION)return false;
    surface.dataset.cockpitVersion=VERSION;
    surface.querySelectorAll('.tb-live-rail,.tb-command-drawer').forEach(n=>n.remove());
    surface.insertAdjacentHTML('afterbegin',buildRail());
    surface.insertAdjacentHTML('beforeend',buildDrawer());
    wire(surface);
    return true;
  }

  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()});}
  const observer=new MutationObserver(schedule);
  function boot(){schedule();const root=document.getElementById('frontOfficeRoot');if(root)observer.observe(root,{childList:true,subtree:false});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.BoardCockpitV1={apply};
})();
