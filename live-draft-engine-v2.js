'use strict';
(function(){
  const VERSION='live-draft-engine-3.0.0';
  let renderQueued=false;
  const core=()=>window.BoardCore;
  const bridge=()=>window.BoardStateBridge;
  const picks=()=>core()?.services?.draft?.getPicks?.()||[];
  const teams=()=>core()?.services?.league?.get?.().teams||[];
  const ownerAt=index=>core()?.services?.draft?.draftOrderAt?.(index)||'League';
  const pickLabel=index=>{const count=Math.max(1,teams().length||10);return `${Math.floor(index/count)+1}.${String((index%count)+1).padStart(2,'0')}`};
  function snapshot(){const list=picks(),index=list.length;return Object.freeze({version:VERSION,picksMade:index,pick:index+1,pickLabel:pickLabel(index),onTheClock:ownerAt(index),myTeam:core()?.services?.league?.get?.().profile?.teamName||'The Butcher',lastPick:list[index-1]||null,canUndo:index>0})}
  function emit(reason){const value=snapshot();window.dispatchEvent(new CustomEvent('theboard:draftchange',{detail:{reason,state:value}}));return value}
  function renderCurrent(){
    if(renderQueued)return;renderQueued=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      try{if(location.hash==='#board'||document.getElementById('board')?.classList.contains('active'))window.IntegratedBoardV2?.render?.();else{window.CleanFrontOffice?.render?.();requestAnimationFrame(()=>window.BoardCockpitV52?.apply?.())}}finally{renderQueued=false;mountControls();updateControls()}
    }));
  }
  function undo(){const result=core()?.services?.draft?.undo?.();if(result?.ok){emit('undo');renderCurrent();return true}return false}
  function reset(){const result=core()?.services?.draft?.reset?.();if(result?.ok){emit('reset');renderCurrent();return true}return false}
  function mountHeaderControls(){
    const header=document.querySelector('.tbv52-header');if(!header)return;
    let actions=header.querySelector('.tb-engine-actions');if(!actions){actions=document.createElement('div');actions.className='tb-engine-actions';header.appendChild(actions)}
    let undoButton=actions.querySelector('.tb-engine-undo');if(!undoButton){undoButton=document.createElement('button');undoButton.type='button';undoButton.className='tb-engine-undo';undoButton.innerHTML='<span aria-hidden="true">↶</span><b>Undo</b>';undoButton.addEventListener('click',undo);actions.prepend(undoButton)}
    const settings=header.querySelector('.tbv52-settings');if(settings&&settings.parentElement!==actions)actions.appendChild(settings);
  }
  function mountBoardControls(){
    const top=document.querySelector('#board .tb-board-top');if(!top)return;
    let button=top.querySelector('.tb-engine-board-undo');if(!button){button=document.createElement('button');button.type='button';button.className='tb-engine-board-undo';button.textContent='Undo Last Pick';button.addEventListener('click',undo);top.querySelector('aside')?.prepend(button)}
  }
  function mountControls(){mountHeaderControls();mountBoardControls()}
  function updateControls(){const value=snapshot();document.querySelectorAll('.tb-engine-undo,.tb-engine-board-undo').forEach(button=>{button.disabled=!value.canUndo;button.title=value.canUndo?`Undo ${value.lastPick?.name||'last pick'}`:'No picks to undo'})}
  function bind(){
    window.addEventListener('theboard:statechange',event=>{const reason=event.detail?.reason||'state';if(['draft','undo','reset','league'].includes(reason)){emit(reason);renderCurrent()}else updateControls()});
    window.addEventListener('hashchange',()=>setTimeout(()=>{mountControls();updateControls();if(location.hash==='#board')window.IntegratedBoardV2?.render?.()},25));
  }
  function boot(){if(!core())return;bind();mountControls();updateControls();window.BoardDraftEngine=Object.freeze({version:VERSION,snapshot,undo,reset,refresh:renderCurrent});emit('ready')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
