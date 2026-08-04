'use strict';
(function(){
 const POS=['QB','RB','WR','TE','K','DEF'];
 const TARGET={QB:3,RB:4,WR:5,TE:2,K:1,DEF:1};
 const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v||'');
 const mine=()=>state?.profile?.teamName||'The Butcher';
 function currentOwner(){try{return draftOrderAt(state.drafted.length)||'Draft room'}catch{return 'Draft room'}}
 function counts(){try{return positionCounts(mine())||{}}catch{return {}}}
 function recommendation(){return window.BoardDecisionEngine?.results?.()?.[0]}
 function championship(){
  const el=document.querySelector('#cockpitV5 .championship-strip strong');
  return el?.textContent?.trim()||'—';
 }
 function nextPriority(){
  const c=counts();
  return POS.map(pos=>({pos,gap:Math.max(0,(TARGET[pos]||0)-Number(c[pos]||0))})).sort((a,b)=>b.gap-a.gap)[0]?.pos||'VALUE';
 }
 function ownerNeed(team){
  let c={};try{c=positionCounts(team)||{}}catch{}
  const starters={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};
  return POS.map(pos=>({pos,gap:Math.max(0,(starters[pos]||1)-Number(c[pos]||0))})).sort((a,b)=>b.gap-a.gap)[0]?.pos||'VALUE';
 }
 function rosterRows(){
  const c=counts();
  return POS.map(pos=>`<div><span>${pos}</span><b>${Number(c[pos]||0)}/${TARGET[pos]}</b><i style="--fill:${Math.min(100,Math.round(Number(c[pos]||0)/(TARGET[pos]||1)*100))}%"></i></div>`).join('');
 }
 function tickerText(item){
  const on=currentOwner(),need=ownerNeed(on),priority=nextPriority(),name=item?.player?.name||'Goose recommendation';
  return [`${on} is on the clock`,`${need} is their most likely need`,`${name} is Goose's current path`,`${priority} becomes your next roster priority`,`Championship outlook ${championship()}`];
 }
 function moveElement(el,slot){if(el&&slot&&!slot.contains(el))slot.appendChild(el)}
 function apply(){
  const view=document.getElementById('warroom');if(!view)return;
  view.classList.remove('front-office-v6');view.classList.add('front-office-v7');
  const shell=view.querySelector('.front-office-shell');if(!shell)return;
  shell.querySelector('.front-office-topline')?.setAttribute('hidden','');
  const old=document.getElementById('decisionStageV7');if(old)old.remove();
  const item=recommendation();
  const stage=document.createElement('section');stage.id='decisionStageV7';stage.className='decision-stage-v7';
  const news=tickerText(item);
  stage.innerHTML=`
   <div class="v7-ticker"><b>GOOSE LIVE</b><div><span>${news.map(esc).join('   •   ')}</span><span aria-hidden="true">${news.map(esc).join('   •   ')}</span></div></div>
   <header class="v7-profile"><div><span class="eyebrow">${esc(mine())} WAR ROOM</span><h1>${esc(mine())}</h1><p>Every league move recalculates your next decision.</p></div><div class="v7-profile-stats"><span><small>CHAMPIONSHIP</small><b>${esc(championship())}</b></span><span><small>NEXT PRIORITY</small><b>${esc(nextPriority())}</b></span><span><small>ON THE CLOCK</small><b>${esc(currentOwner())}</b></span><span><small>GOOSE</small><b>LIVE</b></span></div></header>
   <div class="v7-game-board">
    <aside class="v7-orbit v7-roster"><span class="eyebrow">YOUR BUILD</span><h3>Roster pressure</h3><div class="v7-roster-bars">${rosterRows()}</div></aside>
    <main class="v7-center" id="v7Center"></main>
    <aside class="v7-orbit v7-league"><span class="eyebrow">LEAGUE LIVE</span><h3>${esc(currentOwner())}</h3><p>On the clock</p><div class="v7-live-need"><small>GOOSE PREDICTS</small><strong>${esc(ownerNeed(currentOwner()))}</strong><span>based on roster construction</span></div><button type="button" id="inspectClockTeam">Inspect team</button></aside>
    <section class="v7-orbit v7-alternatives" id="v7Alternatives"></section>
    <section class="v7-orbit v7-impact" id="v7Impact"></section>
    <section class="v7-orbit v7-survivors" id="v7Survivors"></section>
    <section class="v7-blueprint" id="v7Blueprint"><button class="v7-blueprint-toggle" type="button">Open Championship Blueprint</button><div class="v7-blueprint-body" hidden></div></section>
   </div>`;
  const layout=shell.querySelector('.front-office-layout');
  if(layout)layout.insertAdjacentElement('beforebegin',stage);else shell.appendChild(stage);
  const goose=view.querySelector('.goose-desk');moveElement(goose,stage.querySelector('#v7Center'));
  const cockpit=document.getElementById('cockpitV5');
  const strip=cockpit?.querySelector('.championship-strip');moveElement(strip,stage.querySelector('#v7Impact'));
  const alt=view.querySelector('.cockpit-alternatives');moveElement(alt,stage.querySelector('#v7Alternatives'));
  const next=view.querySelector('.cockpit-next-pick');moveElement(next,stage.querySelector('#v7Survivors'));
  const blueprint=view.querySelector('.projection-panel');
  const body=stage.querySelector('.v7-blueprint-body');moveElement(blueprint,body);
  const toggle=stage.querySelector('.v7-blueprint-toggle');toggle.onclick=()=>{const open=body.hidden;body.hidden=!open;toggle.textContent=open?'Hide Championship Blueprint':'Open Championship Blueprint'};
  stage.querySelector('#inspectClockTeam').onclick=()=>{
   const team=currentOwner();
   const warButton=[...document.querySelectorAll('[data-war-team]')].find(b=>decodeURIComponent(b.dataset.warTeam||'')===team);
   if(warButton)warButton.click();
  };
  view.querySelector('.front-office-layout')?.classList.add('v7-hidden-layout');
  document.getElementById('warRoomLive')?.classList.add('v7-hidden');
  cockpit?.querySelector('.decision-consequences')?.classList.add('v7-hidden');
  cockpit?.querySelector('.roster-dna')?.classList.add('v7-hidden');
  document.getElementById('decisionHistory')?.classList.add('v7-hidden');
 }
 function styles(){if(document.getElementById('frontOfficeV7Style'))return;const s=document.createElement('style');s.id='frontOfficeV7Style';s.textContent=`
 .front-office-v7{min-height:100vh;padding:18px 0 70px!important;background:radial-gradient(circle at 50% 0,#303640 0,#171a20 37%,#0d0f13 84%);color:#fff}.front-office-v7 .front-office-shell{max-width:none!important;padding:0 18px!important}.front-office-v7 .v7-hidden-layout,.front-office-v7 .v7-hidden{display:none!important}.decision-stage-v7{max-width:1460px;margin:0 auto;color:#f7f8fa}.v7-ticker{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center;height:42px;padding:0 16px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#11141a;overflow:hidden}.v7-ticker>b{font-size:10px;letter-spacing:.1em;color:#f49333;white-space:nowrap}.v7-ticker>div{display:flex;width:max-content;animation:v7Ticker 31s linear infinite}.v7-ticker span{padding-right:54px;white-space:nowrap;color:#cbd0d7;font-size:11px}@keyframes v7Ticker{to{transform:translateX(-50%)}}
 .v7-profile{display:flex;justify-content:space-between;align-items:end;gap:28px;padding:28px 12px 22px}.v7-profile h1{margin:4px 0 5px;font-size:44px;line-height:1}.v7-profile p{margin:0;color:#aeb5be}.v7-profile .eyebrow,.decision-stage-v7 .eyebrow{color:#f49333!important}.v7-profile-stats{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));border:1px solid rgba(255,255,255,.1);border-radius:18px;overflow:hidden;background:rgba(255,255,255,.045)}.v7-profile-stats span{padding:14px 16px;border-right:1px solid rgba(255,255,255,.09)}.v7-profile-stats span:last-child{border:0}.v7-profile-stats small,.v7-profile-stats b{display:block}.v7-profile-stats small{font-size:8px;letter-spacing:.11em;color:#9098a2}.v7-profile-stats b{margin-top:5px;font-size:20px}
 .v7-game-board{display:grid;grid-template-columns:260px minmax(570px,1fr) 260px;grid-template-areas:'roster center league' 'alternatives center impact' 'survivors survivors survivors' 'blueprint blueprint blueprint';gap:14px;align-items:start}.v7-center{grid-area:center;min-width:0}.v7-roster{grid-area:roster}.v7-league{grid-area:league}.v7-alternatives{grid-area:alternatives}.v7-impact{grid-area:impact}.v7-survivors{grid-area:survivors}.v7-blueprint{grid-area:blueprint}.v7-orbit{min-width:0;padding:18px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:linear-gradient(145deg,rgba(48,53,62,.86),rgba(27,31,38,.96));box-shadow:0 16px 38px rgba(0,0,0,.22)}.v7-orbit h3{margin:5px 0 13px;font-size:19px}.v7-roster-bars>div{display:grid;grid-template-columns:34px 42px 1fr;gap:8px;align-items:center;margin:11px 0}.v7-roster-bars span,.v7-roster-bars b{font-size:11px}.v7-roster-bars i{height:5px;border-radius:999px;background:linear-gradient(90deg,#f47a00 var(--fill),rgba(255,255,255,.11) var(--fill))}.v7-live-need{padding:16px;margin:15px 0;border-radius:14px;background:rgba(0,0,0,.22)}.v7-live-need small,.v7-live-need strong,.v7-live-need span{display:block}.v7-live-need small{font-size:8px;color:#9098a2;letter-spacing:.1em}.v7-live-need strong{font-size:34px;color:#f49333;margin:5px 0}.v7-live-need span{font-size:10px;color:#aeb5be}.v7-league button,.v7-blueprint-toggle{width:100%;border:1px solid rgba(255,255,255,.15);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;padding:10px;font-weight:750}
 .front-office-v7 .goose-desk{min-height:610px;margin:0!important;padding:34px!important;border:1px solid rgba(255,255,255,.11)!important;border-radius:26px!important;background:radial-gradient(circle at 50% 15%,rgba(244,122,0,.12),transparent 28%),linear-gradient(145deg,#30353d,#1b1f25)!important;box-shadow:0 24px 58px rgba(0,0,0,.32)!important;color:#fff!important;display:flex;flex-direction:column;justify-content:center}.front-office-v7 .goose-desk h2,.front-office-v7 .goose-desk h3{color:#fff!important}.front-office-v7 #gooseThinking h2{font-size:42px!important;line-height:1.02!important}.front-office-v7 #gooseThinking p{font-size:17px!important;line-height:1.55!important;color:#c8cdd4!important}.front-office-v7 .engine-factor-line span{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.13)!important;color:#e8eaed!important}.front-office-v7 .briefing-actions{margin-top:22px}.front-office-v7 .briefing-actions .btn,.front-office-v7 .briefing-actions button{min-height:48px}
 .v7-impact{padding:0;overflow:hidden}.v7-impact .championship-strip{margin:0!important;display:grid!important;grid-template-columns:1fr 1fr!important;border-radius:18px!important;box-shadow:none!important;padding:16px!important}.v7-impact .championship-strip>div{padding:9px!important;border:0!important}.v7-impact .championship-strip>div:nth-child(n+3){display:none}.v7-impact .championship-strip strong{font-size:38px!important}.v7-impact .championship-strip b{font-size:18px!important}
 .v7-alternatives:empty,.v7-survivors:empty,.v7-impact:empty{display:none}.v7-alternatives .cockpit-alternatives,.v7-survivors .cockpit-next-pick{padding:0!important;margin:0!important;border:0!important;background:transparent!important}.v7-alternatives .alternative-grid{grid-template-columns:1fr!important}.v7-alternatives .alternative-grid button,.v7-survivors .next-pick-list button{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.11)!important;color:#fff!important}.v7-alternatives small,.v7-survivors small{color:#aeb5be!important}.v7-survivors{padding:20px}.v7-survivors .next-pick-list{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.v7-survivors .next-pick-list button{margin:0!important;min-width:0}.v7-survivors .next-pick-list button:nth-child(n+6){display:none}
 .v7-blueprint{margin-top:2px}.v7-blueprint-body{margin-top:12px}.v7-blueprint-body .projection-panel{padding:24px!important;background:linear-gradient(145deg,#30353d,#1b1f25)!important;border:1px solid rgba(255,255,255,.1)!important;color:#fff!important}.v7-blueprint-body .blueprint-depth-chart section{background:rgba(255,255,255,.04)!important}.v7-blueprint-body .blueprint-depth-chart button{background:rgba(255,255,255,.065)!important;color:#fff!important;border-color:rgba(255,255,255,.11)!important}
 @media(max-width:1100px){.v7-game-board{grid-template-columns:220px minmax(0,1fr);grid-template-areas:'roster center' 'league center' 'alternatives impact' 'survivors survivors' 'blueprint blueprint'}.v7-profile{align-items:start;flex-direction:column}.v7-profile-stats{width:100%}}
 @media(max-width:760px){.front-office-v7 .front-office-shell{padding:0 10px!important}.v7-game-board{grid-template-columns:1fr;grid-template-areas:'center' 'roster' 'league' 'impact' 'alternatives' 'survivors' 'blueprint'}.v7-profile h1{font-size:34px}.v7-profile-stats{grid-template-columns:1fr 1fr}.v7-profile-stats span:nth-child(2){border-right:0}.front-office-v7 .goose-desk{min-height:auto;padding:24px!important}.front-office-v7 #gooseThinking h2{font-size:31px!important}.v7-survivors .next-pick-list{grid-template-columns:1fr 1fr}.v7-ticker{grid-template-columns:1fr}.v7-ticker>b{display:none}}
 `;document.head.appendChild(s)}
 function wrap(){if(typeof renderWarroom!=='function'||renderWarroom.__frontOfficeV7)return false;const base=renderWarroom;renderWarroom=function(){base();setTimeout(apply,0)};renderWarroom.__frontOfficeV7=true;return true}
 function init(){styles();if(wrap())apply();else setTimeout(init,160)}
 init();
})();