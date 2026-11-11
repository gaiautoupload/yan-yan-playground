(()=>{
'use strict';
// v393: optional listen-only food challenge; toggle without resetting progress, retain old feeding modes.
// v358: hold the hint button 550ms to highlight ALL remaining correct foods without answering; tap still hints one.
// v357: tap mom to feed one bite; hold 600ms and release to feed the rest of this animal safely.
// v355: one-tap restart of only the current animal's feeding round, even during its completion delay; previous animals and saved stars remain untouched.
// v310: drag an already-fed food back to the bowl to undo that exact bite; cancel and wrong drop do not change progress.
// v263: mobile pointer-capture tap now feeds correctly; tapping a used food returns that exact bite without losing saved progress.
// v262: drag the animal across several foods in one gesture; correct bites count once, wrong foods never score.
// v228: hold the food bowl to undo multiple bites; short tap undoes one; canceled and secondary touches never undo.
// v220: touch-action:none fixes real mobile pointercancel during animal-to-food drag.
// v219: drag animal onto food; incorrect food never scores; tap and hold preserved.
// v187: clear hold-click suppression promptly so the next tap works immediately.
// v186: hold a food for 520ms to hear its name without scoring; tap/swipe/drag still feed.
// v176: horizontal food swipe feeds multiple correct bites; vertical food-to-animal drag remains.
// v168.2: hold state survives round transition until finger release; prevents an extra bite after a long hold.
// v168.1: clear hold indicator on round completion; v168 hold-to-auto-feed.
// v133: toddlers can tap the animal to feed one correct bite, or tap the bowl to undo; original gameplay preserved.
const sh=window.YanClassicShared,a=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!sh||!a)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh,MAX=40,ROUNDS=3;
const FOODS=[{"id":"carrot","icon":"🥕","name":"紅蘿蔔"},{"id":"banana","icon":"🍌","name":"香蕉"},{"id":"honey","icon":"🍯","name":"蜂蜜"},{"id":"bone","icon":"🦴","name":"骨頭"},{"id":"bamboo","icon":"🎋","name":"竹子"},{"id":"acorn","icon":"🌰","name":"橡實"}];
const ANIMALS=[{"icon":"🐰","name":"小兔子","food":0},{"icon":"🐵","name":"小猴子","food":1},{"icon":"🐻","name":"小熊","food":2},{"icon":"🐶","name":"小狗","food":3},{"icon":"🐼","name":"熊貓","food":4},{"icon":"🐿️","name":"松鼠","food":5}];
const seeded=function seeded(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}};
const shuffle=function shuffle(items,rng){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const makeRound=function makeRound(level,round){const rng=seeded(20261027+level*9851+round*1747),animal=ANIMALS[(level*3+round*7)%ANIMALS.length],food=FOODS[animal.food],low=level<=10?1:level<=25?2:3,high=level<=10?3:level<=25?4:5,count=low+Math.floor(rng()*(high-low+1)),others=shuffle(FOODS.filter(f=>f.id!==food.id),rng);const choices=shuffle([...Array.from({length:count},()=>food),others[0],others[1],others[2]],rng);return {animal,food,count,choices,level,round}};
const evaluate=function evaluate(task,selected,index){if(!Number.isInteger(index)||index<0||index>=task.choices.length)return {kind:"invalid",count:selected.length};if(selected.includes(index))return {kind:"repeat",count:selected.length};if(task.choices[index].id!==task.food.id)return {kind:"wrong",count:selected.length};const count=selected.length+1;return {kind:"correct",count,complete:count===task.count}};
const remainingFoodIndices=(task,selected)=>task.choices.flatMap((f,i)=>f.id===task.food.id&&!selected.includes(i)?[i]:[]);
const validSelected=function validSelected(task,items){return Array.isArray(items)&&items.length<=task.count&&new Set(items).size===items.length&&items.every(i=>Number.isInteger(i)&&i>=0&&i<task.choices.length&&task.choices[i].id===task.food.id)};
let generation=0,timers=[],stopActiveBowl=()=>{};
function stop(){stopActiveBowl();generation++;timers.forEach(clearTimeout);timers=[];try{window.speechSynthesis?.cancel()}catch(_){}}
function later(fn,ms,token){const id=setTimeout(()=>{timers=timers.filter(t=>t!==id);if(generation===token)fn()},ms);timers.push(id);return id}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();a.unlock();const token=generation,level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.feedLevel)||1));
 let round=requested===undefined&&Number(state.feedCheckpointLevel)===level?Math.max(0,Math.min(ROUNDS-1,Number(state.feedRound)||0)):0;
 let task=makeRound(level,round),selected=requested===undefined&&Number(state.feedCheckpointLevel)===level&&validSelected(task,state.feedSelected)?state.feedSelected.slice():[];
 let locked=false,finished=false,advanceTimer=null,animalHold=null,suppressAnimalUntil=0,listenOnly=false;
 const photo=photos.length?photos[(level-1)%photos.length]:null;
 app.innerHTML='<section class="screen game classic-screen feed-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="feed-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🐾 動物園餵食</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="feed-speak" aria-label="重播玩法">🔊</button></header>'+
 '<main class="feed-stage allow-scroll"><div class="feed-hero"><img src="./assets/excavator.webp" alt="挖土機"><strong>🚜 彥彥動物園</strong><img id="feed-family" src="'+(photo?photo.scene:'./assets/family-home.webp')+'" alt="媽媽和彥彥"></div>'+
 '<div class="feed-status"><span id="feed-round">🌟 1 / 3</span><span id="feed-progress">🍽️ 0 / 3</span></div>'+
 '<div class="feed-animal-box"><button type="button" id="feed-animal" class="feed-animal" aria-label="點一下餵一口，按住連續餵食，也可以拖著小動物滑過多個食物餵食">🐰</button><div class="feed-speech" id="feed-speech">🥕 × 3</div><button type="button" class="feed-bowl" id="feed-bowl" aria-label="點餐盤收回一口，按住可連續收回" aria-live="polite">🍽️</button></div>'+
 '<div class="feed-message" id="feed-message" aria-live="polite">👆 點食物餵食；已餵的食物可拖回餐盤收回！</div>'+
 '<div class="feed-choices" id="feed-choices" role="group" aria-label="點食物或左右滑過正確食物連續餵食"></div>'+
 '<div class="feed-actions"><button id="feed-listen" type="button" aria-pressed="false" aria-label="開啟聽聲挑戰，隱藏正確食物圖案但保留語音題目">👂 聽聲挑戰</button><button id="feed-hint" type="button" aria-label="點一下提示一個正確食物，按住五百五十毫秒顯示全部剩下的正確食物">💡 點找一個／按住看全部</button><button id="feed-help" type="button" aria-label="點一下幫餵一口，按住六百毫秒後放開餵完這隻動物">👩 點一口／按住餵完</button><button id="feed-undo" type="button" aria-label="收回上一口食物" disabled>↶ 收回一口</button><button id="feed-reset-round" type="button" aria-label="只重來目前這隻動物，不清除之前回合">🔄 這隻重來</button><button id="feed-replay" type="button">🔊 聽媽媽說</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="feed-home">⌂ 首頁</button><button class="footbtn yellow" id="feed-retry">🔄 重玩</button></footer></section>';
 const family=app.querySelector('#feed-family');family.onerror=()=>{family.onerror=null;family.src='./assets/family-home.webp'};
 const choices=app.querySelector('#feed-choices'),message=app.querySelector('#feed-message');
 const dropZone=app.querySelector('.feed-animal-box');
 let drag=null,suppressClickIndex=-1,suppressSwipeUntil=0;
 function insideAnimal(x,y){const r=dropZone.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
 function insideBowl(x,y){const r=app.querySelector('#feed-bowl').getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
 function clearDrag(){if(!drag)return;if(drag.holdTimer!==null){clearTimeout(drag.holdTimer);timers=timers.filter(t=>t!==drag.holdTimer)}drag.holdButton?.classList.remove('feed-inspecting');drag.ghost?.remove();dropZone.classList.remove('feed-drop-ready');choices.classList.remove('feed-swiping');app.querySelector('#feed-bowl')?.classList.remove('feed-return-ready');drag=null}
 function choose(index,b){
  if(locked||generation!==token)return;
  a.unlock();const r=evaluate(task,selected,index);
  if(r.kind==='wrong'){a.play('wrong');vib(12);message.textContent=listenOnly?'💗 再聽一次題目，找對食物！':'💗 再看看！找 '+task.food.icon+'！';b?.classList.add('feed-wrong');later(()=>b?.classList.remove('feed-wrong'),450,token);return}
  if(r.kind!=='correct')return;
  selected.push(index);save();paint();a.play('hit');vib(9);message.textContent='⭐ '+selected.length+' 個！'+(r.complete?'吃飽囉！':listenOnly?'繼續聽聲音找食物！':'再找 '+task.food.icon+'！');
  if(r.complete)roundComplete();
 }
 function feedNext(){
  if(locked||finished||generation!==token)return;
  const i=task.choices.findIndex((f,i)=>f.id===task.food.id&&!selected.includes(i));
  if(i<0)return;
  const b=choices.querySelector('[data-feed="'+i+'"]');
  if(b&&!b.disabled)choose(i,b);
 }
 function dragEnd(e,commit){
  if(!drag||drag.pointerId!==e.pointerId)return;
  const d=drag;if(d.inspect){suppressClickIndex=d.index;clearDrag();later(()=>{if(suppressClickIndex===d.index)suppressClickIndex=-1},120,token);return}
  if(d.returning){
   const undo=commit&&(d.moved?insideBowl(e.clientX,e.clientY):true);
   if(d.moved||undo)suppressClickIndex=d.index;
   clearDrag();
   if(undo)undoFeed(d.index);
   else if(commit&&d.moved)message.textContent='↶ 把已餵的食物拖回餐盤，才能收回這一口！';
   later(()=>{if(suppressClickIndex===d.index)suppressClickIndex=-1},0,token);
   return;
  }
  const valid=commit&&d.moved&&!d.swipe&&insideAnimal(e.clientX,e.clientY),tapped=commit&&!d.moved;
  if(d.moved||tapped){suppressClickIndex=d.index;if(d.swipe)suppressSwipeUntil=Date.now()+550}
  clearDrag();
  if(tapped){choose(d.index,choices.querySelector('[data-feed="'+d.index+'"]'));later(()=>{if(suppressClickIndex===d.index)suppressClickIndex=-1},0,token)}
  else if(valid)choose(d.index,choices.querySelector('[data-feed="'+d.index+'"]'));
  else if(commit&&d.moved&&!d.swipe)message.textContent='🐾 把食物拖到小動物身上！';
 }
 choices.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-feed]');if(!b||drag||locked||b.disabled||!e.isPrimary||e.button>0)return;
  suppressClickIndex=-1;
  drag={pointerId:e.pointerId,index:Number(b.dataset.feed),returning:selected.includes(Number(b.dataset.feed)),x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,swipe:false,seen:new Set(),ghost:null,icon:task.choices[Number(b.dataset.feed)].icon,inspect:false,holdTimer:null,holdButton:b};
  a.unlock();const held=drag;held.holdTimer=later(()=>{held.holdTimer=null;if(drag!==held||held.moved||locked||generation!==token)return;held.inspect=true;held.holdButton.classList.add('feed-inspecting');suppressClickIndex=held.index;message.textContent='🔊 '+task.choices[held.index].icon+' '+task.choices[held.index].name+'！放開再選食物';say('這是'+task.choices[held.index].name);vib(12)},520,token);
  try{choices.setPointerCapture(e.pointerId)}catch(_){}
 });
 choices.addEventListener('pointermove',e=>{
  if(!drag||drag.pointerId!==e.pointerId||locked)return;
  const d=drag,dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(d.inspect)return;
  if(Math.hypot(dx,dy)>10&&d.holdTimer!==null){clearTimeout(d.holdTimer);timers=timers.filter(t=>t!==d.holdTimer);d.holdTimer=null}
  if(!d.moved){
   if(Math.abs(dx)>Math.abs(dy)*1.3&&Math.abs(dx)>=12&&Math.abs(dx)<18)return;
   if(Math.hypot(dx,dy)<12)return;
   d.moved=true;
   if(!d.returning&&Math.abs(dx)>=18&&Math.abs(dx)>Math.abs(dy)*1.3){
    d.swipe=true;choices.classList.add('feed-swiping');
    d.seen.add(d.index);choose(d.index,choices.querySelector('[data-feed="'+d.index+'"]'));
   }else{
    d.ghost=document.createElement('div');d.ghost.className='feed-drag-ghost';d.ghost.textContent=d.icon;
    app.querySelector('.feed-screen').appendChild(d.ghost);
   }
  }
  if(d.swipe){
   const steps=Math.min(40,Math.max(1,Math.ceil(Math.hypot(e.clientX-d.lastX,e.clientY-d.lastY)/8)));
   for(let step=1;step<=steps&&!locked;step++){
    const x=d.lastX+(e.clientX-d.lastX)*step/steps,y=d.lastY+(e.clientY-d.lastY)*step/steps;
    const b=document.elementFromPoint?.(x,y)?.closest?.('[data-feed]');
    if(!b||!choices.contains(b)||b.disabled)continue;
    const index=Number(b.dataset.feed);
    if(d.seen.has(index))continue;
    d.seen.add(index);choose(index,b);
   }
  }else{
   d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
   if(d.returning){app.querySelector('#feed-bowl')?.classList.toggle('feed-return-ready',insideBowl(e.clientX,e.clientY));dropZone.classList.remove('feed-drop-ready')}
   else dropZone.classList.toggle('feed-drop-ready',insideAnimal(e.clientX,e.clientY));
  }
  d.lastX=e.clientX;d.lastY=e.clientY;
 });
 choices.addEventListener('pointerup',e=>dragEnd(e,true));
 choices.addEventListener('pointercancel',e=>dragEnd(e,false));
 choices.addEventListener('lostpointercapture',e=>dragEnd(e,false));
 function save(){state.feedCheckpointLevel=level;state.feedRound=round;state.feedSelected=selected.slice();persist()}
 function undoFeed(index){if(finished||generation!==token||!selected.length)return;const position=Number.isInteger(index)?selected.indexOf(index):selected.length-1;if(position<0)return;clearDrag();if(advanceTimer!==null){clearTimeout(advanceTimer);timers=timers.filter(t=>t!==advanceTimer);advanceTimer=null;}locked=false;selected.splice(position,1);save();paint();message.textContent=listenOnly?'↶ 收回這一口！再聽一次題目！':'↶ 收回這一口！再餵 '+task.food.icon+'！';a.play('hit');vib(8)}
 function resetCurrentRound(){
  if(finished||generation!==token)return;
  if(advanceTimer!==null){clearTimeout(advanceTimer);timers=timers.filter(t=>t!==advanceTimer);advanceTimer=null}
  clearDrag();locked=false;selected=[];save();paint();
  message.textContent='🔄 這隻重新餵，前面完成的動物保留！';
  a.play('hit');vib(8);say('再試一次！找'+task.count+'個'+task.food.name+'！');
 }
 function cue(){say('彥彥，'+task.animal.name+'肚子餓了！找'+task.count+'個'+task.food.name+'！點媽媽幫餵一口，按住六百毫秒再放開可以餵完這隻動物。點食物餵食，按住食物可以聽名字，左右滑過可以連續餵食，也可以按住小動物連續餵食，或拖著小動物滑過多個正確食物！點已餵的食物可收回那一口，點餐盤收回最後一口，按住餐盤可以連續收回！')}
 function paint(){
  app.querySelector('#feed-round').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  app.querySelector('#feed-progress').textContent='🍽️ '+selected.length+' / '+task.count;
  app.querySelector('#feed-animal').textContent=task.animal.icon;
  app.querySelector('#feed-speech').textContent=listenOnly?'👂 × '+task.count:task.food.icon+' × '+task.count;
  app.querySelector('#feed-bowl').textContent=listenOnly?'🍽️ '+selected.length+' / '+task.count:'🍽️ '+Array.from({length:selected.length},()=>task.food.icon).join(' ');
  choices.innerHTML=task.choices.map((f,i)=>'<button type="button" class="feed-food '+(selected.includes(i)?'feed-used':'')+'" data-feed="'+i+'" aria-label="'+(selected.includes(i)?'收回 '+f.name:f.name)+'" aria-pressed="'+selected.includes(i)+'" '+(locked?'disabled':'')+'><span>'+f.icon+'</span></button>').join('');
  const listenButton=app.querySelector('#feed-listen');listenButton.setAttribute('aria-pressed',String(listenOnly));listenButton.textContent=listenOnly?'👀 看圖找':'👂 聽聲挑戰';
  app.querySelector('#feed-undo').disabled=finished||selected.length===0;
  app.querySelector('#feed-reset-round').disabled=finished;
  app.querySelector('#feed-bowl').disabled=finished||selected.length===0;
  app.querySelector('#feed-animal').disabled=locked||finished||selected.length>=task.count;
  app.querySelector('#feed-help').disabled=locked||finished||selected.length>=task.count;
 }
 function begin(){if(generation!==token)return;app.querySelector('#feed-animal')?.classList.remove('feed-holding');advanceTimer=null;clearDrag();task=makeRound(level,round);selected=[];locked=false;message.textContent=listenOnly?'👂 聽媽媽說，找 '+task.count+' 個食物！':'👆 點 '+task.count+' 個 '+task.food.icon+'！';save();paint();cue()}
 function finish(){
  if(finished||generation!==token)return;animalHold=null;app.querySelector('#feed-animal')?.classList.remove('feed-holding');clearDrag();finished=true;locked=true;app.querySelector('#feed-undo').disabled=true;
  state.feedLevel=Math.max(Number(state.feedLevel)||1,Math.min(MAX,level+1));
  state.feedCheckpointLevel=state.feedLevel;state.feedRound=0;state.feedSelected=[];
  state.feedWins=(Number(state.feedWins)||0)+1;state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  a.play('win');fx('win');vib([18,25,18]);say('太棒了！彥彥餵飽三隻小動物！');
  const ov=document.createElement('div');ov.className='overlay';ov.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 動物吃飽了！</h2><p>🐾 彥彥完成三次餵食！</p><button class="primary" id="feed-next">▶️ 下一關</button><button class="classic-secondary" id="feed-again">🔄 再玩一次</button><button class="classic-secondary" id="feed-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(ov);
  ov.querySelector('#feed-next').onclick=()=>start(level>=MAX?1:level+1);
  ov.querySelector('#feed-again').onclick=()=>start(level);
  ov.querySelector('#feed-menu').onclick=menu;
 }
 function roundComplete(){
  if(locked||generation!==token)return;app.querySelector('#feed-animal')?.classList.remove('feed-holding');locked=true;paint();message.textContent='🎉 '+task.animal.icon+' 吃飽了！';
  a.play('win');fx('yay');vib([12,20,12]);say(task.animal.name+'吃飽了，謝謝彥彥！');
  advanceTimer=later(()=>{advanceTimer=null;if(round===ROUNDS-1)finish();else{round++;begin()}},1050,token);
 }
 choices.addEventListener('click',e=>{
  const b=e.target.closest('[data-feed]');if(!b||locked||generation!==token)return;
  const index=Number(b.dataset.feed);
  if(e.detail>0&&Date.now()<suppressSwipeUntil)return;
  if(e.detail>0&&suppressClickIndex===index){suppressClickIndex=-1;return}
  if(selected.includes(index)){undoFeed(index);return}
  choose(index,b);
 });
 app.querySelector('#feed-undo').onclick=undoFeed;
 app.querySelector('#feed-reset-round').onclick=resetCurrentRound;
 app.querySelector('#feed-listen').onclick=()=>{if(finished||generation!==token)return;listenOnly=!listenOnly;paint();message.textContent=listenOnly?'👂 挑戰開始！聽媽媽說，再找對食物！':'👀 圖案提示回來了！';a.unlock();a.play('pop');vib(8);cue()};

 const bowl=app.querySelector('#feed-bowl');
 let bowlPointer=null,bowlTimer=null,bowlRepeat=null,suppressBowlUntil=0;
 function stopBowl(){
  if(bowlTimer!==null){clearTimeout(bowlTimer);bowlTimer=null}
  if(bowlRepeat!==null){clearInterval(bowlRepeat);bowlRepeat=null}
  bowlPointer=null;bowl.classList.remove('feed-bowl-holding');
 }
 stopActiveBowl=stopBowl;
 bowl.addEventListener('pointerdown',e=>{
  if(finished||!selected.length||bowlPointer!==null||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  bowlPointer=e.pointerId;
  try{bowl.setPointerCapture?.(e.pointerId)}catch(_){}
  bowlTimer=setTimeout(()=>{
   bowlTimer=null;
   if(bowlPointer!==e.pointerId||generation!==token||finished)return;
   bowl.classList.add('feed-bowl-holding');
   undoFeed();
   if(bowlPointer!==e.pointerId||!selected.length)return;
   bowlRepeat=setInterval(()=>{
    if(bowlPointer===null||generation!==token||finished||!selected.length){stopBowl();return}
    undoFeed();
   },280);
  },420);
 });
 bowl.addEventListener('pointerup',e=>{
  if(bowlPointer!==e.pointerId)return;
  const held=bowlTimer===null;
  stopBowl();suppressBowlUntil=Date.now()+550;
  if(!held)undoFeed();
 });
 bowl.addEventListener('pointercancel',e=>{if(bowlPointer===e.pointerId){stopBowl();suppressBowlUntil=Date.now()+550}});
 bowl.addEventListener('lostpointercapture',e=>{if(bowlPointer===e.pointerId){stopBowl();suppressBowlUntil=Date.now()+550}});
 bowl.addEventListener('click',e=>{
  if(e.detail>0&&Date.now()<suppressBowlUntil)return;
  undoFeed();
 });
 const helpButton=app.querySelector('#feed-help');
 let helpTouch=null,suppressHelpUntil=0;
 function feedRemaining(){
  if(locked||finished||generation!==token)return;
  a.unlock();
  let fed=0;
  while(!locked&&selected.length<task.count&&fed<task.count){
   const before=selected.length;feedNext();
   if(selected.length===before)break;
   fed++;
  }
  if(fed&&!locked)message.textContent='👩 媽媽幫忙餵了 '+fed+' 口！';
 }
 function endHelp(e,canceled){
  const h=helpTouch;if(!h||h.id!==e.pointerId)return;
  helpTouch=null;clearTimeout(h.timer);helpButton.classList.remove('feed-help-armed');
  if(!h.armed)return;
  suppressHelpUntil=Date.now()+850;
  if(canceled||locked||finished||generation!==token)return;
  const r=helpButton.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
  feedRemaining();
  e.preventDefault?.();
 }
 helpButton.addEventListener('pointerdown',e=>{
  if(locked||finished||helpTouch||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  const h={id:e.pointerId,x:e.clientX,y:e.clientY,armed:false,timer:null};
  helpTouch=h;
  h.timer=later(()=>{
   if(helpTouch!==h||locked||finished||generation!==token)return;
   h.armed=true;helpButton.classList.add('feed-help-armed');
   message.textContent='👩 放開手指，媽媽就幫這隻動物餵完！';vib(10);
  },600,token);
  try{helpButton.setPointerCapture?.(e.pointerId)}catch(_){}
 });
 helpButton.addEventListener('pointermove',e=>{
  const h=helpTouch;if(!h||h.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-h.x,e.clientY-h.y)<=18)return;
  helpTouch=null;clearTimeout(h.timer);helpButton.classList.remove('feed-help-armed');
  suppressHelpUntil=Date.now()+850;
  message.textContent='✋ 已取消長按，餵食進度不變！';
 });
 helpButton.addEventListener('pointerup',e=>endHelp(e,false));
 for(const kind of ['pointercancel','lostpointercapture'])helpButton.addEventListener(kind,e=>endHelp(e,true));
 helpButton.addEventListener('click',e=>{
  if(e.detail>0&&Date.now()<suppressHelpUntil)return;
  feedNext();
 });
 const animalBtn=app.querySelector('#feed-animal');
 function animalTarget(x,y){
  const b=document.elementFromPoint?.(x,y)?.closest?.('[data-feed]');
  return b&&choices.contains(b)&&!b.disabled?b:null;
 }
 function releaseAnimal(e,commit){
  if(!animalHold||animalHold.pointerId!==e.pointerId)return;
  const hold=animalHold,wasLong=hold.long,wasDrag=hold.moved;
  animalHold=null;animalBtn.classList.remove('feed-holding','feed-animal-dragging');
  choices.querySelectorAll('.feed-animal-target').forEach(b=>b.classList.remove('feed-animal-target'));
  if(wasDrag&&commit&&!locked){
   const b=animalTarget(e.clientX,e.clientY);
   if(b&&!hold.seen.has(Number(b.dataset.feed))){hold.seen.add(Number(b.dataset.feed));choose(Number(b.dataset.feed),b)}
   else if(!b&&hold.seen.size===0)message.textContent='🐾 把小動物滑過食物就能餵食！';
  }
  if(wasLong||wasDrag){suppressAnimalUntil=Date.now()+450;if(e.cancelable)e.preventDefault()}
 }
 animalBtn.addEventListener('pointerdown',e=>{
  if(locked||finished||animalHold||!e.isPrimary||e.button>0)return;
  const hold={pointerId:e.pointerId,long:false,moved:false,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,seen:new Set()};animalHold=hold;
  try{animalBtn.setPointerCapture(e.pointerId)}catch(_){}
  function pulse(){
   if(animalHold!==hold||hold.moved||locked||finished||generation!==token)return;
   hold.long=true;animalBtn.classList.add('feed-holding');feedNext();
   if(!locked&&animalHold===hold)later(pulse,380,token);
  }
  later(pulse,420,token);
 });
 animalBtn.addEventListener('pointermove',e=>{
  if(!animalHold||animalHold.pointerId!==e.pointerId||animalHold.long||locked)return;
  const hold=animalHold;
  if(!hold.moved&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)<12)return;
  hold.moved=true;animalBtn.classList.add('feed-animal-dragging');
  const steps=Math.min(64,Math.max(1,Math.ceil(Math.hypot(e.clientX-hold.lastX,e.clientY-hold.lastY)/8)));
  for(let step=1;step<=steps&&!locked;step++){
   const x=hold.lastX+(e.clientX-hold.lastX)*step/steps,y=hold.lastY+(e.clientY-hold.lastY)*step/steps;
   const b=animalTarget(x,y);if(!b)continue;
   const index=Number(b.dataset.feed);if(hold.seen.has(index))continue;
   hold.seen.add(index);choose(index,b);
  }
  hold.lastX=e.clientX;hold.lastY=e.clientY;
  choices.querySelectorAll('.feed-animal-target').forEach(b=>b.classList.remove('feed-animal-target'));
  if(!locked)animalTarget(e.clientX,e.clientY)?.classList.add('feed-animal-target');
 });
 animalBtn.addEventListener('pointerup',e=>releaseAnimal(e,true));
 animalBtn.addEventListener('pointercancel',e=>releaseAnimal(e,false));
 animalBtn.addEventListener('lostpointercapture',e=>releaseAnimal(e,false));
 animalBtn.onclick=e=>{
  if(e.detail>0&&Date.now()<suppressAnimalUntil){e.preventDefault();return}
  feedNext();
 };
 const hintButton=app.querySelector('#feed-hint');
 let hintPointer=null,suppressHintUntil=0;
 function showFoodHints(all){
  if(locked||finished||generation!==token)return;
  const remaining=remainingFoodIndices(task,selected);
  if(!remaining.length)return;
  const indexes=all?remaining:remaining.slice(0,1);
  indexes.forEach(i=>{
   const b=choices.querySelector('[data-feed="'+i+'"]');
   if(!b)return;
   b.classList.add('feed-hinted');
   later(()=>b.classList.remove('feed-hinted'),all?2300:1700,token);
  });
  message.textContent=all?'💡 還有 '+remaining.length+' 個 '+task.food.icon+'！一起數一數！':'💡 發光的是 '+task.food.icon+'！';
  say(all?'還有'+remaining.length+'個'+task.food.name+'，一起找找看！':'看！這是'+task.food.name+'！');
  vib(8);
 }
 function endHint(e,canceled){
  const h=hintPointer;if(!h||h.id!==e.pointerId)return;
  hintPointer=null;clearTimeout(h.timer);
  hintButton.classList.remove('feed-hint-holding');
  if(h.held||h.canceled||canceled){suppressHintUntil=Date.now()+700;e.preventDefault?.()}
 }
 hintButton.addEventListener('pointerdown',e=>{
  if(locked||finished||hintPointer||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  const h={id:e.pointerId,x:e.clientX,y:e.clientY,held:false,canceled:false,timer:null};
  hintPointer=h;
  h.timer=later(()=>{
   if(hintPointer!==h||locked||finished||generation!==token)return;
   h.held=true;hintButton.classList.add('feed-hint-holding');
   showFoodHints(true);
  },550,token);
  try{hintButton.setPointerCapture?.(e.pointerId)}catch(_){}
 });
 hintButton.addEventListener('pointermove',e=>{
  const h=hintPointer;if(!h||h.id!==e.pointerId||h.held)return;
  if(Math.hypot(e.clientX-h.x,e.clientY-h.y)>18){
   h.canceled=true;clearTimeout(h.timer);hintButton.classList.remove('feed-hint-holding');
  }
 });
 hintButton.addEventListener('pointerup',e=>endHint(e,false));
 for(const kind of ['pointercancel','lostpointercapture'])hintButton.addEventListener(kind,e=>endHint(e,true));
 hintButton.onclick=e=>{
  if(e.detail>0&&Date.now()<suppressHintUntil)return;
  showFoodHints(false);
 };
 app.querySelector('#feed-back').onclick=menu;
 app.querySelector('#feed-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#feed-retry').onclick=()=>start(level);
 app.querySelector('#feed-speak').onclick=()=>{a.unlock();cue()};
 app.querySelector('#feed-replay').onclick=()=>{a.unlock();cue()};
 save();paint();if(selected.length===task.count)later(roundComplete,400,token);else cue();
}
function enhance(){
 const m=app.querySelector('.classic-menu');if(!m||m.querySelector('#feed-entry'))return;
 const b=document.createElement('button');b.id='feed-entry';b.className='classic-tile feed-tile';b.setAttribute('aria-label','開始動物園數數餵食');
 b.innerHTML='<span class="classic-big">🐰🥕</span><strong>動物園餵食</strong><span>🐵 🍌 🐼</span><small>⭐ '+(Number(state.feedLevel)||1)+' / '+MAX+'</small>';
 m.insertBefore(b,m.querySelector('.classic-audio-controls'));b.onclick=()=>start();
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanFeedGame={start,stop,makeRound,evaluate,validSelected,remainingFoodIndices,enhance};
})();