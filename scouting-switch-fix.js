'use strict';

// Load the consolidated enterprise UI stylesheet. This replaces the accumulated
// inline overrides while leaving the fast application runtime untouched.
const uiLink=document.createElement('link');
uiLink.rel='stylesheet';
uiLink.href='fortune-ui.css?v=1';
document.head.appendChild(uiLink);

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
  const schedule=window.requestIdleCallback||(callback=>setTimeout(callback,1800));
  schedule(loadPlayerPhotosLazily,{timeout:4500});
},{once:true});
