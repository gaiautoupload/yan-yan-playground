/* v367: solved photo cards open an enlarged photo and speak its name without affecting progress. */
/* v346: early finish button for all-cards overview; preserve 3-second timeout, saved usage, matches and progress. */
(()=>{
'use strict';
// v225: wrong-pair instant retry, cancel auto-hide timer safely; v191 pointerdown undo retained.
const shared=window.YanClassicShared,audio=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!shared||!audio||photos.length<2)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=shared;
let generation=0,pending=null,pointTimer=null,pointedCard=null;
function clearPoint(){if(pointTimer){clearTimeout(pointTimer);pointTimer=null}if(pointedCard){pointedCard.classList.remove('memory-pointed');pointedCard=null}}
const maxLevel=60;
function restoredSession(level){
 const s=state.memorySession;
 if(!s||s.level!==level||!Array.isArray(s.cards)||!Array.isArray(s.found))return null;
 const count=Math.min(7,2+Math.floor((level-1)/4),photos.length);
 if(s.cards.length!==count*2||!Number.isInteger(s.moves)||s.moves<0||s.moves>100000||!Number.isInteger(s.hintsLeft)||s.hintsLeft<0||s.hintsLeft>2)return null;
 const byId=new Map(photos.map(p=>[String(p.id),p])),groups=new Map(),deck=[];
 for(const entry of s.cards){
  if(!entry||typeof entry.key!=='string'||typeof entry.photoId!=='string')return null;
  const photo=byId.get(entry.photoId);
  if(!photo||!entry.key.startsWith(entry.photoId+'-'))return null;
  const ix=Number(entry.key.slice(entry.photoId.length+1));
  if(!Number.isInteger(ix)||ix<0||ix>=count||entry.key!==entry.photoId+'-'+ix)return null;
  groups.set(entry.key,(groups.get(entry.key)||0)+1);
  deck.push({key:entry.key,photo});
 }
 if(groups.size!==count||[...groups.values()].some(n=>n!==2))return null;
 const seen=new Set(s.found);
 if(seen.size!==s.found.length||seen.size%2||s.moves<seen.size/2)return null;
 for(const i of seen){
  if(!Number.isInteger(i)||i<0||i>=deck.length)return null;
  if(!deck.some((d,j)=>j!==i&&d.key===deck[i].key&&seen.has(j)))return null;
 }
 return {deck,found:seen,moves:s.moves,hintsLeft:s.hintsLeft,overviewUsed:s.overviewUsed===true};
}
function stop(){generation++;clearPoint();if(pending){clearTimeout(pending);pending=null}}
function makeDeck(level,items=photos,rng=Math.random){
 const pairs=Math.min(7,2+Math.floor((Math.max(1,level)-1)/4));
 const pool=items.slice();
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 const picked=pool.slice(0,Math.min(pairs,pool.length));
 const deck=picked.flatMap((p,i)=>[{key:p.id+'-'+i,photo:p},{key:p.id+'-'+i,photo:p}]);
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 return deck;
}
function menu(){stop();window.YanClassics.menu()}
function start(requestedLevel){
 stop();audio.unlock();
 const level=Math.min(maxLevel,Math.max(1,Number(requestedLevel)||Number(state.familyMemoryLevel)||1));
 const resume=restoredSession(level),deck=resume?resume.deck:makeDeck(level),pairCount=deck.length/2,token=generation;
 let first=-1,busy=false,moves=resume?resume.moves:0,found=resume?resume.found:new Set(),hintsLeft=resume?resume.hintsLeft:2,overviewUsed=resume?resume.overviewUsed:false,overviewActive=false;
 let pendingMismatch=null;
 const slowLook=()=>state.memorySlowLook===true;
 const columns=deck.length<=4?2:deck.length<=6?3:4;
 app.innerHTML='<section class="screen game classic-screen memory-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="memory-back" aria-label="返回經典遊戲">⌂</button><span class="chip">👩‍👦 親子翻翻樂</span><span class="chip">⭐ '+level+' / '+maxLevel+'</span><button class="iconbtn" id="memory-speak" aria-label="聽玩法">🔊</button></header>'+
 '<main class="memory-stage"><div class="memory-family"><img src="./assets/mom.webp" alt="媽媽"><span>🐾 找出一樣的兩張照片！</span><img src="./assets/kid.webp" alt="彥彥"></div>'+
 '<div class="memory-score"><span id="memory-progress">💞 '+(found.size/2)+' / '+pairCount+'</span><span id="memory-moves">👆 '+moves+' 次</span></div>'+
 '<div class="memory-peek-tools"><button type="button" id="memory-peek" class="memory-peek-btn">👩 偷看一對 ×'+hintsLeft+'</button><button type="button" id="memory-overview" class="memory-overview-btn">🖼️ 全部看 3 秒</button><button type="button" id="memory-overview-done" class="memory-overview-done" hidden>👍 我記住了</button><button type="button" id="memory-look" class="memory-look-btn" aria-pressed="'+slowLook()+'">'+(slowLook()?'👀 慢慢看：開':'👀 慢慢看：關')+'</button><button type="button" id="memory-continue" class="memory-continue-btn" hidden>👍 我看好了</button></div><div class="memory-grid" id="memory-grid" style="--memory-cols:'+columns+'">'+deck.map((item,i)=>'<button type="button" class="memory-card" data-index="'+i+'" aria-label="翻開第'+(i+1)+'張卡片" aria-pressed="false"><span class="memory-card-inner"><span class="memory-card-back">🐾<small>⭐</small></span><span class="memory-card-front"><img src="'+item.photo.puzzle+'" alt="'+item.photo.name+'" draggable="false"><span>'+item.photo.name+'</span></span></span></button>').join('')+
 '</div><div class="memory-guide" id="memory-guide" aria-live="polite">👆 點兩張或按住滑到另一張　💖 配成一對</div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="memory-home">⌂ 首頁</button><button class="footbtn yellow" id="memory-retry">🔄 重玩</button></footer></section>';
 const grid=app.querySelector('#memory-grid');
 const cards=[...grid.querySelectorAll('.memory-card')];
 const lookBtn=app.querySelector('#memory-look'),continueBtn=app.querySelector('#memory-continue'),guide=app.querySelector('#memory-guide'),overviewBtn=app.querySelector('#memory-overview'),overviewDoneBtn=app.querySelector('#memory-overview-done');
 function checkpoint(){
  state.memorySession={level,cards:deck.map(d=>({key:d.key,photoId:String(d.photo.id)})),found:[...found],moves,hintsLeft,overviewUsed};
  persist();
 }
 function clearCheckpoint(){delete state.memorySession;persist()}
 function updateLook(){const undo=first>=0&&!pendingMismatch;lookBtn.setAttribute('aria-pressed',String(!undo&&slowLook()));lookBtn.textContent=undo?'↩️ 收回這張':slowLook()?'👀 慢慢看：開':'👀 慢慢看：關';lookBtn.disabled=busy;lookBtn.hidden=!!pendingMismatch;continueBtn.hidden=!pendingMismatch;continueBtn.textContent=slowLook()?'👍 我看好了':'↩️ 立即再試'}
 function updatePeek(){const btn=app.querySelector('#memory-peek');btn.textContent=(first>=0?'👩 指出另一張 ×':'👩 偷看一對 ×')+hintsLeft;btn.disabled=busy||hintsLeft===0||found.size===deck.length;overviewBtn.disabled=busy||overviewUsed||found.size===deck.length;overviewBtn.textContent=overviewUsed?'🖼️ 已看過全圖':'🖼️ 全部看 3 秒';updateLook()}
 found.forEach(i=>{cards[i].classList.add('is-flipped','is-matched');cards[i].setAttribute('aria-pressed','true');cards[i].setAttribute('aria-label','放大並聽'+deck[i].photo.name)});
 function flip(i,yes){cards[i].classList.toggle('is-flipped',yes);cards[i].setAttribute('aria-pressed',String(yes))}
 function showMatchedPhoto(i){
  if(token!==generation||busy||!found.has(i)||overviewActive)return;
  const photo=deck[i].photo;
  const overlay=document.createElement('div');
  overlay.className='overlay memory-photo-inspect';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','看看已配對的照片');
  overlay.tabIndex=-1;
  overlay.innerHTML='<div class="memory-photo-panel"><button type="button" class="memory-photo-close" aria-label="關閉照片">✕</button><img alt=""><strong></strong><p>🔊 點照片再聽一次</p></div>';
  const img=overlay.querySelector('img');
  img.src=photo.puzzle;img.alt=photo.name;
  img.onerror=()=>{img.onerror=null;img.src='./assets/family-play-puzzle.webp'};
  overlay.querySelector('strong').textContent=photo.name;
  const speak=()=>{audio.unlock();audio.play('pop');say('這是'+photo.name.replace(/^[^一-龥]+/,'')+'。')};
  const close=()=>{if(overlay.parentElement)overlay.remove()};
  overlay.querySelector('.memory-photo-close').onclick=close;
  img.onclick=speak;
  overlay.onclick=e=>{if(e.target===overlay)close()};
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
  app.querySelector('.screen').appendChild(overlay);
  overlay.focus();speak();
 }
 function choose(i){
  if(token!==generation||busy)return;
  if(found.has(i)){showMatchedPhoto(i);return;}
  clearPoint();
  if(i===first){flip(i,false);first=-1;updatePeek();guide.textContent='👆 換一張試試看！';audio.play('pop');return}
  audio.unlock();flip(i,true);audio.play('pop');vib(8);
  if(first<0){first=i;updatePeek();guide.textContent='↩️ 點同一張或按「收回這張」可以換照片';return}
  moves++;app.querySelector('#memory-moves').textContent='👆 '+moves+' 次';checkpoint();
  const prev=first;first=-1;updatePeek();
  if(deck[prev].key===deck[i].key){
   found.add(prev);found.add(i);
   cards[prev].classList.add('is-matched');cards[i].classList.add('is-matched');
   cards[prev].setAttribute('aria-label','放大並聽'+deck[prev].photo.name);cards[i].setAttribute('aria-label','放大並聽'+deck[i].photo.name);
   const solved=found.size/2;if(solved<pairCount)checkpoint();
   app.querySelector('#memory-progress').textContent='💞 '+solved+' / '+pairCount;
   audio.play('hit');fx('yay');vib([12,30,12]);
   guide.textContent='💞 配對成功！點綠框照片可以放大、聽名字 🔊';
   if(solved===pairCount){busy=true;pending=setTimeout(()=>{if(token!==generation)return;
    state.familyMemoryLevel=Math.max(Number(state.familyMemoryLevel)||1,Math.min(maxLevel,level+1));
    state.familyMemoryWins=(Number(state.familyMemoryWins)||0)+1;
    state.stars=(Number(state.stars)||0)+3;
    state.complete=(Number(state.complete)||0)+1;
    delete state.memorySession;persist();audio.play('win');say('彥彥太棒了！照片全部配對成功！');
    const overlay=document.createElement('div');overlay.className='overlay memory-win';
    overlay.innerHTML='<div class="popup"><div class="faces"><img src="./assets/mom.webp" alt="媽媽"><img src="./assets/kid.webp" alt="彥彥"></div><div class="stars">⭐⭐⭐</div><h2>🎉 全部配對成功！</h2><p>💞 '+pairCount+' 對　👆 '+moves+' 次</p><button class="primary" id="memory-next">▶️ 下一關</button><button class="classic-secondary" id="memory-again">🔄 再玩一次</button><button class="classic-secondary" id="memory-return">🎲 其他遊戲</button></div>';
    app.querySelector('.screen').appendChild(overlay);
    overlay.querySelector('#memory-next').onclick=()=>start(level>=maxLevel?1:level+1);
    overlay.querySelector('#memory-again').onclick=()=>{clearCheckpoint();start(level)};
    overlay.querySelector('#memory-return').onclick=menu;
   },450)}
  }else{
   busy=true;audio.play('wrong');
   pendingMismatch=[prev,i];
   if(slowLook()){
    guide.textContent='👀 看清楚兩張照片，記住位置，再按 👍';
    updatePeek();
    say('彥彥，先記住這兩張照片的位置，再按大拇指繼續。');
   }else{
    guide.textContent='🙈 不一樣！按 ↩️ 立即再試，或等一下自動蓋回';
    updatePeek();
    pending=setTimeout(()=>{if(token!==generation)return;pendingMismatch=null;flip(prev,false);flip(i,false);busy=false;pending=null;guide.textContent='👆 再找一對一樣的照片！';updatePeek()},820);
   }
  }
 }

 // v122: connect two hidden cards in one finger gesture; tap/keyboard pairing stays available.
 const dragLine=document.createElement('div');dragLine.className='memory-drag-line';dragLine.hidden=true;grid.appendChild(dragLine);
 let gesture=null,suppressPointerClickUntil=0;
 function hitCard(x,y){
  for(let i=0;i<cards.length;i++){
   const r=cards[i].getBoundingClientRect();
   if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return i;
  }
  return -1;
 }
 function drawDragLine(x,y,index){
  const g=grid.getBoundingClientRect(),r=cards[index].getBoundingClientRect();
  const sx=r.left+r.width/2-g.left,sy=r.top+r.height/2-g.top,dx=x-g.left-sx,dy=y-g.top-sy;
  dragLine.style.left=sx+'px';dragLine.style.top=sy+'px';
  dragLine.style.width=Math.hypot(dx,dy)+'px';
  dragLine.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
  dragLine.hidden=false;
 }
 function finishGesture(e,cancelled=false){
  if(!gesture||gesture.id!==e.pointerId)return;
  const g=gesture;
  if(!cancelled&&token===generation&&!busy){
   const target=hitCard(e.clientX,e.clientY);
   if(!g.moved){if(target===g.index)choose(g.index)}
   else if(!g.existingFirst&&target>=0&&target!==g.index&&!found.has(target))choose(target);
  }
  if(cancelled&&g.started&&first===g.index&&!found.has(g.index)){flip(g.index,false);first=-1}
  gesture=null;dragLine.hidden=true;grid.classList.remove('memory-dragging');
  suppressPointerClickUntil=Date.now()+550;
  try{if(grid.hasPointerCapture?.(g.id))grid.releasePointerCapture(g.id)}catch(_){}
 }
 grid.addEventListener('pointerdown',e=>{
  if(token!==generation||busy)return;
  if(gesture){
   if(e.pointerId!==gesture.id){finishGesture({pointerId:gesture.id},true);suppressPointerClickUntil=Date.now()+550;e.preventDefault()}
   return;
  }
  const card=e.target.closest?.('.memory-card');
  if(!card||!grid.contains(card))return;
  const i=Number(card.dataset.index);
  if(!Number.isInteger(i)||i<0||i>=cards.length||found.has(i))return;
  if(i===first){choose(i);suppressPointerClickUntil=Date.now()+550;e.preventDefault();return;}
  gesture={id:e.pointerId,index:i,x:e.clientX,y:e.clientY,moved:false,started:false,existingFirst:first>=0};
  try{grid.setPointerCapture(e.pointerId)}catch(_){}
  e.preventDefault();
 });
 grid.addEventListener('pointermove',e=>{
  const g=gesture;if(!g||e.pointerId!==g.id||token!==generation)return;
  if(!g.moved&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>=12){
   g.moved=true;
   if(g.existingFirst){choose(g.index);finishGesture(e,true);return}
   choose(g.index);g.started=true;grid.classList.add('memory-dragging');
  }
  if(!g.moved)return;
  e.preventDefault();drawDragLine(e.clientX,e.clientY,g.index);
  const i=hitCard(e.clientX,e.clientY);
  if(i>=0&&i!==g.index&&!found.has(i)&&!busy){choose(i);finishGesture(e,true)}
 });
 grid.addEventListener('pointerup',e=>finishGesture(e));
 grid.addEventListener('pointercancel',e=>finishGesture(e,true));
 grid.addEventListener('lostpointercapture',e=>finishGesture(e,true));
 grid.addEventListener('click',e=>{
  if(e.detail>0&&Date.now()<suppressPointerClickUntil){e.preventDefault();e.stopImmediatePropagation()}
 },true);

 cards.forEach((card,i)=>{card.onclick=()=>choose(i);const img=card.querySelector('img');img.onerror=()=>{img.onerror=null;img.src=i%2?'./assets/family-play-puzzle.webp':'./assets/family-home-puzzle.webp'}});
 lookBtn.onclick=()=>{if(token!==generation||busy)return;if(first>=0){flip(first,false);first=-1;audio.play('pop');guide.textContent='👆 換一張試試看！';updatePeek();return}state.memorySlowLook=!slowLook();persist();updatePeek();audio.play('pop');guide.textContent=slowLook()?'👀 答錯時，慢慢看兩張照片，按 👍 再繼續！':'👆 答錯的照片會自動蓋回去！'};
 continueBtn.onclick=()=>{if(token!==generation||!pendingMismatch)return;const [i,j]=pendingMismatch;pendingMismatch=null;if(pending){clearTimeout(pending);pending=null}flip(i,false);flip(j,false);busy=false;guide.textContent='👆 再翻兩張，找出一樣的照片！';audio.play('pop');updatePeek()};
 app.querySelector('#memory-back').onclick=menu;
 app.querySelector('#memory-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#memory-retry').onclick=()=>{clearCheckpoint();start(level)};
 function endOverview(){
  if(token!==generation||!overviewActive)return;
  if(pending){clearTimeout(pending);pending=null}
  cards.forEach((card,i)=>{if(!found.has(i))flip(i,false)});
  overviewActive=false;overviewDoneBtn.hidden=true;busy=false;updatePeek();
  guide.textContent='💖 記住了嗎？現在找出一樣的兩張照片！';
 }
 overviewDoneBtn.onclick=()=>{if(!overviewActive||token!==generation)return;audio.play('pop');endOverview()};
 overviewBtn.onclick=()=>{
  if(token!==generation||busy||overviewUsed||found.size===deck.length)return;
  clearPoint();
  if(first>=0){flip(first,false);first=-1}
  overviewUsed=true;overviewActive=true;busy=true;overviewDoneBtn.hidden=false;
  cards.forEach((card,i)=>{if(!found.has(i))flip(i,true)});
  checkpoint();updatePeek();
  guide.textContent='👀 記住每張照片的位置！3 秒後會蓋回';
  audio.play('pop');vib(8);say('彥彥，快看清楚每張照片的位置，三秒後再配對！');
  pending=setTimeout(()=>{if(token!==generation)return;endOverview()},3000);
 };
 app.querySelector('#memory-peek').onclick=()=>{
  if(token!==generation||busy||hintsLeft<=0||found.size===deck.length)return;
  if(first>=0){
   const partner=deck.findIndex((d,k)=>k!==first&&!found.has(k)&&d.key===deck[first].key);
   if(partner<0)return;
   clearPoint();hintsLeft--;pointedCard=cards[partner];
   pointedCard.classList.add('memory-pointed');
   guide.textContent='👩 媽媽指的是這張！自己點一下完成配對 💞';
   checkpoint();updatePeek();audio.play('pop');vib(8);
   say('媽媽指給你看了，彥彥自己點一下這張照片！');
   pointTimer=setTimeout(()=>{if(token!==generation)return;clearPoint();guide.textContent='👆 記住媽媽剛剛指的位置，繼續找！'},2300);
   return;
  }
  const i=deck.findIndex((d,k)=>!found.has(k));
  const j=deck.findIndex((d,k)=>k!==i&&d.key===deck[i].key);
  if(i<0||j<0)return;
  busy=true;hintsLeft--;flip(i,true);flip(j,true);checkpoint();updatePeek();
  audio.play('pop');say('媽媽讓你看兩張一樣的照片，記住它們的位置！');
  pending=setTimeout(()=>{if(token!==generation)return;flip(i,false);flip(j,false);busy=false;pending=null;updatePeek()},2000);
 };
 app.querySelector('#memory-speak').onclick=()=>say('翻開兩張卡片，找到一樣的照片，就能配成一對！如果第一張選錯，再點一次或按收回這張就可以換。');
 checkpoint();updatePeek();say('媽媽和彥彥一起玩翻翻樂！找到兩張一樣的照片！');
}
function enhanceMenu(){
 const el=app.querySelector('.classic-menu');
 if(!el||el.querySelector('#memory-entry'))return;
 const btn=document.createElement('button');btn.className='classic-tile memory-tile';btn.id='memory-entry';
 btn.setAttribute('aria-label','開始親子翻翻樂');
 btn.innerHTML='<span class="classic-big">🃏👩‍👦</span><strong>親子翻翻樂</strong><span>🐶 💞 🐶</span><small>⭐ '+(Number(state.familyMemoryLevel)||1)+' / '+maxLevel+'</small>';
 el.insertBefore(btn,el.querySelector('.classic-audio-controls'));
 btn.onclick=()=>start();
}
const observer=new MutationObserver(enhanceMenu);observer.observe(app,{childList:true,subtree:true});
enhanceMenu();
window.YanMemoryCards={start,makeDeck,stop,enhanceMenu};
})();