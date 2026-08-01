'use strict';

(function(){
  let metricSort={key:'PROJ',direction:'desc'};

  const style=document.createElement('style');
  style.textContent=`
    .metric-sort{display:flex;width:100%;height:100%;align-items:center;justify-content:center;gap:4px;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}
    .metric-sort:hover{color:var(--orange,#f47a00)}
    .metric-sort.active{color:var(--orange-dark,#9f4b00)}
    .metric-sort .sort-arrow{font-size:9px;opacity:.75}
    .engine-live-note{display:block;margin-top:10px;color:#737880;font-size:11px;line-height:1.4}
    .engine-factor-line span b{color:#292c31;margin-right:3px}
    .player-live-context{margin:16px 0;padding:16px;border:1px solid #d6dade;border-radius:14px;background:linear-gradient(180deg,#fff,#f5f6f8)}
    .player-live-context-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
    .player-live-context-head strong{font-size:14px;color:#25282d}
    .player-live-context-head small{color:#72777f;text-align:right}
    .player-live-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .player-live-grid>div{padding:10px;border:1px solid #dde0e4;border-radius:11px;background:#fff}
    .player-live-grid span{display:block;font-size:9px;font-weight:800;letter-spacing:.07em;color:#777c84;text-transform:uppercase}
    .player-live-grid b{display:block;margin-top:5px;font-size:13px;color:#282b30}
    @media(max-width:700px){.player-live-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  function numericValue(player,key){
    if(key==='PROJ')return Number(player.proj||0);
    if(key==='ADP')return Number(player.adp??player.fpAdp??player.consensusAdp??Number.POSITIVE_INFINITY);
    if(key==='ECR')return Number(player.ecr??player.fpEcr??player.consensusRank??Number.POSITIVE_INFINITY);
    if(key==='BYE')return Number(player.bye??player.byeWeek??Number.POSITIVE_INFINITY);
    return Number.POSITIVE_INFINITY;
  }
  function displayValue(player,key){
    if(key==='PROJ')return Math.round(Number(player.proj||0));
    if(key==='ADP'){const v=numericValue(player,key);return Number.isFinite(v)?Math.round(v*10)/10:'—';}
    if(key==='ECR'){const v=numericValue(player,key);return Number.isFinite(v)?`#${Math.round(v)}`:'—';}
    if(key==='BYE'){const v=numericValue(player,key);return Number.isFinite(v)?Math.round(v):'TBD';}
    return '—';
  }
  function compareMetric(a,b){
    const av=numericValue(a,metricSort.key),bv=numericValue(b,metricSort.key);
    const missingA=!Number.isFinite(av),missingB=!Number.isFinite(bv);
    if(missingA!==missingB)return missingA?1:-1;
    if(av===bv)return Number(b.proj||0)-Number(a.proj||0);
    const naturallyAscending=metricSort.key==='ADP'||metricSort.key==='ECR'||metricSort.key==='BYE';
    const multiplier=metricSort.direction==='asc'?1:-1;
    return (av-bv)*multiplier*(naturallyAscending?1:1);
  }
  function sortButton(key,label){
    const active=metricSort.key===key;
    const arrow=active?(metricSort.direction==='asc'?'▲':'▼'):'';
    return `<button class="metric-sort ${active?'active':''}" data-metric-sort="${key}" title="Sort by ${label}"><span>${label}</span><span class="sort-arrow">${arrow}</span></button>`;
  }

  function enhancedDatabaseCard(player){
    const status=playerStatus(player),tag=scoutingTag(player),statusText=status.owner?`${status.label} · ${escapeHtml(status.owner)}`:status.label;
    return `<article class="scout-player premium-row" data-player-row="${encodeURIComponent(player.name)}">${playerPhoto(player,'player-photo scouting-photo')}<div class="scout-copy"><div class="player-title-line"><div class="player-name">${escapeHtml(player.name)}</div></div><div class="player-meta">${player.team} · ${player.pos} · ${escapeHtml(microTier(player))}</div><div class="status-line"><span class="status-chip ${status.key}">${statusText}</span></div><div class="scout-context"><span>${roleLabel(player)}</span><span>${draftWindow(player)}</span></div></div><div class="scout-metrics"><div>${sortButton('PROJ','PTS')}<b>${displayValue(player,'PROJ')}</b></div><div>${sortButton('ADP','ADP')}<b>${displayValue(player,'ADP')}</b></div><div>${sortButton('ECR','ECR')}<b>${displayValue(player,'ECR')}</b></div><div>${sortButton('BYE','BYE')}<b>${displayValue(player,'BYE')}</b></div></div><div class="scout-actions"><div class="quick-scout-row">${[['must_have','★','Target'],['watch','◉','Watch'],['value_only','$','Value'],['fade','—','Fade']].map(([v,i,l])=>`<button class="quick-scout ${tag===v?'active':''}" data-scout="${v}" data-scout-player="${encodeURIComponent(player.name)}"><span>${i}</span><em>${l}</em></button>`).join('')}</div><div class="row-tools"><button class="details-btn" data-player="${encodeURIComponent(player.name)}">Details</button></div></div></article>`;
  }

  function enhancedRenderDatabase(){
    const q=document.getElementById('databaseSearch').value.toLowerCase(),pos=document.getElementById('databasePos').value,sf=document.getElementById('databaseStatus').value,tf=document.getElementById('databaseScout').value;
    let list=MASTER_PLAYERS.filter(p=>{const s=playerStatus(p),t=scoutingTag(p)||'untagged';return(pos==='ALL'||p.pos===pos)&&(sf==='ALL'||s.key===sf)&&(tf==='ALL'||t===tf)&&`${p.name} ${p.team} ${s.owner||''}`.toLowerCase().includes(q);});
    list.sort(compareMetric);
    document.getElementById('databaseCount').textContent=`${list.length} players`;
    const visible=list.slice(0,databaseLimit);
    document.getElementById('databaseList').innerHTML=visible.map(enhancedDatabaseCard).join('')+(list.length>databaseLimit?`<button id="showMorePlayers" class="btn secondary show-more">Show more players</button>`:'');
  }

  try{databaseCard=enhancedDatabaseCard;renderDatabase=enhancedRenderDatabase;}catch{}

  document.addEventListener('click',event=>{
    const sort=event.target.closest('[data-metric-sort]');
    if(sort){
      event.preventDefault();event.stopPropagation();
      const key=sort.dataset.metricSort;
      if(metricSort.key===key)metricSort.direction=metricSort.direction==='desc'?'asc':'desc';
      else{metricSort.key=key;metricSort.direction=(key==='PROJ'?'desc':'asc');}
      databaseLimit=Math.max(databaseLimit,60);
      enhancedRenderDatabase();
      return;
    }
    const playerTrigger=event.target.closest('[data-player],[data-player-row]');
    if(!playerTrigger)return;
    const encoded=playerTrigger.dataset.player||playerTrigger.dataset.playerRow;
    if(!encoded)return;
    setTimeout(()=>enhancePlayerContext(decodeURIComponent(encoded)),35);
  },true);

  function enhancePlayerContext(name){
    const player=typeof playerByName==='function'?playerByName(name):null;
    const modal=document.getElementById('playerModalContent');
    if(!player||!modal)return;

    const detailGrid=modal.querySelector('.detail-grid');
    if(detailGrid&&!detailGrid.querySelector('[data-bye-detail]')){
      const bye=document.createElement('div');bye.dataset.byeDetail='true';
      bye.innerHTML=`<span>Bye Week</span><b>${displayValue(player,'BYE')}</b>`;
      detailGrid.appendChild(bye);
    }

    const engine=window.BoardDecisionEngine;
    let evaluation=null,strength=null;
    try{
      const results=engine?.results?.()||[];
      evaluation=results.find(item=>item.player.name===player.name)||engine?.evaluate?.(player,available());
      strength=engine?.recommendationStrength?.(results);
    }catch{}

    let panel=modal.querySelector('.player-live-context');
    if(!panel){panel=document.createElement('section');panel.className='player-live-context';const anchor=modal.querySelector('.hotfix-intelligence-grid')||modal.querySelector('.scouting-actions')||modal.querySelector('.modal-actions');anchor?.before(panel);}
    if(panel){
      const fit=evaluation?engine.rosterFitLabel(evaluation.factors.need):'Recalculating';
      const urgency=evaluation?engine.tierUrgencyLabel(evaluation.factors.scarcity):'Recalculating';
      panel.innerHTML=`<div class="player-live-context-head"><div><span class="eyebrow">LIVE DRAFT CONTEXT</span><strong>Updates after every pick</strong></div><small>${strength?`Current recommendation: ${strength.label}`:'Draft room evaluation'}</small></div><div class="player-live-grid"><div><span>Roster Fit</span><b>${fit}</b></div><div><span>Tier Urgency</span><b>${urgency}</b></div><div><span>Projected</span><b>${Math.round(Number(player.proj||0))} pts</b></div><div><span>Risk</span><b>${escapeHtml(player.risk||'Medium')}</b></div></div>`;
    }
  }

  if(typeof activeView!=='undefined'&&activeView==='database')enhancedRenderDatabase();
})();
