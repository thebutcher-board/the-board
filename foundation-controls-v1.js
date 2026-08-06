'use strict';
(function(){
  const STORAGE_KEY='the-board-fast-runtime';
  const VERSION='foundation-controls-1.0.0';

  function readRuntime(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}
  }

  function writeRuntime(value){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));return true}catch{return false}
  }

  function closeSettings(){
    const modal=document.getElementById('settingsModal');
    if(modal)modal.hidden=true;
    document.body.classList.remove('modal-open');
  }

  function resetDraft(){
    if(!window.confirm('Reset every drafted player and return to Pick 1.01?'))return;
    const current=readRuntime()||{};
    current.drafted=[];
    if(!Array.isArray(current.teams)&&Array.isArray(window.BASE_TEAMS))current.teams=[...window.BASE_TEAMS];
    if(!writeRuntime(current)){
      window.alert('THE BOARD could not reset the draft because browser storage is unavailable.');
      return;
    }
    closeSettings();
    window.location.reload();
  }

  function goToDraft(){
    const draftTab=document.querySelector('.tabs .tab[data-view="warroom"]');
    if(draftTab){draftTab.click();return}
    window.location.hash='';
    window.location.reload();
  }

  function ensureBackButtons(){
    ['board','database','league','history'].forEach(id=>{
      const view=document.getElementById(id);
      if(!view||view.querySelector('.tb-app-back'))return;
      const button=document.createElement('button');
      button.type='button';
      button.className='tb-app-back';
      button.setAttribute('aria-label','Back to Draft');
      button.innerHTML='<span aria-hidden="true">←</span><b>Back to Draft</b>';
      button.addEventListener('click',goToDraft);
      view.prepend(button);
    });
  }

  function bindReset(){
    const button=document.getElementById('resetBtn');
    if(!button||button.dataset.foundationReset===VERSION)return;
    button.dataset.foundationReset=VERSION;
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      resetDraft();
    },true);
  }

  function bindTopNavigation(){
    document.addEventListener('click',event=>{
      const cockpitTab=event.target.closest('[data-v52-view]');
      if(!cockpitTab)return;
      const target=cockpitTab.dataset.v52View;
      if(target&&target!=='warroom')history.pushState({view:target},'',`#${target}`);
    },true);
    window.addEventListener('popstate',goToDraft);
  }

  function boot(){
    bindReset();
    ensureBackButtons();
    bindTopNavigation();
    const observer=new MutationObserver(()=>{bindReset();ensureBackButtons()});
    observer.observe(document.body,{childList:true,subtree:true});
    window.__TB_FOUNDATION_CONTROLS__={version:VERSION,resetDraft,goToDraft};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
