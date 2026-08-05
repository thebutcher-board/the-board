'use strict';
(function(){
  const VERSION='cockpit-v2.0.0';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const drafted=()=>window.state?.drafted||[];
  const ranked=()=>{try{return window.ranked?.()||[]}catch{return[]}};
  const ownerAt=i=>{try{return window.draftOrderAt?.(i)||'League'}catch{return'League'}};
  const roster=()=>{try{return (window.rosterFor?.(teamName())||[]).map(p=>window.playerByName?.(p.name)||p)}catch{return[]}};
  const currentPick=()=>drafted().length;
  const pickLabel=i=>{const teams=Math.max(1,Number(window.state?.profile?.teamCount||10));return `${Math.floor(i/teams)+1}.${String((i%teams)+1).padStart(2,'0')}`};
  const playerAt=i=>i<drafted().length?(drafted()[i]?.player||drafted()[i]||null):ranked()[i-drafted().length]||null;
  const nameOf=p=>p?.name||p?.fullName||p?.player_name||'Open';
  const posOf=p=>String(p?.pos||p?.position||'').toUpperCase()||'—';
  const teamOf=p=>p?.team||p?.nflTeam||p?.pro_team||'—';
  const byeOf=p=>p?.bye??p?.byeWeek??p?.bye_week??'—';
  const photoOf=p=>p?.photo||p?.image||p?.headshot||p?.avatar||p?.img||p?.photoUrl||p?.imageUrl||p?.headshot_url||'';
  const initials=n=>String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'—';

  function photo(p,cls=''){
    const n=nameOf(p),src=photoOf(p);
    return `<span class="tbv2-photo ${cls}">${src?`<img src="${esc(src)}" alt="${esc(n)}" onerror="this.remove();this.nextElementSibling.hidden=false"><b hidden>${esc(initials(n))}</b>`:`<b>${esc(initials(n))}</b>`}</span>`;
  }
  function picksUntilMine(start){for(let i=0;i<40;i+=1)if(ownerAt(start+i)===teamName())return i;return 0;}
  function metricValue(label){
    const map={PROJECTED_PTS:'#frontOfficeRoot .tb-banner-metrics span:nth-child(1) b',PLAYOFF:'#frontOfficeRoot .tb-banner-metrics span:nth-child(2) b',CHAMPIONSHIP:'#frontOfficeRoot .tb-banner-metrics span:nth-child(3) b'};
    return document.querySelector(map[label])?.textContent?.trim()||'—';
  }

  function universalCard(p,{context='',status='',score='',owner='',pick='',state='',size='compact'}={}){
    const pos=posOf(p).toLowerCase();
    return `<article class="tbv2-player-card tbv2-${size} pos-${esc(pos)} ${esc(state)}" data-player="${encodeURIComponent(nameOf(p))}">
      <div class="tbv2-card-top"><span class="tbv2-pos">${esc(posOf(p))}</span>${pick?`<small>${esc(pick)}</small>`:''}${score?`<strong>${esc(score)}</strong>`:''}</div>
      <div class="tbv2-card-body">${photo(p,'tbv2-card-photo')}<div class="tbv2-card-copy">${context?`<small>${esc(context)}</small>`:''}<b title="${esc(nameOf(p))}">${esc(nameOf(p))}</b><span>${esc(teamOf(p))} · BYE ${esc(byeOf(p))}</span>${owner?`<em>${esc(owner)}</em>`:''}</div></div>
      ${status?`<footer>${esc(status)}</footer>`:''}
    </article>`;
  }

  function integratedHeader(){
    return `<header class="tbv2-header">
      <div class="tbv2-brand"><img src="board-logo.svg" alt="THE BOARD"><div><b>THE BOARD</b><small>WIN BEFORE THE CLOCK STARTS</small></div></div>
      <nav class="tbv2-nav" aria-label="Cockpit navigation">
        <button class="is-active" data-v2-view="warroom">Draft</button><button data-v2-view="board">Board</button><button data-v2-view="database">Players</button><button data-v2-view="league">League</button><button data-v2-view="history">History</button>
      </nav>
      <div class="tbv2-team"><img src="logo.png" alt="${esc(teamName())}"><div><small>YOUR FRANCHISE</small><b>${esc(teamName())}</b></div></div>
      <button class="tbv2-settings" aria-label="Settings">⚙</button>
    </header>`;
  }

  function liveRail(){
    const start=currentPick();
    const cards=Array.from({length:10},(_,n)=>{
      const idx=start+n,p=playerAt(idx),owner=ownerAt(idx),mine=owner===teamName();
      return universalCard(p,{context:owner,status:n===0?'ON THE CLOCK':mine?'YOUR PICK':'PROJECTED',pick:pickLabel(idx),state:n===0?'is-current':mine?'is-yours':'',size:'live'});
    }).join('');
    const forecast=playerAt(start);
    return `<section class="tbv2-live-zone">
      <div class="tbv2-live-meta"><span><small>LIVE DRAFT</small><b>${esc(ownerAt(start))}</b></span><span><small>PICK</small><b>${esc(pickLabel(start))}</b></span></div>
      <div class="tbv2-live-track">${cards}</div>
      <div class="tbv2-forecast"><small>GOOSE FORECAST</small><b>${esc(nameOf(forecast))}</b><span>${picksUntilMine(start)} picks until your turn</span></div>
    </section>`;
  }

  function contextStrip(){
    const cards=roster().slice(0,10).map(p=>universalCard(p,{size:'roster'})).join('');
    return `<section class="tbv2-context">
      <div class="tbv2-metrics"><span><small>PROJECTED</small><b>${metricValue('PROJECTED_PTS')}</b></span><span><small>PLAYOFF</small><b>${metricValue('PLAYOFF')}</b></span><span><small>CHAMPIONSHIP</small><b>${metricValue('CHAMPIONSHIP')}</b></span><span><small>PICKS UNTIL YOU</small><b>${picksUntilMine(currentPick())}</b></span></div>
      <div class="tbv2-roster"><small>LIVE ROSTER</small><div>${cards||'<span class="tbv2-empty">Your roster populates as you draft.</span>'}</div></div>
    </section>`;
  }

  function drawerRows(players){return players.slice(0,30).map(p=>`<button class="tbv2-drawer-row" data-player="${encodeURIComponent(nameOf(p))}">${photo(p,'tbv2-row-photo')}<span><b>${esc(nameOf(p))}</b><small>${esc(posOf(p))} · ${esc(teamOf(p))} · BYE ${esc(byeOf(p))}</small></span><em>${Math.round(Number(p?.proj||0))}</em></button>`).join('');}
  function panel(id){const pool=ranked();if(id==='players')return drawerRows(pool);if(id==='team')return drawerRows(roster());if(id==='queue'||id==='targets')return drawerRows(pool.slice(0,15));if(id==='history')return drawerRows(drafted().map(x=>x.player||x).filter(Boolean));return `<div class="tbv2-drawer-message">${id==='analytics'?'Survival odds, scarcity, roster fit and scenario comparisons will live here.':'League tendencies and owner needs will live here.'}</div>`;}
  function drawer(){const tabs=[['players','Players'],['queue','Queue'],['team','My Team'],['targets','Targets'],['analytics','Analytics'],['history','History'],['league','League']];return `<section class="tbv2-drawer"><button class="tbv2-handle" aria-expanded="false"><span></span></button><nav>${tabs.map(([id,label],i)=>`<button class="${i===0?'is-active':''}" data-v2-tab="${id}">${label}</button>`).join('')}</nav><div class="tbv2-filters"><button class="is-active">ALL</button><button>QB</button><button>RB</button><button>WR</button><button>TE</button><button>FLEX</button><button>K</button><button>DEF</button></div><div class="tbv2-panels">${tabs.map(([id],i)=>`<div class="${i===0?'is-active':''}" data-v2-panel="${id}">${panel(id)}</div>`).join('')}</div></section>`;}

  function rebuild(){
    const surface=document.querySelector('#frontOfficeRoot .tb-command-surface');if(!surface||surface.dataset.v2===VERSION)return false;
    surface.dataset.v2=VERSION;
    document.body.classList.add('tbv2-active');
    surface.querySelectorAll('.tb-live-rail,.tb-command-drawer,.tbv2-header,.tbv2-live-zone,.tbv2-context,.tbv2-drawer').forEach(n=>n.remove());
    const oldBanner=surface.querySelector('.tb-roster-banner');if(oldBanner)oldBanner.hidden=true;
    const perfect=surface.querySelector('.tb-perfect-banner');if(perfect)perfect.hidden=true;
    surface.insertAdjacentHTML('afterbegin',integratedHeader()+liveRail()+contextStrip());
    surface.insertAdjacentHTML('beforeend',drawer());
    wire(surface);return true;
  }
  function wire(root){
    root.querySelectorAll('[data-v2-view]').forEach(btn=>btn.onclick=()=>document.querySelector(`.tabs .tab[data-view="${btn.dataset.v2View}"]`)?.click());
    root.querySelector('.tbv2-settings')?.addEventListener('click',()=>document.getElementById('settingsBtn')?.click());
    root.querySelectorAll('[data-player]').forEach(card=>card.onclick=()=>window.openPlayerDetails?.(decodeURIComponent(card.dataset.player)));
    const drawer=root.querySelector('.tbv2-drawer'),handle=root.querySelector('.tbv2-handle');
    const toggle=open=>{drawer.classList.toggle('is-open',open);handle.setAttribute('aria-expanded',String(open));};
    handle.onclick=()=>toggle(!drawer.classList.contains('is-open'));
    root.querySelectorAll('[data-v2-tab]').forEach(btn=>btn.onclick=()=>{root.querySelectorAll('[data-v2-tab]').forEach(x=>x.classList.toggle('is-active',x===btn));root.querySelectorAll('[data-v2-panel]').forEach(x=>x.classList.toggle('is-active',x.dataset.v2Panel===btn.dataset.v2Tab));toggle(true);});
  }
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;rebuild()});}
  function boot(){schedule();const root=document.getElementById('frontOfficeRoot');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:false});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.BoardCockpitV2={apply:rebuild};
})();