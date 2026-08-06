'use strict';
(function(){
  const VERSION='cockpit-v5.2.0';
  const PHOTO_IDS={
    'jalen hurts':'6904','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786','trey mcbride':'8151','ashton jeanty':'12526',
    'brock purdy':'7523','jared goff':'5857','matthew stafford':'421','jaxson dart':'12507','patrick mahomes':'4046','c.j. stroud':'9758',
    'cam ward':'12522','jordan love':'6804','daniel jones':'5849','baker mayfield':'4892','garrett wilson':'8146','davante adams':'2133',
    'brandon aubrey':'11628','jeremiyah love':'12531','jaylen waddle':'7561','courtland sutton':'5133','dak prescott':'3294',
    'aaron rodgers':'96','kyren williams':'8154','treveyon henderson':'12524','carnell tate':'12545','dj moore':'4983',
    'luther burden iii':'12541','michael pittman jr.':'6819','matthew golden':'12543','alec pierce':'8149','marvin harrison jr.':'11565',
    'bucky irving':'11604','quinshon judkins':'12528','tyler shough':'12513'
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cleanName=n=>String(n||'').replace(/…/g,'').trim().toLowerCase();
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const teamCount=()=>Math.max(1,Number(window.state?.profile?.teamCount||10));
  const drafted=()=>window.state?.drafted||[];
  const keepers=()=>window.state?.keepers||window.state?.profile?.keepers||[];
  const ranked=()=>{try{return window.ranked?.()||[]}catch{return[]}};
  const ownerAt=i=>{try{return window.draftOrderAt?.(i)||'League'}catch{return'League'}};
  const roster=()=>{try{return (window.rosterFor?.(teamName())||[]).map(p=>window.playerByName?.(p.name)||p)}catch{return[]}};
  const nameOf=p=>p?.name||p?.fullName||p?.player_name||'Open';
  const posOf=p=>String(p?.pos||p?.position||'').toUpperCase()||'—';
  const teamOf=p=>p?.team||p?.nflTeam||p?.pro_team||'—';
  const byeOf=p=>p?.bye??p?.byeWeek??p?.bye_week??'—';
  const initials=n=>String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'—';
  const pickLabel=i=>`${Math.floor(i/teamCount())+1}.${String((i%teamCount())+1).padStart(2,'0')}`;
  const splitName=n=>{const a=String(n||'Open').trim().split(/\s+/);return[a.shift()||'Open',a.join(' ')]};
  const playerAt=i=>i<drafted().length?(drafted()[i]?.player||drafted()[i]||null):ranked()[i-drafted().length]||null;
  const picksUntilMine=start=>{for(let i=0;i<40;i++)if(ownerAt(start+i)===teamName())return i;return 0};
  const photoSrc=p=>{
    const direct=p?.photo||p?.image||p?.headshot||p?.avatar||p?.img||p?.photoUrl||p?.imageUrl||p?.headshot_url;
    if(direct)return direct;
    const id=PHOTO_IDS[cleanName(nameOf(p))];
    return id?`https://sleepercdn.com/content/nfl/players/${id}.jpg`:'';
  };
  function photo(p,cls=''){
    const n=nameOf(p),src=photoSrc(p);
    return `<span class="tbv52-photo ${cls}">${src?`<img src="${esc(src)}" alt="${esc(n)}" loading="eager" decoding="async" onerror="this.remove();this.nextElementSibling.hidden=false"><b hidden>${esc(initials(n))}</b>`:`<b>${esc(initials(n))}</b>`}</span>`;
  }
  function stacked(p){const[f,l]=splitName(nameOf(p));return `<b class="tbv52-name"><span>${esc(f)}</span>${l?`<span>${esc(l)}</span>`:''}</b>`}
  function gradeFor(p,index=0){const proj=Number(p?.proj||0);return Math.max(55,Math.min(97,Math.round(62+proj/18-index*.7)))}
  function projectedCard(p,{pick='',owner='',status='',state=''}={}){
    const pos=posOf(p).toLowerCase();
    return `<article class="tbv52-pick pos-${esc(pos)} ${esc(state)}" data-player="${encodeURIComponent(nameOf(p))}"><header><span>${esc(posOf(p))}</span><small>${esc(pick)}</small></header><main>${photo(p,'tbv52-pick-photo')}<div>${owner?`<small class="tbv52-owner">${esc(owner)}</small>`:''}${stacked(p)}<em>${esc(teamOf(p))} · BYE ${esc(byeOf(p))}</em></div></main><footer>${esc(status)}</footer></article>`;
  }
  function sideCard(p,label,index){
    const pos=posOf(p).toLowerCase();
    const probability=label==='Next pick'?Math.max(8,88-index*7):Math.min(92,38+index*6);
    return `<button class="tbv52-side-card pos-${esc(pos)}" data-player="${encodeURIComponent(nameOf(p))}"><header><span>${esc(posOf(p))}</span><small>${esc(label)}</small><b>${gradeFor(p,index)}</b></header><div>${photo(p,'tbv52-side-photo')}<section>${stacked(p)}<em>${esc(teamOf(p))} · BYE ${esc(byeOf(p))}</em><footer><i>${Math.round(Number(p?.proj||0))} pts</i><i>${probability}% ${label==='Next pick'?'available':'pass risk'}</i></footer></section></div></button>`;
  }
  function header(){return `<header class="tbv52-header"><div class="tbv52-brand"><img src="board-logo.svg" alt="THE BOARD"><div><b>THE BOARD</b><small>WIN BEFORE THE CLOCK STARTS</small></div></div><nav><button class="is-active" data-v52-view="warroom">Draft</button><button data-v52-view="board">Board</button><button data-v52-view="database">Players</button><button data-v52-view="league">League</button><button data-v52-view="history">History</button></nav><div class="tbv52-team"><img src="logo.png" alt="${esc(teamName())}"><div><small>YOUR FRANCHISE</small><b>${esc(teamName())}</b></div></div><button class="tbv52-settings" type="button" aria-label="Open draft settings">⚙</button></header>`}
  function projectedRail(){const start=drafted().length;return `<section class="tbv52-projected"><div class="tbv52-projected-label"><b>NEXT TEN PROJECTED PICKS</b></div><div class="tbv52-projected-track">${Array.from({length:10},(_,n)=>{const idx=start+n,p=playerAt(idx),owner=ownerAt(idx),mine=owner===teamName();return projectedCard(p,{pick:pickLabel(idx),owner,status:n===0?'ON THE CLOCK':mine?'YOUR PICK':'PROJECTED',state:n===0?'is-current':mine?'is-yours':''})}).join('')}</div></section>`}
  function drawerRows(players){return players.slice(0,40).map(p=>`<button class="tbv52-row" data-player="${encodeURIComponent(nameOf(p))}">${photo(p,'tbv52-row-photo')}<span><b>${esc(nameOf(p))}</b><small>${esc(posOf(p))} · ${esc(teamOf(p))} · BYE ${esc(byeOf(p))}</small></span><em>${Math.round(Number(p?.proj||0))}</em></button>`).join('')}
  function teamPanel(){return `<section class="tbv52-team-summary"><div><small>MY TEAM</small><b>${esc(teamName())}</b></div><span><small>NEXT PICK</small><b>${picksUntilMine(drafted().length)}</b></span></section><div class="tbv52-team-grid">${drawerRows(roster())||'<div class="tbv52-message">Your roster populates as picks are made.</div>'}</div>`}
  function panel(id){const pool=ranked();if(id==='players')return drawerRows(pool);if(id==='team')return teamPanel();if(id==='queue'||id==='targets')return drawerRows(pool.slice(0,20));return '<div class="tbv52-message">Survival odds, scarcity, roster fit and scenario comparisons will live here.</div>'}
  function drawer(){const tabs=[['players','Players'],['queue','Queue'],['team','My Team'],['targets','Targets'],['analytics','Analytics']];return `<section class="tbv52-drawer"><button class="tbv52-handle" aria-expanded="false"><span></span></button><nav>${tabs.map(([id,label],i)=>`<button class="${i===0?'is-active':''}" data-v52-tab="${id}">${label}</button>`).join('')}</nav><div class="tbv52-panels">${tabs.map(([id],i)=>`<div class="${i===0?'is-active':''}" data-v52-panel="${id}">${panel(id)}</div>`).join('')}</div></section>`}
  function rebuildSides(surface){
    const all=ranked(),selected=window.__cleanFrontOfficeSelected||all[0]?.name,others=all.filter(p=>nameOf(p)!==selected);
    const left=surface.querySelector('.tb-side.tb-pivots')||surface.querySelectorAll('.tb-side')[0];
    const right=surface.querySelector('.tb-side.tb-future')||surface.querySelectorAll('.tb-side')[1];
    if(left)left.innerHTML=`<h3>Alternate Paths</h3><div class="tbv52-side-grid">${others.slice(0,10).map((p,i)=>sideCard(p,'Alternate',i)).join('')}</div>`;
    const priority=posOf(all.find(p=>nameOf(p)===selected)||all[0]);
    const future=[...others.filter(p=>posOf(p)===priority),...others.filter(p=>posOf(p)!==priority)].slice(0,10);
    if(right)right.innerHTML=`<h3>Likely Available / Next Pick</h3><div class="tbv52-side-grid">${future.map((p,i)=>sideCard(p,'Next pick',i)).join('')}</div>`;
  }
  function renderBoard(){const board=document.getElementById('board');if(!board)return;const teams=Array.from({length:teamCount()},(_,i)=>ownerAt(i)),keeperList=Array.isArray(keepers())?keepers():[],keeperMap=new Map();keeperList.forEach(k=>{const owner=k?.owner||k?.team||k?.teamName||'';if(!keeperMap.has(owner))keeperMap.set(owner,[]);keeperMap.get(owner).push(k?.player||k)});const rounds=Math.max(8,Math.ceil(Math.max(drafted().length,teamCount()*8)/teamCount())),cells=[];for(let r=0;r<rounds;r++)for(let c=0;c<teamCount();c++){const idx=r*teamCount()+c,pick=drafted()[idx],p=pick?.player||pick||null;cells.push(`<article class="tbv52-board-pick"><small>${esc(pickLabel(idx))}</small>${p?`${photo(p,'tbv52-board-photo')}<div>${stacked(p)}<span>${esc(posOf(p))} · ${esc(teamOf(p))}</span></div>`:'<em>Open</em>'}</article>`)}board.innerHTML=`<section class="tbv52-board-shell"><header><h2>THE BOARD</h2><span>${drafted().length} picks made</span></header><div class="tbv52-board-teams">${teams.map(t=>`<div><b>${esc(t)}</b>${(keeperMap.get(t)||[]).slice(0,5).map(p=>`<small>KEEPER · ${esc(nameOf(p))}</small>`).join('')}</div>`).join('')}</div><div class="tbv52-board-grid" style="--teams:${teamCount()}">${cells.join('')}</div></section>`}
  function clean(surface){
    surface.querySelector('.tb-roster-banner')?.setAttribute('hidden','');
    surface.querySelector('.tb-perfect-banner')?.setAttribute('hidden','');
    surface.querySelectorAll('.tb-live-rail,.tb-command-drawer,.tbv2-header,.tbv2-live-zone,.tbv2-context,.tbv2-drawer,.tbv21-team-summary,.tbv3-header,.tbv3-projected,.tbv31-projected,.tbv32-projected,.tbv3-drawer,.tbv4-projected,.tbv4-drawer,.tbv5-header,.tbv5-projected,.tbv5-drawer,.tbv52-header,.tbv52-projected,.tbv52-drawer').forEach(n=>n.remove());
    surface.querySelector('.tb-draft-pulse')?.remove();
    rebuildSides(surface);
  }
  function openSettings(){document.getElementById('settingsBtn')?.click();const modal=document.getElementById('settingsModal');if(modal)modal.hidden=false;const reset=document.getElementById('resetBtn');if(reset){reset.textContent='Reset Draft';reset.removeAttribute('hidden')}}
  function wire(surface){surface.querySelectorAll('[data-v52-view]').forEach(btn=>btn.onclick=()=>{document.querySelector(`.tabs .tab[data-view="${btn.dataset.v52View}"]`)?.click();if(btn.dataset.v52View==='board')setTimeout(renderBoard,0)});surface.querySelector('.tbv52-settings')?.addEventListener('click',openSettings);surface.querySelectorAll('[data-player]').forEach(el=>el.onclick=()=>window.openPlayerDetails?.(decodeURIComponent(el.dataset.player)));const dr=surface.querySelector('.tbv52-drawer'),handle=surface.querySelector('.tbv52-handle');const toggle=open=>{dr.classList.toggle('is-open',open);handle.setAttribute('aria-expanded',String(open))};handle.onclick=()=>toggle(!dr.classList.contains('is-open'));surface.querySelectorAll('[data-v52-tab]').forEach(btn=>btn.onclick=()=>{surface.querySelectorAll('[data-v52-tab]').forEach(x=>x.classList.toggle('is-active',x===btn));surface.querySelectorAll('[data-v52-panel]').forEach(x=>x.classList.toggle('is-active',x.dataset.v52Panel===btn.dataset.v52Tab));toggle(true)})}
  function apply(){const surface=document.querySelector('#frontOfficeRoot .tb-command-surface');if(!surface)return false;surface.dataset.v52=VERSION;document.body.className=document.body.className.replace(/\btbv\S+/g,'').trim();document.body.classList.add('tbv52-active');clean(surface);surface.insertAdjacentHTML('afterbegin',header()+projectedRail());surface.insertAdjacentHTML('beforeend',drawer());wire(surface);renderBoard();document.documentElement.dataset.cockpitReady='true';return true}
  function boot(){window.__TB_COCKPIT_OBSERVER__?.disconnect?.();window.__TB_COCKPIT_OBSERVER__=null;const base=window.renderWarroom;if(base&&!window.__TBV52_WRAPPED__){window.__TBV52_WRAPPED__=true;window.renderWarroom=(...args)=>{const result=base(...args);requestAnimationFrame(apply);return result}}apply()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.BoardCockpitV52={apply,renderBoard,openSettings};
})();