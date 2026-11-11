(()=>{
'use strict';
// v360: drag the basket onto a treasure to collect in one gesture; preserves all existing answers, hints and saves.
// v311: optional listen-only treasure hunt; children identify the spoken item without the answer icon.
// v308: switch scenes without losing progress or stars.
// v290: hold any treasure 450ms to hear its name without scoring; tap and drag remain intact.
// v184: wrong choices retire after a tap, spoken item feedback; progress, drag and photo preview preserved.
// v164.1: full-size photo preview plus captured-pointer tap repair; drag, rewards and saves preserved.
const shared=window.YanClassicShared,audio=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!shared||!audio||photos.length<7)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=shared;
const SCENES=[{"id":"petshop","name":"寵物店","photo":"petshop","items":[{"icon":"🦴","name":"骨頭"},{"icon":"🐕","name":"小狗"},{"icon":"🥣","name":"飼料碗"}]},{"id":"playground","name":"公園","photo":"playground","items":[{"icon":"⚽","name":"皮球"},{"icon":"🪁","name":"風箏"},{"icon":"🧢","name":"帽子"}]},{"id":"restaurant","name":"餐廳","photo":"restaurant","items":[{"icon":"🥄","name":"湯匙"},{"icon":"🥤","name":"飲料"},{"icon":"🍎","name":"蘋果"}]},{"id":"bedtime","name":"睡前故事","photo":"bedtime","items":[{"icon":"📖","name":"故事書"},{"icon":"🧸","name":"玩偶"},{"icon":"🛏️","name":"小床"}]},{"id":"school","name":"上學","photo":"school","items":[{"icon":"🎒","name":"書包"},{"icon":"✏️","name":"鉛筆"},{"icon":"📚","name":"課本"}]},{"id":"swing","name":"盪鞦韆","photo":"swing","items":[{"icon":"🛝","name":"溜滑梯"},{"icon":"👟","name":"運動鞋"},{"icon":"🧃","name":"果汁"}]},{"id":"picnic","name":"野餐","photo":"picnic","items":[{"icon":"🧺","name":"野餐籃"},{"icon":"🍓","name":"草莓"},{"icon":"🥪","name":"三明治"}]}];
const makeRound=function makeRound(level,previous,scenes,rng=Math.random){
 function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 const eligible=scenes.filter(s=>s.id!==previous),scene=eligible[Math.floor(rng()*eligible.length)];
 const target=scene.items[Math.floor(rng()*scene.items.length)];
 const all=scenes.flatMap(s=>s.items).filter(i=>i.icon!==target.icon);
 const count=level<=10?3:4;
 const choices=shuffle([target,...shuffle(all).slice(0,count-1)]);
 return {scene,target,choices};
};
const MAX=40,ROUNDS=3;
let generation=0,pending=null,previous=null;
function stop(){generation++;if(pending){clearTimeout(pending);pending=null}}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();audio.unlock();
 const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.familyTreasureLevel)||1));
 let round=(requested===undefined&&Number(state.familyTreasureCheckpointLevel)===level)?Math.max(0,Math.min(ROUNDS-1,Number(state.familyTreasureRound)||0)):0;
 state.familyTreasureCheckpointLevel=level;state.familyTreasureRound=round;persist();
 const token=generation;let current=null,locked=false,errors=0,listenOnly=false;
 app.innerHTML='<section class="screen game classic-screen treasure-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="treasure-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🧺 親子尋寶袋</span><span class="chip">⭐ '+level+' / '+MAX+'</span><button class="iconbtn" id="treasure-speak" aria-label="再聽一次題目">🔊</button></header>'+
 '<main class="treasure-stage"><div class="treasure-progress"><span id="treasure-progress">🌟 '+(round+1)+' / '+ROUNDS+'</span><span id="treasure-status">💗 幫媽媽找東西</span></div>'+
 '<div class="treasure-photo"><img id="treasure-photo" alt="媽媽和彥彥的親子照片，點一下放大" draggable="false"><span id="treasure-photo-fallback" hidden>👩‍👦</span><button id="treasure-zoom" type="button" aria-label="放大親子照片">🔎 放大</button></div>'+
 '<div class="treasure-prompt" aria-live="polite"><span id="treasure-emoji">🎒</span><strong id="treasure-title">找一找</strong></div>'+
 '<div class="treasure-choices" id="treasure-choices" role="group" aria-label="選擇要收集的物品"></div>'+
 '<div class="treasure-basket" aria-live="polite"><button id="treasure-scoop" type="button" aria-label="按住袋子，滑到想收集的寶物" title="按住滑到寶物">🧺 拿袋子</button><span id="treasure-collected">◯ ◯ ◯</span><button id="treasure-hint" type="button">💡 提示<small>按住幫拿</small></button><button id="treasure-change" type="button" aria-label="換一個新場景，不影響星星與進度">🎲 換場景</button><button id="treasure-listen" type="button" aria-pressed="false" aria-label="開啟聽聲挑戰">👂 聽聲挑戰</button></div>'+
 '<p class="treasure-guide" id="treasure-guide">👆 點寶物、拖進袋子，或拿袋子滑到寶物！</p></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="treasure-home">⌂ 首頁</button><button class="footbtn yellow" id="treasure-retry">🔄 重玩</button></footer><div class="treasure-preview" id="treasure-preview" role="dialog" aria-modal="true" aria-label="放大親子照片" hidden><div class="treasure-preview-panel"><button id="treasure-preview-close" type="button">✕ 返回尋寶</button><img id="treasure-preview-img" alt="放大的親子照片"><span id="treasure-preview-fallback" hidden>👩‍👦</span></div></div></section>';
 const photo=app.querySelector('#treasure-photo'),choices=app.querySelector('#treasure-choices'),guide=app.querySelector('#treasure-guide'),basket=app.querySelector('.treasure-basket');
 const scoop=app.querySelector('#treasure-scoop');
 const zoom=app.querySelector('#treasure-zoom'),preview=app.querySelector('#treasure-preview'),previewImg=app.querySelector('#treasure-preview-img'),previewClose=app.querySelector('#treasure-preview-close'),previewFallback=app.querySelector('#treasure-preview-fallback');
 function closePreview(){if(preview.hidden)return;preview.hidden=true;if(document.activeElement===previewClose)zoom.focus()}
 function openPreview(){
  if(!current||token!==generation)return;
  preview.hidden=false;previewFallback.hidden=true;previewImg.hidden=false;previewImg.dataset.fallback='';
  previewImg.onerror=()=>{
   if(!previewImg.dataset.fallback){previewImg.dataset.fallback='webp';previewImg.src='./assets/family-home.webp';return}
   previewImg.onerror=null;previewImg.hidden=true;previewFallback.hidden=false;
  };
  previewImg.src=photo.currentSrc||photo.src;previewClose.focus();
 }
 zoom.onclick=openPreview;photo.onclick=openPreview;previewClose.onclick=closePreview;
 preview.onclick=e=>{if(e.target===preview)closePreview()};
 preview.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();closePreview()}};

 function cue(){if(current)say('彥彥，跟媽媽一起找寶物！請找到'+current.target.name+'！')}
 function next(){
  if(token!==generation)return;
  closePreview();locked=false;current=makeRound(level,previous,SCENES);previous=current.scene.id;
  app.querySelector('#treasure-progress').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  app.querySelector('#treasure-status').textContent='💗 幫媽媽找東西';
  app.querySelector('#treasure-emoji').textContent=listenOnly?'❔':current.target.icon;
  app.querySelector('#treasure-title').textContent=listenOnly?'聽聲音找寶物！':'找出 '+current.target.name+'！';
  app.querySelector('#treasure-collected').textContent='⭐ '.repeat(round)+'◯ '.repeat(ROUNDS-round);
  guide.textContent=listenOnly?'👂 聽媽媽說寶物名稱，再選對物品！':'👆 點寶物、拖進袋子，或拿袋子滑到寶物！';
  const listenButton=app.querySelector('#treasure-listen');listenButton.disabled=false;listenButton.setAttribute('aria-pressed',String(listenOnly));listenButton.textContent=listenOnly?'👀 看圖找':'👂 聽聲挑戰';
  photo.hidden=false;photo.src='./assets/'+current.scene.photo+'-scene.avif';
  photo.onerror=()=>{photo.onerror=null;photo.src='./assets/family-home.webp'};
  choices.innerHTML=current.choices.map(item=>'<button class="treasure-item" type="button" data-icon="'+item.icon+'" aria-label="'+item.name+'"><span>'+item.icon+'</span></button>').join('');
  app.querySelector('#treasure-hint').disabled=false;app.querySelector('#treasure-change').disabled=false;cue();
 }
 function finish(){
  if(token!==generation)return;
  state.familyTreasureLevel=Math.max(Number(state.familyTreasureLevel)||1,Math.min(MAX,level+1));
  state.familyTreasureCheckpointLevel=state.familyTreasureLevel;state.familyTreasureRound=0;
  state.familyTreasureWins=(Number(state.familyTreasureWins)||0)+1;
  state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  audio.play('win');fx('win');vib([15,25,15]);say('太棒了！彥彥把三個寶物都找到了！');
  const overlay=document.createElement('div');overlay.className='overlay treasure-win';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 寶物收集成功！</h2><p>🧺 找到三個寶物！</p><button class="primary" id="treasure-next">▶️ 下一關</button><button class="classic-secondary" id="treasure-again">🔄 再玩一次</button><button class="classic-secondary" id="treasure-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#treasure-next').onclick=()=>start(Math.min(MAX,level+1));
  overlay.querySelector('#treasure-again').onclick=()=>start(level);
  overlay.querySelector('#treasure-menu').onclick=menu;
 }
 choices.addEventListener('click',e=>{
  const b=e.target.closest('.treasure-item');if(!b||locked||token!==generation)return;
  audio.unlock();
  if(b.dataset.icon!==current.target.icon){
   errors++;audio.play('wrong');vib(15);b.classList.remove('treasure-wrong');void b.offsetWidth;b.classList.add('treasure-wrong','treasure-eliminated');
   b.disabled=true;b.setAttribute('aria-disabled','true');
   app.querySelector('#treasure-status').textContent='💪 再找找！';
   guide.textContent='💗 '+b.getAttribute('aria-label')+'不是寶物，再找 '+current.target.icon;
   say('這是'+b.getAttribute('aria-label')+'，再找找'+current.target.name+'！');
   if(errors%2===0)app.querySelector('#treasure-hint').classList.add('treasure-hint-pulse');
   return;
  }
  locked=true;app.querySelector('#treasure-change').disabled=true;app.querySelector('#treasure-listen').disabled=true;b.classList.add('treasure-correct');choices.querySelectorAll('button').forEach(x=>x.disabled=true);
  audio.play('hit');fx('yay');vib([12,25,12]);round++;
  state.familyTreasureRound=round;state.familyTreasureCheckpointLevel=level;persist();
  app.querySelector('#treasure-collected').textContent='⭐ '.repeat(round)+'◯ '.repeat(ROUNDS-round);
  app.querySelector('#treasure-status').textContent='🌟 找到了！';guide.textContent='🎉 好棒！';
  pending=setTimeout(round>=ROUNDS?finish:next,650);
 });

 // v123: drag a treasure to the basket, while keeping the original click answer path.
 let drag=null,suppressTrustedClickUntil=0;
 const insideBasket=(x,y)=>{const r=basket.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom};
 function endDrag(){
  if(!drag)return;
  clearTimeout(drag.holdTimer);
  drag.item.classList.remove('treasure-drag-source','treasure-speaking');
  basket.classList.remove('treasure-drop-ready');
  drag.ghost?.remove();
  drag=null;
 }
 choices.addEventListener('click',e=>{
  if(e.isTrusted&&e.detail!==0&&Date.now()<suppressTrustedClickUntil){e.preventDefault();e.stopImmediatePropagation()}
 },true);
 choices.addEventListener('pointerdown',e=>{
  const item=e.target.closest('.treasure-item');
  if(!item||item.disabled||locked||token!==generation||drag||e.isPrimary===false||e.button>0)return;
  const d={id:e.pointerId,item,x:e.clientX,y:e.clientY,moved:false,ghost:null,previewed:false,holdTimer:null};
  drag=d;
  d.holdTimer=setTimeout(()=>{
   if(drag!==d||d.moved||locked||token!==generation)return;
   d.previewed=true;d.item.classList.add('treasure-speaking');
   audio.unlock();audio.play('pop');
   const name=d.item.getAttribute('aria-label')||'寶物';
   say('這是'+name+'。');
   guide.textContent='🔊 這是'+name+'！放開後再點一下，才會收集。';
  },450);
  try{choices.setPointerCapture(e.pointerId)}catch(_){}
 });
 choices.addEventListener('pointermove',e=>{
  const d=drag;if(!d||d.id!==e.pointerId||locked||d.previewed)return;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<10)return;
  clearTimeout(d.holdTimer);d.holdTimer=null;
  if(!d.moved){
   d.moved=true;d.item.classList.add('treasure-drag-source');
   d.ghost=document.createElement('span');d.ghost.className='treasure-drag-ghost';
   d.ghost.textContent=d.item.dataset.icon;d.ghost.setAttribute('aria-hidden','true');
   app.querySelector('.treasure-screen').appendChild(d.ghost);
   guide.textContent='🧺 把寶物放進袋子！';
  }
  d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
  basket.classList.toggle('treasure-drop-ready',insideBasket(e.clientX,e.clientY));
 });
 choices.addEventListener('pointerup',e=>{
  const d=drag;if(!d||d.id!==e.pointerId)return;
  const moved=d.moved,previewed=d.previewed,accepted=moved&&insideBasket(e.clientX,e.clientY),item=d.item;
  endDrag();
  // Pointer capture on the choices container retargets the browser's synthetic click.
  // Dispatch the saved item's click ourselves for taps, and suppress only duplicate trusted clicks.
  suppressTrustedClickUntil=Date.now()+500;
  if(previewed){e.preventDefault();guide.textContent='🔊 聽完了！輕點一下才收集寶物。';return}
  if(moved){
   e.preventDefault();
   if(accepted&&!locked&&token===generation)item.click();
   else if(!locked)guide.textContent='👆 放進寶物袋才算收集，或直接點物品！';
  }else if(!locked&&token===generation)item.click();
 });
 const cancelDrag=e=>{if(drag&&drag.id===e.pointerId)endDrag()};
 choices.addEventListener('pointercancel',cancelDrag);
 choices.addEventListener('lostpointercapture',cancelDrag);
 // v360: reverse gesture: carry the basket to a treasure. The original click handler owns scoring.
 let scoopDrag=null,scoopHover=null;
 function scoopAt(x,y){
  const node=document.elementFromPoint(x,y);
  const item=node&&node.closest('.treasure-item');
  return item&&choices.contains(item)&&!item.disabled?item:null;
 }
 function clearScoop(){
  if(scoopHover)scoopHover.classList.remove('treasure-scoop-target');
  scoopHover=null;
  if(scoopDrag&&scoopDrag.ghost)scoopDrag.ghost.remove();
  scoopDrag=null;scoop.classList.remove('treasure-scooping');
 }
 scoop.addEventListener('pointerdown',e=>{
  if(scoopDrag||drag||locked||token!==generation||e.isPrimary===false||e.button>0)return;
  scoopDrag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,ghost:null};
  try{scoop.setPointerCapture(e.pointerId)}catch(_){}
 });
 scoop.addEventListener('pointermove',e=>{
  const d=scoopDrag;if(!d||d.id!==e.pointerId||locked||token!==generation)return;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<10)return;
  if(!d.moved){
   d.moved=true;scoop.classList.add('treasure-scooping');
   d.ghost=document.createElement('span');d.ghost.className='treasure-scoop-ghost';
   d.ghost.textContent='🧺';d.ghost.setAttribute('aria-hidden','true');
   app.querySelector('.treasure-screen').appendChild(d.ghost);
   guide.textContent='🧺 把袋子滑到要找的寶物上！';
  }
  d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
  const hit=scoopAt(e.clientX,e.clientY);
  if(hit!==scoopHover){
   if(scoopHover)scoopHover.classList.remove('treasure-scoop-target');
   scoopHover=hit;if(hit)hit.classList.add('treasure-scoop-target');
  }
 });
 scoop.addEventListener('pointerup',e=>{
  const d=scoopDrag;if(!d||d.id!==e.pointerId)return;
  const moved=d.moved,hit=moved?scoopAt(e.clientX,e.clientY):null;
  clearScoop();
  if(moved){
   e.preventDefault();
   if(hit&&!locked&&token===generation)hit.click();
   else if(!locked)guide.textContent='👆 滑到寶物圖案才會收集，也可以直接點寶物！';
  }else if(!locked)guide.textContent='🧺 按住袋子，滑到要找的寶物！';
 });
 const cancelScoop=e=>{if(scoopDrag&&scoopDrag.id===e.pointerId)clearScoop()};
 scoop.addEventListener('pointercancel',cancelScoop);
 scoop.addEventListener('lostpointercapture',cancelScoop);
 app.querySelector('#treasure-change').onclick=()=>{
  if(locked||token!==generation)return;
  if(drag)endDrag();
  if(scoopDrag)clearScoop();
  closePreview();
  if(pending){clearTimeout(pending);pending=null}
  errors=0;
  app.querySelector('#treasure-hint').classList.remove('treasure-hint-pulse');
  audio.unlock();audio.play('pop');vib(8);
  next();
  guide.textContent='🎲 換了新場景！找找看這次的寶物！';
 };
 app.querySelector('#treasure-listen').onclick=()=>{
  if(locked||token!==generation||!current)return;
  listenOnly=!listenOnly;audio.unlock();audio.play('pop');
  app.querySelector('#treasure-emoji').textContent=listenOnly?'❔':current.target.icon;
  app.querySelector('#treasure-title').textContent=listenOnly?'聽聲音找寶物！':'找出 '+current.target.name+'！';
  const button=app.querySelector('#treasure-listen');button.setAttribute('aria-pressed',String(listenOnly));button.textContent=listenOnly?'👀 看圖找':'👂 聽聲挑戰';
  guide.textContent=listenOnly?'👂 聽媽媽說寶物名稱，再選對物品！':'👆 看圖選物品，也能拖進袋子！';
  cue();
 };
 // v390: hold hint 650ms to let Mom collect one correct treasure using the original answer path.
 // Short taps still only reveal a clue; cancel, movement and a second finger never collect.
 const hintButton=app.querySelector('#treasure-hint');
 let assistPointer=null,assistTimer=null,assistSuppressUntil=0;
 hintButton.setAttribute('aria-label','點一下提示，按住約半秒請媽媽幫拿一個寶物');
 function clearAssist(){
  if(assistTimer!==null){clearTimeout(assistTimer);assistTimer=null}
  hintButton.classList.remove('treasure-assist-holding');
  assistPointer=null;
 }
 hintButton.addEventListener('pointerdown',e=>{
  if(assistPointer){
   if(e.pointerId!==assistPointer.id){assistSuppressUntil=Date.now()+800;clearAssist()}
   return;
  }
  if(locked||token!==generation||!current||hintButton.disabled||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  assistPointer={id:e.pointerId,x:e.clientX,y:e.clientY};
  hintButton.classList.add('treasure-assist-holding');
  try{hintButton.setPointerCapture(e.pointerId)}catch(_){}
  assistTimer=setTimeout(()=>{
   if(!assistPointer||locked||token!==generation||hintButton.disabled)return;
   assistSuppressUntil=Date.now()+1000;
   clearAssist();
   const correct=[...choices.querySelectorAll('button')].find(b=>b.dataset.icon===current.target.icon&&!b.disabled);
   if(correct){guide.textContent='👩 媽媽幫你拿到了！';correct.click()}
  },650);
 });
 hintButton.addEventListener('pointermove',e=>{
  if(assistPointer?.id===e.pointerId&&Math.hypot(e.clientX-assistPointer.x,e.clientY-assistPointer.y)>14)clearAssist();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  hintButton.addEventListener(type,e=>{if(assistPointer?.id===e.pointerId)clearAssist()});
 }
 hintButton.onclick=()=>{if(Date.now()<assistSuppressUntil)return;
  if(locked)return;audio.unlock();audio.play('pop');cue();
  const correct=[...choices.querySelectorAll('button')].find(b=>b.dataset.icon===current.target.icon);
  if(correct){correct.classList.add('treasure-hinted');pending=setTimeout(()=>correct.classList.remove('treasure-hinted'),1200)}
 };
 app.querySelector('#treasure-back').onclick=menu;
 app.querySelector('#treasure-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#treasure-retry').onclick=()=>start(level);
 app.querySelector('#treasure-speak').onclick=()=>{audio.unlock();cue()};
 next();
}
function enhance(){
 const classic=app.querySelector('.classic-menu');if(!classic||classic.querySelector('#treasure-entry'))return;
 const b=document.createElement('button');b.id='treasure-entry';b.className='classic-tile treasure-tile';b.setAttribute('aria-label','開始親子尋寶袋');
 b.innerHTML='<span class="classic-big">🧺👩‍👦</span><strong>親子尋寶袋</strong><span>👀 👆 ⭐</span><small>⭐ '+(Number(state.familyTreasureLevel)||1)+' / '+MAX+'</small>';
 classic.insertBefore(b,classic.querySelector('.classic-audio-controls'));b.onclick=()=>start();
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanFamilyTreasure={start,stop,makeRound,enhance};
})();