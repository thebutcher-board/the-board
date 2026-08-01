'use strict';

const APP_VERSION = '1.4.3';
const STORAGE_KEY = 'the-board-fast-runtime';
const LEGACY_KEYS = ['the-board-v1-2-scouting-controls','the-board-v1-ai-gm-canonical','the-board-v9','the-board-v8','the-board-v7','the-board-v6','the-board-v5','the-board-v4','the-board-v3','the-board-v2','the-board-v1'];
const NAME_CORRECTIONS = {'George KittleO':'George Kittle','James Cook':'James Cook III'};
const DEFAULT_PROFILE = {leagueName:'The League',teamName:'The Butcher',teamCount:10,keeperCount:5,bench:6,rosterSize:16,starterCount:10,ownerSkill:'Advanced',gmName:'Goose',rosterTargets:{QB:3,RB:4,WR:5,TE:2,K:1,DEF:1}};

function canonicalName(value){
  const raw=String(value||'').replace(/\s+/g,' ').trim();
  if(NAME_CORRECTIONS[raw]) return NAME_CORRECTIONS[raw];
  return /[a-z.)][QDO]$/.test(raw)?raw.slice(0,-1):raw;
}
function normalize(value){return canonicalName(value).toLowerCase();}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function initials(name){return canonicalName(name).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();}

const keeperOwnership=new Map();
Object.entries(KEEPERS).forEach(([owner,names])=>names.forEach(name=>keeperOwnership.set(normalize(name),owner)));
const MASTER_PLAYERS=PLAYERS.map((p,i)=>({...p,id:p.id||`p-${i}`,name:canonicalName(p.name),keeperOwner:keeperOwnership.get(normalize(p.name))||null}));

function defaultState(){return {drafted:[],slot:8,teams:[...BASE_TEAMS],scouting:{},profile:structuredClone(DEFAULT_PROFILE)};}
function loadState(){
  try{
    let raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) raw=LEGACY_KEYS.map(k=>localStorage.getItem(k)).find(Boolean);
    const saved=raw?JSON.parse(raw):null;
    if(!saved||!Array.isArray(saved.drafted)||!Array.isArray(saved.teams)) return defaultState();
    return {drafted:saved.drafted||[],slot:Number(saved.slot)||8,teams:saved.teams.length?saved.teams:[...BASE_TEAMS],scouting:saved.scouting||{},profile:{...structuredClone(DEFAULT_PROFILE),...(saved.profile||{}),rosterTargets:{...DEFAULT_PROFILE.rosterTargets,...(saved.profile?.rosterTargets||{})}}};
  }catch{return defaultState();}
}
let state=loadState();
let activeView='warroom';
let pendingPlayerName=null;
let databaseLimit=60;
let saveTimer=null;
function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}},80);}

