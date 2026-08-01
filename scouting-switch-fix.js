'use strict';

const uiLink=document.createElement('link');
uiLink.rel='stylesheet';
uiLink.href='fortune-ui.css?v=4';
document.head.appendChild(uiLink);

const qaStyle=document.createElement('style');
qaStyle.textContent=`
  .scout-metrics span{color:#6b7078!important;opacity:1!important;font-weight:750!important}
  .scout-metrics b{color:#24262a!important;opacity:1!important;font-weight:800!important}
  .scout-metrics>div{border-color:#cfd3d8!important}
  .modal{padding-top:78px!important;padding-bottom:24px!important;align-items:start!important;overflow-y:auto!important}
  .player-modal-card{margin:0 auto 28px!important;max-height:none!important;overflow:visible!important}
  .player-profile-head{padding-top:8px!important}
  @media(min-width:1200px){
    main{padding-left:20px!important;padding-right:20px!important}
    .front-office-layout{grid-template-columns:minmax(350px,24%) minmax(620px,1fr) minmax(380px,26%)!important;gap:18px!important}
  }
  @media(min-width:1500px){
    main{padding-left:24px!important;padding-right:24px!important}
    .front-office-layout{grid-template-columns:minmax(390px,24%) minmax(760px,1fr) minmax(420px,25%)!important;gap:22px!important}
  }
  .status-line>span:not(.status-chip){display:none!important}
  .scout-context span:first-child{font-weight:760!important;color:#2d3035!important}
`;
document.head.appendChild(qaStyle);

