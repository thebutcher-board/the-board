'use strict';
(function(){
  const VERSION='live-draft-engine-2.0.0';
  let syncing=false;
  let syncTimer=0;
  const bridge=()=>window.BoardStateBridge;
  const state=()=>bridge()?.getState?.()||window.state||{};
  const drafted=()=>Array.isArray(state().drafted)?state().drafted:[];
  const teams=()=>Array.isArray(state().teams)&&state().teams.length?state().teams:[];
  const teamName=()=>state().profile?.teamName||'The Butcher';
  const ownerAt=index=>bridge()?.draftOrderAt?.(index)||teams()[index%Math.max(1,teams().length)]||'League';
  const pickLabel=index=>{const count=Math.max(1,teams().length||10);return `${Math.floor(index/count)+1}.${String((index%count)+1).padStart(2,'0')}`};
  function snapshot(){const index=drafted().length;return Object.freeze({version:VERSION,picksMade:index,pick:index+1,pickLabel:pickLabel(index),onTheClock:ownerAt(index),myTeam:teamName(),lastPick:drafted()[index-1]||null,canUndo:index>0})}
  function emit(reason,detail={}){const value=snapshot();window.dispatchEvent(new CustomEvent('theboard:draftchange',{detail:{reason,state:value,...detail}}));return value}
  function renderCurrent(){
    if(syncing)return;
    syncing=true;
    requestAnimationFrame(()=>{
      try{
        if(location.hash==='#board'||document.getElementById('board')?.classList.contains('active'))window.IntegratedBoardV2?.render?.();
        else{window.CleanFrontOffice?.render?.();requestAnimationFrame(()=>window.BoardCockpitV52?.apply?.())}
      }finally{requestAnimationFrame(()=>{syncing=false;mountControls();updateControls()})}
    });
  }
  function synchronize(reason,before){
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>{
      const after=drafted().length;
      bridge()?.persist?.();
      if(before!==undefined&&after===before){mountControls();updateControls();return}
      emit(reason,{before,after});
      renderCurrent();
    },40);
  }
  function undo(){const before=drafted().length;if(!before)return false;const changed=bridge()?.undo?.()??false;if(changed){emit('undo',{before,after:drafted().length});renderCurrent()}return changed}
  function reset(){const before=drafted().length;bridge()?.reset?.();emit('reset',{before,after:0});renderCurrent();return true}
  function mountHeaderControls(){
    const header=document.querySelector('.tbv52-header');if(!header)return;
    header.querySelectorAll(':scope > .tb-engine-undo').forEach(node=>node.remove());
    let actions=header.querySelector('.tb-engine-actions');
    if(!actions){actions=document.createElement('div');actions.className='tb-engine-actions';header.appendChild(actions)}
    let undoButton=actions.querySelector('.tb-engine-undo');
    if(!undoButton){undoButton=document.createElement('button');undoButton.type='button';undoButton.className='tb-engine-undo';undoButton.innerHTML='<span aria-hidden="true">↶</span><b>Undo</b>';undoButton.addEventListener('click',undo);actions.appendChild(undoButton)}
    const settings=header.querySelector('.tbv52-settings');if(settings&&settings.parentElement!==actions)actions.appendChild(settings);
  }
  function mountBoardControls(){
    const top=document.querySelector('#board .tb-board-top');if(!top)return;
    top.querySelectorAll('.tb-engine-board-undo').forEach((node,index)=>{if(index)node.remove()});
    let button=top.querySelector('.tb-engine-board-undo');
    if(!button){button=document.createElement('button');button.type='button';button.className='tb-engine-board-undo';button.textContent='Undo Last Pick';button.addEventListener('click',undo);top.querySelector('aside')?.prepend(button)}
  }
  function mountControls(){mountHeaderControls();mountBoardControls()}
  function updateControls(){const value=snapshot();document.querySelectorAll('.tb-engine-undo,.tb-engine-board-undo').forEach(button=>{button.disabled=!value.canUndo;button.title=value.canUndo?`Undo ${value.lastPick?.name||'last pick'}`:'No picks to undo'})}
  function bind(){
    document.addEventListener('click',event=>{
      const before=drafted().length;
      if(event.target.closest('#confirmDraft'))synchronize('draft',before);
      else if(event.target.closest('#resetBtn'))synchronize('reset',before);
      else if(event.target.closest('#undoBtn,#quickUndoBtn'))synchronize('undo',before);
    },true);
    window.addEventListener('hashchange',()=>setTimeout(()=>{mountControls();updateControls();if(location.hash==='#board')window.IntegratedBoardV2?.render?.()},25));
    window.addEventListener('theboard:draftchange',()=>{mountControls();updateControls()});
  }
  function boot(){bind();mountControls();updateControls();window.BoardDraftEngine=Object.freeze({version:VERSION,snapshot,undo,reset,refresh:renderCurrent,sync:synchronize});emit('ready')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
