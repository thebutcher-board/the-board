'use strict';
(function(){
  const VERSION='live-draft-engine-1.0.0';
  const STORAGE_KEY='the-board-fast-runtime';
  let syncing=false;

  const drafted=()=>Array.isArray(window.state?.drafted)?window.state.drafted:[];
  const teams=()=>Array.isArray(window.state?.teams)&&window.state.teams.length?window.state.teams:[];
  const teamName=()=>window.state?.profile?.teamName||'The Butcher';
  const ownerAt=index=>{try{return window.draftOrderAt?.(index)||teams()[index%Math.max(1,teams().length)]||'League'}catch{return'League'}};
  const currentPick=()=>drafted().length+1;
  const pickLabel=index=>{const count=Math.max(1,teams().length||10);return `${Math.floor(index/count)+1}.${String((index%count)+1).padStart(2,'0')}`};

  function snapshot(){
    const index=drafted().length;
    const last=drafted()[index-1]||null;
    return Object.freeze({
      version:VERSION,
      picksMade:index,
      pick:currentPick(),
      pickLabel:pickLabel(index),
      onTheClock:ownerAt(index),
      myTeam:teamName(),
      lastPick:last,
      canUndo:index>0,
      complete:index>=Math.max(1,teams().length||10)*Math.max(1,Number(window.state?.profile?.rosterSize||16))
    });
  }

  function persist(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(window.state));return true}catch{return false}
  }

  function emit(reason,detail={}){
    const state=snapshot();
    window.dispatchEvent(new CustomEvent('theboard:draftchange',{detail:{reason,state,...detail}}));
    return state;
  }

  function renderCurrentView(){
    if(syncing)return;
    syncing=true;
    requestAnimationFrame(()=>{
      try{
        if(location.hash==='#board'||document.getElementById('board')?.classList.contains('active')){
          window.IntegratedBoardV1?.render?.();
        }else{
          window.CleanFrontOffice?.render?.();
          requestAnimationFrame(()=>window.BoardCockpitV52?.apply?.());
        }
      }finally{
        requestAnimationFrame(()=>{syncing=false;mountControls();updateControls()});
      }
    });
  }

  function afterMutation(reason,before){
    window.setTimeout(()=>{
      const after=drafted().length;
      if(after===before)return;
      persist();
      emit(reason,{before,after});
      renderCurrentView();
    },120);
  }

  function undo(){
    const before=drafted().length;
    if(!before)return false;
    if(typeof window.undo==='function')window.undo();
    else drafted().pop();
    persist();
    emit('undo',{before,after:drafted().length});
    renderCurrentView();
    return true;
  }

  function reset(){
    window.__TB_FOUNDATION_CONTROLS__?.resetDraft?.();
  }

  function request(name){
    const player=window.playerByName?.(name);
    if(!player)return false;
    window.requestDraft?.(player.name);
    return true;
  }

  function mountControls(){
    const header=document.querySelector('.tbv52-header');
    if(header&&!header.querySelector('.tb-engine-undo')){
      const settings=header.querySelector('.tbv52-settings');
      const button=document.createElement('button');
      button.type='button';
      button.className='tb-engine-undo';
      button.setAttribute('aria-label','Undo last draft pick');
      button.innerHTML='<span aria-hidden="true">↶</span><b>Undo</b>';
      button.addEventListener('click',undo);
      header.insertBefore(button,settings||null);
    }
    const boardTop=document.querySelector('#board .tb-board-top');
    if(boardTop&&!boardTop.querySelector('.tb-engine-board-undo')){
      const button=document.createElement('button');
      button.type='button';
      button.className='tb-engine-board-undo';
      button.textContent='Undo Last Pick';
      button.addEventListener('click',undo);
      boardTop.querySelector('aside')?.prepend(button);
    }
  }

  function updateControls(){
    const state=snapshot();
    document.querySelectorAll('.tb-engine-undo,.tb-engine-board-undo').forEach(button=>{
      button.disabled=!state.canUndo;
      button.title=state.canUndo?`Undo ${state.lastPick?.name||'last pick'}`:'No picks to undo';
    });
  }

  function bind(){
    document.addEventListener('click',event=>{
      if(event.target.closest('.tb-engine-undo,.tb-engine-board-undo'))return;
      if(event.target.closest('#confirmDraft'))afterMutation('draft',drafted().length);
      if(event.target.closest('#undoBtn,#quickUndoBtn'))afterMutation('undo',drafted().length);
    });
    window.addEventListener('theboard:draftchange',updateControls);
    window.addEventListener('hashchange',()=>setTimeout(()=>{mountControls();updateControls()},40));
  }

  function boot(){
    bind();
    mountControls();
    updateControls();
    window.BoardDraftEngine=Object.freeze({version:VERSION,snapshot,request,undo,reset,refresh:renderCurrentView});
    emit('ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();