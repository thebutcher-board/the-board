'use strict';
(function(global){
  const VERSION='my-team-cockpit-1.0.0';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pos=p=>String(p?.pos||p?.position||'—').toUpperCase();
  const bye=p=>global.BoardMyTeam?.byeForTeam?.(p?.team)??p?.bye??p?.byeWeek??'—';
  const pct=(n,provisional)=>`${Number(n)||0}%${provisional?'*':''}`;
  function rosterRows(intel){
    const starterIds=new Set(intel.starters.map(p=>p.id||p.playerId||p.name));
    return intel.roster.map(p=>{const starter=starterIds.has(p.id||p.playerId||p.name);return `<button class="tbv52-row" data-player="${encodeURIComponent(p.name)}"><span><b>${esc(p.name)}</b><small>${esc(pos(p))} · ${esc(p.team||'—')} · BYE ${esc(bye(p))} · ${starter?'STARTER':'DEPTH'}</small></span><em>${Math.round(Number(p.proj||0))}</em></button>`}).join('');
  }
  function needsRows(intel){return intel.needs.map(n=>`<div class="tbv52-row"><span><b>${esc(n.pos)} ${n.count}/${n.target}</b><small>${n.need?`${n.need} roster spot${n.need===1?'':'s'} remaining`:'Target filled'} · ${esc(n.status)}</small></span><em>${n.need||'✓'}</em></div>`).join('')}
  function conflictText(intel){if(!intel.byeConflicts.length)return 'No current starter bye-week conflicts.';return intel.byeConflicts.map(c=>`W${c.week}: ${c.players.map(p=>p.name).join(', ')}`).join(' · ')}
  function teamHtml(intel){
    return `<section class="tbv52-team-summary"><div><small>MY TEAM</small><b>${esc(intel.team)}</b></div><span><small>ROSTER QUALITY</small><b>${intel.rosterConstructionQuality}</b></span></section>
      <div class="tbv52-team-grid">
        <div class="tbv52-row"><span><b>${intel.starterProjectedPoints} starter pts</b><small>${intel.totalProjectedPoints} total projected · ${intel.starters.length} starters · ${intel.depth.length} depth</small></span><em>${pct(intel.playoffProbability,intel.probabilitiesProvisional)} PO</em></div>
        <div class="tbv52-row"><span><b>${pct(intel.championshipProbability,intel.probabilitiesProvisional)} championship</b><small>Model confidence ${intel.modelConfidence}%${intel.probabilitiesProvisional?' · provisional while roster is incomplete':''}</small></span><em>${intel.rosterConstructionQuality}/100</em></div>
        <div class="tbv52-row"><span><b>Bye-week check</b><small>${esc(conflictText(intel))}</small></span><em>${intel.byeConflicts.length?`${intel.byeConflicts.length} flags`:'CLEAR'}</em></div>
        ${needsRows(intel)}
        ${rosterRows(intel)||'<div class="tbv52-message">Your roster populates as picks are made.</div>'}
      </div>`;
  }
  function analyticsHtml(intel){
    return `<section class="tbv52-team-summary"><div><small>TEAM ANALYTICS</small><b>${esc(intel.team)}</b></div><span><small>QUALITY</small><b>${intel.rosterConstructionQuality}/100</b></span></section>
      <div class="tbv52-team-grid">
        <div class="tbv52-row"><span><b>Projected starter points</b><small>Best current starting lineup from BoardCore roster</small></span><em>${intel.starterProjectedPoints}</em></div>
        <div class="tbv52-row"><span><b>Playoff probability</b><small>${intel.probabilitiesProvisional?'Provisional estimate; confidence rises as roster fills':'Full-roster estimate'}</small></span><em>${pct(intel.playoffProbability,false)}</em></div>
        <div class="tbv52-row"><span><b>Championship probability</b><small>${intel.probabilitiesProvisional?'Provisional estimate; not a betting projection':'Full-roster estimate'}</small></span><em>${pct(intel.championshipProbability,false)}</em></div>
        <div class="tbv52-row"><span><b>Roster construction</b><small>Starter fill, talent, positional completion and bye conflicts</small></span><em>${intel.rosterConstructionQuality}/100</em></div>
        <div class="tbv52-row"><span><b>Bye-week conflicts</b><small>${esc(conflictText(intel))}</small></span><em>${intel.byeConflicts.length}</em></div>
      </div>`;
  }
  function wirePlayers(root){root.querySelectorAll('[data-player]').forEach(el=>el.onclick=()=>global.openPlayerDetails?.(decodeURIComponent(el.dataset.player)))}
  function render(){
    const engine=global.BoardMyTeam;if(!engine)return false;
    const intel=engine.get();
    const team=document.querySelector('[data-v52-panel="team"]');
    const analytics=document.querySelector('[data-v52-panel="analytics"]');
    if(!team||!analytics)return false;
    team.innerHTML=teamHtml(intel);analytics.innerHTML=analyticsHtml(intel);wirePlayers(team);return true;
  }
  global.addEventListener('theboard:myteam',()=>requestAnimationFrame(render));
  global.addEventListener('theboard:app-ready',()=>requestAnimationFrame(render));
  global.addEventListener('theboard:statechange',()=>requestAnimationFrame(render));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(render,0),{once:true});else setTimeout(render,0);
  global.BoardMyTeamCockpit=Object.freeze({version:VERSION,render});
})(window);
