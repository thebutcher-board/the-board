'use strict';

(function(){
  const WEIGHTS={projection:30,need:28,scarcity:16,value:12,scouting:10,risk:4};
  const RISK_PENALTY={low:0,medium:2,high:5};
  const TAG_BONUS={must_have:10,watch:4,value_only:6,fade:-18};

  function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,value));}
  function countAt(position){
    try{return Number(positionCounts(state.profile.teamName)?.[position]||0);}catch{return 0;}
  }
  function targetAt(position){
    try{return Number(targetCount(position)||1);}catch{return 1;}
  }
  function needScore(player){
    const current=countAt(player.pos);const target=targetAt(player.pos);
    const open=Math.max(0,target-current);
    if(player.pos==='QB'){
      if(current<2)return 100;
      if(current<3)return 40;
      return 0;
    }
    if(!open)return 18;
    return clamp(55+(open/Math.max(1,target))*45);
  }
  function projectionScore(player,pool){
    const values=pool.map(p=>Number(p.proj||0));
    const high=Math.max(...values,1);const low=Math.min(...values,0);
    return high===low?50:clamp(((Number(player.proj||0)-low)/(high-low))*100);
  }
  function scarcityScore(player,pool){
    const same=pool.filter(p=>p.pos===player.pos).sort((a,b)=>Number(b.proj||0)-Number(a.proj||0));
    const index=same.findIndex(p=>p.name===player.name);
    const next=same[index+1];
    const gap=next?Math.max(0,Number(player.proj||0)-Number(next.proj||0)):12;
    const tierBoost=index<3?28:index<8?18:index<15?10:4;
    return clamp(tierBoost+gap*4);
  }
  function valueScore(player){
    const boardRank=Number(player.butcherRank||999);
    const posRank=Number(player.posRank||999);
    const rankScore=boardRank<999?clamp(105-boardRank*2):clamp(85-posRank*1.5);
    return rankScore;
  }
  function scoutingScore(player){
    try{return 50+(TAG_BONUS[scoutingTag(player)]||0)*5;}catch{return 50;}
  }
  function riskScore(player){return 100-(RISK_PENALTY[String(player.risk||'medium').toLowerCase()]||2)*12;}

  function evaluate(player,pool){
    const factors={
      projection:projectionScore(player,pool),
      need:needScore(player),
      scarcity:scarcityScore(player,pool),
      value:valueScore(player),
      scouting:scoutingScore(player),
      risk:riskScore(player)
    };
    const score=Object.entries(WEIGHTS).reduce((sum,[key,weight])=>sum+factors[key]*(weight/100),0);
    const reasons=[];
    if(factors.need>=85)reasons.push(`fills your open ${player.pos} starter need`);
    else if(factors.need>=55)reasons.push(`improves roster construction at ${player.pos}`);
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
  function confidence(results){
    if(results.length<2)return 100;
    return clamp(58+(results[0].score-results[1].score)*5,55,94);
  }
  function explanation(item){
    if(!item)return'';
    const lead=item.reasons.length?item.reasons.join(', '):'owns the strongest overall decision score';
    return `${item.player.name} ${lead}. Engine score: ${item.score}/100.`;
  }

  function apply(){
    if(typeof available!=='function'||typeof renderWarroom!=='function')return;
    const baseRender=renderWarroom;
    const baseRanked=typeof ranked==='function'?ranked:null;

    function engineResults(){return rank(available());}
    ranked=function(){return engineResults().map(item=>item.player);};

    renderWarroom=function(){
      baseRender();
      const results=engineResults();const top=results[0];
      if(!top)return;
      const confidenceValue=confidence(results);
      const thinking=document.getElementById('gooseThinking');
      if(thinking){
        const action=typeof currentTeam==='function'&&currentTeam()===state.profile.teamName?'Take':'Track';
        thinking.innerHTML=`<p class="gm-kicker">DECISION ENGINE · ${confidenceValue}% CONFIDENCE</p><h2>${action} ${escapeHtml(top.player.name)}.</h2><p>${escapeHtml(explanation(top))}</p><div class="engine-factor-line"><span>Need ${Math.round(top.factors.need)}</span><span>Scarcity ${Math.round(top.factors.scarcity)}</span><span>Projection ${Math.round(top.factors.projection)}</span><span>Risk ${Math.round(top.factors.risk)}</span></div>`;
      }
      const paths=document.getElementById('decisionPaths');
      if(paths){
        const labels=['RECOMMENDED','SAFER ALTERNATIVE','VALUE PIVOT'];
        paths.innerHTML=results.slice(0,3).map((item,index)=>`<article class="future-path ${index===0?'recommended':''}"><span>${labels[index]}</span><h4>${escapeHtml(item.player.name)}</h4><p>${item.player.pos} · Score ${item.score}</p><small>${escapeHtml(item.reasons[0]||'Best available roster fit')}</small><button class="text-btn" data-player="${encodeURIComponent(item.player.name)}">View decision</button></article>`).join('');
      }
      const status=document.getElementById('briefingStatus');if(status)status.textContent='ENGINE LIVE';
    };

    window.BoardDecisionEngine={evaluate,rank,results:engineResults,weights:{...WEIGHTS},baseRanked};
    if(typeof activeView!=='undefined'&&activeView==='warroom')renderWarroom();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
