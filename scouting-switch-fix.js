'use strict';

const uiLink=document.createElement('link');
uiLink.rel='stylesheet';
uiLink.href='fortune-ui.css?v=5';
document.head.appendChild(uiLink);

const qaStyle=document.createElement('style');
qaStyle.textContent=`
.scout-metrics span{color:#6b7078!important;opacity:1!important;font-weight:750!important}.scout-metrics b{color:#24262a!important;opacity:1!important;font-weight:800!important}.scout-metrics>div{border-color:#cfd3d8!important}
.modal{padding-top:78px!important;padding-bottom:24px!important;align-items:start!important;overflow-y:auto!important}.player-modal-card{margin:0 auto 28px!important;max-height:none!important;overflow:visible!important}.player-profile-head{padding-top:8px!important}
.status-line>span:not(.status-chip){display:none!important}.scout-context span:first-child{font-weight:760!important;color:#2d3035!important}
.engine-factor-line{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.engine-factor-line span{padding:6px 9px;border:1px solid #d8dce1;border-radius:999px;background:#fff;color:#555a62;font-size:11px;font-weight:750}.future-path small{display:block;min-height:34px;margin:8px 0 12px;color:#676c74;line-height:1.35}
@media(min-width:1200px){main{padding-left:20px!important;padding-right:20px!important}.front-office-layout{grid-template-columns:minmax(350px,24%) minmax(620px,1fr) minmax(380px,26%)!important;gap:18px!important}}@media(min-width:1500px){main{padding-left:24px!important;padding-right:24px!important}.front-office-layout{grid-template-columns:minmax(390px,24%) minmax(760px,1fr) minmax(420px,25%)!important;gap:22px!important}}
`;
document.head.appendChild(qaStyle);

function boardRole(player){
  const pos=String(player?.pos||'').toUpperCase(),rank=Number(player?.posRank||999),risk=String(player?.risk||'Medium').toLowerCase(),name=String(player?.name||''),projection=Number(player?.proj||0);
  let primary='Bench';
  if(pos==='QB')primary=rank<=10?'QB1':rank<=20?'QB2':rank<=28?'Flex':'Bench';else if(pos==='RB')primary=rank<=12?'RB1':rank<=26?'RB2':rank<=42?'Flex':'Bench';else if(pos==='WR')primary=rank<=15?'WR1':rank<=32?'WR2':rank<=52?'Flex':'Bench';else if(pos==='TE')primary=rank<=8?'TE1':rank<=16?'TE2':rank<=24?'Flex':'Bench';else if(pos==='K'||pos==='DEF')primary=rank<=10?`${pos}1`:'Bench';
  const developmental=['Fernando Mendoza','Drew Allar','Nico Iamaleava','Dante Moore','LaNorris Sellers'],highUpside=['Jaxson Dart','Tyler Shough','Jeremiyah Love','Cam Skattebo','TreVeyon Henderson','Quinshon Judkins'],opportunity=['Malik Willis','Michael Penix Jr.','Shedeur Sanders'];
  let secondary='';if(developmental.includes(name))secondary='Developmental';else if(highUpside.includes(name))secondary='High Upside';else if(opportunity.includes(name))secondary='Upside if Starts';else if(primary==='Bench'&&risk==='high'&&projection>0)secondary='High Upside';
  return secondary?`${primary} · ${secondary}`:primary;
}
try{microTier=boardRole;roleLabel=boardRole;}catch{}

function migratePattiMayo(){try{if(typeof KEEPERS!=='undefined'&&KEEPERS.Patti&&!KEEPERS['Patti Mayo'])KEEPERS['Patti Mayo']=[...KEEPERS.Patti];if(typeof BASE_TEAMS!=='undefined'){const i=BASE_TEAMS.indexOf('Patti');if(i>=0)BASE_TEAMS[i]='Patti Mayo';}if(typeof state!=='undefined'&&Array.isArray(state.teams))state.teams=state.teams.map(t=>t==='Patti'?'Patti Mayo':t);if(typeof MASTER_PLAYERS!=='undefined')MASTER_PLAYERS.forEach(p=>{if(p.keeperOwner==='Patti')p.keeperOwner='Patti Mayo';});if(typeof saveSoon==='function')saveSoon();}catch{}}
migratePattiMayo();

const PHOTO_CACHE_KEY='the-board-player-photo-map-v1';let playerPhotoMap=new Map(),photoLoadStarted=false;
function normalizePhotoName(v){return String(v||'').replace(/\s+/g,' ').trim().toLowerCase();}
function loadCachedPhotoMap(){try{playerPhotoMap=new Map(Object.entries(JSON.parse(localStorage.getItem(PHOTO_CACHE_KEY)||'{}')));}catch{playerPhotoMap=new Map();}}
function playerNameForPhotoNode(node){const row=node.closest('[data-player-row]');if(row?.dataset.playerRow)return decodeURIComponent(row.dataset.playerRow);const click=node.closest('[data-player]');if(click?.dataset.player)return decodeURIComponent(click.dataset.player);const modal=node.closest('#playerModalContent')?.querySelector('.player-profile-head h2')?.textContent;if(modal)return modal.trim();return node.closest('article,button,div')?.querySelector?.('.player-name')?.textContent?.trim()||'';}
function applyPlayerPhotos(root=document){root.querySelectorAll('.player-photo').forEach(node=>{if(node.querySelector('img'))return;const name=playerNameForPhotoNode(node),id=playerPhotoMap.get(normalizePhotoName(name));if(!id)return;const img=document.createElement('img');img.alt=name;img.loading='lazy';img.decoding='async';img.src=`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;img.addEventListener('error',()=>img.remove(),{once:true});node.prepend(img);});}
async function loadPlayerPhotosLazily(){if(photoLoadStarted)return;photoLoadStarted=true;loadCachedPhotoMap();applyPlayerPhotos();if(playerPhotoMap.size>200)return;try{const response=await fetch('https://api.sleeper.app/v1/players/nfl?active=true');if(!response.ok)return;const payload=await response.json(),compact={};Object.entries(payload).forEach(([id,p])=>{const name=p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ');if(name)compact[normalizePhotoName(name)]=id;});playerPhotoMap=new Map(Object.entries(compact));try{localStorage.setItem(PHOTO_CACHE_KEY,JSON.stringify(compact));}catch{}applyPlayerPhotos();}catch{}}
const observer=new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(node=>{if(!(node instanceof Element))return;if(node.matches('.player-photo')||node.querySelector('.player-photo'))applyPlayerPhotos(node.matches('.player-photo')?(node.parentElement||node):node);});});observer.observe(document.body,{childList:true,subtree:true});

function loadDecisionEngine(){if(document.querySelector('script[data-decision-engine]'))return;const script=document.createElement('script');script.src='decision-engine.js?v=1';script.dataset.decisionEngine='true';script.addEventListener('load',()=>{if(typeof activeView!=='undefined'&&activeView==='warroom'&&typeof renderWarroom==='function')renderWarroom();},{once:true});document.body.appendChild(script);}
window.addEventListener('load',()=>{migratePattiMayo();loadDecisionEngine();const schedule=window.requestIdleCallback||(cb=>setTimeout(cb,1800));schedule(loadPlayerPhotosLazily,{timeout:4500});},{once:true});
