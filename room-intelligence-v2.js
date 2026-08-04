'use strict';

(function(){
  const STARTERS={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};
  let selectedPlayerName='';

  const esc=value=>typeof escapeHtml==='function'?escapeHtml(value):String(value||'');
  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));

  function results(){return window.BoardDecisionEngine?.results?.()||[];}
  function selectedItem(all=results()){
    return all.find(item=>item.player.name===selectedPlayerName)||all[0]||null;
  }
  function nextPickContext(){
    const current=state.drafted.length,mine=state.profile.teamName,limit=(state.teams.length||10)*2+2;
    let next=current;
    for(let i=current+1;i<=current+limit;i++){if(draftOrderAt(i)===mine){next=i;break;}}
    const teams=[];for(let i=current+1;i<next;i++)teams.push(draftOrderAt(i));
    return{current,next,picksAway:Math.max(0,next-current),teams};
  }
  function teamNeeds(team,pos,extraPlayer){
    try{
      const counts={...positionCounts(team)};
      if(team===state.profile.teamName&&extraPlayer)counts[extraPlayer.pos]=Number(counts[extraPlayer.pos]||0)+1;
      return Number(counts[pos]||0)<Number(STARTERS[pos]||1);
    }catch{return false;}
  }
  function uniqueThreats(player,context){
    const seen=new Set();
    return context.teams.filter(team=>{
      if(!team||team===state.profile.teamName||seen.has(team))return false;
      seen.add(team);return teamNeeds(team,player.pos);
    });
  }
  function survival(player,context){
    const threats=uniqueThreats(player,context),rank=Number(player.posRank||99),picks=context.picksAway;
    if(player.pos==='QB'&&rank<=8&&picks>=5)return{available:picks<=7?8:2,label:'Almost certainly gone',threats};
    if(player.pos==='QB'&&rank<=12&&picks>=7)return{available:12,label:'Very unlikely',threats};
    let pressure=.03;
    if(player.pos==='QB')pressure=rank<=12?.13:rank<=20?.085:rank<=28?.05:.025;
    else if(player.pos==='RB')pressure=rank<=12?.075:rank<=26?.05:.028;
    else if(player.pos==='WR')pressure=rank<=15?.065:rank<=32?.045:.025;
    else if(player.pos==='TE')pressure=rank<=8?.055:.025;
    const gone=clamp(Math.round(((1-Math.pow(1-pressure,Math.max(1,picks)))+Math.min(.55,threats.length*(player.pos==='QB'?.12:.07)))*100),5,96);
    const available=100-gone;
    return{available,label:available>=70?'Likely available':available>=40?'Toss-up':available>=15?'Unlikely':'Almost certainly gone',threats};
  }
  function rosterFit(item){
    const value=Number(item?.factors?.need||0);
    return value>=85?'Immediate need':value>=55?'Useful fit':'Best value';
  }
  function urgency(item){
    const value=Number(item?.factors?.scarcity||0);
    return value>=70?'Act now':value>=45?'Monitor':'Can wait';
  }
  function alternatives(all,focus){
    const same=all.filter(x=>x.player.name!==focus.player.name&&x.player.pos===focus.player.pos).slice(0,2);
    const overall=all.filter(x=>x.player.name!==focus.player.name&&!same.some(y=>y.player.name===x.player.name)).slice(0,2);
    return [...same,...overall].slice(0,4);
  }
  function nextPickPlayers(all,focus,context){
    return all.filter(x=>x.player.name!==focus.player.name)
      .map(item=>({item,forecast:survival(item.player,context)}))
      .filter(x=>x.forecast.available>=40)
      .sort((a,b)=>b.item.score-a.item.score||b.forecast.available-a.forecast.available)
      .slice(0,5);
  }
  function nextPriority(focus){
    const counts={...positionCounts(state.profile.teamName)};
    counts[focus.player.pos]=Number(counts[focus.player.pos]||0)+1;
    return ['QB','RB','WR','TE','K','DEF'].find(pos=>Number(counts[pos]||0)<Number(STARTERS[pos]||1))||'Best value';
  }
  function recommendationCopy(item){
    const reasons=item.reasons?.length?item.reasons.join(', '):'creates the strongest overall roster outcome';
    return `${item.player.name} ${reasons}.`;
  }

  function renderHero(focus,all,context){
    const thinking=document.getElementById('gooseThinking');if(!thinking)return;
    const forecast=survival(focus.player,context);
    const isEngineChoice=focus===all[0];
    thinking.innerHTML=`
      <p class="gm-kicker">${isEngineChoice?'GOOSE RECOMMENDATION':'EXPLORING ANOTHER PATH'} · ${rosterFit(focus)}</p>
      <h2>${typeof currentTeam==='function'&&currentTeam()===state.profile.teamName?'Draft':'Track'} ${esc(focus.player.name)}.</h2>
      <p>${esc(recommendationCopy(focus))}</p>
      <div class="engine-factor-line">
        <span><b>Roster Fit</b> ${rosterFit(focus)}</span>
        <span><b>Timing</b> ${urgency(focus)}</span>
        <span><b>Projected</b> ${Math.round(focus.player.proj||0)} pts</span>
        <span><b>Risk</b> ${esc(focus.player.risk||'Medium')}</span>
      </div>
      <div class="cockpit-pass-line"><b>If you pass:</b> ${forecast.label} to reach your next pick after ${context.picksAway} selections.</div>`;
    const actions=document.getElementById('recommend');
    if(actions){
      actions.innerHTML=`<button class="btn primary" data-player="${encodeURIComponent(focus.player.name)}">Open Player</button><button class="btn secondary" data-jump="board">Open Board</button>${!isEngineChoice?'<button class="btn ghost" data-cockpit-reset="true">Reset to Goose</button>':''}`;
    }
  }

  function renderDecisionCockpit(focus,all,context){
    const root=document.getElementById('decisionPaths');if(!root)return;
    const alts=alternatives(all,focus),next=nextPickPlayers(all,focus,context),priority=nextPriority(focus);
    root.innerHTML=`
      <section class="cockpit-alternatives">
        <div class="cockpit-section-head"><div><span class="eyebrow">ALTERNATIVE STRATEGIES</span><h4>Other choices right now</h4></div><small>Click a player to recalculate the entire Front Office.</small></div>
        <div class="alternative-grid">${alts.map(item=>`<button data-cockpit-player="${encodeURIComponent(item.player.name)}"><span><b>${esc(item.player.name)}</b><small>${item.player.pos} · ${Math.round(item.player.proj||0)} pts · ${esc(item.player.risk||'Medium')} risk</small></span><em>${rosterFit(item)}</em></button>`).join('')}</div>
      </section>
      <section class="cockpit-next-pick">
        <div class="cockpit-section-head"><div><span class="eyebrow">PROJECTED AVAILABLE NEXT PICK</span><h4>Best realistic survivors</h4></div><small>Assumes you draft ${esc(focus.player.name)} now.</small></div>
        <div class="next-pick-list">${next.length?next.map(({item,forecast})=>`<button data-cockpit-player="${encodeURIComponent(item.player.name)}"><span><b>${esc(item.player.name)}</b><small>${item.player.pos} · ${Math.round(item.player.proj||0)} pts</small></span><em>${forecast.label}</em></button>`).join(''):'<p>No preferred-tier player is currently projected to survive.</p>'}</div>
        <div class="next-priority"><b>Next roster priority after this pick</b><span>${esc(priority)}</span></div>
      </section>`;
  }

  function perfectDraft(focus,all){
    const counts={...positionCounts(state.profile.teamName)};
    const chosen=[focus.player];counts[focus.player.pos]=Number(counts[focus.player.pos]||0)+1;
    const pool=all.filter(x=>x.player.name!==focus.player.name);
    const target=state.profile?.targets||{};
    const desired={QB:Number(target.QB||3),RB:Number(target.RB||4),WR:Number(target.WR||5),TE:Number(target.TE||2),K:Number(target.K||1),DEF:Number(target.DEF||1)};
    for(const pos of ['QB','RB','WR','TE','K','DEF']){
      let need=Math.max(0,desired[pos]-Number(counts[pos]||0));
      for(const item of pool.filter(x=>x.player.pos===pos)){
        if(need<=0||chosen.length>=10)break;
        if(chosen.some(p=>p.name===item.player.name))continue;
        chosen.push(item.player);need--;
      }
    }
    return chosen.slice(0,10);
  }
  function renderPerfectDraft(focus,all){
    const root=document.getElementById('nextFive');if(!root)return;
    const panel=root.closest('.projection-panel');
    const title=panel?.querySelector('h3');if(title)title.textContent='Perfect Draft';
    const eyebrow=panel?.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='LIVE ROSTER PLAN';
    const button=panel?.querySelector('#simulateDraftBtn');if(button)button.textContent='Recalculate';
    const plan=perfectDraft(focus,all);
    root.innerHTML=plan.map((player,index)=>`<button data-cockpit-player="${encodeURIComponent(player.name)}"><span>${index+1}</span><b>${esc(player.name)}</b><small>${player.pos} · ${Math.round(player.proj||0)} pts${index===0?' · Current path':''}</small></button>`).join('');
  }
  function renderLeagueIntel(focus,context){
    const root=document.getElementById('draftPressure');if(!root)return;
    const threats=uniqueThreats(focus.player,context).slice(0,4);
    const positions=['QB','RB','WR','TE'].map(pos=>{
      const teams=[...new Set(context.teams.filter(Boolean))],needing=teams.filter(team=>teamNeeds(team,pos)).length;
      return{pos,needing,total:teams.length,score:clamp((pos==='QB'?30:15)+needing*(pos==='QB'?15:10),5,95)};
    }).sort((a,b)=>b.score-a.score);
    root.innerHTML=`<div class="league-intel-stack"><section><span class="eyebrow">OWNER THREATS</span><h4>Who can beat us to ${esc(focus.player.name)}</h4>${threats.length?threats.map((team,index)=>`<div class="intel-row"><span><b>${esc(team)}</b><small>Needs ${focus.player.pos} before your next pick</small></span><strong>${index===0?'High':index===1?'Medium':'Watch'}</strong></div>`).join(''):'<p>No clear same-position threat before your next pick.</p>'}</section><section><span class="eyebrow">ROOM PULSE</span><h4>${positions[0]?.pos||'Draft'} market is hottest</h4>${positions.map(item=>`<div class="pulse-row"><div><b>${item.pos}</b><small>${item.needing} of ${item.total} upcoming owners need help</small></div><div class="pulse-track"><i style="width:${item.score}%"></i></div><strong>${item.score>=70?'Hot':item.score>=45?'Heating':'Calm'}</strong></div>`).join('')}</section></div>`;
  }

  function renderCockpit(){
    const all=results(),focus=selectedItem(all);if(!focus)return;
    const context=nextPickContext();
    renderHero(focus,all,context);renderDecisionCockpit(focus,all,context);renderPerfectDraft(focus,all);renderLeagueIntel(focus,context);
  }

  function injectStyles(){
    if(document.getElementById('front-office-v4-style'))return;
    const style=document.createElement('style');style.id='front-office-v4-style';style.textContent=`
      .cockpit-pass-line{margin-top:15px;padding:11px 13px;border-radius:12px;background:#f2f3f5;border:1px solid #dde0e4;color:#555b63;font-size:12px}
      .decision-futures{display:grid!important;grid-template-columns:1fr!important;gap:14px!important}
      .cockpit-alternatives,.cockpit-next-pick{padding:20px;border:1px solid #d5d9de;border-radius:16px;background:#fff}
      .cockpit-alternatives{border-top:5px solid #f47a00}.cockpit-section-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:13px}.cockpit-section-head h4{font-size:21px;margin:6px 0 0}.cockpit-section-head>small{max-width:250px;text-align:right;color:#757a82;line-height:1.35}
      .alternative-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.alternative-grid button,.next-pick-list button{display:flex;justify-content:space-between;gap:12px;width:100%;padding:13px;border:1px solid #d9dde1;border-radius:12px;background:#f8f9fa;text-align:left;transition:.15s ease}.alternative-grid button:hover,.next-pick-list button:hover{border-color:#f0a15d;background:#fff7ef;transform:translateY(-1px)}
      .alternative-grid span,.alternative-grid b,.alternative-grid small,.next-pick-list span,.next-pick-list b,.next-pick-list small{display:block}.alternative-grid small,.next-pick-list small{margin-top:4px;color:#737880;font-size:10px}.alternative-grid em,.next-pick-list em{align-self:center;font-size:10px;font-style:normal;color:#9f4b00;text-align:right}
      .next-pick-list{display:grid;gap:8px}.next-pick-list button{background:#fff}.next-priority{display:flex;justify-content:space-between;gap:14px;margin-top:13px;padding:12px 13px;border-radius:12px;background:#30343a;color:#fff}.next-priority b,.next-priority span{font-size:12px;color:#fff}
      .league-intel-stack{display:grid;gap:14px}.league-intel-stack>section{padding:16px;border:1px solid #d5d9de;border-radius:14px;background:#fff}.league-intel-stack h4{font-size:18px;margin:7px 0 12px}.intel-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #e1e4e7}.intel-row:last-child{border-bottom:0}.intel-row span,.intel-row b,.intel-row small{display:block}.intel-row small{margin-top:3px;color:#737880;font-size:10px}.intel-row strong{align-self:center;font-size:10px;color:#9f4b00}
      .pulse-row{display:grid;grid-template-columns:minmax(0,1fr) 90px auto;gap:9px;align-items:center;padding:8px 0}.pulse-row div:first-child b,.pulse-row div:first-child small{display:block}.pulse-row small{color:#777c84;font-size:9px}.pulse-track{height:9px;border-radius:999px;background:#e7e9ec;overflow:hidden}.pulse-track i{display:block;height:100%;background:#f47a00;border-radius:999px}.pulse-row strong{font-size:9px;min-width:38px;text-align:right}
      @media(max-width:800px){.alternative-grid{grid-template-columns:1fr}.cockpit-section-head{display:block}.cockpit-section-head>small{display:block;text-align:left;margin-top:6px}.pulse-row{grid-template-columns:1fr auto}.pulse-track{grid-column:1/-1}}
    `;document.head.appendChild(style);
  }

  function wrapRender(){
    if(typeof renderWarroom!=='function'||renderWarroom.__cockpitV4)return false;
    const base=renderWarroom;
    renderWarroom=function(){base();renderCockpit();};renderWarroom.__cockpitV4=true;return true;
  }
  document.addEventListener('click',event=>{
    const choice=event.target.closest('[data-cockpit-player]');
    if(choice){event.preventDefault();event.stopPropagation();selectedPlayerName=decodeURIComponent(choice.dataset.cockpitPlayer||'');renderCockpit();return;}
    if(event.target.closest('[data-cockpit-reset]')){event.preventDefault();selectedPlayerName='';renderCockpit();}
  },true);

  function init(){injectStyles();if(wrapRender()&&typeof activeView!=='undefined'&&activeView==='warroom')renderWarroom();else if(!window.BoardDecisionEngine)setTimeout(init,100);}
  init();
})();
