'use strict';
(function(){
  const OWNED_ROOT_ID='warRoomV12';
  let observer=null;
  let sanitizing=false;

  function renderOwned(){
    window.WarRoomV12?.render?.();
  }

  function canonicalWarRoom(){
    const rooms=[...document.querySelectorAll('#warroom')];
    const primary=rooms[0]||null;
    rooms.slice(1).forEach(room=>room.remove());
    return primary;
  }

  function canonicalShell(war){
    if(!war)return null;
    const shells=[...war.querySelectorAll(':scope > .front-office-shell')];
    let shell=shells.find(x=>x.dataset.phaseOneShell==='true')||shells[0]||null;
    if(!shell){
      shell=document.createElement('div');
      shell.className='front-office-shell';
      war.appendChild(shell);
    }
    shell.dataset.phaseOneShell='true';
    shells.filter(x=>x!==shell).forEach(x=>x.remove());
    [...war.children].filter(x=>x!==shell).forEach(x=>x.remove());
    return shell;
  }

  function sanitize(){
    if(sanitizing)return;
    sanitizing=true;
    try{
      const war=canonicalWarRoom();
      if(!war)return;
      const shell=canonicalShell(war);
      let root=document.getElementById(OWNED_ROOT_ID);

      if(root&&root.parentElement!==shell){
        shell.appendChild(root);
      }

      if(!root){
        renderOwned();
        root=document.getElementById(OWNED_ROOT_ID);
      }

      [...shell.children].forEach(node=>{
        if(node!==root)node.remove();
      });

      war.querySelectorAll('[id^="warRoom"],#decisionArenaV7,#decisionArenaV6,#cockpitV5,#warRoomLive,.draft-track,.draft-heartbeat-summary,.front-office-topline,.front-office-layout,.projection-panel').forEach(node=>{
        if(node!==root&&!node.contains(root))node.remove();
      });
    }finally{
      sanitizing=false;
    }
  }

  function install(){
    if(!window.WarRoomV12?.render){setTimeout(install,20);return;}

    window.__THE_BOARD_SINGLE_FRONT_OFFICE__=true;
    window.renderWarroom=function(){
      renderOwned();
      queueMicrotask(sanitize);
    };

    renderOwned();
    sanitize();

    const war=canonicalWarRoom();
    observer?.disconnect();
    if(war){
      observer=new MutationObserver(()=>queueMicrotask(sanitize));
      observer.observe(war,{childList:true,subtree:true});
    }

    window.addEventListener('the-board:render',()=>{
      renderOwned();
      queueMicrotask(sanitize);
    });

    let fastChecks=0;
    const fastTimer=setInterval(()=>{
      sanitize();
      if(++fastChecks>=80)clearInterval(fastTimer);
    },100);
    setInterval(sanitize,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();