function playerByName(name){return MASTER_PLAYERS.find(p=>normalize(p.name)===normalize(name));}
function draftedRecord(player){return state.drafted.find(p=>normalize(p.name)===normalize(player.name));}
function playerStatus(player){
  if(player.keeperOwner) return {key:'keeper',label:'KEEPER',owner:player.keeperOwner,draftable:false};
  const drafted=draftedRecord(player);
  if(drafted) return {key:'drafted',label:'DRAFTED',owner:drafted.draftedBy,draftable:false};
  return {key:'available',label:'AVAILABLE',owner:null,draftable:true};
}
function available(){return MASTER_PLAYERS.filter(p=>playerStatus(p).draftable);}
function scoutingTag(player){return state.scouting[normalize(player.name)]||null;}
function ranked(){return available().slice().sort((a,b)=>Number(a.butcherRank||9999)-Number(b.butcherRank||9999)||Number(b.score||0)-Number(a.score||0)||Number(b.proj||0)-Number(a.proj||0));}
function draftOrderAt(index){const size=state.teams.length||10;const round=Math.floor(index/size);const slot=index%size;return round%2===0?state.teams[slot]:state.teams[size-1-slot];}
function currentTeam(){return draftOrderAt(state.drafted.length);}
function rosterFor(team){
  const keepers=(KEEPERS[team]||[]).map(name=>({name:canonicalName(name),pos:playerByName(name)?.pos||'—',keeper:true}));
  return [...keepers,...state.drafted.filter(p=>p.draftedBy===team)];
}
function positionCounts(team){return rosterFor(team).reduce((a,p)=>(a[p.pos]=(a[p.pos]||0)+1,a),{});}
function targetCount(pos){return Number(state.profile.rosterTargets?.[pos]??DEFAULT_PROFILE.rosterTargets[pos]??1);}
function showToast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),1500);}
function playerPhoto(player,className='player-photo'){return `<div class="${className}"><span>${initials(player.name)}</span></div>`;}
function microTier(player){
  const r=Number(player.posRank||99);
  if(player.pos==='QB') return r<=9?'QB1 · Starter':r<=22?'QB2 · Weekly starter':'QB3 · Depth';
  if(player.pos==='RB') return r<=16?'RB1 · Starter':r<=30?'RB2 · Flex':'RB3 · Depth';
  if(player.pos==='WR') return r<=22?'WR1 · Starter':r<=40?'WR2 · Flex':'WR3 · Depth';
  if(player.pos==='TE') return r<=10?'TE1 · Starter':'TE2 · Depth';
  return `${player.pos} target`;
}
function draftWindow(player){const r=Number(player.butcherRank||999);return r<=10?'Round 1':r<=30?'Rounds 2–3':r<=50?'Rounds 4–5':r<=80?'Rounds 6–8':'Late rounds';}
function roleLabel(player){if(player.pos==='QB')return Number(player.posRank)<=22?'Starter':'Depth';if(player.pos==='RB')return Number(player.posRank)<=16?'Lead back':Number(player.posRank)<=35?'Committee':'Depth';if(player.pos==='WR')return Number(player.posRank)<=36?'Starter':'Depth';if(player.pos==='TE')return Number(player.posRank)<=14?'Starter':'Depth';return 'Starter';}
function analystTake(player){
  const counts=positionCounts(state.profile.teamName);
  if(player.pos==='QB') return (counts.QB||0)<2?`${player.name} fills the most important open starting spot in this 2QB league.`:`${player.name} provides QB3 protection and trade leverage.`;
  if(player.pos==='RB') return `${player.name} is a workload and receiving-value bet for the flex.`;
  if(player.pos==='WR') return `${player.name} adds target volume and weekly PPR ceiling.`;
  if(player.pos==='TE') return `${player.name} matters only if he creates separation from replacement-level tight ends.`;
  return `${player.name} can create a weekly scoring edge in this custom format.`;
}

function setScoutingTag(name,tag){
  const player=playerByName(name);if(!player)return;
  const key=normalize(player.name);const next=state.scouting[key]===tag?null:tag;
  if(next)state.scouting[key]=next;else delete state.scouting[key];
  document.querySelectorAll(`[data-scout-player="${CSS.escape(encodeURIComponent(player.name))}"]`).forEach(btn=>btn.classList.toggle('active',Boolean(next&&btn.dataset.scout===next)));
  saveSoon();showToast(next?`${player.name}: ${next.replace('_',' ')}`:`${player.name}: cleared`);
  if(activeView==='warroom') requestAnimationFrame(renderWarroom);
}

