'use strict';
(function(){
 const POSITIONS=['QB','RB','WR','TE','K','DEF'];
 const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v||'');
 const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
 const engine=()=>window.BoardDecisionEngine?.results?.()||[];
 const mine=()=>state?.profile?.teamName||'The Butcher';
 const selected=()=>window.BoardCockpit?.selected?.()||engine()[0]?.player?.name;
 const playerByName=name=>(typeof MASTER_PLAYERS!=='undefined'?MASTER_PLAYERS:[]).find(p=>p.name===name);
 const current=()=>engine().find(x=>x.player.name===selected())||engine()[0];
 function counts(){try{return positionCounts(mine())||{}}catch{return{}}}
 function currentOwner(){try{return draftOrderAt(state.drafted.length)}catch{return'League'}}
 function nextPickAway(){try{for(let i=1;i<30;i++)if(draftOrderAt(state.drafted.length+i)===mine())return i}catch{}return 0}
 function metrics(item){
  const c={...counts()},p=item?.player||{};c[p.pos]=Number(c[p.pos]||0)+1;
  const starterTargets={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};
  const filled=POSITIONS.reduce((s,pos)=>s+Math.min(Number(c[pos]||0),starterTargets[pos]),0);
  const total=Object.values(starterTargets).reduce((a,b)=>a+b,0);
  const fit=clamp(Math.round(Number(item?.factors?.need||65)));
  const scarcity=clamp(Math.round(Number(item?.factors?.scarcity||55)));
  const projection=clamp(Math.round(Number(item?.factors?.projection||Math.min(100,Number(p.proj||0)/4))));
  const risk=String(p.risk||'Medium');
  const safety=risk==='Low'?88:risk==='High'?58:74;
  const balance=clamp(Math.round(45+(filled/total)*55));
  const championship=clamp(Math.round(8+balance*.10+fit*.055+scarcity*.035+projection*.035+safety*.02),6,42);
  const survive=clamp(100-Math.round(scarcity*.72+fit*.16),3,88);
  const confidence=clamp(Math.round((fit+scarcity+projection+safety)/4),55,97);
  return{fit,scarcity,projection,safety,balance,championship,survive,confidence,risk};
 }
 function alternatives(item){return engine().filter(x=>x.player.name!==item.player.name).slice(0,4)}
 function nextPriority(item){const c={...counts()};c[item.player.pos]=Number(c[item.player.pos]||0)+1;const target={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};return POSITIONS.map(pos=>({pos,gap:Math.max(0,target[pos]-Number(c[pos]||0))})).sort((a,b)=>b.gap-a.gap)[0]?.pos||'VALUE'}
 function survivors(item){
  const pos=nextPriority(item);const all=engine().filter(x=>x.player.name!==item.player.name);
  const preferred=[...all.filter(x=>x.player.pos===pos),...all.filter(x=>x.player.pos!==pos)];
  return preferred.slice(0,5);
 }
 function choose(name){
  const direct=window.BoardCockpit;
  for(const fn of ['select','setSelected','choose','explore']){if(typeof direct?.[fn]==='function'){direct[fn](name);setTimeout(render,20);return}}
  const encoded=encodeURIComponent(name);
  const btn=[...document.querySelectorAll('[data-cockpit-player]')].find(x=>x.dataset.cockpitPlayer===encoded||decodeURIComponent(x.dataset.cockpitPlayer||'')===name);
  if(btn){btn.click();setTimeout(render,25)}
 }
 function inspectOwner(team){
  const existing=document.querySelector(`[data-war-team="${CSS.escape(encodeURIComponent(team))}"]`);if(existing){existing.click();return}
  const tab=[...document.querySelectorAll('.tab')].find(x=>x.dataset.view==='league');tab?.click();
 }
 function makeTicker(item,m){const away=nextPickAway(),owner=currentOwner(),priority=nextPriority(item);return [`${owner} is on the clock`,`${item.player.name} is Goose's preferred path`,`${100-m.survive}% chance the player is gone before your next pick`,`${priority} becomes the next roster mission`,`Championship outlook ${m.championship}%`].join('   •   ')}
 function render(){
  const war=document.getElementById('warroom'),shell=war?.querySelector('.front-office-shell'),item=current();if(!war||!shell||!item)return;
  war.classList.add('decision-arena-v7');
  let arena=document.getElementById('decisionArenaV7');if(!arena){arena=document.createElement('section');arena.id='decisionArenaV7';shell.prepend(arena)}
  const p=item.player,m=metrics(item),alts=alternatives(item),surv=survivors(item),owner=currentOwner(),priority=nextPriority(item),away=nextPickAway();
  arena.innerHTML=`
   <div class="arena-ticker"><b>GOOSE LIVE</b><div><span>${esc(makeTicker(item,m))}</span><span aria-hidden="true">${esc(makeTicker(item,m))}</span></div></div>
   <header class="arena-franchise"><div><span class="arena-live-dot"></span><span class="eyebrow">${esc(mine())} WAR ROOM</span><h1>Draft Mission</h1><p>Every league move reshapes this decision.</p></div><div class="arena-franchise-stats"><span><small>CHAMPIONSHIP</small><b>${m.championship}%</b></span><span><small>GOOSE CONFIDENCE</small><b>${m.confidence}%</b></span><span><small>NEXT PRIORITY</small><b>${priority}</b></span><button data-owner="${encodeURIComponent(owner)}"><small>ON THE CLOCK</small><b>${esc(owner)}</b></button></div></header>
   <div class="arena-stage">
    <aside class="arena-hud arena-hud-left">
     <div class="hud-panel"><span class="eyebrow">YOUR BUILD</span><h3>Roster pressure</h3>${POSITIONS.map(pos=>{const target={QB:3,RB:4,WR:5,TE:2,K:1,DEF:1}[pos],have=Number(counts()[pos]||0);return`<div class="hud-meter"><b>${pos}</b><span><i style="width:${Math.min(100,have/target*100)}%"></i></span><strong>${have}/${target}</strong></div>`}).join('')}</div>
     <div class="hud-panel arena-alt"><span class="eyebrow">ALTERNATE TIMELINES</span><h3>Change the future</h3>${alts.map(x=>{const am=metrics(x);return`<button data-choice="${encodeURIComponent(x.player.name)}"><span><b>${esc(x.player.name)}</b><small>${x.player.pos} · ${Math.round(x.player.proj||0)} pts</small></span><em>${am.championship}% title</em></button>`}).join('')}</div>
    </aside>
    <main class="arena-focus">
     <div class="arena-orbit orbit-top"><span><small>ROSTER FIT</small><b>${m.fit}</b></span><span><small>SCARCITY</small><b>${m.scarcity}</b></span><span><small>SURVIVES NEXT PICK</small><b>${m.survive}%</b></span></div>
     <article class="arena-player-card">
      <div class="arena-player-aura"></div><div class="arena-player-mark">${esc(p.name.split(' ').map(x=>x[0]).join('').slice(0,2))}</div>
      <span class="eyebrow">GOOSE RECOMMENDATION</span><h2>${esc(p.name)}</h2><p class="arena-player-meta">${esc(p.team||'—')} · ${esc(p.pos)} · ${esc(typeof boardRole==='function'?boardRole(p):'Priority target')}</p>
      <div class="arena-command">TAKE NOW</div>
      <p class="arena-reason">${esc(p.name)} best solves your current roster pressure while protecting the strongest remaining tier.</p>
      <div class="arena-primary-stats"><span><small>PROJECTED</small><b>${Math.round(p.proj||0)}</b></span><span><small>RISK</small><b>${esc(m.risk)}</b></span><span><small>TIER PRESSURE</small><b>${m.scarcity>=75?'Critical':m.scarcity>=50?'Rising':'Stable'}</b></span></div>
      <div class="arena-actions"><button class="arena-draft" data-open-player="${encodeURIComponent(p.name)}">Open Player</button><button class="arena-board">Open Board</button></div>
     </article>
     <div class="arena-orbit orbit-bottom"><span><small>IF YOU WAIT</small><b>${100-m.survive}% gone</b></span><span><small>PICKS UNTIL YOU</small><b>${away||'—'}</b></span><span><small>POSITIONAL EDGE</small><b>${m.projection}</b></span></div>
    </main>
    <aside class="arena-hud arena-hud-right">
     <div class="hud-panel arena-league"><span class="eyebrow">LEAGUE LIVE</span><h3>${esc(owner)}</h3><p>On the clock</p><div class="owner-prediction"><small>GOOSE PREDICTS</small><b>${esc((typeof teamNeed==='function'?teamNeed(owner):p.pos)||p.pos)}</b><span>based on roster construction</span></div><button data-owner="${encodeURIComponent(owner)}">Inspect team</button></div>
     <div class="hud-panel arena-impact"><span class="eyebrow">DECISION IMPACT</span><div><small>CHAMPIONSHIP</small><b>${m.championship}%</b></div><div><small>PLAYOFF OUTLOOK</small><b>${clamp(m.championship*3+14,35,94)}%</b></div><div><small>ROSTER BALANCE</small><b>${m.balance}</b></div></div>
    </aside>
   </div>
   <section class="arena-survivors"><div><span class="eyebrow">IF YOU TAKE ${esc(p.name)}</span><h3>Likely available next mission</h3></div><div class="arena-survivor-row">${surv.map(x=>`<button data-choice="${encodeURIComponent(x.player.name)}"><b>${esc(x.player.name)}</b><small>${x.player.pos} · ${Math.round(x.player.proj||0)} pts</small></button>`).join('')}</div><footer>Next roster mission <b>${priority}</b></footer></section>
   <button class="arena-blueprint-toggle">Open Championship Blueprint</button>`;
  arena.querySelectorAll('[data-choice]').forEach(btn=>btn.onclick=()=>choose(decodeURIComponent(btn.dataset.choice)));
  arena.querySelectorAll('[data-owner]').forEach(btn=>btn.onclick=()=>inspectOwner(decodeURIComponent(btn.dataset.owner)));
  arena.querySelector('[data-open-player]')?.addEventListener('click',()=>{const name=decodeURIComponent(arena.querySelector('[data-open-player]').dataset.openPlayer);const source=[...document.querySelectorAll('[data-player]')].find(x=>decodeURIComponent(x.dataset.player||'')===name);source?.click()});
  arena.querySelector('.arena-board')?.addEventListener('click',()=>[...document.querySelectorAll('.tab')].find(x=>x.dataset.view==='board')?.click());
  arena.querySelector('.arena-blueprint-toggle')?.addEventListener('click',()=>{const panel=document.querySelector('.projection-panel');if(panel){panel.classList.toggle('arena-blueprint-open');arena.querySelector('.arena-blueprint-toggle').textContent=panel.classList.contains('arena-blueprint-open')?'Close Championship Blueprint':'Open Championship Blueprint'}});
 }
 function styles(){if(document.getElementById('decisionArenaV7Style'))return;const s=document.createElement('style');s.id='decisionArenaV7Style';s.textContent=`
 .decision-arena-v7{background:radial-gradient(circle at 50% 26%,#353b46 0,#171a20 34%,#0d0f13 78%)!important;min-height:100vh;padding:18px 0 80px!important}.decision-arena-v7 .front-office-shell{max-width:none!important;padding:0 28px!important}.decision-arena-v7 .front-office-topline,.decision-arena-v7>.draft-heartbeat-summary,.decision-arena-v7 .front-office-layout,.decision-arena-v7 #warRoomLive,.decision-arena-v7 #cockpitV5{display:none!important}.decision-arena-v7 .projection-panel{display:none!important}.decision-arena-v7 .projection-panel.arena-blueprint-open{display:block!important;max-width:1180px;margin:18px auto!important;background:#20242b!important;color:#fff!important;border-color:rgba(255,255,255,.1)!important}.decision-arena-v7 #decisionArenaV7{display:block;color:#fff}.arena-ticker{height:42px;display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:#111318;overflow:hidden;padding:0 18px}.arena-ticker>b{color:#f79432;font-size:10px;letter-spacing:.09em;white-space:nowrap}.arena-ticker>div{display:flex;width:max-content;animation:arenaTicker 30s linear infinite}.arena-ticker span{white-space:nowrap;color:#d4d8de;font-size:12px;padding-right:60px}@keyframes arenaTicker{to{transform:translateX(-50%)}}
 .arena-franchise{display:flex;justify-content:space-between;gap:28px;align-items:end;padding:26px 16px 20px}.arena-franchise h1{font-size:42px;margin:6px 0 3px}.arena-franchise p{margin:0;color:#aeb4bd}.arena-live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#62d58a;box-shadow:0 0 0 7px rgba(98,213,138,.12);margin-right:9px}.arena-franchise .eyebrow,.arena-player-card .eyebrow,.hud-panel .eyebrow,.arena-survivors .eyebrow{color:#f49a43}.arena-franchise-stats{display:grid;grid-template-columns:repeat(4,minmax(125px,1fr));border:1px solid rgba(255,255,255,.1);border-radius:18px;overflow:hidden;background:rgba(255,255,255,.045)}.arena-franchise-stats>*{padding:14px 16px;border:0;border-right:1px solid rgba(255,255,255,.1);background:transparent;color:#fff;text-align:left}.arena-franchise-stats>*:last-child{border:0}.arena-franchise-stats small,.arena-franchise-stats b{display:block}.arena-franchise-stats small{font-size:9px;color:#939aa4;letter-spacing:.08em}.arena-franchise-stats b{font-size:18px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .arena-stage{display:grid;grid-template-columns:minmax(250px,.78fr) minmax(560px,1.7fr) minmax(250px,.78fr);gap:18px;align-items:center;max-width:1460px;margin:0 auto}.arena-hud{display:flex;flex-direction:column;gap:18px}.hud-panel{background:linear-gradient(150deg,rgba(62,67,77,.94),rgba(36,40,47,.98));border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:20px;box-shadow:0 18px 45px rgba(0,0,0,.2)}.hud-panel h3{font-size:22px;margin:6px 0 16px}.hud-meter{display:grid;grid-template-columns:34px 1fr 38px;gap:10px;align-items:center;margin:11px 0}.hud-meter b,.hud-meter strong{font-size:11px}.hud-meter strong{text-align:right}.hud-meter span{height:7px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.hud-meter i{display:block;height:100%;background:#f47a00;border-radius:999px}.arena-alt button{display:flex;justify-content:space-between;gap:10px;width:100%;padding:12px;margin-top:9px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.055);color:#fff;text-align:left}.arena-alt b,.arena-alt small{display:block}.arena-alt small{color:#9fa6b0;font-size:10px;margin-top:3px}.arena-alt em{color:#f6a252;font-style:normal;font-size:10px;white-space:nowrap}.arena-league p{color:#c2c7ce}.owner-prediction{padding:16px;border-radius:15px;background:rgba(0,0,0,.2)}.owner-prediction small,.owner-prediction b,.owner-prediction span{display:block}.owner-prediction small{color:#9aa1ab;font-size:9px}.owner-prediction b{font-size:38px;color:#f47a00;margin:5px 0}.owner-prediction span{font-size:10px;color:#aaa}.arena-league>button{width:100%;margin-top:13px;padding:11px;border:1px solid rgba(255,255,255,.17);border-radius:12px;background:transparent;color:#fff;font-weight:750}.arena-impact{display:grid;grid-template-columns:1fr 1fr;gap:14px}.arena-impact>.eyebrow{grid-column:1/-1}.arena-impact div{padding:13px;background:rgba(0,0,0,.17);border-radius:13px}.arena-impact small,.arena-impact b{display:block}.arena-impact small{font-size:8px;color:#9fa6af}.arena-impact b{font-size:24px;margin-top:5px}
 .arena-focus{min-width:0;display:flex;flex-direction:column;align-items:center}.arena-orbit{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:88%;position:relative;z-index:2}.arena-orbit span{padding:11px 14px;text-align:center;background:rgba(28,31,37,.92);border:1px solid rgba(255,255,255,.1)}.orbit-top span:first-child{border-radius:14px 0 0 0}.orbit-top span:last-child{border-radius:0 14px 0 0}.orbit-bottom span:first-child{border-radius:0 0 0 14px}.orbit-bottom span:last-child{border-radius:0 0 14px 0}.arena-orbit small,.arena-orbit b{display:block}.arena-orbit small{font-size:8px;color:#949ba5}.arena-orbit b{font-size:16px;margin-top:3px}.arena-player-card{position:relative;width:100%;min-height:510px;padding:40px 42px 32px;text-align:center;border-radius:30px;background:radial-gradient(circle at 50% 18%,rgba(245,122,0,.22),transparent 28%),linear-gradient(145deg,#343942,#1c2026);border:1px solid rgba(255,255,255,.13);box-shadow:0 32px 70px rgba(0,0,0,.35);overflow:hidden}.arena-player-aura{position:absolute;inset:16% 22% auto;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(244,122,0,.28),transparent 65%);filter:blur(12px)}.arena-player-mark{position:relative;display:grid;place-items:center;width:116px;height:116px;margin:3px auto 18px;border-radius:34px;background:linear-gradient(145deg,#f98b16,#d95d00);font-size:42px;font-weight:900;box-shadow:0 18px 38px rgba(242,116,0,.25)}.arena-player-card h2{position:relative;font-size:46px;line-height:1;margin:9px 0 6px}.arena-player-meta{position:relative;color:#c2c7ce}.arena-command{position:relative;display:inline-block;margin:18px 0 12px;padding:8px 15px;border-radius:999px;background:rgba(98,213,138,.12);border:1px solid rgba(98,213,138,.35);color:#95e5b0;font-size:11px;font-weight:850;letter-spacing:.08em}.arena-reason{position:relative;max-width:570px;margin:0 auto 20px;color:#c7ccd3;line-height:1.5}.arena-primary-stats{position:relative;display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid rgba(255,255,255,.1);margin:0 auto 22px;max-width:620px}.arena-primary-stats span{padding:15px;border-right:1px solid rgba(255,255,255,.1)}.arena-primary-stats span:last-child{border:0}.arena-primary-stats small,.arena-primary-stats b{display:block}.arena-primary-stats small{font-size:8px;color:#969da7}.arena-primary-stats b{font-size:20px;margin-top:4px}.arena-actions{position:relative;display:grid;grid-template-columns:1fr auto;gap:10px}.arena-actions button{padding:14px 18px;border-radius:13px;font-weight:850}.arena-draft{border:0;background:#f47a00;color:#fff}.arena-board{border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff}
 .arena-survivors{max-width:1460px;margin:22px auto 0;padding:22px 24px;border:1px solid rgba(255,255,255,.1);border-radius:22px;background:linear-gradient(145deg,rgba(48,53,62,.95),rgba(30,34,40,.98))}.arena-survivors>div:first-child{display:flex;justify-content:space-between;align-items:end}.arena-survivors h3{font-size:22px;margin:5px 0}.arena-survivor-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:14px}.arena-survivor-row button{min-width:0;padding:13px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.055);color:#fff;text-align:left}.arena-survivor-row b,.arena-survivor-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.arena-survivor-row small{color:#9ea5af;font-size:10px;margin-top:4px}.arena-survivors footer{display:flex;justify-content:space-between;margin-top:13px;padding:12px 14px;border-radius:12px;background:rgba(0,0,0,.18);font-size:11px}.arena-blueprint-toggle{display:block;width:min(1460px,100%);margin:14px auto 0;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.045);color:#fff;font-weight:800}
 @media(max-width:1100px){.arena-stage{grid-template-columns:260px 1fr}.arena-hud-right{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}.arena-franchise{align-items:flex-start;flex-direction:column}.arena-franchise-stats{width:100%}.arena-survivor-row{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.decision-arena-v7 .front-office-shell{padding:0 12px!important}.arena-stage{grid-template-columns:1fr}.arena-hud-left,.arena-hud-right{display:flex}.arena-focus{order:-1}.arena-franchise-stats{grid-template-columns:1fr 1fr}.arena-player-card{min-height:auto;padding:30px 20px}.arena-player-card h2{font-size:34px}.arena-orbit{width:96%}.arena-survivor-row{grid-template-columns:1fr 1fr}.arena-ticker{border-radius:14px}.arena-franchise h1{font-size:32px}}
 `;document.head.appendChild(s)}
 function wrap(){if(typeof renderWarroom!=='function'||renderWarroom.__decisionArenaV7)return false;const base=renderWarroom;renderWarroom=function(){base();setTimeout(render,20)};renderWarroom.__decisionArenaV7=true;return true}
 function init(){styles();if(wrap())render();else setTimeout(init,150)}
 init();
})();