const polishSprintStyle=document.createElement('style');
polishSprintStyle.textContent=`
  /* Executive hierarchy */
  .front-office-topline{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;min-height:132px!important;padding:28px 30px!important}
  .franchise-heading{align-items:center!important}
  .franchise-logo{width:78px!important;height:78px!important;box-shadow:0 10px 26px rgba(0,0,0,.18)!important}
  .front-office-topline h2{font-size:clamp(38px,3.4vw,58px)!important;letter-spacing:-.055em!important;margin:4px 0!important}
  .clock-inline{min-width:260px!important;justify-content:flex-end!important}
  .clock-inline>div:first-child{text-align:right!important}
  .pick-badge{width:86px!important;height:86px!important;font-size:38px!important}

  /* Goose becomes the visual anchor */
  .goose-desk{position:relative!important;overflow:hidden!important;padding:32px!important;border-top:0!important;border-left:6px solid var(--orange)!important;background:linear-gradient(135deg,#fff 0%,#f7f8fa 68%,#eef0f3 100%)!important;box-shadow:0 18px 42px rgba(31,34,39,.11)!important}
  .goose-desk::after{content:'G';position:absolute!important;right:26px!important;bottom:-42px!important;font-size:190px!important;font-weight:900!important;line-height:1!important;color:rgba(244,122,0,.055)!important;pointer-events:none!important}
  .gm-identity{display:flex!important;align-items:center!important;gap:14px!important;margin-bottom:26px!important}
  .gm-mark{width:52px!important;height:52px!important;border-radius:16px!important;font-size:22px!important;box-shadow:0 10px 22px rgba(244,122,0,.24)!important}
  .goose-desk .executive-briefing{position:relative!important;z-index:1!important;max-width:900px!important}
  .goose-desk .executive-briefing h2{font-size:clamp(34px,3vw,52px)!important;margin:8px 0 12px!important}
  .goose-desk .executive-briefing p{font-size:18px!important;line-height:1.58!important;max-width:760px!important}
  .briefing-actions{position:relative!important;z-index:1!important;margin-top:24px!important}
  .briefing-actions .btn{min-height:48px!important;padding:13px 20px!important;border-radius:13px!important;font-size:14px!important}

  /* Front Office spacing rhythm */
  .fo-left,.fo-center,.fo-right{display:grid!important;gap:18px!important;align-content:start!important}
  .fo-panel,.goose-desk{margin:0!important}
  .fo-panel .panel-head{margin-bottom:16px!important}
  .organization-panel,.scouting-panel,.decision-panel,.projection-panel,.wishlist-panel,.radar-panel{padding:22px!important}
  .scouting-summary{grid-template-columns:repeat(4,minmax(0,1fr))!important}
  .scouting-summary>div{min-height:86px!important;display:flex!important;flex-direction:column!important;justify-content:center!important}

  /* Decision Paths now read as decisions */
  .decision-futures{gap:16px!important}
  .future-path{position:relative!important;min-height:178px!important;padding:20px 20px 18px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease!important}
  .future-path:hover{transform:translateY(-2px)!important;box-shadow:0 10px 24px rgba(31,34,39,.09)!important;border-color:#c6cbd1!important}
  .future-path.recommended{background:linear-gradient(180deg,#fff8f1,#fff)!important;border-color:#edb37d!important}
  .future-path>span{display:inline-flex!important;align-self:flex-start!important;padding:5px 8px!important;border-radius:999px!important;background:#f2f3f5!important;font-size:9px!important;font-weight:820!important;letter-spacing:.08em!important}
  .future-path.recommended>span{background:#ffe6cf!important;color:#8d4200!important}
  .future-path h4{font-size:22px!important;line-height:1.12!important;margin:18px 0 4px!important;letter-spacing:-.025em!important}
  .future-path p{font-size:13px!important;color:#656a72!important;margin:0 0 12px!important}
  .future-path .text-btn{align-self:flex-start!important;padding:0!important;font-weight:760!important}

  /* Player list density and scanning */
  .scout-player{grid-template-columns:64px minmax(250px,1.35fr) minmax(310px,.9fr) minmax(360px,1fr)!important;gap:18px!important;padding:16px 18px!important;border-radius:17px!important;align-items:center!important}
  .scouting-photo{width:60px!important;height:60px!important;border-radius:16px!important}
  .scout-copy{min-width:0!important}
  .scout-copy .player-name{font-size:18px!important;line-height:1.18!important;margin-bottom:3px!important}
  .scout-copy .player-meta{font-size:12px!important;color:#636972!important}
  .status-line{margin-top:7px!important}
  .scout-context{display:flex!important;gap:8px!important;align-items:center!important;margin-top:8px!important}
  .scout-context span{display:inline-flex!important;padding:5px 8px!important;border-radius:999px!important;background:#f0f2f4!important;border:1px solid #d9dde1!important;font-size:10px!important;white-space:nowrap!important}
  .scout-metrics{display:grid!important;grid-template-columns:repeat(4,minmax(66px,1fr))!important;gap:8px!important}
  .scout-metrics>div{min-height:66px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;border-radius:12px!important;background:#f7f8f9!important}
  .scout-metrics b{font-size:20px!important}
  .scout-actions{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:12px!important;align-items:center!important}
  .quick-scout-row{display:grid!important;grid-template-columns:repeat(4,minmax(72px,1fr))!important;gap:8px!important}
  .quick-scout{min-height:42px!important;border-radius:11px!important}
  .row-tools{justify-self:end!important}
  .details-btn{min-height:42px!important;padding:0 16px!important;border-radius:11px!important;font-weight:760!important}

  /* Cleaner projection and wishlist rows */
  .projected-draft button,.wishlist-group button,.wishlist-intel>button{transition:background .15s ease,border-color .15s ease,transform .15s ease!important}
  .projected-draft button:hover,.wishlist-group button:hover,.wishlist-intel>button:hover{background:#fafbfc!important;border-color:#c6cbd1!important;transform:translateY(-1px)!important}

  @media(max-width:1350px){
    .scout-player{grid-template-columns:60px minmax(220px,1.1fr) minmax(280px,.9fr)!important}
    .scout-actions{grid-column:2/-1!important}
  }
  @media(max-width:900px){
    .front-office-topline{grid-template-columns:1fr!important;gap:18px!important}
    .clock-inline{justify-content:flex-start!important}.clock-inline>div:first-child{text-align:left!important}
    .scout-player{grid-template-columns:56px 1fr!important}
    .scout-metrics,.scout-actions{grid-column:1/-1!important}
  }
`;
document.head.appendChild(polishSprintStyle);

function boardRole(player){
  const pos=String(player?.pos||'').toUpperCase();
  const rank=Number(player?.posRank||999);
  const risk=String(player?.risk||'Medium').toLowerCase();
  const name=String(player?.name||'');
  const projection=Number(player?.proj||0);
  let primary='Bench';
  if(pos==='QB') primary=rank<=10?'QB1':rank<=20?'QB2':rank<=28?'Flex':'Bench';
  else if(pos==='RB') primary=rank<=12?'RB1':rank<=26?'RB2':rank<=42?'Flex':'Bench';
  else if(pos==='WR') primary=rank<=15?'WR1':rank<=32?'WR2':rank<=52?'Flex':'Bench';
  else if(pos==='TE') primary=rank<=8?'TE1':rank<=16?'TE2':rank<=24?'Flex':'Bench';
  else if(pos==='K'||pos==='DEF') primary=rank<=10?`${pos}1`:'Bench';
  const developmentalNames=['Fernando Mendoza','Drew Allar','Nico Iamaleava','Dante Moore','LaNorris Sellers'];
  const highUpsideNames=['Jaxson Dart','Tyler Shough','Jeremiyah Love','Cam Skattebo','TreVeyon Henderson','Quinshon Judkins'];
  const opportunityNames=['Malik Willis','Michael Penix Jr.','Shedeur Sanders'];
  let secondary='';
  if(developmentalNames.includes(name)) secondary='Developmental';
  else if(highUpsideNames.includes(name)) secondary='High Upside';
  else if(opportunityNames.includes(name)) secondary='Upside if Starts';
  else if(primary==='Bench'&&risk==='high'&&projection>0) secondary='High Upside';
  return secondary?`${primary} · ${secondary}`:primary;
}
try{microTier=boardRole;roleLabel=boardRole;}catch{}

