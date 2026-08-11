'use strict';
(function(){
  function expose(){
    const core=window.BoardCore;if(!core)return;
    try{state=core.state}catch{}
    try{Object.defineProperty(window,'state',{configurable:true,get:()=>core.state,set:value=>{if(value?.profile)core.services.league.update({profile:value.profile,teams:value.teams,slot:value.slot});if(Array.isArray(value?.drafted)&&value.drafted.length===0)core.services.draft.reset()}})}catch{window.state=core.state}
    const goTo=view=>{
      const target=view||'warroom';core.services.navigation.go(target);
      try{showView(target)}catch{document.querySelector(`.tabs .tab[data-view="${target}"]`)?.click()}
      const hash=target==='warroom'?'#warroom':`#${target}`;if(location.hash!==hash)history.replaceState(null,'',hash);return target;
    };
    window.BoardStateBridge=Object.freeze({
      getState:()=>core.state,
      getCanonicalState:()=>core.getCanonicalState(),
      getDrafted:()=>core.services.draft.getPicks(),
      persist:()=>core.persist('bridge'),
      goTo,
      undo:()=>core.services.draft.undo().ok,
      reset:()=>core.services.draft.reset().ok,
      currentTeam:()=>core.services.draft.currentTeam(),
      draftOrderAt:index=>core.services.draft.draftOrderAt(index),
      playerByName:name=>core.services.players.byName(name),
      playerById:id=>core.services.players.byId(id),
      ranked:()=>{try{return ranked()}catch{return[]}},
      rosterFor:team=>core.services.league.rosterFor(team),
      render:()=>{try{renderActive();return true}catch{return false}}
    });
    window.dispatchEvent(new CustomEvent('theboard:statebridge-ready',{detail:{core:core.version}}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',expose,{once:true});else expose();
})();
