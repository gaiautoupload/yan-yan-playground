(()=>{
'use strict';
// v347: small-hands large-bubble mode (4 bigger targets) keeps level, audio, stars, session and old controls.
const shared=window.YanClassicShared,audio=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!shared||!audio||photos.length<7)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=shared;
const MAX=40,ROUNDS=3,HITS=3;
const CATEGORIES=[
 {id:'animals',name:'小動物',items:[['🐶','小狗'],['🐱','小貓'],['🐰','兔子'],['🐸','青蛙'],['🐻','小熊'],['🐼','熊貓'],['🐥','小雞']]},
 {id:'vehicles',name:'交通工具',items:[['🚜','挖土機'],['🚗','汽車'],['🚕','計程車'],['🚒','消防車'],['🚲','腳踏車'],['🚂','火車'],['🚀','火箭']]},
 {id:'fruits',name:'水果',items:[['🍎','蘋果'],['🍌','香蕉'],['🍓','草莓'],['🍇','葡萄'],['🍉','西瓜'],['🍊','橘子'],['🍍','鳳梨']]},
 {id:'nature',name:'大自然',items:[['🌻','向日葵'],['🌷','鬱金香'],['🌈','彩虹'],['⭐','星星'],['🌙','月亮'],['☀️','太陽'],['🦋','蝴蝶']]}
];
function validBubbleSession(s,level,relay){
 if(!s||s.level!==level||s.relay!==relay||!Number.isInteger(s.round)||s.round<0||s.round>=ROUNDS||!Number.isInteger(s.hits)||s.hits<0||s.hits>=HITS)return null;
 const category=CATEGORIES.find(c=>c.id===s.categoryId);
 if(!category||!category.items.some(x=>x[0]===s.targetEmoji))return null;
 if(!Array.isArray(s.scores)||s.scores.length!==2||s.scores.some(x=>!Number.isInteger(x)||x<0||x>ROUNDS*HITS))return null;
 const sum=s.scores[0]+s.scores[1],total=s.round*HITS+s.hits;
 if(relay?(sum!==total||Math.abs(s.scores[0]-s.scores[1])>1||s.scores[0]<s.scores[1]):sum!==0)return null;
 return s;
}
function shuffle(a,rng=Math.random){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function makeRound(level,round,previous=null,rng=Math.random){
 const available=CATEGORIES.filter(c=>c.id!==previous);
 const category=available[Math.floor(rng()*available.length)];
 const target=category.items[Math.floor(rng()*category.items.length)];
 const scene=photos[(level*3+round*2)%photos.length];
 return {category,target,scene};
}
function makeBoard(level,round,rng=Math.random,easy=false){
 const count=easy?4:level<=10?4:level<=25?5:6;
 const others=shuffle(round.category.items.filter(x=>x[0]!==round.target[0]),rng).slice(0,count-2);
 const items=shuffle([round.target,round.target,...others],rng);
 return {items,count,target:round.target[0]};
}
let generation=0,pending=null,previous=null;
function stop(){generation++;if(pending!==null){clearTimeout(pending);pending=null}}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();audio.unlock();
 const relay=state.bubbleRelay===true;
 const listenOnly=()=>state.bubbleListenOnly===true;
 const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.bubbleLevel)||1));
 let round=(requested===undefined&&Number(state.bubbleCheckpointLevel)===level)?Math.max(0,Math.min(ROUNDS-1,Number(state.bubbleRound)||0)):0;
 let hits=(requested===undefined&&Number(state.bubbleCheckpointLevel)===level)?Math.max(0,Math.min(HITS-1,Number(state.bubbleHits)||0)):0;
 const checkpoint=requested===undefined?validBubbleSession(state.bubbleSession,level,relay):null;
 if(checkpoint){round=checkpoint.round;hits=checkpoint.hits}
 else if(relay){round=0;hits=0}
 let scores=checkpoint?checkpoint.scores.slice():[0,0];
 if(!checkpoint&&state.bubbleSession)delete state.bubbleSession;
 state.bubbleCheckpointLevel=level;state.bubbleRound=round;state.bubbleHits=hits;persist();
 const token=generation;let current=null,locked=false,misses=0;
 let sweepPointer=null,sweepOrigin=null,sweepMoved=false,sweepLast=null,sweepStartBubble=null,sweepSuppressUntil=0;
 let hintHold=null,suppressHintClickUntil=0;
 app.innerHTML='<section class="screen game classic-screen bubble-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="bubble-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🫧 彥彥泡泡抓抓樂</span><span class="chip">⭐ '+level+' / '+MAX+'</span><button class="iconbtn" id="bubble-speak" aria-label="再聽題目">🔊</button></header>'+
 '<main class="bubble-stage"><div class="bubble-heading">👩‍👦 <strong>聽一聽・找一找・滑著抓泡泡！</strong> 🫧</div>'+
 '<div class="bubble-relaybar"><button type="button" id="bubble-relay" aria-pressed="'+relay+'">'+(relay?'👩‍👦 親子接力：開':'👩‍👦 親子接力：關')+'</button><span id="bubble-turn" aria-live="polite"></span></div>'+
 '<div class="bubble-listenbar"><button type="button" id="bubble-listen" aria-pressed="'+listenOnly()+'">'+(listenOnly()?'👂 聽聲找泡泡：開':'👀 看圖找泡泡：開')+'</button><span id="bubble-listen-help" aria-live="polite"></span></div>'+
 '<div class="bubble-progress"><span id="bubble-round">🌟 '+(round+1)+' / '+ROUNDS+'</span><span id="bubble-hits">🫧 '+hits+' / '+HITS+'</span></div>'+
 '<div class="bubble-photo"><img id="bubble-photo" alt="媽媽與彥彥的親子照片" draggable="false"></div>'+
 '<div class="bubble-prompt" aria-live="polite"><span id="bubble-target">🐶</span><strong id="bubble-label">找一找</strong><button type="button" id="bubble-hint" aria-label="短按提示，長按媽媽幫抓一顆泡泡" title="短按提示，長按幫抓">💡</button><button type="button" id="bubble-easy" aria-label="切換小小手大泡泡模式，四顆大泡泡比較好點" aria-pressed="'+(state.bubbleEasyMode===true)+'" title="小小手大泡泡">👶</button></div>'+
 '<div class="bubble-board" id="bubble-board" role="group" aria-label="戳出正確的泡泡"></div>'+
 '<div class="bubble-guide" id="bubble-guide" aria-live="polite">👆 從泡泡按住滑出去，也能抓到起點泡泡！</div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="bubble-home">⌂ 首頁</button><button class="footbtn yellow" id="bubble-retry">🔄 重玩</button></footer></section>';
 const board=app.querySelector('#bubble-board'),guide=app.querySelector('#bubble-guide'),photo=app.querySelector('#bubble-photo'),turnLabel=app.querySelector('#bubble-turn');
 function updateTurn(){
  const sum=scores[0]+scores[1];
  turnLabel.textContent=relay?'👦 '+scores[0]+'　👩 '+scores[1]+'｜輪到'+(sum%2===0?'彥彥':'媽媽'):'👆 自己抓泡泡';
 }
 function saveCurrent(){
  if(!current)return;
  state.bubbleSession={level,round,hits,relay,categoryId:current.category.id,targetEmoji:current.target[0],scores:scores.slice()};
  persist();
 }
 function cue(){if(current)say('彥彥，幫媽媽抓泡泡！請找出'+current.target[1]+'，戳三顆喔！')}
 function updatePrompt(){
  if(!current)return;
  const hearing=listenOnly(),toggle=app.querySelector('#bubble-listen');
  toggle.textContent=hearing?'👂 聽聲找泡泡：開':'👀 看圖找泡泡：開';
  toggle.setAttribute('aria-pressed',String(hearing));
  app.querySelector('#bubble-target').textContent=hearing?'👂':current.target[0];
  app.querySelector('#bubble-label').textContent=hearing?'聽聲音，找泡泡！':'找到 '+current.target[1]+'！';
  app.querySelector('#bubble-listen-help').textContent=hearing?'🔊 聽媽媽說什麼，再戳泡泡':'👀 看圖案找一樣的泡泡';
  guide.textContent=hearing?'👂 聽媽媽說的物品，再戳泡泡！':'👆 點或滑過 '+current.target[0]+' 泡泡！';
 }
 function draw(){
  if(token!==generation)return;
  locked=false;sweepLast=null;misses=0;
  const b=makeBoard(level,current,Math.random,state.bubbleEasyMode===true);
  board.classList.toggle('bubble-easy',state.bubbleEasyMode===true);
  board.innerHTML=b.items.map((item,i)=>'<button type="button" class="bubble-ball" data-icon="'+item[0]+'" aria-label="'+item[1]+'泡泡" style="--bubble-delay:'+(i%3)*-.3+'s"><span>'+item[0]+'</span></button>').join('');
  app.querySelector('#bubble-hits').textContent='🫧 '+hits+' / '+HITS;
  app.querySelector('#bubble-round').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  guide.textContent=listenOnly()?'👂 聽媽媽說的物品，再戳泡泡！':'👆 戳一戳 '+current.target[0]+' 泡泡！';
 }
 function beginRound(){
  if(token!==generation)return;
  if(checkpoint&&checkpoint.round===round&&checkpoint.hits===hits){
   const category=CATEGORIES.find(c=>c.id===checkpoint.categoryId);
   current={category,target:category.items.find(x=>x[0]===checkpoint.targetEmoji),scene:photos[(level*3+round*2)%photos.length]};
  }else current=makeRound(level,round,previous);
  previous=current.category.id;
  updatePrompt();
  photo.onerror=()=>{photo.onerror=null;photo.src='./assets/family-home.webp'};
  photo.src=current.scene.scene;
  draw();updateTurn();saveCurrent();cue();
 }
 function win(){
  if(token!==generation)return;
  delete state.bubbleSession;
  state.bubbleLevel=Math.max(Number(state.bubbleLevel)||1,Math.min(MAX,level+1));
  state.bubbleCheckpointLevel=state.bubbleLevel;state.bubbleRound=0;state.bubbleHits=0;
  state.bubbleWins=(Number(state.bubbleWins)||0)+1;
  state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  audio.play('win');fx('win');vib([15,30,15]);say('彥彥好厲害！九顆泡泡都抓到了！');
  const overlay=document.createElement('div');overlay.className='overlay bubble-win';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 泡泡任務成功！</h2><p>🫧 抓到九顆泡泡！</p><button class="primary" id="bubble-next">▶️ 下一關</button><button class="classic-secondary" id="bubble-again">🔄 再玩一次</button><button class="classic-secondary" id="bubble-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#bubble-next').onclick=()=>start(level>=MAX?1:level+1);
  overlay.querySelector('#bubble-again').onclick=()=>start(level);
  overlay.querySelector('#bubble-menu').onclick=menu;
 }
 function pickBubble(b){
  if(!b||locked||token!==generation)return;
  audio.unlock();
  if(b.dataset.icon!==current.target[0]){
   misses++;audio.play('wrong');vib(12);b.classList.remove('bubble-wrong');void b.offsetWidth;b.classList.add('bubble-wrong');
   if(misses>=2){
    board.querySelectorAll('.bubble-ball').forEach(item=>{if(item.dataset.icon===current.target[0])item.classList.add('bubble-auto-hint')});
    guide.textContent='👩 媽媽提示：找發光的泡泡！';cue();
   }else guide.textContent=listenOnly()?'💗 聽一聽，再找找正確泡泡！':'💗 再找找 '+current.target[0]+'！';
   return;
  }
  locked=true;b.classList.add('bubble-pop');audio.play('hit');fx('yay');vib([12,20,12]);
  if(relay)scores[(scores[0]+scores[1])%2]++;
  hits++;state.bubbleHits=hits;state.bubbleRound=round;state.bubbleCheckpointLevel=level;
  app.querySelector('#bubble-hits').textContent='🫧 '+hits+' / '+HITS;
  guide.textContent='🎉 抓到了！';updateTurn();
  if(hits>=HITS){round++;hits=0;state.bubbleRound=round;state.bubbleHits=0;delete state.bubbleSession;persist();pending=setTimeout(round>=ROUNDS?win:beginRound,420)}
  else{saveCurrent();pending=setTimeout(draw,300)}
 }
 board.addEventListener('click',e=>{
  if(Date.now()<sweepSuppressUntil)return;
  pickBubble(e.target.closest('.bubble-ball'));
 });
 board.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||sweepPointer!==null){sweepSuppressUntil=Date.now()+650;return}
  if(e.pointerType==='mouse'&&e.button!==0)return;
  sweepPointer=e.pointerId;sweepOrigin={x:e.clientX,y:e.clientY};sweepMoved=false;sweepLast=null;
  sweepStartBubble=e.target.closest?e.target.closest('.bubble-ball'):null;
 });
 board.addEventListener('pointermove',e=>{
  if(e.pointerId!==sweepPointer||!sweepOrigin||token!==generation)return;
  if(!sweepMoved&&Math.hypot(e.clientX-sweepOrigin.x,e.clientY-sweepOrigin.y)<12)return;
  if(!sweepMoved){
   sweepMoved=true;board.classList.add('bubble-sweeping');try{board.setPointerCapture(e.pointerId)}catch(_){}
   // Touching the first bubble before sliding must count, even if the finger exits its bounds.
   if(sweepStartBubble&&board.contains(sweepStartBubble)){sweepLast=sweepStartBubble;pickBubble(sweepStartBubble)}
  }
  sweepSuppressUntil=Date.now()+650;
  const target=document.elementFromPoint(e.clientX,e.clientY);
  const bubble=target&&target.closest?target.closest('.bubble-ball'):null;
  if(bubble&&board.contains(bubble)&&bubble!==sweepLast){sweepLast=bubble;pickBubble(bubble)}
 });
 function finishSweep(e){
  if(e.pointerId!==sweepPointer)return;
  if(sweepMoved)sweepSuppressUntil=Date.now()+650;
  sweepPointer=null;sweepOrigin=null;sweepMoved=false;sweepLast=null;sweepStartBubble=null;
  board.classList.remove('bubble-sweeping');
  try{if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId)}catch(_){}
 }
 board.addEventListener('pointerup',finishSweep);
 board.addEventListener('pointercancel',finishSweep);
 board.addEventListener('lostpointercapture',finishSweep);
 // v396: hold the hint for 650ms to catch one correct bubble using the original scoring path.
 const hintButton=app.querySelector('#bubble-hint');
 function clearHintHold(){if(!hintHold)return;clearTimeout(hintHold.timer);hintHold=null;hintButton.classList.remove('bubble-hint-holding')}
 hintButton.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||e.button>0||locked||sweepPointer!==null||token!==generation)return;
  clearHintHold();
  const pointerId=e.pointerId;
  hintHold={pointerId,timer:setTimeout(()=>{
   if(!hintHold||hintHold.pointerId!==pointerId||locked||sweepPointer!==null||token!==generation||!current)return;
   suppressHintClickUntil=Date.now()+900;clearHintHold();
   const matching=[...board.querySelectorAll('.bubble-ball')].find(b=>b.dataset.icon===current.target[0]);
   if(!matching)return;
   audio.unlock();guide.textContent='👩 媽媽幫抓一顆！';pickBubble(matching);
  },650)};
  hintButton.classList.add('bubble-hint-holding');
 });
 function endHintHold(e){if(hintHold&&e.pointerId===hintHold.pointerId)clearHintHold()}
 for(const name of ['pointerup','pointercancel','lostpointercapture'])hintButton.addEventListener(name,endHintHold);
 hintButton.addEventListener('click',e=>{if(Date.now()<suppressHintClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
 app.querySelector('#bubble-hint').onclick=()=>{
  if(locked)return;audio.unlock();audio.play('pop');cue();
  board.querySelectorAll('.bubble-ball').forEach(b=>{if(b.dataset.icon===current.target[0])b.classList.add('bubble-hinted')});
 };
 app.querySelector('#bubble-easy').onclick=()=>{
  if(locked||sweepPointer!==null||token!==generation)return;
  state.bubbleEasyMode=state.bubbleEasyMode!==true;persist();
  const toggle=app.querySelector('#bubble-easy');toggle.setAttribute('aria-pressed',String(state.bubbleEasyMode));
  draw();guide.textContent=state.bubbleEasyMode?'👶 四顆大泡泡，慢慢點或滑過去！':'🫧 已回到一般泡泡，繼續挑戰！';
  audio.unlock();cue();
 };
 app.querySelector('#bubble-listen').onclick=()=>{
  state.bubbleListenOnly=!listenOnly();persist();
  board.querySelectorAll('.bubble-ball').forEach(b=>b.classList.remove('bubble-hinted'));
  updatePrompt();audio.unlock();cue();
 };
 app.querySelector('#bubble-relay').onclick=()=>{
  state.bubbleRelay=!relay;
  delete state.bubbleSession;state.bubbleCheckpointLevel=level;state.bubbleRound=0;state.bubbleHits=0;persist();
  start(level);
 };
 app.querySelector('#bubble-back').onclick=menu;
 app.querySelector('#bubble-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#bubble-retry').onclick=()=>start(level);
 app.querySelector('#bubble-speak').onclick=()=>{audio.unlock();cue()};
 beginRound();
}
function enhance(){
 const classic=app.querySelector('.classic-menu');if(!classic||classic.querySelector('#bubble-entry'))return;
 const b=document.createElement('button');b.id='bubble-entry';b.className='classic-tile bubble-tile';b.setAttribute('aria-label','開始彥彥泡泡抓抓樂');
 b.innerHTML='<span class="classic-big">🫧🐶</span><strong>泡泡抓抓樂</strong><span>👀 👆 ✨</span><small>⭐ '+(Number(state.bubbleLevel)||1)+' / '+MAX+'</small>';
 classic.insertBefore(b,classic.querySelector('.classic-audio-controls'));b.onclick=()=>start();
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanBubbleCatch={start,stop,makeBoard,makeRound,enhance};
})();