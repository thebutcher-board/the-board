'use strict';
(function(){
  const VERSION='foundation-controls-2.0.0';
  const core=()=>window.BoardCore;
  function closeSettings(){const modal=document.getElementById('settingsModal');if(modal)modal.hidden=true;document.body.classList.remove('modal-open')}
  function refreshCurrent(){try{renderActive()}catch{}window.CleanFrontOffice?.render?.();requestAnimationFrame(()=>window.BoardCockpitV52?.apply?.());if(location.hash==='#board')window.IntegratedBoardV2?.render?.()}
  function resetDraft(){
    if(!window.confirm('Reset every drafted player and return to Pick 1.01?'))return false;
    const result=core()?.services?.draft?.reset?.();if(!result?.ok){window.alert('THE BOARD could not reset the draft.');return false}
    closeSettings();refreshCurrent();window.dispatchEvent(new CustomEvent('theboard:draftchange',{detail:{reason:'reset'}}));return true;
  }
  function goToDraft(){core()?.services?.navigation?.go?.('warroom');try{showView('warroom')}catch{document.querySelector('.tabs .tab[data-view="warroom"]')?.click()}if(location.hash!=='#warroom')history.pushState({view:'warroom'},'','#warroom');document.body.classList.remove('tb-board-active');setTimeout(refreshCurrent,0);return true}
  function ensureBackButtons(){
    ['board','database','league','history'].forEach(id=>{const view=document.getElementById(id);if(!view||view.querySelector('.tb-app-back'))return;const button=document.createElement('button');button.type='button';button.className='tb-app-back';button.setAttribute('aria-label','Back to Draft');button.innerHTML='<span aria-hidden="true">←</span><b>Back to Draft</b>';button.addEventListener('click',goToDraft);view.prepend(button)})
  }
  function bind(){
    document.addEventListener('click',event=>{
      if(event.target.closest('#resetBtn')){event.preventDefault();event.stopImmediatePropagation();resetDraft();return}
      const cockpitTab=event.target.closest('[data-v52-view]');if(cockpitTab){const target=cockpitTab.dataset.v52View;if(target&&target!=='warroom')core()?.services?.navigation?.go?.(target)}
    },true);
    window.addEventListener('popstate',()=>{if(location.hash==='#warroom'||!location.hash)goToDraft()});
    window.addEventListener('hashchange',ensureBackButtons);
    window.addEventListener('theboard:app-ready',ensureBackButtons);
    ensureBackButtons();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.__TB_FOUNDATION_CONTROLS__=Object.freeze({version:VERSION,resetDraft,goToDraft});
})();
