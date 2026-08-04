'use strict';
(function(){
  const PHOTO_IDS={
    'jalen hurts':'4881','brock purdy':'7526','jared goff':'3163','matthew stafford':'1535',
    'patrick mahomes':'4046','c.j. stroud':'9758','jordan love':'6804','baker mayfield':'4892',
    'daniel jones':'6768','drake maye':'11560','jahmyr gibbs':'9221','ceedee lamb':'6786',
    'trey mcbride':'8130','garrett wilson':'8146','brandon aubrey':'10222','ashton jeanty':'12527'
  };
  const normalize=name=>String(name||'').toLowerCase().replace(/[^a-z0-9. ]/g,'').replace(/\s+/g,' ').trim();
  const initials=name=>String(name||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase();
  function src(name){
    const resolved=window.PhaseOnePhotoResolver?.(name);
    if(resolved)return resolved;
    const id=PHOTO_IDS[normalize(name)];
    return id?`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`:'';
  }
  function imageMarkup(name,existingBadge=''){
    const url=src(name),fallback=initials(name);
    if(!url)return`<b>${fallback}</b>${existingBadge}`;
    return`<img src="${url}" alt="${name.replace(/"/g,'&quot;')}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><b class="vs-fallback">${fallback}</b>${existingBadge}`;
  }
  function patchCard(card){
    const name=card.querySelector('.p1-card-copy strong')?.textContent?.trim();
    const photo=card.querySelector('.p1-card-photo');
    if(!name||!photo||photo.dataset.photoPatched===name)return;
    const badge=photo.querySelector('em')?.outerHTML||'';
    photo.innerHTML=imageMarkup(name,badge);photo.dataset.photoPatched=name;
  }
  function patchHero(root){
    const name=root.querySelector('.p1-hero-head h2')?.textContent?.trim();
    const photo=root.querySelector('.p1-hero-photo');
    if(!name||!photo||photo.dataset.photoPatched===name)return;
    const badge=photo.querySelector('em')?.outerHTML||'';
    photo.innerHTML=imageMarkup(name,badge);photo.dataset.photoPatched=name;
  }
  function patch(){
    const root=document.getElementById('phaseOneMount');if(!root)return;
    root.querySelectorAll('.p1-card').forEach(patchCard);patchHero(root);
  }
  function styles(){
    let s=document.getElementById('phaseOneVisualStabilizerStyles');
    if(!s){s=document.createElement('style');s.id='phaseOneVisualStabilizerStyles';document.head.appendChild(s)}
    s.textContent=`
      #phaseOneMount,.p1-shell{width:100%;min-width:0;box-sizing:border-box}.p1-shell{overflow:hidden}.p1-table{grid-template-columns:minmax(260px,.9fr) minmax(520px,1.35fr) minmax(260px,.9fr)!important;gap:16px!important;align-items:start!important}.p1-table>aside,.p1-table>main{min-width:0}.p1-stack{grid-template-columns:repeat(2,minmax(0,1fr))!important}.p1-card{width:100%;min-width:0;box-sizing:border-box}.p1-card-copy,.p1-card-metrics{min-width:0}.p1-hero{width:100%;box-sizing:border-box}.p1-league{width:100%;box-sizing:border-box}.p1-perfect{width:100%;box-sizing:border-box}.p1-hero-photo img,.p1-card-photo img{display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom}.p1-hero-photo .vs-fallback,.p1-card-photo .vs-fallback{display:none;height:100%;place-items:center}.p1-live{width:100%;box-sizing:border-box}.p1-table h3{line-height:1.1}.p1-card:hover{transform:none!important;animation:none!important}
      @media(max-width:1250px){.p1-table{grid-template-columns:minmax(235px,.8fr) minmax(500px,1.4fr) minmax(235px,.8fr)!important;gap:10px!important}.p1-card{min-height:70px!important}.p1-hero{grid-template-columns:210px 1fr!important;gap:13px!important}}
    `;
  }
  function boot(){styles();patch();const root=document.getElementById('phaseOneMount');if(!root)return;new MutationObserver(()=>requestAnimationFrame(patch)).observe(root,{childList:true,subtree:true});[250,800,1800,3500].forEach(t=>setTimeout(patch,t));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();