'use strict';

const polishStyle = document.createElement('style');
polishStyle.textContent = `
  body{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-feature-settings:"kern" 1,"liga" 1;text-rendering:optimizeLegibility}
  .brand h1,.front-office-topline h2,.scouting-hero h2,.goose-desk h2,.panel h2{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.025em;font-weight:850}
  .brand h1{letter-spacing:.015em;font-weight:950}
  .brand p,.eyebrow,.position-tag,.status-chip,.scouting-legend,.tab{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.09em}
  .player-name,.player-profile-head h2{letter-spacing:-.018em}
  .player-modal-card{line-height:1.45}
  .player-modal-card .analyst-take p{font-size:15px;line-height:1.58;color:#eef1f2}
  .player-modal-card .hotfix-intelligence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:16px 0}
  .player-modal-card .hotfix-intelligence-grid section{padding:15px;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(255,255,255,.035)}
  .player-modal-card .hotfix-intelligence-grid p{margin:7px 0 0;font-size:13px;line-height:1.52;color:#dfe3e5}
  .player-modal-card .hotfix-comparables{padding:15px;margin:16px 0;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(255,255,255,.025)}
  .player-modal-card .hotfix-comparable{display:flex;width:100%;justify-content:space-between;gap:12px;padding:11px 0;border:0;border-bottom:1px solid rgba(255,255,255,.07);background:none;color:inherit;text-align:left}
  .player-modal-card .hotfix-comparable:last-child{border-bottom:0}
  .player-modal-card .hotfix-comparable small{display:block;margin-top:3px;color:var(--muted,#9da5aa)}
  .player-modal-card .hotfix-comparable em{max-width:52%;font-size:11px;line-height:1.4;color:#c6cccf;font-style:normal;text-align:right}
  @media(max-width:700px){.player-modal-card .hotfix-intelligence-grid{grid-template-columns:1fr}.player-modal-card .hotfix-comparable{display:block}.player-modal-card .hotfix-comparable em{display:block;max-width:none;margin-top:5px;text-align:left}}
`;
document.head.appendChild(polishStyle);

function playerCardCopy(player){
  const rank=Number(player.posRank||99);
  const risk=String(player.risk||'Medium');
  const projection=Math.round(Number(player.proj||0));
  const counts=typeof positionCounts==='function'&&state?.profile?.teamName?positionCounts(state.profile.teamName):{};
  const current=counts[player.pos]||0;
  const pos=player.pos;
  let take,ceiling,floor,fit,strategy;

  if(pos==='QB'){
    const rushNames=['Jalen Hurts','Lamar Jackson','Jayden Daniels','Josh Allen','Kyler Murray','Jaxson Dart','Tyler Shough'];
    const rushing=rushNames.includes(player.name);
    take=`${player.name} ${current<2?'fills the most important open starting spot':'adds valuable quarterback depth'} in this 2QB league. ${rushing?'His rushing production raises both the weekly floor and spike-week ceiling.':'His value is driven by passing volume, touchdown access and job security.'}`;
    ceiling=rushing?'Top-tier QB1 weeks through combined passing and rushing touchdowns, with legitimate matchup-proof upside.':rank<=12?'High-end QB1 production when passing volume and touchdown efficiency align.':'Stable QB2 scoring with occasional QB1 weeks in favorable game environments.';
    floor=rushing?`${risk} risk. Designed rushing usage protects him when passing efficiency dips.`:`${risk} risk. The floor depends more heavily on passing efficiency because rushing production is limited.`;
    fit=current<2?'Directly solves QB2 beside Drake Maye and prevents the roster from chasing a weaker starter tier later.':'Functions as QB3 insurance, injury protection and potential trade leverage.';
    strategy=current<2?`Round 1 priority when available. Do not pass him for a similar-tier RB or WR unless a clearly superior value falls.`:'Draft only if the price creates obvious value after the two starting quarterback spots are secured.';
  } else if(pos==='RB'){
    take=`${player.name} is a workload bet. His value comes from touches, receiving work and touchdown access—not simply positional rank.`;
    ceiling=rank<=12?'Weekly RB1 production with enough volume to swing matchups and stabilize the flex.':'A larger workload or injury ahead of him can unlock RB2 or flex-winning weeks.';
    floor=`${risk} risk. ${rank<=24?'Expected touches provide a usable weekly base.':'Role uncertainty creates meaningful week-to-week volatility.'}`;
    fit=`You currently roster ${current} running backs. He matters when he upgrades the starting flex or supplies high-value injury insulation.`;
    strategy=`Use the current draft window as a price ceiling. Favor backs with receiving work over touchdown-dependent committee options.`;
  } else if(pos==='WR'){
    take=`${player.name} is evaluated through target share, route security and quarterback environment in this PPR format.`;
    ceiling=rank<=18?'Alpha-level volume creates legitimate WR1 weeks and a strong chance to outperform draft cost.':'Stable routes and explosive plays can create useful flex production with spike-week upside.';
    floor=`${risk} risk. ${rank<=30?'A strong route share supports a dependable PPR floor.':'Target competition makes the weekly floor less secure.'}`;
    fit=`You currently roster ${current} receivers. He fits when his target profile improves the flex rather than merely adding bench depth.`;
    strategy='Compare target security and quarterback quality against the nearby RB tier before selecting.';
  } else if(pos==='TE'){
    take=`${player.name} is valuable only if he creates weekly separation at tight end or offers meaningful insurance behind Trey McBride.`;
    ceiling=rank<=8?'Difference-making target volume with the ability to produce WR-level weeks from the tight-end slot.':'Matchup-driven TE1 production with touchdown upside.';
    floor=`${risk} risk. ${rank<=12?'A stable route role supports a playable weekly base.':'The floor can become touchdown-dependent.'}`;
    fit=`You currently roster ${current} tight ends. The pick should protect the roster without sacrificing higher-impact RB or WR value.`;
    strategy='Draft only after the premium tier clearly separates from replacement-level options.';
  } else {
    take=`${player.name} can create a real weekly scoring edge because this league values ${pos} more heavily than standard formats.`;
    ceiling='Top-tier positional scoring can outperform ordinary late-round bench depth.';
    floor=`${risk} risk with more replacement value than the premium offensive positions.`;
    fit=`This league's custom scoring increases the position's strategic value.`;
    strategy='Select only when the top tier is clearly separated from the remaining field.';
  }
  return{take,ceiling,floor,fit,strategy,projection};
}

