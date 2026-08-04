'use strict';
(function(){
 const STARTERS={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};
 const TARGETS={QB:3,RB:4,WR:5,TE:2,K:1,DEF:1};
 const POSITIONS=['QB','RB','WR','TE','K','DEF'];
 const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
 const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v||'');
 function engine(){return window.BoardDecisionEngine?.results?.()||[]}
 function mine(){return state.profile.teamName}
 function focus(){const n=window.BoardCockpit?.selected?.();return engine().find(x=>x.player.name===n)||engine()[0]}
 function countsWith(player){const c={...positionCounts(mine())};if(player)c[player.pos]=Number(c[player.pos]||0)+1;return c}
 function timeline(){
  const cur=state.drafted.length,last=state.drafted[cur-1],owner=mine();let next=cur;
  for(let i=cur+1;i<=cur+24;i++){if(draftOrderAt(i)===owner){next=i;break}}
  const upcoming=[];for(let i=cur;i<=next&&upcoming.length<7;i++)upcoming.push({pick:i+1,team:draftOrderAt(i),mine:draftOrderAt(i)===owner,current:i===cur});
  return{cur,last,next,away:Math.max(0,next-cur),upcoming};
 }
 function metrics(item){
  const c=countsWith(item?.player),proj=Number(item?.player?.proj||0),risk=String(item?.player?.risk||'Medium');
  const filled=Object.keys(STARTERS).reduce((a,k)=>a+Math.min(Number(c[k]||0),STARTERS[k]),0),total=Object.values(STARTERS).reduce((a,b)=>a+b,0);
  const balance=clamp(Math.round(42+58*(filled/total)));
  const ceiling=clamp(Math.round(45+Math.min(38,proj/13)+(Number(item?.factors?.scarcity||0))*.12));
  const positional=clamp(Math.round(48+(Number(item?.factors?.need||0))*.22+(Number(item?.factors?.projection||0))*.18));
  const safety=risk==='Low'?88:risk==='High'?58:74;
  const championship=clamp(Math.round(10+(balance-50)*.12+(ceiling-50)*.08+(safety-50)*.035+(positional-50)*.045),4,45);
  const playoff=clamp(Math.round(50+(balance-50)*.35+(ceiling-50)*.22+(safety-50)*.12),25,96);
  return{balance,ceiling,positional,safety,championship,playoff,risk};
 }
 function baseline(){const first=engine()[0];return first?metrics(first):{championship:10}}
 function openNeeds(item){const c=countsWith(item.player);return POSITIONS.filter(pos=>Number(c[pos]||0)<Number(STARTERS[pos]||1));}
 function consequences(item,m){
  const needs=openNeeds(item),pos=item.player.pos,scarcity=Number(item.factors?.scarcity||0),fit=Number(item.factors?.need||0);
  const take=[];
  take.push(`${pos} adds ${Math.round(item.player.proj||0)} projected points`);
  if(fit>=85)take.push(`Closes an immediate ${pos} starting need`);else take.push('Adds best-value roster strength');
  if(scarcity>=55)take.push(`Secures the position before a meaningful tier drop`);
  take.push(`Next priority becomes ${needs[0]||'best available value'}`);
  const pass=[];
  if(scarcity>=70)pass.push(`${pos} tier is likely to close before your next pick`);else if(scarcity>=45)pass.push(`${pos} options thin noticeably before your next pick`);else pass.push('Comparable options may remain available');
  pass.push(`${Math.max(1,timeline().away)} selections occur before you are back on the clock`);
  if(pos==='QB'&&Number(item.player.posRank||99)<=10)pass.push('Passing risks losing the remaining upper QB tier in this 2QB room');
  else pass.push(`Roster still carries ${needs.length||0} open starting needs`);
  return{take:take.slice(0,4),pass:pass.slice(0,4)};
 }
 function dna(m,item){
  const c=countsWith(item.player),strengths=[],watch=[];
  if(Number(c.QB||0)>=2)strengths.push('Starting QBs secured');else watch.push('QB2 remains open');
  if(Number(c.RB||0)>=2)strengths.push('Strong RB foundation');else watch.push('RB starter still needed');
  if(Number(c.WR||0)>=2)strengths.push('Playable WR core');else watch.push('WR depth needed');
  if(m.ceiling>=80)strengths.push('High weekly ceiling');
  strengths.push(m.safety>=82?'Low volatility':'Controlled risk');
  const identity=m.balance>=88&&m.ceiling>=82?'Built to pressure the league every week':m.ceiling>=82?'Explosive roster with finishing work ahead':m.balance>=82?'Balanced contender profile':'High-upside build still filling core needs';
  return{strengths:strengths.slice(0,4),watch:watch.slice(0,3),identity};
 }
 function blueprint(item){
  const all=engine(),counts=countsWith(item.player),chosen=[{p:item.player,status:'Current decision'}];
  for(const pos of POSITIONS){
   let need=Math.max(0,Number(TARGETS[pos]||0)-Number(counts[pos]||0));
   for(const x of all.filter(x=>x.player.pos===pos&&x.player.name!==item.player.name)){
    if(!need||chosen.length>=14)break;if(chosen.some(y=>y.p.name===x.player.name))continue;
    chosen.push({p:x.player,status:'Projected target'});need--;
   }
  }
  return chosen;
 }
 function groupedBlueprint(plan){return POSITIONS.map(pos=>({pos,players:plan.filter(x=>x.p.pos===pos)})).filter(g=>g.players.length)}
 function render(){
  const item=focus();if(!item)return;const t=timeline(),m=metrics(item),base=baseline(),delta=m.championship-base.championship,dnaData=dna(m,item),impact=consequences(item,m);
  let host=document.getElementById('cockpitV5');
  const anchor=document.getElementById('gooseThinking')?.closest('.gm-card')||document.getElementById('gooseThinking')?.parentElement;
  if(!host){host=document.createElement('section');host.id='cockpitV5';host.className='cockpit-v5';anchor?.insertAdjacentElement('afterend',host)}
  host.innerHTML=`
   <div class="draft-heartbeat-summary"><span><small>LAST PICK</small><b>${esc(t.last?.player||t.last?.name||'—')}</b></span><span class="live"><small>CURRENT</small><b>Pick ${t.cur+1}</b></span><span><small>YOUR NEXT PICK</small><b>${t.next?`Pick ${t.next+1}`:'—'}</b></span><span><small>WAIT</small><b>${t.away} picks</b></span></div>
   <div class="draft-track">${t.upcoming.map(x=>`<div class="${x.current?'current ':''}${x.mine?'mine':''}"><small>${x.pick}</small><b>${esc(x.team||'Open')}</b></div>`).join('')}</div>
   <div class="championship-strip"><div class="title-odds"><small>CHAMPIONSHIP PROBABILITY</small><strong>${m.championship}%</strong><em class="${delta>0?'up':delta<0?'down':''}">${delta===0?'Goose baseline':`${delta>0?'+':''}${delta}% vs Goose choice`}</em></div><div><small>PLAYOFF OUTLOOK</small><b>${m.playoff}%</b></div><div><small>ROSTER BALANCE</small><b>${m.balance}</b></div><div><small>WEEKLY CEILING</small><b>${m.ceiling}</b></div><div><small>POSITIONAL EDGE</small><b>${m.positional}</b></div></div>
   <section class="decision-consequences"><div><span class="eyebrow">IF YOU DRAFT ${esc(item.player.name)}</span><h4>What improves</h4>${impact.take.map(x=>`<p><i>+</i>${esc(x)}</p>`).join('')}</div><div class="pass"><span class="eyebrow">IF YOU PASS</span><h4>What you risk</h4>${impact.pass.map(x=>`<p><i>−</i>${esc(x)}</p>`).join('')}</div></section>
   <div class="roster-dna"><span class="eyebrow">ROSTER DNA</span><h3>${esc(dnaData.identity)}</h3><div class="dna-columns"><section><small>STRENGTHS</small>${dnaData.strengths.map(x=>`<b>+ ${esc(x)}</b>`).join('')}</section><section><small>WATCH</small>${dnaData.watch.length?dnaData.watch.map(x=>`<b>− ${esc(x)}</b>`).join(''):'<b>No major starting gap</b>'}</section></div></div>`;
  renderBlueprint(item,m,dnaData);
  renderHistory(item,m,delta);
 }
 function renderBlueprint(item,m,dnaData){
  const root=document.getElementById('nextFive');if(!root)return;const plan=blueprint(item),groups=groupedBlueprint(plan),panel=root.closest('.projection-panel');
  if(panel){panel.classList.add('championship-blueprint-panel');const title=panel.querySelector('h3');if(title)title.textContent='Championship Blueprint';const eyebrow=panel.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='LIVE FINISHED-ROSTER PLAN';const btn=panel.querySelector('#simulateDraftBtn');if(btn)btn.textContent='Recalculate';}
  root.innerHTML=`<div class="blueprint-hero"><div><small>PROJECTED TITLE ODDS</small><strong>${m.championship}%</strong></div><div><small>PROJECTED IDENTITY</small><b>${esc(dnaData.identity)}</b></div><div><small>BIGGEST WATCH</small><b>${esc(dnaData.watch[0]||'No major gap')}</b></div></div><div class="blueprint-depth-chart">${groups.map(group=>`<section><header>${group.pos}</header>${group.players.map(({p,status})=>`<button data-cockpit-player="${encodeURIComponent(p.name)}"><b>${esc(p.name)}</b><small>${status} · ${Math.round(p.proj||0)} pts</small></button>`).join('')}</section>`).join('')}</div>`;
 }
 function renderHistory(item,m,delta){
  const side=document.querySelector('.front-office-layout>*:last-child');if(!side)return;let h=document.getElementById('decisionHistory');if(!h){h=document.createElement('section');h.id='decisionHistory';h.className='decision-history';side.appendChild(h)}
  const picks=(state.drafted||[]).filter(x=>x.team===mine()||x.owner===mine()).slice(-4).reverse();
  h.innerHTML=`<span class="eyebrow">DECISION HISTORY</span><h4>Your draft story</h4>${picks.length?picks.map(x=>`<div><b>${esc(x.player||x.name||'Pick')}</b><small>Roster updated · Blueprint recalculated</small></div>`).join(''):'<p>Your completed decisions will appear here.</p>'}<div class="history-preview"><b>Exploring: ${esc(item.player.name)}</b><small>${m.championship}% title probability${delta?` · ${delta>0?'+':''}${delta}% vs Goose baseline`:''}</small></div>`;
 }
 function styles(){if(document.getElementById('cockpitV52Style'))return;const s=document.createElement('style');s.id='cockpitV52Style';s.textContent=`
 .cockpit-v5{margin:14px 0 18px}.draft-heartbeat-summary{display:grid;grid-template-columns:repeat(4,1fr);border-block:1px solid #d9dde2;padding:12px 4px;background:linear-gradient(90deg,#fafafa,#fff)}.draft-heartbeat-summary span{padding:4px 14px;border-right:1px solid #e1e4e8}.draft-heartbeat-summary span:last-child{border:0}.draft-heartbeat-summary small,.championship-strip small,.blueprint-hero small{display:block;font-size:9px;letter-spacing:.08em;color:#7a7f87}.draft-heartbeat-summary b{font-size:14px}.draft-heartbeat-summary .live b{color:#d86100}.draft-track{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;padding:9px 0 3px}.draft-track div{min-width:0;padding:8px 9px;border-radius:11px;background:#eef0f3}.draft-track small,.draft-track b{display:block}.draft-track small{font-size:9px;color:#777c84}.draft-track b{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.draft-track .current{background:#30343a;color:#fff}.draft-track .mine{outline:2px solid #e77900;background:#fff4e8;color:#7a3c00}
 .championship-strip{display:grid;grid-template-columns:1.45fr repeat(4,1fr);align-items:center;margin-top:10px;padding:17px 18px;border-radius:18px;background:linear-gradient(115deg,#25282d,#3b3f45);color:#fff;box-shadow:0 12px 30px rgba(25,28,32,.12)}.championship-strip>div{padding:2px 14px;border-right:1px solid rgba(255,255,255,.13)}.championship-strip>div:last-child{border:0}.championship-strip strong{font-size:40px;display:block;line-height:1}.championship-strip b{font-size:20px}.championship-strip em{display:block;font-size:10px;color:#c9cdd2;font-style:normal;margin-top:5px}.championship-strip em.up{color:#9fe0b5}.championship-strip em.down{color:#ffb2a8}.championship-strip small{color:#b9bec5}
 .decision-consequences{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:14px;border-block:1px solid #d9dde2}.decision-consequences>div{padding:18px 20px}.decision-consequences>div:first-child{border-right:1px solid #d9dde2}.decision-consequences h4{font-size:19px;margin:5px 0 10px}.decision-consequences p{display:flex;gap:8px;margin:7px 0;font-size:12px;line-height:1.35;color:#555b63}.decision-consequences i{font-style:normal;color:#26834a;font-weight:900}.decision-consequences .pass i{color:#b54135}
 .roster-dna{padding:18px 4px 7px}.roster-dna h3{font-size:19px;margin:6px 0 14px}.dna-columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}.dna-columns small{display:block;font-size:9px;letter-spacing:.08em;color:#858a91;margin-bottom:7px}.dna-columns b{display:block;font-size:11px;margin:6px 0}
 .championship-blueprint-panel{overflow:hidden}.championship-blueprint-panel #nextFive{display:block!important}.blueprint-hero{display:grid;grid-template-columns:.7fr 1.35fr 1fr;gap:1px;background:#30343a;border-radius:16px;overflow:hidden;margin-bottom:16px}.blueprint-hero>div{padding:15px 16px;background:#30343a;color:#fff;min-width:0}.blueprint-hero>div+div{border-left:1px solid rgba(255,255,255,.12)}.blueprint-hero small{color:#bfc4ca}.blueprint-hero strong{font-size:28px}.blueprint-hero b{display:block;font-size:12px;line-height:1.35;margin-top:5px}
 .blueprint-depth-chart{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}.blueprint-depth-chart section{min-width:0;padding:12px;border-radius:14px;background:#f1f3f5}.blueprint-depth-chart header{font-size:10px;font-weight:900;letter-spacing:.08em;color:#c45d00;margin-bottom:8px}.blueprint-depth-chart button{display:block;width:100%;min-width:0;text-align:left;border:1px solid #d9dde2;border-radius:11px;background:#fff;padding:10px 11px;margin-top:7px}.blueprint-depth-chart b,.blueprint-depth-chart small{display:block;white-space:normal;overflow-wrap:anywhere}.blueprint-depth-chart b{font-size:12px}.blueprint-depth-chart small{font-size:9px;color:#777c84;margin-top:3px;line-height:1.3}
 .decision-history{margin-top:14px;padding:16px;border-top:1px solid #d9dde2}.decision-history h4{margin:5px 0 10px;font-size:18px}.decision-history>div{padding:9px 0;border-bottom:1px solid #e5e7ea}.decision-history b,.decision-history small{display:block}.decision-history small{font-size:9px;color:#777c84;margin-top:3px}.history-preview{color:#9b4a00}
 @media(max-width:1000px){.blueprint-depth-chart{grid-template-columns:repeat(2,minmax(0,1fr))}.draft-track{grid-template-columns:repeat(4,minmax(0,1fr))}.championship-strip{grid-template-columns:1.3fr 1fr 1fr}.championship-strip>div{border:0;padding:8px}}
 @media(max-width:700px){.draft-heartbeat-summary,.decision-consequences,.dna-columns{grid-template-columns:1fr 1fr}.championship-strip,.blueprint-hero,.blueprint-depth-chart{grid-template-columns:1fr}.blueprint-hero>div+div{border-left:0;border-top:1px solid rgba(255,255,255,.12)}}`;
 document.head.appendChild(s)}
 function wrap(){if(typeof renderWarroom!=='function'||renderWarroom.__v52)return false;const base=renderWarroom;renderWarroom=function(){base();setTimeout(render,0)};renderWarroom.__v52=true;return true}
 function init(){styles();if(wrap())render();else setTimeout(init,150)}
 init();
})();