function migratePattiMayo(){
  try{
    if(typeof KEEPERS!=='undefined'&&KEEPERS.Patti&&!KEEPERS['Patti Mayo'])KEEPERS['Patti Mayo']=[...KEEPERS.Patti];
    if(typeof BASE_TEAMS!=='undefined'){const index=BASE_TEAMS.indexOf('Patti');if(index>=0)BASE_TEAMS[index]='Patti Mayo';}
    if(typeof state!=='undefined'&&Array.isArray(state.teams))state.teams=state.teams.map(team=>team==='Patti'?'Patti Mayo':team);
    if(typeof MASTER_PLAYERS!=='undefined')MASTER_PLAYERS.forEach(player=>{if(player.keeperOwner==='Patti')player.keeperOwner='Patti Mayo';});
    if(typeof saveSoon==='function')saveSoon();
    if(typeof activeView!=='undefined'&&activeView==='league'&&typeof renderLeague==='function')renderLeague();
  }catch{}
}
migratePattiMayo();

const PHOTO_CACHE_KEY='the-board-player-photo-map-v1';
let playerPhotoMap=new Map();
let photoLoadStarted=false;
function normalizePhotoName(value){return String(value||'').replace(/\s+/g,' ').trim().toLowerCase();}
function loadCachedPhotoMap(){try{playerPhotoMap=new Map(Object.entries(JSON.parse(localStorage.getItem(PHOTO_CACHE_KEY)||'{}')));}catch{playerPhotoMap=new Map();}}
function playerNameForPhotoNode(node){
  const row=node.closest('[data-player-row]');if(row?.dataset.playerRow)return decodeURIComponent(row.dataset.playerRow);
  const clickable=node.closest('[data-player]');if(clickable?.dataset.player)return decodeURIComponent(clickable.dataset.player);
  const modal=node.closest('#playerModalContent');const modalName=modal?.querySelector('.player-profile-head h2')?.textContent;if(modalName)return modalName.trim();
  return node.closest('article,button,div')?.querySelector?.('.player-name')?.textContent?.trim()||'';
}
function applyPlayerPhotos(root=document){
  root.querySelectorAll('.player-photo').forEach(node=>{
    if(node.querySelector('img'))return;
    const displayName=playerNameForPhotoNode(node);const playerId=playerPhotoMap.get(normalizePhotoName(displayName));if(!playerId)return;
    const img=document.createElement('img');img.alt=displayName;img.loading='lazy';img.decoding='async';img.src=`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;img.addEventListener('error',()=>img.remove(),{once:true});node.prepend(img);
  });
}
async function loadPlayerPhotosLazily(){
  if(photoLoadStarted)return;photoLoadStarted=true;loadCachedPhotoMap();applyPlayerPhotos();if(playerPhotoMap.size>200)return;
  try{const response=await fetch('https://api.sleeper.app/v1/players/nfl?active=true');if(!response.ok)return;const payload=await response.json();const compact={};Object.entries(payload).forEach(([id,player])=>{const name=player.full_name||[player.first_name,player.last_name].filter(Boolean).join(' ');if(name)compact[normalizePhotoName(name)]=id;});playerPhotoMap=new Map(Object.entries(compact));try{localStorage.setItem(PHOTO_CACHE_KEY,JSON.stringify(compact));}catch{}applyPlayerPhotos();}catch{}
}
const observer=new MutationObserver(mutations=>{for(const mutation of mutations){mutation.addedNodes.forEach(node=>{if(!(node instanceof Element))return;if(node.matches('.player-photo')||node.querySelector('.player-photo'))applyPlayerPhotos(node.matches('.player-photo')?(node.parentElement||node):node);});}});
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',()=>{migratePattiMayo();const schedule=window.requestIdleCallback||(callback=>setTimeout(callback,1800));schedule(loadPlayerPhotosLazily,{timeout:4500});},{once:true});
