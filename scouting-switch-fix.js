'use strict';

// THE BOARD — targeted presentation repair. Keeps the fast runtime untouched.
const repairStyle = document.createElement('style');
repairStyle.textContent = `
:root{
  --shell:#dfe2e6;--canvas:#eef0f2;--surface:#ffffff;--surface-soft:#f4f5f6;
  --smoke:#35383e;--smoke-soft:#e3e5e8;--ink:#1b1c1f;--muted-ui:#63676e;
  --accent:#f47a00;--accent-dark:#a94f00;--border:#cfd3d8
}
html{scroll-padding-top:58px!important;background:var(--shell)!important}
body{margin:0!important;background:linear-gradient(180deg,#f5f6f7 0,#e7e9ec 100%)!important;color:var(--ink)!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important}
body,button,input,select,textarea{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important}

/* Large brand header scrolls normally. Only the compact navigation remains pinned. */
.topbar{position:relative!important;top:auto!important;z-index:20!important;background:#fff!important;border-bottom:1px solid var(--border)!important;box-shadow:none!important}
.tabs{position:sticky!important;top:0!important;z-index:100!important;background:rgba(53,56,62,.97)!important;border-bottom:1px solid #22252a!important;box-shadow:0 5px 16px rgba(20,22,26,.18)!important;backdrop-filter:blur(12px)!important}
.tab{color:#dfe2e6!important;font-size:13px!important;font-weight:700!important;letter-spacing:0!important}
.tab.active{background:var(--accent)!important;color:#fff!important}

/* Use the desktop canvas. */
main{width:100%!important;max-width:none!important;margin:0!important;padding:20px clamp(18px,2.2vw,38px) 46px!important;background:transparent!important}
.front-office-shell{width:100%!important;max-width:none!important;margin:0!important}
.front-office-layout{display:grid!important;grid-template-columns:minmax(285px,22%) minmax(500px,1fr) minmax(320px,25%)!important;gap:18px!important;align-items:start!important;width:100%!important}
.fo-left,.fo-center,.fo-right{min-width:0!important;width:100%!important}
.front-office-topline{width:100%!important;margin-bottom:18px!important;padding:22px 24px!important;border-radius:22px!important;background:linear-gradient(135deg,#3a3d43,#272a2f)!important;color:#fff!important;border:1px solid #202328!important;box-shadow:0 12px 28px rgba(32,35,40,.18)!important}
.front-office-topline h2,.front-office-topline span,.front-office-topline strong,.front-office-topline .eyebrow{color:#fff!important}

/* One typography scale, no spreadsheet look. */
.brand h1{font-size:31px!important;line-height:1!important;font-weight:800!important;letter-spacing:-.035em!important}
.brand p{font-size:11px!important;font-weight:650!important;letter-spacing:.045em!important}
.front-office-topline h2,.goose-desk h2,.panel h2,.scouting-hero h2{font-size:clamp(27px,2.1vw,38px)!important;line-height:1.08!important;font-weight:760!important;letter-spacing:-.038em!important}
.fo-panel h3,.goose-desk h3,.panel h3{font-size:18px!important;line-height:1.2!important;font-weight:740!important;letter-spacing:-.018em!important}
.eyebrow,.gm-kicker{font-size:10px!important;font-weight:760!important;letter-spacing:.09em!important}
p,small,.player-meta,.player-signal,.status-line,.scout-context{line-height:1.45!important}

/* Product surfaces. */
.fo-panel,.goose-desk,.panel{background:var(--surface)!important;border:1px solid var(--border)!important;border-radius:20px!important;box-shadow:0 7px 22px rgba(39,43,49,.08)!important}
.goose-desk{border-top:4px solid var(--accent)!important;padding:24px!important}
.organization-panel,.wishlist-panel{background:linear-gradient(180deg,#fff,#f7f8f9)!important}
.scouting-panel,.projection-panel,.radar-panel{background:linear-gradient(180deg,#f2f3f5,#e8eaed)!important}
.decision-panel{background:linear-gradient(180deg,#fff,#f4f5f6)!important}

/* Give the roster rail room to breathe. */
.organization-panel{padding:18px!important}
.roster-command{display:grid!important;gap:7px!important}
.roster-command-row{display:grid!important;grid-template-columns:42px minmax(50px,1fr) auto!important;align-items:center!important;gap:10px!important;min-height:42px!important;padding:9px 11px!important;background:#eef0f2!important;border:1px solid #d7dade!important;border-radius:11px!important}
.roster-command-row span{font-size:14px!important;font-weight:760!important}
.roster-command-row b{font-size:14px!important;color:#292b30!important}
.roster-command-row i{justify-self:end!important;padding:5px 9px!important;border-radius:999px!important;background:#fff3e8!important;color:var(--accent-dark)!important;border:1px solid #efc49d!important;font-size:11px!important;font-style:normal!important;white-space:nowrap!important}
.roster-list{gap:7px!important;margin-top:10px!important}
.roster-row{display:grid!important;grid-template-columns:36px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;min-height:48px!important;padding:10px 12px!important;background:#f7f8f9!important;border:1px solid #dde0e4!important;border-radius:12px!important;box-shadow:none!important}
.roster-row b{font-size:14px!important}.roster-row span:nth-child(2){font-size:14px!important;line-height:1.25!important}.keeper-label{font-size:10px!important;white-space:nowrap!important;color:var(--accent-dark)!important}
.current-objective{margin-top:12px!important;padding:14px!important;background:var(--smoke)!important;color:#fff!important;border-radius:13px!important;box-shadow:none!important}
.current-objective .eyebrow,.current-objective strong{color:#fff!important}

/* Center decision workspace. */
.gm-identity{margin-bottom:20px!important}.gm-mark{background:var(--accent)!important;color:#fff!important}
.goose-desk .executive-briefing{max-width:760px!important}
.goose-desk .executive-briefing p{font-size:16px!important;color:#555a61!important}
.briefing-actions{gap:10px!important}.btn.primary{background:var(--accent)!important;color:#fff!important}.btn.ghost,.btn.secondary{background:#fff!important;color:#282b30!important;border:1px solid #cbd0d5!important}
.decision-futures{gap:12px!important}.future-path{min-width:0!important;padding:16px!important;background:#fff!important;border:1px solid #d5d8dd!important;border-radius:14px!important;box-shadow:none!important}.future-path.recommended{border-top:4px solid var(--accent)!important}.future-path>span{color:var(--accent-dark)!important}
.projected-draft{gap:8px!important}.projected-draft button{display:grid!important;grid-template-columns:34px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;min-height:48px!important;padding:10px 12px!important;background:#fff!important;border:1px solid #d5d8dd!important;border-radius:12px!important;box-shadow:none!important;text-align:left!important}.projected-draft button>span{display:grid!important;place-items:center!important;width:30px!important;height:30px!important;border-radius:9px!important;background:var(--smoke)!important;color:#fff!important}.projected-draft b{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.projected-draft small{white-space:nowrap!important;color:var(--muted-ui)!important}

/* Rebuild wishlist items as real two-line rows, not spreadsheet cells. */
.wishlist-panel{padding:18px!important}
.wishlist-intel,.wishlist-group{display:grid!important;gap:8px!important}
.wishlist-group>span{display:block!important;margin:4px 0 2px!important;font-size:10px!important;font-weight:780!important;letter-spacing:.08em!important;color:var(--accent-dark)!important}
.wishlist-group button,.wishlist-intel>button{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;column-gap:12px!important;row-gap:3px!important;align-items:center!important;width:100%!important;min-height:54px!important;padding:10px 12px!important;background:#fff!important;border:1px solid #d4d8dd!important;border-radius:12px!important;box-shadow:none!important;text-align:left!important;overflow:hidden!important}
.wishlist-group button b,.wishlist-intel>button b{grid-column:1!important;grid-row:1!important;min-width:0!important;font-size:14px!important;line-height:1.2!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#202226!important}
.wishlist-group button small,.wishlist-intel>button small{grid-column:1 / -1!important;grid-row:2!important;display:block!important;min-width:0!important;font-size:11px!important;line-height:1.25!important;color:var(--muted-ui)!important;white-space:normal!important;overflow:visible!important}
.wishlist-group button::after,.wishlist-intel>button::after{content:'›';grid-column:2!important;grid-row:1!important;font-size:20px!important;color:#9a9ea5!important}
.radar-callout{padding:15px!important;background:var(--smoke)!important;color:#fff!important;border:0!important;border-radius:13px!important;box-shadow:none!important}.radar-callout span,.radar-callout b,.radar-callout small{color:#fff!important}

/* Preserve matching player surfaces. */
.scout-player,.board-player,.team-card{background:#fff!important;border:1px solid #d3d7dc!important;box-shadow:0 4px 14px rgba(39,43,49,.07)!important}
.player-photo{position:relative!important;overflow:hidden!important;background:linear-gradient(145deg,#eceef1,#d9dde2)!important;border-color:#c7cbd1!important}
.player-photo img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;z-index:2!important}
.icon-btn,.details-btn,.quick-scout{background:#fff!important;color:#292b2f!important;border-color:#c9cdd2!important}.quick-scout.active{background:#fff0e3!important;color:var(--accent-dark)!important;border-color:#e9a365!important}.draft-btn{background:var(--accent)!important;color:#fff!important}

.view,.panel,.scouting-hero{scroll-margin-top:58px!important}
@media(max-width:1180px){.front-office-layout{grid-template-columns:minmax(250px,28%) minmax(440px,1fr)!important}.fo-right{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important}}
@media(max-width:820px){main{padding:14px 12px 34px!important}.front-office-layout{display:block!important}.fo-left,.fo-center,.fo-right{display:block!important}.fo-panel,.goose-desk{margin-bottom:14px!important}.tabs{top:0!important}}
`;
document.head.appendChild(repairStyle);

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
function applyPlayerPhotos(root=document){root.querySelectorAll('.player-photo').forEach(node=>{if(node.querySelector('img'))return;const displayName=playerNameForPhotoNode(node);const playerId=playerPhotoMap.get(normalizePhotoName(displayName));if(!playerId)return;const img=document.createElement('img');img.alt=displayName;img.loading='lazy';img.decoding='async';img.src=`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;img.addEventListener('error',()=>img.remove(),{once:true});node.prepend(img);});}
async function loadPlayerPhotosLazily(){if(photoLoadStarted)return;photoLoadStarted=true;loadCachedPhotoMap();applyPlayerPhotos();if(playerPhotoMap.size>200)return;try{const response=await fetch('https://api.sleeper.app/v1/players/nfl?active=true');if(!response.ok)return;const payload=await response.json();const compact={};Object.entries(payload).forEach(([id,player])=>{const name=player.full_name||[player.first_name,player.last_name].filter(Boolean).join(' ');if(name)compact[normalizePhotoName(name)]=id;});playerPhotoMap=new Map(Object.entries(compact));try{localStorage.setItem(PHOTO_CACHE_KEY,JSON.stringify(compact));}catch{}applyPlayerPhotos();}catch{}}
const observer=new MutationObserver(mutations=>{for(const mutation of mutations){mutation.addedNodes.forEach(node=>{if(!(node instanceof Element))return;if(node.matches('.player-photo')||node.querySelector('.player-photo'))applyPlayerPhotos(node.matches('.player-photo')?(node.parentElement||node):node);});}});
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',()=>{const schedule=window.requestIdleCallback||(callback=>setTimeout(callback,1800));schedule(loadPlayerPhotosLazily,{timeout:4500});},{once:true});
