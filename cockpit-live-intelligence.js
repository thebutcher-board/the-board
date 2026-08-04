'use strict';

(function(){
  const STARTERS={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};
  const esc=value=>typeof escapeHtml==='function'?escapeHtml(value):String(value||'');
  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));

  const DraftState={
    selectedPlayer:'',
    lastChampionship:null,
    listeners:new Set(),
    snapshot:null,
    select(name){this.selectedPlayer=name||'';this.refresh('hypothetical');},
    subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);},
    refresh(reason='draft'){
      this.snapshot=buildSnapshot(reason);
      this.listeners.forEach(listener=>{try{listener(this.snapshot);}catch{}});
      document.dispatchEvent(new CustomEvent('board:draftstate',{detail:this.snapshot}));
    }
  };
  window.BoardDraftState=DraftState;

  function engineResults(){return window.BoardDecisionEngine?.results?.()||[];}
  function selectedItem(all=engineResults()){
    const external=window.BoardCockpit?.selected?.()||DraftState.selectedPlayer;
    return all.find(item=>item.player.name===external)||all[0]||null;
  }
  function myTeam(){return state?.profile?.teamName||'';}
  function pickContext(){
    const current=Number(state?.drafted?.length||0),teams=state?.teams||[],mine=myTeam();
    let next=current;
    for(let index=current+1;index<=current+(teams.length||10)*2+2;index++){
      if(draftOrderAt(index)===mine){next=index;break;}
    }
    const upcoming=[];
    for(let index=current;index<=Math.min(next,current+8);index++)upcoming.push({index,team:draftOrderAt(index)});
    return{current,next,picksAway:Math.max(0,next-current),upcoming,last:state?.drafted?.[current-1]||null};
  }
  function hypotheticalCounts(player){
    const counts={...positionCounts(myTeam())};
    if(player)counts[player.pos]=Number(counts[player.pos]||0)+1;
    return counts;
  }
  function metricModel(item){
    const counts=hypotheticalCounts(item?.player),projection=Number(item?.player?.proj||0),risk=String(item?.player?.risk||'Medium');
    const starterTotal=Object.values(STARTERS).reduce((sum,value)=>sum+value,0);
    const starterFilled=Object.entries(STARTERS).reduce((sum,[pos,target])=>sum+Math.min(Number(counts[pos]||0),target),0);
    const balance=clamp(Math.round(38+62*(starterFilled/starterTotal)));
    const ceiling=clamp(Math.round(42+Math.min(38,projection/12)+(Number(item?.factors?.scarcity||0)*.13)));
    const safety=risk==='Low'?88:risk==='High'?56:73;
    const positionalEdge=clamp(Math.round((Number(item?.factors?.need||0)*.45)+(Number(item?.factors?.scarcity||0)*.35)+(Number(item?.factors?.value||50)*.20)));
    const championship=clamp(Math.round(10+(balance-50)*.13+(ceiling-50)*.08+(safety-50)*.035+(positionalEdge-50)*.045),3,48);
    const playoff=clamp(Math.round(48+(balance-50)*.36+(ceiling-50)*.22+(safety-50)*.12),24,97);
    return{balance,ceiling,safety,positionalEdge,championship,playoff,risk};
  }
  function rosterDNA(metrics,counts){
    const strengths=[],weaknesses=[];
    if(Number(counts.QB||0)>=2)strengths.push('Starting QBs secured');else weaknesses.push('Open QB starter');
    if(Number(counts.RB||0)>=2)strengths.push('Strong RB foundation');else weaknesses.push('RB starter gap');
    if(Number(counts.WR||0)>=2)strengths.push('Starting WRs secured');else weaknesses.push('WR depth needed');
    if(metrics.ceiling>=78)strengths.push('High weekly ceiling');
    if(metrics.safety>=82)strengths.push('Low volatility');else if(metrics.safety<65)weaknesses.push('Boom/bust exposure');
    return{strengths:strengths.slice(0,4),weaknesses:weaknesses.slice(0,3),identity:strengths.length>=3?'Built to pressure the league every week':weaknesses.length>=2?'High upside with important roster work remaining':'Balanced contender under construction'};
  }
  function blueprint(item,all){
    const counts=hypotheticalCounts(item.player),desired={QB:3,RB:4,WR:5,TE:2,K:1,DEF:1};
    const picks=[{player:item.player,status:'Current decision'}];
    const pool=all.filter(entry=>entry.player.name!==item.player.name);
    for(const pos of Object.keys(desired)){
      let need=Math.max(0,desired[pos]-Number(counts[pos]||0));
      for(const entry of pool.filter(entry=>entry.player.pos===pos)){
        if(need<=0||picks.length>=12)break;
        if(picks.some(choice=>choice.player.name===entry.player.name))continue;
        picks.push({player:entry.player,status:'Projected target'});need--;
      }
    }
    return picks;
  }
  function buildSnapshot(reason){
    const all=engineResults(),focus=selectedItem(all);
    if(!focus)return null;
    const context=pickContext(),metrics=metricModel(focus),counts=hypotheticalCounts(focus.player),dna=rosterDNA(metrics,counts);
    const engineDefault=all[0]?metricModel(all[0]).championship:metrics.championship;
    return{reason,all,focus,context,metrics,dna,counts,blueprint:blueprint(focus,all),delta:metrics.championship-engineDefault};
  }

  function renderTimeline(snapshot){
    const host=document.querySelector('.front-office-topline');if(!host)return;
    let timeline=document.getElementById('liveDraftTimeline');
    if(!timeline){timeline=document.createElement('section');timeline.id='liveDraftTimeline';timeline.className='live-draft-timeline';host.insertAdjacentElement('afterend',timeline);}
    const upcoming=snapshot.context.upcoming;
    timeline.innerHTML=`<div class="timeline-summary"><span><small>LAST PICK</small><b>${esc(snapshot.context.last?.player||snapshot.context.last?.name||'Draft opening')}</b></span><span><small>CURRENT</small><b>Pick ${snapshot.context.current+1}</b></span><span><small>YOUR NEXT PICK</small><b>Pick ${snapshot.context.next+1}</b></span><span><small>WAIT</small><b>${snapshot.context.picksAway} picks</b></span></div><div class="timeline-track">${upcoming.map(entry=>`<div class="timeline-node ${entry.team===myTeam()?'mine':''} ${entry.index===snapshot.context.current?'current':''}"><small>${entry.index+1}</small><b>${esc(entry.team||'—')}</b></div>`).join('')}</div>`;
  }
  function renderChampionship(snapshot){
    const host=document.getElementById('cockpitV5');if(!host)return;
    let meter=host.querySelector('.championship-strip');if(!meter)return;
    const delta=snapshot.delta;
    meter.innerHTML=`<div class="title-probability"><small>CHAMPIONSHIP PROBABILITY</small><strong>${snapshot.metrics.championship}%</strong><em class="${delta>0?'positive':delta<0?'negative':'neutral'}">${delta>0?'▲ +':delta<0?'▼ ':''}${delta?Math.abs(delta)+'% vs Goose choice':'Goose baseline'}</em></div><div><small>PLAYOFF OUTLOOK</small><b>${snapshot.metrics.playoff}%</b></div><div><small>ROSTER BALANCE</small><b>${snapshot.metrics.balance}</b></div><div><small>WEEKLY CEILING</small><b>${snapshot.metrics.ceiling}</b></div><div><small>POSITIONAL EDGE</small><b>${snapshot.metrics.positionalEdge}</b></div>`;
    const dna=host.querySelector('.roster-dna');
    if(dna)dna.innerHTML=`<span class="eyebrow">ROSTER DNA</span><h4>${esc(snapshot.dna.identity)}</h4><div class="dna-columns"><section><small>STRENGTHS</small>${snapshot.dna.strengths.map(text=>`<b>+ ${esc(text)}</b>`).join('')||'<b>Still forming</b>'}</section><section><small>WATCH</small>${snapshot.dna.weaknesses.map(text=>`<b>− ${esc(text)}</b>`).join('')||'<b>No urgent weakness</b>'}</section></div>`;
  }
  function renderBlueprint(snapshot){
    const root=document.getElementById('nextFive');if(!root)return;
    const panel=root.closest('.projection-panel');
    if(panel?.querySelector('h3'))panel.querySelector('h3').textContent='Championship Blueprint';
    if(panel?.querySelector('.eyebrow'))panel.querySelector('.eyebrow').textContent='LIVE FINISHED-ROSTER PLAN';
    const groups={};snapshot.blueprint.forEach(choice=>{(groups[choice.player.pos]||=[]).push(choice);});
    root.innerHTML=`<div class="blueprint-command"><div><small>PROJECTED TITLE ODDS</small><b>${snapshot.metrics.championship}%</b></div><div><small>TEAM IDENTITY</small><b>${esc(snapshot.dna.identity)}</b></div></div><div class="blueprint-groups">${Object.entries(groups).map(([pos,choices])=>`<section><span>${esc(pos)}</span>${choices.map(choice=>`<button data-cockpit-player="${encodeURIComponent(choice.player.name)}"><b>${esc(choice.player.name)}</b><small>${esc(choice.status)} · ${Math.round(choice.player.proj||0)} pts</small></button>`).join('')}</section>`).join('')}</div>`;
  }
  function renderHistory(snapshot){
    const root=document.getElementById('decisionHistory');if(!root)return;
    const picks=(state.drafted||[]).filter(record=>record.team===myTeam()||record.owner===myTeam()).slice(-5).reverse();
    root.innerHTML=`<span class="eyebrow">DECISION HISTORY</span><h4>Your draft story</h4>${picks.length?picks.map((record,index)=>`<div><b>${esc(record.player||record.name||'Pick')}</b><small>${index===0?'Latest roster decision':'Blueprint recalculated after selection'}</small></div>`).join(''):'<p>Your completed decisions will appear here.</p>'}<div class="history-preview"><b>Exploring: ${esc(snapshot.focus.player.name)}</b><small>${snapshot.metrics.championship}% title probability · ${snapshot.dna.identity}</small></div>`;
  }
  function render(snapshot){if(!snapshot)return;renderTimeline(snapshot);renderChampionship(snapshot);renderBlueprint(snapshot);renderHistory(snapshot);}

  function injectStyles(){
    if(document.getElementById('cockpitLiveIntelligenceStyle'))return;
    const style=document.createElement('style');style.id='cockpitLiveIntelligenceStyle';style.textContent=`
      .live-draft-timeline{margin:0 0 18px;padding:13px 16px;border-block:1px solid #d9dde2;background:linear-gradient(90deg,#f5f6f7,#fff)}
      .timeline-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.timeline-summary span{padding-right:12px;border-right:1px solid #e0e3e7}.timeline-summary span:last-child{border:0}.timeline-summary small,.blueprint-command small,.dna-columns small{display:block;font-size:9px;letter-spacing:.08em;color:#777d85}.timeline-summary b{font-size:13px}
      .timeline-track{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:6px;margin-top:11px}.timeline-node{padding:8px;border-radius:10px;background:#eceef1;min-width:0}.timeline-node small,.timeline-node b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.timeline-node small{font-size:8px;color:#7b8088}.timeline-node b{font-size:9px}.timeline-node.current{background:#30343a;color:#fff}.timeline-node.mine{outline:2px solid #f47a00;background:#fff3e8;color:#8f4300}
      .title-probability em.positive{color:#8ee0a8}.title-probability em.negative{color:#ffaaaa}.title-probability em.neutral{color:#c9cdd2}
      .roster-dna h4{font-size:17px;margin:7px 0 11px}.dna-columns{display:grid!important;grid-template-columns:1fr 1fr;gap:10px!important}.dna-columns section{padding:11px;border-radius:12px;background:#f1f3f5}.dna-columns b{display:block!important;padding:3px 0!important;background:none!important;border-radius:0!important;font-size:10px!important}
      .blueprint-command{display:grid;grid-template-columns:180px 1fr;gap:10px;margin-bottom:13px}.blueprint-command>div{padding:13px;border-radius:13px;background:#30343a;color:#fff}.blueprint-command small{color:#c2c7cd}.blueprint-command b{display:block;margin-top:4px;font-size:13px}.blueprint-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.blueprint-groups section{padding:10px;border-radius:13px;background:#f4f5f7}.blueprint-groups section>span{display:block;margin-bottom:6px;font-size:10px;font-weight:850;color:#d86100}.blueprint-groups button{display:block;width:100%;padding:8px 0;border:0;border-bottom:1px solid #dde0e4;background:transparent;text-align:left}.blueprint-groups button:last-child{border-bottom:0}.blueprint-groups b,.blueprint-groups small{display:block}.blueprint-groups small{margin-top:2px;font-size:9px;color:#777c84}
      @media(max-width:900px){.timeline-summary{grid-template-columns:1fr 1fr}.timeline-track{grid-template-columns:repeat(3,1fr)}.dna-columns,.blueprint-groups{grid-template-columns:1fr!important}.blueprint-command{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }

  document.addEventListener('click',event=>{
    const choice=event.target.closest('[data-cockpit-player]');
    if(choice){DraftState.selectedPlayer=decodeURIComponent(choice.dataset.cockpitPlayer||'');setTimeout(()=>DraftState.refresh('hypothetical'),0);}
    if(event.target.closest('[data-cockpit-reset]')){DraftState.selectedPlayer='';setTimeout(()=>DraftState.refresh('reset'),0);}
  },true);
  document.addEventListener('board:cockpit-change',event=>{DraftState.selectedPlayer=event.detail?.player||'';DraftState.refresh('hypothetical');});

  function wrapRender(){
    if(typeof renderWarroom!=='function'||renderWarroom.__liveIntelligence)return false;
    const base=renderWarroom;
    renderWarroom=function(){base();setTimeout(()=>DraftState.refresh('render'),0);};
    renderWarroom.__liveIntelligence=true;return true;
  }
  function init(){injectStyles();DraftState.subscribe(render);if(wrapRender())DraftState.refresh('init');else setTimeout(init,160);}
  init();
})();