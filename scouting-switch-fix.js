'use strict';

// Load the consolidated enterprise UI stylesheet. This replaces the accumulated
// inline overrides while leaving the fast application runtime untouched.
const uiLink=document.createElement('link');
uiLink.rel='stylesheet';
uiLink.href='fortune-ui.css?v=2';
document.head.appendChild(uiLink);

// Final targeted corrections based on desktop QA.
const qaStyle=document.createElement('style');
qaStyle.textContent=`
  /* Player metrics must remain readable on the light surface. */
  .scout-metrics span{color:#6b7078!important;opacity:1!important;font-weight:750!important}
  .scout-metrics b{color:#24262a!important;opacity:1!important;font-weight:800!important}
  .scout-metrics>div{border-color:#cfd3d8!important}

  /* Keep the fixed navigation from clipping the top of player details. */
  .modal{padding-top:78px!important;padding-bottom:24px!important;align-items:start!important;overflow-y:auto!important}
  .player-modal-card{margin:0 auto 28px!important;max-height:none!important;overflow:visible!important}
  .player-profile-head{padding-top:8px!important}

  /* Use a little more of wide desktop screens without making the rails dominant. */
  @media(min-width:1200px){
    main{padding-left:20px!important;padding-right:20px!important}
    .front-office-layout{grid-template-columns:minmax(350px,24%) minmax(620px,1fr) minmax(380px,26%)!important;gap:18px!important}
  }
  @media(min-width:1500px){
    main{padding-left:24px!important;padding-right:24px!important}
    .front-office-layout{grid-template-columns:minmax(390px,24%) minmax(760px,1fr) minmax(420px,25%)!important;gap:22px!important}
  }
`;
document.head.appendChild(qaStyle);

// Migrate the old owner key so the League page and keeper ownership use the
// current franchise name everywhere.
function migratePattiMayo(){
  try{
    if(typeof KEEPERS!=='undefined'&&KEEPERS.Patti&&!KEEPERS['Patti Mayo']){
      KEEPERS['Patti Mayo']=[...KEEPERS.Patti];
    }
    if(typeof BASE_TEAMS!=='undefined'){
      const index=BASE_TEAMS.indexOf('Patti');
      if(index>=0)BASE_TEAMS[index]='Patti Mayo';
    }
    if(typeof state!=='undefined'&&Array.isArray(state.teams)){
      state.teams=state.teams.map(team=>team==='Patti'?'Patti Mayo':team);
    }
    if(typeof MASTER_PLAYERS!=='undefined'){
      MASTER_PLAYERS.forEach(player=>{
        if(player.keeperOwner==='Patti')player.keeperOwner='Patti Mayo';
      });
    }
    if(typeof saveSoon==='function')saveSoon();
    if(typeof activeView!=='undefined'&&activeView==='league'&&typeof renderLeague==='function')renderLeague();
  }catch{}
}
migratePattiMayo();

const PHOTO_CACHE_KEY='the-board-player-photo-map-v1';
let playerPhotoMap=new Map();
let photoLoadStarted=false;

function normalizePhotoName(value){
  return String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
}

function loadCachedPhotoMap(){
  try{
    playerPhotoMap=new Map(Object.entries(JSON.parse(localStorage.getItem(PHOTO_CACHE_KEY)||'{}')));
  }catch{
    playerPhotoMap=new Map();
  }
}

function playerNameForPhotoNode(node){
  const row=node.closest('[data-player-row]');
  if(row?.dataset.playerRow)return decodeURIComponent(row.dataset.playerRow);

  const clickable=node.closest('[data-player]');
  if(clickable?.dataset.player)return decodeURIComponent(clickable.dataset.player);

  const modal=node.closest('#playerModalContent');
  const modalName=modal?.querySelector('.player-profile-head h2')?.textContent;
  if(modalName)return modalName.trim();

  return node.closest('article,button,div')?.querySelector?.('.player-name')?.textContent?.trim()||'';
}

function applyPlayerPhotos(root=document){
  root.querySelectorAll('.player-photo').forEach(node=>{
    if(node.querySelector('img'))return;
    const displayName=playerNameForPhotoNode(node);
    const playerId=playerPhotoMap.get(normalizePhotoName(displayName));
    if(!playerId)return;

    const img=document.createElement('img');
    img.alt=displayName;
    img.loading='lazy';
    img.decoding='async';
    img.src=`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
    img.addEventListener('error',()=>img.remove(),{once:true});
    node.prepend(img);
  });
}

async function loadPlayerPhotosLazily(){
  if(photoLoadStarted)return;
  photoLoadStarted=true;
  loadCachedPhotoMap();
  applyPlayerPhotos();
  if(playerPhotoMap.size>200)return;

  try{
    const response=await fetch('https://api.sleeper.app/v1/players/nfl?active=true');
    if(!response.ok)return;
    const payload=await response.json();
    const compact={};
    Object.entries(payload).forEach(([id,player])=>{
      const name=player.full_name||[player.first_name,player.last_name].filter(Boolean).join(' ');
      if(name)compact[normalizePhotoName(name)]=id;
    });
    playerPhotoMap=new Map(Object.entries(compact));
    try{localStorage.setItem(PHOTO_CACHE_KEY,JSON.stringify(compact));}catch{}
    applyPlayerPhotos();
  }catch{}
}

const observer=new MutationObserver(mutations=>{
  for(const mutation of mutations){
    mutation.addedNodes.forEach(node=>{
      if(!(node instanceof Element))return;
      if(node.matches('.player-photo')||node.querySelector('.player-photo')){
        applyPlayerPhotos(node.matches('.player-photo')?(node.parentElement||node):node);
      }
    });
  }
});
observer.observe(document.body,{childList:true,subtree:true});

window.addEventListener('load',()=>{
  migratePattiMayo();
  const schedule=window.requestIdleCallback||(callback=>setTimeout(callback,1800));
  schedule(loadPlayerPhotosLazily,{timeout:4500});
},{once:true});
