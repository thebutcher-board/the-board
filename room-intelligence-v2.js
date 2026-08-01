'use strict';

(function(){
  const STARTERS={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};

  function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,value));}
  function esc(value){return typeof escapeHtml==='function'?escapeHtml(value):String(value||'');}

  function nextPickContext(){
    const current=state.drafted.length;
    const mine=state.profile.teamName;
    const limit=(state.teams.length||10)*2+2;
    let next=current;
    for(let i=current+1;i<=current+limit;i++){
      if(draftOrderAt(i)===mine){next=i;break;}
    }
    const teams=[];
    for(let i=current+1;i<next;i++)teams.push(draftOrderAt(i));
    return{current,next,picksAway:Math.max(0,next-current),teams};
  }

  function teamNeeds(team,pos){
    try{return Number(positionCounts(team)?.[pos]||0)<Number(STARTERS[pos]||1);}catch{return false;}
  }

  function uniqueThreats(player,context){
    const seen=new Set();
    return context.teams.filter(team=>{
      if(!team||team===state.profile.teamName||seen.has(team))return false;
      seen.add(team);
      return teamNeeds(team,player.pos);
    });
  }

  function survival(player,context){
    const threats=uniqueThreats(player,context);
    const rank=Number(player.posRank||99);
    const picks=context.picksAway;

    // League-specific hard guardrail: top QBs do not survive long turns in this 2QB room.
    if(player.pos==='QB'&&rank<=8&&picks>=5)return{available:picks<=7?8:2,threats,label:'Almost certainly gone'};
    if(player.pos==='QB'&&rank<=12&&picks>=7)return{available:12,threats,label:'Very unlikely'};

    let pressure=.03;
    if(player.pos==='QB')pressure=rank<=12?.13:rank<=20?.085:rank<=28?.05:.025;
    else if(player.pos==='RB')pressure=rank<=12?.075:rank<=26?.05:.028;
    else if(player.pos==='WR')pressure=rank<=15?.065:rank<=32?.045:.025;
    else if(player.pos==='TE')pressure=rank<=8?.055:.025;

    const base=1-Math.pow(1-pressure,Math.max(1,picks));
    const threatBoost=Math.min(.55,threats.length*(player.pos==='QB'?.12:.07));
    const gone=clamp(Math.round((base+threatBoost)*100),5,96);
    const available=100-gone;
    return{available,threats,label:available>=70?'Likely available':available>=40?'Toss-up':available>=15?'Unlikely':'Almost certainly gone'};
  }

  function roomPulse(context){
    const positions=['QB','RB','WR','TE'];
    return positions.map(pos=>{
      const unique=[...new Set(context.teams.filter(Boolean))];
      const needing=unique.filter(team=>teamNeeds(team,pos)).length;
      const base=pos==='QB'?28:pos==='RB'?18:pos==='WR'?16:10;
      return{pos,score:clamp(base+needing*(pos==='QB'?14:10)+Math.min(context.picksAway,10)*2,5,96),needing,total:unique.length};
    }).sort((a,b)=>b.score-a.score);
  }

  function ownerThreats(player,context){
    return uniqueThreats(player,context).slice(0,4).map((team,index)=>({
      team,
      level:index===0?'High':index===1?'Medium':'Watch',
      reason:`Needs ${player.pos} before your next selection`
    }));
  }

  function fallbackBoard(results,top,context){
    const same=results.filter(item=>item.player.name!==top.player.name&&item.player.pos===top.player.pos);
    return same.slice(0,4).map(item=>({item,forecast:survival(item.player,context)}));
  }

  function draftConsequence(top,results){
    const roster=positionCounts(state.profile.teamName);
    const nextPriority=['QB','RB','WR','TE'].map(pos=>({pos,open:Math.max(0,Number(STARTERS[pos]||1)-Number(roster[pos]||0))}))
      .filter(x=>x.pos!==top.player.pos&&x.open>0)[0]?.pos||'Best value';
    const pool=results.filter(item=>item.player.pos===nextPriority).slice(0,3);
    return{nextPriority,pool};
  }

  function renderDecisionCenter(){
    if(!window.BoardDecisionEngine)return;
    const results=window.BoardDecisionEngine.results();
    const top=results[0];
    const paths=document.getElementById('decisionPaths');
    if(!top||!paths)return;

    const context=nextPickContext();
    const topForecast=survival(top.player,context);
    const fallbacks=fallbackBoard(results,top,context);
    const threats=ownerThreats(top.player,context);
    const consequence=draftConsequence(top,results);

    paths.innerHTML=`
      <article class="decision-scenario take-now">
        <span class="eyebrow">IF YOU TAKE HIM</span>
        <h4>${esc(top.player.name)}</h4>
        <p>Locks in ${top.player.pos} with ${Math.round(top.player.proj||0)} projected points and closes the immediate roster need.</p>
        <div class="scenario-consequence"><b>Next priority</b><span>${esc(consequence.nextPriority)}</span></div>
        ${consequence.pool.length?`<div class="scenario-list"><small>Likely targets after this pick</small>${consequence.pool.map(x=>`<button data-player="${encodeURIComponent(x.player.name)}">${esc(x.player.name)} <span>${x.player.pos} · ${Math.round(x.player.proj||0)} pts</span></button>`).join('')}</div>`:''}
      </article>

      <article class="decision-scenario pass-now">
        <span class="eyebrow">IF YOU PASS</span>
        <h4>${topForecast.label}</h4>
        <p>${topForecast.available}% model estimate that ${esc(top.player.name)} reaches your next pick after ${context.picksAway} selections.</p>
        <div class="scenario-consequence"><b>Room effect</b><span>${top.player.pos==='QB'&&Number(top.player.posRank||99)<=8?'Top-eight QB tier likely closes':'Tier pressure increases'}</span></div>
      </article>

      <article class="decision-scenario owner-threats">
        <span class="eyebrow">WHO CAN BEAT US TO HIM</span>
        <h4>Owner threats</h4>
        ${threats.length?threats.map(t=>`<div class="threat-row"><span><b>${esc(t.team)}</b><small>${esc(t.reason)}</small></span><strong>${t.level}</strong></div>`).join(''):'<p>No clear same-position threat before your next pick.</p>'}
      </article>

      <article class="decision-scenario fallback-plan">
        <span class="eyebrow">IF WE MISS</span>
        <h4>Fallback board</h4>
        ${fallbacks.length?fallbacks.map((f,index)=>`<button data-player="${encodeURIComponent(f.item.player.name)}"><span><b>${index+1}. ${esc(f.item.player.name)}</b><small>${f.item.player.pos} · ${Math.round(f.item.player.proj||0)} pts</small></span><strong>${f.forecast.label}</strong></button>`).join(''):'<p>No same-position fallback grades closely enough.</p>'}
      </article>`;
  }

  function renderRoomPulse(){
    const root=document.getElementById('draftPressure');
    if(!root)return;
    const context=nextPickContext();
    const pulse=roomPulse(context);
    root.innerHTML=`<div class="room-pulse-card"><span class="eyebrow">ROOM PULSE</span><h4>${pulse[0]?.pos||'Draft'} market is hottest</h4>${pulse.map(item=>`<div class="pulse-row"><div><b>${item.pos}</b><small>${item.needing} of ${item.total} upcoming owners need help</small></div><div class="pulse-track"><i style="width:${item.score}%"></i></div><strong>${item.score>=70?'Hot':item.score>=45?'Heating':'Calm'}</strong></div>`).join('')}<small class="model-note">Live model estimate from draft order and current roster needs. Owner-history tendencies come next.</small></div>`;
  }

  function injectStyles(){
    if(document.getElementById('room-intelligence-v2-style'))return;
    const style=document.createElement('style');
    style.id='room-intelligence-v2-style';
    style.textContent=`
      .decision-futures{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}
      .decision-scenario{padding:19px;border:1px solid #d5d9de;border-radius:15px;background:#fff;min-width:0}
      .decision-scenario.take-now{border-top:5px solid #f47a00}.decision-scenario.pass-now{border-top:5px solid #3f444b}
      .decision-scenario h4{font-size:21px;margin:8px 0}.decision-scenario p{font-size:13px;line-height:1.5;color:#60666f}
      .scenario-consequence{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;margin-top:13px;border-radius:11px;background:#f3f4f6}.scenario-consequence b,.scenario-consequence span{font-size:12px}
      .scenario-list{margin-top:13px}.scenario-list>small{display:block;margin-bottom:6px;color:#767b83}.scenario-list button,.fallback-plan button{display:flex;justify-content:space-between;gap:12px;width:100%;padding:10px 0;border:0;border-bottom:1px solid #e1e4e7;background:transparent;text-align:left}.scenario-list button:last-child,.fallback-plan button:last-child{border-bottom:0}.scenario-list button span,.fallback-plan small{color:#777c84;font-size:10px}
      .threat-row{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid #e1e4e7}.threat-row:last-child{border-bottom:0}.threat-row span,.threat-row b,.threat-row small{display:block}.threat-row small{margin-top:3px;color:#737880}.threat-row strong{align-self:center;font-size:11px;color:#9f4b00}
      .fallback-plan button{align-items:center}.fallback-plan button span,.fallback-plan button b,.fallback-plan button small{display:block}.fallback-plan button strong{font-size:11px;color:#9f4b00;text-align:right;max-width:120px}
      .room-pulse-card{padding:17px;background:#fff;border:1px solid #d5d9de;border-radius:14px}.room-pulse-card h4{font-size:19px;margin:7px 0 14px}.pulse-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(80px,120px) auto;gap:10px;align-items:center;padding:9px 0}.pulse-row div:first-child b,.pulse-row div:first-child small{display:block}.pulse-row small{color:#777c84;font-size:10px}.pulse-track{height:10px;border-radius:999px;background:#e7e9ec;overflow:hidden}.pulse-track i{display:block;height:100%;border-radius:999px;background:#f47a00}.pulse-row strong{font-size:10px;min-width:42px;text-align:right}.model-note{display:block;margin-top:10px;line-height:1.4;color:#777c84}
      @media(max-width:800px){.decision-futures{grid-template-columns:1fr!important}.pulse-row{grid-template-columns:1fr auto}.pulse-track{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function wrapRender(){
    if(typeof renderWarroom!=='function'||renderWarroom.__roomV2)return false;
    const base=renderWarroom;
    const wrapped=function(){base();renderDecisionCenter();renderRoomPulse();};
    wrapped.__roomV2=true;
    renderWarroom=wrapped;
    return true;
  }

  function init(){
    injectStyles();
    if(wrapRender()&&typeof activeView!=='undefined'&&activeView==='warroom')renderWarroom();
    else if(!window.BoardDecisionEngine)setTimeout(init,120);
  }

  init();
})();
