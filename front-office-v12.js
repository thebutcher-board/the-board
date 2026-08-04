'use strict';
(function(){
  const POS=['QB','RB','WR','TE','K','DEF'];
  const TARGET={QB:3,RB:4,WR:5,TE:2,K:1,DEF:1};
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v||'');
  const engine=()=>window.BoardDecisionEngine?.results?.()||[];
  const mine=()=>state?.profile?.teamName||'The Butcher';
  const selected=()=>window.BoardCockpit?.selected?.()||engine()[0]?.player?.name;
  const current=()=>engine().find(x=>x.player.name===selected())||engine()[0];
  const counts=()=>{try{return positionCounts(mine())||{}}catch{return{}}};
  const owner=()=>{try{return draftOrderAt(state.drafted.length)||'League'}catch{return'League'}};
  const away=()=>{try{for(let i=1;i<30;i++)if(draftOrderAt(state.drafted.length+i)===mine())return i}catch{}return 0};
  const photo=name=>{try{const id=playerPhotoMap?.get?.(String(name).toLowerCase());if(id)return`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`}catch{}return''};
  const initials=name=>String(name||'').split(' ').map(x=>x[0]).join('').slice(0,2);
  const role=p=>{try{return boardRole(p)}catch{return p.pos||'Priority target'}};

  function metrics(item){
    const p=item?.player||{},c={...counts()};c[p.pos]=Number(c[p.pos]||0)+1;
    const fit=clamp(Math.round(Number(item?.factors?.need||65)));
    const scarcity=clamp(Math.round(Number(item?.factors?.scarcity||55)));
    const projection=clamp(Math.round(Number(item?.factors?.projection||Math.min(100,Number(p.proj||0)/4))));
    const risk=String(p.risk||'Medium');
    const safety=risk==='Low'?88:risk==='High'?58:74;
    const filled=POS.reduce((s,pos)=>s+Math.min(Number(c[pos]||0),{QB:2,RB:2,WR:2,TE:1,K:1,DEF:1}[pos]),0);
    const balance=clamp(Math.round(42+(filled/9)*58));
    const championship=clamp(Math.round(7+fit*.06+scarcity*.04+projection*.04+safety*.025+balance*.08),6,42);
    const survive=clamp(100-Math.round(scarcity*.72+fit*.16),3,88);
    const confidence=clamp(Math.round((fit+scarcity+projection+safety)/4),55,97);
    return{fit,scarcity,projection,risk,balance,championship,survive,confidence};
  }
  function nextPriority(item){
    const c={...counts()};c[item.player.pos]=Number(c[item.player.pos]||0)+1;
    return POS.map(pos=>({pos,gap:Math.max(0,({QB:2,RB:2,WR:2,TE:1,K:1,DEF:1}[pos])-Number(c[pos]||0))})).sort((a,b)=>b.gap-a.gap)[0]?.pos||'VALUE';
  }
  function rarity(m){return m.fit>=90&&m.scarcity>=75?'legendary':m.fit>=88?'elite':m.fit>=75?'premium':'starter'}
  function tier(m){return m.scarcity>=75?'Critical':m.scarcity>=50?'Rising':'Stable'}
  function choose(name){
    for(const fn of ['select','setSelected','choose','explore'])if(typeof window.BoardCockpit?.[fn]==='function'){window.BoardCockpit[fn](name);queueRender();return}
    const btn=[...document.querySelectorAll('[data-cockpit-player]')].find(x=>decodeURIComponent(x.dataset.cockpitPlayer||'')===name);if(btn){btn.click();queueRender()}
  }
  function miniCard(item,label){
    const p=item.player,m=metrics(item),img=photo(p.name);
    return `<button class="wr12-mini ${rarity(m)}" data-choice="${encodeURIComponent(p.name)}">
      <div class="wr12-mini-photo">${img?`<img src="${img}" alt="${esc(p.name)}">`:`<b>${esc(initials(p.name))}</b>`}<em>${esc(p.pos)}</em></div>
      <div class="wr12-mini-copy"><small>${esc(label)}</small><strong>${esc(p.name)}</strong><span>${esc(p.team||'—')}</span></div>
      <div class="wr12-mini-grade"><b>${m.confidence}</b><small>GOOSE</small></div>
      <div class="wr12-mini-data"><span><small>PROJ</small><b>${Math.round(p.proj||0)}</b></span><span><small>LIVE</small><b>${m.survive}%</b></span></div>
    </button>`;
  }
  function hero(item,priority){
    const p=item.player,m=metrics(item),img=photo(p.name);
    return `<article class="wr12-hero ${rarity(m)}">
      <div class="wr12-hero-photo">${img?`<img src="${img}" alt="${esc(p.name)}">`:`<span>${esc(initials(p.name))}</span>`}<em>${esc(p.pos)}</em></div>
      <div class="wr12-hero-main">
        <div class="wr12-hero-head"><div><small>PRIMARY RECOMMENDATION</small><h2>${esc(p.name)}</h2><p>${esc(p.team||'—')} · ${esc(role(p))}</p></div><div class="wr12-grade"><b>${m.confidence}</b><small>GOOSE</small></div></div>
        <div class="wr12-rarity">${rarity(m).toUpperCase()}</div>
        <div class="wr12-whisper"><small>GOOSE AI</small><p>Take ${esc(p.name)} now. Waiting risks the ${esc(p.pos)} tier and shifts the next mission to ${esc(priority)}.</p></div>
        <div class="wr12-stats">
          <span><small>PROJ</small><b>${Math.round(p.proj||0)}</b></span><span><small>FIT</small><b>${m.fit}</b></span><span><small>SCARCITY</small><b>${m.scarcity}</b></span><span><small>SURVIVES</small><b>${m.survive}%</b></span><span><small>RISK</small><b>${esc(m.risk)}</b></span><span><small>TIER</small><b>${tier(m)}</b></span><span><small>PICK IMPACT</small><b>+${Math.max(1,Math.round(m.championship/8))}%</b></span><span><small>NEED</small><b>${'★'.repeat(Math.max(1,Math.min(5,Math.round(m.fit/20))))}</b></span>
        </div>
        <div class="wr12-actions"><button data-take-player="${encodeURIComponent(p.name)}">Take Player</button><button data-open-player="${encodeURIComponent(p.name)}">Open Report</button></div>
      </div>
    </article>`;
  }
  function rosterStrip(){return POS.map(pos=>{const have=Number(counts()[pos]||0),target=TARGET[pos],pct=Math.min(100,have/target*100);return`<span><b>${pos}</b><i><em style="width:${pct}%"></em></i><strong>${have}/${target}</strong></span>`}).join('')}
  function cleanupLegacy(shell){
    [...shell.children].forEach(el=>{if(el.id!=='warRoomV12')el.style.setProperty('display','none','important')});
    document.querySelectorAll('#warRoomV11,#warRoomV10,#warRoomV9,#warRoomV8,#decisionArenaV7,#warRoomLive,#cockpitV5,.draft-track,.draft-heartbeat-summary,.projection-panel').forEach(el=>el.style.setProperty('display','none','important'));
  }
  function render(){
    const war=document.getElementById('warroom'),shell=war?.querySelector('.front-office-shell'),item=current();if(!war||!shell||!item)return;
    war.classList.add('war-room-v12');cleanupLegacy(shell);
    let root=document.getElementById('warRoomV12');if(!root){root=document.createElement('section');root.id='warRoomV12';shell.prepend(root)}
    const p=item.player,m=metrics(item),priority=nextPriority(item),onClock=owner(),all=engine().filter(x=>x.player.name!==p.name),alts=all.slice(0,10),future=[...all.filter(x=>x.player.pos===priority),...all.filter(x=>x.player.pos!==priority)].slice(0,10);
    root.innerHTML=`
      <div class="wr12-live"><b>GOOSE LIVE</b><span>${esc(onClock)} on the clock</span><span>${100-m.survive}% chance ${esc(p.name)} is gone by your next pick</span><span>${esc(priority)} is the next mission</span></div>
      <header class="wr12-franchise">
        <div class="wr12-brand"><img src="logo.png" alt="${esc(mine())} logo"><div><small>YOUR FRANCHISE</small><h1>${esc(mine())}</h1><p>${esc(role(p))} build · Mission ${state.drafted.length+1}</p></div></div>
        <div class="wr12-roster"><small>ROSTER BUILD</small><div>${rosterStrip()}</div></div>
        <button class="wr12-perfect" type="button"><small>PERFECT DRAFT</small><b>Projected Roster</b><span>Foundation ready · live lineup model next</span></button>
        <div class="wr12-hud"><span><small>CHAMPIONSHIP</small><b>${m.championship}%</b></span><span><small>PICKS UNTIL YOU</small><b>${away()||'—'}</b></span><button data-owner="${encodeURIComponent(onClock)}"><small>ON THE CLOCK</small><b>${esc(onClock)}</b></button></div>
      </header>
      <section class="wr12-table">
        <aside class="wr12-side"><div class="wr12-title"><small>WHAT IF YOU PIVOT</small><h3>Pivot Paths</h3></div><div class="wr12-stack">${alts.map(x=>miniCard(x,'Alternate')).join('')}</div></aside>
        <main class="wr12-center">${hero(item,priority)}<div class="wr12-league"><span><small>LEAGUE LIVE</small><b>${esc(onClock)}</b></span><span><small>LIKELY POSITION</small><b>${esc(priority)}</b></span><button data-owner="${encodeURIComponent(onClock)}">Inspect Team</button></div></main>
        <aside class="wr12-side"><div class="wr12-title"><small>FUTURE BOARD</small><h3>Future Board</h3></div><div class="wr12-stack">${future.map(x=>miniCard(x,'Likely available')).join('')}</div></aside>
      </section>`;
    root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>choose(decodeURIComponent(b.dataset.choice)));
    root.querySelector('[data-take-player]')?.addEventListener('click',e=>{const n=decodeURIComponent(e.currentTarget.dataset.takePlayer);const approve=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Approve')&&x.textContent?.includes(n));approve?.click()});
    root.querySelector('[data-open-player]')?.addEventListener('click',e=>{const n=decodeURIComponent(e.currentTarget.dataset.openPlayer),btn=[...document.querySelectorAll('[data-player]')].find(x=>decodeURIComponent(x.dataset.player||'')===n);btn?.click()});
    root.querySelectorAll('[data-owner]').forEach(b=>b.onclick=()=>{const t=decodeURIComponent(b.dataset.owner),existing=document.querySelector(`[data-war-team="${CSS.escape(encodeURIComponent(t))}"]`);if(existing)existing.click();else[...document.querySelectorAll('.tab')].find(x=>x.dataset.view==='league')?.click()});
  }
  let timer;
  function queueRender(){clearTimeout(timer);timer=setTimeout(render,35)}
  function styles(){if(document.getElementById('warRoomV12Style'))return;const s=document.createElement('style');s.id='warRoomV12Style';s.textContent=`
    .war-room-v12{background:radial-gradient(circle at 50% 6%,#303641 0,#171a20 33%,#0b0d11 82%)!important;min-height:100vh;padding:10px 0 28px!important}.war-room-v12 .front-office-shell{max-width:none!important;padding:0 18px!important}.war-room-v12 #warRoomV12{display:block!important;max-width:1600px;margin:0 auto;color:#fff}.wr12-live{display:flex;gap:22px;align-items:center;height:32px;padding:0 14px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:#101217;color:#cbd0d7;font-size:10px;overflow:hidden;white-space:nowrap}.wr12-live b{color:#f59a45}.wr12-franchise{display:grid;grid-template-columns:minmax(230px,.7fr) minmax(300px,1fr) minmax(200px,.65fr) minmax(300px,.9fr);gap:14px;align-items:center;margin:10px 0 12px;padding:12px 14px;border:1px solid rgba(86,200,130,.28);border-radius:20px;background:linear-gradient(90deg,rgba(28,68,51,.72),rgba(31,38,44,.86));box-shadow:0 14px 38px rgba(0,0,0,.22)}.wr12-brand{display:flex;align-items:center;gap:12px}.wr12-brand img{width:56px;height:56px;object-fit:contain}.wr12-brand small,.wr12-title small,.wr12-roster>small,.wr12-perfect small,.wr12-league small{color:#f59a45;font-size:8px;letter-spacing:.09em}.wr12-brand h1{margin:2px 0;font-size:28px;color:#94efb1}.wr12-brand p{margin:0;color:#aeb5be;font-size:11px}.wr12-roster>div{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 10px;margin-top:6px}.wr12-roster span{display:grid;grid-template-columns:25px 1fr 24px;gap:5px;align-items:center}.wr12-roster b,.wr12-roster strong{font-size:9px}.wr12-roster strong{text-align:right}.wr12-roster i{height:4px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.wr12-roster em{display:block;height:100%;background:#f47a00}.wr12-perfect{padding:11px 12px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.045);color:#fff;text-align:left}.wr12-perfect b,.wr12-perfect span{display:block}.wr12-perfect b{font-size:14px;margin-top:3px}.wr12-perfect span{font-size:9px;color:#aeb5be;margin-top:3px}.wr12-hud{display:grid;grid-template-columns:repeat(3,minmax(90px,1fr));border:1px solid rgba(255,255,255,.1);border-radius:13px;overflow:hidden}.wr12-hud>*{padding:10px 11px;border:0;border-right:1px solid rgba(255,255,255,.08);background:transparent;color:#fff;text-align:left}.wr12-hud>*:last-child{border:0}.wr12-hud small,.wr12-hud b{display:block}.wr12-hud small{font-size:7px;color:#aeb5be}.wr12-hud b{font-size:13px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wr12-table{display:grid;grid-template-columns:minmax(250px,.86fr) minmax(500px,1.42fr) minmax(250px,.86fr);gap:14px;align-items:start}.wr12-title{padding:0 3px 6px}.wr12-title h3{margin:2px 0 0;font-size:17px}.wr12-stack{display:grid;grid-template-columns:1fr 1fr;gap:6px}.wr12-mini{display:grid;grid-template-columns:44px minmax(0,1fr) 38px;grid-template-rows:auto auto;gap:5px 7px;align-items:center;padding:7px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:linear-gradient(145deg,#343a44,#22262e);color:#fff;text-align:left;cursor:pointer;box-shadow:0 7px 18px rgba(0,0,0,.16);transition:border-color .15s,box-shadow .15s}.wr12-mini:hover{transform:none!important;border-color:rgba(245,154,69,.55);box-shadow:0 0 0 1px rgba(245,154,69,.12),0 9px 22px rgba(0,0,0,.2)}.wr12-mini.legendary{border-color:rgba(245,179,68,.6)}.wr12-mini.elite{border-color:rgba(178,115,255,.42)}.wr12-mini.premium{border-color:rgba(83,157,255,.38)}.wr12-mini-photo{grid-row:1/3;position:relative;width:44px;height:53px;border-radius:9px;overflow:hidden;background:#4a515d;display:grid;place-items:center}.wr12-mini-photo img{width:100%;height:100%;object-fit:cover}.wr12-mini-photo em{position:absolute;right:3px;bottom:3px;padding:2px 4px;border-radius:5px;background:#f47a00;font-size:7px;font-style:normal;font-weight:900}.wr12-mini-copy{min-width:0}.wr12-mini-copy small,.wr12-mini-copy strong,.wr12-mini-copy span{display:block}.wr12-mini-copy small{font-size:6px;color:#f59a45;letter-spacing:.06em}.wr12-mini-copy strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wr12-mini-copy span{font-size:7px;color:#aeb5be}.wr12-mini-grade{text-align:center}.wr12-mini-grade b,.wr12-mini-grade small{display:block}.wr12-mini-grade b{font-size:15px}.wr12-mini-grade small{font-size:6px;color:#f59a45}.wr12-mini-data{grid-column:2/4;display:grid;grid-template-columns:repeat(2,1fr);gap:3px}.wr12-mini-data span{padding:4px;border-radius:7px;background:rgba(255,255,255,.055);text-align:center}.wr12-mini-data small,.wr12-mini-data b{display:block}.wr12-mini-data small{font-size:6px;color:#9da4ad}.wr12-mini-data b{font-size:9px}.wr12-center{min-width:0}.wr12-hero{display:grid;grid-template-columns:190px minmax(0,1fr);gap:14px;padding:14px;border:1px solid rgba(245,179,68,.58);border-radius:23px;background:linear-gradient(150deg,#424955,#252a33 56%,#171a20);box-shadow:0 22px 58px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.06)}.wr12-hero.elite{border-color:rgba(178,115,255,.55)}.wr12-hero.premium{border-color:rgba(83,157,255,.5)}.wr12-hero-photo{position:relative;height:250px;border-radius:17px;overflow:hidden;background:linear-gradient(145deg,#59616e,#2f343d);display:grid;place-items:center}.wr12-hero-photo img{width:100%;height:100%;object-fit:cover}.wr12-hero-photo em{position:absolute;right:9px;bottom:9px;padding:5px 8px;border-radius:8px;background:#f47a00;font-size:11px;font-style:normal;font-weight:900}.wr12-hero-main{min-width:0}.wr12-hero-head{display:flex;justify-content:space-between;gap:14px}.wr12-hero-head small{font-size:8px;color:#f59a45;letter-spacing:.09em}.wr12-hero-head h2{font-size:28px;margin:3px 0 1px}.wr12-hero-head p{margin:0;color:#b6bdc6;font-size:11px}.wr12-grade{text-align:center;padding:7px 10px;border-radius:11px;background:rgba(255,255,255,.07)}.wr12-grade b,.wr12-grade small{display:block}.wr12-grade b{font-size:25px}.wr12-grade small{font-size:7px;color:#f59a45}.wr12-rarity{display:inline-block;margin:9px 0;padding:4px 8px;border-radius:999px;background:rgba(245,179,68,.16);color:#ffd27d;font-size:8px;font-weight:900;letter-spacing:.08em}.wr12-whisper{padding:9px 10px;border-left:3px solid #f47a00;border-radius:9px;background:rgba(255,255,255,.045)}.wr12-whisper small{font-size:7px;color:#f59a45}.wr12-whisper p{margin:3px 0 0;color:#e7e9ec;font-size:11px;line-height:1.4}.wr12-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:9px}.wr12-stats span{padding:7px 5px;border-radius:8px;background:rgba(255,255,255,.055);text-align:center}.wr12-stats small,.wr12-stats b{display:block}.wr12-stats small{font-size:6px;color:#a1a8b1}.wr12-stats b{font-size:13px;margin-top:2px}.wr12-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.wr12-actions button{padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff;font-weight:850}.wr12-actions button:first-child{background:#f47a00;border-color:#f47a00}.wr12-league{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center;margin-top:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035)}.wr12-league small,.wr12-league b{display:block}.wr12-league b{font-size:11px;margin-top:2px}.wr12-league button{padding:8px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff;font-size:10px;font-weight:800}@media(max-width:1180px){.wr12-franchise{grid-template-columns:1fr 1fr}.wr12-table{grid-template-columns:1fr}.wr12-stack{grid-template-columns:repeat(5,1fr)}.wr12-hero{max-width:760px;margin:auto}}@media(max-width:760px){.war-room-v12 .front-office-shell{padding:0 10px!important}.wr12-franchise{grid-template-columns:1fr}.wr12-stack{grid-template-columns:1fr 1fr}.wr12-hero{grid-template-columns:1fr}.wr12-hero-photo{height:230px}.wr12-stats{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(s)}
  function wrap(){if(typeof renderWarroom!=='function'||renderWarroom.__wr12)return false;const base=renderWarroom;renderWarroom=function(){base();queueRender()};renderWarroom.__wr12=true;return true}
  function init(){styles();if(wrap())queueRender();else setTimeout(init,120)}
  init();
})();