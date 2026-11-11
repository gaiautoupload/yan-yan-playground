(()=>{
'use strict';
// v395: hold the existing eliminate button for 550ms to leave exactly two choices without scoring; short tap still eliminates one.
// v359: full-photo preview supports non-scoring detail magnification and one-finger panning; swipe-to-answer disabled while magnified.
// v351: swipe a wrong photo downward to eliminate without penalty; correct photos stay safe; all saved progress retained.
// v337: swipe upward in full-size preview to submit the currently shown photo; horizontal swipes still browse; disabled choices never submit.
// v279: non-scoring listen-again and mom-guided photo in full-size preview.
// v258: tap to eliminate one incorrect photo without penalty; retain original hints and gestures.
// v223: swipe a photo upward to give it to mom; tapping mom repeats the spoken question.
// v222.1: a new intentional tap is never swallowed by the previous drag's click suppression.
// v222: drag a photo to mom to answer in one gesture; canceled drags and second fingers never score.
// v217: incorrect photo is visibly crossed out and disabled for the current round, preventing repeated wrong taps.
// v197: long-press photo preview stays open after finger release; canceled gestures still close.\n// v169: enlarged photo preview now offers an explicit big answer button; zoom remains non-scoring until selected. All existing levels, saves and long-press behavior retained.
const shared=window.YanClassicShared,audio=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!shared||!audio||photos.length<4)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=shared;
const MAX=30,ROUNDS=5;
let generation=0,pending=null,previous=null;
const hints={petshop:'🐶',playground:'🏃',restaurant:'🍽️',bedtime:'📖',school:'🎒',swing:'🛝',picnic:'🐶🐱'};
const labels={petshop:'寵物店看狗狗',playground:'公園跑跑',restaurant:'一起吃飯',bedtime:'睡前看故事書',school:'背書包去上學',swing:'公園盪鞦韆',picnic:'跟狗狗貓咪野餐'};
function shuffle(items,rng=Math.random){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function makeRound(level,prev=null,items=photos,rng=Math.random){
 const count=Math.min(items.length,level<=5?2:level<=15?3:4);
 const targets=items.filter(p=>p.id!==prev);
 const target=targets[Math.floor(rng()*targets.length)]||items[0];
 const options=shuffle([target,...shuffle(items.filter(p=>p.id!==target.id),rng).slice(0,count-1)],rng);
 return {target,options};
}
function stop(){generation++;if(pending){clearTimeout(pending);pending=null}}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();audio.unlock();
 const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.familyPhotoQuizLevel)||1));
 let round=(requested===undefined&&Number(state.familyPhotoQuizCheckpointLevel)===level)?Math.max(0,Math.min(ROUNDS-1,Number(state.familyPhotoQuizRound)||0)):0;
 state.familyPhotoQuizCheckpointLevel=level;state.familyPhotoQuizRound=round;persist();
 const token=generation;
 let wrong=0,busy=false,current=null,hintTimer=null;
 const assistHistory=[]; // v400: only non-scoring hint eliminations may be undone.
 app.innerHTML='<section class="screen game classic-screen photo-quiz-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="photo-quiz-back" aria-label="返回經典遊戲">⌂</button><span class="chip">📷 聽聲找照片</span><span class="chip">⭐ '+level+' / '+MAX+'</span><button class="iconbtn" id="photo-quiz-repeat" aria-label="重聽題目">🔊</button></header>'+
 '<main class="photo-quiz-stage"><div class="photo-quiz-parents"><img src="./assets/mom.webp" alt="媽媽"><strong>👩 照片往上滑給媽媽！</strong><img src="./assets/kid.webp" alt="彥彥"></div>'+
 '<div class="photo-quiz-progress"><span id="photo-quiz-count">🌟 '+(round+1)+' / '+ROUNDS+'</span><span id="photo-quiz-mistakes">💗 加油！</span></div>'+
 '<div class="photo-quiz-prompt" id="photo-quiz-prompt" aria-live="polite"></div>'+
 '<div class="photo-quiz-hint-wrap"><button type="button" id="photo-quiz-hint" class="photo-quiz-hint" aria-label="請媽媽提示正確照片">👩 媽媽提示 ✨</button><button type="button" id="photo-quiz-eliminate" class="photo-quiz-eliminate" aria-label="排除一張錯誤照片，不會算答錯">🧩 排除一張</button><button type="button" id="photo-quiz-undo" class="photo-quiz-undo" hidden disabled aria-label="撤銷上一張提示排除，讓照片重新出現，不計分" title="撤銷上一張提示排除">↩️ 還原</button><button type="button" id="photo-quiz-skip" class="photo-quiz-skip" aria-label="換一道不同的照片題目，保留目前關卡與星星">🎲 換一題</button></div>'+
 '<div class="photo-quiz-grid" id="photo-quiz-grid"></div>'+
 '<div class="photo-quiz-guide">⬆️ 上滑回答　⬇️ 下滑排除錯圖　✋ 按住放大</div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="photo-quiz-home">⌂ 首頁</button><button class="footbtn yellow" id="photo-quiz-retry">🔄 重玩</button></footer></section>';
 const grid=app.querySelector('#photo-quiz-grid'),prompt=app.querySelector('#photo-quiz-prompt');
 function cue(){if(current)say('彥彥，找找看，'+(labels[current.target.id]||current.target.name)+'，在哪張照片？')}
 function clearHint(){
  if(hintTimer!==null){clearTimeout(hintTimer);hintTimer=null}
  grid.querySelectorAll('.photo-quiz-card.is-hinted').forEach(b=>b.classList.remove('is-hinted'));
 }
 function refreshEliminate(){
  const button=app.querySelector('#photo-quiz-eliminate');
  if(!button)return;
  button.disabled=busy||!current||![...grid.querySelectorAll('.photo-quiz-card')].some(card=>!card.disabled&&card.dataset.photo!==current.target.id);
  const undo=app.querySelector('#photo-quiz-undo');
  if(undo){
   while(assistHistory.length&&(!grid.contains(assistHistory[assistHistory.length-1])||!assistHistory[assistHistory.length-1].classList.contains('is-assisted')))assistHistory.pop();
   undo.hidden=assistHistory.length===0;
   undo.disabled=busy||assistHistory.length===0;
  }
 }
 function eliminateOne(preferredCard){
  if(busy||token!==generation||!current)return;
  const selected=preferredCard?.classList?.contains('photo-quiz-card')?preferredCard:null;
  if(selected&&(!grid.contains(selected)||selected.disabled))return;
  if(selected&&selected.dataset.photo===current.target.id){
   app.querySelector('#photo-quiz-mistakes').textContent='💛 這張留下來！往上滑試試看！';
   vib(8);say('這張先留下，往上滑給媽媽看看！');return;
  }
  const wrongCard=selected||[...grid.querySelectorAll('.photo-quiz-card')].find(card=>!card.disabled&&card.dataset.photo!==current.target.id);
  if(!wrongCard){refreshEliminate();return}
  clearHint();audio.unlock();
  wrongCard.disabled=true;wrongCard.setAttribute('aria-disabled','true');
  wrongCard.classList.add('is-eliminated','is-assisted');
  assistHistory.push(wrongCard);
  const zoom=wrongCard.closest('.photo-quiz-item')?.querySelector('.photo-quiz-zoom');
  if(zoom)zoom.disabled=true;
  app.querySelector('#photo-quiz-mistakes').textContent='🧩 媽媽幫忙排除一張！';
  audio.play('hit');vib(8);say('這張不是喔，看看剩下的照片！');
  refreshEliminate();
 }
 function eliminateToTwo(){
  if(busy||token!==generation||!current)return;
  const available=[...grid.querySelectorAll('.photo-quiz-card')].filter(card=>!card.disabled);
  if(available.length<=2){say('已經剩下兩張照片囉！');vib(8);return}
  const incorrect=available.filter(card=>card.dataset.photo!==current.target.id);
  if(incorrect.length<2)return;
  const keep=incorrect[Math.floor(Math.random()*incorrect.length)];
  clearHint();audio.unlock();
  for(const card of incorrect){
   if(card===keep)continue;
   card.disabled=true;card.setAttribute('aria-disabled','true');
   card.classList.add('is-eliminated','is-assisted');
   assistHistory.push(card);
   const zoom=card.closest('.photo-quiz-item')?.querySelector('.photo-quiz-zoom');
   if(zoom)zoom.disabled=true;
  }
  app.querySelector('#photo-quiz-mistakes').textContent='👶 剩兩張照片，自己選看看！';
  audio.play('hit');vib(12);say('剩下兩張照片囉！仔細看看，哪張才對？');
  refreshEliminate();
 }

 function hint(){
  if(busy||token!==generation||!current)return;
  clearHint();audio.unlock();
  const correct=grid.querySelector('.photo-quiz-card[data-photo="'+current.target.id+'"]');
  if(!correct)return;
  correct.classList.add('is-hinted');
  say('看看發光的照片，再選選看！');vib(12);
  hintTimer=setTimeout(()=>{hintTimer=null;correct.classList.remove('is-hinted')},1800);
 }
 // v278: browse the real photo choices inside the full-size preview without closing it.
 function showPreview(choice,onChoose){
  if(busy||token!==generation||app.querySelector('#photo-quiz-preview'))return;
  audio.unlock();
  const options=current?.options||[];
  let index=options.findIndex(p=>p.id===choice.id);
  if(index<0)return;
  const overlay=document.createElement('div');
  overlay.id='photo-quiz-preview';overlay.className='overlay photo-quiz-preview';
  overlay.innerHTML='<div class="popup photo-quiz-preview-panel" role="dialog" aria-modal="true" aria-label="放大親子照片"><button type="button" class="photo-quiz-preview-close" aria-label="關閉放大照片">✕ 返回選照片</button><div class="photo-quiz-preview-nav"><button type="button" class="photo-quiz-preview-prev" aria-label="看上一張照片">◀ 上一張</button><span class="photo-quiz-preview-count" aria-live="polite"></span><button type="button" class="photo-quiz-preview-next" aria-label="看下一張照片">下一張 ▶</button></div><div class="photo-quiz-preview-helpers"><button type="button" class="photo-quiz-preview-listen" aria-label="不離開照片重聽題目">🔊 再聽題目</button><button type="button" class="photo-quiz-preview-guide" aria-label="媽媽指給我看正確照片，但不會幫忙作答">👩 看提示照片</button><button type="button" class="photo-quiz-preview-magnify" aria-pressed="false" aria-label="放大照片細節，不會作答">🔍 放大細節</button></div><div class="photo-quiz-preview-viewport"><img alt="放大的親子照片" draggable="false"></div><div class="photo-quiz-preview-fallback" hidden>📷 照片暫時無法顯示</div><p>👈 左右換照片　⬆ 向上滑就回答！</p><button type="button" class="primary photo-quiz-preview-choose" aria-label="選這張照片作答">👆 選這張照片 ✓</button></div>';
  const img=overlay.querySelector('img'),fallback=overlay.querySelector('.photo-quiz-preview-fallback');
  const count=overlay.querySelector('.photo-quiz-preview-count'),choose=overlay.querySelector('.photo-quiz-preview-choose');
  const magnify=overlay.querySelector('.photo-quiz-preview-magnify');
  let magnified=false,panX=50,panY=50;
  function setMagnified(value){
   magnified=!!value;panX=50;panY=50;
   overlay.classList.toggle('is-magnified',magnified);
   magnify.setAttribute('aria-pressed',String(magnified));
   magnify.textContent=magnified?'🔎 還原全圖':'🔍 放大細節';
   img.style.setProperty('--photo-pan-x','50%');img.style.setProperty('--photo-pan-y','50%');
  }
  magnify.onclick=()=>{setMagnified(!magnified);vib(8)};
  const previousFocus=document.activeElement;
  const close=()=>{overlay.remove();previousFocus?.focus?.()};
  function showAt(nextIndex){
   index=(nextIndex+options.length)%options.length;
   setMagnified(false);
   const selected=options[index];
   const card=grid.querySelector('.photo-quiz-card[data-photo="'+selected.id+'"]');
   img.hidden=false;fallback.hidden=true;
   img.onerror=()=>{img.onerror=null;setMagnified(false);img.hidden=true;fallback.hidden=false};
   img.alt='放大的第'+(index+1)+'張親子照片';
   img.src=selected.scene;
   count.textContent=(index+1)+' / '+options.length;
   choose.disabled=!!card?.disabled;
   choose.textContent=card?.disabled?'✕ 這張已排除':'👆 選這張照片 ✓';
  }
  function step(n){showAt(index+n);vib(8)}
  overlay.querySelector('.photo-quiz-preview-prev').onclick=()=>step(-1);
  overlay.querySelector('.photo-quiz-preview-next').onclick=()=>step(1);
  // v279: replay the spoken question or see a non-scoring hint while zoomed.
  overlay.querySelector('.photo-quiz-preview-listen').onclick=()=>{audio.unlock();cue()};
  overlay.querySelector('.photo-quiz-preview-guide').onclick=()=>{
   if(busy||token!==generation||!current)return;
   const targetIndex=options.findIndex(p=>p.id===current.target.id);
   if(targetIndex<0)return;
   showAt(targetIndex);vib(10);
   say('媽媽找到照片了！看看這張，再自己按選這張照片。');
  };
  overlay.querySelector('.photo-quiz-preview-close').onclick=close;
  choose.onclick=()=>{
   const selected=options[index];
   const card=grid.querySelector('.photo-quiz-card[data-photo="'+selected.id+'"]');
   if(!card||card.disabled)return;
   close();
   if(selected.id===choice.id&&typeof onChoose==='function')onChoose();
   else card.click();
  };
  overlay.onclick=e=>{if(e.target===overlay)close()};
  overlay.onkeydown=e=>{
   if(e.key==='Escape'){e.preventDefault();close()}
   else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}
   else if(e.key==='ArrowRight'){e.preventDefault();step(1)}
  };
  let swipe=null;
  img.addEventListener('pointerdown',e=>{
   if(swipe||e.isPrimary===false||e.button>0)return;
   swipe={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};
   try{img.setPointerCapture?.(e.pointerId)}catch(_){}
  });
  img.addEventListener('pointermove',e=>{
   if(!magnified||!swipe||swipe.id!==e.pointerId)return;
   const width=Math.max(1,img.clientWidth),height=Math.max(1,img.clientHeight);
   panX=Math.max(0,Math.min(100,panX-(e.clientX-swipe.lastX)*90/width));
   panY=Math.max(0,Math.min(100,panY-(e.clientY-swipe.lastY)*90/height));
   swipe.lastX=e.clientX;swipe.lastY=e.clientY;
   img.style.setProperty('--photo-pan-x',panX+'%');img.style.setProperty('--photo-pan-y',panY+'%');
   e.preventDefault();
  });
  img.addEventListener('pointerup',e=>{
   if(!swipe||swipe.id!==e.pointerId)return;
   const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;
   swipe=null;
   try{if(img.hasPointerCapture?.(e.pointerId))img.releasePointerCapture(e.pointerId)}catch(_){}
   if(magnified){e.preventDefault();return;}
   if(Math.abs(dx)>=42&&Math.abs(dx)>Math.abs(dy)*1.25){e.preventDefault();step(dx<0?1:-1)}
   else if(dy<=-64&&-dy>Math.abs(dx)*1.2&&!choose.disabled&&!busy&&token===generation){e.preventDefault();choose.click()}
  });
  for(const type of ['pointercancel','lostpointercapture']){
   img.addEventListener(type,e=>{if(swipe&&swipe.id===e.pointerId)swipe=null});
  }
  app.querySelector('.screen').appendChild(overlay);
  showAt(index);
  overlay.querySelector('.photo-quiz-preview-close').focus();
  return close;
 }
 // v222: drag a photo onto the mom-and-child banner to submit an answer.
 // Keep 420ms hold-to-zoom and ordinary tap-to-answer unchanged.
 let hold=null,suppressHoldClickUntil=0,suppressHoldCard=null;
 const dropTarget=app.querySelector('.photo-quiz-parents');
 function insideDrop(x,y){
  const r=dropTarget.getBoundingClientRect();
  return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
 }
 // v223: preschoolers can swipe upward without landing on a small banner.
 // A sideways or short gesture never submits; the original exact banner drop still works.
 function isUpSwipe(h,x,y){const rise=h.y-y,side=Math.abs(x-h.x);return rise>=64&&rise>side*1.2}
 function isDownSwipe(h,x,y){const fall=y-h.y,side=Math.abs(x-h.x);return fall>=64&&fall>side*1.2}
 function acceptsDrop(h,x,y){return insideDrop(x,y)||isUpSwipe(h,x,y)}
 dropTarget.setAttribute('role','button');dropTarget.setAttribute('tabindex','0');
 dropTarget.setAttribute('aria-label','點媽媽再聽一次題目，也可以把照片往上滑給媽媽');
 dropTarget.addEventListener('click',()=>{if(!busy&&token===generation){audio.unlock();cue()}});
 dropTarget.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();dropTarget.click()}});
 function clearDragVisual(h){
  h.card.classList.remove('is-dragging');
  grid.classList.remove('is-reject-ready');
  dropTarget.classList.remove('is-drop-ready');
  if(h.ghost){h.ghost.remove();h.ghost=null}
 }
 function endHold(e,canceled=false){
  const h=hold;if(!h||h.id!==e.pointerId)return;
  hold=null;clearTimeout(h.timer);
  const dragged=h.dragging;
  const submit=dragged&&!canceled&&acceptsDrop(h,e.clientX,e.clientY)&&!busy&&token===generation;
  const reject=dragged&&!canceled&&!submit&&isDownSwipe(h,e.clientX,e.clientY)&&!busy&&token===generation;
  if(dragged){
   clearDragVisual(h);suppressHoldClickUntil=Date.now()+650;suppressHoldCard=h.card;e.preventDefault?.();
  }
  if(h.close){if(canceled)h.close();suppressHoldClickUntil=Date.now()+650;suppressHoldCard=h.card;e.preventDefault?.()}
  try{if(h.card.hasPointerCapture?.(h.id))h.card.releasePointerCapture(h.id)}catch(_){}
  if(submit)h.card.click();
  else if(reject)eliminateOne(h.card);
 }
 grid.addEventListener('pointerdown',e=>{
  const card=e.target.closest?.('.photo-quiz-card');
  if(!card||card.disabled||busy||hold||e.isPrimary===false||e.button>0)return;
  suppressHoldClickUntil=0;suppressHoldCard=null;
  const option=current?.options.find(p=>p.id===card.dataset.photo);
  if(!option)return;
  const h={id:e.pointerId,card,x:e.clientX,y:e.clientY,timer:null,close:null,dragging:false,ghost:null};
  hold=h;
  h.timer=setTimeout(()=>{
   if(hold!==h||h.dragging||busy||token!==generation)return;
   h.close=showPreview(option,()=>grid.querySelector('.photo-quiz-card[data-photo="'+option.id+'"]')?.click())||null;
   if(h.close){vib(8);suppressHoldClickUntil=Date.now()+650;suppressHoldCard=h.card}
  },420);
  try{card.setPointerCapture?.(e.pointerId)}catch(_){}
 });
 grid.addEventListener('pointermove',e=>{
  const h=hold;if(!h||h.id!==e.pointerId||h.close)return;
  if(!h.dragging&&Math.hypot(e.clientX-h.x,e.clientY-h.y)>14){
   clearTimeout(h.timer);h.timer=null;h.dragging=true;
   const ghost=document.createElement('div');ghost.className='photo-quiz-drag-ghost';ghost.setAttribute('aria-hidden','true');
   const img=h.card.querySelector('img');
   if(img&&!img.hidden)ghost.appendChild(img.cloneNode(true));else ghost.textContent='📷';
   app.querySelector('.photo-quiz-screen').appendChild(ghost);h.ghost=ghost;
   h.card.classList.add('is-dragging');
  }
  if(h.dragging){
   h.ghost.style.left=e.clientX+'px';h.ghost.style.top=e.clientY+'px';
   dropTarget.classList.toggle('is-drop-ready',acceptsDrop(h,e.clientX,e.clientY));
   grid.classList.toggle('is-reject-ready',isDownSwipe(h,e.clientX,e.clientY));
   e.preventDefault?.();
  }
 });
 for(const kind of ['pointerup','pointercancel','lostpointercapture']){
  grid.addEventListener(kind,e=>endHold(e,kind!=='pointerup'));
 }
 grid.addEventListener('click',e=>{
  if(e.isTrusted&&Date.now()<suppressHoldClickUntil&&e.target.closest?.('.photo-quiz-card')===suppressHoldCard){
   e.preventDefault();e.stopImmediatePropagation();
  }
 },true);
 function next(){
  if(token!==generation)return;
  assistHistory.length=0; // never restore a card from the previous question
  clearHint();busy=false;current=makeRound(level,previous);previous=current.target.id;
  app.querySelector('#photo-quiz-count').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  prompt.textContent=(hints[current.target.id]||'📷')+'　找找看：'+(labels[current.target.id]||current.target.name);
  grid.style.setProperty('--photo-cols','2');
  grid.innerHTML=current.options.map((p,i)=>'<div class="photo-quiz-item"><button type="button" class="photo-quiz-card" data-photo="'+p.id+'" style="--photo-src:url(\''+p.scene+'\')" aria-label="選擇第'+(i+1)+'張照片"><img src="'+p.scene+'" alt="照片選項'+(i+1)+'" draggable="false"><span class="photo-quiz-fallback">'+(hints[p.id]||'📷')+'<small>'+(labels[p.id]||p.name)+'</small></span></button><button type="button" class="photo-quiz-zoom" aria-label="放大第'+(i+1)+'張照片" data-zoom="'+i+'">🔎</button></div>').join('');
  const buttons=[...grid.querySelectorAll('.photo-quiz-card')];
  refreshEliminate();
  if(buttons.length===3)grid.querySelectorAll('.photo-quiz-item')[2].classList.add('last-three');
  grid.querySelectorAll('.photo-quiz-zoom').forEach((zoom,i)=>{
   zoom.onclick=e=>{e.stopPropagation();showPreview(current.options[i],()=>buttons[i]?.click())};
  });
  buttons.forEach((b,i)=>{
   const im=b.querySelector('img');im.onerror=()=>{im.onerror=null;im.hidden=true;b.classList.add('is-fallback')};
   b.onclick=()=>{
    if(busy||token!==generation)return;
    audio.unlock();
    if(current.options[i].id!==current.target.id){
     wrong++;audio.play('wrong');vib(20);b.classList.remove('is-wrong');void b.offsetWidth;b.classList.add('is-wrong','is-eliminated');b.disabled=true;b.setAttribute('aria-disabled','true');
     app.querySelector('#photo-quiz-mistakes').textContent='❌ 這張先排除，找其他照片！';say('再看一次，'+(labels[current.target.id]||current.target.name));refreshEliminate();return;
    }
    clearHint();busy=true;refreshEliminate();b.classList.add('is-correct');audio.play('hit');fx('yay');vib([12,35,12]);
    round++;state.familyPhotoQuizRound=round;state.familyPhotoQuizCheckpointLevel=level;persist();
    if(round>=ROUNDS){pending=setTimeout(win,650)}else{pending=setTimeout(next,650)}
   };
  });
  cue();
 }
 function win(){
  if(token!==generation)return;
  clearHint();
  state.familyPhotoQuizLevel=Math.max(Number(state.familyPhotoQuizLevel)||1,Math.min(MAX,level+1));
  state.familyPhotoQuizRound=0;state.familyPhotoQuizCheckpointLevel=state.familyPhotoQuizLevel;
  state.familyPhotoQuizWins=(Number(state.familyPhotoQuizWins)||0)+1;
  state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  audio.play('win');fx('win');say('太棒了！彥彥找到全部照片了！');
  const overlay=document.createElement('div');overlay.className='overlay photo-quiz-win';
  overlay.innerHTML='<div class="popup"><div class="faces"><img src="./assets/mom.webp" alt="媽媽"><img src="./assets/kid.webp" alt="彥彥"></div><div class="stars">⭐⭐⭐</div><h2>🎉 找到全部照片！</h2><p>📷 '+ROUNDS+' 張　💗 '+wrong+' 次再試試</p><button class="primary" id="photo-quiz-next">▶️ 下一關</button><button class="classic-secondary" id="photo-quiz-again">🔄 再玩一次</button><button class="classic-secondary" id="photo-quiz-other">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#photo-quiz-next').onclick=()=>start(Math.min(MAX,level+1));
  overlay.querySelector('#photo-quiz-again').onclick=()=>start(level);
  overlay.querySelector('#photo-quiz-other').onclick=menu;
 }
 app.querySelector('#photo-quiz-back').onclick=menu;
 app.querySelector('#photo-quiz-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#photo-quiz-retry').onclick=()=>start(level);
 app.querySelector('#photo-quiz-repeat').onclick=()=>{audio.unlock();cue()};
 app.querySelector('#photo-quiz-hint').onclick=hint;
 app.querySelector('#photo-quiz-eliminate').onclick=eliminateOne;

 const eliminateButton=app.querySelector('#photo-quiz-eliminate');
 eliminateButton.setAttribute('aria-label','點一下排除一張錯誤照片；按住半秒保留兩張選項，不計分');
 eliminateButton.title='長按半秒只留下兩張照片';
 let eliminateHold=null,suppressEliminateClickUntil=0;
 eliminateButton.addEventListener('pointerdown',e=>{
  if(eliminateButton.disabled||eliminateHold||e.isPrimary===false||e.button>0)return;
  suppressEliminateClickUntil=0;
  const h={id:e.pointerId,x:e.clientX,y:e.clientY,fired:false,timer:null};
  eliminateHold=h;
  h.timer=setTimeout(()=>{
   if(eliminateHold!==h||eliminateButton.disabled||busy||token!==generation)return;
   h.fired=true;suppressEliminateClickUntil=Date.now()+700;eliminateToTwo();
  },550);
 });
 eliminateButton.addEventListener('pointermove',e=>{
  const h=eliminateHold;
  if(h&&h.id===e.pointerId&&Math.hypot(e.clientX-h.x,e.clientY-h.y)>14){
   clearTimeout(h.timer);eliminateHold=null;suppressEliminateClickUntil=Date.now()+650;
  }
 });
 for(const kind of ['pointerup','pointercancel','lostpointercapture']){
  eliminateButton.addEventListener(kind,e=>{
   if(!eliminateHold||eliminateHold.id!==e.pointerId)return;
   clearTimeout(eliminateHold.timer);
   if(eliminateHold.fired)suppressEliminateClickUntil=Date.now()+700;
   eliminateHold=null;
  });
 }
 eliminateButton.addEventListener('click',e=>{
  if(Date.now()<suppressEliminateClickUntil){
   e.preventDefault();e.stopImmediatePropagation();suppressEliminateClickUntil=0;
  }
 },true);

 // v400: restore only a non-scoring assisted elimination, never a genuinely wrong answer.
 app.querySelector('#photo-quiz-undo').onclick=()=>{
  if(busy||token!==generation||!assistHistory.length)return;
  const card=assistHistory.pop();
  if(!grid.contains(card)||!card.classList.contains('is-assisted')){refreshEliminate();return}
  card.disabled=false;card.removeAttribute('aria-disabled');
  card.classList.remove('is-eliminated','is-assisted');
  const zoom=card.closest('.photo-quiz-item')?.querySelector('.photo-quiz-zoom');
  if(zoom)zoom.disabled=false;
  app.querySelector('#photo-quiz-mistakes').textContent='↩️ 照片回來了，再仔細看看！';
  audio.play('pop');vib(8);refreshEliminate();
 };

 // v392: a stuck child can swap to a different question without losing round, stars or saved progress.
 app.querySelector('#photo-quiz-skip').onclick=()=>{
  if(busy||token!==generation||!current)return;
  clearHint();audio.unlock();
  next(); // makeRound excludes the previous target; round and unified save are untouched.
  app.querySelector('#photo-quiz-mistakes').textContent='🎲 新照片來了！這題試試看！';
  audio.play('pop');vib(8);
 };
 next();
}
function enhance(){
 const classic=app.querySelector('.classic-menu');
 if(classic&&!classic.querySelector('#photo-quiz-entry')){
  const b=document.createElement('button');b.id='photo-quiz-entry';b.className='classic-tile photo-quiz-tile';b.setAttribute('aria-label','開始聽聲音找照片');
  b.innerHTML='<span class="classic-big">👂📷</span><strong>聽聲找照片</strong><span>🔊 👆 💗</span><small>⭐ '+(Number(state.familyPhotoQuizLevel)||1)+' / '+MAX+'</small>';
  classic.insertBefore(b,classic.querySelector('.classic-audio-controls'));b.onclick=()=>start();
 }

}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanPhotoQuiz={start,makeRound,stop,enhance};
})();