'use strict';
(function(){
 const S={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};
 const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
 const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v||'');
 function engine(){return window.BoardDecisionEngine?.results?.()||[]}
 function mine(){return state.profile.teamName}
 function focus(){const n=window.BoardCockpit?.selected?.();return engine().find(x=>x.player.name===n)||engine()[0]}
 function timeline(){
  const cur=state.drafted.length,last=state.drafted[cur-1],owner=mine();let next=cur;
  for(let i=cur+1;i<=cur+24;i++){if(draftOrderAt(i)===owner){next=i;break}}
  return {cur,last,next,away:Math.max(0,next-cur)};
 }
 function hypotheticalCounts(p){const c={...positionCounts(mine())};if(p)c[p.pos]=Number(c[p.pos]||0)+1;return c}
 function metrics(item){
  const c=hypotheticalCounts(item?.player), proj=Number(item?.player?.proj||0), risk=String(item?.player?.risk||'Medium');
  const filled=Object.keys(S).reduce((a,k)=>a+Math.min(Number(c[k]||0),S[k]),0), total=Object.values(S).reduce((a,b)=>a+b,0);
  const balance=clamp(Math.round(42+58*(filled/total)));
  const ceiling=clamp(Math.round(48+Math.min(35,proj/14)+(item?.factors?.scarcity||0)*.12));
  const safety=risk==='Low'?88:risk==='High'?58:74;
  const base=10; // 10-team league baseline championship prior.
  const championship=clamp(Math.round(base+(balance-50)*.12+(ceiling-50)*.08+(safety-50)*.035),4,45);
  const playoff=clamp(Math.round(50+(balance-50)*.35+(ceiling-50)*.22+(safety-50)*.12),25,96);
  return {balance,ceiling,safety,championship,playoff,risk};
 }
 function dna(m){
  const traits=[];
  if(m.balance>=85)traits.push('Balanced starting core');else traits.push('Roster still has starting gaps');
  if(m.ceiling>=80)traits.push('High weekly ceiling');else if(m.ceiling>=68)traits.push('Competitive weekly ceiling');
  traits.push(m.safety>=82?'Low volatility profile':m.safety<65?'Aggressive boom/bust profile':'Controlled risk profile');
  return traits;
 }
 function blueprint(item){
  const all=engine(), counts=hypotheticalCounts(item.player), out=[{p:item.player,status:'Current path'}];
  const desired={QB:3,RB:4,WR:5,TE:2,K:1,DEF:1};
  for(const pos of Object.keys(desired)){
   let need=Math.max(0,desired[pos]-Number(counts[pos]||0));
   for(const x of all.filter(x=>x.player.pos===pos&&x.player.name!==item.player.name)){
    if(!need||out.length>=12)break;if(out.some(y=>y.p.name===x.player.name))continue;
    out.push({p:x.player,status:'Projected'});need--;
   }
  }
  return out;
 }
 function render(){
  const item=focus();if(!item)return;const t=timeline(),m=metrics(item),traits=dna(m);
  let host=document.getElementById('cockpitV5');
  const anchor=document.getElementById('gooseThinking')?.closest('.gm-card')||document.getElementById('gooseThinking')?.parentElement;
  if(!host){host=document.createElement('section');host.id='cockpitV5';host.className='cockpit-v5';anchor?.insertAdjacentElement('afterend',host)}
  host.innerHTML=`<div class="draft-heartbeat"><span><small>LAST PICK</small><b>${esc(t.last?.player||t.last?.name||'—')}</b></span><span class="live"><small>CURRENT</small><b>Pick ${t.cur+1}</b></span><span><small>YOUR NEXT PICK</small><b>${t.next?`Pick ${t.next+1}`:'—'}</b></span><span><small>ON THE CLOCK IN</small><b>${t.away} picks</b></span></div>
  <div class="championship-strip"><div><small>CHAMPIONSHIP PROBABILITY</small><strong>${m.championship}%</strong><em>Live model for this league</em></div><div><small>PLAYOFF OUTLOOK</small><b>${m.playoff}%</b></div><div><small>ROSTER BALANCE</small><b>${m.balance}</b></div><div><small>WEEKLY CEILING</small><b>${m.ceiling}</b></div><div><small>RISK PROFILE</small><b>${esc(m.risk)}</b></div></div>
  <div class="roster-dna"><span class="eyebrow">ROSTER DNA</span><div>${traits.map(x=>`<b>${esc(x)}</b>`).join('')}</div><p>Identity updates with every hypothetical path and every completed pick.</p></div>`;
  const root=document.getElementById('nextFive');if(root){const plan=blueprint(item);const panel=root.closest('.projection-panel');panel?.querySelector('h3')&&(panel.querySelector('h3').textContent='Championship Blueprint');panel?.querySelector('.eyebrow')&&(panel.querySelector('.eyebrow').textContent='PROJECTED FINISHED ROSTER');root.innerHTML=`<div class="blueprint-summary"><span><small>OUTLOOK</small><b>${m.championship}% title probability</b></span><span><small>IDENTITY</small><b>${esc(traits[1]||traits[0])}</b></span></div><div class="blueprint-roster">${plan.map(({p,status})=>`<button data-cockpit-player="${encodeURIComponent(p.name)}"><span class="bp-pos">${esc(p.pos)}</span><span><b>${esc(p.name)}</b><small>${status} · ${Math.round(p.proj||0)} pts</small></span></button>`).join('')}</div>`}
  renderHistory(item,m);
 }
 function renderHistory(item,m){
  const side=document.querySelector('.front-office-layout>*:last-child');if(!side)return;
  let h=document.getElementById('decisionHistory');if(!h){h=document.createElement('section');h.id='decisionHistory';h.className='decision-history';side.appendChild(h)}
  const picks=(state.drafted||[]).filter(x=>x.team===mine()||x.owner===mine()).slice(-4).reverse();
  h.innerHTML=`<span class="eyebrow">DECISION HISTORY</span><h4>Draft story</h4>${picks.length?picks.map(x=>`<div><b>${esc(x.player||x.name||'Pick')}</b><small>Roster updated · Blueprint recalculated</small></div>`).join(''):`<p>Your decisions will build the story here.</p>`}<div class="history-preview"><b>Current path: ${esc(item.player.name)}</b><small>${m.championship}% championship probability if selected now</small></div>`;
 }
 function styles(){if(document.getElementById('cockpitV5Style'))return;const s=document.createElement('style');s.id='cockpitV5Style';s.textContent=`
 .cockpit-v5{margin:14px 0 18px}.draft-heartbeat{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-block:1px solid #d9dde2;background:linear-gradient(90deg,#f7f7f8,#fff);padding:12px 4px}.draft-heartbeat span{padding:4px 14px;border-right:1px solid #e1e4e8}.draft-heartbeat span:last-child{border:0}.draft-heartbeat small,.championship-strip small,.blueprint-summary small{display:block;font-size:9px;letter-spacing:.08em;color:#7a7f87}.draft-heartbeat b{font-size:14px}.draft-heartbeat .live b{color:#d86100}.championship-strip{display:grid;grid-template-columns:1.4fr repeat(4,1fr);align-items:center;margin-top:10px;padding:17px 18px;border-radius:18px;background:linear-gradient(110deg,#26292e,#3b3f45);color:#fff;box-shadow:0 12px 30px rgba(25,28,32,.12)}.championship-strip>div{padding:2px 14px;border-right:1px solid rgba(255,255,255,.13)}.championship-strip>div:last-child{border:0}.championship-strip strong{font-size:38px;display:block;line-height:1}.championship-strip b{font-size:20px}.championship-strip em{display:block;font-size:9px;color:#c9cdd2;font-style:normal;margin-top:5px}.championship-strip small{color:#b9bec5}.roster-dna{padding:16px 4px 4px}.roster-dna>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.roster-dna b{padding:7px 10px;border-radius:999px;background:#eef0f2;font-size:11px}.roster-dna p{font-size:10px;color:#7b8087}.blueprint-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.blueprint-summary span{padding:12px;border-radius:12px;background:#2f3338;color:#fff}.blueprint-summary small{color:#bfc4ca}.blueprint-roster{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.blueprint-roster button{display:grid;grid-template-columns:42px 1fr;gap:9px;align-items:center;text-align:left;border:0;border-radius:11px;background:#f5f6f7;padding:9px}.bp-pos{font-size:10px;font-weight:850;color:#d86100}.blueprint-roster b,.blueprint-roster small{display:block}.blueprint-roster small{font-size:9px;color:#777c84;margin-top:2px}.decision-history{margin-top:14px;padding:16px;border-top:1px solid #d9dde2}.decision-history h4{margin:5px 0 10px;font-size:18px}.decision-history>div{padding:9px 0;border-bottom:1px solid #e5e7ea}.decision-history b,.decision-history small{display:block}.decision-history small{font-size:9px;color:#777c84;margin-top:3px}.history-preview{color:#9b4a00}
 @media(max-width:900px){.draft-heartbeat{grid-template-columns:1fr 1fr}.championship-strip{grid-template-columns:1fr 1fr}.championship-strip>div{border:0;padding:8px}.blueprint-roster{grid-template-columns:1fr}}
 `;document.head.appendChild(s)}
 function wrap(){if(typeof renderWarroom!=='function'||renderWarroom.__v5)return false;const base=renderWarroom;renderWarroom=function(){base();setTimeout(render,0)};renderWarroom.__v5=true;return true}
 function init(){styles();if(wrap())render();else setTimeout(init,150)}
 init();
})();