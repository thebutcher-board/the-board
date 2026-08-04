'use strict';
(function(){
  const POSITIONS=['QB','RB','WR','TE','K','DEF'];
  const STARTERS={QB:2,RB:2,WR:2,TE:1,K:1,DEF:1};
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v||'');
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));

  function mine(){return state.profile.teamName;}
  function teams(){return Array.isArray(state.teams)&&state.teams.length?state.teams:[];}
  function playerName(p){return p?.player||p?.name||p?.playerName||'';}
  function playerObj(name){try{return typeof playerByName==='function'?playerByName(name):null;}catch{return null;}}
  function draftedFor(team){
    return (state.drafted||[]).filter(p=>(p.team||p.owner)===team).map(p=>playerObj(playerName(p))||{name:playerName(p),pos:p.pos||'',proj:Number(p.proj||0)});
  }
  function keepersFor(team){
    try{return (KEEPERS?.[team]||[]).map(name=>playerObj(name)||{name,pos:'',proj:0});}catch{return[];}
  }
  function rosterFor(team){
    const seen=new Set();
    return [...keepersFor(team),...draftedFor(team)].filter(p=>{if(!p?.name||seen.has(p.name))return false;seen.add(p.name);return true;});
  }
  function teamScore(team){
    const roster=rosterFor(team),byPos={};POSITIONS.forEach(p=>byPos[p]=[]);
    roster.forEach(p=>{if(byPos[p.pos])byPos[p.pos].push(p);});
    POSITIONS.forEach(pos=>byPos[pos].sort((a,b)=>Number(b.proj||0)-Number(a.proj||0)));
    let starterPoints=0,filled=0;
    POSITIONS.forEach(pos=>{const take=byPos[pos].slice(0,STARTERS[pos]||0);starterPoints+=take.reduce((s,p)=>s+Number(p.proj||0),0);filled+=take.length;});
    const totalSlots=Object.values(STARTERS).reduce((a,b)=>a+b,0);
    const balance=clamp(Math.round((filled/totalSlots)*100));
    const depth=roster.reduce((s,p)=>s+Number(p.proj||0),0);
    const raw=10+(starterPoints/115)+(depth/900)+(balance-50)*.035;
    return{team,roster,starterPoints,depth,balance,probability:clamp(Math.round(raw),4,42)};
  }
  function leagueScores(){
    const rows=teams().map(team=>teamScore(team)).sort((a,b)=>b.probability-a.probability||b.starterPoints-a.starterPoints);
    const total=rows.reduce((s,r)=>s+r.probability,0)||1;
    return rows.map(r=>({...r,share:Math.round((r.probability/total)*100)}));
  }

  function renderDraftFlow(){
    const summary=document.querySelector('.draft-heartbeat-summary'),track=document.querySelector('.draft-track');
    if(!summary||!track)return;
    const cur=(state.drafted||[]).length,owner=mine(),last=state.drafted?.[cur-1];
    let next=cur;for(let i=cur;i<cur+24;i++){if(draftOrderAt(i)===owner){next=i;break;}}
    const currentTeam=draftOrderAt(cur)||'On the clock';
    summary.innerHTML=`<div class="flow-now"><small>ON THE CLOCK</small><strong>Pick ${cur+1}</strong><b>${esc(currentTeam)}</b></div><div><small>LAST SELECTION</small><b>${esc(playerName(last)||'—')}</b></div><div><small>YOUR TURN</small><b>${next===cur?'You are on the clock':`Pick ${next+1} · ${Math.max(0,next-cur)} away`}</b></div>`;
    const relevant=[];
    for(let i=cur;i<=Math.min(next,cur+5);i++)relevant.push({pick:i+1,team:draftOrderAt(i),current:i===cur,mine:draftOrderAt(i)===owner});
    if(next>cur+5)relevant.push({gap:true,count:next-cur-5});
    if(next>cur+5)relevant.push({pick:next+1,team:owner,mine:true});
    track.innerHTML=relevant.map(x=>x.gap?`<div class="flow-gap"><b>+${x.count}</b><small>picks</small></div>`:`<button data-team-roster="${encodeURIComponent(x.team||'') }" class="${x.current?'current ':''}${x.mine?'mine':''}"><small>${x.pick}</small><b>${esc(x.team||'Open')}</b></button>`).join('');
  }

  function renderLeagueMeter(){
    const side=document.querySelector('.front-office-layout>*:last-child');if(!side)return;
    let root=document.getElementById('leagueChampionshipMeter');
    if(!root){root=document.createElement('section');root.id='leagueChampionshipMeter';root.className='league-meter';const history=document.getElementById('decisionHistory');history?history.insertAdjacentElement('beforebegin',root):side.appendChild(root);}
    const rows=leagueScores();
    root.innerHTML=`<div class="league-meter-head"><div><span class="eyebrow">LEAGUE CHAMPIONSHIP METER</span><h4>Live title race</h4></div><small>Click any team to inspect its roster.</small></div><div class="league-race">${rows.map((r,i)=>`<button data-team-roster="${encodeURIComponent(r.team)}" class="${r.team===mine()?'is-mine':''}"><span class="race-rank">${i+1}</span><span class="race-team"><b>${esc(r.team)}</b><small>${r.balance}% roster balance</small></span><span class="race-bar"><i style="width:${Math.max(8,r.share*3)}%"></i></span><strong>${r.share}%</strong></button>`).join('')}</div><small class="league-model-note">Current model uses keeper value, drafted projections, starter coverage and roster balance. It updates after every pick.</small>`;
  }

  function openTeam(team){
    let overlay=document.getElementById('teamRosterExplorer');
    if(!overlay){overlay=document.createElement('div');overlay.id='teamRosterExplorer';overlay.className='team-roster-overlay';document.body.appendChild(overlay);}
    const score=teamScore(team),groups=POSITIONS.map(pos=>({pos,players:score.roster.filter(p=>p.pos===pos)})).filter(g=>g.players.length);
    overlay.innerHTML=`<div class="team-roster-drawer"><button class="team-roster-close" aria-label="Close">×</button><div class="team-roster-title"><span class="eyebrow">TEAM INTELLIGENCE</span><h2>${esc(team)}</h2><div><span><small>TITLE OUTLOOK</small><b>${score.probability}%</b></span><span><small>ROSTER BALANCE</small><b>${score.balance}</b></span><span><small>STARTER POINTS</small><b>${Math.round(score.starterPoints)}</b></span></div></div><div class="team-roster-groups">${groups.length?groups.map(g=>`<section><header>${g.pos}</header>${g.players.map(p=>`<button data-player="${encodeURIComponent(p.name)}"><b>${esc(p.name)}</b><small>${Math.round(p.proj||0)} projected pts</small></button>`).join('')}</section>`).join(''):'<p>No rostered players yet.</p>'}</div></div>`;
    overlay.classList.add('open');
  }
  function closeTeam(){document.getElementById('teamRosterExplorer')?.classList.remove('open');}

  function polishBlueprint(){
    const chart=document.querySelector('.blueprint-depth-chart');if(!chart)return;
    chart.classList.add('blueprint-liquid');
    chart.querySelectorAll('section').forEach(section=>{const count=section.querySelectorAll('button').length;section.style.setProperty('--player-count',count);});
  }

  function render(){renderDraftFlow();renderLeagueMeter();polishBlueprint();}
  function styles(){if(document.getElementById('leagueCommandCenterStyle'))return;const s=document.createElement('style');s.id='leagueCommandCenterStyle';s.textContent=`
    .draft-heartbeat-summary{grid-template-columns:1.2fr 1fr 1.2fr!important;padding:0!important;background:transparent!important;border-block:1px solid #d9dde2!important}.draft-heartbeat-summary>div{padding:14px 18px;border-right:1px solid #e0e3e7}.draft-heartbeat-summary>div:last-child{border-right:0}.draft-heartbeat-summary small{display:block;font-size:9px;letter-spacing:.09em;color:#858a91}.draft-heartbeat-summary b{display:block;font-size:13px;margin-top:3px}.draft-heartbeat-summary strong{display:block;font-size:22px;color:#d86100;margin-top:2px}.flow-now{background:linear-gradient(90deg,#fff6ec,#fff)}
    .draft-track{display:flex!important;align-items:stretch;gap:8px!important;padding:10px 0 4px!important;overflow-x:auto}.draft-track button,.flow-gap{min-width:128px;flex:1;padding:10px 12px;border:0;border-radius:13px;background:#eef0f3;text-align:left}.draft-track button small,.draft-track button b,.flow-gap small,.flow-gap b{display:block}.draft-track button b{font-size:10px;white-space:normal;line-height:1.2}.draft-track .current{background:#30343a!important;color:#fff}.draft-track .mine{outline:2px solid #e77900;background:#fff5e9!important;color:#723800}.flow-gap{display:grid;place-items:center;min-width:68px;flex:0 0 68px;color:#767b83}.flow-gap b{font-size:17px}.flow-gap small{font-size:9px}
    .league-meter{margin:14px 0;padding:17px;border-top:1px solid #d9dde2;border-bottom:1px solid #d9dde2}.league-meter-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.league-meter-head h4{font-size:19px;margin:5px 0 12px}.league-meter-head>small{max-width:150px;text-align:right;color:#737880}.league-race{display:grid;gap:4px}.league-race button{display:grid;grid-template-columns:24px minmax(105px,1fr) minmax(70px,1fr) 34px;gap:8px;align-items:center;width:100%;border:0;background:transparent;padding:8px 5px;text-align:left;border-radius:10px}.league-race button:hover{background:#f3f4f6}.league-race .is-mine{background:#fff4e8}.race-rank{font-size:11px;font-weight:850;color:#7b8087}.race-team b,.race-team small{display:block}.race-team b{font-size:11px}.race-team small{font-size:8px;color:#7a7f87}.race-bar{height:8px;background:#e6e8eb;border-radius:999px;overflow:hidden}.race-bar i{display:block;height:100%;background:#f47a00;border-radius:999px}.league-race strong{font-size:11px;text-align:right}.league-model-note{display:block;margin-top:10px;color:#7a7f87;font-size:9px;line-height:1.4}
    .team-roster-overlay{position:fixed;inset:0;background:rgba(20,22,25,.28);backdrop-filter:blur(7px);z-index:9999;opacity:0;pointer-events:none;transition:.2s ease}.team-roster-overlay.open{opacity:1;pointer-events:auto}.team-roster-drawer{position:absolute;top:0;right:0;width:min(520px,92vw);height:100%;overflow-y:auto;background:#f8f9fa;padding:26px;box-shadow:-24px 0 60px rgba(20,22,25,.18);transform:translateX(100%);transition:.25s ease}.team-roster-overlay.open .team-roster-drawer{transform:translateX(0)}.team-roster-close{position:absolute;right:20px;top:16px;border:0;background:#e7e9ec;width:34px;height:34px;border-radius:50%;font-size:22px}.team-roster-title h2{font-size:30px;margin:6px 0 18px}.team-roster-title>div{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.team-roster-title span{padding:12px;border-radius:12px;background:#30343a;color:#fff}.team-roster-title small,.team-roster-title b{display:block}.team-roster-title small{font-size:8px;color:#bdc2c8}.team-roster-title b{font-size:18px;margin-top:3px}.team-roster-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.team-roster-groups section{padding:12px;border-radius:14px;background:#eef0f2}.team-roster-groups header{font-size:10px;font-weight:900;color:#bf5900;margin-bottom:6px}.team-roster-groups button{display:block;width:100%;border:0;border-bottom:1px solid #d9dde2;background:transparent;padding:10px 2px;text-align:left}.team-roster-groups button:last-child{border-bottom:0}.team-roster-groups b,.team-roster-groups small{display:block}.team-roster-groups b{font-size:12px}.team-roster-groups small{font-size:9px;color:#737880;margin-top:3px}
    .blueprint-depth-chart.blueprint-liquid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.blueprint-liquid section{padding:14px!important;background:linear-gradient(145deg,#f3f4f6,#eceef1)!important}.blueprint-liquid button{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 12px!important}.blueprint-liquid button b{font-size:12px!important;overflow-wrap:normal!important}.blueprint-liquid button small{font-size:9px!important;text-align:right;max-width:145px}.blueprint-liquid section:nth-child(1),.blueprint-liquid section:nth-child(2){min-height:132px}
    @media(max-width:900px){.draft-heartbeat-summary{grid-template-columns:1fr!important}.draft-heartbeat-summary>div{border-right:0;border-bottom:1px solid #e0e3e7}.draft-heartbeat-summary>div:last-child{border-bottom:0}.league-meter-head{display:block}.league-meter-head>small{text-align:left;display:block;margin-bottom:8px}.team-roster-title>div,.team-roster-groups,.blueprint-depth-chart.blueprint-liquid{grid-template-columns:1fr!important}.blueprint-liquid button{display:block!important}.blueprint-liquid button small{text-align:left;margin-top:3px;max-width:none}}
  `;document.head.appendChild(s);}
  function wrap(){if(typeof renderWarroom!=='function'||renderWarroom.__leagueCommand)return false;const base=renderWarroom;renderWarroom=function(){base();setTimeout(render,0)};renderWarroom.__leagueCommand=true;return true;}
  document.addEventListener('click',e=>{const team=e.target.closest('[data-team-roster]');if(team){e.preventDefault();openTeam(decodeURIComponent(team.dataset.teamRoster||''));return;}if(e.target.closest('.team-roster-close')||e.target.id==='teamRosterExplorer')closeTeam();});
  function init(){styles();if(wrap())render();else setTimeout(init,150);}
  init();
})();