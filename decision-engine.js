'use strict';

(function(){
  const WEIGHTS={projection:30,need:28,scarcity:16,value:12,scouting:10,risk:4};
  const RISK_PENALTY={low:0,medium:2,high:5};
  const TAG_BONUS={must_have:10,watch:4,value_only:6,fade:-18};
  const STARTER_NEED={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};

  function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,value));}
  function countAt(position){try{return Number(positionCounts(state.profile.teamName)?.[position]||0);}catch{return 0;}}
  function targetAt(position){try{return Number(targetCount(position)||1);}catch{return 1;}}
  function needScore(player){
    const current=countAt(player.pos),target=targetAt(player.pos),open=Math.max(0,target-current);
    if(player.pos==='QB'){if(current<2)return 100;if(current<3)return 40;return 0;}
    if(!open)return 18;
    return clamp(55+(open/Math.max(1,target))*45);
  }
  function projectionScore(player,pool){
    const values=pool.map(p=>Number(p.proj||0)),high=Math.max(...values,1),low=Math.min(...values,0);
    return high===low?50:clamp(((Number(player.proj||0)-low)/(high-low))*100);
  }
  function scarcityScore(player,pool){
    const same=pool.filter(p=>p.pos===player.pos).sort((a,b)=>Number(b.proj||0)-Number(a.proj||0));
    const index=same.findIndex(p=>p.name===player.name),next=same[index+1];
    const gap=next?Math.max(0,Number(player.proj||0)-Number(next.proj||0)):12;
    const tierBoost=index<3?28:index<8?18:index<15?10:4;
    return clamp(tierBoost+gap*4);
  }
  function valueScore(player){
    const boardRank=Number(player.butcherRank||999),posRank=Number(player.posRank||999);
    return boardRank<999?clamp(105-boardRank*2):clamp(85-posRank*1.5);
  }
  function scoutingScore(player){try{return 50+(TAG_BONUS[scoutingTag(player)]||0)*5;}catch{return 50;}}
  function riskScore(player){return 100-(RISK_PENALTY[String(player.risk||'medium').toLowerCase()]||2)*12;}

  function evaluate(player,pool){
    const factors={projection:projectionScore(player,pool),need:needScore(player),scarcity:scarcityScore(player,pool),value:valueScore(player),scouting:scoutingScore(player),risk:riskScore(player)};
    const score=Object.entries(WEIGHTS).reduce((sum,[key,weight])=>sum+factors[key]*(weight/100),0);
    const reasons=[];
    if(factors.need>=85)reasons.push(`fills your open ${player.pos} starter need`);else if(factors.need>=55)reasons.push(`improves roster construction at ${player.pos}`);
    if(factors.scarcity>=55)reasons.push(`sits near a meaningful ${player.pos} tier break`);
    if(factors.projection>=78)reasons.push('carries one of the strongest remaining projections');
    const tag=typeof scoutingTag==='function'?scoutingTag(player):null;
    if(tag==='must_have')reasons.push('matches your Target signal');
    if(tag==='value_only')reasons.push('fits your Value Only signal at the right price');
    if(tag==='fade')reasons.push('is downgraded by your Fade signal');
    if(String(player.risk||'').toLowerCase()==='low')reasons.push('offers a comparatively stable risk profile');
    return{player,score:Math.round(score),factors,reasons:reasons.slice(0,3)};
  }

  function rank(pool){return pool.map(player=>evaluate(player,pool)).sort((a,b)=>b.score-a.score||Number(b.player.proj||0)-Number(a.player.proj||0));}
  function recommendationStrength(results){
    if(results.length<2)return{label:'Strong',detail:'Clear best choice'};
    const gap=results[0].score-results[1].score;
    if(gap>=7)return{label:'Strong',detail:'Clear separation from the alternatives'};
    if(gap>=3)return{label:'Moderate',detail:'Preferred choice with a meaningful edge'};
    return{label:'Close Call',detail:'Top options are tightly grouped'};
  }
  function rosterFitLabel(value){return value>=85?'Immediate need':value>=55?'Useful fit':'Depth luxury';}
  function tierUrgencyLabel(value){return value>=70?'Act now':value>=45?'Monitor closely':'Can wait';}
  function explanation(item){
    if(!item)return'';
    const lead=item.reasons.length?item.reasons.join(', '):'owns the strongest overall decision score';
    return `${item.player.name} ${lead}.`;
  }

  function nextUserPickContext(){
    const currentIndex=state.drafted.length;
    const myTeam=state.profile.teamName;
    const maxLook=(state.teams.length||10)*2+2;
    let nextIndex=currentIndex;
    for(let i=currentIndex+1;i<=currentIndex+maxLook;i++){
      if(draftOrderAt(i)===myTeam){nextIndex=i;break;}
    }
    const teams=[];
    for(let i=currentIndex+1;i<nextIndex;i++)teams.push(draftOrderAt(i));
    return{currentIndex,nextIndex,picksAway:Math.max(0,nextIndex-currentIndex),teams};
  }

  function teamNeedsPosition(team,position){
    try{
      const counts=positionCounts(team);
      return Number(counts[position]||0)<Number(STARTER_NEED[position]||1);
    }catch{return false;}
  }

  function threatOwners(player,context){
    const seen=new Set();
    return context.teams.filter(team=>{
      if(!team||team===state.profile.teamName||seen.has(team))return false;
      seen.add(team);
      return teamNeedsPosition(team,player.pos);
    });
  }

  function survivalEstimate(player,context){
    const threats=threatOwners(player,context);
    const rank=Number(player.posRank||99);
    const tag=typeof scoutingTag==='function'?scoutingTag(player):null;
    let perPick=.035;
    if(player.pos==='QB')perPick=rank<=10?.105:rank<=20?.075:rank<=28?.05:.025;
    else if(player.pos==='RB')perPick=rank<=12?.075:rank<=26?.052:.03;
    else if(player.pos==='WR')perPick=rank<=15?.065:rank<=32?.045:.025;
    else if(player.pos==='TE')perPick=rank<=8?.055:.025;
    if(tag==='must_have')perPick+=.01;
    const baselineGone=1-Math.pow(1-perPick,Math.max(1,context.picksAway));
    const threatBoost=Math.min(.48,threats.length*(player.pos==='QB'?.095:.065));
    const urgencyBoost=scarcityScore(player,available())>=70?.10:scarcityScore(player,available())>=45?.05:0;
    const gone=clamp(Math.round((baselineGone+threatBoost+urgencyBoost)*100),8,96);
    return{available:100-gone,gone,threats};
  }

  function availabilityLabel(percent){return percent>=70?'Likely available':percent>=40?'True toss-up':'Unlikely to survive';}
  function riskClass(percent){return percent>=70?'safe':percent>=40?'watch':'danger';}

  function fallbackResults(results,top,context){
    return results.filter(item=>item.player.name!==top.player.name&&item.player.pos===top.player.pos).slice(0,3).map(item=>{
      const forecast=survivalEstimate(item.player,context);
      return{...item,forecast};
    });
  }

  function renderForecast(top,results){
    const context=nextUserPickContext();
    const forecast=survivalEstimate(top.player,context);
    const fallbacks=fallbackResults(results,top,context);
    const ownerNames=forecast.threats.slice(0,3);
    const threatCopy=ownerNames.length?`${ownerNames.join(', ')}${forecast.threats.length>3?` +${forecast.threats.length-3} more`:''}`:'No clear positional threat before your next pick';
    const waitingOutcome=fallbacks.length?fallbacks.map(item=>`${item.player.name} ${item.forecast.available}%`).join(' · '):'No same-position fallback graded closely enough';
    return{context,forecast,fallbacks,threatCopy,waitingOutcome};
  }

  function forecastMarkup(model){
    const {context,forecast,fallbacks,threatCopy}=model;
    return `<section class="goose-forecast"><div class="forecast-head"><div><span class="eyebrow">IF YOU PASS</span><h3>${forecast.gone}% chance he is gone by your next pick</h3></div><span class="forecast-state ${riskClass(forecast.available)}">${forecast.available}% survives</span></div><p class="forecast-note">Model estimate across ${context.picksAway} picks before you select again.</p><div class="forecast-grid"><div><span>Biggest threats</span><b>${escapeHtml(threatCopy)}</b></div><div><span>Room implication</span><b>${availabilityLabel(forecast.available)}</b></div></div>${fallbacks.length?`<div class="fallback-strip"><span>Best fallback plan</span>${fallbacks.map((item,index)=>`<button data-player="${encodeURIComponent(item.player.name)}"><b>${index+1}. ${escapeHtml(item.player.name)}</b><small>${item.forecast.available}% likely available · ${Math.round(item.player.proj||0)} pts</small></button>`).join('')}</div>`:''}<small class="model-disclaimer">Estimate uses current rosters, picks before your turn, position demand, projection tier and scouting signals. ADP and owner-history data will strengthen it later.</small></section>`;
  }

  function whatIfMarkup(top,results,model){
    const alternatives=results.filter(item=>item.player.name!==top.player.name).slice(0,5);
    const takeOutcome=`Locks in ${top.player.pos} with ${Math.round(top.player.proj||0)} projected points and removes the immediate roster need.`;
    const passOutcome=model.forecast.gone>=60?`Passing creates a high risk that ${top.player.name} and this tier disappear before Pick ${model.context.nextIndex+1}.`:`Passing is defensible, but you are betting that the room leaves this tier intact.`;
    return `<article class="what-if-primary"><span class="eyebrow">TAKE HIM NOW</span><h4>${escapeHtml(top.player.name)}</h4><p>${escapeHtml(takeOutcome)}</p></article><article class="what-if-primary pass"><span class="eyebrow">PASS AND WAIT</span><h4>${model.forecast.available}% chance he returns</h4><p>${escapeHtml(passOutcome)}</p></article><article class="what-if-board"><div><span class="eyebrow">IF HE GOES</span><h4>Expected fallback board</h4></div>${alternatives.map(item=>{const chance=survivalEstimate(item.player,model.context).available;return `<button data-player="${encodeURIComponent(item.player.name)}"><span><b>${escapeHtml(item.player.name)}</b><small>${item.player.pos} · ${Math.round(item.player.proj||0)} pts</small></span><strong>${chance}%</strong></button>`;}).join('')}</article>`;
  }

  function updateWishlistProbabilities(context){
    const root=document.getElementById('positionTargets');
    if(!root)return;
    root.querySelectorAll('button[data-player]').forEach(button=>{
      const name=decodeURIComponent(button.dataset.player||'');
      const player=typeof playerByName==='function'?playerByName(name):null;
      if(!player)return;
      const chance=survivalEstimate(player,context).available;
      const small=button.querySelector('small');
      if(small)small.textContent=`${chance}% at next pick · ${chance<35?'Take now':chance<65?'Round decision':'Can wait'}`;
    });
  }

  function injectStyles(){
    if(document.getElementById('decision-forecast-style'))return;
    const style=document.createElement('style');style.id='decision-forecast-style';style.textContent=`
      .goose-forecast{margin-top:22px;padding:18px;border:1px solid #d8dce1;border-radius:16px;background:#fff;position:relative;z-index:1}
      .forecast-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.forecast-head h3{font-size:22px!important;margin:5px 0 0!important}.forecast-state{padding:7px 10px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}.forecast-state.safe{background:#e8f5ed;color:#257a45}.forecast-state.watch{background:#fff3df;color:#9a5700}.forecast-state.danger{background:#fdeaea;color:#a92e2e}
      .forecast-note{margin:8px 0 14px!important;font-size:12px!important;color:#70757d!important}.forecast-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.forecast-grid>div{padding:12px;border-radius:12px;background:#f5f6f8;border:1px solid #e0e3e7}.forecast-grid span,.fallback-strip>span{display:block;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9f4b00;margin-bottom:5px}.forecast-grid b{font-size:13px;line-height:1.35}
      .fallback-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}.fallback-strip>span{grid-column:1/-1}.fallback-strip button{padding:10px;border:1px solid #d7dade;border-radius:11px;background:#fff;text-align:left}.fallback-strip b,.fallback-strip small{display:block}.fallback-strip b{font-size:12px}.fallback-strip small{margin-top:3px;color:#6d727a;font-size:10px}.model-disclaimer{display:block;margin-top:12px;color:#7a7f87;font-size:10px;line-height:1.4}
      .decision-futures{grid-template-columns:repeat(2,minmax(0,1fr))!important}.what-if-primary,.what-if-board{padding:20px;border:1px solid #d5d9de;border-radius:15px;background:#fff}.what-if-primary{border-top:5px solid #f47a00}.what-if-primary.pass{border-top-color:#4f545c}.what-if-primary h4,.what-if-board h4{font-size:21px;margin:8px 0}.what-if-primary p{font-size:13px;color:#626871;line-height:1.5}.what-if-board{grid-column:1/-1}.what-if-board>div{margin-bottom:10px}.what-if-board button{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;width:100%;padding:11px 0;border:0;border-bottom:1px solid #e0e3e6;background:transparent;text-align:left}.what-if-board button:last-child{border-bottom:0}.what-if-board button span,.what-if-board button b,.what-if-board button small{display:block}.what-if-board button small{margin-top:3px;color:#737880}.what-if-board button strong{font-size:17px;color:#9f4b00}
      @media(max-width:800px){.forecast-grid,.decision-futures{grid-template-columns:1fr!important}.fallback-strip{grid-template-columns:1fr}.what-if-board{grid-column:auto}}
    `;document.head.appendChild(style);
  }

  function loadEnhancements(){
    if(document.querySelector('script[data-player-intelligence]'))return;
    const script=document.createElement('script');script.src='player-intelligence.js?v=1';script.dataset.playerIntelligence='true';document.body.appendChild(script);
  }

  function apply(){
    if(typeof available!=='function'||typeof renderWarroom!=='function')return;
    injectStyles();
    const baseRender=renderWarroom;
    const baseRanked=typeof ranked==='function'?ranked:null;
    function engineResults(){return rank(available());}
    ranked=function(){return engineResults().map(item=>item.player);};

    renderWarroom=function(){
      baseRender();
      const results=engineResults(),top=results[0];
      if(!top)return;
      const strength=recommendationStrength(results),model=renderForecast(top,results);
      const thinking=document.getElementById('gooseThinking');
      if(thinking){
        const action=typeof currentTeam==='function'&&currentTeam()===state.profile.teamName?'Take':'Track';
        thinking.innerHTML=`<p class="gm-kicker">RECOMMENDATION: ${strength.label.toUpperCase()} · ${strength.detail}</p><h2>${action} ${escapeHtml(top.player.name)}.</h2><p>${escapeHtml(explanation(top))}</p><div class="engine-factor-line"><span><b>Roster Fit</b> ${rosterFitLabel(top.factors.need)}</span><span><b>Tier Urgency</b> ${tierUrgencyLabel(top.factors.scarcity)}</span><span><b>Projected</b> ${Math.round(top.player.proj||0)} pts</span><span><b>Risk</b> ${escapeHtml(top.player.risk||'Medium')}</span></div>${forecastMarkup(model)}`;
      }
      const paths=document.getElementById('decisionPaths');
      if(paths)paths.innerHTML=whatIfMarkup(top,results,model);
      const panelTitle=paths?.closest('.decision-panel')?.querySelector('.panel-head h3');if(panelTitle)panelTitle.textContent='Take Him, Pass, or Pivot';
      updateWishlistProbabilities(model.context);
      const status=document.getElementById('briefingStatus');if(status)status.textContent='ENGINE LIVE';
    };

    window.BoardDecisionEngine={evaluate,rank,results:engineResults,weights:{...WEIGHTS},baseRanked,recommendationStrength,rosterFitLabel,tierUrgencyLabel,nextUserPickContext,survivalEstimate,threatOwners};
    loadEnhancements();
    if(typeof activeView!=='undefined'&&activeView==='warroom')renderWarroom();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
