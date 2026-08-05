'use strict';
(function(){
  const STYLE_ID='frontOfficePolishStyles';
  function install(){
    document.getElementById(STYLE_ID)?.remove();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #warroom{width:100%!important;max-width:none!important;padding:18px 24px 30px!important;overflow-x:hidden!important;box-sizing:border-box!important}
      #phaseOneMount{width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}
      .war-shell{display:block!important;width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}

      /* Both roster banners own the entire War Room canvas. */
      .roster-banner,.perfect-banner{display:block!important;width:calc(100vw - 48px)!important;max-width:calc(100vw - 48px)!important;margin-left:calc(50% - 50vw + 24px)!important;margin-right:0!important;box-sizing:border-box!important;padding:16px 18px!important;overflow:hidden!important;clear:both!important}
      .banner-top{display:grid!important;grid-template-columns:minmax(260px,360px) minmax(0,1fr)!important;align-items:center!important;gap:18px!important;width:100%!important}
      .franchise-id{min-width:0!important}
      .franchise-id img{width:76px!important;height:76px!important}
      .franchise-id h1{font-size:31px!important;line-height:1!important}
      .banner-metrics{width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;overflow:hidden!important}
      .perfect-banner .banner-metrics{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .banner-metrics span{min-width:0!important;padding:10px 12px!important}
      .banner-metrics b{font-size:15px!important}

      .depth-row{display:grid!important;grid-template-columns:135px repeat(5,minmax(125px,1fr)) minmax(250px,1.55fr)!important;gap:10px!important;width:100%!important;align-items:start!important;margin-top:13px!important}
      .depth-group{min-width:0!important}
      .depth-group>div{display:grid!important;grid-template-columns:1fr!important;gap:6px!important}
      .depth-group:last-child>div{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      .depth-card{height:54px!important;padding:5px 7px!important;border-radius:10px!important;box-sizing:border-box!important;min-width:0!important}
      .depth-photo{width:42px!important;height:46px!important;flex:0 0 42px!important}
      .depth-card b{font-size:9px!important;line-height:1.15!important}
      .depth-card span{font-size:7px!important}
      .depth-card small{font-size:7px!important}

      .decision-grid{display:grid!important;grid-template-columns:minmax(290px,.82fr) minmax(520px,1.45fr) minmax(290px,.82fr)!important;gap:20px!important;align-items:start!important;width:100%!important}
      .decision-grid>aside,.decision-grid>main{min-width:0!important}
      .support-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
      .support-card{min-height:92px!important;padding:8px!important;overflow:hidden!important}
      .support-photo{width:48px!important;height:62px!important;flex:0 0 48px!important}
      .support-copy b{font-size:11px!important;max-width:105px!important}
      .support-copy span{font-size:8px!important}
      .support-card>strong{font-size:19px!important}
      .support-card footer{font-size:8px!important}

      .hero-card{display:grid!important;grid-template-columns:minmax(250px,44%) minmax(0,56%)!important;min-height:470px!important;height:auto!important;overflow:hidden!important;border-radius:22px!important}
      .hero-photo{height:100%!important;min-height:470px!important;position:relative!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;overflow:hidden!important;background:radial-gradient(circle at 50% 28%,rgba(255,153,42,.24),transparent 45%),linear-gradient(160deg,#424b59,#252b34)!important}
      .hero-photo .hero-img{width:100%!important;height:100%!important;display:block!important;border-radius:0!important;background:transparent!important}
      .hero-photo .hero-img img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center bottom!important;transform:scale(1.10)!important;transform-origin:center bottom!important}
      .hero-photo .hero-img.photo-fallback{font-size:68px!important;place-items:center!important}
      .hero-photo em{position:absolute!important;right:16px!important;top:16px!important;z-index:3!important}
      .hero-info{padding:22px 24px!important;display:flex!important;flex-direction:column!important;min-width:0!important}
      .hero-info header h2{font-size:36px!important;line-height:1!important;margin:4px 0 8px!important}
      .hero-info header p{font-size:17px!important}
      .hero-grade b{font-size:38px!important}
      .goose-note{margin:16px 0 14px!important;padding:15px 16px!important}
      .goose-note p{font-size:15px!important;line-height:1.45!important}
      .hero-stats{grid-template-columns:repeat(4,minmax(0,1fr))!important;margin-top:auto!important}
      .hero-stats span{min-height:62px!important;padding:10px 8px!important}
      .hero-stats b{font-size:15px!important}
      .hero-actions{margin-top:14px!important}
      .hero-actions button{min-height:48px!important}
      .league-row{margin-top:10px!important;min-height:58px!important}

      .perfect-banner{margin-top:18px!important}
      .perfect-banner h3{font-size:27px!important;line-height:1.1!important}
      .perfect-banner .depth-row{margin-top:15px!important}
      .photo-wrap img{display:block!important;opacity:1!important}
      .photo-wrap:not(.failed)>b{display:none!important}

      @media(max-width:1250px){
        .banner-top{grid-template-columns:1fr!important}
        .depth-row{grid-template-columns:110px repeat(5,minmax(105px,1fr)) minmax(220px,1.4fr)!important;overflow-x:auto!important;padding-bottom:6px!important}
        .decision-grid{grid-template-columns:260px minmax(480px,1fr) 260px!important;gap:14px!important}
      }
      @media(max-width:900px){
        .roster-banner,.perfect-banner{width:calc(100vw - 24px)!important;max-width:calc(100vw - 24px)!important;margin-left:calc(50% - 50vw + 12px)!important}
        .decision-grid{grid-template-columns:1fr!important}
        .hero-card{grid-template-columns:1fr!important}
        .hero-photo{min-height:380px!important}
        .support-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .depth-row{grid-template-columns:100px repeat(6,minmax(110px,1fr))!important}
      }
    `;
    document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('load',install,{once:true});
})();