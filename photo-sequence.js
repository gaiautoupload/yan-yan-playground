(()=>{
'use strict';
// v391: speak the full picture order on demand with synchronized visual highlighting; countdown pauses until narration finishes.
// v289: one visual+spoken next-photo peek per round, persisted across refresh without auto-answer.
// v200: captured pointerup commits a tap; synthetic clicks are suppressed, keyboard clicks remain functional.
// v199: parent assist places exactly the next correct photo through choose(), retaining stars, checkpoints and undo.
// v120: swipe across answer photos in order; additive, preserves the unified save and v88 undo.
const shared=window.YanClassicShared, audio=window.YanClassicAudio, photos=window.YanFamilyPhotos||[];
if(!shared||!audio||photos.length<4)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=shared;
const MAX=40,ROUNDS=3,REPLAYS=2;let generation=0,timer=null,peekTimer=null,narrateTimer=null;
const names={petshop:'看狗狗',playground:'公園跑跑',restaurant:'吃飯',bedtime:'睡前故事',school:'去上學',swing:'盪鞦韆',picnic:'野餐'};
function shuffle(a,rng=Math.random){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function makeSequence(level,items=photos,rng=Math.random){
 const count=Math.min(items.length,level<=5?2:level<=15?3:4);
 const order=shuffle(items,rng).slice(0,count);
 return {order,options:shuffle(order,rng),count};
}
function restoreSession(level,round){
 const c=state.familySequenceSession;
 const count=Math.min(photos.length,level<=5?2:level<=15?3:4);
 if(!c||c.level!==level||c.round!==round||!Array.isArray(c.order)||!Array.isArray(c.options)||
 c.order.length!==count||c.options.length!==count||!Number.isInteger(c.step)||c.step<0||c.step>=count||
 !Number.isInteger(c.replaysLeft)||c.replaysLeft<0||c.replaysLeft>REPLAYS||
 (c.peeksLeft!==undefined&&(!Number.isInteger(c.peeksLeft)||c.peeksLeft<0||c.peeksLeft>1)))return null;
 const map=new Map(photos.map(p=>[p.id,p]));
 if(map.size!==photos.length||new Set(c.order).size!==count||new Set(c.options).size!==count||
 c.order.some(id=>!map.has(id))||c.options.some(id=>!map.has(id))||
 c.order.some(id=>!c.options.includes(id)))return null;
 return {game:{order:c.order.map(id=>map.get(id)),options:c.options.map(id=>map.get(id)),count},step:c.step,replaysLeft:c.replaysLeft,peeksLeft:c.peeksLeft===undefined?1:c.peeksLeft};
}
function sampleSwipe(x0,y0,x1,y1,visit){
 const distance=Math.hypot(x1-x0,y1-y0),steps=Math.max(1,Math.min(100,Math.ceil(distance/10)));
 for(let i=0;i<=steps;i++)visit(x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps);
}
function stop(){generation++;if(timer){clearTimeout(timer);timer=null}if(peekTimer){clearTimeout(peekTimer);peekTimer=null}if(narrateTimer){clearTimeout(narrateTimer);narrateTimer=null}}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();audio.unlock();
 const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.familySequenceLevel)||1));
 let round=(requested===undefined&&Number(state.familySequenceCheckpointLevel)===level)?Math.max(0,Math.min(ROUNDS-1,Number(state.familySequenceRound)||0)):0;
 const token=generation;let game=null,step=0,locked=true,mistakes=0,replaysLeft=REPLAYS,peeksLeft=1,replaying=false;
 let restoredSession=requested===undefined?restoreSession(level,round):null;
 function saveSession(){
  if(!game)return;
  state.familySequenceSession={level,round,order:game.order.map(p=>p.id),options:game.options.map(p=>p.id),step,replaysLeft,peeksLeft};
  persist();
 }
 if(requested!==undefined||!restoredSession)state.familySequenceSession=null;
 state.familySequenceCheckpointLevel=level;state.familySequenceRound=round;persist();
 app.innerHTML='<section class="screen game classic-screen sequence-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="sequence-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🧠 照片順序記憶</span><span class="chip">⭐ '+level+' / '+MAX+'</span><button class="iconbtn" id="sequence-speak" aria-label="聽玩法">🔊</button></header>'+
 '<main class="sequence-stage"><div class="sequence-banner">👩‍👦 <span id="sequence-instruction" aria-live="polite">👀 先記住照片順序！</span> 🐾</div>'+
 '<div class="sequence-status"><span id="sequence-round">🌟 '+(round+1)+' / '+ROUNDS+'</span><span id="sequence-step">🧩 準備中</span><button type="button" id="sequence-peek" class="sequence-peek-btn" hidden>🔍 偷看 ×1</button></div><div id="sequence-peek-view" class="sequence-peek-view" role="status" aria-live="polite" hidden></div>'+
 '<div class="sequence-preview" id="sequence-preview"></div><button type="button" class="sequence-narrate" id="sequence-narrate">🔊 聽照片順序</button>'+
 '<div class="sequence-grid" id="sequence-grid"></div>'+
 '<button class="sequence-ready" id="sequence-ready">👆 我記好了！</button>'+ 
 '<div class="sequence-progress" id="sequence-progress" aria-label="已答對的照片順序" hidden></div>'+ '<div class="sequence-actions" id="sequence-actions" hidden><button type="button" class="sequence-replay" id="sequence-replay" hidden>👩 再看一次 ×2</button><button type="button" class="sequence-undo" id="sequence-assist" aria-label="請媽媽幫忙選下一張正確照片" disabled>👩 幫排一張</button><button type="button" class="sequence-undo" id="sequence-undo" disabled>↶ 退一張</button></div>'+
 '<div class="sequence-hint">👀 記順序 → 👆 點照片或按住滑過 → ⭐ 過關</div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="sequence-home">⌂ 首頁</button><button class="footbtn yellow" id="sequence-retry">🔄 重玩</button></footer></section>';
 const grid=app.querySelector('#sequence-grid'),preview=app.querySelector('#sequence-preview'),ready=app.querySelector('#sequence-ready'),replay=app.querySelector('#sequence-replay'),narrate=app.querySelector('#sequence-narrate');
 const undo=app.querySelector('#sequence-undo'),assist=app.querySelector('#sequence-assist'),progress=app.querySelector('#sequence-progress'),actions=app.querySelector('#sequence-actions');
  const peekBtn=app.querySelector('#sequence-peek'),peekView=app.querySelector('#sequence-peek-view');
  function hidePeek(){if(peekTimer){clearTimeout(peekTimer);peekTimer=null}peekView.hidden=true;peekView.innerHTML=''}
 function cancelNarration(){if(narrateTimer){clearTimeout(narrateTimer);narrateTimer=null}narrate.disabled=false;preview.querySelectorAll('.sequence-preview-card').forEach(card=>card.classList.remove('sequence-speaking'))}
 function speakSequence(){
  if(token!==generation||!locked||!game||narrate.disabled)return;
  audio.unlock();if(timer){clearTimeout(timer);timer=null}cancelNarration();narrate.disabled=true;
  let i=0;
  function next(){
   if(token!==generation||!locked)return;
   preview.querySelectorAll('.sequence-preview-card').forEach((card,index)=>card.classList.toggle('sequence-speaking',index===i));
   if(i>=game.count){cancelNarration();narrateTimer=setTimeout(beginRecall,1100);return}
   const photo=game.order[i];say('第'+(i+1)+'張，'+(names[photo.id]||photo.name));
   i++;narrateTimer=setTimeout(next,1400);
  }
  next();
 }
 function updateProgress(){if(!game)return;progress.innerHTML=game.order.slice(0,step).map((p,i)=>'<span class="sequence-progress-photo"><img src="'+p.puzzle+'" alt="第 '+(i+1)+' 張 '+(names[p.id]||p.name)+'"><b>'+(i+1)+'</b></span>').join('');progress.querySelectorAll('img').forEach(im=>im.onerror=()=>{im.onerror=null;im.src='./assets/family-home-puzzle.webp'});undo.disabled=locked||step===0;assist.disabled=locked||step>=game.count;peekBtn.disabled=locked||peeksLeft===0||step>=game.count;peekBtn.textContent='🔍 偷看 ×'+peeksLeft;}
 const instruction=app.querySelector('#sequence-instruction'),stepEl=app.querySelector('#sequence-step');
 function cue(){say(locked?'彥彥，先記住照片的順序，再依照剛剛看到的順序點照片。':'彥彥，照剛剛看到的順序，點下一張照片！')}
 function showRound(){
  if(token!==generation)return;
  const saved=restoredSession;restoredSession=null;
  cancelNarration();hidePeek();game=saved?saved.game:makeSequence(level);step=saved?saved.step:0;replaysLeft=saved?saved.replaysLeft:REPLAYS;peeksLeft=saved?saved.peeksLeft:1;locked=true;replaying=false;peekBtn.hidden=true;
  app.querySelector('#sequence-round').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  stepEl.textContent='👀 記住 '+game.count+' 張';
  instruction.textContent='👀 先記住照片順序！';
  preview.hidden=false;grid.hidden=true;ready.hidden=false;narrate.hidden=false;replay.hidden=true;actions.hidden=true;progress.hidden=true;updateProgress();
  preview.innerHTML=game.order.map((p,i)=>'<div class="sequence-preview-card"><span>'+(i+1)+'</span><img src="'+p.puzzle+'" alt="'+(names[p.id]||p.name)+'"></div>').join('');
  preview.querySelectorAll('img').forEach(im=>im.onerror=()=>{im.onerror=null;im.src='./assets/family-home-puzzle.webp'});
  grid.innerHTML=game.options.map((p,i)=>'<button type="button" class="sequence-card" data-photo="'+p.id+'" aria-label="選擇照片 '+(names[p.id]||p.name)+'"><img src="'+p.puzzle+'" alt="'+(names[p.id]||p.name)+'"><span class="sequence-check" aria-hidden="true">✓</span></button>').join('');
  grid.querySelectorAll('img').forEach(im=>im.onerror=()=>{im.onerror=null;im.src='./assets/family-home-puzzle.webp'});
  for(let i=0;i<step;i++){const b=[...grid.querySelectorAll('.sequence-card')].find(b=>b.dataset.photo===game.order[i].id);if(b){b.disabled=true;b.classList.add('sequence-correct')}}
  saveSession();
  cue();timer=setTimeout(beginRecall,level<=5?5500:4500);
 }
 function beginRecall(){
  if(token!==generation||!locked)return;
  if(timer){clearTimeout(timer);timer=null}
  cancelNarration();locked=false;replaying=false;hidePeek();preview.hidden=true;grid.hidden=false;ready.hidden=true;narrate.hidden=true;peekBtn.hidden=false;replay.hidden=replaysLeft===0;replay.textContent='👩 再看一次 ×'+replaysLeft;actions.hidden=false;progress.hidden=false;updateProgress();
  instruction.textContent='👆 照順序點照片！';stepEl.textContent='👉 第 '+(step+1)+' / '+game.count+' 張';
  say('換你了！請點第'+(step+1)+'張照片。');
 }
 function choose(button){
  if(token!==generation||locked||button.disabled)return;
  audio.unlock();
  const expected=game.order[step];
  if(button.dataset.photo!==expected.id){
   mistakes++;audio.play('wrong');vib(20);button.classList.remove('sequence-wrong');void button.offsetWidth;button.classList.add('sequence-wrong');
   say('再試一次，想想剛剛的順序！');return;
  }
  hidePeek();button.disabled=true;button.classList.add('sequence-correct');audio.play('hit');fx('yay');vib([12,30,12]);
  step++;stepEl.textContent='💗 '+step+' / '+game.count;updateProgress();
  if(step<game.count)saveSession();else{state.familySequenceSession=null;persist()}
  if(step===game.count){
   locked=true;round++;state.familySequenceRound=round;state.familySequenceCheckpointLevel=level;persist();
   if(round>=ROUNDS)timer=setTimeout(win,550);else timer=setTimeout(showRound,850);
  }else say('太棒了！再找下一張。');
 }
 function win(){
  if(token!==generation)return;
  state.familySequenceLevel=Math.max(Number(state.familySequenceLevel)||1,Math.min(MAX,level+1));
  state.familySequenceCheckpointLevel=state.familySequenceLevel;state.familySequenceRound=0;
  state.familySequenceSession=null;
  state.familySequenceWins=(Number(state.familySequenceWins)||0)+1;
  state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  audio.play('win');fx('win');say('太棒了！彥彥記住所有照片的順序了！');
  const overlay=document.createElement('div');overlay.className='overlay sequence-win';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 順序全部答對！</h2><p>🌟 '+ROUNDS+' 回合　💗 '+mistakes+' 次再試試</p><button class="primary" id="sequence-next">▶️ 下一關</button><button class="classic-secondary" id="sequence-again">🔄 再玩一次</button><button class="classic-secondary" id="sequence-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#sequence-next').onclick=()=>start(level>=MAX?1:level+1);
  overlay.querySelector('#sequence-again').onclick=()=>start(level);
  overlay.querySelector('#sequence-menu').onclick=menu;
 }
 peekBtn.onclick=()=>{
   if(token!==generation||locked||!game||step>=game.count||peeksLeft<=0)return;
   audio.unlock();peeksLeft--;const p=game.order[step];hidePeek();
   peekView.innerHTML='<strong>🔍 下一張是</strong><img src="'+p.puzzle+'" alt="'+(names[p.id]||p.name)+'"><span>'+(names[p.id]||p.name)+'</span>';
   const img=peekView.querySelector('img');img.onerror=()=>{img.onerror=null;img.src='./assets/family-home-puzzle.webp'};
   peekView.hidden=false;updateProgress();saveSession();say('下一張是'+(names[p.id]||p.name)+'，請你自己找出來！');
   peekTimer=setTimeout(()=>{if(token===generation)hidePeek()},1800);
  };
  assist.onclick=()=>{if(token!==generation||locked||!game||step>=game.count)return;const card=[...grid.querySelectorAll('.sequence-card')].find(b=>b.dataset.photo===game.order[step].id&&!b.disabled);if(!card)return;choose(card);if(!locked){instruction.textContent='👩 媽媽幫排一張，接著換你！';say('媽媽幫你選好了，換你選下一張！')}};
 undo.onclick=()=>{if(token!==generation||locked||step<=0||!game)return;hidePeek();step--;const last=game.order[step];const card=[...grid.querySelectorAll('.sequence-card')].find(b=>b.dataset.photo===last.id);if(!card){step++;return}card.disabled=false;card.classList.remove('sequence-correct');stepEl.textContent='👉 第 '+(step+1)+' / '+game.count+' 張';instruction.textContent='↶ 已退回一張，再選一次！';updateProgress();saveSession();audio.play('hit');vib(12);say('退回一張了，再試一次！')};
 replay.onclick=()=>{
  if(token!==generation||locked||replaysLeft<=0||step>=game.count)return;
  hidePeek();replaysLeft--;saveSession();locked=true;replaying=true;peekBtn.hidden=true;
  preview.hidden=false;grid.hidden=true;ready.hidden=true;narrate.hidden=false;replay.hidden=true;actions.hidden=true;progress.hidden=true;
  instruction.textContent='👩 再看一次，記住照片順序！';
  stepEl.textContent='👀 還有 '+replaysLeft+' 次';
  say('媽媽再讓你看一次，記住照片順序喔！');
  if(timer){clearTimeout(timer);timer=null}
  timer=setTimeout(beginRecall,2600);
 };
 // v120: tap remains unchanged; a finger sweep can select several cards in order.
 // Only a real drag (>12px) consumes the subsequent synthesized click.
 let swipe=null,ignoreSwipeClickUntil=0;
 function finishSwipe(e){
  if(!swipe||e.pointerId!==swipe.id)return;
  const d=swipe;
  // Pointer capture retargets the browser's click to the grid, so a tap must commit on pointerup.
  // A canceled or lost capture must never count as an answer.
  if(e.type==='pointerup'&&!d.moved&&!locked&&token===generation&&!d.first.disabled)choose(d.first);
  if(d.moved||e.type==='pointerup')ignoreSwipeClickUntil=Date.now()+500;
  swipe=null;grid.classList.remove('sequence-swiping');
 }
 grid.addEventListener('click',e=>{
  if(e.isTrusted&&Date.now()<ignoreSwipeClickUntil&&(e.detail!==0||e.pointerType||e.sourceCapabilities?.firesTouchEvents)){e.preventDefault();e.stopImmediatePropagation()}
 },true);
 grid.addEventListener('pointerdown',e=>{
  const card=e.target.closest('.sequence-card');
  if(!card||locked||token!==generation||e.isPrimary===false||swipe)return;
  swipe={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,first:card,seen:new Set(),moved:false};
  try{grid.setPointerCapture(e.pointerId)}catch(_){}
 });
 grid.addEventListener('pointermove',e=>{
  const d=swipe;if(!d||e.pointerId!==d.id||locked||token!==generation)return;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<12)return;
  if(!d.moved){d.moved=true;grid.classList.add('sequence-swiping');
   if(!d.first.disabled){d.seen.add(d.first);choose(d.first)}
  }
  sampleSwipe(d.lastX,d.lastY,e.clientX,e.clientY,(x,y)=>{
   if(locked)return;
   const hit=document.elementFromPoint(x,y);
   if(!hit||!grid.contains(hit))return;
   const card=hit.closest('.sequence-card');
   if(!card||card.disabled||d.seen.has(card))return;
   d.seen.add(card);choose(card);
  });
  d.lastX=e.clientX;d.lastY=e.clientY;e.preventDefault();
 },{passive:false});
 grid.addEventListener('pointerup',finishSwipe);
 grid.addEventListener('pointercancel',finishSwipe);
 grid.addEventListener('lostpointercapture',finishSwipe);
 grid.addEventListener('click',e=>{const b=e.target.closest('.sequence-card');if(b)choose(b)});
 narrate.onclick=speakSequence;
 ready.onclick=beginRecall;
 app.querySelector('#sequence-back').onclick=menu;
 app.querySelector('#sequence-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#sequence-retry').onclick=()=>start(level);
 app.querySelector('#sequence-speak').onclick=()=>{audio.unlock();cue()};
 showRound();
}
function enhance(){
 const classic=app.querySelector('.classic-menu');
 if(!classic||classic.querySelector('#sequence-entry'))return;
 const b=document.createElement('button');b.id='sequence-entry';b.className='classic-tile sequence-tile';
 b.setAttribute('aria-label','開始照片順序記憶');
 b.innerHTML='<span class="classic-big">🧠📷</span><strong>照片順序記憶</strong><span>👀 → 👆 → ⭐</span><small>⭐ '+(Number(state.familySequenceLevel)||1)+' / '+MAX+'</small>';
 classic.insertBefore(b,classic.querySelector('.classic-audio-controls'));b.onclick=()=>start();
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanPhotoSequence={start,stop,makeSequence,enhance,restoreSession,sampleSwipe};
})();