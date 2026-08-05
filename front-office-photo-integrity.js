'use strict';
(function(){
  const VERIFIED={
    'jalen hurts':'6904','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786','trey mcbride':'8151',
    'ashton jeanty':'12526','brock purdy':'7523','jared goff':'5857','matthew stafford':'421','patrick mahomes':'4046',
    'c.j. stroud':'9758','cam ward':'12522','jaxson dart':'12507','jeremiyah love':'12531','jordan love':'6804',
    'daniel jones':'5849','baker mayfield':'4892','garrett wilson':'8146','davante adams':'2133','brandon aubrey':'11533',
    'marvin harrison':'11628','marvin harrison jr':'11628','jaylen waddle':'7561','courtland sutton':'5133'
  };
  const PHOTO_SELECTOR='.tb-photo,.tb-support-photo,.tb-depth-photo,.tb-hero-photo';
  const PLAYER_CACHE_KEY='tb-sleeper-player-photo-map-v2';
  const PLAYER_CACHE_TTL=24*60*60*1000;
  const clean=n=>String(n||'')
    .replace(/…/g,'')
    .replace(/[.'’\-]/g,' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b/gi,'')
    .replace(/[^a-z0-9 ]/gi,' ')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase();
  const initials=n=>String(n||'').trim().split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  let dynamicMap=null;
  let playerMapPromise=null;

  function cardName(node){
    const explicit=node.dataset.photoName||node.querySelector('img')?.alt;
    if(explicit)return String(explicit).trim();
    const card=node.closest('.tb-support-card,.tb-depth-card,.tb-hero,.tb-hero-player');
    const label=card?.querySelector('.tb-support-copy strong,.tb-support-copy b,.tb-player-name,h1,h2,h3');
    return String(label?.textContent||'').trim();
  }
  function fallback(node,name){
    const img=node.querySelector('img');
    if(img)img.remove();
    node.classList.add('is-fallback');
    let b=node.querySelector('b');
    if(!b){b=document.createElement('b');node.appendChild(b)}
    b.textContent=initials(name)||'—';
    b.style.display='grid';
  }
  function wireFallback(node,img,name){
    img.loading='eager';
    img.decoding='async';
    img.alt=name;
    img.onerror=()=>fallback(node,name);
    img.onload=()=>{
      node.classList.remove('is-fallback');
      const b=node.querySelector('b');
      if(b)b.style.display='none';
    };
  }
  function renderId(node,name,playerId){
    let img=node.querySelector('img');
    if(!img){img=document.createElement('img');node.prepend(img)}
    const src=`https://sleepercdn.com/content/nfl/players/${playerId}.jpg`;
    if(!img.src.includes(`/players/${playerId}.jpg`))img.src=src;
    wireFallback(node,img,name);
  }
  function readCache(){
    try{
      const cached=JSON.parse(localStorage.getItem(PLAYER_CACHE_KEY)||'null');
      if(cached&&Date.now()-cached.savedAt<PLAYER_CACHE_TTL&&cached.players)return cached.players;
    }catch(_){ }
    return null;
  }
  function buildMap(players){
    const map={};
    Object.entries(players||{}).forEach(([id,p])=>{
      const names=[p.full_name,`${p.first_name||''} ${p.last_name||''}`,p.search_full_name];
      names.forEach(name=>{const key=clean(name);if(key)map[key]=String(p.player_id||id)});
    });
    return map;
  }
  function loadPlayerMap(){
    if(dynamicMap)return Promise.resolve(dynamicMap);
    if(playerMapPromise)return playerMapPromise;
    const cached=readCache();
    if(cached){dynamicMap=cached;return Promise.resolve(dynamicMap)}
    playerMapPromise=fetch('https://api.sleeper.app/v1/players/nfl?active=true')
      .then(r=>{if(!r.ok)throw new Error(`Sleeper players ${r.status}`);return r.json()})
      .then(players=>{
        dynamicMap=buildMap(players);
        try{localStorage.setItem(PLAYER_CACHE_KEY,JSON.stringify({savedAt:Date.now(),players:dynamicMap}))}catch(_){ }
        return dynamicMap;
      })
      .catch(()=>({}));
    return playerMapPromise;
  }
  function secure(node){
    const name=cardName(node);
    const key=clean(name);
    const verifiedId=VERIFIED[key];
    if(verifiedId){renderId(node,name,verifiedId);return}

    const existing=node.querySelector('img');
    if(existing&&existing.src&&!existing.src.startsWith('data:'))wireFallback(node,existing,name);
    else fallback(node,name);

    loadPlayerMap().then(map=>{
      if(!node.isConnected)return;
      const resolved=map[key];
      if(resolved)renderId(node,name,resolved);
    });
  }
  function apply(root=document){root.querySelectorAll?.(`#frontOfficeRoot ${PHOTO_SELECTOR}`).forEach(secure)}
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  const observer=new MutationObserver(queue);
  function boot(){
    const root=document.getElementById('frontOfficeRoot');
    if(!root)return;
    apply(root);
    loadPlayerMap().then(()=>apply(root));
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','alt','data-photo-name']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();