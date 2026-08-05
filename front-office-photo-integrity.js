'use strict';
(function(){
  const VERIFIED={
    'jalen hurts':'6904','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786','trey mcbride':'8151',
    'ashton jeanty':'12526','brock purdy':'7523','jared goff':'5857','matthew stafford':'421','patrick mahomes':'4046',
    'c.j. stroud':'9758','cam ward':'12522','jaxson dart':'12507','jeremiyah love':'12531','jordan love':'6804',
    'daniel jones':'5849','baker mayfield':'4892','garrett wilson':'8146','davante adams':'2133','brandon aubrey':'11628',
    'jaylen waddle':'7561','courtland sutton':'5133'
  };
  const PHOTO_SELECTOR='.tb-photo,.tb-support-photo,.tb-depth-photo,.tb-hero-photo';
  const clean=n=>String(n||'').replace(/…/g,'').trim().toLowerCase();
  const initials=n=>String(n||'').trim().split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();

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
  function secure(node){
    const name=cardName(node);
    const verifiedId=VERIFIED[clean(name)];
    let img=node.querySelector('img');

    if(verifiedId){
      if(!img){img=document.createElement('img');node.prepend(img)}
      const verifiedSrc=`https://sleepercdn.com/content/nfl/players/${verifiedId}.jpg`;
      if(!img.src.includes(`/players/${verifiedId}.jpg`))img.src=verifiedSrc;
      wireFallback(node,img,name);
      return;
    }

    /* Never display a questionable portrait. Unverified players use a deliberate,
       readable initials avatar until a stable player-id mapping is added. */
    fallback(node,name);
  }
  function apply(root=document){root.querySelectorAll?.(`#frontOfficeRoot ${PHOTO_SELECTOR}`).forEach(secure)}
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  const observer=new MutationObserver(queue);
  function boot(){
    const root=document.getElementById('frontOfficeRoot');
    if(!root)return;
    apply(root);
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','alt','data-photo-name']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();