function renderWarroom(){
  const list=ranked();const top=list[0];const pick=state.drafted.length+1;const counts=positionCounts(state.profile.teamName);
  document.getElementById('versionLabel').textContent=`v${APP_VERSION}`;
  document.getElementById('frontOfficeTeamName').textContent=state.profile.teamName;
  document.getElementById('clockTeam').textContent=currentTeam();
  document.getElementById('clockPick').textContent=`Round ${Math.ceil(pick/(state.teams.length||10))} · Pick ${pick}`;
  document.getElementById('pickBadge').textContent=pick;
  document.getElementById('rosterSummary').innerHTML=['QB','RB','WR','TE','K','DEF'].map(pos=>`<div class="roster-command-row"><span>${pos}</span><b>${counts[pos]||0}/${targetCount(pos)}</b><i>${(counts[pos]||0)>=targetCount(pos)?'Set':'Open'}</i></div>`).join('');
  document.getElementById('myRoster').innerHTML=rosterFor(state.profile.teamName).map(p=>`<div class="roster-row"><b>${p.pos}</b><span>${escapeHtml(p.name)}</span><span class="keeper-label">${p.keeper?'KEEPER':`PICK ${p.pick}`}</span></div>`).join('');
  document.getElementById('currentObjective').innerHTML=`<span class="eyebrow">CURRENT OBJECTIVE</span><strong>${(counts.QB||0)<2?'Acquire QB2':'Build the best flex'}</strong>`;
  const tagCounts={must_have:0,watch:0,value_only:0,fade:0};Object.values(state.scouting).forEach(t=>{if(tagCounts[t]!=null)tagCounts[t]++;});
  document.getElementById('scoutingSummary').innerHTML=`<div><span>Targets</span><b>${tagCounts.must_have}</b></div><div><span>Watch</span><b>${tagCounts.watch}</b></div><div><span>Value</span><b>${tagCounts.value_only}</b></div><div><span>Fade</span><b>${tagCounts.fade}</b></div>`;
  document.getElementById('gooseThinking').innerHTML=top?`<p class="gm-kicker">${escapeHtml(state.profile.gmName||'Goose')}</p><h2>${currentTeam()===state.profile.teamName?`Take ${escapeHtml(top.name)}.`:`Track ${escapeHtml(top.name)}.`}</h2><p>${escapeHtml(analystTake(top))}</p>`:'<h2>Draft complete.</h2>';
  document.getElementById('recommend').innerHTML=top?`<button class="btn primary" data-draft="${encodeURIComponent(top.name)}">Approve ${escapeHtml(top.name)}</button><button class="btn ghost" data-jump="board">Open Board</button>`:'';
  document.getElementById('decisionPaths').innerHTML=list.slice(0,3).map((p,i)=>`<article class="future-path ${i===0?'recommended':''}"><span>${i===0?'RECOMMENDED':i===1?'ALTERNATIVE':'VALUE PIVOT'}</span><h4>${escapeHtml(p.name)}</h4><p>${p.pos} · ${draftWindow(p)}</p><button class="text-btn" data-player="${encodeURIComponent(p.name)}">Why?</button></article>`).join('');
  document.getElementById('nextFive').innerHTML=list.slice(0,5).map((p,i)=>`<button data-player="${encodeURIComponent(p.name)}"><span>${i+1}</span><b>${escapeHtml(p.name)}</b><small>${p.pos} · ${Math.round(p.proj||0)} pts</small></button>`).join('');
  const tagged=MASTER_PLAYERS.filter(p=>scoutingTag(p)&&scoutingTag(p)!=='fade').slice(0,8);
  document.getElementById('positionTargets').innerHTML=tagged.length?tagged.map(p=>`<button data-player="${encodeURIComponent(p.name)}"><b>${escapeHtml(p.name)}</b><small>${scoutingTag(p).replace('_',' ')} · ${draftWindow(p)}</small></button>`).join(''):'<div class="empty-intel"><b>No targets yet</b><span>Tag players in Players.</span></div>';
  document.getElementById('draftPressure').innerHTML='<div class="radar-callout"><span>ROOM STATUS</span><b>Ready</b><small>Live intelligence will be added after the fast runtime is stable.</small></div>';
}

