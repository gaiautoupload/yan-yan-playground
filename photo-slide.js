(()=>{
'use strict';
// v364: reshuffle only the current photo round, preserving the completed first photo and checkpoint; v231: swipe outward from the empty slot to pull a neighboring photo tile in; v125: one-tap legal next move using existing solver, undo and checkpoint; v91: mom's next-step photo hint; v90: drag photo tile toward adjacent empty slot; v89 undo and checkpoint preserved. Additive to v27. Additive to v26; same save key and all previous games.
const shared=window.YanClassicShared,audio=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!shared||!audio||photos.length<2)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=shared;
const MAX=40,ROUNDS=2;
let generation=0,pending=null;
function adjacent(index,n){
 const r=Math.floor(index/n),c=index%n,out=[];
 if(r>0)out.push(index-n);
 if(r<n-1)out.push(index+n);
 if(c>0)out.push(index-1);
 if(c<n-1)out.push(index+1);
 return out;
}
function move(cells,index,n){
 const blank=cells.indexOf(n*n-1);
 if(!adjacent(blank,n).includes(index))return false;
 const tmp=cells[blank];cells[blank]=cells[index];cells[index]=tmp;
 return true;
}
function solved(cells){return cells.every((v,i)=>v===i)}
function makeBoard(level,rng=Math.random){
 const n=level<=12?2:3,count=n*n,cells=Array.from({length:count},(_,i)=>i);
 let blank=count-1,previous=-1;
 const history=[],steps=n===2?4+Math.min(level,8):12+Math.min(level-12,12);
 for(let k=0;k<steps;k++){
  let choices=adjacent(blank,n).filter(i=>i!==previous);
  if(!choices.length)choices=adjacent(blank,n);
  const next=choices[Math.floor(rng()*choices.length)];
  history.push(blank);
  move(cells,next,n);previous=blank;blank=next;
 }
 if(solved(cells)){
  const next=adjacent(blank,n)[0];
  history.push(blank);move(cells,next,n);blank=next;
 }
 return {n,cells,history,blank,steps};
}
function validSession(s,level,round){
 if(!s||s.level!==level||s.round!==round||!Array.isArray(s.cells)||!Array.isArray(s.history))return false;
 const n=level<=12?2:3,count=n*n;
 if(s.cells.length!==count||new Set(s.cells).size!==count||s.cells.some(v=>!Number.isInteger(v)||v<0||v>=count)||solved(s.cells))return false;
 if(!Number.isSafeInteger(s.moves)||s.moves<0||s.moves>100000||s.history.length>120||s.history.length>s.moves)return false;
 const blank=s.cells.indexOf(count-1);let inversions=0;
 for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if(s.cells[i]!==count-1&&s.cells[j]!==count-1&&s.cells[i]>s.cells[j])inversions++;
 if(n%2===1?inversions%2!==0:(inversions+(n-Math.floor(blank/n)))%2!==1)return false;
 let cursor=blank;
 for(let i=s.history.length-1;i>=0;i--){
  const prev=s.history[i];
  if(!Number.isInteger(prev)||!adjacent(cursor,n).includes(prev))return false;
  cursor=prev;
 }
 return true;
}

/* v91: bounded IDA* gives a legal next tile toward the completed photo.
   No auto-answer, no changes to stars, steps or saved puzzle state. */
function findHintStep(cells,n){
 const count=n*n,blankValue=count-1,work=cells.slice();let answer=-1,remaining=180000;
 function distance(){
  let total=0;
  for(let i=0;i<count;i++){const v=work[i];if(v===blankValue)continue;
   total+=Math.abs(Math.floor(i/n)-Math.floor(v/n))+Math.abs(i%n-v%n);
  }
  return total;
 }
 function search(blank,previous,depth,bound,first){
  const heuristic=distance(),score=depth+heuristic;
  if(score>bound)return score;
  if(heuristic===0){answer=first;return -1}
  if(--remaining<=0)return Infinity;
  let best=Infinity;
  for(const index of adjacent(blank,n)){
   if(index===previous)continue;
   const tmp=work[blank];work[blank]=work[index];work[index]=tmp;
   const result=search(index,blank,depth+1,bound,first<0?index:first);
   work[index]=work[blank];work[blank]=tmp;
   if(result===-1)return -1;
   if(result<best)best=result;
  }
  return best;
 }
 let bound=distance();if(bound===0)return -1;
 while(bound<=32&&remaining>0){
  const next=search(work.indexOf(blankValue),-1,0,bound,-1);
  if(next===-1)return answer;
  if(!Number.isFinite(next))break;
  bound=next;
 }
 return -1;
}
function stop(){generation++;if(pending){clearTimeout(pending);pending=null}}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();audio.unlock();
 const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.familySlideLevel)||1));
 let round=requested===undefined&&Number(state.familySlideCheckpointLevel)===level?Math.max(0,Math.min(ROUNDS-1,Number(state.familySlideRound)||0)):0;
 if(requested!==undefined)delete state.familySlideSession;
 state.familySlideCheckpointLevel=level;state.familySlideRound=round;persist();
 const token=generation;
 let game=null,photo=null,moves=0,locked=false,hintIndex=-1;
 function saveSession(){
  if(!game||locked)return;
  state.familySlideSession={level,round,cells:game.cells.slice(),moves,history:game.history.slice()};
  persist();
 }
 app.innerHTML='<section class="screen game classic-screen slide-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="slide-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🧩 照片滑塊拼圖</span><span class="chip">⭐ '+level+' / '+MAX+'</span><button class="iconbtn" id="slide-speak" aria-label="聽玩法">🔊</button></header>'+
 '<main class="slide-stage"><div class="slide-intro">👩‍👦 <strong>👆 把照片拼回來！</strong> 🐾</div>'+
 '<div class="slide-progress"><span id="slide-round">🌟 '+(round+1)+' / '+ROUNDS+'</span><span id="slide-moves">👆 0 次</span></div>'+
 '<div class="slide-board" id="slide-board" role="group" aria-label="照片滑塊拼圖"></div>'+
 '<div class="slide-tools"><button type="button" class="slide-undo-button" id="slide-undo" disabled>↶ 退一步</button><button type="button" class="slide-hint-button" id="slide-hint">👩 提示一步</button><button type="button" class="slide-auto-button" id="slide-auto" aria-label="自動移動一塊拼圖">✨ 幫移一步</button><button type="button" class="slide-shuffle-button" id="slide-shuffle" aria-label="只重新打亂目前這張照片，保留已完成的上一張">🔀 重排本張</button><button type="button" class="slide-peek-button" id="slide-peek-button">👀 看完整照片</button><img id="slide-thumbnail" class="slide-thumbnail" alt="原始完整照片"></div>'+
 '<div class="slide-guide" id="slide-guide" aria-live="polite">👆 點空格旁邊的照片 🧩</div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="slide-home">⌂ 首頁</button><button class="footbtn yellow" id="slide-retry">🔄 重玩</button></footer>'+
 '<div class="slide-peek" id="slide-peek" hidden><img id="slide-peek-img" alt="完整照片"><button type="button" id="slide-peek-close">👍 我看好了</button></div></section>';
 const board=app.querySelector('#slide-board'),guide=app.querySelector('#slide-guide');
 function cue(){say('彥彥，點空格會幫你移一塊，或從空格往照片滑，也可以自己點照片拼回來！')}
 function paint(){
  if(token!==generation)return;
  const n=game.n,empty=n*n-1,blank=game.cells.indexOf(empty);
  board.style.setProperty('--slide-n',String(n));
  board.innerHTML=game.cells.map((tile,i)=>{
   if(tile===empty)return '<div class="slide-hole" role="button" tabindex="0" aria-label="空格，點一下幫移一塊，或往旁邊照片滑動">✨</div>';
   const x=tile%n,y=Math.floor(tile/n),possible=adjacent(blank,n).includes(i);
   return '<button type="button" class="slide-piece'+(possible?' slide-movable':'')+(i===hintIndex?' slide-hinted':'')+'" data-index="'+i+'" data-tile="'+tile+'" aria-label="移動照片第'+(tile+1)+'塊" '+(locked?'disabled':'')+'><img draggable="false" alt="" src="'+photo.puzzle+'" style="width:'+(n*100)+'%;height:'+(n*100)+'%;left:-'+(x*100)+'%;top:-'+(y*100)+'%"></button>';
  }).join('');
  board.querySelectorAll('img').forEach(img=>{img.onerror=()=>{img.onerror=null;img.src='./assets/family-home-puzzle.webp'}});
  app.querySelector('#slide-moves').textContent='👆 '+moves+' 次';
  app.querySelector('#slide-undo').disabled=locked||!game.history.length;
  app.querySelector('#slide-hint').disabled=locked;
  app.querySelector('#slide-auto').disabled=locked;
  app.querySelector('#slide-shuffle').disabled=locked;
 }
 function newRound(){
  if(token!==generation)return;
  hintIndex=-1;
  const session=state.familySlideSession;
  if(validSession(session,level,round)){
   game={n:level<=12?2:3,cells:session.cells.slice(),history:session.history.slice()};
   moves=session.moves;
  }else{
   if(session)delete state.familySlideSession;
   game=makeBoard(level);game.history=[];moves=0;
  }
  photo=photos[((level-1)*ROUNDS+round)%photos.length];locked=false;
  app.querySelector('#slide-round').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  app.querySelector('#slide-thumbnail').src=photo.puzzle;
  app.querySelector('#slide-peek-img').src=photo.puzzle;
  guide.textContent='✨ 點空格幫移一步，或自己滑照片 🧩';
  paint();saveSession();
  if(round===0)cue();
 }
 function finish(){
  if(token!==generation)return;
  delete state.familySlideSession;
  state.familySlideLevel=Math.max(Number(state.familySlideLevel)||1,Math.min(MAX,level+1));
  state.familySlideCheckpointLevel=state.familySlideLevel;state.familySlideRound=0;
  state.familySlideWins=(Number(state.familySlideWins)||0)+1;
  state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  audio.play('win');fx('win');vib([20,35,20]);say('太棒了！彥彥把照片拼回來了！');
  const overlay=document.createElement('div');overlay.className='overlay slide-win';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 照片拼好了！</h2><p>🧩 完成兩張照片！</p><button class="primary" id="slide-next">▶️ 下一關</button><button class="classic-secondary" id="slide-again">🔄 再玩一次</button><button class="classic-secondary" id="slide-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#slide-next').onclick=()=>start(level>=MAX?1:level+1);
  overlay.querySelector('#slide-again').onclick=()=>start(level);
  overlay.querySelector('#slide-menu').onclick=menu;
 }
 app.querySelector('#slide-undo').onclick=()=>{
  if(locked||!game.history.length||token!==generation)return;
  hintIndex=-1;
  const previousBlank=game.history.pop();
  if(!move(game.cells,previousBlank,game.n))return;
  moves=Math.max(0,moves-1);audio.play('pop');vib(10);
  guide.textContent='↶ 退回一步，再試一次！';
  saveSession();paint();
 };
 app.querySelector('#slide-hint').onclick=()=>{
  if(locked||token!==generation)return;
  const next=findHintStep(game.cells,game.n);
  if(next<0){guide.textContent='👩 這一步先自己試試看！';return}
  hintIndex=next;paint();audio.play('pop');vib(10);
  guide.textContent='👩 找到亮亮的照片，點它或滑進空格！';
  say('彥彥，試試看亮起來的那一塊照片！');
 };
 // v125: delegate to the original tile click handler, preserving move history,
 // two-round completion, star award, undo and the existing checkpoint format.
 app.querySelector('#slide-auto').onclick=()=>{
  if(locked||token!==generation)return;
  const next=findHintStep(game.cells,game.n);
  const tile=next>=0?board.querySelector('.slide-piece[data-index="'+next+'"]'):null;
  if(!tile){guide.textContent='👩 先看亮亮的提示，再試一次！';return}
  audio.unlock();tile.click();
  if(!locked&&token===generation){
   guide.textContent='✨ 媽媽幫你移了一塊，下一步換你！';
   say('媽媽幫你移了一塊，換你試試看！');
  }
 };
 // v364: reshuffle only this photo, never replay the previous round or award stars.
 app.querySelector('#slide-shuffle').onclick=()=>{
  if(locked||token!==generation)return;
  delete state.familySlideSession;
  hintIndex=-1;
  newRound();
  audio.play('pop');vib(10);
  guide.textContent='🔀 這張重新洗牌！上一張的進度保留喔！';
 };
 board.addEventListener('click',e=>{
  const b=e.target.closest('.slide-piece');if(!b||locked||token!==generation)return;
  audio.unlock();
  const index=Number(b.dataset.index);
  hintIndex=-1;
  const previousBlank=game.cells.indexOf(game.n*game.n-1);
  if(!move(game.cells,index,game.n)){
   audio.play('wrong');vib(10);guide.textContent='👆 要點空格旁邊的照片喔！';return;
  }
  game.history.push(previousBlank);
  if(game.history.length>120)game.history.shift();
  moves++;audio.play('pop');vib(10);
  const completed=solved(game.cells);
  if(completed){locked=true;delete state.familySlideSession}else saveSession();
  paint();
  if(completed){
   locked=true;round++;state.familySlideRound=round;state.familySlideCheckpointLevel=level;persist();
   guide.textContent='🎉 拼好了！';audio.play('hit');fx('yay');vib([12,30,12]);
   pending=setTimeout(round>=ROUNDS?finish:newRound,700);
  }else if(moves%5===0){guide.textContent='💪 彥彥加油！'}
 });

 // v90: pointer gesture uses the same click handler as tapping; all scoring,
 // undo, round completion and checkpoint logic remain in one place.
 // v231: either pull a tile into the hole or swipe outward from the hole.
 // Both routes dispatch the original tile click so scoring, undo and saves stay unified.
 let slideDrag=null,ignoreTrustedClickUntil=0;
 function endSlideDrag(){
  if(slideDrag&&slideDrag.el){
   slideDrag.el.classList.remove('slide-dragging','slide-hole-active');
   slideDrag.el.style.transform='';
  }
  slideDrag=null;
 }
 board.addEventListener('click',e=>{
  if(e.isTrusted&&Date.now()<ignoreTrustedClickUntil){e.stopImmediatePropagation();e.preventDefault()}
 },true);
 board.addEventListener('pointerdown',e=>{
  if(slideDrag||locked||token!==generation||e.isPrimary===false)return;
  const el=e.target.closest('.slide-piece, .slide-hole');
  if(!el)return;
  const hole=el.classList.contains('slide-hole');
  slideDrag={pointer:e.pointerId,index:hole?game.cells.indexOf(game.n*game.n-1):Number(el.dataset.index),x:e.clientX,y:e.clientY,el,hole};
  if(hole)el.classList.add('slide-hole-active');
  try{el.setPointerCapture(e.pointerId)}catch(_){}
 });
 board.addEventListener('pointermove',e=>{
  const d=slideDrag;if(!d||d.pointer!==e.pointerId||locked)return;
  const dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(Math.hypot(dx,dy)<9||d.hole)return;
  d.el.classList.add('slide-dragging');
  d.el.style.transform='translate('+Math.max(-16,Math.min(16,dx))+'px,'+Math.max(-16,Math.min(16,dy))+'px)';
 });
 board.addEventListener('pointerup',e=>{
  const d=slideDrag;if(!d||d.pointer!==e.pointerId)return;
  const dx=e.clientX-d.x,dy=e.clientY-d.y,n=game.n,blank=game.cells.indexOf(n*n-1);
  let tile=null;
  if(d.hole){
   // Only cardinal swipes count. The neighbor must be on the board and legal.
   const horizontal=Math.abs(dx)>Math.abs(dy)*1.15,vertical=Math.abs(dy)>Math.abs(dx)*1.15;
   const offset=horizontal&&Math.abs(dx)>=24?(dx>0?1:-1):
    vertical&&Math.abs(dy)>=24?(dy>0?n:-n):0;
   const target=blank+offset;
   if(offset&&adjacent(blank,n).includes(target)){
    tile=board.querySelector('.slide-piece[data-index="'+target+'"]');
   }else if(Math.hypot(dx,dy)<12){
    // v362: a short tap on the empty slot makes one legal solver step.
    // Long/diagonal/invalid swipes do not accidentally move any tile.
    const next=findHintStep(game.cells,n);
    if(next>=0)tile=board.querySelector('.slide-piece[data-index="'+next+'"]');
   }
  }else{
   const delta=blank-d.index,legal=adjacent(blank,n).includes(d.index);
   const horizontal=Math.abs(dx)>Math.abs(dy),vertical=Math.abs(dy)>Math.abs(dx);
   const toward=legal&&((delta===1&&horizontal&&dx>24)||(delta===-1&&horizontal&&dx< -24)||
     (delta===n&&vertical&&dy>24)||(delta===-n&&vertical&&dy< -24));
   if(toward)tile=d.el;
  }
  endSlideDrag();
  if(tile&&!locked&&token===generation){
   ignoreTrustedClickUntil=Date.now()+280;
   tile.click();
  }
 });
 board.addEventListener('keydown',e=>{
  if(locked||token!==generation||!e.target.classList.contains('slide-hole')||!['Enter',' '].includes(e.key))return;
  e.preventDefault();const next=findHintStep(game.cells,game.n);
  const tile=next>=0?board.querySelector('.slide-piece[data-index="'+next+'"]'):null;
  if(tile)tile.click();
 });
 board.addEventListener('pointercancel',e=>{if(slideDrag&&slideDrag.pointer===e.pointerId)endSlideDrag()});
 board.addEventListener('lostpointercapture',e=>{if(slideDrag&&slideDrag.pointer===e.pointerId)endSlideDrag()});
 const peek=app.querySelector('#slide-peek');
 app.querySelector('#slide-peek-button').onclick=()=>{peek.hidden=false;audio.play('pop')};
 app.querySelector('#slide-peek-close').onclick=()=>{peek.hidden=true};
 app.querySelector('#slide-back').onclick=menu;
 app.querySelector('#slide-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#slide-retry').onclick=()=>start(level);
 app.querySelector('#slide-speak').onclick=()=>{audio.unlock();cue()};
 app.querySelector('#slide-thumbnail').onerror=e=>{e.target.onerror=null;e.target.src='./assets/family-home-puzzle.webp'};
 app.querySelector('#slide-peek-img').onerror=e=>{e.target.onerror=null;e.target.src='./assets/family-home-puzzle.webp'};
 newRound();
}
function enhance(){
 const classic=app.querySelector('.classic-menu');
 if(!classic||classic.querySelector('#slide-entry'))return;
 const b=document.createElement('button');b.id='slide-entry';b.className='classic-tile slide-tile';
 b.setAttribute('aria-label','開始照片滑塊拼圖');
 b.innerHTML='<span class="classic-big">🧩👩‍👦</span><strong>照片滑塊拼圖</strong><span>👆 ↔️ 🖼️</span><small>⭐ '+(Number(state.familySlideLevel)||1)+' / '+MAX+'</small>';
 classic.insertBefore(b,classic.querySelector('.classic-audio-controls'));b.onclick=()=>start();
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanSlidePuzzle={start,stop,makeBoard,adjacent,move,solved,enhance};
})();