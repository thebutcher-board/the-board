'use strict';
(function(){
  const POSITIONS=['QB','RB','WR','TE','FLEX','K','DEF'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const currentOwner=()=>{try{return window.draftOrderAt(window.state.drafted.length)}catch{return'League'}};
  const playerList=()=>{try{return window.ranked()}catch{return[]}};
  const roster=()=>{try{return window.rosterFor(teamName())}catch{return[]}};
  const playerBy=()=>{try{return window.playerByName}catch{return null}};
  const photo=name=>{try{const id=window.playerPhotoMap?.get?.(String(name).toLowerCase());return id?`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`:''}catch{return''}};
  const initials=name=>String(name||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  const engineResults=()=>{try{return window.BoardDecisionEngine?.results?.()||[]}catch{return[]}};
  const selectedName=()=>{try{return window.BoardCockpit?.selected?.()}catch{return null}};
  const pickAway=()=>{try{for(let i=1;i<30;i++)if(window.draftOrderAt(window.state.drafted.length+i)===teamName())return i}catch{}return 0};

  function itemFor(player){
    const engine=engineResults().find(x=>x.player?.name===player?.name);
    return engine||{player,factors:{need:70,scarcity:55,projection:Math.min(100,Number(player?.proj||0)/4)}};
  }
  function metrics(item){
    const p=item?.player||{};
    const fit=clamp(Math.round(Number(item?.factors?.need||70)));
    const scarcity=clamp(Math.round(Number(item?.factors?.scarcity||55)));
    const risk=String(p.risk||'Medium');
    const safety=risk==='Low'?88:risk==='High'?58:74;
    const grade=clamp(Math.round((fit+scarcity+Math.min(100,Number(p.proj||0)/4)+safety)/4),55,97);
    const survives=clamp(100-Math.round(scarcity*.72+fit*.16),3,88);
    const impact=Math.max(1,Math.round((fit+scarcity)/45));
    return{fit,scarcity,risk,grade,survives,impact,tier:scarcity>=75?'Critical':scarcity>=50?'Rising':'Stable'};
  }
  function rarity(m){return m.fit>=90&&m.scarcity>=75?'legendary':m.fit>=88?'elite':m.fit>=75?'premium':'starter'}
  function playerImage(name){const src=photo(name);return src?`<img src="${src}" alt="${esc(name)}">`:`<b>${esc(initials(name))}</b>`}

  function compactCard(item,label){
    const p=item.player,m=metrics(item);
    return `<button class="p1-card ${rarity(m)}" data-explore="${encodeURIComponent(p.name)}">
      <div class="p1-card-photo">${playerImage(p.name)}<em>${esc(p.pos)}</em></div>
      <div class="p1-card-copy"><small>${esc(label)}</small><strong>${esc(p.name)}</strong><span>${esc(p.team||'—')}</span></div>
      <b class="p1-card-grade">${m.grade}</b>
      <div class="p1-card-metrics"><span>${Math.round(p.proj||0)} pts</span><span>${m.survives}% live</span></div>
    </button>`;
  }
  function rosterMini(player,slot){
    if(!player)return `<div class="p1-roster-card empty"><small>${slot}</small><b>OPEN</b></div>`;
    return `<div class="p1-roster-card"><div>${playerImage(player.name)}</div><small>${slot}</small><b>${esc(player.name)}</b></div>`;
  }
  function currentRosterCards(){
    const list=roster();
    const slots=[];
    const take=(pos,n)=>list.filter(p=>p.pos===pos).slice(0,n);
    take('QB',3).forEach((p,i)=>slots.push(rosterMini(p,`QB${i+1}`)));
    take('RB',4).forEach((p,i)=>slots.push(rosterMini(p,`RB${i+1}`)));
    take('WR',5).forEach((p,i)=>slots.push(rosterMini(p,`WR${i+1}`)));
    take('TE',2).forEach((p,i)=>slots.push(rosterMini(p,`TE${i+1}`)));
    take('K',1).forEach(p=>slots.push(rosterMini(p,'K')));
    take('DEF',1).forEach(p=>slots.push(rosterMini(p,'DEF')));
    return slots.join('')||'<div class="p1-roster-card empty"><small>ROSTER</small><b>OPEN</b></div>';
  }
  function projectedRoster(players){
    const keep=roster();
    const used=new Set(keep.map(p=>p.name));
    const pool=players.filter(p=>!used.has(p.name));
    const slots=[['QB1','QB'],['QB2','QB'],['RB1','RB'],['RB2','RB'],['WR1','WR'],['WR2','WR'],['TE','TE'],['FLEX','FLEX'],['K','K'],['DEF','DEF'],['B1','ANY'],['B2','ANY'],['B3','ANY'],['B4','ANY'],['B5','ANY'],['B6','ANY']];
    const chosen=[];
    slots.forEach(([slot,pos])=>{
      let p=keep.find(x=>!chosen.includes(x)&&((pos==='FLEX'&&['RB','WR','TE'].includes(x.pos))||(pos==='ANY')||x.pos===pos));
      if(!p)p=pool.find(x=>!chosen.includes(x)&&((pos==='FLEX'&&['RB','WR','TE'].includes(x.pos))||(pos==='ANY')||x.pos===pos));
      if(p)chosen.push(p);
    });
    return slots.map(([slot],i)=>rosterMini(chosen[i],slot)).join('');
  }
  function hero(item){
    const p=item.player,m=metrics(item);
    return `<article class="p1-hero ${rarity(m)}">
      <div class="p1-hero-photo">${playerImage(p.name)}<em>${esc(p.pos)}</em></div>
      <div class="p1-hero-main">
        <div class="p1-hero-head"><div><small>PLAYER UNDER CONSIDERATION</small><h2>${esc(p.name)}</h2><p>${esc(p.team||'—')} · ${esc(p.pos)}</p></div><div><b>${m.grade}</b><small>GOOSE</small></div></div>
        <div class="p1-goose"><small>GOOSE AI</small><p>Take ${esc(p.name)} now. Passing creates a ${100-m.survives}% chance he is gone before your next pick.</p></div>
        <div class="p1-stats"><span><small>PROJ</small><b>${Math.round(p.proj||0)}</b></span><span><small>FIT</small><b>${m.fit}</b></span><span><small>SCARCITY</small><b>${m.scarcity}</b></span><span><small>SURVIVES</small><b>${m.survives}%</b></span><span><small>RISK</small><b>${esc(m.risk)}</b></span><span><small>TIER</small><b>${m.tier}</b></span><span><small>CHAMP IMPACT</small><b>+${m.impact}%</b></span><span><small>NEED</small><b>${'★'.repeat(Math.max(1,Math.min(5,Math.round(m.fit/20))))}</b></span></div>
        <div class="p1-actions"><button data-take="${encodeURIComponent(p.name)}">Take Player</button><button data-report="${encodeURIComponent(p.name)}">Open Report</button></div>
      </div>
    </article>`;
  }

  function render(){
    const mount=document.getElementById('phaseOneMount');
    const ranked=playerList();
    if(!mount||!ranked.length)return false;
    const selected=selectedName();
    const top=ranked.find(p=>p.name===selected)||ranked[0];
    const main=itemFor(top);
    const others=ranked.filter(p=>p.name!==top.name);
    const pivots=others.slice(0,10).map(itemFor);
    const priority=['QB','RB','WR','TE'].find(pos=>roster().filter(p=>p.pos===pos).length<({QB:2,RB:2,WR:2,TE:1}[pos]))||'WR';
    const future=[...others.filter(p=>p.pos===priority),...others.filter(p=>p.pos!==priority)].slice(0,10).map(itemFor);
    const titleOdds=clamp(10+Math.round(roster().length*1.5),8,38);
    const playoffOdds=clamp(46+Math.round(roster().length*5),40,94);
    mount.innerHTML=`<section class="p1-shell">
      <header class="p1-franchise">
        <div class="p1-brand"><img src="logo.png"><div><small>YOUR FRANCHISE</small><h1>${esc(teamName())}</h1><p>Mission ${window.state?.drafted?.length+1||1}</p></div></div>
        <div class="p1-current"><small>CURRENT ROSTER</small><div>${currentRosterCards()}</div></div>
        <div class="p1-hud"><span><small>PLAYOFF</small><b>${playoffOdds}%</b></span><span><small>CHAMPIONSHIP</small><b>${titleOdds}%</b></span><span><small>PICKS UNTIL YOU</small><b>${pickAway()||'—'}</b></span><span><small>ON THE CLOCK</small><b>${esc(currentOwner())}</b></span></div>
      </header>
      <div class="p1-live"><b>GOOSE LIVE</b><span>${esc(currentOwner())} is selecting</span><span>${100-metrics(main).survives}% chance ${esc(top.name)} is gone by your next pick</span><span>${priority} is the next roster mission</span></div>
      <section class="p1-table">
        <aside><small>WHAT IF YOU PIVOT</small><h3>Pivot Paths</h3><div class="p1-stack">${pivots.map(x=>compactCard(x,'Alternate')).join('')}</div></aside>
        <main>${hero(main)}<div class="p1-league"><span><small>LEAGUE LIVE</small><b>${esc(currentOwner())}</b></span><span><small>LIKELY POSITION</small><b>${priority}</b></span><button>Inspect Team</button></div></main>
        <aside><small>FUTURE BOARD</small><h3>Likely Available</h3><div class="p1-stack">${future.map(x=>compactCard(x,'Next pick')).join('')}</div></aside>
      </section>
      <footer class="p1-perfect"><div><small>PERFECT DRAFT</small><h3>Best Realistic Finished Roster</h3><p>Predictive before the draft. Recalculates after every pick.</p></div><div class="p1-perfect-score"><small>PERFECT DRAFT SCORE</small><b>91</b></div><div class="p1-perfect-cards">${projectedRoster(ranked)}</div></footer>
    </section>`;
    bind(mount);
    return true;
  }
  function explore(name){
    for(const fn of ['select','setSelected','choose','explore'])if(typeof window.BoardCockpit?.[fn]==='function'){window.BoardCockpit[fn](name);setTimeout(render,20);return}
    window.__phaseOneSelected=name;render();
  }
  function bind(root){
    root.querySelectorAll('[data-explore]').forEach(b=>b.onclick=()=>explore(decodeURIComponent(b.dataset.explore)));
    root.querySelector('[data-take]')?.addEventListener('click',e=>{const name=decodeURIComponent(e.currentTarget.dataset.take);if(typeof window.requestDraft==='function')window.requestDraft(name)});
    root.querySelector('[data-report]')?.addEventListener('click',e=>{const name=decodeURIComponent(e.currentTarget.dataset.report);if(typeof window.openPlayerDetails==='function')window.openPlayerDetails(name)});
  }
  function styles(){if(document.getElementById('phaseOneStyles'))return;const s=document.createElement('style');s.id='phaseOneStyles';s.textContent=`
    #warroom{background:radial-gradient(circle at 50% 0,#2e3540,#14171d 36%,#090b0f 88%)!important;min-height:calc(100vh - 120px);padding:10px 18px 24px!important}.p1-shell{max-width:1600px;margin:auto;color:#fff}.p1-franchise{display:grid;grid-template-columns:220px 1fr 430px;gap:14px;align-items:center;padding:12px 14px;border:1px solid rgba(77,210,130,.28);border-radius:20px;background:linear-gradient(90deg,rgba(25,73,51,.76),rgba(31,37,44,.9))}.p1-brand{display:flex;gap:11px;align-items:center}.p1-brand img{width:62px;height:62px;object-fit:contain}.p1-brand small,.p1-current>small,.p1-table aside>small,.p1-perfect small,.p1-league small{font-size:8px;letter-spacing:.11em;color:#f5a154}.p1-brand h1{margin:2px 0;font-size:27px;color:#94efb1}.p1-brand p{margin:0;color:#aeb6c0;font-size:10px}.p1-current>div,.p1-perfect-cards{display:flex;gap:5px;overflow:hidden;margin-top:6px}.p1-roster-card{width:54px;min-width:54px;height:62px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:#252b34;padding:4px;text-align:center;overflow:hidden}.p1-roster-card>div{height:30px}.p1-roster-card img{width:100%;height:100%;object-fit:contain}.p1-roster-card>div>b{display:grid;height:100%;place-items:center}.p1-roster-card small{display:block;color:#f5a154;font-size:6px}.p1-roster-card>b{display:block;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.p1-roster-card.empty{display:flex;flex-direction:column;justify-content:center;opacity:.55}.p1-hud{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid rgba(255,255,255,.1);border-radius:13px;overflow:hidden}.p1-hud span{padding:10px;border-right:1px solid rgba(255,255,255,.08)}.p1-hud span:last-child{border:0}.p1-hud small,.p1-hud b{display:block}.p1-hud small{font-size:7px;color:#aeb6c0}.p1-hud b{font-size:13px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.p1-live{display:flex;gap:24px;align-items:center;height:30px;margin:8px 0;padding:0 14px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:#101217;color:#cbd0d7;font-size:9px;white-space:nowrap;overflow:hidden}.p1-live b{color:#f5a154}.p1-table{display:grid;grid-template-columns:minmax(250px,.82fr) minmax(520px,1.42fr) minmax(250px,.82fr);gap:13px;align-items:start}.p1-table h3{margin:2px 0 6px;font-size:16px}.p1-stack{display:grid;grid-template-columns:1fr 1fr;gap:6px}.p1-card{display:grid;grid-template-columns:42px minmax(0,1fr) 30px;grid-template-rows:auto auto;gap:4px 6px;padding:6px;border:1px solid rgba(255,255,255,.11);border-radius:11px;background:linear-gradient(145deg,#343a45,#20242c);color:#fff;text-align:left;min-height:74px}.p1-card.legendary,.p1-hero.legendary{border-color:rgba(229,174,72,.78)}.p1-card.elite{border-color:rgba(114,85,179,.72)}.p1-card.premium{border-color:rgba(76,143,220,.62)}.p1-card-photo{height:43px;position:relative;border-radius:8px;background:#454c58;overflow:hidden}.p1-card-photo img{width:100%;height:100%;object-fit:contain}.p1-card-photo>b{display:grid;height:100%;place-items:center}.p1-card-photo em{position:absolute;right:2px;bottom:2px;padding:2px 4px;border-radius:6px;background:#f47a00;font-size:6px;font-style:normal}.p1-card-copy small,.p1-card-copy strong,.p1-card-copy span{display:block}.p1-card-copy small{font-size:6px;color:#f5a154}.p1-card-copy strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.p1-card-copy span{font-size:7px;color:#aeb6c0}.p1-card-grade{font-size:15px;text-align:right}.p1-card-metrics{grid-column:2/4;display:flex;justify-content:space-between;font-size:7px;color:#d8dce1}.p1-hero{display:grid;grid-template-columns:225px 1fr;gap:16px;min-height:405px;padding:14px;border:1px solid rgba(229,174,72,.72);border-radius:21px;background:linear-gradient(145deg,#414854,#20242b 56%,#171a20);box-shadow:0 20px 55px rgba(0,0,0,.32)}.p1-hero-photo{position:relative;border-radius:15px;background:#343b46;overflow:hidden}.p1-hero-photo img{width:100%;height:100%;object-fit:contain;object-position:center bottom}.p1-hero-photo>span,.p1-hero-photo>b{display:grid;height:100%;place-items:center;font-size:50px}.p1-hero-photo em{position:absolute;right:10px;top:10px;padding:7px 10px;border-radius:10px;background:#f47a00;font-style:normal;font-weight:800}.p1-hero-main{display:flex;flex-direction:column}.p1-hero-head{display:flex;justify-content:space-between}.p1-hero-head small{font-size:8px;color:#f5a154}.p1-hero-head h2{font-size:28px;margin:4px 0}.p1-hero-head p{margin:0;color:#b8bec7}.p1-hero-head>div:last-child{text-align:center}.p1-hero-head>div:last-child b{display:block;font-size:29px}.p1-goose{margin:13px 0;padding:12px;border-left:3px solid #f47a00;border-radius:10px;background:rgba(8,11,15,.42)}.p1-goose small{font-size:7px;color:#63d98b}.p1-goose p{margin:5px 0 0;font-size:13px;line-height:1.45}.p1-stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden}.p1-stats span{padding:10px;border-right:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}.p1-stats small,.p1-stats b{display:block}.p1-stats small{font-size:6px;color:#9fa7b1}.p1-stats b{font-size:13px;margin-top:3px}.p1-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:auto;padding-top:12px}.p1-actions button,.p1-league button{height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:transparent;color:#fff;font-weight:800}.p1-actions button:first-child{border:0;background:#f47a00}.p1-league{display:grid;grid-template-columns:1fr 1fr 140px;gap:8px;align-items:center;margin-top:8px;padding:8px 12px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:#16191f}.p1-league small,.p1-league b{display:block}.p1-league b{font-size:11px}.p1-league button{height:34px}.p1-perfect{display:grid;grid-template-columns:240px 100px 1fr;gap:14px;align-items:center;margin-top:10px;padding:10px 14px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:linear-gradient(90deg,#181c23,#252b34)}.p1-perfect h3{margin:2px 0;font-size:15px}.p1-perfect p{margin:0;color:#aeb6c0;font-size:9px}.p1-perfect-score{text-align:center;border-right:1px solid rgba(255,255,255,.1)}.p1-perfect-score b{display:block;font-size:28px}.p1-perfect-cards .p1-roster-card{height:58px}.p1-card:hover{border-color:#f5a154}.p1-card{transform:none!important;animation:none!important}@media(max-width:1100px){.p1-franchise{grid-template-columns:1fr}.p1-table{grid-template-columns:1fr}.p1-stack{grid-template-columns:repeat(5,1fr)}.p1-perfect{grid-template-columns:1fr}.p1-current>div,.p1-perfect-cards{overflow-x:auto}}
  `;document.head.appendChild(s)}
  styles();
  window.PhaseOneWarRoom={render};
})();