'use strict';
(function(){
  const IDS={
    'jalen hurts':'6904','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786','trey mcbride':'8151','ashton jeanty':'12526',
    'brock purdy':'7523','jared goff':'5857','matthew stafford':'421','jaxson dart':'12507','patrick mahomesq':'4046','patrick mahomes':'4046',
    'c.j. stroud':'9758','cam ward':'12522','jordan love':'6804','daniel jones':'5849','baker mayfield':'4892','garrett wilson':'8146',
    'davante adams':'2133','brandon aubrey':'11628','jeremiyah love':'12531','jaylen waddle':'7561','courtland sutton':'5133'
  };
  const clean=s=>String(s||'').replace(/…/g,'').trim().toLowerCase();
  const initials=name=>String(name||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  const sources=id=>[
    `https://sleepercdn.com/content/nfl/players/${id}.jpg`,
    `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`
  ];
  function installPhoto(node,name){
    if(!node)return;
    const id=IDS[clean(name)];
    node.classList.add('photo-wrap');
    node.classList.remove('failed','photo-fallback');
    node.replaceChildren();
    const fallback=document.createElement('b');
    fallback.textContent=initials(name);
    node.appendChild(fallback);
    if(!id){node.classList.add('failed');return;}
    const img=document.createElement('img');
    img.alt=name||'Player';
    img.loading='eager';
    img.decoding='async';
    let index=0;
    const tryNext=()=>{
      if(index>=sources(id).length){img.remove();node.classList.add('failed');return;}
      img.src=sources(id)[index++];
    };
    img.addEventListener('load',()=>node.classList.remove('failed'));
    img.addEventListener('error',tryNext);
    node.prepend(img);
    tryNext();
  }
  function hydrate(){
    const root=document.getElementById('phaseOneMount');if(!root)return;
    root.querySelectorAll('.depth-card').forEach(card=>installPhoto(card.querySelector('.depth-photo'),card.querySelector('b')?.textContent));
    root.querySelectorAll('.support-card').forEach(card=>installPhoto(card.querySelector('.support-photo'),decodeURIComponent(card.dataset.explore||'')));
    const heroName=root.querySelector('.hero-info h2')?.textContent;
    installPhoto(root.querySelector('.hero-img'),heroName);
  }
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;hydrate()})}
  function boot(){
    hydrate();
    const root=document.getElementById('phaseOneMount');
    if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    [150,500,1000,2000,4000].forEach(t=>setTimeout(hydrate,t));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();