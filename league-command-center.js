'use strict';
(function(){
  const BOOT_VERSION='phase1-single-app-14.2';
  let observer=null;
  let renderTimer=null;

  function loadScript(src,key){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-phase-one-key="${key}"]`);
      if(existing){
        if(existing.dataset.loaded==='true')resolve();
        else existing.addEventListener('load',resolve,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.dataset.phaseOneKey=key;
      script.addEventListener('load',()=>{script.dataset.loaded='true';resolve();},{once:true});
      script.addEventListener('error',reject,{once:true});
      document.body.appendChild(script);
    });
  }

  function mount(){
    const war=document.getElementById('warroom');
    if(!war)return null;
    let root=document.getElementById('phaseOneMount');
    if(!root){
      war.replaceChildren();
      war.className='view active';
      root=document.createElement('div');
      root.id='phaseOneMount';
      root.dataset.frontOfficeOwner='phase-one';
      war.appendChild(root);
    }
    [...war.children].forEach(node=>{if(node!==root)node.remove()});
    return root;
  }

  function render(){
    mount();
    const ok=window.PhaseOneWarRoom?.render?.();
    if(!ok){
      clearTimeout(renderTimer);
      renderTimer=setTimeout(render,120);
    }
  }

  async function boot(){
    if(window.__THE_BOARD_FRONT_OFFICE_BOOT__===BOOT_VERSION)return;
    window.__THE_BOARD_FRONT_OFFICE_BOOT__=BOOT_VERSION;

    document.querySelectorAll(
      'script[src*="front-office-v8"],script[src*="front-office-v9"],'+
      'script[src*="front-office-v10"],script[src*="front-office-v11"],'+
      'script[src*="front-office-v12"],script[src*="war-room-phase1-lock"]'
    ).forEach(script=>script.remove());

    mount();
    await loadScript('front-office-phase1.js?v=14.2.0','front-office-phase1');
    await loadScript('front-office-depth-charts.js?v=14.2.0','front-office-depth-charts');
    await loadScript('front-office-visual-stabilizer.js?v=14.2.0','front-office-visual-stabilizer');

    window.renderWarroom=render;
    render();

    const war=document.getElementById('warroom');
    observer?.disconnect();
    observer=new MutationObserver(()=>{
      const root=document.getElementById('phaseOneMount');
      if(!root||war.children.length!==1||war.firstElementChild!==root){
        mount();
        render();
      }
    });
    if(war)observer.observe(war,{childList:true});

    [250,750,1500,3000,5000,7500,10000,15000].forEach(delay=>setTimeout(render,delay));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();