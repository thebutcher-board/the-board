'use strict';
(function(){
  const SLOT_DEFS=[
    ['QB1','QB'],['QB2','QB'],['RB1','RB'],['RB2','RB'],['WR1','WR'],['WR2','WR'],
    ['TE','TE'],['FLEX','FLEX'],['K','K'],['DEF','DEF'],
    ['BENCH 1','ANY'],['BENCH 2','ANY'],['BENCH 3','ANY'],['BENCH 4','ANY'],['BENCH 5','ANY'],['BENCH 6','ANY']
  ];
  const PHOTO_IDS={
    'jalen hurts':'4881','brock purdy':'7526','jared goff':'3163','matthew stafford':'1535',
    'patrick mahomes':'4046','c.j. stroud':'9758','jordan love':'6804','baker mayfield':'4892',
    'daniel jones':'6768','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786',
    'trey mcbride':'8130','garrett wilson':'8146','brandon aubrey':'10222','ashton jeanty':'12527'
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const ranked=()=>{try{return window.ranked?.()||[]}catch{return[]}};
  const liveRoster=()=>{try{return window.rosterFor?.(teamName())||[]}catch{return[]}};
  const currentOwner=()=>{try{return window.draftOrderAt?.(window.state?.drafted?.length||0)||'League'}catch{return'League'}};
  const picksAway=()=>{try{for(let i=1;i<30;i++)if(window.draftOrderAt(window.state.drafted.length+i)===teamName())return i}catch{}return 0};
  const initials=name=>String(name||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  const normalize=name=>String(name||'').toLowerCase().replace(/[^a-z0-9. ]/g,'').replace(/\s+/g,' ').trim();

  function photo(player){
    if(!player)return'';
    for(const key of ['photo','image','headshot','avatar']){
      const value=player[key];
      if(typeof value==='string'&&/^https?:\/\//.test(value))return value;
    }
    const name=normalize(player.name);
    let id=PHOTO_IDS[name];
    try{id=id||window.playerPhotoMap?.get?.(name)}catch{}
    if(!id){
      const values=[player.sleeperId,player.sleeper_id,player.player_id];
      id=values.find(v=>/^\d+$/.test(String(v||'')));
    }
    return id?`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`:'';
  }
  window.PhaseOnePhotoResolver=player=>photo(typeof player==='string'?{name:player}:player);

  const eligible=(player,type)=>type==='ANY'||player?.pos===type||(type==='FLEX'&&['RB','WR','TE'].includes(player?.pos));
  function assignSlots(players){
    const remaining=[...players];
    const assigned={};
    for(const [slot,type] of SLOT_DEFS){
      const idx=remaining.findIndex(p=>eligible(p,type));
      assigned[slot]=idx>=0?remaining.splice(idx,1)[0]:null;
    }
    return assigned;
  }
  function predictiveRoster(){
    const locked=liveRoster();
    const used=new Set(locked.map(p=>p.name));
    return assignSlots([...locked,...ranked().filter(p=>!used.has(p.name))]);
  }
  function lineupScore(slots){
    return Math.round(SLOT_DEFS.slice(0,10).reduce((sum,[slot])=>sum+Number(slots[slot]?.proj||0),0));
  }
  function odds(slots,isPerfect=false){
    const filled=Object.values(slots).filter(Boolean).length;
    const starters=SLOT_DEFS.slice(0,10).filter(([slot])=>slots[slot]).length;
    const score=lineupScore(slots);
    return{
      score,
      playoff:clamp(Math.round(38+starters*4.6+Math.min(12,score/260)+(isPerfect?3:0)),20,96),
      championship:clamp(Math.round(4+starters*1.45+Math.min(13,score/360)+(isPerfect?2:0)),3,46),
      rosterScore:clamp(Math.round(42+filled*2.1+starters*2.2+(isPerfect?4:0)),40,99)
    };
  }
  function photoMarkup(player){
    const src=photo(player),fallback=esc(initials(player?.name));
    if(!src)return`<b>${fallback}</b>`;
    return`<img src="${src}" alt="${esc(player.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><b class="dc-fallback">${fallback}</b>`;
  }
  function mini(player,slot){
    if(!player)return`<div class="dc-card empty"><small>${esc(slot)}</small><div class="dc-photo"><b>—</b></div><strong>OPEN</strong></div>`;
    return`<div class="dc-card filled" title="${esc(player.name)}">
      <small>${esc(slot)}</small><div class="dc-photo">${photoMarkup(player)}<em>${esc(player.pos||'')}</em></div>
      <strong>${esc(player.name)}</strong><span>${Math.round(Number(player.proj||0))} pts</span>
    </div>`;
  }
  function depthGrid(slots){
    const groups=[
      ['QB',['QB1','QB2']],['RB',['RB1','RB2']],['WR',['WR1','WR2']],
      ['SKILL',['TE','FLEX']],['SPECIAL',['K','DEF']],['BENCH',['BENCH 1','BENCH 2','BENCH 3','BENCH 4','BENCH 5','BENCH 6']]
    ];
    return groups.map(([label,keys])=>`<div class="dc-group ${label==='BENCH'?'bench':''}"><label>${label}</label><div>${keys.map(k=>mini(slots[k],k)).join('')}</div></div>`).join('');
  }
  function summary(metrics,perfect=false){
    const entries=perfect?
      [['PERFECT DRAFT SCORE',metrics.rosterScore],['PROJECTED PTS',metrics.score],['PLAYOFF',`${metrics.playoff}%`],['CHAMPIONSHIP',`${metrics.championship}%`]]:
      [['PROJECTED PTS',metrics.score],['PLAYOFF',`${metrics.playoff}%`],['CHAMPIONSHIP',`${metrics.championship}%`],['PICKS UNTIL YOU',picksAway()||'—'],['ON THE CLOCK',currentOwner()]];
    return entries.map(([label,value])=>`<span><small>${label}</small><b>${esc(value)}</b></span>`).join('');
  }
  function topBanner(){
    const header=document.querySelector('#phaseOneMount .p1-franchise');
    if(!header)return;
    const slots=assignSlots(liveRoster()),m=odds(slots,false);
    header.className='p1-franchise depth-chart-banner';
    header.innerHTML=`<div class="dc-banner-top">
      <div class="dc-brand"><img src="logo.png" alt="${esc(teamName())}"><div><small>YOUR FRANCHISE</small><h1>${esc(teamName())}</h1><p>Live roster · Mission ${(window.state?.drafted?.length||0)+1}</p></div></div>
      <div class="dc-summary">${summary(m,false)}</div>
    </div><div class="dc-roster"><div class="dc-title"><small>CURRENT TEAM</small><b>Built as you draft</b></div><div class="dc-grid">${depthGrid(slots)}</div></div>`;
  }
  function bottomBanner(){
    const footer=document.querySelector('#phaseOneMount .p1-perfect');
    if(!footer)return;
    const slots=predictiveRoster(),m=odds(slots,true);
    footer.className='p1-perfect perfect-depth-banner';
    footer.innerHTML=`<div class="pd-banner-top">
      <div class="pd-copy"><small>PERFECT DRAFT</small><h3>Best Realistic Finished Roster</h3><p>Pre-draft prediction that recalculates after every selection.</p></div>
      <div class="pd-summary">${summary(m,true)}</div>
    </div><div class="pd-grid">${depthGrid(slots)}</div>`;
  }
  function enhance(){topBanner();bottomBanner();}

  function installStyles(){
    let style=document.getElementById('depthChartBannerStyles');
    if(!style){style=document.createElement('style');style.id='depthChartBannerStyles';document.head.appendChild(style)}
    style.textContent=`
      .p1-franchise.depth-chart-banner,.p1-perfect.perfect-depth-banner{display:block!important;width:100%!important;box-sizing:border-box!important;overflow:hidden!important;padding:10px 14px!important}
      .dc-banner-top,.pd-banner-top{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:9px}
      .dc-brand{display:flex;gap:10px;align-items:center;min-width:230px}.dc-brand img{width:58px;height:58px;object-fit:contain}.dc-brand small,.dc-title small,.pd-copy small{font-size:7px;letter-spacing:.12em;color:#f5a154}.dc-brand h1{margin:2px 0;font-size:23px;color:#94efb1}.dc-brand p,.pd-copy p{margin:0;font-size:8px;color:#aeb6c0}
      .dc-summary,.pd-summary{display:grid;border:1px solid rgba(255,255,255,.09);border-radius:11px;overflow:hidden;background:rgba(10,13,18,.24)}.dc-summary{grid-template-columns:repeat(5,minmax(88px,1fr));max-width:650px;flex:1}.pd-summary{grid-template-columns:repeat(4,minmax(95px,1fr));max-width:500px;flex:1}.dc-summary span,.pd-summary span{padding:7px 9px;border-right:1px solid rgba(255,255,255,.07)}.dc-summary span:last-child,.pd-summary span:last-child{border-right:0}.dc-summary small,.dc-summary b,.pd-summary small,.pd-summary b{display:block}.dc-summary small,.pd-summary small{font-size:6px;color:#9fa7b1}.dc-summary b,.pd-summary b{margin-top:2px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dc-title{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}.dc-title b{font-size:10px}.dc-grid,.pd-grid{display:grid;grid-template-columns:repeat(5,minmax(118px,1fr)) minmax(250px,2fr);gap:7px;width:100%;min-width:0}.dc-group{min-width:0}.dc-group>label{display:block;margin-bottom:3px;font-size:6px;letter-spacing:.1em;color:#89929e}.dc-group>div{display:grid;grid-template-columns:1fr;gap:4px}.dc-group.bench>div{grid-template-columns:repeat(3,minmax(0,1fr))}
      .dc-card{position:relative;display:grid;grid-template-columns:30px minmax(0,1fr);grid-template-rows:12px 13px;height:38px;column-gap:5px;padding:4px;border:1px solid rgba(255,255,255,.1);border-radius:7px;background:rgba(20,24,30,.76);overflow:hidden;box-sizing:border-box}.dc-card>small{grid-column:2;font-size:5px;color:#f5a154}.dc-card>strong{grid-column:2;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dc-card>span{display:none}.dc-photo{grid-row:1/3;width:30px;height:30px;position:relative;border-radius:5px;background:#3b424d;overflow:hidden}.dc-photo img{width:100%;height:100%;object-fit:contain}.dc-photo>b{display:grid;height:100%;place-items:center;font-size:9px}.dc-photo .dc-fallback{display:none}.dc-photo em{position:absolute;right:1px;bottom:1px;padding:1px 2px;border-radius:3px;background:#f47a00;font-size:4px;font-style:normal}.dc-card.empty{opacity:.34;border-style:dashed}.dc-card.empty .dc-photo{background:transparent}.pd-copy h3{margin:2px 0;font-size:14px}.pd-grid .dc-card{background:#282f39}.pd-grid .dc-card.filled{border-color:rgba(229,174,72,.32)}
      @media(max-width:1280px){.dc-grid,.pd-grid{grid-template-columns:repeat(5,minmax(100px,1fr)) minmax(220px,1.8fr)}.dc-summary{grid-template-columns:repeat(5,minmax(75px,1fr))}.dc-brand{min-width:190px}.dc-brand h1{font-size:20px}}
      @media(max-width:1050px){.dc-banner-top,.pd-banner-top{align-items:flex-start}.dc-summary,.pd-summary{max-width:none}.dc-grid,.pd-grid{grid-template-columns:repeat(3,1fr)}.dc-group.bench{grid-column:1/4}.dc-group.bench>div{grid-template-columns:repeat(6,1fr)}}
    `;
  }
  function wrap(){
    if(!window.PhaseOneWarRoom?.render||window.PhaseOneWarRoom.__depthCharts)return false;
    const original=window.PhaseOneWarRoom.render.bind(window.PhaseOneWarRoom);
    window.PhaseOneWarRoom.render=function(){const ok=original();if(ok)requestAnimationFrame(enhance);return ok};
    window.PhaseOneWarRoom.__depthCharts=true;installStyles();enhance();return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(wrap()||tries>80)clearInterval(timer)},50);
})();