'use strict';
(function(global){
  const core=global.BoardCore;
  if(!core)return;

  const history=[];
  let previousPickCount=core.getCanonicalState().draft.picks.length;

  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const result=(ok,checks,errors,reason)=>Object.freeze({
    ok,
    reason,
    checkedAt:Date.now(),
    coreVersion:core.version,
    pickCount:core.getCanonicalState().draft.picks.length,
    checks:Object.freeze(checks),
    errors:Object.freeze(errors)
  });

  function verify(reason='manual'){
    const canonical=core.getCanonicalState();
    const picks=canonical.draft?.picks||[];
    const players=core.services.players.all();
    const checks={
      canonicalShape:Boolean(canonical?.draft&&canonical?.league&&Array.isArray(picks)),
      playerIdsUnique:true,
      pickPlayerIdsCanonical:true,
      pickPlayerIdsUnique:true,
      pickNumbersSequential:true,
      draftOwnersMatchOrder:true,
      compatibilityViewSynchronized:true,
      persistedStateMatchesCore:true,
      transactionDeltaValid:true
    };
    const errors=[];

    const ids=new Set();
    for(const player of players){
      if(!player?.id||ids.has(player.id)){checks.playerIdsUnique=false;errors.push(`PLAYER_ID_COLLISION:${player?.name||'unknown'}`);}
      ids.add(player?.id);
    }

    const pickedIds=new Set();
    picks.forEach((pick,index)=>{
      const player=core.services.players.byId(pick.playerId);
      if(!player){checks.pickPlayerIdsCanonical=false;errors.push(`UNKNOWN_PLAYER_ID:${pick.playerId}`);}
      if(pickedIds.has(pick.playerId)){checks.pickPlayerIdsUnique=false;errors.push(`DUPLICATE_PICK:${pick.playerId}`);}
      pickedIds.add(pick.playerId);
      if(pick.pick!==index+1){checks.pickNumbersSequential=false;errors.push(`BAD_PICK_NUMBER:${pick.pick}:${index+1}`);}
      const expectedOwner=core.services.draft.draftOrderAt(index);
      if(pick.draftedBy!==expectedOwner){checks.draftOwnersMatchOrder=false;errors.push(`BAD_OWNER:${index+1}:${pick.draftedBy}:${expectedOwner}`);}
    });

    const compat=core.services.draft.getPicks();
    if(compat.length!==picks.length||compat.some((pick,index)=>pick.playerId!==picks[index]?.playerId||pick.pick!==picks[index]?.pick||pick.draftedBy!==picks[index]?.draftedBy)){
      checks.compatibilityViewSynchronized=false;
      errors.push('COMPATIBILITY_VIEW_OUT_OF_SYNC');
    }

    try{
      const stored=JSON.parse(localStorage.getItem(core.storageKey)||'null');
      if(!stored||!same(stored,canonical)){
        checks.persistedStateMatchesCore=false;
        errors.push('PERSISTENCE_MISMATCH');
      }
    }catch{
      checks.persistedStateMatchesCore=false;
      errors.push('PERSISTENCE_READ_FAILED');
    }

    const current=picks.length;
    if(reason==='draft'&&current!==previousPickCount+1){checks.transactionDeltaValid=false;errors.push(`DRAFT_DELTA:${previousPickCount}:${current}`);}
    if(reason==='undo'&&current!==Math.max(0,previousPickCount-1)){checks.transactionDeltaValid=false;errors.push(`UNDO_DELTA:${previousPickCount}:${current}`);}
    if(reason==='reset'&&current!==0){checks.transactionDeltaValid=false;errors.push(`RESET_NOT_EMPTY:${current}`);}
    if(!['draft','undo','reset'].includes(reason)&&current!==previousPickCount){
      checks.transactionDeltaValid=false;
      errors.push(`UNEXPECTED_DRAFT_MUTATION:${reason}:${previousPickCount}:${current}`);
    }
    previousPickCount=current;

    const report=result(Object.values(checks).every(Boolean),checks,errors,reason);
    history.push(report);
    if(history.length>100)history.shift();
    global.__THE_BOARD_INTEGRITY__=report;
    if(report.ok)console.info(`[THE BOARD] Draft-State Integrity Gate PASS (${reason})`,report);
    else console.error(`[THE BOARD] Draft-State Integrity Gate FAIL (${reason})`,report);
    global.dispatchEvent?.(new CustomEvent('theboard:integrity',{detail:report}));
    return report;
  }

  core.subscribe(detail=>verify(detail?.reason||'statechange'));
  const bootReport=verify('refresh-boot');

  global.BoardIntegrityGate=Object.freeze({
    version:'1.0.0',
    report:()=>global.__THE_BOARD_INTEGRITY__||bootReport,
    history:()=>history.slice(),
    assertNow:()=>verify('manual')
  });
})(window);