function boardCard(player,index){const tag=scoutingTag(player);return `<article class="board-player" data-player="${encodeURIComponent(player.name)}"><div class="rank">${index+1}</div>${playerPhoto(player,'player-photo small')}<div class="player-copy"><div class="player-name">${escapeHtml(player.name)}</div><div class="player-meta">${player.team} · ${player.pos} · ${escapeHtml(microTier(player))}</div><div class="player-signal">#${player.posRank||'—'} · ${Math.round(player.proj||0)} pts · ${player.risk} risk</div></div><div class="quick-scout-row">${[['must_have','★'],['watch','◉'],['value_only','$'],['fade','—']].map(([v,i])=>`<button class="quick-scout ${tag===v?'active':''}" data-scout="${v}" data-scout-player="${encodeURIComponent(player.name)}">${i}</button>`).join('')}</div><button class="draft-btn" data-draft="${encodeURIComponent(player.name)}">Draft</button></article>`;}
function renderBoard(){
  const q=document.getElementById('boardSearch').value.toLowerCase();const pos=document.getElementById('boardPos').value;
  const list=ranked().filter(p=>(pos==='ALL'||p.pos===pos)&&`${p.name} ${p.team}`.toLowerCase().includes(q)).slice(0,75);
  document.getElementById('availableCount').textContent=`${available().length} available`;
  document.getElementById('boardTable').innerHTML=list.length?list.map(boardCard).join(''):'<div class="empty">No players found.</div>';
}
function databaseCard(player){
  const status=playerStatus(player);const tag=scoutingTag(player);const statusText=status.owner?`${status.label} · ${escapeHtml(status.owner)}`:status.label;
  return `<article class="scout-player premium-row" data-player-row="${encodeURIComponent(player.name)}">${playerPhoto(player,'player-photo scouting-photo')}<div class="scout-copy"><div class="player-title-line"><div class="player-name">${escapeHtml(player.name)}</div></div><div class="player-meta">${player.team} · ${player.pos} · ${escapeHtml(microTier(player))}</div><div class="status-line"><span class="status-chip ${status.key}">${statusText}</span><span>ACTIVE</span></div><div class="scout-context"><span>${roleLabel(player)}</span><span>${draftWindow(player)}</span></div></div><div class="scout-metrics"><div><span>PROJ</span><b>${Math.round(player.proj||0)}</b></div><div><span>ADP</span><b>—</b></div><div><span>BYE</span><b>TBD</b></div><div><span>RANK</span><b>#${player.posRank||'—'}</b></div></div><div class="scout-actions"><div class="quick-scout-row">${[['must_have','★','Target'],['watch','◉','Watch'],['value_only','$','Value'],['fade','—','Fade']].map(([v,i,l])=>`<button class="quick-scout ${tag===v?'active':''}" data-scout="${v}" data-scout-player="${encodeURIComponent(player.name)}"><span>${i}</span><em>${l}</em></button>`).join('')}</div><div class="row-tools"><button class="details-btn" data-player="${encodeURIComponent(player.name)}">Details</button></div></div></article>`;
}
function renderDatabase(){
  const q=document.getElementById('databaseSearch').value.toLowerCase();const pos=document.getElementById('databasePos').value;const sf=document.getElementById('databaseStatus').value;const tf=document.getElementById('databaseScout').value;const sort=document.getElementById('databaseSort').value;
  let list=MASTER_PLAYERS.filter(p=>{const s=playerStatus(p);const t=scoutingTag(p)||'untagged';return(pos==='ALL'||p.pos===pos)&&(sf==='ALL'||s.key===sf)&&(tf==='ALL'||t===tf)&&`${p.name} ${p.team} ${s.owner||''}`.toLowerCase().includes(q);});
  list.sort((a,b)=>sort==='PROJ'?Number(b.proj||0)-Number(a.proj||0):sort==='POS'?String(a.pos).localeCompare(String(b.pos))||Number(a.posRank||999)-Number(b.posRank||999):Number(a.butcherRank||9999)-Number(b.butcherRank||9999)||Number(b.proj||0)-Number(a.proj||0));
  document.getElementById('databaseCount').textContent=`${list.length} players`;
  const visible=list.slice(0,databaseLimit);
  document.getElementById('databaseList').innerHTML=visible.map(databaseCard).join('')+(list.length>databaseLimit?`<button id="showMorePlayers" class="btn secondary">Show 50 more</button>`:'');
}
function renderLeague(){document.getElementById('rosters').innerHTML=state.teams.map(team=>`<div class="team-card ${team===state.profile.teamName?'me':''}"><h3>${escapeHtml(team)}</h3>${rosterFor(team).map(p=>`<div class="team-player" data-player="${encodeURIComponent(p.name)}"><span>${escapeHtml(p.name)}</span><b>${p.pos}${p.keeper?' K':''}</b></div>`).join('')}</div>`).join('');}
function renderHistory(){document.getElementById('draftHistory').innerHTML=state.drafted.length?state.drafted.map(p=>`<div class="history-row" data-player="${encodeURIComponent(p.name)}"><b>#${p.pick}</b><span><strong>${escapeHtml(p.name)}</strong><br><small>${p.pos} · ${p.team}</small></span><span>${escapeHtml(p.draftedBy)}</span></div>`).join(''):'<div class="empty">No picks yet.</div>';document.getElementById('undoBtn').disabled=!state.drafted.length;document.getElementById('quickUndoBtn').disabled=!state.drafted.length;}
function renderActive(){if(activeView==='warroom')renderWarroom();else if(activeView==='board')renderBoard();else if(activeView==='database')renderDatabase();else if(activeView==='league')renderLeague();else renderHistory();}
function showView(id){activeView=id;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===id));renderActive();window.scrollTo({top:0});}

