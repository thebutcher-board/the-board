'use strict';
(function(){
  const VERSION='cockpit-v2.1.0';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const teamCount=()=>Math.max(1,Number(window.state?.profile?.teamCount||10));
  const drafted=()=>window.state?.drafted||[];
  const ranked=()=>{try{return window.ranked?.()||[]}catch{return[]}};
  const ownerAt=i=>{try{return window.draftOrderAt?.(i)||'League'}catch{return'League'}};
  const roster=()=>{try{return (window.rosterFor?.(teamName())||[]).map(p=>window.playerByName?.(p.name)||p)}catch{return[]}};
  const nameOf=p=>p?.name||p?.fullName||p?.player_name||'Open';
  const posOf=p=>String(p?.pos||p?.position||'').toUpperCase()||'—';
  const teamOf=p=>p?.team||p?.nflTeam||p?.pro_team||'—';
  const byeOf=p=>p?.bye??p?.byeWeek??p?.bye_week??'—';
  const photoOf=p=>p?.photo||p?.image||p?.headshot||p?.avatar||p?.img||p?.photoUrl||p?.imageUrl||p?.headshot_url||'';
  const initials=n=>String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'—';
  const pickLabel=i=>`${Math.floor(i/teamCount())+1}.${String((i%teamCount())+1).padStart(2,'0')}`;
  const metric=(selector,fallback='—')=>document.querySelector(selector)?.textContent?.trim()||fallback;

  function photo(p){const src=photoOf(p),name=nameOf(p);return `<span class="tbv21-photo">${src?`<img src="${esc(src)}" alt="${esc(name)}" onerror="this.remove();this.nextElementSibling.hidden=false"><b hidden>${esc(initials(name))}</b>`:`<b>${esc(initials(name))}</b>`}</span>`}
  function stackedName(name){const parts=String(name||'Open').trim().split(/\s+/);if(parts.length<2)return `<span>${esc(parts[0]||'Open')}</span>`;return `<span>${esc(parts[0])}</span><span>${esc(parts.slice(1).join(' '))}</span>`}

  function relabelLiveZone(root){
    const meta=root.querySelector('.tbv2-live-meta');
    if(meta)meta.innerHTML='<small>NEXT TEN</small><b>Projected Picks</b><span>Live Goose forecast</span>';
    root.querySelector('.tbv2-live-zone')?.setAttribute('aria-label','Next ten projected picks');
  }

  function moveTeamMetrics(root){
    const context=root.querySelector('.tbv2-context');
    if(context)context.remove();
    const panel=root.querySelector('[data-v2-panel="team"]');
    if(!panel)return;
    const summary=`<section class="tbv21-team-summary"><div><small>YOUR TEAM</small><b>${esc(teamName())}</b></div><span><small>PROJECTED PTS</small><b>${esc(metric('#frontOfficeRoot .tb-banner-metrics span:nth-child(1) b'))}</b></span><span><small>PLAYOFF</small><b>${esc(metric('#frontOfficeRoot .tb-banner-metrics span:nth-child(2) b'))}</b></span><span><small>CHAMPIONSHIP</small><b>${esc(metric('#frontOfficeRoot .tb-banner-metrics span:nth-child(3) b'))}</b></span></section>`;
    const rows=roster().map(p=>`<button class="tbv2-drawer-row" data-player="${encodeURIComponent(nameOf(p))}">${photo(p)}<span><b>${esc(nameOf(p))}</b><small>${esc(posOf(p))} · ${esc(teamOf(p))} · BYE ${esc(byeOf(p))}</small></span><em>${Math.round(Number(p?.proj||0))}</em></button>`).join('');
    panel.innerHTML=summary+`<div class="tbv21-team-roster">${rows||'<div class="tbv2-drawer-message">Your roster populates as picks are made.</div>'}</div>`;
  }

  function trimDrawer(root){
    ['history','league'].forEach(id=>{root.querySelector(`[data-v2-tab="${id}"]`)?.remove();root.querySelector(`[data-v2-panel="${id}"]`)?.remove()});
  }

  function stackSideNames(root){
    root.querySelectorAll('.tb-support-card').forEach(card=>{
      const candidates=[...card.querySelectorAll('b,strong,h4')];
      const el=candidates.find(x=>x.textContent.trim().split(/\s+/).length>1);
      if(el&&!el.dataset.stacked){el.dataset.stacked='true';el.classList.add('tbv21-stacked-name');el.innerHTML=stackedName(el.textContent)}
    });
  }

  function renderLiveBoard(){
    const board=document.getElementById('board');if(!board)return;
    const teams=Array.from({length:teamCount()},(_,i)=>ownerAt(i));
    const rounds=Math.max(6,Math.ceil(Math.max(drafted().length,teamCount()*6)/teamCount()));
    const cells=[];
    for(let r=0;r<rounds;r++){
      for(let c=0;c<teamCount();c++){
        const idx=r*teamCount()+c;
        const pick=drafted()[idx];
        const p=pick?.player||pick||null;
        cells.push(`<article class="tbv21-board-pick ${p?'is-filled':''}"><small>${esc(pickLabel(idx))}</small>${p?`${photo(p)}<div><b>${stackedName(nameOf(p))}</b><span>${esc(posOf(p))} · ${esc(teamOf(p))}</span></div>`:'<em>Open</em>'}</article>`);
      }
    }
    board.innerHTML=`<section class="tbv21-board-shell"><header><div><small>LIVE DRAFT</small><h2>The Board</h2></div><span>${drafted().length} picks made</span></header><div class="tbv21-board-teams">${teams.map(t=>`<b title="${esc(t)}">${esc(t)}</b>`).join('')}</div><div class="tbv21-board-grid" style="--teams:${teamCount()}">${cells.join('')}</div></section>`;
  }

  function rewire(root){
    root.querySelector('[data-v2-view="board"]')?.addEventListener('click',()=>setTimeout(renderLiveBoard,0));
    root.querySelectorAll('[data-player]').forEach(card=>card.onclick=()=>window.openPlayerDetails?.(decodeURIComponent(card.dataset.player)));
  }

  function apply(){
    const root=document.querySelector('#frontOfficeRoot .tb-command-surface');
    if(!root||root.dataset.v21===VERSION)return false;
    root.dataset.v21=VERSION;document.body.classList.add('tbv21-active');
    relabelLiveZone(root);moveTeamMetrics(root);trimDrawer(root);stackSideNames(root);rewire(root);renderLiveBoard();
    return true;
  }
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  function boot(){schedule();const host=document.getElementById('frontOfficeRoot');if(host)new MutationObserver(schedule).observe(host,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.BoardCockpitV21={apply,renderLiveBoard};
})();