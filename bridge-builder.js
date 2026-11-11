(()=>{
'use strict';
// v276: tap the excavator itself to drive after completing the bridge, with keyboard and drag-safe controls.
// v274: tap a completed plank to rewind to it; tap the finish flag to drive. Existing drag, stars, and checkpoints remain.
// v175: completed bridge supports dragging the excavator to the finish; original drive button remains.
// v129: drag a colored bridge plank onto the glowing empty slot; original tap, undo, three rounds, stars and progress preserved.
const sh=window.YanClassicShared,a=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!sh||!a)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh,MAX=40,ROUNDS=3;
const COLORS=[
 {id:'red',name:'紅色',dot:'🔴',color:'#f87576'},
 {id:'orange',name:'橘色',dot:'🟠',color:'#ffb65c'},
 {id:'yellow',name:'黃色',dot:'🟡',color:'#f5d94b'},
 {id:'green',name:'綠色',dot:'🟢',color:'#75d78c'},
 {id:'blue',name:'藍色',dot:'🔵',color:'#7fbafa'},
 {id:'purple',name:'紫色',dot:'🟣',color:'#b69af7'}
];
function seeded(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function shuffle(items,rng){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeRound(level,round){
 const count=level<=10?3:level<=25?4:5,rng=seeded(20261027+level*10007+round*1223);
 const goal=shuffle(COLORS,rng).slice(0,count);
 return {count,goal,choices:shuffle(goal,rng),level,round};
}
function evaluate(task,placed,id){
 const expected=task.goal[placed.length];
 if(!expected)return {correct:false,next:placed.length,complete:true};
 const correct=expected.id===id,next=placed.length+(correct?1:0);
 return {correct,next,complete:correct&&next===task.goal.length,expected:expected.id};
}
function validPrefix(task,items){return Array.isArray(items)&&items.length<=task.count&&items.every((id,i)=>task.goal[i].id===id)}
let generation=0,timers=[];
function stop(){generation++;timers.forEach(clearTimeout);timers=[];try{window.speechSynthesis?.cancel()}catch(_){}}
function later(fn,ms,token){const t=setTimeout(()=>{timers=timers.filter(x=>x!==t);if(token===generation)fn()},ms);timers.push(t)}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();a.unlock();
 const token=generation,level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.bridgeLevel)||1));
 let round=requested===undefined&&Number(state.bridgeCheckpointLevel)===level?Math.max(0,Math.min(ROUNDS-1,Number(state.bridgeRound)||0)):0;
 let task=makeRound(level,round),placed=requested===undefined&&Number(state.bridgeCheckpointLevel)===level&&validPrefix(task,state.bridgePlaced)?state.bridgePlaced.slice():[];
 let locked=false,finished=false;
 const photo=photos.length?photos[(level-1)%photos.length]:null;
 app.innerHTML='<section class="screen game classic-screen bridge-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="bridge-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🌉 挖土機造橋</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="bridge-speak" aria-label="重播玩法">🔊</button></header>'+
 '<main class="bridge-stage allow-scroll"><div class="bridge-hero"><img src="./assets/excavator.webp" alt="挖土機"><strong>🚜 幫挖土機蓋彩虹橋！</strong><img id="bridge-family" src="'+(photo?photo.scene:'./assets/family-home.webp')+'" alt="媽媽和彥彥"></div>'+
 '<div class="bridge-info"><span id="bridge-round">🌟 1 / 3</span><span id="bridge-count">🪵 0 / 3</span></div>'+
 '<div class="bridge-landscape"><div class="bridge-sky">☁️　🌞　☁️</div><div class="bridge-water">🌊　🐟　🌊　🐠　🌊</div><div class="bridge-vehicle" id="bridge-vehicle" role="button" tabindex="0" aria-disabled="true" aria-label="橋蓋好後點挖土機開車，或拖曳到終點"><img src="./assets/excavator.webp" alt="準備過橋的挖土機"></div><div class="bridge-slots" id="bridge-slots" aria-label="等待鋪好的橋"></div><button type="button" class="bridge-finish" id="bridge-finish" aria-label="點旗子讓挖土機過橋" disabled>🏁</button></div>'+
 '<div class="bridge-message" id="bridge-message" aria-live="polite">👆 點橋板，或拖到發亮的空格！</div>'+
 '<div class="bridge-choices" id="bridge-choices" role="group" aria-label="選擇彩色橋板"></div>'+
 '<div class="bridge-actions"><button type="button" id="bridge-undo" aria-label="退回上一塊橋板">↶ 退一塊</button><button type="button" id="bridge-hint">💡 看提示</button><button type="button" id="bridge-help" aria-label="媽媽幫忙鋪下一塊橋板">👩 幫鋪一塊</button><button type="button" id="bridge-drive" disabled>🚜 開車過橋！</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="bridge-home">⌂ 首頁</button><button class="footbtn yellow" id="bridge-retry">🔄 重玩</button></footer></section>';
 const family=app.querySelector('#bridge-family');family.onerror=()=>{family.onerror=null;family.src='./assets/family-home.webp'};
 const finishFlag=app.querySelector('#bridge-finish'),slots=app.querySelector('#bridge-slots'),choices=app.querySelector('#bridge-choices'),message=app.querySelector('#bridge-message'),drive=app.querySelector('#bridge-drive'),vehicle=app.querySelector('#bridge-vehicle');
 let drag=null,suppressClick=null,carGesture=null,suppressVehicleClickUntil=0;
 function currentSlotAt(x,y){const slot=slots.querySelector('.bridge-current');if(!slot)return false;const r=slot.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
 function clearDrag(){if(!drag)return;drag.ghost?.remove();slots.classList.remove('bridge-drop-ready');drag=null}
 function placePlank(id,b){
  if(locked||finished||token!==generation)return;
  a.unlock();const result=evaluate(task,placed,id);
  if(!result.correct){a.play('wrong');vib(12);message.textContent='💗 再看看橋上的顏色！';b?.classList.add('bridge-wrong');later(()=>b?.classList.remove('bridge-wrong'),450,token);return}
  placed.push(id);save();paint();a.play('hit');fx('yay');vib(9);
  message.textContent=result.complete?'🎉 橋蓋好了！點挖土機、拖到旗子，或按開車！':'⭐ 好棒！繼續選下一塊橋板！';
  if(result.complete)say('橋蓋好了！可以把挖土機往右拖到旗子，或按開車過橋！');
 }
 function endDrag(e,commit){
  if(!drag||e.pointerId!==drag.pointerId)return;
  const d=drag,moved=d.moved,onSlot=commit&&moved&&currentSlotAt(e.clientX,e.clientY);
  if(moved)suppressClick={id:d.id,until:Date.now()+900};
  clearDrag();
  if(onSlot)placePlank(d.id,d.button);
  else if(commit&&moved)message.textContent='🌉 把彩色橋板放到發亮的空格！';
 }
 choices.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-bridge]');if(!b||b.disabled||drag||locked||!e.isPrimary)return;
  suppressClick=null;drag={pointerId:e.pointerId,id:b.dataset.bridge,button:b,x:e.clientX,y:e.clientY,moved:false,ghost:null};
  try{b.setPointerCapture(e.pointerId)}catch(_){}
 });
 choices.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  const d=drag;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<12)return;
  if(!d.moved){d.moved=true;d.ghost=document.createElement('div');d.ghost.className='bridge-drag-ghost';d.ghost.textContent=COLORS.find(c=>c.id===d.id)?.dot||'🪵';app.querySelector('.bridge-screen').appendChild(d.ghost)}
  d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
  slots.classList.toggle('bridge-drop-ready',currentSlotAt(e.clientX,e.clientY));
 });
 choices.addEventListener('pointerup',e=>endDrag(e,true));
 choices.addEventListener('pointercancel',e=>endDrag(e,false));
 choices.addEventListener('lostpointercapture',e=>endDrag(e,false));

 // v175: a real one-finger excavator drive, only after the bridge is completed.
 function resetCarGesture(){
  const g=carGesture;carGesture=null;
  vehicle.classList.add('bridge-car-dragging');vehicle.style.left='';void vehicle.offsetWidth;vehicle.classList.remove('bridge-car-dragging');
  if(g){try{if(vehicle.hasPointerCapture?.(g.id))vehicle.releasePointerCapture(g.id)}catch(_){}}
 }
 vehicle.addEventListener('pointerdown',e=>{
  if(carGesture||locked||finished||token!==generation||placed.length!==task.count||e.isPrimary===false||e.pointerType==='mouse'&&e.button!==0)return;
  carGesture={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  try{vehicle.setPointerCapture(e.pointerId)}catch(_){}
  e.preventDefault?.();
 });
 vehicle.addEventListener('pointermove',e=>{
  const g=carGesture;if(!g||e.pointerId!==g.id||locked||token!==generation)return;
  const dx=Math.max(0,e.clientX-g.x);
  if(!g.moved&&dx<12)return;
  g.moved=true;
  const width=Math.max(1,app.querySelector('.bridge-landscape').getBoundingClientRect().width);
  vehicle.classList.add('bridge-car-dragging');
  vehicle.style.left=Math.min(78,dx/width*100)+'%';
  message.textContent='🚜 往右開！把挖土機送到終點旗子！';
  e.preventDefault?.();
 });
 function endCarGesture(e,canceled){
  const g=carGesture;if(!g||e.pointerId!==g.id)return;
  const width=Math.max(1,app.querySelector('.bridge-landscape').getBoundingClientRect().width);
  const crossed=!canceled&&g.moved&&e.clientX-g.x>=width*.52;
  const tapped=!canceled&&!g.moved&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<12;
  if(canceled||g.moved)suppressVehicleClickUntil=Date.now()+700;
  resetCarGesture();
  if(crossed||tapped){drive.click();return}
  if(g.moved&&!canceled)message.textContent='🚜 再往右拖遠一點，到旗子就能過橋！';
 }
 vehicle.addEventListener('pointerup',e=>endCarGesture(e,false));
 vehicle.addEventListener('pointercancel',e=>endCarGesture(e,true));
 vehicle.addEventListener('lostpointercapture',e=>endCarGesture(e,true));
 // Click/keyboard fallback; the locked guard on drive prevents duplicate scoring after pointerup.
 vehicle.addEventListener('click',e=>{if(Date.now()<suppressVehicleClickUntil&&(e.detail!==0||e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents))return;if(!locked&&!finished&&placed.length===task.count)drive.click()});
 vehicle.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;if(locked||finished||placed.length!==task.count)return;e.preventDefault();drive.click()});
 function save(){state.bridgeCheckpointLevel=level;state.bridgeRound=round;state.bridgePlaced=placed.slice();persist()}
 function cue(){say('彥彥，幫挖土機造橋！看橋上的顏色，點下面一樣顏色的木板。橋蓋好了，再按開車過橋！')}
 function paint(){
  app.querySelector('#bridge-round').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  app.querySelector('#bridge-count').textContent='🪵 '+placed.length+' / '+task.count;
  slots.style.setProperty('--bridge-cols',task.count);
  slots.innerHTML=task.goal.map((p,i)=>'<div class="bridge-slot '+(i<placed.length?'bridge-built':i===placed.length?'bridge-current':'bridge-wait')+'" style="--plank-color:'+p.color+'"'+(i<placed.length?' data-bridge-undo-index="'+i+'" role="button" tabindex="0" title="從這塊重新蓋"':'')+' aria-label="'+p.name+(i<placed.length?'已鋪好，點一下可從這塊重新蓋':'待鋪')+'"><span>'+p.dot+'</span>'+(i<placed.length?'<small aria-hidden="true">↶</small>':'')+'</div>').join('');
  choices.innerHTML=task.choices.map(p=>'<button type="button" class="bridge-choice" data-bridge="'+p.id+'" style="--plank-color:'+p.color+'" aria-label="'+p.name+'橋板" '+(placed.includes(p.id)||locked?'disabled':'')+'><span>'+p.dot+'</span><small>'+p.name+'</small></button>').join('');
  drive.disabled=locked||placed.length!==task.count;
  finishFlag.disabled=drive.disabled;
  vehicle.classList.toggle('bridge-car-ready',!locked&&!finished&&placed.length===task.count);
  vehicle.setAttribute('aria-disabled',String(locked||finished||placed.length!==task.count));
  app.querySelector("#bridge-undo").disabled=locked||placed.length===0;
  app.querySelector("#bridge-help").disabled=locked||finished||placed.length===task.count;
 }
 function rewindTo(index){
  if(locked||finished||token!==generation||!Number.isInteger(index)||index<0||index>=placed.length)return;
  clearDrag();suppressClick=null;placed=placed.slice(0,index);save();paint();a.play('hit');vib(7);
  message.textContent='↶ 已收回後面的橋板，從這塊重新蓋！';
 }
 slots.addEventListener('click',e=>{const b=e.target.closest('[data-bridge-undo-index]');if(b&&slots.contains(b))rewindTo(Number(b.dataset.bridgeUndoIndex))});
 slots.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const b=e.target.closest('[data-bridge-undo-index]');if(!b||!slots.contains(b))return;e.preventDefault();rewindTo(Number(b.dataset.bridgeUndoIndex))});
 function begin(){
  if(token!==generation)return;
  clearDrag();task=makeRound(level,round);placed=[];locked=false;vehicle.classList.remove('bridge-crossing');message.textContent='👆 選一樣顏色的橋板，從左邊開始蓋！';save();paint();
  if(round===0)cue();
 }
 function finish(){
  if(finished||token!==generation)return;clearDrag();finished=true;locked=true;
  state.bridgeLevel=Math.max(Number(state.bridgeLevel)||1,Math.min(MAX,level+1));
  state.bridgeCheckpointLevel=state.bridgeLevel;state.bridgeRound=0;state.bridgePlaced=[];
  state.bridgeWins=(Number(state.bridgeWins)||0)+1;state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  a.play('win');fx('win');vib([20,25,20]);say('太棒了！彥彥幫挖土機蓋好三座橋！');
  const ov=document.createElement('div');ov.className='overlay';ov.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🌈 彩虹橋蓋好了！</h2><p>🚜 挖土機安全過河三次！</p><button class="primary" id="bridge-next">▶️ 下一關</button><button class="classic-secondary" id="bridge-again">🔄 再玩一次</button><button class="classic-secondary" id="bridge-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(ov);
  ov.querySelector('#bridge-next').onclick=()=>start(level>=MAX?1:level+1);
  ov.querySelector('#bridge-again').onclick=()=>start(level);
  ov.querySelector('#bridge-menu').onclick=menu;
 }
 choices.addEventListener('click',e=>{
  const b=e.target.closest('[data-bridge]');if(!b||locked||token!==generation)return;
  if(e.detail>0&&suppressClick&&suppressClick.id===b.dataset.bridge&&Date.now()<suppressClick.until){suppressClick=null;return}
  suppressClick=null;placePlank(b.dataset.bridge,b);
 });
 finishFlag.onclick=()=>drive.click();
 drive.onclick=()=>{
  if(locked||placed.length!==task.count||token!==generation)return;
  clearDrag();locked=true;paint();vehicle.classList.add('bridge-crossing');a.play('win');vib([12,20,12]);message.textContent='🚜 嘟嘟！挖土機安全過橋！';
  later(()=>{if(round===ROUNDS-1){finish();return}round++;begin()},1150,token);
 };
 app.querySelector('#bridge-undo').onclick=()=>{
  if(locked||finished||token!==generation||!placed.length)return;
  placed.pop();save();paint();a.play('hit');vib(7);
  message.textContent='↶ 已收回上一塊橋板，再試一次！';
 };
 app.querySelector('#bridge-help').onclick=()=>{
  if(locked||finished||token!==generation||placed.length>=task.count)return;
  clearDrag();suppressClick=null;
  const next=task.goal[placed.length];
  placePlank(next.id,choices.querySelector('[data-bridge="'+next.id+'"]'));
  message.textContent=placed.length===task.count?'🌈 橋蓋好了！點挖土機、拖到旗子，或按開車！':'👩 媽媽幫你鋪好一塊！下一塊換你試試！';
 };
 app.querySelector('#bridge-hint').onclick=()=>{
  if(locked||placed.length>=task.count)return;
  const next=task.goal[placed.length],b=choices.querySelector('[data-bridge="'+next.id+'"]');
  if(!b)return;b.classList.add('bridge-hinted');message.textContent='💡 看！發光的'+next.name+'橋板！';say('彥彥，選'+next.name+'的橋板！');
  later(()=>b.classList.remove('bridge-hinted'),1700,token);
 };
 app.querySelector('#bridge-back').onclick=()=>{clearDrag();menu()};
 app.querySelector('#bridge-home').onclick=()=>{clearDrag();stop();renderHome()};
 app.querySelector('#bridge-retry').onclick=()=>{clearDrag();start(level)};
 app.querySelector('#bridge-speak').onclick=()=>{a.unlock();cue()};
 if(placed.length===task.count)message.textContent='🌈 橋蓋好了！點挖土機、拖到旗子，或按開車！';
 save();paint();if(!placed.length)cue();
}
function enhance(){
 const m=app.querySelector('.classic-menu');if(!m||m.querySelector('#bridge-entry'))return;
 const b=document.createElement('button');b.id='bridge-entry';b.className='classic-tile bridge-tile';b.setAttribute('aria-label','開始挖土機造橋');
 b.innerHTML='<span class="classic-big">🚜🌉</span><strong>挖土機造橋</strong><span>🔴 🟡 🟢</span><small>⭐ '+(Number(state.bridgeLevel)||1)+' / '+MAX+'</small>';
 m.insertBefore(b,m.querySelector('.classic-audio-controls'));b.onclick=()=>start();
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanBridgeGame={start,stop,makeRound,evaluate,validPrefix,enhance};
})();