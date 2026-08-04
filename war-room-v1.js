'use strict';
(function(){
 const POS=['QB','RB','WR','TE','K','DEF'];
 const STARTERS={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};
 const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
 const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v||'');
 const mine=()=>state.profile.teamName;
 function playerName(p){return p?.player||p?.name||''}
 function playerObj(name){return (typeof MASTER_PLAYERS!=='undefined'?MASTER_PLAYERS:[]).find(p=>p.name===name)}
 function teamPlayers(team){
  const keepers=(typeof MASTER_PLAYERS!=='undefined'?MASTER_PLAYERS:[]).filter(p=>p.keeperOwner===team);
  const drafted=(state.drafted||[]).filter(x=>(x.team||x.owner)===team).map(x=>playerObj(playerName(x))||{name:playerName(x),pos:x.pos||'—',proj:x.proj||0});
  const out=[];[...keepers,...drafted].forEach(p=>{if(p?.name&&!out.some(x=>x.name===p.name))out.push(p)});return out;
 }
 function scoreTeam(team){
  const players=teamPlayers(team),counts={};POS.forEach(p=>counts[p]=0);players.forEach(p=>counts[p.pos]=(counts[p.pos]||0)+1);
  const coverage=POS.reduce((s,p)=>s+Math.min(counts[p]||0,STARTERS[p]||1),0)/Object.values(STARTERS).reduce((a,b)=>a+b,0);
  const projection=players.reduce((s,p)=>s+Number(p.proj||0),0);
  const stars=players.filter(p=>Number(p.posRank||99)<=10).length;
  return clamp(Math.round(32+coverage*38+Math.min(22,projection/105)+stars*2),10,96);
 }
 function titleRace(){
  const raw=(state.teams||[]).map(team=>({team,score:scoreTeam(team)})).sort((a,b)=>b.score-a.score);
  const total=raw.reduce((s,x)=>s+Math.exp(x.score/18),0);
  return raw.map((x,i)=>({...x,rank:i+1,odds:Math.max(3,Math.round(Math.exp(x.score/18)/total*100))}));
 }
 function currentTeam(){try{return draftOrderAt(state.drafted.length)}catch{return '—'}}
 function teamNeed(team){
  const c=typeof positionCounts==='function'?positionCounts(team):{};
  return POS.map(pos=>({pos,gap:Math.max(0,(STARTERS[pos]||1)-Number(c?.[pos]||0))})).sort((a,b)=>b.gap-a.gap)[0]?.pos||'Best value';
 }
 function prediction(){
  const team=currentTeam(),need=teamNeed(team),weights={QB:10,RB:10,WR:10,TE:7,K:2,DEF:2};
  if(need)weights[need]+=48;
  const recent=(state.drafted||[]).slice(-5).map(x=>playerObj(playerName(x))?.pos||x.pos).filter(Boolean);
  recent.forEach(pos=>{if(weights[pos]!=null)weights[pos]+=5});
  const total=Object.values(weights).reduce((a,b)=>a+b,0);
  return Object.entries(weights).map(([pos,w])=>({pos,pct:Math.round(w/total*100)})).sort((a,b)=>b.pct-a.pct).slice(0,3);
 }
 function market(){
  const recent=(state.drafted||[]).slice(-8).map(x=>playerObj(playerName(x))?.pos||x.pos).filter(Boolean);
  return ['QB','RB','WR','TE'].map(pos=>{const taken=recent.filter(x=>x===pos).length;const upcoming=[...new Set(Array.from({length:6},(_,i)=>{try{return draftOrderAt(state.drafted.length+i)}catch{return null}}).filter(Boolean))];const need=upcoming.filter(t=>teamNeed(t)===pos).length;const heat=clamp(18+taken*15+need*11,8,96);return{pos,heat,label:heat>=72?'Hot':heat>=46?'Heating':heat<=25?'Cooling':'Stable'}}).sort((a,b)=>b.heat-a.heat);
 }
 function alerts(race){
  const out=[],recent=(state.drafted||[]).slice(-5).map(x=>playerObj(playerName(x))?.pos||x.pos).filter(Boolean);
  ['QB','RB','WR','TE'].forEach(pos=>{const n=recent.filter(x=>x===pos).length;if(n>=3)out.push(`${pos} run detected · ${n} of the last ${recent.length} picks`)});
  const top=race[0];if(top)out.push(`${top.team} leads the live title race at ${top.odds}%`);
  const focus=window.BoardCockpit?.selected?.();if(focus)out.push(`Goose is currently modeling ${focus}`);
  if(!out.length)out.push('Draft market is stable · Goose is watching for the next tier break');
  return out.slice(0,4);
 }
 function lastImpact(race){
  const last=(state.drafted||[]).at(-1),name=playerName(last),p=playerObj(name),pos=p?.pos||last?.pos||'player';
  if(!last)return{headline:'Draft awaiting first selection',winner:'The Butcher',detail:'Goose is modeling every opening path'};
  const next=(typeof MASTER_PLAYERS!=='undefined'?MASTER_PLAYERS:[]).filter(x=>x.pos===pos&&!state.drafted.some(d=>playerName(d)===x.name)&&!x.keeperOwner).sort((a,b)=>Number(b.proj||0)-Number(a.proj||0))[0];
  return{headline:`${name} selected`,winner:next?.name||race[0]?.team||'The room',detail:next?`${next.name} gains scarcity value at ${pos}`:`${pos} market just tightened`};
 }
 function openTeam(team){
  let drawer=document.getElementById('warRoomTeamDrawer');if(!drawer){drawer=document.createElement('aside');drawer.id='warRoomTeamDrawer';drawer.className='war-team-drawer';document.body.appendChild(drawer)}
  const players=teamPlayers(team),score=scoreTeam(team);drawer.innerHTML=`<button class="war-drawer-close" aria-label="Close">×</button><span class="eyebrow">TEAM INTELLIGENCE</span><h2>${esc(team)}</h2><div class="war-team-score"><strong>${score}</strong><span>Roster outlook</span></div><div class="war-team-roster">${POS.map(pos=>{const list=players.filter(p=>p.pos===pos);return list.length?`<section><b>${pos}</b>${list.map(p=>`<span>${esc(p.name)} <small>${Math.round(p.proj||0)} pts</small></span>`).join('')}</section>`:''}).join('')||'<p>No rostered players yet.</p>'}</div>`;drawer.classList.add('open');drawer.querySelector('.war-drawer-close').onclick=()=>drawer.classList.remove('open');
 }
 function render(){
  const shell=document.querySelector('.front-office-shell');if(!shell)return;
  let root=document.getElementById('warRoomLive');if(!root){root=document.createElement('section');root.id='warRoomLive';root.className='war-room-live';const top=shell.querySelector('.front-office-topline');top?.insertAdjacentElement('afterend',root)}
  const race=titleRace(),pred=prediction(),heat=market(),news=alerts(race),impact=lastImpact(race),onClock=currentTeam();
  root.innerHTML=`<div class="war-head"><div><span class="war-live-dot"></span><span class="eyebrow">THE WAR ROOM · LIVE</span><h2>${esc(onClock)} is on the clock</h2></div><button data-war-team="${encodeURIComponent(mine())}">View The Butcher</button></div><div class="war-grid"><section class="war-race"><span class="eyebrow">TITLE RACE</span><div>${race.slice(0,4).map(x=>`<button data-war-team="${encodeURIComponent(x.team)}"><i>${x.rank}</i><span><b>${esc(x.team)}</b><small>${x.odds}% championship</small></span><em style="--w:${x.odds}%"></em></button>`).join('')}</div></section><section class="war-predict"><span class="eyebrow">GOOSE PREDICTS</span><h3>${esc(onClock)} targets ${pred[0]?.pos||'value'}</h3>${pred.map(x=>`<div><b>${x.pos}</b><span><i style="width:${x.pct}%"></i></span><strong>${x.pct}%</strong></div>`).join('')}</section><section class="war-market"><span class="eyebrow">MARKET MOMENTUM</span>${heat.map(x=>`<div><b>${x.pos}</b><span><i style="width:${x.heat}%"></i></span><strong>${x.label}</strong></div>`).join('')}</section><section class="war-impact"><span class="eyebrow">LAST PICK IMPACT</span><h3>${esc(impact.headline)}</h3><b>${esc(impact.winner)}</b><p>${esc(impact.detail)}</p></section></div><div class="war-ticker"><b>GOOSE INTELLIGENCE</b><div><span>${news.map(x=>esc(x)).join('   •   ')}</span><span aria-hidden="true">${news.map(x=>esc(x)).join('   •   ')}</span></div></div>`;
  root.querySelectorAll('[data-war-team]').forEach(btn=>btn.onclick=()=>openTeam(decodeURIComponent(btn.dataset.warTeam)));
 }
 function styles(){if(document.getElementById('warRoomV1Style'))return;const s=document.createElement('style');s.id='warRoomV1Style';s.textContent=`
 #cockpitV5 .draft-heartbeat-summary,#cockpitV5 .draft-track{display:none!important}.war-room-live{margin:16px 0 22px;padding:22px;border-radius:24px;background:linear-gradient(125deg,#17191d,#2b2f35);color:#fff;box-shadow:0 18px 45px rgba(20,22,25,.18);overflow:hidden}.war-head{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:18px}.war-head h2{font-size:26px;margin:5px 0 0}.war-head button{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:10px 14px;font-weight:750}.war-live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#65d28a;margin-right:7px;box-shadow:0 0 0 6px rgba(101,210,138,.12)}.war-room-live .eyebrow{color:#f1a45d}.war-grid{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;gap:12px}.war-grid>section{min-width:0;padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.055)}.war-grid h3{font-size:16px;margin:7px 0 12px}.war-race button{display:grid;grid-template-columns:24px 1fr 65px;gap:8px;width:100%;align-items:center;border:0;border-bottom:1px solid rgba(255,255,255,.09);background:transparent;color:#fff;padding:8px 0;text-align:left}.war-race button:last-child{border-bottom:0}.war-race i{font-style:normal;color:#f59a45}.war-race b,.war-race small{display:block}.war-race small{font-size:9px;color:#bfc4cb}.war-race em{height:6px;border-radius:999px;background:linear-gradient(90deg,#f47a00 var(--w),rgba(255,255,255,.12) var(--w));}.war-predict>div,.war-market>div{display:grid;grid-template-columns:28px 1fr 48px;gap:8px;align-items:center;margin:10px 0}.war-predict span,.war-market span{height:7px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.war-predict i,.war-market i{display:block;height:100%;background:#f47a00;border-radius:999px}.war-predict strong,.war-market strong{font-size:9px;text-align:right}.war-impact>b{color:#f7a85f}.war-impact p{font-size:11px;line-height:1.45;color:#c5c9cf}.war-ticker{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;margin-top:14px;padding:11px 14px;border-top:1px solid rgba(255,255,255,.12);overflow:hidden}.war-ticker>b{font-size:10px;color:#f59a45;white-space:nowrap}.war-ticker>div{display:flex;width:max-content;animation:warTicker 28s linear infinite}.war-ticker span{white-space:nowrap;font-size:11px;color:#d6d9dd;padding-right:42px}@keyframes warTicker{to{transform:translateX(-50%)}}.war-team-drawer{position:fixed;z-index:10000;right:-430px;top:0;width:min(410px,92vw);height:100vh;padding:28px;background:#fff;color:#1d2024;box-shadow:-18px 0 45px rgba(0,0,0,.2);transition:right .25s ease;overflow:auto}.war-team-drawer.open{right:0}.war-drawer-close{position:absolute;right:16px;top:14px;border:0;background:transparent;font-size:30px}.war-team-drawer h2{font-size:28px;margin:7px 0 14px}.war-team-score{display:flex;align-items:end;gap:10px;padding:16px;border-radius:16px;background:#292d32;color:#fff}.war-team-score strong{font-size:38px}.war-team-roster section{padding:13px 0;border-bottom:1px solid #e0e3e6}.war-team-roster section>b{display:block;color:#c45d00;font-size:10px;margin-bottom:7px}.war-team-roster span{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-weight:700}.war-team-roster small{color:#767b82;font-weight:500}@media(max-width:1100px){.war-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.war-room-live{padding:16px;border-radius:18px}.war-grid{grid-template-columns:1fr}.war-head{align-items:flex-start}.war-head h2{font-size:21px}.war-ticker{grid-template-columns:1fr}.war-head button{display:none}}
 `;document.head.appendChild(s)}
 function wrap(){if(typeof renderWarroom!=='function'||renderWarroom.__warRoomV1)return false;const base=renderWarroom;renderWarroom=function(){base();setTimeout(render,0)};renderWarroom.__warRoomV1=true;return true}
 function init(){styles();if(wrap())render();else setTimeout(init,150)}
 init();
})();