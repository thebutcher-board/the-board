'use strict';
(function(){
  const STORAGE_KEY='the-board-fast-runtime';
  function expose(){
    try{
      Object.defineProperty(window,'state',{configurable:true,get:()=>state,set:value=>{state=value}});
    }catch{window.state=state}
    const persist=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch{return false}};
    const goTo=view=>{
      const target=view||'warroom';
      try{showView(target)}catch{document.querySelector(`.tabs .tab[data-view="${target}"]`)?.click()}
      const hash=target==='warroom'?'#warroom':`#${target}`;
      if(location.hash!==hash)history.replaceState(null,'',hash);
      return target;
    };
    const undoPick=()=>{const before=state.drafted.length;try{undo()}catch{state.drafted.pop();try{renderActive()}catch{}}persist();return state.drafted.length<before};
    const resetDraft=()=>{state.drafted=[];pendingPlayerName=null;persist();try{saveSoon();renderActive()}catch{}return true};
    window.BoardStateBridge=Object.freeze({
      getState:()=>state,
      getDrafted:()=>state.drafted,
      persist,
      goTo,
      undo:undoPick,
      reset:resetDraft,
      currentTeam:()=>{try{return currentTeam()}catch{return''}},
      draftOrderAt:index=>{try{return draftOrderAt(index)}catch{return''}},
      playerByName:name=>{try{return playerByName(name)}catch{return null}},
      ranked:()=>{try{return ranked()}catch{return[]}},
      rosterFor:team=>{try{return rosterFor(team)}catch{return[]}},
      render:()=>{try{renderActive();return true}catch{return false}}
    });
    window.dispatchEvent(new CustomEvent('theboard:statebridge-ready'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',expose,{once:true});else expose();
})();
