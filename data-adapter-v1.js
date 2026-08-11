'use strict';
(function(global){
  if(typeof PLAYERS!=='undefined')global.PLAYERS=PLAYERS;
  if(typeof KEEPERS!=='undefined')global.KEEPERS=KEEPERS;
  if(typeof BASE_TEAMS!=='undefined')global.BASE_TEAMS=BASE_TEAMS;
  global.dispatchEvent?.(new CustomEvent('theboard:data-ready'));
})(window);
