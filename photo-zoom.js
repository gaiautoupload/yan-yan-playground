/* v332: two-finger pinch-to-zoom in photo preview, without answering or changing progress. */
/* v327: parent points at the correct photo for 2.4 seconds without answering or awarding stars. */
// v302: double-tap enlarged gallery photos to zoom/restore; backdrop tap remains safe under pointer capture.
// v301: enlarged-photo gallery offers 2x zoom and one-finger panning without changing answers or scores.
// v299: clue-corner rotation skips the already displayed corner, including the first gallery tap.
// v298: change clue corners inside enlarged photo comparison without closing the gallery or submitting an answer.
(()=>{
'use strict';
// v296: enlarge-photo gallery now offers an optional side-by-side clue crop to compare without answering.
// v295: enlarged photo preview can explicitly submit the selected photo with one large button, preserving preview-only browsing and wrong-answer elimination.
// v291: wrong answers visibly cross out and become unselectable for the current round; no score/progress changes.
// v271: preview photos now support left/right swipe, arrow buttons and keyboard navigation without submitting answers.
// v261: hold large mystery photo 480ms to peek full picture, release to restore; reversible hint button preserves scores and progress.
// v245: one-tap 'remove one wrong photo' hint gives a child a gentler choice without awarding stars or submitting an answer.
// v244: children can drag an answer photo upward onto the mystery image; tap, zoom preview, scores and saves stay intact.
// v243: add separate enlarge buttons for each answer photo; preview never submits an answer or changes progress.
// v230: tap the large mystery photo to cycle clues; keyboard Enter/Space also cycles; dragging to an answer remains intact.
// v163: drag the zoomed clue onto a photo to answer; preserves tapping, exploring, scores and saved progress.
// v149: one-tap corner clues plus AVIF scene fallback; existing answers, stars and saved progress preserved.
const shared=window.YanClassicShared,audio=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!shared||!audio||photos.length<4)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=shared;
const MAX=40,ROUNDS=3,icons={petshop:'🐶',playground:'🏃',restaurant:'🍝',bedtime:'📖',school:'🎒',swing:'🛝',picnic:'🐱'};
let generation=0,pending=null,previous=null;
function shuffle(items,rng=Math.random){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeRound(level,prev=null,items=photos,rng=Math.random){
 const count=Math.min(items.length,level<=8?2:level<=20?3:4);
 const candidates=items.filter(p=>p.id!==prev);
 const target=(candidates.length?candidates:items)[Math.floor(rng()*(candidates.length||items.length))];
 const options=shuffle([target,...shuffle(items.filter(p=>p.id!==target.id),rng).slice(0,count-1)],rng);
 const focus=[28,50,72];
 return {target,options,zoom:level<=8?1.85:level<=20?2.15:2.5,originX:focus[Math.floor(rng()*3)],originY:focus[Math.floor(rng()*3)]};
}
function stop(){generation++;if(pending){clearTimeout(pending);pending=null}}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();audio.unlock();
 const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.familyZoomLevel)||1));
 let round=(requested===undefined&&Number(state.familyZoomCheckpointLevel)===level)?Math.max(0,Math.min(ROUNDS-1,Number(state.familyZoomRound)||0)):0;
 state.familyZoomCheckpointLevel=level;state.familyZoomRound=round;persist();
 const token=generation;let game=null,locked=false,errors=0;
 app.innerHTML='<section class="screen game classic-screen zoom-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="zoom-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🔍 照片猜猜看</span><span class="chip">⭐ '+level+' / '+MAX+'</span><button class="iconbtn" id="zoom-speak" aria-label="聽玩法">🔊</button></header>'+
 '<main class="zoom-stage"><div class="zoom-heading">👀 <strong>找出這張照片！</strong> 👆</div>'+
 '<div class="zoom-progress"><span id="zoom-round">🌟 '+(round+1)+' / '+ROUNDS+'</span><span id="zoom-status">💗 仔細看看</span></div>'+
 '<div class="zoom-mystery" tabindex="0" role="group" aria-label="點一下換角落，按住半秒偷看全圖，放開恢復；也可拖到答案照片"><img id="zoom-detail" draggable="false" alt="猜猜是哪張照片"><span id="zoom-fallback" hidden>📷</span><span class="zoom-magnifier">🔎</span></div>'+
 '<div class="zoom-choices" id="zoom-choices" role="group" aria-label="選出正確照片"></div>'+
 '<div class="zoom-actions"><button type="button" class="zoom-corner" id="zoom-corner" aria-label="換一個照片角落">🔄 換角落</button><button type="button" class="zoom-hint" id="zoom-hint">👀 看多一點</button><button type="button" class="zoom-eliminate" id="zoom-eliminate">🧩 排除一張</button><button type="button" class="zoom-point" id="zoom-point" aria-label="請媽媽指出正確照片，僅提示不作答">👩 指一指</button></div><div class="zoom-guide" id="zoom-guide" aria-live="polite">👆 點選照片，或把照片拖到上方大圖！</div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="zoom-home">⌂ 首頁</button><button class="footbtn yellow" id="zoom-retry">🔄 重玩</button></footer></section>';
 const mystery=app.querySelector('.zoom-mystery'),detail=app.querySelector('#zoom-detail'),fallback=app.querySelector('#zoom-fallback'),choices=app.querySelector('#zoom-choices'),guide=app.querySelector('#zoom-guide'),hint=app.querySelector('#zoom-hint'),eliminate=app.querySelector('#zoom-eliminate'),point=app.querySelector('#zoom-point');


 let explorePointer=null,cornerIndex=-1,dragOrigin=null,dropChoice=null;
 let choiceDrag=null,suppressClicksUntil=0;
 let previewOverlay=null,previewReturnFocus=null;
 let peekTimer=null,peekActive=false,peekRestore='',hintFull=false,pointTimer=null;
 function clearPoint(){if(pointTimer!==null){clearTimeout(pointTimer);pointTimer=null}choices.querySelectorAll('.zoom-choice.zoom-pointed').forEach(b=>b.classList.remove('zoom-pointed'))}
 function clearPeekTimer(){if(peekTimer!==null){clearTimeout(peekTimer);peekTimer=null}}
 function endPeek(){
  clearPeekTimer();if(!peekActive)return false;
  peekActive=false;mystery.classList.remove('zoom-peeking');
  if(!locked&&token===generation&&game&&!detail.hidden){detail.style.transform=peekRestore||'scale('+game.zoom+')';guide.textContent='🔎 繼續找線索，再選下面的照片！'}
  return true;
 }
 const corners=[[28,28],[72,28],[72,72],[28,72]];
 function closePreview(){
  if(!previewOverlay)return;
  const old=previewOverlay;previewOverlay=null;old.remove();
  const focus=previewReturnFocus;previewReturnFocus=null;
  if(focus?.isConnected&&!focus.disabled)focus.focus();
 }
 function openPreview(photo,trigger){
  if(!photo||locked||token!==generation||!game)return;
  closePreview();resetExplore();previewReturnFocus=trigger;
  const overlay=document.createElement('div');previewOverlay=overlay;
  overlay.className='overlay zoom-preview-overlay';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','放大照片，可左右切換');
  overlay.innerHTML='<div class="zoom-preview-panel"><button type="button" class="zoom-preview-close" aria-label="關閉放大照片">✕ 關閉</button><div class="zoom-preview-gallery"><button type="button" class="zoom-preview-prev" aria-label="上一張照片">❮</button><img alt="放大的照片" draggable="false"><button type="button" class="zoom-preview-next" aria-label="下一張照片">❯</button></div><span class="zoom-preview-fallback" hidden>📷 照片載入失敗</span><p class="zoom-preview-counter" aria-live="polite"></p><button type="button" class="zoom-preview-magnify" aria-pressed="false">🔎 放大兩倍</button><button type="button" class="zoom-preview-compare-toggle" aria-pressed="false">🔍 對照線索</button><div class="zoom-preview-clue-wrap" hidden><span>🔎 線索角落</span><div class="zoom-preview-clue"><img alt="線索照片角落" draggable="false"></div><button type="button" class="zoom-preview-next-clue" aria-label="切換線索角落">🔄 換角落</button><span>👀 比較上方照片</span></div><button type="button" class="zoom-preview-choose" aria-label="選擇目前放大的照片">✅ 選這張照片</button><p>👈 左右滑動換照片，雙指縮放或連點放大，再按選這張！</p></div>';
  const image=overlay.querySelector('img'),failed=overlay.querySelector('.zoom-preview-fallback');
  const prev=overlay.querySelector('.zoom-preview-prev'),next=overlay.querySelector('.zoom-preview-next'),counter=overlay.querySelector('.zoom-preview-counter'),choose=overlay.querySelector('.zoom-preview-choose');
  const magnify=overlay.querySelector('.zoom-preview-magnify'),compare=overlay.querySelector('.zoom-preview-compare-toggle'),clueWrap=overlay.querySelector('.zoom-preview-clue-wrap'),clueImage=clueWrap.querySelector('img'),clueNext=clueWrap.querySelector('.zoom-preview-next-clue'),panel=overlay.querySelector('.zoom-preview-panel');
  compare.onclick=()=>{
   const showing=clueWrap.hidden;clueWrap.hidden=!showing;panel.classList.toggle('zoom-preview-comparing',showing);
   compare.setAttribute('aria-pressed',String(showing));compare.textContent=showing?'🙈 隱藏線索':'🔍 對照線索';
   if(showing){clueImage.hidden=false;clueImage.src=detail.src;clueImage.style.transform=detail.style.transform;clueImage.style.transformOrigin=detail.style.transformOrigin;}
  };
  clueNext.onclick=()=>{if(previewOverlay!==overlay||clueWrap.hidden||locked||token!==generation)return;rotateCorner();clueImage.hidden=false;clueImage.src=detail.src;clueImage.style.transform=detail.style.transform;clueImage.style.transformOrigin=detail.style.transformOrigin;};
  clueImage.onerror=()=>{clueImage.onerror=null;clueImage.hidden=true;clueWrap.querySelector('.zoom-preview-clue').textContent='📷';};
  let index=Math.max(0,game.options.findIndex(p=>p.id===photo.id)),swipe=null,pan=null,zoomed=false,originX=50,originY=50,lastPhotoTap=null;
  let photoScale=1,pinch=null;const photoTouches=new Map();
  function applyPhotoScale(value){
   photoScale=Math.max(1,Math.min(3,value));zoomed=photoScale>1.05;
   image.classList.toggle('zoom-preview-zoomed',zoomed);image.style.transform='scale('+photoScale.toFixed(3)+')';
   magnify.setAttribute('aria-pressed',String(zoomed));magnify.textContent=zoomed?'🔍 還原照片':'🔎 放大兩倍';
  }
  function setMagnified(active){pan=null;pinch=null;originX=originY=50;image.style.transformOrigin='50% 50%';applyPhotoScale(active?2:1);}
  magnify.onclick=()=>{if(image.hidden||previewOverlay!==overlay||locked||token!==generation)return;setMagnified(!zoomed);};
  function showAt(i){
   if(previewOverlay!==overlay||token!==generation)return;
   index=(i+game.options.length)%game.options.length;
   lastPhotoTap=null;setMagnified(false);
   const item=game.options[index];
   image.hidden=false;failed.hidden=true;image.dataset.source='puzzle';
   image.alt='放大的照片 '+(index+1)+' / '+game.options.length;
   image.onerror=()=>{
    if(image.dataset.source==='puzzle'&&item.scene){image.dataset.source='scene';image.src=item.scene;return}
    image.onerror=null;image.hidden=true;failed.hidden=false;magnify.disabled=true;setMagnified(false);
   };
   image.src=item.puzzle;magnify.disabled=false;
   counter.textContent='📷 '+(index+1)+' / '+game.options.length;
   const answer=[...choices.querySelectorAll('.zoom-choice')].find(b=>b.dataset.id===item.id);
   choose.disabled=!answer||answer.disabled||locked;
   choose.textContent=choose.disabled?'✕ 這張已排除':'✅ 選這張照片';
   prev.disabled=next.disabled=game.options.length<2;
  }
  prev.onclick=()=>showAt(index-1);
  next.onclick=()=>showAt(index+1);
  choose.onclick=()=>{
   if(previewOverlay!==overlay||locked||token!==generation||!game)return;
   const item=game.options[index];
   const answer=[...choices.querySelectorAll('.zoom-choice')].find(b=>b.dataset.id===item.id);
   if(!answer||answer.disabled)return;
   closePreview();submitChoice(answer);
  };
  overlay.querySelector('.zoom-preview-close').onclick=closePreview;
  // Backdrop dismissal is handled from the pointer origin, since pointer capture retargets click events.
  overlay.addEventListener('pointerdown',e=>{
   if(e.pointerType==='touch'&&(e.target===image||image.contains(e.target))){
    photoTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(photoTouches.size===2){
     const [a,b]=[...photoTouches.values()];pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),scale:photoScale};
     swipe=null;pan=null;lastPhotoTap=null;
    }
    try{overlay.setPointerCapture(e.pointerId)}catch(_){}
    if(pinch){e.preventDefault?.();return}
   }
   if(swipe||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0)||e.target.closest?.('button'))return;
   swipe={id:e.pointerId,x:e.clientX,y:e.clientY,onImage:e.target===image||image.contains(e.target),onBackdrop:e.target===overlay};
   pan=zoomed&&(e.target===image||image.contains(e.target))?{x:e.clientX,y:e.clientY,ox:originX,oy:originY}:null;
   try{overlay.setPointerCapture(e.pointerId)}catch(_){}
  });
  overlay.addEventListener('pointermove',e=>{
   if(photoTouches.has(e.pointerId)){
    photoTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&photoTouches.size===2){
     const [a,b]=[...photoTouches.values()];applyPhotoScale(pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance);
     e.preventDefault?.();return;
    }
   }
   if(!swipe||swipe.id!==e.pointerId||!pan||!zoomed)return;
   const r=image.getBoundingClientRect(),w=Math.max(1,r.width/2),h=Math.max(1,r.height/2);
   originX=Math.max(0,Math.min(100,pan.ox-(e.clientX-pan.x)*100/w));
   originY=Math.max(0,Math.min(100,pan.oy-(e.clientY-pan.y)*100/h));
   image.style.transformOrigin=originX+'% '+originY+'%';e.preventDefault?.();
  });
  overlay.addEventListener('pointerup',e=>{
   const wasPinching=!!pinch;
   if(photoTouches.delete(e.pointerId)&&wasPinching){
    pinch=null;swipe=null;pan=null;lastPhotoTap=null;
    try{overlay.releasePointerCapture(e.pointerId)}catch(_){}
    if(photoScale<1.1)setMagnified(false);
    e.preventDefault?.();return;
   }
   if(!swipe||swipe.id!==e.pointerId)return;
   const gesture=swipe,dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;swipe=null;pan=null;
   try{overlay.releasePointerCapture(e.pointerId)}catch(_){}
   const travel=Math.hypot(dx,dy);
   if(gesture.onBackdrop&&travel<14){closePreview();e.preventDefault?.();return}
   if(gesture.onImage&&travel<14&&!image.hidden){
    const now=Date.now();
    if(lastPhotoTap&&now-lastPhotoTap.time<=350&&Math.hypot(e.clientX-lastPhotoTap.x,e.clientY-lastPhotoTap.y)<32){
     setMagnified(!zoomed);lastPhotoTap=null;audio.play('pop');vib(8);e.preventDefault?.();return;
    }
    lastPhotoTap={time:now,x:e.clientX,y:e.clientY};
   }else lastPhotoTap=null;
   if(zoomed){e.preventDefault?.();return}
   if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.25){showAt(index+(dx<0?1:-1));e.preventDefault?.()}
  });
  overlay.addEventListener('pointercancel',e=>{photoTouches.delete(e.pointerId);if(pinch){pinch=null;swipe=null;pan=null;lastPhotoTap=null}if(swipe?.id===e.pointerId){swipe=null;pan=null}});
  overlay.addEventListener('lostpointercapture',e=>{photoTouches.delete(e.pointerId);if(pinch){pinch=null;swipe=null;pan=null;lastPhotoTap=null}if(swipe?.id===e.pointerId){swipe=null;pan=null}});
  overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();closePreview()}
   else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showAt(index+(e.key==='ArrowRight'?1:-1))}
  });
  app.querySelector('.screen').appendChild(overlay);
  showAt(index);
  overlay.querySelector('.zoom-preview-close').focus();
 }
 function cancelChoiceDrag(){
  const d=choiceDrag;choiceDrag=null;
  mystery.classList.remove('zoom-choice-drop');
  if(d){d.button.classList.remove('zoom-choice-dragging');try{d.button.releasePointerCapture(d.id)}catch(_){}}
 }
 function isMysteryDrop(x,y){
  const hit=document.elementFromPoint?.(x,y);
  return !!(hit&&(hit===mystery||mystery.contains(hit)));
 }
 function rotateCorner(){
  if(locked||token!==generation||!game)return;
  let p=corners[(++cornerIndex)%corners.length];if(p[0]===game.originX&&p[1]===game.originY)p=corners[(++cornerIndex)%corners.length];setFocus(p[0],p[1]);
  audio.play('pop');vib(8);guide.textContent='🔄 換了角落！看看新的線索！';
 }
 const clamp=n=>Math.max(0,Math.min(100,n));
 function resetExplore(){
  endPeek();
  if(explorePointer!==null){const id=explorePointer;explorePointer=null;try{mystery.releasePointerCapture(id)}catch(_){}}
  mystery.classList.remove('zoom-exploring');
  if(dropChoice){dropChoice.classList.remove('zoom-drop-target');dropChoice=null}
  dragOrigin=null;
 }
 function setFocus(x,y){
  if(locked||token!==generation||!game||detail.hidden)return;
  game.originX=clamp(x);game.originY=clamp(y);
  detail.style.transformOrigin=game.originX+'% '+game.originY+'%';
  guide.textContent='🔎 看看不同角落，再選下面一樣的照片！';
 }
 function focusAt(e){
  const r=mystery.getBoundingClientRect();
  if(r.width>0&&r.height>0)setFocus((e.clientX-r.left)*100/r.width,(e.clientY-r.top)*100/r.height);
 }
 mystery.addEventListener('pointerdown',e=>{
  if(locked||token!==generation||explorePointer!==null||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  explorePointer=e.pointerId;dragOrigin={x:e.clientX,y:e.clientY};mystery.classList.add('zoom-exploring');
  try{mystery.setPointerCapture(e.pointerId)}catch(_){}
  focusAt(e);
  if(!hintFull){clearPeekTimer();peekTimer=setTimeout(()=>{
   peekTimer=null;
   if(explorePointer!==e.pointerId||locked||token!==generation||!game||detail.hidden)return;
   peekActive=true;peekRestore=detail.style.transform;detail.style.transform='scale(1)';mystery.classList.add('zoom-peeking');
   guide.textContent='👀 偷看全圖！放開手指，繼續猜！';audio.play('pop');vib(8);
  },480)}
  e.preventDefault?.();
 });
 mystery.addEventListener('pointermove',e=>{
  if(explorePointer!==e.pointerId)return;
  const travel=dragOrigin?Math.hypot(e.clientX-dragOrigin.x,e.clientY-dragOrigin.y):0;
  if(travel>=12)clearPeekTimer();
  if(peekActive){e.preventDefault?.();return}
  focusAt(e);
  const moved=travel>=18;
  const hit=moved?document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('.zoom-choice'):null;
  if(dropChoice!==hit){
   if(dropChoice)dropChoice.classList.remove('zoom-drop-target');
   dropChoice=hit||null;
   if(dropChoice)dropChoice.classList.add('zoom-drop-target');
  }
  if(dropChoice)guide.textContent='👇 放開手指，選這張照片！';
 });
 mystery.addEventListener('pointerup',e=>{
  if(explorePointer!==e.pointerId)return;
  const moved=dragOrigin&&Math.hypot(e.clientX-dragOrigin.x,e.clientY-dragOrigin.y)>=18;
  const hit=moved?document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('.zoom-choice'):null;
  const wasPeeking=peekActive;
  focusAt(e);resetExplore();
  if(wasPeeking){e.preventDefault?.();return}
  if(hit&&!hit.disabled&&!locked&&token===generation)hit.click();
  else if(!moved&&!locked&&token===generation)rotateCorner();
 });
 mystery.addEventListener('pointercancel',e=>{if(explorePointer===e.pointerId)resetExplore()});
 mystery.addEventListener('lostpointercapture',e=>{if(explorePointer===e.pointerId)resetExplore()});
 mystery.addEventListener('keydown',e=>{
  if(locked||token!==generation||!game)return;
  const step={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];
  if(e.key==='Enter'||e.key===' '){e.preventDefault?.();rotateCorner();return}
  if(!step)return;e.preventDefault?.();setFocus(game.originX+step[0],game.originY+step[1]);
 });
 function cue(){say('彥彥，點大照片換角落！按住半秒可以偷看整張照片，放開就回到線索！也可以把下面照片拖到上方作答！放大照片時可以按對照線索比較，再按選這張照片作答！')}
 app.querySelector('#zoom-corner').onclick=rotateCorner;
 function newRound(){
  if(token!==generation)return;
  closePreview();resetExplore();cancelChoiceDrag();clearPoint();game=makeRound(level,previous);previous=game.target.id;locked=false;cornerIndex=-1;hintFull=false;mystery.classList.remove('zoom-peeking');app.querySelector('#zoom-corner').disabled=false;
  app.querySelector('#zoom-round').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  app.querySelector('#zoom-status').textContent='💗 仔細看看';
  detail.hidden=false;fallback.hidden=true;
  detail.style.transform='scale('+game.zoom+')';detail.style.transformOrigin=game.originX+'% '+game.originY+'%';
  fallback.textContent=icons[game.target.id]||'📷';
  detail.dataset.source='puzzle';
  detail.onerror=()=>{
   if(detail.dataset.source==='puzzle'&&game.target.scene){detail.dataset.source='scene';detail.src=game.target.scene;return}
   detail.onerror=null;detail.hidden=true;fallback.hidden=false;
  };
  detail.src=game.target.puzzle;
  hint.disabled=false;hint.textContent='👀 看多一點';hint.setAttribute('aria-pressed','false');eliminate.disabled=false;eliminate.textContent='🧩 排除一張';point.disabled=false;point.textContent='👩 指一指';guide.textContent='👆 點大照片換角落，或拖到下方照片作答！';
  choices.innerHTML=game.options.map(p=>'<div class="zoom-choice-wrap"><button type="button" class="zoom-choice" data-id="'+p.id+'" aria-label="選擇'+p.name+'"><img draggable="false" src="'+p.puzzle+'" alt=""><span class="zoom-choice-icon">'+(icons[p.id]||'📷')+'</span></button><button type="button" class="zoom-preview" data-id="'+p.id+'" aria-label="放大這張照片">🔎</button></div>').join('');
  choices.querySelectorAll('img').forEach(img=>{img.onerror=()=>{
   if(img.dataset.source!=='scene'){
    const p=game.options.find(p=>p.id===img.parentElement.dataset.id);
    if(p?.scene){img.dataset.source='scene';img.src=p.scene;return}
   }
   img.onerror=null;img.hidden=true;
  }});
  if(round===0)cue();
 }
 function finish(){
  if(token!==generation)return;
  closePreview();clearPoint();
  state.familyZoomLevel=Math.max(Number(state.familyZoomLevel)||1,Math.min(MAX,level+1));
  state.familyZoomCheckpointLevel=state.familyZoomLevel;state.familyZoomRound=0;
  state.familyZoomWins=(Number(state.familyZoomWins)||0)+1;
  state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  audio.play('win');fx('win');vib([20,30,20]);say('彥彥太厲害了！三張照片全部找對了！');
  const overlay=document.createElement('div');overlay.className='overlay zoom-win';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 照片都找到了！</h2><p>📷 三回合完成！</p><button class="primary" id="zoom-next">▶️ 下一關</button><button class="classic-secondary" id="zoom-again">🔄 再玩一次</button><button class="classic-secondary" id="zoom-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#zoom-next').onclick=()=>start(level>=MAX?1:level+1);
  overlay.querySelector('#zoom-again').onclick=()=>start(level);
  overlay.querySelector('#zoom-menu').onclick=menu;
 }
 choices.addEventListener('click',e=>{
  const button=e.target.closest('.zoom-preview');
  if(!button||locked||token!==generation)return;
  e.stopPropagation();openPreview(game.options.find(p=>p.id===button.dataset.id),button);
 });
 function submitChoice(button){
  if(!button||button.disabled||locked||token!==generation)return;
  audio.unlock();
  if(button.dataset.id!==game.target.id){
   errors++;audio.play('wrong');vib(15);
   button.classList.add('zoom-wrong','zoom-tried-wrong');button.disabled=true;
   button.setAttribute('aria-label','這張照片不對，已排除');
   const preview=button.closest('.zoom-choice-wrap')?.querySelector('.zoom-preview');
   if(preview)preview.disabled=true;
   const left=[...choices.querySelectorAll('.zoom-choice')].filter(b=>!b.disabled).length;
   app.querySelector('#zoom-status').textContent='💗 再試一次';
   guide.textContent=left===1?'✨ 只剩一張照片了，試試看！':'💪 這張不對，已幫你劃掉，看看剩下的！';
   return;
  }
  locked=true;clearPoint();point.disabled=true;resetExplore();app.querySelector('#zoom-corner').disabled=true;button.classList.add('zoom-correct');choices.querySelectorAll('button').forEach(b=>b.disabled=true);
  audio.play('hit');fx('yay');vib([12,25,12]);detail.style.transform='scale(1)';
  round++;state.familyZoomRound=round;state.familyZoomCheckpointLevel=level;persist();
  app.querySelector('#zoom-status').textContent='🌟 答對了！';guide.textContent='🎉 好棒！';
  pending=setTimeout(round>=ROUNDS?finish:newRound,650);
 }
 choices.addEventListener('click',e=>{
  const button=e.target.closest('.zoom-choice');
  if(!button||Date.now()<suppressClicksUntil)return;
  submitChoice(button);
 });
 choices.addEventListener('pointerdown',e=>{
  const button=e.target.closest?.('.zoom-choice');
  if(choiceDrag){
   if(e.pointerId!==choiceDrag.id){suppressClicksUntil=Date.now()+650;cancelChoiceDrag()}
   return;
  }
  if(!button||button.disabled||locked||token!==generation||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  choiceDrag={id:e.pointerId,button,x:e.clientX,y:e.clientY,dragging:false};
  try{button.setPointerCapture(e.pointerId)}catch(_){}
 });
 choices.addEventListener('pointermove',e=>{
  const d=choiceDrag;if(!d||e.pointerId!==d.id)return;
  if(!d.dragging&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>=12){
   d.dragging=true;d.button.classList.add('zoom-choice-dragging');
  }
  if(!d.dragging)return;
  const valid=isMysteryDrop(e.clientX,e.clientY);
  mystery.classList.toggle('zoom-choice-drop',valid);
  guide.textContent=valid?'👇 放開手指，送出這張照片！':'☝️ 把照片拖到上方大圖！';
  e.preventDefault?.();
 });
 choices.addEventListener('pointerup',e=>{
  const d=choiceDrag;if(!d||e.pointerId!==d.id)return;
  if(!d.dragging){cancelChoiceDrag();return}
  const valid=isMysteryDrop(e.clientX,e.clientY);
  suppressClicksUntil=Date.now()+450;cancelChoiceDrag();e.preventDefault?.();
  if(valid)submitChoice(d.button);
  else guide.textContent='💗 再試一次，把照片拖到上方大圖！';
 });
 choices.addEventListener('pointercancel',e=>{if(choiceDrag?.id===e.pointerId){suppressClicksUntil=Date.now()+450;cancelChoiceDrag()}});
 choices.addEventListener('lostpointercapture',e=>{if(choiceDrag?.id===e.pointerId){suppressClicksUntil=Date.now()+450;cancelChoiceDrag()}});
 point.onclick=()=>{
  if(locked||token!==generation||!game||point.disabled)return;
  const answer=[...choices.querySelectorAll('.zoom-choice')].find(b=>b.dataset.id===game.target.id&&!b.disabled);
  if(!answer)return;
  clearPoint();point.disabled=true;point.textContent='👩 已經指出';answer.classList.add('zoom-pointed');
  audio.unlock();audio.play('pop');vib([8,20,8]);guide.textContent='👩 媽媽指這張！自己點一下，或拖上去！';
  const currentId=game.target.id;
  pointTimer=setTimeout(()=>{pointTimer=null;answer.classList.remove('zoom-pointed');if(token===generation&&!locked&&game?.target.id===currentId)guide.textContent='💗 現在換彥彥自己選照片！'},2400);
 };
 eliminate.onclick=()=>{
  if(locked||token!==generation||!game||eliminate.disabled)return;
  const wrong=[...choices.querySelectorAll('.zoom-choice')].filter(b=>b.dataset.id!==game.target.id&&!b.disabled);
  if(!wrong.length)return;
  const button=wrong[Math.floor(Math.random()*wrong.length)];
  button.disabled=true;button.classList.add('zoom-eliminated');button.setAttribute('aria-label','已排除的錯誤照片');
  const preview=button.closest('.zoom-choice-wrap')?.querySelector('.zoom-preview');if(preview)preview.disabled=true;
  eliminate.disabled=true;eliminate.textContent='👍 排除成功';
  audio.play('pop');vib(8);guide.textContent='🧩 這張不一樣！再找找剩下的照片！';
 };
 hint.onclick=()=>{
  if(locked||token!==generation||!game)return;
  audio.unlock();endPeek();hintFull=!hintFull;
  detail.style.transform='scale('+(hintFull?1:game.zoom)+')';
  hint.textContent=hintFull?'🔎 回到線索':'👀 看多一點';hint.setAttribute('aria-pressed',String(hintFull));
  audio.play('pop');vib(8);
  guide.textContent=hintFull?'👀 全圖看清楚了，選下面一樣的照片！':'🔎 再找不同角落的線索！';
 };
 app.querySelector('#zoom-back').onclick=menu;
 app.querySelector('#zoom-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#zoom-retry').onclick=()=>start(level);
 app.querySelector('#zoom-speak').onclick=()=>{audio.unlock();cue()};
 newRound();
}
function enhance(){
 const classic=app.querySelector('.classic-menu');if(!classic||classic.querySelector('#zoom-entry'))return;
 const b=document.createElement('button');b.id='zoom-entry';b.className='classic-tile zoom-tile';
 b.setAttribute('aria-label','開始照片猜猜看');
 b.innerHTML='<span class="classic-big">🔍👩‍👦</span><strong>照片猜猜看</strong><span>🔎 ➜ 📷</span><small>⭐ '+(Number(state.familyZoomLevel)||1)+' / '+MAX+'</small>';
 classic.insertBefore(b,classic.querySelector('.classic-audio-controls'));b.onclick=()=>start();
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanPhotoZoom={start,stop,makeRound,enhance};
})();