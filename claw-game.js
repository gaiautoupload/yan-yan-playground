(()=>{'use strict';
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh,audio=window.YanClassicAudio;
const MAX=24,icons=['🧸','🚜','🐱','🐶','🚒','🐰','🚂','🦕','🦄','🐼'];
let epoch=0;
function config(level){
 const n=Math.max(1,Math.min(MAX,Math.round(Number(level)||1))),count=n<9?4:5;
 let seed=(n*7919+17)>>>0;
 const pool=[...icons];
 for(let i=pool.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]]}
 const prizes=pool.slice(0,count).map((icon,i)=>({id:i,icon,x:count===4?17+i*22:12+i*19}));
 const target=(n*7+Math.floor(n/3))%count;
 return {level:n,prizes,target,goal:prizes[target].icon};
}
function award(n){
 const done=Array.isArray(state.yclawDone)?state.yclawDone.filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX):[];
 const fresh=!done.includes(n);
 if(fresh){state.yclawDone=[...done,n];state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}
 state.yclawLevel=n===MAX?1:n+1;state.yclawCheckpoint=null;persist();return fresh;
}
function start(requested,reset){
 epoch++;const run=epoch;audio?.unlock?.();
 const n=Math.max(1,Math.min(MAX,Math.round(Number(requested===undefined?state.yclawLevel:requested)||1)));
 const cfg=config(n),cp=!reset&&requested===undefined?state.yclawCheckpoint:null;
 let x=cp&&cp.level===n&&Number.isFinite(cp.x)?Math.max(7,Math.min(93,cp.x)):50,busy=false,finished=false;
 let holdTimer=0,heldButton=null,holdPointerId=null,ignoreClickUntil=0;
 function stopHold(pointerId=null){if(pointerId!==null&&pointerId!==holdPointerId)return;if(holdTimer)clearTimeout(holdTimer);holdTimer=0;if(heldButton)heldButton.classList.remove('yc-holding');heldButton=null;holdPointerId=null}
 app.innerHTML='<section class="screen game classic-screen yc-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="yc-back">⌂</button><span class="chip">🕹️ 彥彥抓娃娃機</span><span class="chip">⭐ '+n+'/'+MAX+'</span><button class="iconbtn" id="yc-voice">🔊</button></header>'+
 '<main class="yc-stage allow-scroll"><div class="yc-title">🎯 抓到這個寶貝！ <span class="yc-goal">'+cfg.goal+'</span></div>'+
 '<div class="yc-status" id="yc-status" role="status" aria-live="polite">👆 移動爪子，按下抓取！</div>'+
 '<div class="yc-machine"><div class="yc-track" id="yc-track" aria-label="滑動控制爪子位置"><div class="yc-rail"></div><div class="yc-claw" id="yc-claw"><span>🪝</span></div></div>'+
 '<div class="yc-prizes">'+cfg.prizes.map(p=>'<button type="button" class="yc-prize" data-prize="'+p.id+'" aria-label="對準 '+p.icon+' 娃娃" style="left:'+p.x+'%">'+p.icon+'</button>').join('')+'</div><div class="yc-floor">🎁 🎁 🎁</div></div>'+
 '<div class="yc-controls"><button id="yc-left" aria-label="按住爪子持續往左">⬅️</button><button id="yc-grab" class="yc-grab">🪝 抓取！</button><button id="yc-right" aria-label="按住爪子持續往右">➡️</button></div>'+
 '<div class="yc-tip">👆 點兩次、長按、上滑娃娃，或把娃娃往下拖到「抓取」鍵！</div>'+
 '<div class="yc-assist-row"><button id="yc-mom" class="yc-mom">👩 幫我對準</button><button id="yc-auto" class="yc-mom yc-auto" aria-label="媽媽幫忙對準並抓取目標娃娃">👩‍👦 幫我抓</button><button id="yc-retry" class="yc-retry">🔄 重玩這關</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="yc-home">⌂ 首頁</button><button class="footbtn yellow" id="yc-menu">🎲 其他遊戲</button></footer></section>';
 const el=id=>app.querySelector('#'+id),claw=el('yc-claw'),track=el('yc-track'),status=el('yc-status');
 function save(){if(run!==epoch||finished)return;state.yclawLevel=n;state.yclawCheckpoint={level:n,x};persist()}
 function position(next,chosenId=null){if(busy||finished||run!==epoch)return;x=Math.max(7,Math.min(93,next));claw.style.left=x+'%';app.querySelectorAll('[data-prize]').forEach(b=>b.classList.toggle('yc-picked',Number(b.dataset.prize)===chosenId));
  const aimed=cfg.prizes.find(p=>Math.abs(p.x-x)<=8)||null;
  app.querySelectorAll('[data-prize]').forEach(b=>b.classList.toggle('yc-aimed',!!aimed&&Number(b.dataset.prize)===aimed.id));
  claw.classList.toggle('yc-aligned',!!aimed);
  if(!busy)announce(aimed?(aimed.id===cfg.target?'🎯 對準目標 '+cfg.goal+'！按抓取！':'👀 現在對準 '+aimed.icon+'，要找 '+cfg.goal+' 喔！'):'👆 移動爪子，找 '+cfg.goal+'！');save()}
 function announce(message){status.textContent=message}
 function win(){
  if(finished||run!==epoch)return;finished=true;
  const fresh=award(n);audio?.play?.('win');fx('win');vib([20,30,20]);say('好棒！抓到'+cfg.goal+'了！');
  const overlay=document.createElement('div');overlay.className='overlay';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 抓到了！</h2><p>'+(fresh?'獲得三顆星星！':'又成功了！')+'</p><button class="primary" id="yc-next">▶️ 下一關</button><button class="classic-secondary" id="yc-again">🔄 再玩一次</button><button class="classic-secondary" id="yc-other">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#yc-next').onclick=()=>start(n===MAX?1:n+1,true);
  overlay.querySelector('#yc-again').onclick=()=>start(n,true);
  overlay.querySelector('#yc-other').onclick=()=>{epoch++;window.YanClassics.menu()};
 }
 function grab(){
  if(busy||finished||run!==epoch)return false;
  stopHold();lastTapPrizeId=null;lastTapAt=0;busy=true;el('yc-grab').disabled=true;claw.classList.add('yc-down');announce('🪝 爪子下降中…');audio?.play?.('hit');vib(8);
  setTimeout(()=>{
   if(run!==epoch)return;
   const caught=cfg.prizes.find(p=>Math.abs(p.x-x)<=8);
   claw.classList.remove('yc-down');
   if(caught&&caught.id===cfg.target){const p=app.querySelector('[data-prize="'+caught.id+'"]');if(p)p.classList.add('yc-caught');announce('🎉 抓到目標！');win()}
   else {busy=false;el('yc-grab').disabled=false;announce(caught?'再試一次！要抓 '+cfg.goal:'沒有抓到！往左或右移動看看');say('再試一次！找到'+cfg.goal);save()}
  },650);return true;
 }
 /* v266: drag along the rail and release over a prize to grab in one gesture; tap still only aims. */
 let trackPointer=null,trackStartX=0,trackStartY=0,trackMoved=false;
 function trackPos(e){const r=track.getBoundingClientRect();if(r.width>0)position((e.clientX-r.left)/r.width*100)}
 track.addEventListener('pointerdown',e=>{
  if(trackPointer!==null||busy||finished||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  trackPointer=e.pointerId;trackStartX=e.clientX;trackStartY=e.clientY;trackMoved=false;
  track.classList.add('yc-dragging');try{track.setPointerCapture(e.pointerId)}catch(_){}
  trackPos(e);e.preventDefault();
 });
 track.addEventListener('pointermove',e=>{
  if(trackPointer!==e.pointerId)return;
  if(Math.hypot(e.clientX-trackStartX,e.clientY-trackStartY)>=14)trackMoved=true;
  trackPos(e);e.preventDefault();
 });
 function endTrack(e){
  if(e.pointerId!==trackPointer)return;
  const dragged=trackMoved;trackPointer=null;trackMoved=false;track.classList.remove('yc-dragging');
  if(e.type!=='pointerup'||!dragged||busy||finished||run!==epoch)return;
  trackPos(e);
  const prize=cfg.prizes.find(p=>Math.abs(p.x-x)<=8);
  if(prize){announce('🪝 放開軌道，抓取 '+prize.icon+'！');grab()}
  else announce('👆 沒有對準娃娃，再滑到娃娃上方放開！');
 }
 ['pointerup','pointercancel','lostpointercapture'].forEach(type=>track.addEventListener(type,endTrack));
 function bindHold(id,direction){
  const button=el(id);
  function tick(){if(run!==epoch||busy||finished||heldButton!==button){stopHold();return}position(x+direction*2.6);holdTimer=setTimeout(tick,65)}
  button.addEventListener('pointerdown',e=>{
   if((e.button!==undefined&&e.button!==0)||e.isPrimary===false||holdPointerId!==null)return;
   if(run!==epoch||busy||finished)return;
   heldButton=button;holdPointerId=e.pointerId;button.classList.add('yc-holding');ignoreClickUntil=Date.now()+800;
   position(x+direction*3);holdTimer=setTimeout(tick,250);
   try{button.setPointerCapture(e.pointerId)}catch(_){}
   e.preventDefault();
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,e=>stopHold(e.pointerId)));
  button.onclick=e=>{if(e&&e.detail>0&&Date.now()<ignoreClickUntil)return;position(x+direction*9)};
 }
 bindHold('yc-left',-1);bindHold('yc-right',1);
 let prizePointer=null,prizeTimer=0,prizeButton=null,prizeStartX=0,prizeStartY=0,prizeDragging=false,ignorePrizeClickUntil=0,ignorePrizeId=null;
 let lastTapPrizeId=null,lastTapAt=0;
 function clearPrizePress(){
  if(prizeTimer)clearTimeout(prizeTimer);
  prizeTimer=0;
  if(prizeButton)prizeButton.classList.remove('yc-pressing','yc-carrying');
  el('yc-grab').classList.remove('yc-drop-ready');prizeDragging=false;prizeButton=null;prizePointer=null;
 }
 app.querySelectorAll('[data-prize]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{
   if(prizePointer!==null||busy||finished||run!==epoch||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
   prizePointer=e.pointerId;prizeButton=button;prizeStartX=e.clientX;prizeStartY=e.clientY;prizeDragging=false;
   button.classList.add('yc-pressing');
   try{button.setPointerCapture(e.pointerId)}catch(_){}
   prizeTimer=setTimeout(()=>{
    if(run!==epoch||busy||finished||prizePointer!==e.pointerId||prizeButton!==button)return;
    const id=Number(button.dataset.prize),prize=cfg.prizes.find(p=>p.id===id);
    clearPrizePress();if(!prize)return;
    ignorePrizeClickUntil=Date.now()+850;ignorePrizeId=id;
    stopHold();position(prize.x,id);announce('🪝 長按成功，抓取 '+prize.icon+'！');grab();
   },450);
  });
  button.addEventListener('pointermove',e=>{
   if(e.pointerId!==prizePointer)return;
   const dx=e.clientX-prizeStartX,dy=e.clientY-prizeStartY;
   if(dy<=-26&&Math.abs(dx)<=30){
    const id=Number(button.dataset.prize),prize=cfg.prizes.find(p=>p.id===id);
    ignorePrizeClickUntil=Date.now()+850;ignorePrizeId=id;clearPrizePress();
    if(!prize||busy||finished||run!==epoch)return;
    stopHold();position(prize.x,id);announce('⬆️ 娃娃往上滑，抓取 '+prize.icon+'！');grab();e.preventDefault();return;
   }
   if(dy>=8&&Math.abs(dx)<=240){
    prizeDragging=true;if(prizeTimer)clearTimeout(prizeTimer);prizeTimer=0;
    button.classList.add('yc-carrying');
    const r=el('yc-grab').getBoundingClientRect();
    el('yc-grab').classList.toggle('yc-drop-ready',e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);
    e.preventDefault();return;
   }
   if(Math.hypot(dx,dy)>18){
    ignorePrizeClickUntil=Date.now()+180;ignorePrizeId=Number(button.dataset.prize);
    clearPrizePress();
   }
  });
  button.addEventListener('pointerup',e=>{
   if(e.pointerId!==prizePointer)return;
   const dragged=prizeDragging,id=Number(button.dataset.prize);
   const r=el('yc-grab').getBoundingClientRect();
   const dropped=dragged&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
   if(dragged){ignorePrizeClickUntil=Date.now()+180;ignorePrizeId=id;e.preventDefault();}
   clearPrizePress();
   if(!dropped||busy||finished||run!==epoch)return;
   const prize=cfg.prizes.find(p=>p.id===id);if(!prize)return;
   stopHold();position(prize.x,id);announce('🎁 送到抓取鍵，抓取 '+prize.icon+'！');grab();
  });
  ['pointercancel','lostpointercapture','pointerleave'].forEach(type=>button.addEventListener(type,e=>{
   if(e.pointerId===prizePointer&&(type!=='pointerleave'||!prizeDragging))clearPrizePress();
  }));
  button.addEventListener('contextmenu',e=>e.preventDefault());
  button.addEventListener('click',e=>{
   const id=Number(button.dataset.prize);
   if(id===ignorePrizeId&&Date.now()<ignorePrizeClickUntil){e.preventDefault();return}
   if(busy||finished||run!==epoch)return;
   const prize=cfg.prizes.find(p=>p.id===id);if(!prize)return;
   stopHold();
   const now=Date.now(),quickGrab=lastTapPrizeId===id&&now-lastTapAt<=650;
   lastTapPrizeId=quickGrab?null:id;lastTapAt=quickGrab?0:now;
   position(prize.x,id);
   if(quickGrab){announce('🪝 連點兩下，抓取 '+prize.icon+'！');grab();return}
   announce('🎯 已對準 '+prize.icon+'！再點一次直接抓，或按「抓取」！');vib(8);
  });
 });

 el('yc-grab').onclick=grab;
 el('yc-mom').onclick=()=>{if(run!==epoch||busy||finished)return;stopHold();const prize=cfg.prizes[cfg.target];position(prize.x,prize.id);announce('👩 已對準 '+cfg.goal+'！彥彥按「抓取」就可以抓到了！');audio?.play?.('tap');vib(10);say('媽媽幫你對準了！現在按抓取！')};
 el('yc-auto').onclick=()=>{if(run!==epoch||busy||finished)return;stopHold();const prize=cfg.prizes[cfg.target];position(prize.x,prize.id);announce('👩 媽媽幫忙抓 '+cfg.goal+'！');audio?.play?.('tap');vib(10);grab()};
 el('yc-retry').onclick=()=>start(n,true);
 el('yc-voice').onclick=()=>{audio?.unlock?.();say('幫彥彥抓到'+cfg.goal+'！左右移動爪子，對準再按抓取！')};
 el('yc-back').onclick=el('yc-menu').onclick=()=>{stopHold();epoch++;window.YanClassics.menu()};
 el('yc-home').onclick=()=>{stopHold();epoch++;renderHome()};
 position(x);say('抓娃娃機！找到'+cfg.goal+'！');
}
const hub=window.YanGameHub;if(hub&&Array.isArray(hub.groups)){const g=hub.groups.find(x=>x[0]==='build');if(g&&!g[4].some(x=>x[3]==='YanClawGame'))g[4].push(['🕹️','彥彥抓娃娃機','移動爪子抓對寶貝','YanClawGame'])}
window.YanClawGame={start,config,award,MAX};
})();