function comparableReason(player,candidate){
  const gap=Math.abs(Number(player.posRank||99)-Number(candidate.posRank||99));
  if(candidate.risk==='Low'&&player.risk!=='Low')return'Safer floor in the same positional neighborhood.';
  if(Number(candidate.proj||0)>Number(player.proj||0))return'Higher projection, but likely carries a steeper price.';
  if(gap<=4)return'Same decision tier and a direct fallback if your preferred option goes.';
  return'Nearby positional pivot that preserves the draft structure.';
}

function enhanceOpenCard(playerName){
  if(typeof playerByName!=='function')return;
  const player=playerByName(playerName);
  const modal=document.getElementById('playerModalContent');
  if(!player||!modal)return;
  const copy=playerCardCopy(player);
  const take=modal.querySelector('.analyst-take p');
  if(take)take.textContent=copy.take;

  const labels=[['CEILING',copy.ceiling],['FLOOR & RISK',copy.floor],['TEAM & LEAGUE FIT',copy.fit],['DRAFT STRATEGY',copy.strategy]];
  let grid=modal.querySelector('.hotfix-intelligence-grid');
  if(!grid){
    grid=document.createElement('div');
    grid.className='hotfix-intelligence-grid';
    const anchor=modal.querySelector('.scouting-actions')||modal.querySelector('.modal-actions');
    anchor?.before(grid);
  }
  if(grid)grid.innerHTML=labels.map(([label,text])=>`<section><span class="eyebrow">${label}</span><p>${text}</p></section>`).join('');

  const options=(typeof MASTER_PLAYERS!=='undefined'?MASTER_PLAYERS:[])
    .filter(candidate=>candidate.pos===player.pos&&candidate.name!==player.name&&(!candidate.keeperOwner)&&!(typeof draftedRecord==='function'&&draftedRecord(candidate)))
    .sort((a,b)=>Math.abs(Number(a.posRank||99)-Number(player.posRank||99))-Math.abs(Number(b.posRank||99)-Number(player.posRank||99)))
    .slice(0,3);
  let comp=modal.querySelector('.hotfix-comparables');
  if(!comp){
    comp=document.createElement('section');
    comp.className='hotfix-comparables';
    const anchor=modal.querySelector('.scouting-actions')||modal.querySelector('.modal-actions');
    anchor?.before(comp);
  }
  if(comp)comp.innerHTML=`<div class="section-title"><span class="eyebrow">COMPARABLE OPTIONS</span><span>Available ${player.pos} alternatives</span></div>${options.map(candidate=>`<button class="hotfix-comparable" data-player="${encodeURIComponent(candidate.name)}"><span><b>${candidate.name}</b><small>${candidate.team} · ${candidate.pos} #${candidate.posRank||'—'} · ${Math.round(candidate.proj||0)} pts</small></span><em>${comparableReason(player,candidate)}</em></button>`).join('')}`;
}

document.addEventListener('click',event=>{
  const direct=event.target.closest('[data-player]');
  const row=event.target.closest('[data-player-row]');
  const encoded=direct?.dataset.player||row?.dataset.playerRow;
  if(!encoded)return;
  const name=decodeURIComponent(encoded);
  setTimeout(()=>enhanceOpenCard(name),0);
},false);
