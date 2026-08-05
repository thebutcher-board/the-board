'use strict';
(function(){
  const VERIFIED={
    'jalen hurts':'6904','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786','trey mcbride':'8151',
    'brock purdy':'7523','jared goff':'5857','matthew stafford':'421','patrick mahomes':'4046','c.j. stroud':'9758',
    'jordan love':'6804','daniel jones':'5849','baker mayfield':'4892','garrett wilson':'8146','davante adams':'2133',
    'brandon aubrey':'11628','jaylen waddle':'7561','courtland sutton':'5133'
  };
  const clean=n=>String(n||'').replace(/…/g,'').trim().toLowerCase();
  const initials=n=>String(n||'').trim().split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();

  function fallback(node,name){
    const img=node.querySelector('img');if(img)img.remove();
    node.classList.add('is-fallback');
    let b=node.querySelector('b');if(!b){b=document.createElement('b');node.appendChild(b)}
    b.textContent=initials(name);b.style.display='grid';
  }
  function secure(node){
    const name=node.dataset.photoName||node.querySelector('img')?.alt||'';
    const id=VERIFIED[clean(name)];
    if(!id){fallback(node,name);return}
    node.classList.remove('is-fallback');
    let img=node.querySelector('img');
    if(!img){img=document.createElement('img');img.alt=name;node.prepend(img)}
    img.loading='eager';img.decoding='async';img.src=`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
    img.onerror=()=>fallback(node,name);
    const b=node.querySelector('b');if(b)b.style.display='none';
  }
  function apply(root=document){root.querySelectorAll?.('#frontOfficeRoot .tb-photo').forEach(secure)}
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  const observer=new MutationObserver(queue);
  function boot(){const root=document.getElementById('frontOfficeRoot');if(!root)return;apply(root);observer.observe(root,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();