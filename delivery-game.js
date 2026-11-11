(()=>{
'use strict';
// v31: two-step cargo matching + destination delivery. Additive; original progress untouched.
const sh=window.YanClassicShared,audio=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!sh||!audio)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh;
const MAX=40,ROUNDS=3;
const STATIONS=[
 {id:'site',name:'工地',icon:'🏗️',goods:[['🧱','磚塊'],['🚧','交通錐'],['🧰','工具箱']]},
 {id:'garden',name:'花園',icon:'🌷',goods:[['🌱','小樹苗'],['🪴','盆栽'],['🌻','向日葵']]},
 {id:'zoo',name:'動物園',icon:'🦁',goods:[['🥕','紅蘿蔔'],['🐟','小魚'],['🦴','骨頭']]}
];
function shuffle(items,rng=Math.random){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeTask(level,round,previous=null,rng=Math.random){
 const candidates=STATIONS.filter(s=>s.id!==previous),station=candidates[Math.floor(rng()*candidates.length)];
 const good=station.goods[Math.floor(rng()*station.goods.length)];
 const others=STATIONS.flatMap(s=>s.goods).filter(g=>g[0]!==good[0]);
 const count=level<=10?3:level<=25?4:5;
 const choices=shuffle([good,...shuffle(others,rng).slice(0,count-1)],rng);
 return {station,good,choices,destinations:shuffle(STATIONS,rng),photo:photos[(level+round)%Math.max(photos.length,1)]||null};
}
let generation=0,pending=null,previous=null;
function stop(){generation++;if(pending!==null){clearTimeout(pending);pending=null}}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();audio.unlock();
 const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.deliveryLevel)||1));
 let round=requested===undefined&&Number(state.deliveryCheckpointLevel)===level?Math.max(0,Math.min(ROUNDS-1,Number(state.deliveryRound)||0)):0;
 state.deliveryCheckpointLevel=level;state.deliveryRound=round;persist();
 const token=generation;let task=null,phase='cargo',locked=false,drag=null,suppressCargoClickUntil=0,reverseDrag=null,suppressStationClickUntil=0,selectedStation=null;
 app.innerHTML='<section class="screen game classic-screen delivery-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="delivery-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🚜 彥彥運貨大隊</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="delivery-speak" aria-label="重播語音">🔊</button></header>'+
 '<main class="delivery-stage"><div class="delivery-status"><span id="delivery-progress">🌟 '+(round+1)+' / '+ROUNDS+'</span><span id="delivery-step">① 選貨物</span></div>'+
 '<div class="delivery-scene"><div class="delivery-family"><img id="delivery-photo" alt="媽媽和彥彥的生活照片"></div><div class="delivery-order"><span id="delivery-order-icon">🧱</span><strong id="delivery-order-text">選貨物</strong></div></div>'+
 '<div class="delivery-track"><span class="delivery-road">➖ ➖ ➖ ➖</span><img src="./assets/excavator.webp" alt="挖土機" class="delivery-truck" id="delivery-truck"><span class="delivery-load" id="delivery-load">📦</span><span class="delivery-goal" id="delivery-goal">🏗️</span></div>'+
 '<div class="delivery-cargo" id="delivery-cargo" role="group" aria-label="選擇要搬運的貨物"></div>'+
 '<div class="delivery-destinations" id="delivery-destinations" role="group" aria-label="選擇送貨地點"></div>'+
 '<div class="delivery-guide" id="delivery-guide" aria-live="polite">👆 選出一樣的貨物！</div>'+
 '<div class="delivery-actions"><button type="button" class="delivery-hint" id="delivery-hint">💡 提示</button><button type="button" class="delivery-assist" id="delivery-assist" aria-label="媽媽幫我完成下一步送貨">👩 幫我送一步</button><button type="button" class="delivery-undo" id="delivery-undo" aria-label="取消已選貨物或地點，重新挑選" disabled>↶ 改選</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="delivery-home">⌂ 首頁</button><button class="footbtn yellow" id="delivery-retry">🔄 重玩</button></footer></section>';
 const cargo=app.querySelector('#delivery-cargo'),dest=app.querySelector('#delivery-destinations'),guide=app.querySelector('#delivery-guide'),truck=app.querySelector('#delivery-truck');
 function cue(){if(!task)return;say(phase==='cargo'?'彥彥，幫媽媽開挖土機！先找出'+task.good[1]+'。':'好棒！現在把'+task.good[1]+'送到'+task.station.name+'！')}
 function draw(){
  if(token!==generation)return;
  locked=false;phase='cargo';selectedStation=null;app.querySelector('#delivery-assist').disabled=false;app.querySelector('#delivery-undo').disabled=true;truck.classList.remove('delivery-driving');
  task=makeTask(level,round,previous);previous=task.station.id;
  app.querySelector('#delivery-progress').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  app.querySelector('#delivery-step').textContent='① 選貨物';
  app.querySelector('#delivery-order-icon').textContent=task.good[0]+' ➜ '+task.station.icon;
  app.querySelector('#delivery-order-text').textContent=task.good[1]+' 送到 '+task.station.name;
  app.querySelector('#delivery-load').textContent='📦';app.querySelector('#delivery-goal').textContent=task.station.icon;
  const img=app.querySelector('#delivery-photo');img.onerror=()=>{img.onerror=null;img.src='./assets/family-home.webp'};img.src=task.photo?task.photo.scene:'./assets/family-home.webp';
  cargo.innerHTML=task.choices.map(g=>'<button type="button" class="delivery-item" data-item="'+g[0]+'" aria-label="'+g[1]+'"><span>'+g[0]+'</span></button>').join('');
  dest.innerHTML=task.destinations.map(s=>'<button type="button" class="delivery-station" data-station="'+s.id+'" aria-label="'+s.name+'"><span>'+s.icon+'</span><small>'+s.name+'</small></button>').join('');
  dest.classList.remove('delivery-ready');guide.textContent='👆 點貨物或拖曳送貨；按住貨物 0.5 秒可聽名稱 🔊';cue();
 }
 function finish(){
  if(token!==generation)return;
  state.deliveryLevel=Math.max(Number(state.deliveryLevel)||1,Math.min(MAX,level+1));
  state.deliveryCheckpointLevel=state.deliveryLevel;state.deliveryRound=0;
  state.deliveryWins=(Number(state.deliveryWins)||0)+1;
  state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  audio.play('win');fx('win');vib([15,30,15]);say('彥彥好厲害！三趟貨物都送到了！');
  const overlay=document.createElement('div');overlay.className='overlay';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 運貨成功！</h2><p>🚜 三趟都完成了！</p><button class="primary" id="delivery-next">▶️ 下一關</button><button class="classic-secondary" id="delivery-again">🔄 再玩一次</button><button class="classic-secondary" id="delivery-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#delivery-next').onclick=()=>start(level>=MAX?1:level+1);
  overlay.querySelector('#delivery-again').onclick=()=>start(level);
  overlay.querySelector('#delivery-menu').onclick=menu;
 }
 function wrong(button){audio.play('wrong');vib(15);button.classList.remove('delivery-wrong');void button.offsetWidth;button.classList.add('delivery-wrong');guide.textContent='💗 再試一次！';}
 // v208: preschool-friendly destination-first two-tap path, without removing either drag direction.
 function selectStation(b){
  if(!b||locked||phase!=='cargo'||token!==generation)return false;
  audio.unlock();
  if(b.dataset.station!==task.station.id){wrong(b);guide.textContent='💗 再找正確的送貨地點！';return false;}
  if(selectedStation&&selectedStation!==b){selectedStation.classList.remove('delivery-station-selected');selectedStation.setAttribute('aria-pressed','false')}
  selectedStation=b;b.classList.add('delivery-station-selected');b.setAttribute('aria-pressed','true');app.querySelector('#delivery-undo').disabled=false;
  guide.textContent='👍 找到 '+task.station.icon+'！再點 '+task.good[0]+'！';audio.play('hit');vib(10);return true;
 }
 function chooseCargo(b,autoComplete=true){
  if(!b||locked||phase!=='cargo'||token!==generation)return false;
  audio.unlock();
  if(b.dataset.item!==task.good[0]){wrong(b);return false;}
  phase='destination';b.classList.add('delivery-correct');cargo.querySelectorAll('button').forEach(x=>x.disabled=true);app.querySelector('#delivery-undo').disabled=false;
  app.querySelector('#delivery-load').textContent=task.good[0];app.querySelector('#delivery-step').textContent='② 選地點';
  dest.classList.add('delivery-ready');guide.textContent='👆 送到 '+task.station.icon+'！';audio.play('hit');fx('yay');vib(12);cue();
  if(selectedStation&&autoComplete)deliver(selectedStation);
  return true;
 }
 function deliver(b){
  if(!b||locked||phase!=='destination'||token!==generation)return false;
  audio.unlock();
  if(b.dataset.station!==task.station.id){wrong(b);return false;}
  locked=true;app.querySelector('#delivery-assist').disabled=true;app.querySelector('#delivery-undo').disabled=true;b.classList.add('delivery-correct');dest.querySelectorAll('button').forEach(x=>x.disabled=true);
  truck.classList.add('delivery-driving');guide.textContent='🎉 送到了！';audio.play('hit');fx('yay');vib([12,20,12]);
  round++;state.deliveryRound=round;state.deliveryCheckpointLevel=level;persist();
  pending=setTimeout(round>=ROUNDS?finish:draw,750);return true;
 }
 // v209: one-button, one-step assistance for preschoolers; reuse normal game scoring and checkpoint path.
 function assistStep(){
  if(token!==generation||locked||!task)return false;
  audio.unlock();
  if(phase==='cargo'){
   const b=[...cargo.querySelectorAll('[data-item]')].find(x=>x.dataset.item===task.good[0]);
   if(!b)return false;
   return chooseCargo(b);
  }
  if(phase==='destination'){
   const b=[...dest.querySelectorAll('[data-station]')].find(x=>x.dataset.station===task.station.id);
   return b?deliver(b):false;
  }
  return false;
 }
 // v260: undo either selection before delivery; never decrement a completed trip or change stars.
 function undoSelection(){
  if(token!==generation||locked||!task)return false;
  if(phase==='cargo'&&!selectedStation)return false;
  clearDrag();clearReverseDrag();
  // A previous destination touch may still suppress clicks for 450ms; undo starts a fresh choice.
  suppressCargoClickUntil=0;suppressStationClickUntil=0;
  if(selectedStation){selectedStation.classList.remove('delivery-station-selected');selectedStation.setAttribute('aria-pressed','false');selectedStation=null;}
  if(phase==='destination'){
   phase='cargo';
   cargo.querySelectorAll('[data-item]').forEach(b=>{b.disabled=false;b.classList.remove('delivery-correct')});
   dest.classList.remove('delivery-ready');
   app.querySelector('#delivery-load').textContent='📦';
   app.querySelector('#delivery-step').textContent='① 選貨物';
  }
  app.querySelector('#delivery-undo').disabled=true;
  guide.textContent='↶ 已取消選擇，重新挑貨物或地點！';
  audio.play('tap');vib(8);cue();
  return true;
 }
 // Drag a cargo icon straight to its destination, without changing the two-tap path.
 function stationAt(x,y){
  return [...dest.querySelectorAll('[data-station]')].find(b=>{
   const r=b.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
  })||null;
 }
 function clearDrag(){
  if(!drag)return;
  if(drag.holdTimer!==null){clearTimeout(drag.holdTimer);drag.holdTimer=null;}
  drag.button.classList.remove('delivery-speaking');
  if(drag.ghost)drag.ghost.remove();
  if(drag.target)drag.target.classList.remove('delivery-drop-target');
  drag.button.classList.remove('delivery-dragging');drag=null;
 }
 // v207: reverse drag, from the chosen destination to the matching cargo.
 function cargoAt(x,y){
  return [...cargo.querySelectorAll('[data-item]')].find(b=>{
   const r=b.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
  })||null;
 }
 function clearReverseDrag(){
  if(!reverseDrag)return;
  if(reverseDrag.ghost)reverseDrag.ghost.remove();
  if(reverseDrag.target)reverseDrag.target.classList.remove('delivery-reverse-target');
  reverseDrag.button.classList.remove('delivery-reverse-dragging');
  reverseDrag=null;
 }
 dest.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-station]');
  if(!b||reverseDrag||locked||phase!=='cargo'||token!==generation||e.isPrimary===false)return;
  reverseDrag={pointerId:e.pointerId,button:b,x:e.clientX,y:e.clientY,moved:false,ghost:null,target:null};
  try{dest.setPointerCapture(e.pointerId)}catch(_){}
 });
 dest.addEventListener('pointermove',e=>{
  if(!reverseDrag||e.pointerId!==reverseDrag.pointerId||token!==generation)return;
  if(!reverseDrag.moved&&Math.hypot(e.clientX-reverseDrag.x,e.clientY-reverseDrag.y)<10)return;
  if(!reverseDrag.moved){
   reverseDrag.moved=true;reverseDrag.button.classList.add('delivery-reverse-dragging');
   const ghost=document.createElement('div');ghost.className='delivery-drag-ghost delivery-reverse-ghost';
   ghost.textContent=reverseDrag.button.querySelector('span')?.textContent||'📍';
   app.appendChild(ghost);reverseDrag.ghost=ghost;
  }
  reverseDrag.ghost.style.left=e.clientX+'px';reverseDrag.ghost.style.top=e.clientY+'px';
  const target=cargoAt(e.clientX,e.clientY);
  if(reverseDrag.target!==target){
   if(reverseDrag.target)reverseDrag.target.classList.remove('delivery-reverse-target');
   reverseDrag.target=target;if(target)target.classList.add('delivery-reverse-target');
  }
 });
 dest.addEventListener('pointerup',e=>{
  if(!reverseDrag||e.pointerId!==reverseDrag.pointerId)return;
  const b=reverseDrag.button,moved=reverseDrag.moved,target=moved?cargoAt(e.clientX,e.clientY):null;
  clearReverseDrag();suppressStationClickUntil=Date.now()+450;
  if(!moved){selectStation(b);return;}
  if(token!==generation||locked||phase!=='cargo')return;
  if(!target){guide.textContent='👆 把地點拖到上面的貨物！';return;}
  if(b.dataset.station!==task.station.id){wrong(b);guide.textContent='💗 先找對送貨地點！';return;}
  if(target.dataset.item!==task.good[0]){wrong(target);guide.textContent='💗 再找對的貨物！';return;}
  if(chooseCargo(target,false))deliver(b);
 });
 dest.addEventListener('pointercancel',e=>{if(reverseDrag&&e.pointerId===reverseDrag.pointerId)clearReverseDrag()});
 dest.addEventListener('lostpointercapture',e=>{if(reverseDrag&&e.pointerId===reverseDrag.pointerId)clearReverseDrag()});
 cargo.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-item]');
  if(!b||drag||locked||phase!=='cargo'||token!==generation||e.isPrimary===false)return;
  drag={pointerId:e.pointerId,button:b,x:e.clientX,y:e.clientY,moved:false,spoken:false,holdTimer:null,ghost:null,target:null};
  // v218: preschool audio labels on a stationary long press; never count as an answer.
  const active=drag;
  active.holdTimer=setTimeout(()=>{
   if(drag!==active||drag.moved||locked||phase!=='cargo'||token!==generation)return;
   active.holdTimer=null;active.spoken=true;
   audio.unlock();const name=b.getAttribute('aria-label')||'貨物';say('這是'+name+'。');
   b.classList.add('delivery-speaking');guide.textContent='🔊 這是 '+name+'！放開後可以再點或拖曳送貨。';
   vib(10);suppressCargoClickUntil=Date.now()+700;
  },500);
  try{cargo.setPointerCapture(e.pointerId)}catch(_){}
 });
 cargo.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointerId||token!==generation)return;
  if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10)return;
  if(drag.holdTimer!==null){clearTimeout(drag.holdTimer);drag.holdTimer=null;}
  if(drag.spoken)return; // keep a long-press audio gesture separate from delivery
  if(!drag.moved){
   drag.moved=true;drag.button.classList.add('delivery-dragging');
   const ghost=document.createElement('div');ghost.className='delivery-drag-ghost';
   ghost.textContent=drag.button.dataset.item;app.appendChild(ghost);drag.ghost=ghost;
  }
  drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
  const target=stationAt(e.clientX,e.clientY);
  if(drag.target!==target){
   if(drag.target)drag.target.classList.remove('delivery-drop-target');
   drag.target=target;if(target)target.classList.add('delivery-drop-target');
  }
 });
 cargo.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  const b=drag.button,moved=drag.moved,spoken=drag.spoken,target=moved?stationAt(e.clientX,e.clientY):null;
  clearDrag();suppressCargoClickUntil=Date.now()+(spoken?700:450);
  if(token!==generation||locked||phase!=='cargo'||spoken)return;
  if(!moved){chooseCargo(b);return;}
  if(b.dataset.item!==task.good[0]){wrong(b);return;}
  if(!target){guide.textContent='👆 把貨物拖到下面的地點！';return;}
  if(target.dataset.station!==task.station.id){wrong(target);guide.textContent='💗 再找正確的送貨地點！';return;}
  if(chooseCargo(b,false))deliver(target);
 });
 cargo.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.pointerId)clearDrag()});
 cargo.addEventListener('lostpointercapture',e=>{if(drag&&e.pointerId===drag.pointerId)clearDrag()});
 cargo.addEventListener('click',e=>{
  if(Date.now()<suppressCargoClickUntil)return;
  const b=e.target.closest('[data-item]');chooseCargo(b);
 });
 dest.addEventListener('click',e=>{
  if(Date.now()<suppressStationClickUntil)return;
  const b=e.target.closest('[data-station]');if(phase==='cargo')selectStation(b);else deliver(b);
 });
 app.querySelector('#delivery-back').onclick=menu;
 app.querySelector('#delivery-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#delivery-retry').onclick=()=>start(level);
 app.querySelector('#delivery-speak').onclick=()=>{audio.unlock();cue()};
 app.querySelector('#delivery-assist').onclick=assistStep;
 app.querySelector('#delivery-undo').onclick=undoSelection;
 app.querySelector('#delivery-hint').onclick=()=>{audio.unlock();cue();const selector=phase==='cargo'?'[data-item]':'[data-station]';const value=phase==='cargo'?task.good[0]:task.station.id;const b=[...app.querySelectorAll(selector)].find(x=>x.dataset[phase==='cargo'?'item':'station']===value);if(b){b.classList.add('delivery-highlight');setTimeout(()=>b.classList.remove('delivery-highlight'),1200)}};
 draw();
}
function enhance(){
 const classic=app.querySelector('.classic-menu');
 if(classic&&!classic.querySelector('#delivery-entry')){
  const b=document.createElement('button');b.id='delivery-entry';b.className='classic-tile delivery-tile';b.setAttribute('aria-label','開始彥彥運貨大隊');
  b.innerHTML='<span class="classic-big">🚜📦</span><strong>挖土機運貨</strong><span>📦 ➜ 🏗️ 🌷 🦁</span><small>⭐ '+(Number(state.deliveryLevel)||1)+' / '+MAX+'</small>';
  classic.insertBefore(b,classic.querySelector('.classic-audio-controls'));b.onclick=()=>start();
 }

}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanDeliveryGame={start,stop,makeTask,enhance};
})();