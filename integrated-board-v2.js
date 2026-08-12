'use strict';
(function(){
  const VERSION='integrated-board-2.1.0';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const core=()=>window.BoardCore;
  const teamCount=()=>Math.max(1,core()?.services?.league?.get?.().teams?.length||10);
  const teamName=()=>core()?.services?.league?.get?.().profile?.teamName||'The Butcher';
  const drafted=()=>core()?.services?.draft?.getPicks?.()||[];
  const ownerAt=i=>core()?.services?.draft?.draftOrderAt?.(i)||`Team ${(i%teamCount())+1}`;
  const nameOf=p=>p?.name||p?.fullName||p?.player_name||'Open';
  const posOf=p=>String(p?.pos||p?.position||'').toUpperCase()||'—';
  const teamOf=p=>p?.team||p?.nflTeam||p?.pro_team||'—';
  const byeOf=p=>window.BoardMyTeam?.byeForTeam?.(teamOf(p))??p?.bye??p?.byeWeek??p?.bye_week??'—';
  const pickLabel=i=>`${Math.floor(i/teamCount())+1}.${String((i%teamCount())+1).padStart(2,'0')}`;
  const splitName=n=>{const a=String(n||'Open').trim().split(/\s+/);return[a.shift()||'Open',a.join(' ')]};
  const photoSrc=p=>p?.photo||p?.image||p?.headshot||p?.avatar||p?.img||p?.photoUrl||p?.imageUrl||p?.headshot_url||'';
  function playerPhoto(p){const src=photoSrc(p),n=nameOf(p),initials=n.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();return `<span class="tb-board-photo">${src?`<img src="${esc(src)}" alt="${esc(n)}" onerror="this.remove();this.nextElementSibling.hidden=false"><b hidden>${esc(initials)}</b>`:`<b>${esc(initials)}</b>`}</span>`}
  function playerName(p){const[f,l]=splitName(nameOf(p));return `<strong><span>${esc(f)}</span>${l?`<span>${esc(l)}</span>`:''}</strong>`}
  function goDraft(){core()?.services?.navigation?.go?.('warroom');document.querySelector('.tabs .tab[data-view="warroom"]')?.click();document.body.classList.remove('tb-board-active');window.BoardCockpitV52?.render?.()}
  function render(){const board=document.getElementById('board');if(!board)return false;const active=location.hash==='#board'||board.classList.contains('active');if(!active)return false;document.body.classList.add('tb-board-active');const count=teamCount(),teams=core()?.services?.league?.get?.().teams||[],cells=[];const rounds=Math.max(10,Math.ceil(Math.max(drafted().length,count*10)/count));for(let r=0;r<rounds;r++)for(let c=0;c<count;c++){const idx=r*count+c,p=drafted()[idx]||null,owner=ownerAt(idx),mine=owner===teamName();cells.push(`<article class="tb-board-cell ${p?`pos-${esc(posOf(p).toLowerCase())}`:'is-open'} ${mine?'is-mine':''}"><small>${esc(pickLabel(idx))}</small>${p?`${playerPhoto(p)}<div>${playerName(p)}<em>${esc(posOf(p))} · ${esc(teamOf(p))} · B${esc(byeOf(p))}</em></div>`:'<span class="tb-board-open">OPEN</span>'}</article>`)}board.innerHTML=`<section class="tb-board-app" data-version="${VERSION}"><header class="tb-board-top"><button type="button" class="tb-board-back">← <b>Draft</b></button><div><small>LIVE DRAFT ROOM</small><h1>THE BOARD</h1></div><aside><span><small>PICKS MADE</small><b>${drafted().length}</b></span><span><small>ON THE CLOCK</small><b>${esc(ownerAt(drafted().length))}</b></span></aside></header><div class="tb-board-team-row" style="--teams:${count}">${teams.map(t=>`<section class="${t===teamName()?'is-mine':''}"><b>${esc(t)}</b></section>`).join('')}</div><div class="tb-board-grid" style="--teams:${count}">${cells.join('')}</div></section>`;board.querySelector('.tb-board-back')?.addEventListener('click',goDraft);return true}
  window.addEventListener('hashchange',()=>{if(location.hash==='#board')render();else document.body.classList.remove('tb-board-active')});
  window.addEventListener('theboard:draftchange',()=>{if(location.hash==='#board')render()});
  const boot=()=>{window.IntegratedBoardV2=Object.freeze({render,version:VERSION});if(location.hash==='#board')render()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();