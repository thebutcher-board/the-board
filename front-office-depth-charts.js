'use strict';
(function(){
  const SLOT_DEFS=[
    ['QB1','QB'],['QB2','QB'],['RB1','RB'],['RB2','RB'],['WR1','WR'],['WR2','WR'],
    ['TE','TE'],['FLEX','FLEX'],['K','K'],['DEF','DEF'],
    ['BENCH 1','ANY'],['BENCH 2','ANY'],['BENCH 3','ANY'],['BENCH 4','ANY'],['BENCH 5','ANY'],['BENCH 6','ANY']
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const ranked=()=>{try{return window.ranked?.()||[]}catch{return[]}};
  const liveRoster=()=>{try{return window.rosterFor?.(teamName())||[]}catch{return[]}};
  const currentOwner=()=>{try{return window.draftOrderAt?.(window.state?.drafted?.length||0)||'League'}catch{return'League'}};
  const picksAway=()=>{try{for(let i=1;i<30;i++)if(window.draftOrderAt(window.state.drafted.length+i)===teamName())return i}catch{}return 0};

  function photo(player){
    if(!player)return'';
    const possible=[player.sleeperId,player.sleeper_id,player.player_id,player.id];
    try{possible.unshift(window.playerPhotoMap?.get?.(String(player.name).toLowerCase()))}catch{}
    const id=possible.find(Boolean);
    return id?`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`:'';
  }
  const initials=name=>String(name||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  const eligible=(player,type)=>type==='ANY'||player?.pos===type||(type==='FLEX'&&['RB','WR','TE'].includes(player?.pos));

  function assignSlots(players){
    const remaining=[...players];
    const assigned={};
    for(const [slot,type] of SLOT_DEFS){
      const idx=remaining.findIndex(p=>eligible(p,type));
      if(idx>=0)assigned[slot]=remaining.splice(idx,1)[0];
      else assigned[slot]=null;
    }
    return assigned;
  }

  function predictiveRoster(){
    const locked=liveRoster();
    const used=new Set(locked.map(p=>p.name));
    const candidates=ranked().filter(p=>!used.has(p.name));
    return assignSlots([...locked,...candidates]);
  }

  function lineupScore(slots){
    const starterSlots=SLOT_DEFS.slice(0,10).map(([slot])=>slot);
    return Math.round(starterSlots.reduce((sum,slot)=>sum+Number(slots[slot]?.proj||0),0));
  }
  function odds(slots,isPerfect=false){
    const filled=Object.values(slots).filter(Boolean).length;
    const starters=SLOT_DEFS.slice(0,10).filter(([slot])=>slots[slot]).length;
    const score=lineupScore(slots);
    const playoff=clamp(Math.round(38+starters*4.6+Math.min(12,score/260)+(isPerfect?3:0)),20,96);
    const championship=clamp(Math.round(4+starters*1.45+Math.min(13,score/360)+(isPerfect?2:0)),3,46);
    const rosterScore=clamp(Math.round(42+filled*2.1+starters*2.2+(isPerfect?4:0)),40,99);
    return{score,playoff,championship,rosterScore};
  }

  function mini(player,slot){
    const src=photo(player);
    if(!player)return `<div class="dc-card empty"><small>${esc(slot)}</small><div class="dc-photo"><b>—</b></div><strong>OPEN</strong></div>`;
    return `<div class="dc-card filled" title="${esc(player.name)}">
      <small>${esc(slot)}</small>
      <div class="dc-photo">${src?`<img src="${src}" alt="${esc(player.name)}">`:`<b>${esc(initials(player.name))}</b>`}<em>${esc(player.pos||'')}</em></div>
      <strong>${esc(player.name)}</strong>
      <span>${Math.round(Number(player.proj||0))} pts</span>
    </div>`;
  }

  function depthGrid(slots){
    const groups=[
      ['QB',['QB1','QB2']],['RB',['RB1','RB2']],['WR',['WR1','WR2']],
      ['SKILL',['TE','FLEX']],['SPECIAL',['K','DEF']],['BENCH',['BENCH 1','BENCH 2','BENCH 3','BENCH 4','BENCH 5','BENCH 6']]
    ];
    return groups.map(([label,keys])=>`<div class="dc-group ${label==='BENCH'?'bench':''}"><label>${label}</label><div>${keys.map(k=>mini(slots[k],k)).join('')}</div></div>`).join('');
  }

  function topBanner(){
    const header=document.querySelector('#phaseOneMount .p1-franchise');
    if(!header)return;
    const slots=assignSlots(liveRoster());
    const m=odds(slots,false);
    header.classList.add('depth-chart-banner');
    header.innerHTML=`
      <div class="dc-brand"><img src="logo.png" alt="${esc(teamName())}"><div><small>YOUR FRANCHISE</small><h1>${esc(teamName())}</h1><p>Live roster · Mission ${(window.state?.drafted?.length||0)+1}</p></div></div>
      <div class="dc-roster"><div class="dc-title"><small>CURRENT TEAM</small><b>Built as you draft</b></div><div class="dc-grid">${depthGrid(slots)}</div></div>
      <div class="dc-summary"><span><small>PROJECTED PTS</small><b>${m.score}</b></span><span><small>PLAYOFF</small><b>${m.playoff}%</b></span><span><small>CHAMPIONSHIP</small><b>${m.championship}%</b></span><span><small>PICKS UNTIL YOU</small><b>${picksAway()||'—'}</b></span><span><small>ON THE CLOCK</small><b>${esc(currentOwner())}</b></span></div>`;
  }

  function bottomBanner(){
    const footer=document.querySelector('#phaseOneMount .p1-perfect');
    if(!footer)return;
    const slots=predictiveRoster();
    const m=odds(slots,true);
    footer.classList.add('perfect-depth-banner');
    footer.innerHTML=`
      <div class="pd-copy"><small>PERFECT DRAFT</small><h3>Best Realistic Finished Roster</h3><p>Pre-draft prediction that recalculates after every selection.</p></div>
      <div class="pd-summary"><span><small>PERFECT DRAFT SCORE</small><b>${m.rosterScore}</b></span><span><small>PROJECTED PTS</small><b>${m.score}</b></span><span><small>PLAYOFF</small><b>${m.playoff}%</b></span><span><small>CHAMPIONSHIP</small><b>${m.championship}%</b></span></div>
      <div class="pd-grid">${depthGrid(slots)}</div>`;
  }

  function enhance(){topBanner();bottomBanner();}

  function installStyles(){
    if(document.getElementById('depthChartBannerStyles'))return;
    const style=document.createElement('style');
    style.id='depthChartBannerStyles';
    style.textContent=`
      .p1-franchise.depth-chart-banner{display:grid!important;grid-template-columns:180px minmax(0,1fr) 330px!important;gap:12px!important;align-items:stretch!important;padding:10px 12px!important}
      .dc-brand{display:flex;gap:10px;align-items:center}.dc-brand img{width:62px;height:62px;object-fit:contain}.dc-brand small,.dc-title small,.pd-copy small{font-size:7px;letter-spacing:.12em;color:#f5a154}.dc-brand h1{margin:3px 0;font-size:24px;color:#94efb1}.dc-brand p,.pd-copy p{margin:0;font-size:8px;color:#aeb6c0}.dc-title{display:flex;align-items:baseline;gap:8px;margin-bottom:5px}.dc-title b{font-size:10px}.dc-grid,.pd-grid{display:grid;grid-template-columns:repeat(6,minmax(72px,1fr));gap:5px}.dc-group>label{display:block;margin-bottom:3px;font-size:6px;letter-spacing:.1em;color:#89929e}.dc-group>div{display:grid;grid-template-columns:1fr;gap:3px}.dc-group.bench>div{grid-template-columns:repeat(2,1fr)}
      .dc-card{position:relative;display:grid;grid-template-columns:28px minmax(0,1fr);grid-template-rows:12px 12px;column-gap:5px;height:34px;padding:3px;border:1px solid rgba(255,255,255,.1);border-radius:7px;background:rgba(20,24,30,.72);overflow:hidden}.dc-card>small{grid-column:2;font-size:5px;color:#f5a154}.dc-card>strong{grid-column:2;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dc-card>span{display:none}.dc-photo{grid-row:1/3;width:28px;height:28px;position:relative;border-radius:5px;background:#3b424d;overflow:hidden}.dc-photo img{width:100%;height:100%;object-fit:contain}.dc-photo>b{display:grid;height:100%;place-items:center;font-size:9px}.dc-photo em{position:absolute;right:1px;bottom:1px;padding:1px 2px;border-radius:3px;background:#f47a00;font-size:4px;font-style:normal}.dc-card.empty{opacity:.34;border-style:dashed}.dc-card.empty .dc-photo{background:transparent}.dc-summary,.pd-summary{display:grid;border:1px solid rgba(255,255,255,.09);border-radius:11px;overflow:hidden}.dc-summary{grid-template-columns:repeat(2,1fr)}.dc-summary span,.pd-summary span{padding:7px 8px;border-right:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}.dc-summary small,.dc-summary b,.pd-summary small,.pd-summary b{display:block}.dc-summary small,.pd-summary small{font-size:6px;color:#9fa7b1}.dc-summary b,.pd-summary b{margin-top:2px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .p1-perfect.perfect-depth-banner{display:grid!important;grid-template-columns:210px 310px minmax(0,1fr)!important;gap:12px!important;align-items:start!important;padding:10px 12px!important}.pd-copy h3{margin:2px 0;font-size:14px}.pd-summary{grid-template-columns:repeat(2,1fr)}.pd-grid{grid-template-columns:repeat(6,minmax(72px,1fr));align-self:stretch}.pd-grid .dc-card{background:#282f39}.pd-grid .dc-card.filled{border-color:rgba(229,174,72,.28)}
      @media(max-width:1250px){.p1-franchise.depth-chart-banner{grid-template-columns:160px 1fr!important}.dc-summary{grid-column:1/3;grid-template-columns:repeat(5,1fr)}.p1-perfect.perfect-depth-banner{grid-template-columns:190px 1fr!important}.pd-grid{grid-column:1/3}.dc-grid,.pd-grid{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function wrap(){
    if(!window.PhaseOneWarRoom?.render||window.PhaseOneWarRoom.__depthCharts)return false;
    const original=window.PhaseOneWarRoom.render.bind(window.PhaseOneWarRoom);
    window.PhaseOneWarRoom.render=function(){const ok=original();if(ok)requestAnimationFrame(enhance);return ok};
    window.PhaseOneWarRoom.__depthCharts=true;
    installStyles();
    enhance();
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(wrap()||tries>80)clearInterval(timer)},50);
})();