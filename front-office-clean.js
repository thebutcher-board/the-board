'use strict';
(function(){
  const PHOTO_IDS={
    'jalen hurts':'6904','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786','trey mcbride':'8151','ashton jeanty':'12526',
    'brock purdy':'7523','jared goff':'5857','matthew stafford':'421','jaxson dart':'12507','patrick mahomes':'4046',
    'c.j. stroud':'9758','cam ward':'12522','jordan love':'6804','daniel jones':'5849','baker mayfield':'4892','garrett wilson':'8146',
    'davante adams':'2133','brandon aubrey':'11628','jeremiyah love':'12531','jaylen waddle':'7561','courtland sutton':'5133'
  };
  const SLOT_DEFS=[['QB1','QB'],['QB2','QB'],['RB1','RB'],['RB2','RB'],['WR1','WR'],['WR2','WR'],['TE','TE'],['FLEX','FLEX'],['K','K'],['DEF','DEF'],['BENCH 1','ANY'],['BENCH 2','ANY'],['BENCH 3','ANY'],['BENCH 4','ANY'],['BENCH 5','ANY'],['BENCH 6','ANY']];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
  const clean=n=>String(n||'').replace(/…/g,'').trim().toLowerCase();
  const initials=n=>String(n||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const ranked=()=>{try{return window.ranked?.()||[]}catch{return[]}};
  const currentOwner=()=>{try{return window.draftOrderAt?.(window.state?.drafted?.length||0)||'League'}catch{return'League'}};
  const picksAway=()=>{try{for(let i=1;i<30;i++)if(window.draftOrderAt((window.state?.drafted?.length||0)+i)===teamName())return i}catch{}return 0};
  const roster=()=>{try{return (window.rosterFor?.(teamName())||[]).map(p=>window.playerByName?.(p.name)||p)}catch{return[]}};
  const engine=()=>{try{return window.BoardDecisionEngine?.results?.()||[]}catch{return[]}};
  const selectedName=()=>window.__cleanFrontOfficeSelected||window.BoardCockpit?.selected?.()||null;

  function playerPhoto(name,cls=''){
    const id=PHOTO_IDS[clean(name)],fallback=esc(initials(name));
    if(!id)return `<span class="tb-photo ${cls} is-fallback" data-photo-name="${esc(name)}"><b>${fallback}</b></span>`;
    return `<span class="tb-photo ${cls}" data-photo-name="${esc(name)}"><img loading="eager" decoding="async" src="https://sleepercdn.com/content/nfl/players/${id}.jpg" alt="${esc(name)}"><b>${fallback}</b></span>`;
  }
  function hydratePhotos(root){
    root.querySelectorAll('.tb-photo:not(.is-fallback)').forEach(node=>{
      const img=node.querySelector('img');if(!img)return;
      const id=PHOTO_IDS[clean(node.dataset.photoName)],fallback=node.querySelector('b');let triedThumb=false;
      img.onerror=()=>{if(!triedThumb&&id){triedThumb=true;img.src=`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;return;}img.remove();node.classList.add('is-fallback');if(fallback)fallback.style.display='grid';};
    });
  }
  function itemFor(p){return engine().find(x=>x.player?.name===p?.name)||{player:p,factors:{need:72,scarcity:58}}}
  function metrics(item){
    const p=item.player||{},fit=clamp(Math.round(Number(item.factors?.need||72))),scarcity=clamp(Math.round(Number(item.factors?.scarcity||58)));
    const risk=String(p.risk||'Medium'),safety=risk==='Low'?88:risk==='High'?58:74;
    const grade=clamp(Math.round((fit+scarcity+Math.min(100,Number(p.proj||0)/4)+safety)/4),55,97);
    const survives=clamp(100-Math.round(scarcity*.72+fit*.16),3,88);
    return{fit,scarcity,risk,grade,survives,tier:scarcity>=75?'Critical':scarcity>=50?'Rising':'Stable',impact:Math.max(1,Math.round((fit+scarcity)/45))};
  }
  function assignSlots(source,pool=[]){
    const available=[...source,...pool.filter(p=>!source.some(x=>x.name===p.name))],used=new Set();
    return SLOT_DEFS.map(([slot,pos])=>{const p=available.find(x=>!used.has(x.name)&&(pos==='ANY'||x.pos===pos||(pos==='FLEX'&&['RB','WR','TE'].includes(x.pos))));if(!p)return{slot,player:null};used.add(p.name);return{slot,player:p};});
  }
  function odds(entries,projected=false){
    const filled=entries.filter(x=>x.player).length,points=entries.reduce((s,x)=>s+Number(x.player?.proj||0),0);
    return{points:Math.round(points),playoff:clamp(Math.round((projected?52:42)+filled*3.2+points/190),10,94),champ:clamp(Math.round((projected?8:5)+filled*1.05+points/520),3,45),score:clamp(Math.round(55+filled*1.8+points/120),55,99)};
  }
  function depthCard(entry){
    const p=entry.player;
    if(!p)return `<div class="tb-depth-card is-empty"><small>${entry.slot}</small><span>OPEN</span></div>`;
    return `<div class="tb-depth-card">${playerPhoto(p.name,'tb-depth-photo')}<div><small>${entry.slot}</small><strong title="${esc(p.name)}">${esc(p.name)}</strong><span>${esc(p.team||'—')} · ${esc(p.pos||'—')}</span></div></div>`;
  }
  function depthChart(entries){
    const groups=[['QB',entries.slice(0,2)],['RB',entries.slice(2,4)],['WR',entries.slice(4,6)],['SKILL',entries.slice(6,8)],['SPECIAL',entries.slice(8,10)],['BENCH',entries.slice(10)]];
    return groups.map(([label,cards])=>`<section class="tb-depth-group"><label>${label}</label><div>${cards.map(depthCard).join('')}</div></section>`).join('');
  }
  function metricBar(o,projected=false){
    return `<div class="tb-banner-metrics">${projected?`<span><small>PERFECT DRAFT</small><b>${o.score}</b></span>`:''}<span><small>PROJECTED PTS</small><b>${o.points}</b></span><span><small>PLAYOFF</small><b>${o.playoff}%</b></span><span><small>CHAMPIONSHIP</small><b>${o.champ}%</b></span>${projected?'':`<span><small>PICKS UNTIL YOU</small><b>${picksAway()||'—'}</b></span><span><small>ON THE CLOCK</small><b>${esc(currentOwner())}</b></span>`}</div>`;
  }
  function supportCard(item,label){
    const p=item.player,m=metrics(item),availability=label==='Next pick'?`${m.survives}% available`:`${100-m.survives}% pass risk`;
    return `<button class="tb-support-card" data-explore="${encodeURIComponent(p.name)}" title="${esc(p.name)}">${playerPhoto(p.name,'tb-support-photo')}<div class="tb-support-copy"><small>${esc(label)}</small><strong>${esc(p.name)}</strong><span>${esc(p.team||'—')} · ${esc(p.pos)}</span><footer><i>${Math.round(p.proj||0)} pts</i><i>${availability}</i></footer></div><b class="tb-grade">${m.grade}</b></button>`;
  }
  function hero(item){
    const p=item.player,m=metrics(item),gone=100-m.survives;
    return `<article class="tb-hero">
      <header class="tb-hero-head">
        <div class="tb-hero-player">${playerPhoto(p.name,'tb-hero-photo')}<span class="tb-position">${esc(p.pos)}</span></div>
        <div class="tb-hero-identity"><small>PLAYER UNDER CONSIDERATION</small><h2>${esc(p.name)}</h2><p>${esc(p.team||'—')} · ${esc(p.pos)}1</p></div>
        <div class="tb-hero-grade"><b>${m.grade}</b><small>GOOSE</small></div>
      </header>
      <div class="tb-goose-call"><small>GOOSE CALL</small><p>Take ${esc(p.name)} now. Waiting risks the ${esc(p.pos)} tier and shifts your next mission.</p></div>
      <div class="tb-hero-stats">
        <span><small>PROJ</small><b>${Math.round(p.proj||0)}</b></span><span><small>FIT</small><b>${m.fit}</b></span><span><small>SCARCITY</small><b>${m.scarcity}</b></span><span><small>SURVIVES</small><b>${m.survives}%</b></span>
        <span><small>RISK</small><b>${esc(m.risk)}</b></span><span><small>TIER</small><b>${m.tier}</b></span><span><small>CHAMP IMPACT</small><b>+${m.impact}%</b></span><span><small>NEED</small><b>${'★'.repeat(Math.max(1,Math.min(5,Math.round(m.fit/20))))}</b></span>
      </div>
      <div class="tb-decision-compare">
        <section><small>IF YOU TAKE HIM</small><strong>+${m.impact}% championship equity</strong><span>${esc(p.pos)} tier protected · roster fit ${m.fit}</span></section>
        <section><small>IF YOU PASS</small><strong>${gone}% chance he is gone</strong><span>Next-best path drops roughly ${Math.max(2,Math.round((m.scarcity+m.fit)/28))} grade points</span></section>
      </div>
      <div class="tb-hero-actions"><button data-take="${encodeURIComponent(p.name)}">Take Player</button><button class="secondary" data-report="${encodeURIComponent(p.name)}">Open Report</button></div>
    </article>`;
  }
  function render(){
    const mount=document.getElementById('frontOfficeRoot'),all=ranked();if(!mount||!all.length)return false;
    const top=all.find(p=>p.name===selectedName())||all[0],main=itemFor(top),others=all.filter(p=>p.name!==top.name);
    const currentEntries=assignSlots(roster()),perfectEntries=assignSlots(roster(),[top,...others]),currentOdds=odds(currentEntries),perfectOdds=odds(perfectEntries,true);
    const counts=roster().reduce((a,p)=>(a[p.pos]=(a[p.pos]||0)+1,a),{}),targets={QB:2,RB:2,WR:2,TE:1};
    const priority=['QB','RB','WR','TE'].find(pos=>(counts[pos]||0)<targets[pos])||'WR';
    const pivots=others.slice(0,10).map(itemFor),future=[...others.filter(p=>p.pos===priority),...others.filter(p=>p.pos!==priority)].slice(0,10).map(itemFor);
    mount.innerHTML=`<div class="tb-war-room"><div class="tb-command-surface">
      <header class="tb-roster-banner"><div class="tb-banner-head"><div class="tb-franchise"><img src="logo.png" alt="${esc(teamName())}"><div><small>YOUR FRANCHISE</small><h1>${esc(teamName())}</h1><p>Live roster · Mission ${(window.state?.drafted?.length||0)+1}</p></div></div>${metricBar(currentOdds)}</div><div class="tb-depth-line"><div class="tb-depth-title"><small>CURRENT TEAM</small><b>Built as you draft</b></div>${depthChart(currentEntries)}</div></header>
      <div class="tb-live-ribbon"><b>GOOSE LIVE</b><span>${esc(currentOwner())} is selecting</span><span>${100-metrics(main).survives}% chance ${esc(top.name)} is gone by your next pick</span><span>${priority} is the next roster mission</span></div>
      <section class="tb-decision-grid"><aside class="tb-side tb-pivots"><small>WHAT IF YOU PIVOT</small><h3>Pivot Paths</h3><div class="tb-support-grid">${pivots.map(x=>supportCard(x,'Alternate')).join('')}</div></aside><main class="tb-center">${hero(main)}<div class="tb-league-row"><span><small>LEAGUE LIVE</small><b>${esc(currentOwner())}</b></span><span><small>LIKELY POSITION</small><b>${priority}</b></span><button>Inspect Team</button></div></main><aside class="tb-side tb-future"><small>FUTURE BOARD</small><h3>Likely Available</h3><div class="tb-support-grid">${future.map(x=>supportCard(x,'Next pick')).join('')}</div></aside></section>
      <footer class="tb-perfect-banner"><div class="tb-banner-head"><div class="tb-perfect-title"><small>PERFECT DRAFT</small><h2>Best Realistic Finished Roster</h2><p>Pre-draft prediction recalculates after every selection.</p></div>${metricBar(perfectOdds,true)}</div><div class="tb-depth-line"><div class="tb-depth-title"><small>PROJECTED TEAM</small><b>Best realistic path</b></div>${depthChart(perfectEntries)}</div></footer>
    </div></div>`;
    hydratePhotos(mount);bind(mount);return true;
  }
  function bind(root){
    root.querySelectorAll('[data-explore]').forEach(b=>b.onclick=()=>{window.__cleanFrontOfficeSelected=decodeURIComponent(b.dataset.explore);render()});
    root.querySelector('[data-take]')?.addEventListener('click',e=>window.requestDraft?.(decodeURIComponent(e.currentTarget.dataset.take)));
    root.querySelector('[data-report]')?.addEventListener('click',e=>window.openPlayerDetails?.(decodeURIComponent(e.currentTarget.dataset.report)));
  }
  window.CleanFrontOffice={render};
})();