function openModal(id){document.getElementById(id).hidden=false;document.body.classList.add('modal-open');}
function closeModal(id){document.getElementById(id).hidden=true;if(!document.querySelector('.modal:not([hidden])'))document.body.classList.remove('modal-open');}
function openPlayerDetails(name){
  const p=playerByName(name);if(!p)return;const s=playerStatus(p);const comparable=available().filter(x=>x.pos===p.pos&&normalize(x.name)!==normalize(p.name)).sort((a,b)=>Math.abs(Number(a.posRank||999)-Number(p.posRank||999))-Math.abs(Number(b.posRank||999)-Number(p.posRank||999))).slice(0,3);
  document.getElementById('playerModalContent').innerHTML=`<div class="player-profile-head">${playerPhoto(p,'player-photo profile-photo')}<div><span class="position-tag">${p.pos}</span><h2>${escapeHtml(p.name)}</h2><p>${p.team} · ${escapeHtml(microTier(p))}</p></div></div><div class="status-banner ${s.key}"><b>${s.label}${s.owner?` · ${escapeHtml(s.owner)}`:''}</b><span class="health-chip healthy">Healthy</span></div><div class="analyst-take"><span class="eyebrow">SCOUT'S TAKE</span><p>${escapeHtml(analystTake(p))}</p></div><div class="detail-grid"><div><span>Projection</span><b>${Math.round(p.proj||0)}</b></div><div><span>Draft Window</span><b>${draftWindow(p)}</b></div><div><span>Risk</span><b>${p.risk}</b></div></div><div class="hotfix-intelligence-grid"><section><span class="eyebrow">CEILING</span><p>Upside follows role, volume and touchdown access.</p></section><section><span class="eyebrow">FLOOR & RISK</span><p>${p.risk} risk with a ${roleLabel(p).toLowerCase()} profile.</p></section><section><span class="eyebrow">TEAM & LEAGUE FIT</span><p>Evaluated for your 2QB, PPR keeper format.</p></section><section><span class="eyebrow">DRAFT STRATEGY</span><p>Use ${draftWindow(p)} as the current working window.</p></section></div><section class="hotfix-comparables"><span class="eyebrow">COMPARABLE OPTIONS</span>${comparable.map(c=>`<button class="hotfix-comparable" data-player="${encodeURIComponent(c.name)}"><b>${escapeHtml(c.name)}</b><small>${c.team} · #${c.posRank||'—'}</small></button>`).join('')}</section><div class="scouting-actions"><span class="eyebrow">SCOUTING TAG</span><div>${[['must_have','Target'],['watch','Watch'],['value_only','Value Only'],['fade','Fade']].map(([v,l])=>`<button class="scout-btn ${scoutingTag(p)===v?'active':''}" data-scout="${v}" data-scout-player="${encodeURIComponent(p.name)}">${l}</button>`).join('')}</div></div><div class="modal-actions">${s.draftable?`<button class="btn primary" data-draft="${encodeURIComponent(p.name)}">Draft ${escapeHtml(p.name)}</button>`:''}</div>`;
  openModal('playerModal');
}
function requestDraft(name){const p=playerByName(name);if(!p||!playerStatus(p).draftable)return;pendingPlayerName=p.name;document.getElementById('confirmPlayer').textContent=p.name;document.getElementById('confirmMeta').textContent=`${p.pos} · ${p.team} · ${Math.round(p.proj||0)} projected points`;document.getElementById('confirmTeam').textContent=currentTeam();openModal('confirmModal');}
function confirmDraft(){const p=playerByName(pendingPlayerName);if(!p||!playerStatus(p).draftable)return closeModal('confirmModal');state.drafted.push({...p,draftedBy:currentTeam(),pick:state.drafted.length+1});pendingPlayerName=null;saveSoon();closeModal('confirmModal');renderActive();showToast(`${p.name} drafted`);}
function undo(){const p=state.drafted.pop();if(!p)return;saveSoon();renderActive();showToast(`Undid ${p.name}`);}

