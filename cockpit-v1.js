'use strict';
(function(){
  const VERSION='cockpit-1.2.0';
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const drafted=()=>window.state?.drafted||[];
  const ranked=()=>{try{return window.ranked?.()||[]}catch{return[]}};
  const ownerAt=i=>{try{return window.draftOrderAt?.(i)||'League'}catch{return'League'}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const currentPick=()=>drafted().length;
  const pickLabel=i=>{const teams=Math.max(1,Number(window.state?.profile?.teamCount||10));return `${Math.floor(i/teams)+1}.${String((i%teams)+1).padStart(2,'0')}`};

  function ensureRefinementStyles(){
    let link=document.querySelector('link[data-cockpit-refinement]');
    if(!link){link=document.createElement('link');link.rel='stylesheet';link.dataset.cockpitRefinement='true';document.head.appendChild(link);}
    link.href='cockpit-v1-1.css?v=1.2.0';
  }

  function playerAt(index){
    if(index<drafted().length){const d=drafted()[index];return d?.player||d||null;}
    return ranked()[index-drafted().length]||null;
  }
  function playerName(p){return p?.name||p?.fullName||p?.player_name||'Open';}
  function playerPos(p){return String(p?.pos||p?.position||'').toUpperCase();}
  function playerTeam(p){return p?.team||p?.nflTeam||p?.pro_team||'—';}
  function playerBye(p){return p?.bye||p?.byeWeek||p?.bye_week||'—';}
  function playerPhoto(p){
    return p?.photo||p?.image||p?.headshot||p?.avatar||p?.img||p?.photoUrl||p?.imageUrl||p?.headshot_url||'';
  }
  function initials(name){return String(name||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'—';}
  function photoMarkup(p){
    const name=playerName(p),src=playerPhoto(p);
    return src?`<img class="tb-live-pick-photo" src="${esc(src)}" alt="${esc(name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="tb-live-pick-fallback" hidden>${esc(initials(name))}</span>`:`<span class="tb-live-pick-fallback">${esc(initials(name))}</span>`;
  }

  function franchiseIdentity(){
    const img=document.querySelector('#frontOfficeRoot .tb-franchise img');
    const src=img?.getAttribute('src')||'';
    const logo=src?`<img src="${esc(src)}" alt="${esc(teamName())} logo">`:'';
    return `<div class="tb-live-franchise">${logo}<div class="tb-live-franchise-copy"><small>Your franchise</small><strong>${esc(teamName())}</strong><span>Live roster · Mission ${Math.max(1,currentPick()+1)}</span></div></div>`;
  }

  function picksUntilMine(start){for(let i=0;i<30;i+=1){if(ownerAt(start+i)===teamName())return i;}return 0;}

  function buildPickTile(index,n){
    const owner=ownerAt(index),p=playerAt(index),mine=owner===teamName(),pos=playerPos(p)||'—';
    const status=n===0?'ON THE CLOCK':mine?'YOUR PICK':'PROJECTED';
    return `<article class="tb-pick-tile pos-${esc(pos.toLowerCase())} ${n===0?'is-current':''} ${mine?'is-yours':''}">
      <div class="tb-live-pick-top"><span class="tb-live-pos">${esc(pos)}</span><small>${esc(pickLabel(index))}</small></div>
      <div class="tb-live-pick-main"><div class="tb-live-pick-avatar">${photoMarkup(p)}</div><div class="tb-live-pick-copy"><b>${esc(playerName(p))}</b><em>${esc(playerTeam(p))} · BYE ${esc(playerBye(p))}</em><small>${esc(owner)}</small></div></div>
      <span class="tb-live-pick-status">${status}</span>
    </article>`;
  }

  function buildRail(){
    const start=currentPick();
    const tiles=Array.from({length:10},(_,n)=>buildPickTile(start+n,n)).join('');
    const forecast=playerAt(start);
    return `<section class="tb-live-rail" aria-label="Live draft flow">
      ${franchiseIdentity()}
      <div class="tb-pick-track">${tiles}</div>
      <div class="tb-draft-next"><small>GOOSE FORECAST</small><b>${esc(playerName(forecast))}</b><span>${picksUntilMine(start)} picks until your turn</span></div>
    </section>`;
  }

  function playerRows(players){return players.slice(0,24).map(p=>`<div class="tb-drawer-player"><div><small>${esc(playerPos(p)||'—')} · ${esc(playerTeam(p))}</small><b>${esc(playerName(p))}</b></div><span>${Math.round(Number(p.proj||0))} pts</span></div>`).join('');}
  function rosterRows(){let roster=[];try{roster=(window.rosterFor?.(teamName())||[]).map(x=>window.playerByName?.(x.name)||x)}catch{}return playerRows(roster);}
  function drawerPanel(id){const pool=ranked();if(id==='players')return `<div class="tb-drawer-player-grid">${playerRows(pool)}</div>`;if(id==='team')return `<div class="tb-drawer-player-grid">${rosterRows()||'<div class="tb-drawer-empty">Your roster will populate as you draft.</div>'}</div>`;if(id==='queue'||id==='targets')return `<div class="tb-drawer-player-grid">${playerRows(pool.slice(0,12))}</div>`;if(id==='analytics')return `<div class="tb-drawer-empty">Goose analytics will live here: survival odds, tier pressure, roster fit and scenario comparisons.</div>`;if(id==='history')return `<div class="tb-drawer-player-grid">${playerRows(drafted().map(d=>d.player||d).filter(Boolean))}</div>`;return `<div class="tb-drawer-empty">League tendencies and upcoming owner needs will live here.</div>`;}
  function buildDrawer(){const tabs=[['players','Players'],['queue','Queue'],['team','My Team'],['targets','Targets'],['analytics','Analytics'],['history','History'],['league','League']];return `<section class="tb-command-drawer" aria-label="Draft command drawer"><button class="tb-drawer-handle" aria-label="Open command drawer" aria-expanded="false"></button><nav class="tb-drawer-bar">${tabs.map(([id,label],i)=>`<button class="tb-drawer-tab ${i===0?'is-active':''}" data-drawer-tab="${id}">${label}</button>`).join('')}</nav><div class="tb-drawer-content">${tabs.map(([id],i)=>`<div class="tb-drawer-panel ${i===0?'is-active':''}" data-drawer-panel="${id}">${drawerPanel(id)}</div>`).join('')}</div></section>`;}
  function wire(root){const drawer=root.querySelector('.tb-command-drawer'),handle=root.querySelector('.tb-drawer-handle');if(!drawer||!handle)return;const toggle=force=>{const open=typeof force==='boolean'?force:!drawer.classList.contains('is-open');drawer.classList.toggle('is-open',open);handle.setAttribute('aria-expanded',String(open));handle.setAttribute('aria-label',open?'Close command drawer':'Open command drawer');};handle.onclick=()=>toggle();root.querySelectorAll('[data-drawer-tab]').forEach(btn=>btn.onclick=()=>{root.querySelectorAll('[data-drawer-tab]').forEach(x=>x.classList.toggle('is-active',x===btn));root.querySelectorAll('[data-drawer-panel]').forEach(x=>x.classList.toggle('is-active',x.dataset.drawerPanel===btn.dataset.drawerTab));toggle(true);});document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false)});}
  function apply(){ensureRefinementStyles();const surface=document.querySelector('#frontOfficeRoot .tb-command-surface');if(!surface||surface.dataset.cockpitVersion===VERSION)return false;surface.dataset.cockpitVersion=VERSION;surface.querySelectorAll('.tb-live-rail,.tb-command-drawer').forEach(n=>n.remove());surface.insertAdjacentHTML('afterbegin',buildRail());surface.insertAdjacentHTML('beforeend',buildDrawer());wire(surface);return true;}
  let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()});}const observer=new MutationObserver(schedule);function boot(){schedule();const root=document.getElementById('frontOfficeRoot');if(root)observer.observe(root,{childList:true,subtree:false});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.BoardCockpitV1={apply};
})();
