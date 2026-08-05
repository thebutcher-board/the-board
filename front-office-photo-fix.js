'use strict';
(function(){
  const IDS={
    'jalen hurts':'6904','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786','trey mcbride':'8151','ashton jeanty':'12526',
    'brock purdy':'7523','jared goff':'5857','matthew stafford':'421','jaxson dart':'12507','patrick mahomesq':'4046','patrick mahomes':'4046',
    'c.j. stroud':'9758','cam ward':'12522','jordan love':'6804','daniel jones':'5849','baker mayfield':'4892','garrett wilson':'8146',
    'davante adams':'2133','brandon aubrey':'11628','jeremiyah love':'12531','jaylen waddle':'7561','courtland sutton':'5133'
  };
  const clean=s=>String(s||'').replace(/…/g,'').trim().toLowerCase();
  function replaceFallback(node,name){
    const id=IDS[clean(name)];
    if(!id||!node||node.querySelector('img'))return;
    const img=document.createElement('img');
    img.src=`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
    img.alt=name;
    img.loading='eager';
    img.onerror=()=>img.remove();
    node.textContent='';
    node.appendChild(img);
    node.classList.remove('photo-fallback','failed');
    node.classList.add('photo-wrap');
  }
  function hydrate(){
    const root=document.getElementById('phaseOneMount');if(!root)return;
    root.querySelectorAll('.depth-card').forEach(card=>replaceFallback(card.querySelector('.depth-photo'),card.querySelector('b')?.textContent));
    root.querySelectorAll('.support-card').forEach(card=>replaceFallback(card.querySelector('.support-photo'),decodeURIComponent(card.dataset.explore||'')));
    const heroName=root.querySelector('.hero-info h2')?.textContent;
    replaceFallback(root.querySelector('.hero-img'),heroName);
  }
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;hydrate()})}
  function boot(){hydrate();const root=document.getElementById('phaseOneMount');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});[200,600,1200,2500].forEach(t=>setTimeout(hydrate,t))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();