'use strict';
(function(){
  const VERSION='presentation-adapter-1.0.0';
  const core=()=>window.BoardCore;
  let lastMode='';
  function apply(){
    const service=core()?.services?.presentation;if(!service)return null;
    const contract=service.contractForWidth(window.innerWidth||document.documentElement.clientWidth||0);
    const root=document.documentElement;
    root.dataset.uiMode=contract.mode;
    root.dataset.mobilePrimary=String(contract.primary);
    root.style.setProperty('--tb-min-target',`${contract.minimumTarget}px`);
    root.style.setProperty('--tb-safe-top','env(safe-area-inset-top, 0px)');
    root.style.setProperty('--tb-safe-right','env(safe-area-inset-right, 0px)');
    root.style.setProperty('--tb-safe-bottom','env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--tb-safe-left','env(safe-area-inset-left, 0px)');
    if(lastMode!==contract.mode){lastMode=contract.mode;window.dispatchEvent(new CustomEvent('theboard:presentationchange',{detail:contract}))}
    return contract;
  }
  function loadIntegrityGate(){
    if(window.BoardIntegrityGate||document.querySelector('script[data-board-integrity-gate]'))return;
    const script=document.createElement('script');
    script.src='draft-state-integrity-gate-v1.js?v=23.0.0';
    script.dataset.boardIntegrityGate='1';
    document.head.appendChild(script);
  }
  let timer=0;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(apply,80)},{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(apply,120),{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  loadIntegrityGate();
  window.BoardPresentation=Object.freeze({version:VERSION,apply,current:()=>core()?.services?.presentation?.contractForWidth?.(window.innerWidth)||null});
})();
