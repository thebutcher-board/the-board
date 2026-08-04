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
    return `<button class="wr11-mini ${rarity(m)}" data-choice="${encodeURIComponent(p.name)}">
      <div class="wr11-mini-photo">${img?`<img src="${img}" alt="${esc(p.name)}">`:`<b>${esc(initials(p.name))}</b>`}<em>${esc(p.pos)}</em></div>
      <div class="wr11-mini-copy"><small>${esc(label)}</small><strong>${esc(p.name)}</strong><span>${esc(p.team||'—')} · ${esc(role(p))}</span></div>
      <div class="wr11-mini-grade"><b>${m.confidence}</b><small>GOOSE</small></div>
      <div class="wr11-mini-data"><span><small>PROJ</small><b>${Math.round(p.proj||0)}</b></span><span><small>RISK</small><b>${esc(m.risk)}</b></span><span><small>LIVE</small><b>${m.survive}%</b></span></div>
    </button>`;
  }
  function hero(item,priority){
    const p=item.player,m=metrics(item),img=photo(p.name);
    return `<article class="wr11-hero ${rarity(m)}">
      <div class="wr11-hero-head"><div><small>PRIMARY RECOMMENDATION</small><h2>${esc(p.name)}</h2><p>${esc(p.team||'—')} · ${esc(role(p))}</p></div><div class="wr11-grade"><b>${m.confidence}</b><small>GOOSE</small></div></div>
      <div class="wr11-hero-main">
        <div class="wr11-hero-photo">${img?`<img src="${img}" alt="${esc(p.name)}">`:`<span>${esc(initials(p.name))}</span>`}<em>${esc(p.pos)}</em></div>
        <div class="wr11-hero-info">
          <div class="wr11-rarity">${rarity(m).toUpperCase()}</div>
          <div class="wr11-whisper"><small>GOOSE AI</small><p>Take ${esc(p.name)} now. Waiting risks the ${esc(p.pos)} tier and shifts your next mission to ${esc(priority)}.</p></div>
          <div class="wr11-stats">
            <span><small>PROJ</small><b>${Math.round(p.proj||0)}</b></span>
            <span><small>FIT</small><b>${m.fit}</b></span>
            <span><small>SCARCITY</small><b>${m.scarcity}</b></span>
            <span><small>SURVIVES</small><b>${m.survive}%</b></span>
            <span><small>RISK</small><b>${esc(m.risk)}</b></span>
            <span><small>TIER</small><b>${tier(m)}</b></span>
            <span><small>CHAMPIONSHIP</small><b>${m.championship}%</b></span>
            <span><small>NEED</small><b>${'★'.repeat(Math.max(1,Math.min(5,Math.round(m.fit/20))))}</b></span>
          </div>
          <div class="wr11-actions"><button data-take-player="${encodeURIComponent(p.name)}">Take Player</button><button data-open-player="${encodeURIComponent(p.name)}">Open Report</button></div>
        </div>
      </div>
    </article>`;
  }
  function rosterStrip(){
    return POS.map(pos=>{const have=Number(counts()[pos]||0),target=TARGET[pos],pct=Math.min(100,have/target*100);return`<span><b>${pos}</b><i><em style="width:${pct}%"></em></i><strong>${have}/${target}</strong></span>`}).join('');
  }
  function cleanupLegacy(shell){
    [...shell.children].forEach(el=>{if(el.id!=='warRoomV11'&&!el.classList.contains('projection-panel'))el.style.setProperty('display','none','important')});
    document.querySelectorAll('#warRoomV10,#warRoomV9,#warRoomV8,#decisionArenaV7,#warRoomLive,#cockpitV5,.draft-track,.draft-heartbeat-summary').forEach(el=>el.style.setProperty('display','none','important'));
  }
  function render(){
    const war=document.getElementById('warroom'),shell=war?.querySelector('.front-office-shell'),item=current();if(!war||!shell||!item)return;
    war.classList.add('war-room-v11');cleanupLegacy(shell);
    let root=document.getElementById('warRoomV11');if(!root){root=document.createElement('section');root.id='warRoomV11';shell.prepend(root)}
    const p=item.player,m=metrics(item),priority=nextPriority(item),onClock=owner(),all=engine().filter(x=>x.player.name!==p.name),alts=all.slice(0,10),future=[...all.filter(x=>x.player.pos===priority),...all.filter(x=>x.player.pos!==priority)].slice(0,10);
    root.innerHTML=`
      <div class="wr11-live"><b>GOOSE LIVE</b><span>${esc(onClock)} is on the clock</span><span>${100-m.survive}% chance ${esc(p.name)} is gone before your next pick</span><span>${esc(priority)} becomes the next mission</span></div>
      <header class="wr11-franchise">
        <div class="wr11-brand"><img src="logo.png" alt="${esc(mine())} logo"><div><small>YOUR FRANCHISE</small><h1>${esc(mine())}</h1><p>${esc(role(p))} build · Mission ${state.drafted.length+1}</p></div></div>
        <div class="wr11-roster-build"><small>ROSTER BUILD</small><div>${rosterStrip()}</div></div>
        <div class="wr11-hud"><span><small>CHAMPIONSHIP</small><b>${m.championship}%</b></span><span><small>NEXT PRIORITY</small><b>${priority}</b></span><span><small>PICKS UNTIL YOU</small><b>${away()||'—'}</b></span><button data-owner="${encodeURIComponent(onClock)}"><small>ON THE CLOCK</small><b>${esc(onClock)}</b></button></div>
      </header>
      <section class="wr11-table">
        <aside class="wr11-side"><div class="wr11-title"><small>WHAT IF YOU PIVOT</small><h3>Pivot Paths</h3></div><div class="wr11-stack">${alts.map(x=>miniCard(x,'Alternate')).join('')}</div></aside>
        <main class="wr11-center">${hero(item,priority)}<div class="wr11-center-foot"><div><small>LEAGUE LIVE</small><b>${esc(onClock)}</b><span>Likely selects ${esc(priority)}</span></div><button data-owner="${encodeURIComponent(onClock)}">Inspect Team</button></div></main>
        <aside class="wr11-side"><div class="wr11-title"><small>FUTURE BOARD</small><h3>Future Board</h3></div><div class="wr11-stack">${future.map(x=>miniCard(x,'Likely available')).join('')}</div></aside>
      </section>
      <button class="wr11-strategy">Open War Room Strategy</button>`;
    root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>choose(decodeURIComponent(b.dataset.choice)));
    root.querySelector('[data-take-player]')?.addEventListener('click',e=>{const n=decodeURIComponent(e.currentTarget.dataset.takePlayer);const approve=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Approve')&&x.textContent?.includes(n));approve?.click()});
    root.querySelector('[data-open-player]')?.addEventListener('click',e=>{const n=decodeURIComponent(e.currentTarget.dataset.openPlayer),btn=[...document.querySelectorAll('[data-player]')].find(x=>decodeURIComponent(x.dataset.player||'')===n);btn?.click()});
    root.querySelectorAll('[data-owner]').forEach(b=>b.onclick=()=>{const t=decodeURIComponent(b.dataset.owner),existing=document.querySelector(`[data-war-team="${CSS.escape(encodeURIComponent(t))}"]`);if(existing)existing.click();else[...document.querySelectorAll('.tab')].find(x=>x.dataset.view==='league')?.click()});
    root.querySelector('.wr11-strategy')?.addEventListener('click',()=>{const panel=document.querySelector('.projection-panel');if(panel){panel.classList.toggle('wr11-open');root.querySelector('.wr11-strategy').textContent=panel.classList.contains('wr11-open')?'Close War Room Strategy':'Open War Room Strategy'}});
  }
  let timer;
  function queueRender(){clearTimeout(timer);timer=setTimeout(render,30)}
  function styles(){if(document.getElementById('warRoomV11Style'))return;const s=document.createElement('style');s.id='warRoomV11Style';s.textContent=`
    .war-room-v11{background:radial-gradient(circle at 50% 8%,#303641 0,#171a20 34%,#0b0d11 82%)!important;min-height:100vh;padding:14px 0 60px!important}.war-room-v11 .front-office-shell{max-width:none!important;padding:0 22px!important}.war-room-v11 .projection-panel{display:none!important}.war-room-v11 .projection-panel.wr11-open{display:block!important;max-width:1180px;margin:18px auto!important}.war-room-v11 #warRoomV11{display:block!important;max-width:1580px;margin:0 auto;color:#fff}.wr11-live{display:flex;gap:24px;align-items:center;height:36px;padding:0 16px;border:1px solid rgba(255,255,255,.09);border-radius:999px;background:#101217;color:#cbd0d7;font-size:11px;overflow:hidden;white-space:nowrap}.wr11-live b{color:#f59a45}.wr11-franchise{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(340px,1.2fr) minmax(430px,1.4fr);gap:18px;align-items:center;margin:14px 0 18px;padding:14px 16px;border:1px solid rgba(86,200,130,.28);border-radius:24px;background:linear-gradient(90deg,rgba(28,68,51,.72),rgba(31,38,44,.86));box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 18px 48px rgba(0,0,0,.24)}.wr11-brand{display:flex;align-items:center;gap:13px}.wr11-brand img{width:64px;height:64px;object-fit:contain}.wr11-brand small,.wr11-title small,.wr11-roster-build>small,.wr11-center-foot small{color:#f59a45;font-size:9px;letter-spacing:.09em}.wr11-brand h1{margin:2px 0;font-size:32px;color:#94efb1}.wr11-brand p{margin:0;color:#aeb5be;font-size:13px}.wr11-roster-build>div{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 12px;margin-top:8px}.wr11-roster-build span{display:grid;grid-template-columns:28px 1fr 28px;gap:6px;align-items:center}.wr11-roster-build b,.wr11-roster-build strong{font-size:10px}.wr11-roster-build strong{text-align:right}.wr11-roster-build i{height:5px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.wr11-roster-build em{display:block;height:100%;background:#f47a00}.wr11-hud{display:grid;grid-template-columns:repeat(4,minmax(105px,1fr));border:1px solid rgba(255,255,255,.1);border-radius:15px;overflow:hidden}.wr11-hud>*{padding:11px 13px;border:0;border-right:1px solid rgba(255,255,255,.08);background:transparent;color:#fff;text-align:left}.wr11-hud>*:last-child{border:0}.wr11-hud small,.wr11-hud b{display:block}.wr11-hud small{font-size:8px;color:#aeb5be}.wr11-hud b{font-size:15px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wr11-table{display:grid;grid-template-columns:minmax(260px,.85fr) minmax(540px,1.55fr) minmax(260px,.85fr);gap:16px;align-items:start}.wr11-side,.wr11-center{min-width:0}.wr11-title{padding:0 4px 8px}.wr11-title h3{margin:3px 0 0;font-size:20px}.wr11-stack{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wr11-mini{display:grid;grid-template-columns:44px minmax(0,1fr) 36px;grid-template-rows:auto auto;gap:6px 8px;align-items:center;width:100%;min-height:88px;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:linear-gradient(145deg,#343a44,#22262e);color:#fff;text-align:left;cursor:pointer;box-shadow:0 9px 22px rgba(0,0,0,.17);transition:border-color .16s,box-shadow .16s}.wr11-mini:hover{transform:none!important;border-color:rgba(245,154,69,.55);box-shadow:0 0 0 1px rgba(245,154,69,.16),0 11px 26px rgba(0,0,0,.22)}.wr11-mini.legendary{border-color:rgba(245,179,68,.62)}.wr11-mini.elite{border-color:rgba(178,115,255,.48)}.wr11-mini.premium{border-color:rgba(83,157,255,.42)}.wr11-mini-photo{grid-row:1/3;position:relative;width:44px;height:58px;border-radius:10px;overflow:hidden;background:#4a515d;display:grid;place-items:center}.wr11-mini-photo img{width:100%;height:100%;object-fit:cover}.wr11-mini-photo em{position:absolute;right:2px;bottom:2px;padding:2px 4px;border-radius:6px;background:#f47a00;font-size:7px;font-style:normal;font-weight:900}.wr11-mini-copy{min-width:0}.wr11-mini-copy small{display:block;color:#e6a15f;font-size:7px}.wr11-mini-copy strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wr11-mini-copy span{display:block;color:#aeb5be;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wr11-mini-grade{text-align:right}.wr11-mini-grade b{display:block;font-size:17px}.wr11-mini-grade small{font-size:6px;color:#9fa6ae}.wr11-mini-data{grid-column:2/4;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(255,255,255,.07);padding-top:5px}.wr11-mini-data span{text-align:center}.wr11-mini-data small,.wr11-mini-data b{display:block}.wr11-mini-data small{font-size:6px;color:#8f969f}.wr11-mini-data b{font-size:9px}.wr11-hero{border:1px solid rgba(255,255,255,.14);border-radius:24px;background:linear-gradient(150deg,#3b414c,#252a32 55%,#171a20);box-shadow:0 28px 65px rgba(0,0,0,.32);overflow:hidden}.wr11-hero.legendary{border-color:rgba(245,179,68,.72);box-shadow:0 0 0 1px rgba(245,179,68,.08),0 30px 70px rgba(0,0,0,.34)}.wr11-hero-head{display:flex;justify-content:space-between;gap:18px;padding:18px 20px 10px}.wr11-hero-head small{color:#f0a65b;font-size:9px;letter-spacing:.09em}.wr11-hero-head h2{font-size:34px;margin:4px 0}.wr11-hero-head p{margin:0;color:#b8bec6}.wr11-grade{text-align:right}.wr11-grade b{display:block;font-size:36px}.wr11-grade small{font-size:8px;color:#a5acb4}.wr11-hero-main{display:grid;grid-template-columns:210px 1fr;gap:18px;padding:0 20px 20px}.wr11-hero-photo{position:relative;height:250px;border-radius:18px;overflow:hidden;background:radial-gradient(circle at 50% 32%,#59616d,#20242b 72%);display:grid;place-items:center}.wr11-hero-photo img{width:100%;height:100%;object-fit:cover}.wr11-hero-photo em{position:absolute;top:12px;right:12px;padding:8px 10px;border-radius:10px;background:#f47a00;color:#fff;font-size:15px;font-style:normal;font-weight:900}.wr11-rarity{display:inline-block;margin-bottom:10px;padding:5px 10px;border:1px solid rgba(245,179,68,.45);border-radius:999px;color:#f4bd64;font-size:8px;font-weight:900;letter-spacing:.08em}.wr11-whisper{padding:12px 14px;border-radius:14px;background:rgba(10,13,17,.4)}.wr11-whisper small{color:#6fd598;font-size:8px}.wr11-whisper p{margin:5px 0 0;color:#eef1f5;line-height:1.45;font-size:13px}.wr11-stats{display:grid;grid-template-columns:repeat(4,1fr);margin-top:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden}.wr11-stats span{text-align:center;padding:10px 5px;border-right:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}.wr11-stats span:nth-child(4n){border-right:0}.wr11-stats span:nth-last-child(-n+4){border-bottom:0}.wr11-stats small,.wr11-stats b{display:block}.wr11-stats small{font-size:7px;color:#969da6}.wr11-stats b{font-size:14px;margin-top:3px}.wr11-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.wr11-actions button{padding:13px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff;font-weight:900}.wr11-actions button:first-child{background:#f47a00;border-color:#f47a00}.wr11-center-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;padding:11px 14px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035)}.wr11-center-foot b,.wr11-center-foot span{margin-left:8px}.wr11-center-foot span{color:#aeb5be;font-size:12px}.wr11-center-foot button{padding:9px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff;font-weight:800}.wr11-strategy{display:block;width:100%;margin-top:16px;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:#171a20;color:#fff;font-weight:900}@media(max-width:1250px){.wr11-franchise{grid-template-columns:1fr}.wr11-hud{grid-template-columns:repeat(4,1fr)}.wr11-table{grid-template-columns:240px minmax(440px,1fr) 240px}.wr11-stack{grid-template-columns:1fr}.wr11-hero-main{grid-template-columns:180px 1fr}.wr11-hero-photo{height:230px}}@media(max-width:980px){.wr11-table{grid-template-columns:1fr}.wr11-stack{grid-template-columns:repeat(2,minmax(0,1fr))}.wr11-center{grid-row:1}.wr11-side{grid-row:auto}.wr11-hud{grid-template-columns:repeat(2,1fr)}.wr11-hero-main{grid-template-columns:170px 1fr}}@media(max-width:680px){.war-room-v11 .front-office-shell{padding:0 12px!important}.wr11-live{display:none}.wr11-brand h1{font-size:27px}.wr11-roster-build>div{grid-template-columns:repeat(2,1fr)}.wr11-stack{grid-template-columns:1fr}.wr11-hero-main{grid-template-columns:1fr}.wr11-hero-photo{height:260px}.wr11-stats{grid-template-columns:repeat(2,1fr)}.wr11-stats span:nth-child(4n){border-right:1px solid rgba(255,255,255,.07)}.wr11-stats span:nth-child(2n){border-right:0}.wr11-actions{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}
  function observe(){
    const war=document.getElementById('warroom');if(!war)return;
    new MutationObserver(()=>{if(typeof activeView==='undefined'||activeView==='warroom')queueRender()}).observe(war,{childList:true,subtree:true});
  }
  styles();
  const start=()=>{render();observe();setTimeout(render,400);setTimeout(render,1400)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.WarRoomV11={render};
})();