function openSettings(){
  const p=state.profile;document.getElementById('leagueNameInput').value=p.leagueName;document.getElementById('teamNameInput').value=p.teamName;document.getElementById('teamCountInput').value=p.teamCount;document.getElementById('keeperCountInput').value=p.keeperCount;document.getElementById('benchInput').value=p.bench;document.getElementById('rosterSizeInput').value=p.rosterSize;document.getElementById('starterCountInput').value=p.starterCount;document.getElementById('ownerSkillInput').value=p.ownerSkill;document.getElementById('teamNamesInput').value=state.teams.join('\n');const slot=document.getElementById('slotSelect');slot.innerHTML=state.teams.map((_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');slot.value=state.slot;['QB','RB','WR','TE','K','DEF'].forEach(pos=>document.getElementById(`target${pos}`).value=p.rosterTargets[pos]);openModal('settingsModal');
}
function applyProfile(){
  state.profile={...state.profile,leagueName:document.getElementById('leagueNameInput').value.trim()||'The League',teamName:document.getElementById('teamNameInput').value.trim()||'The Butcher',teamCount:Number(document.getElementById('teamCountInput').value)||10,keeperCount:Number(document.getElementById('keeperCountInput').value)||5,bench:Number(document.getElementById('benchInput').value)||6,rosterSize:Number(document.getElementById('rosterSizeInput').value)||16,starterCount:Number(document.getElementById('starterCountInput').value)||10,ownerSkill:document.getElementById('ownerSkillInput').value||'Advanced',rosterTargets:Object.fromEntries(['QB','RB','WR','TE','K','DEF'].map(pos=>[pos,Number(document.getElementById(`target${pos}`).value)||0]))};
  state.slot=Number(document.getElementById('slotSelect').value)||8;const teams=document.getElementById('teamNamesInput').value.split('\n').map(x=>x.trim()).filter(Boolean);if(teams.length)state.teams=teams;saveSoon();closeModal('settingsModal');renderActive();showToast('Profile saved');
}

document.addEventListener('click',event=>{
  const scout=event.target.closest('[data-scout]');if(scout){event.preventDefault();event.stopPropagation();setScoutingTag(decodeURIComponent(scout.dataset.scoutPlayer),scout.dataset.scout);return;}
  const draft=event.target.closest('[data-draft]');if(draft){event.preventDefault();event.stopPropagation();requestDraft(decodeURIComponent(draft.dataset.draft));return;}
  const player=event.target.closest('[data-player]');if(player){openPlayerDetails(decodeURIComponent(player.dataset.player));return;}
  const row=event.target.closest('[data-player-row]');if(row&&(event.target.closest('.player-name')||event.target.closest('.scouting-photo'))){openPlayerDetails(decodeURIComponent(row.dataset.playerRow));return;}
  const tab=event.target.closest('.tab');if(tab){showView(tab.dataset.view);return;}
  const jump=event.target.closest('[data-jump]');if(jump){showView(jump.dataset.jump);return;}
  if(event.target.id==='showMorePlayers'){databaseLimit+=50;renderDatabase();}
});

document.getElementById('boardSearch').addEventListener('input',()=>activeView==='board'&&renderBoard());
document.getElementById('boardPos').addEventListener('change',()=>activeView==='board'&&renderBoard());
['databaseSearch','databasePos','databaseStatus','databaseScout','databaseSort'].forEach(id=>document.getElementById(id).addEventListener(id==='databaseSearch'?'input':'change',()=>{databaseLimit=60;if(activeView==='database')renderDatabase();}));
document.getElementById('confirmDraft').addEventListener('click',confirmDraft);
document.getElementById('cancelDraft').addEventListener('click',()=>closeModal('confirmModal'));
document.getElementById('closePlayer').addEventListener('click',()=>closeModal('playerModal'));
document.getElementById('closeCompare').addEventListener('click',()=>closeModal('compareModal'));
document.getElementById('undoBtn').addEventListener('click',undo);
document.getElementById('quickUndoBtn').addEventListener('click',undo);
document.getElementById('settingsBtn').addEventListener('click',openSettings);
document.getElementById('closeSettings').addEventListener('click',()=>closeModal('settingsModal'));
document.getElementById('saveSettings').addEventListener('click',applyProfile);
document.getElementById('resetBtn').addEventListener('click',()=>{if(confirm('Reset every drafted player?')){state.drafted=[];saveSoon();closeModal('settingsModal');renderActive();}});
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));

document.getElementById('databaseStatus').value='available';
document.getElementById('databaseSearch').placeholder='Search players, teams or owners';
renderWarroom();
