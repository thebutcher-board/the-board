'use strict';
(function(){
  const STYLE_ID='frontOfficePolishStyles';
  function install(){
    document.getElementById(STYLE_ID)?.remove();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #warroom{width:100%!important;max-width:none!important;padding:18px 24px 30px!important;overflow-x:hidden!important;box-sizing:border-box!important}
      #phaseOneMount,.war-shell{display:block!important;width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}

      /* Banners fill the same canvas as the left/center/right decision grid. */
      .roster-banner,.perfect-banner{display:block!important;width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important;box-sizing:border-box!important;padding:18px 20px!important;overflow:hidden!important;clear:both!important}
      .banner-top{display:grid!important;grid-template-columns:minmax(280px,370px) minmax(0,1fr)!important;align-items:center!important;gap:20px!important;width:100%!important}
      .franchise-id{min-width:0!important}
      .franchise-id img{width:80px!important;height:80px!important;object-fit:contain!important}
      .franchise-id h1{font-size:32px!important;line-height:1!important}
      .banner-metrics{width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;overflow:hidden!important}
      .perfect-banner .banner-metrics{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .banner-metrics span{min-width:0!important;padding:11px 13px!important}
      .banner-metrics b{font-size:15px!important}

      .depth-row{display:grid!important;grid-template-columns:145px repeat(5,minmax(130px,1fr)) minmax(270px,1.55fr)!important;gap:10px!important;width:100%!important;align-items:start!important;margin-top:14px!important}
      .depth-group{min-width:0!important}
      .depth-group>div{display:grid!important;grid-template-columns:1fr!important;gap:6px!important}
      .depth-group:last-child>div{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      .depth-card{height:58px!important;padding:5px 7px!important;border-radius:10px!important;box-sizing:border-box!important;min-width:0!important}
      .depth-photo{width:44px!important;height:50px!important;flex:0 0 44px!important}
      .depth-card b{font-size:9px!important;line-height:1.15!important}
      .depth-card span,.depth-card small{font-size:7px!important}

      .decision-grid{display:grid!important;grid-template-columns:minmax(300px,.84fr) minmax(540px,1.45fr) minmax(300px,.84fr)!important;gap:22px!important;align-items:start!important;width:100%!important}
      .decision-grid>aside,.decision-grid>main{min-width:0!important}
      .support-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
      .support-card{min-height:94px!important;padding:8px!important;overflow:hidden!important}
      .support-photo{width:50px!important;height:64px!important;flex:0 0 50px!important}
      .support-copy b{font-size:11px!important;max-width:110px!important}
      .support-copy span,.support-card footer{font-size:8px!important}
      .support-card>strong{font-size:19px!important}

      .hero-card{display:grid!important;grid-template-columns:minmax(270px,45%) minmax(0,55%)!important;min-height:500px!important;height:auto!important;overflow:hidden!important;border-radius:22px!important}
      .hero-photo{height:500px!important;min-height:500px!important;position:relative!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;overflow:hidden!important;background:radial-gradient(circle at 50% 30%,rgba(255,153,42,.25),transparent 46%),linear-gradient(160deg,#424b59,#252b34)!important}
      .hero-photo .hero-img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;border-radius:0!important;background:transparent!important;overflow:hidden!important}
      .hero-photo .hero-img img{position:absolute!important;left:50%!important;bottom:-2%!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center bottom!important;transform:translateX(-50%) scale(1.72)!important;transform-origin:center bottom!important}
      .hero-photo .hero-img.photo-fallback{font-size:70px!important;display:grid!important;place-items:center!important}
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

      .perfect-banner{margin-top:20px!important}
      .perfect-banner h3{font-size:28px!important;line-height:1.1!important}
      .perfect-banner .depth-row{margin-top:15px!important}
      .photo-wrap img{display:block!important;opacity:1!important}
      .photo-wrap:not(.failed)>b{display:none!important}

      @media(max-width:1250px){
        .banner-top{grid-template-columns:1fr!important}
        .depth-row{grid-template-columns:120px repeat(5,minmax(110px,1fr)) minmax(235px,1.4fr)!important;overflow-x:auto!important;padding-bottom:6px!important}
        .decision-grid{grid-template-columns:270px minmax(500px,1fr) 270px!important;gap:15px!important}
      }
      @media(max-width:900px){
        #warroom{padding-left:12px!important;padding-right:12px!important}
        .decision-grid{grid-template-columns:1fr!important}
        .hero-card{grid-template-columns:1fr!important}
        .hero-photo{height:400px!important;min-height:400px!important}
        .support-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .depth-row{grid-template-columns:105px repeat(6,minmax(115px,1fr))!important}
      }
    `;
    document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('load',install,{once:true});
})();