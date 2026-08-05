'use strict';
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const roster=()=>{try{return window.rosterFor(teamName())||[]}catch{return[]}};
  const ranked=()=>{try{return window.ranked()||[]}catch{return[]}};
  const currentOwner=()=>{try{return window.draftOrderAt(window.state.drafted.length)||'League'}catch{return'League'}};
  const picksAway=()=>{try{for(let i=1;i<30;i++)if(window.draftOrderAt(window.state.drafted.length+i)===teamName())return i}catch{}return 0};
  const engine=()=>{try{return window.BoardDecisionEngine?.results?.()||[]}catch{return[]}};
  const selected=()=>window.__phaseOneSelected||(()=>{try{return window.BoardCockpit?.selected?.()}catch{return null}})();
  const initials=n=>String(n||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  const PHOTO_OVERRIDES={'jalen hurts':'6904'};
  function photoId(p){
    if(!p)return'';
    const key=String(p.name||'').toLowerCase();
    if(PHOTO_OVERRIDES[key])return PHOTO_OVERRIDES[key];
    for(const k of ['sleeperId','sleeper_id','playerId','player_id','id'])if(p[k])return p[k];
    try{return window.playerPhotoMap?.get?.(key)||''}catch{return''}
  }
  function image(p,cls=''){
    const id=photoId(p),fallback=esc(initials(p?.name));
    if(!id)return `<span class="${cls} photo-fallback">${fallback}</span>`;
    return `<span class="${cls} photo-wrap"><img src="https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg" alt="${esc(p.name)}" onerror="this.parentNode.classList.add('failed');this.remove()"><b>${fallback}</b></span>`;
  }
  function itemFor(p){return engine().find(x=>x.player?.name===p?.name)||{player:p,factors:{need:72,scarcity:58}}}
  function metrics(item){
    const p=item.player||{},fit=clamp(Math.round(Number(item.factors?.need||72))),scarcity=clamp(Math.round(Number(item.factors?.scarcity||58)));
    const risk=String(p.risk||'Medium'),safety=risk==='Low'?88:risk==='High'?58:74;
    const grade=clamp(Math.round((fit+scarcity+Math.min(100,Number(p.proj||0)/4)+safety)/4),55,97);
    const survives=clamp(100-Math.round(scarcity*.72+fit*.16),3,88);
    return{fit,scarcity,risk,grade,survives,tier:scarcity>=75?'Critical':scarcity>=50?'Rising':'Stable',impact:Math.max(1,Math.round((fit+scarcity)/45))};
  }
  function rarity(m){return m.fit>=90&&m.scarcity>=75?'legendary':m.fit>=88?'elite':m.fit>=75?'premium':'starter'}

  const SLOT_DEFS=[
    ['QB1','QB'],['QB2','QB'],['RB1','RB'],['RB2','RB'],['WR1','WR'],['WR2','WR'],['TE','TE'],['FLEX','FLEX'],['K','K'],['DEF','DEF'],
    ['BENCH 1','ANY'],['BENCH 2','ANY'],['BENCH 3','ANY'],['BENCH 4','ANY'],['BENCH 5','ANY'],['BENCH 6','ANY']
  ];
  function assignSlots(source,pool=[]){
    const chosen=[],available=[...source,...pool.filter(p=>!source.some(x=>x.name===p.name))];
    return SLOT_DEFS.map(([slot,pos])=>{
      const idx=available.findIndex(p=>!chosen.includes(p.name)&&(pos==='ANY'||p.pos===pos||(pos==='FLEX'&&['RB','WR','TE'].includes(p.pos))));
      if(idx<0)return{slot,player:null};
      const player=available[idx];chosen.push(player.name);return{slot,player};
    });
  }
  function slotCard(entry){
    const p=entry.player;
    if(!p)return `<div class="depth-card empty"><small>${entry.slot}</small><span>OPEN</span></div>`;
    return `<div class="depth-card">${image(p,'depth-photo')}<div><small>${entry.slot}</small><b>${esc(p.name)}</b><span>${esc(p.team||'—')} · ${esc(p.pos)}</span></div></div>`;
  }
  function depthChart(entries){
    const groups=[
      ['QB',entries.slice(0,2)],['RB',entries.slice(2,4)],['WR',entries.slice(4,6)],['SKILL',entries.slice(6,8)],['SPECIAL',entries.slice(8,10)],['BENCH',entries.slice(10)]
    ];
    return groups.map(([label,cards])=>`<div class="depth-group"><small>${label}</small><div>${cards.map(slotCard).join('')}</div></div>`).join('');
  }
  function compactCard(item,label){
    const p=item.player,m=metrics(item);
    return `<button class="support-card ${rarity(m)}" data-explore="${encodeURIComponent(p.name)}">${image(p,'support-photo')}<div class="support-copy"><small>${esc(label)}</small><b>${esc(p.name)}</b><span>${esc(p.team||'—')} · ${esc(p.pos)}</span></div><strong>${m.grade}</strong><footer><span>${Math.round(p.proj||0)} pts</span><span>${m.survives}% live</span></footer></button>`;
  }
  function hero(item){
    const p=item.player,m=metrics(item);
    return `<article class="hero-card ${rarity(m)}"><div class="hero-photo">${image(p,'hero-img')}<em>${esc(p.pos)}</em></div><div class="hero-info"><header><div><small>PLAYER UNDER CONSIDERATION</small><h2>${esc(p.name)}</h2><p>${esc(p.team||'—')} · ${esc(p.pos)}</p></div><div class="hero-grade"><b>${m.grade}</b><small>GOOSE</small></div></header><div class="goose-note"><small>GOOSE AI</small><p>Take ${esc(p.name)} now. Passing creates a ${100-m.survives}% chance he is gone before your next pick.</p></div><div class="hero-stats"><span><small>PROJ</small><b>${Math.round(p.proj||0)}</b></span><span><small>FIT</small><b>${m.fit}</b></span><span><small>SCARCITY</small><b>${m.scarcity}</b></span><span><small>SURVIVES</small><b>${m.survives}%</b></span><span><small>RISK</small><b>${esc(m.risk)}</b></span><span><small>TIER</small><b>${m.tier}</b></span><span><small>CHAMP IMPACT</small><b>+${m.impact}%</b></span><span><small>NEED</small><b>${'★'.repeat(Math.max(1,Math.min(5,Math.round(m.fit/20))))}</b></span></div><div class="hero-actions"><button data-take="${encodeURIComponent(p.name)}">Take Player</button><button data-report="${encodeURIComponent(p.name)}">Open Report</button></div></div></article>`;
  }
  function odds(entries,projected=false){
    const filled=entries.filter(x=>x.player).length;
    const points=entries.reduce((s,x)=>s+Number(x.player?.proj||0),0);
    const playoff=clamp(Math.round((projected?52:42)+filled*3.2+points/190),10,94);
    const champ=clamp(Math.round((projected?8:5)+filled*1.05+points/520),3,45);
    return{points:Math.round(points),playoff,champ,score:clamp(Math.round(55+filled*1.8+points/120),55,99)};
  }
  function metricStrip(o,projected=false){return `<div class="banner-metrics"><span><small>${projected?'PERFECT DRAFT SCORE':'PROJECTED PTS'}</small><b>${projected?o.score:o.points}</b></span>${projected?`<span><small>PROJECTED PTS</small><b>${o.points}</b></span>`:''}<span><small>PLAYOFF</small><b>${o.playoff}%</b></span><span><small>CHAMPIONSHIP</small><b>${o.champ}%</b></span>${projected?'':`<span><small>PICKS UNTIL YOU</small><b>${picksAway()||'—'}</b></span><span><small>ON THE CLOCK</small><b>${esc(currentOwner())}</b></span>`}</div>`}

  function render(){
    const mount=document.getElementById('phaseOneMount'),all=ranked();
    if(!mount||!all.length)return false;
    const top=all.find(p=>p.name===selected())||all[0],main=itemFor(top),others=all.filter(p=>p.name!==top.name);
    const currentEntries=assignSlots(roster());
    const perfectEntries=assignSlots(roster(),[top,...others]);
    const currentOdds=odds(currentEntries,false),perfectOdds=odds(perfectEntries,true);
    const priority=['QB','RB','WR','TE'].find(pos=>roster().filter(p=>p.pos===pos).length<({QB:2,RB:2,WR:2,TE:1}[pos]))||'WR';
    const pivots=others.slice(0,10).map(itemFor);
    const future=[...others.filter(p=>p.pos===priority),...others.filter(p=>p.pos!==priority)].slice(0,10).map(itemFor);
    mount.innerHTML=`<section class="war-shell"><header class="roster-banner"><div class="banner-top"><div class="franchise-id"><img src="logo.png" alt="${esc(teamName())}"><div><small>YOUR FRANCHISE</small><h1>${esc(teamName())}</h1><p>Live roster · Mission ${(window.state?.drafted?.length||0)+1}</p></div></div>${metricStrip(currentOdds,false)}</div><div class="depth-row"><div class="depth-label"><small>CURRENT TEAM</small><b>Built as you draft</b></div>${depthChart(currentEntries)}</div></header><div class="live-ribbon"><b>GOOSE LIVE</b><span>${esc(currentOwner())} is selecting</span><span>${100-metrics(main).survives}% chance ${esc(top.name)} is gone by your next pick</span><span>${priority} is the next roster mission</span></div><section class="decision-grid"><aside><small>WHAT IF YOU PIVOT</small><h3>Pivot Paths</h3><div class="support-grid">${pivots.map(x=>compactCard(x,'Alternate')).join('')}</div></aside><main>${hero(main)}<div class="league-row"><span><small>LEAGUE LIVE</small><b>${esc(currentOwner())}</b></span><span><small>LIKELY POSITION</small><b>${priority}</b></span><button>Inspect Team</button></div></main><aside><small>FUTURE BOARD</small><h3>Likely Available</h3><div class="support-grid">${future.map(x=>compactCard(x,'Next pick')).join('')}</div></aside></section><footer class="perfect-banner"><div class="banner-top"><div><small>PERFECT DRAFT</small><h3>Best Realistic Finished Roster</h3><p>Pre-draft prediction that recalculates after every selection.</p></div>${metricStrip(perfectOdds,true)}</div><div class="depth-row"><div class="depth-label"><small>PROJECTED TEAM</small><b>Best realistic path</b></div>${depthChart(perfectEntries)}</div></footer></section>`;
    bind(mount);return true;
  }
  function bind(root){
    root.querySelectorAll('[data-explore]').forEach(b=>b.onclick=()=>{window.__phaseOneSelected=decodeURIComponent(b.dataset.explore);render()});
    root.querySelector('[data-take]')?.addEventListener('click',e=>window.requestDraft?.(decodeURIComponent(e.currentTarget.dataset.take)));
    root.querySelector('[data-report]')?.addEventListener('click',e=>window.openPlayerDetails?.(decodeURIComponent(e.currentTarget.dataset.report)));
  }
  function styles(){
    if(document.getElementById('phaseOneStyles'))document.getElementById('phaseOneStyles').remove();
    const s=document.createElement('style');s.id='phaseOneStyles';s.textContent=`
    #warroom{background:radial-gradient(circle at 50% 0,#2d3440,#151920 38%,#090b0f 88%)!important;min-height:calc(100vh - 120px);padding:14px 22px 28px!important}.war-shell{max-width:1500px;margin:auto;color:#fff}.roster-banner,.perfect-banner{border:1px solid rgba(80,210,130,.26);border-radius:20px;background:linear-gradient(105deg,rgba(20,75,48,.78),rgba(31,37,45,.96));padding:14px 16px}.perfect-banner{margin-top:14px;border-color:rgba(245,161,84,.22);background:linear-gradient(105deg,#202630,#171b22)}.banner-top{display:flex;align-items:center;justify-content:space-between;gap:18px}.franchise-id{display:flex;align-items:center;gap:12px;min-width:240px}.franchise-id img{width:70px;height:70px;object-fit:contain}.franchise-id small,.perfect-banner small,.decision-grid aside>small,.league-row small,.depth-label small{color:#f5a154;font-size:9px;letter-spacing:.1em}.franchise-id h1,.perfect-banner h3{margin:2px 0;font-size:29px}.franchise-id h1{color:#9af0b7}.franchise-id p,.perfect-banner p{margin:0;color:#aeb6c0;font-size:11px}.banner-metrics{display:flex;min-width:520px;border:1px solid rgba(255,255,255,.1);border-radius:13px;overflow:hidden}.banner-metrics span{flex:1;padding:10px 12px;border-right:1px solid rgba(255,255,255,.08)}.banner-metrics span:last-child{border:0}.banner-metrics small,.banner-metrics b{display:block}.banner-metrics small{font-size:7px;color:#aeb6c0}.banner-metrics b{font-size:14px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.depth-row{display:grid;grid-template-columns:120px repeat(6,minmax(0,1fr));gap:8px;margin-top:12px;align-items:start}.depth-label{padding-top:4px}.depth-label b{display:block;font-size:12px;margin-top:3px}.depth-group>small{display:block;color:#8e98a5;font-size:7px;margin-bottom:4px}.depth-group>div{display:grid;gap:5px}.depth-card{height:46px;display:flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(15,18,23,.7);padding:4px 6px;min-width:0}.depth-card.empty{justify-content:center;flex-direction:column;opacity:.45;border-style:dashed}.depth-card.empty small{font-size:6px}.depth-card.empty span{font-size:8px}.depth-photo{width:34px;height:38px;flex:0 0 34px}.depth-card>div{min-width:0}.depth-card small{display:block;color:#f5a154;font-size:6px}.depth-card b{display:block;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.depth-card span{display:block;color:#9ca5af;font-size:6px}.photo-wrap,.photo-fallback{display:grid;place-items:end center;overflow:hidden;border-radius:8px;background:linear-gradient(145deg,#3b4350,#232831);position:relative}.photo-wrap img{width:100%;height:100%;object-fit:contain;object-position:center bottom}.photo-wrap>b{display:none}.photo-wrap.failed>b{display:grid;place-items:center;width:100%;height:100%;font-size:18px}.live-ribbon{height:32px;display:flex;align-items:center;gap:26px;padding:0 15px;margin:10px 0;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:#101218;color:#c8ced6;font-size:10px;white-space:nowrap;overflow:hidden}.live-ribbon b{color:#f5a154}.decision-grid{display:grid;grid-template-columns:330px minmax(560px,1fr) 330px;gap:18px;align-items:start}.decision-grid h3{font-size:19px;margin:3px 0 8px}.support-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.support-card{position:relative;display:grid;grid-template-columns:48px 1fr 30px;grid-template-rows:1fr auto;gap:5px 7px;min-height:88px;padding:7px;border-radius:12px;border:1px solid rgba(145,102,220,.5);background:linear-gradient(145deg,#343b47,#20252d);color:#fff;text-align:left}.support-card.legendary,.hero-card.legendary{border-color:rgba(245,177,67,.7)}.support-photo{width:48px;height:58px;grid-row:1/3}.support-copy{min-width:0}.support-copy small{color:#f5a154;font-size:7px}.support-copy b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.support-copy span{font-size:8px;color:#aab2bc}.support-card>strong{font-size:20px;text-align:right}.support-card footer{grid-column:2/4;display:flex;justify-content:space-between;color:#c8ced6;font-size:8px}.hero-card{display:grid;grid-template-columns:310px 1fr;min-height:430px;border:1px solid rgba(245,177,67,.65);border-radius:22px;background:linear-gradient(145deg,#39414e,#20252d);overflow:hidden}.hero-photo{position:relative;background:linear-gradient(160deg,#3b4351,#252b34);padding:16px}.hero-img{width:100%;height:100%;min-height:390px;border-radius:16px}.hero-photo em{position:absolute;right:24px;top:22px;background:#ff8500;border-radius:12px;padding:10px;font-style:normal;font-weight:800}.hero-info{padding:22px 22px 18px}.hero-info header{display:flex;justify-content:space-between;gap:16px}.hero-info header small,.goose-note small{color:#f5a154;font-size:8px;letter-spacing:.08em}.hero-info h2{font-size:36px;margin:4px 0}.hero-info p{color:#b7bec8;margin:0}.hero-grade b{font-size:38px}.hero-grade small{display:block;text-align:right}.goose-note{margin:18px 0 14px;padding:14px;border-left:4px solid #ff8500;border-radius:10px;background:rgba(10,12,16,.45)}.goose-note p{font-size:15px;line-height:1.45;color:#fff}.hero-stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden}.hero-stats span{padding:10px;border-right:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}.hero-stats small,.hero-stats b{display:block}.hero-stats small{font-size:7px;color:#9099a5}.hero-stats b{font-size:14px;margin-top:3px}.hero-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.hero-actions button,.league-row button{height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:#171b21;color:#fff;font-weight:800}.hero-actions button:first-child{background:#ff8500;border-color:#ff8500}.league-row{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:10px;padding:10px 14px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#171b21}.league-row span{min-width:150px}.league-row small,.league-row b{display:block}.league-row button{height:40px;padding:0 22px}.perfect-banner .banner-top>div:first-child{min-width:270px}.perfect-banner .depth-row{margin-top:14px}@media(max-width:1250px){.decision-grid{grid-template-columns:270px minmax(500px,1fr) 270px}.support-grid{grid-template-columns:1fr}.banner-metrics{min-width:440px}.depth-row{grid-template-columns:100px repeat(6,minmax(0,1fr))}}`;
    document.head.appendChild(s);
  }
  window.PhaseOneWarRoom={render};
  styles();
})();