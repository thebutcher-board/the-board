'use strict';
(function(global){
  const VERSION='app-core-1.1.0';
  const STORAGE_KEY='the-board-app-state-v1';
  const LEGACY_KEYS=['the-board-fast-runtime','the-board-v1-2-scouting-controls','the-board-v1-ai-gm-canonical','the-board-v9','the-board-v8','the-board-v7','the-board-v6','the-board-v5','the-board-v4','the-board-v3','the-board-v2','the-board-v1'];
  const NAME_CORRECTIONS={'George KittleO':'George Kittle','James Cook':'James Cook III'};
  const DEFAULT_PROFILE={leagueName:'The League',teamName:'The Butcher',teamCount:10,keeperCount:5,bench:6,rosterSize:16,starterCount:10,ownerSkill:'Advanced',gmName:'Goose',rosterTargets:{QB:3,RB:4,WR:5,TE:2,K:1,DEF:1}};
  const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  const canonicalName=value=>{const raw=String(value||'').replace(/\s+/g,' ').trim();if(NAME_CORRECTIONS[raw])return NAME_CORRECTIONS[raw];return /[a-z.)][QDO]$/.test(raw)?raw.slice(0,-1):raw};
  const normalize=value=>canonicalName(value).toLowerCase();
  const slug=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const stablePlayerId=(player,index)=>String(player?.id||player?.playerId||player?.sleeperId||`nfl:${slug(canonicalName(player?.name))}:${slug(player?.team)}:${slug(player?.pos)}`||`legacy:${index}`);

  const sourcePlayers=Array.isArray(global.PLAYERS)?global.PLAYERS:[];
  const sourceKeepers=global.KEEPERS&&typeof global.KEEPERS==='object'?global.KEEPERS:{};
  const sourceTeams=Array.isArray(global.BASE_TEAMS)&&global.BASE_TEAMS.length?global.BASE_TEAMS:['Team 1','Team 2','Team 3','Team 4','Team 5','Team 6','Team 7','Team 8','Team 9','Team 10'];
  const keeperOwnership=new Map();
  Object.entries(sourceKeepers).forEach(([owner,names])=>(Array.isArray(names)?names:[]).forEach(name=>keeperOwnership.set(normalize(name),owner)));
  const players=sourcePlayers.map((raw,index)=>Object.freeze({...raw,id:stablePlayerId(raw,index),name:canonicalName(raw.name),keeperOwner:keeperOwnership.get(normalize(raw.name))||null}));
  const playerById=new Map(players.map(player=>[player.id,player]));
  const playerIdByName=new Map(players.map(player=>[normalize(player.name),player.id]));

  function defaultSlices(){return {schemaVersion:1,draft:{picks:[]},league:{teams:[...sourceTeams],slot:8,profile:clone(DEFAULT_PROFILE),keepers:clone(sourceKeepers)},scouting:{},settings:{},recommendations:{current:null,alternatives:[],likely:[],updatedAt:null},navigation:{route:'warroom'}}}
  function normalizePick(raw,index){
    if(!raw)return null;
    let playerId=raw.playerId||null;
    if(!playerId&&raw.id&&playerById.has(raw.id))playerId=raw.id;
    if(!playerId)playerId=playerIdByName.get(normalize(raw.name||raw.player?.name));
    if(!playerId||!playerById.has(playerId))return null;
    return {playerId,draftedBy:String(raw.draftedBy||raw.owner||''),pick:Number(raw.pick)||index+1};
  }
  function migrate(raw){
    const base=defaultSlices();
    if(!raw||typeof raw!=='object')return base;
    if(raw.schemaVersion===1&&raw.draft&&raw.league){
      base.draft.picks=(Array.isArray(raw.draft.picks)?raw.draft.picks:[]).map(normalizePick).filter(Boolean);
      base.league.teams=Array.isArray(raw.league.teams)&&raw.league.teams.length?[...raw.league.teams]:base.league.teams;
      base.league.slot=Number(raw.league.slot)||8;
      base.league.profile={...base.league.profile,...(raw.league.profile||{}),rosterTargets:{...DEFAULT_PROFILE.rosterTargets,...(raw.league.profile?.rosterTargets||{})}};
      base.league.keepers=raw.league.keepers&&typeof raw.league.keepers==='object'?clone(raw.league.keepers):base.league.keepers;
      base.scouting=raw.scouting&&typeof raw.scouting==='object'?{...raw.scouting}:{};
      base.settings=raw.settings&&typeof raw.settings==='object'?{...raw.settings}:{};
      base.recommendations=raw.recommendations&&typeof raw.recommendations==='object'?{...base.recommendations,...raw.recommendations}:base.recommendations;
      base.navigation=raw.navigation&&typeof raw.navigation==='object'?{...base.navigation,...raw.navigation}:base.navigation;
      return base;
    }
    base.draft.picks=(Array.isArray(raw.drafted)?raw.drafted:[]).map(normalizePick).filter(Boolean);
    base.league.teams=Array.isArray(raw.teams)&&raw.teams.length?[...raw.teams]:base.league.teams;
    base.league.slot=Number(raw.slot)||8;
    base.league.profile={...base.league.profile,...(raw.profile||{}),rosterTargets:{...DEFAULT_PROFILE.rosterTargets,...(raw.profile?.rosterTargets||{})}};
    base.scouting=raw.scouting&&typeof raw.scouting==='object'?{...raw.scouting}:{};
    return base;
  }
  function readStorage(){
    try{
      const current=localStorage.getItem(STORAGE_KEY);if(current)return migrate(JSON.parse(current));
      for(const key of LEGACY_KEYS){const raw=localStorage.getItem(key);if(raw)return migrate(JSON.parse(raw))}
    }catch{}
    return defaultSlices();
  }
  let slices=readStorage();
  const subscribers=new Set();
  const enrichedDraft=()=>slices.draft.picks.map(record=>{const player=playerById.get(record.playerId);return player?{...player,playerId:player.id,draftedBy:record.draftedBy,pick:record.pick}:null}).filter(Boolean);
  function snapshot(){return clone(slices)}
  function persist(reason='persist'){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(slices))}catch{}
    const detail={reason,state:snapshot(),drafted:enrichedDraft()};
    subscribers.forEach(fn=>{try{fn(detail)}catch{}});
    global.dispatchEvent?.(new CustomEvent('theboard:statechange',{detail}));
    return detail;
  }
  function player(value){if(!value)return null;if(typeof value==='object'&&value.id&&playerById.has(value.id))return playerById.get(value.id);if(playerById.has(String(value)))return playerById.get(String(value));return playerById.get(playerIdByName.get(normalize(typeof value==='object'?value.name:value)))||null}
  function draftOrderAt(index){const teams=slices.league.teams,count=Math.max(1,teams.length),round=Math.floor(index/count),slot=index%count;return round%2===0?teams[slot]:teams[count-1-slot]}
  function currentTeam(){return draftOrderAt(slices.draft.picks.length)}
  function isDrafted(value){const found=player(value);return Boolean(found&&slices.draft.picks.some(p=>p.playerId===found.id))}
  function draftPlayer(value){const found=player(value);if(!found)return {ok:false,error:'PLAYER_NOT_FOUND'};if(found.keeperOwner)return {ok:false,error:'PLAYER_IS_KEEPER',player:found};if(isDrafted(found))return {ok:false,error:'PLAYER_ALREADY_DRAFTED',player:found};const index=slices.draft.picks.length,record={playerId:found.id,draftedBy:draftOrderAt(index),pick:index+1};slices.draft.picks.push(record);persist('draft');return {ok:true,record:{...record,player:found},state:snapshot()}}
  function undoDraft(){const record=slices.draft.picks.pop();if(!record)return {ok:false,error:'NO_PICKS'};const found=playerById.get(record.playerId)||null;persist('undo');return {ok:true,record:{...record,player:found},state:snapshot()}}
  function resetDraft(){slices.draft.picks=[];for(const key of LEGACY_KEYS){try{localStorage.removeItem(key)}catch{}}persist('reset');return {ok:true,state:snapshot()}}
  function setScouting(value,tag){const found=player(value);if(!found)return {ok:false,error:'PLAYER_NOT_FOUND'};const key=normalize(found.name);if(tag)slices.scouting[key]=tag;else delete slices.scouting[key];persist('scouting');return {ok:true,player:found,tag:tag||null}}
  function updateLeague(patch={}){if(Array.isArray(patch.teams)&&patch.teams.length)slices.league.teams=[...patch.teams];if(patch.slot!=null)slices.league.slot=Number(patch.slot)||8;if(patch.profile)slices.league.profile={...slices.league.profile,...patch.profile,rosterTargets:{...DEFAULT_PROFILE.rosterTargets,...slices.league.profile.rosterTargets,...(patch.profile.rosterTargets||{})}};if(patch.keepers)slices.league.keepers=clone(patch.keepers);persist('league');return {ok:true,state:snapshot()}}
  function setRecommendations(next={}){slices.recommendations={...slices.recommendations,...next,updatedAt:Date.now()};persist('recommendations');return clone(slices.recommendations)}
  function navigate(route){slices.navigation.route=String(route||'warroom');persist('navigation');global.dispatchEvent?.(new CustomEvent('theboard:navigate',{detail:{route:slices.navigation.route}}));return slices.navigation.route}
  function rosterFor(team){const keepers=(slices.league.keepers?.[team]||[]).map(name=>{const found=player(name);return found?{...found,keeper:true}:{id:`keeper:${slug(name)}`,name:canonicalName(name),pos:'—',team:'—',keeper:true}});const picks=enrichedDraft().filter(p=>p.draftedBy===team);return [...keepers,...picks]}
  function contractForWidth(width){const w=Number(width)||0;if(w<768)return Object.freeze({mode:'phone',primary:true,columns:1,navigation:'bottom',detail:'sheet',minimumTarget:44});if(w<1180)return Object.freeze({mode:'tablet',primary:false,columns:2,navigation:'adaptive',detail:'sheet',minimumTarget:44});return Object.freeze({mode:'desktop',primary:false,columns:3,navigation:'integrated',detail:'panel',minimumTarget:40})}

  const draftedCompat=new Proxy([],{
    get(_,prop){const list=enrichedDraft();if(prop==='length')return list.length;if(prop==='toJSON')return()=>list;if(prop===Symbol.iterator)return list[Symbol.iterator].bind(list);if(prop==='push')return(...items)=>{items.forEach(item=>draftPlayer(item?.playerId||item?.id||item?.name||item));return enrichedDraft().length};if(prop==='pop')return()=>{const result=undoDraft();return result.ok&&result.record.player?{...result.record.player,playerId:result.record.player.id,draftedBy:result.record.draftedBy,pick:result.record.pick}:undefined};const value=list[prop];return typeof value==='function'?value.bind(list):value},
    set(){return false}
  });
  const scoutingCompat=new Proxy({}, {
    get(_,prop){if(prop==='toJSON')return()=>({...slices.scouting});return slices.scouting[prop]},
    set(_,prop,value){slices.scouting[prop]=value;persist('scouting');return true},
    deleteProperty(_,prop){delete slices.scouting[prop];persist('scouting');return true},
    ownKeys(){return Reflect.ownKeys(slices.scouting)},
    getOwnPropertyDescriptor(){return {enumerable:true,configurable:true}}
  });
  const legacyState=new Proxy({}, {
    get(_,prop){if(prop==='toJSON')return()=>({drafted:enrichedDraft(),teams:[...slices.league.teams],slot:slices.league.slot,profile:clone(slices.league.profile),scouting:{...slices.scouting},recommendations:clone(slices.recommendations),settings:clone(slices.settings)});if(prop==='drafted')return draftedCompat;if(prop==='teams')return slices.league.teams;if(prop==='slot')return slices.league.slot;if(prop==='profile')return slices.league.profile;if(prop==='scouting')return scoutingCompat;if(prop==='recommendations')return slices.recommendations;if(prop==='settings')return slices.settings;return undefined},
    set(_,prop,value){if(prop==='drafted'){if(Array.isArray(value)&&value.length===0)resetDraft();return true}if(prop==='teams'){slices.league.teams=Array.isArray(value)?[...value]:slices.league.teams;persist('league')}else if(prop==='slot'){slices.league.slot=Number(value)||8;persist('league')}else if(prop==='profile'){slices.league.profile={...slices.league.profile,...(value||{}),rosterTargets:{...DEFAULT_PROFILE.rosterTargets,...(value?.rosterTargets||{})}};persist('league')}else if(prop==='scouting'){slices.scouting=value&&typeof value==='object'?{...value}:{};persist('scouting')}else if(prop==='recommendations'){slices.recommendations={...slices.recommendations,...(value||{})};persist('recommendations')}else return false;return true},
    ownKeys(){return ['drafted','teams','slot','profile','scouting','recommendations','settings']},
    getOwnPropertyDescriptor(){return {enumerable:true,configurable:true}}
  });

  const services=Object.freeze({
    draft:Object.freeze({take:draftPlayer,undo:undoDraft,reset:resetDraft,currentTeam,draftOrderAt,isDrafted,getPicks:()=>enrichedDraft()}),
    league:Object.freeze({update:updateLeague,rosterFor,get:()=>clone(slices.league)}),
    players:Object.freeze({all:()=>players,byId:id=>playerById.get(String(id))||null,byName:name=>player(name),idFor:value=>player(value)?.id||null}),
    scouting:Object.freeze({set:setScouting,get:value=>{const found=player(value);return found?slices.scouting[normalize(found.name)]||null:null}}),
    recommendations:Object.freeze({set:setRecommendations,get:()=>clone(slices.recommendations)}),
    navigation:Object.freeze({go:navigate,current:()=>slices.navigation.route}),
    presentation:Object.freeze({contractForWidth})
  });
  global.BoardCore=Object.freeze({version:VERSION,storageKey:STORAGE_KEY,state:legacyState,getState:()=>legacyState,getCanonicalState:snapshot,persist,subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn)},services,canonicalName,normalize,defaultProfile:clone(DEFAULT_PROFILE)});
  persist('boot');
  global.dispatchEvent?.(new CustomEvent('theboard:core-ready',{detail:{version:VERSION}}));
})(window);
