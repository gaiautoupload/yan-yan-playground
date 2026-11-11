/* v388: tap moving train to skip the ride and immediately evaluate correct/wrong route, preserving progress. */
/* v385: hold a station arrow 520ms to auto-connect all preceding stops; cancel-safe, undoable. */
/* v368: hold final treasure 550ms to auto-plan and launch; cancel-safe and undoable. */
/* v363: one-stroke route tracing is now one undo/redo step; distant auto-connect clears stale redo. */
/* v361: reversible route history (redo) after undo, preserving checkpoints and train gestures. */
/* v320: ride skip and pointer capture for long-press train. */
/* v257: tap any distant treasure to auto-connect preceding junctions, retaining undo/save. */
(()=>{'use strict';
/* v256: long-press the train (550ms) to plan the full route and depart in one gesture; short tap still runs the chosen route. */
/* v255: tap the train itself to depart; keyboard activation and 52px touch target. */
/* v254: one-tap parent route planning with one-step undo; launch and scoring remain explicit. */
/* v232: selectable train speed with persistent preference and matching movement timing. */
/* v229: tap the highlighted missed treasure to repair and immediately retry the train. */
/* v203: restore true tap-to-select on treasure and direction controls under pointer capture. */
/* v202: touch swipes on direction buttons, including cancel and multi-touch guards. */
/* v151: first-missed-station diagnosis and one-tap repair/retry, retaining one-stroke routing and save. */
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh,audio=window.YanClassicAudio;
const MAX=24,icons=['🎁','🧸','🍓','🌟'],arrows={'-1':'⬆️','0':'➡️','1':'⬇️'};
let epoch=0;
function makeLevel(level){
 const n=Math.max(1,Math.min(MAX,Math.round(Number(level)||1))),steps=n<=8?3:4;
 let seed=(Math.imul(n,2654435761)>>>0),lane=1;const goals=[];
 for(let i=0;i<steps;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const opts=[lane-1,lane,lane+1].filter(v=>v>=0&&v<=2);
  lane=opts[seed%opts.length];goals.push(lane);
 }
 return {level:n,steps,goals};
}
function simulate(data,choices){
 let lane=1,valid=true;const lanes=[lane];
 for(let i=0;i<data.steps;i++){
  const move=Number(choices[i]);if(![-1,0,1].includes(move)){valid=false;break}
  const next=lane+move;if(next<0||next>2){valid=false;break}
  lane=next;lanes.push(lane);
 }
 const firstWrong=data.goals.findIndex((g,i)=>lanes[i+1]!==g);
 return {lanes,valid,firstWrong,solved:valid&&lanes.length===data.steps+1&&firstWrong===-1};
}
function planRoute(data){
 let lane=1;
 return data.goals.map(goal=>{const direction=goal-lane;lane=goal;return direction});
}
function traceStopAt(x,y,rect,data){
 if(!rect||!(rect.width>0)||!(rect.height>0)||x<rect.left||y<rect.top||x>=rect.left+rect.width||y>=rect.top+rect.height)return null;
 const col=Math.floor((x-rect.left)/rect.width*(data.steps+1));
 const lane=Math.floor((y-rect.top)/rect.height*3),stop=col-1;
 return stop>=0&&stop<data.steps&&data.goals[stop]===lane?{stop,lane}:null;
}
function gestureMove(dx,dy){if(Math.hypot(dx,dy)<18)return null;if(Math.abs(dy)>=Math.abs(dx)*1.1)return dy<0?-1:1;if(Math.abs(dx)>=Math.abs(dy)*1.1)return 0;return null}
function checkpointOK(cp,data){return !!cp&&cp.level===data.level&&Array.isArray(cp.choices)&&cp.choices.length===data.steps&&cp.choices.every(v=>[-1,0,1].includes(v))}
function settleTraceHistory(before,historyLength,redoBefore,current,history,redo){
 const changed=current.some((value,index)=>value!==before[index]);
 history.length=historyLength;
 redo.length=0;
 if(changed)history.push(before.slice());
 else redo.push(...redoBefore.map(item=>item.slice()));
 return changed;
}
function award(level){
 const done=Array.isArray(state.yswDone)?state.yswDone.filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX):[];
 const fresh=!done.includes(level);
 if(fresh){state.yswDone=[...done,level];state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}
 state.yswLevel=level===MAX?1:level+1;state.yswCheckpoint=null;persist();return fresh;
}
function start(requested){
 epoch++;const run=epoch;audio?.unlock?.();
 const level=Math.max(1,Math.min(MAX,Math.round(Number(requested===undefined?state.yswLevel:requested)||1)));
 const data=makeLevel(level);
 let choices=requested===undefined&&checkpointOK(state.yswCheckpoint,data)?state.yswCheckpoint.choices.slice():Array(data.steps).fill(0);
 let history=[],redo=[],running=false,finished=false,failedStop=-1,turbo=state.yswTurbo===true,travelToken=0;
 app.innerHTML='<section class="screen game classic-screen ysw-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="ysw-back" aria-label="返回遊戲選單">⌂</button><span class="chip">🚂 火車岔道尋寶</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="ysw-voice" aria-label="重播玩法">🔊</button></header>'+
 '<main class="ysw-stage allow-scroll"><div class="ysw-banner">🚂 點寶物選路；長按方向鍵半秒，媽媽幫忙接好到這一站！ 💎</div><div id="ysw-progress" class="ysw-progress"></div>'+
 '<div class="ysw-board" id="ysw-board" style="--ysw-cols:'+(data.steps+1)+'" role="group" aria-label="火車三條軌道與寶物站"><div id="ysw-cells" class="ysw-cells"></div><svg id="ysw-route" class="ysw-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg><button type="button" id="ysw-train" class="ysw-train" aria-label="點小火車出發，按住半秒請媽媽排路再出發" title="點一下出發；按住半秒自動排路並出發">🚂</button></div>'+
 '<div class="ysw-controls" id="ysw-controls"></div><div class="ysw-message" id="ysw-message" role="status" aria-live="polite">👆 點小火車出發；按住小火車半秒，媽媽會幫忙排路再出發！</div>'+
 '<div class="ysw-actions"><button id="ysw-hint">💡 幫我選一步</button><div class="ysw-history"><button id="ysw-undo">↩️ 上一步</button><button id="ysw-redo">↪️ 重做</button></div><button type="button" id="ysw-auto" aria-label="請媽媽一次排好所有寶物站路線，仍需按火車出發">👩 媽媽排好路</button><button type="button" id="ysw-repair" hidden disabled>🛠️ 修好錯站再出發</button><button type="button" id="ysw-skip" hidden disabled>⏩ 立即看結果</button></div><div class="ysw-drive"><button type="button" id="ysw-speed" class="ysw-speed" aria-label="切換火車速度" aria-pressed="'+turbo+'">'+(turbo?'🚀 快速':'🐢 慢速')+'</button><button id="ysw-go" class="ysw-go">🚂 火車出發！</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="ysw-home">⌂ 首頁</button><button class="footbtn yellow" id="ysw-reset">🔄 重新選路</button></footer></section>';
 const cells=app.querySelector('#ysw-cells'),route=app.querySelector('#ysw-route'),train=app.querySelector('#ysw-train'),controls=app.querySelector('#ysw-controls'),msg=app.querySelector('#ysw-message'),progress=app.querySelector('#ysw-progress');
 train.style.transitionDuration=turbo?'100ms':'300ms';
 function save(){state.yswLevel=level;state.yswCheckpoint={level,choices:choices.slice()};persist()}
 function remember(){history.push([...choices]);redo.length=0}
 function pos(x,lane){return {left:((x+.5)/(data.steps+1)*100)+'%',top:((lane+.5)/3*100)+'%'}}
 function paint(){
  if(run!==epoch)return;const result=simulate(data,choices);
  let html='';for(let y=0;y<3;y++)for(let x=0;x<=data.steps;x++){
   const target=x>0&&data.goals[x-1]===y,here=x===0&&y===1;
   html+='<'+(target?'button type="button" data-ysw-stop="'+(x-1)+'" data-ysw-lane="'+y+'" aria-label="第'+x+'站寶物，點擊選擇路線"':'span')+' class="ysw-cell '+(target?'ysw-target'+(result.lanes[x]===y?' ysw-target-picked':''):'')+'">'+(here?'🚉':target?(x===data.steps?'🏠':icons[(level+x)%icons.length]):'·')+'</'+(target?'button':'span')+'>';
  }cells.innerHTML=html;
  if(failedStop>=0)cells.querySelector('[data-ysw-stop="'+failedStop+'"]')?.classList.add('ysw-target-missed');
  const points=result.lanes.map((lane,i)=>((i+.5)/(data.steps+1)*100)+','+((lane+.5)/3*100)).join(' ');
  route.innerHTML='<polyline points="'+points+'" fill="none" stroke="'+(result.valid?'#f8a62a':'#e95454')+'" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>';
  controls.innerHTML=choices.map((d,i)=>'<button type="button" data-ysw="'+i+'" '+(running?'disabled':'')+' aria-label="第'+(i+1)+'個岔道方向：'+(d===-1?'向上':d===1?'向下':'直走')+'"><span>第'+(i+1)+'站</span><b>'+arrows[d]+'</b></button>').join('');
  progress.textContent='🎁 寶物站 '+data.steps+' 個　⭐ '+(Number(state.stars)||0)+' 顆星';
  app.querySelector('#ysw-undo').disabled=running||history.length===0;
  app.querySelector('#ysw-redo').disabled=running||redo.length===0;
  app.querySelector('#ysw-hint').disabled=running;
  app.querySelector('#ysw-auto').disabled=running||finished;
  const repair=app.querySelector('#ysw-repair');repair.hidden=failedStop<0;repair.disabled=running||finished||failedStop<0;
  app.querySelector('#ysw-go').disabled=running;
  const skip=app.querySelector('#ysw-skip');skip.hidden=!running;skip.disabled=!running;
  train.disabled=finished;train.setAttribute('aria-label',running?'點火車立即看結果':'點小火車出發，按住半秒請媽媽排路再出發');train.title=running?'點火車立即看結果':'點一下出發；按住半秒自動排路並出發';
 }
 function win(){
  if(run!==epoch||finished)return;finished=true;
  const fresh=award(level);audio?.play?.('win');fx('win');vib([15,25,15]);say('火車收集到所有寶物，彥彥成功了！');
  const overlay=document.createElement('div');overlay.className='overlay';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🚂 尋寶成功！</h2><p>'+(fresh?'獲得三顆星星！':'再挑戰成功！')+'</p><button class="primary" id="ysw-next">▶️ 下一關</button><button class="classic-secondary" id="ysw-again">🔄 再玩一次</button><button class="classic-secondary" id="ysw-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#ysw-next').onclick=()=>start(level===MAX?1:level+1);
  overlay.querySelector('#ysw-again').onclick=()=>start(level);
  overlay.querySelector('#ysw-menu').onclick=()=>{epoch++;window.YanClassics.menu()};
 }
 function animate(result,i=0,token=travelToken){
  if(run!==epoch||token!==travelToken||!running)return;
  if(i>=result.lanes.length){
   running=false;
   if(result.solved){train.style.opacity='0';paint();win();return}
   failedStop=Math.max(0,result.firstWrong);paint();audio?.play?.('wrong');vib(18);
   msg.textContent='💗 第 '+(failedStop+1)+' 站走錯路！紅色寶物就是漏掉的那站。';
   say('第'+(failedStop+1)+'站沒拿到寶物，按修好錯站再出發！');return;
  }
  const p=pos(i,result.lanes[i]);train.style.left=p.left;train.style.top=p.top;train.style.opacity='1';
  if(i>0)audio?.play?.('hit');
  if(i>0&&i-1===result.firstWrong){
   running=false;failedStop=i-1;paint();audio?.play?.('wrong');vib(18);
   msg.textContent='💗 第 '+i+' 站走錯路！看紅色寶物，或按修好錯站再出發。';
   say('第'+i+'站走錯路了，按修好錯站再出發！');return;
  }
  setTimeout(()=>animate(result,i+1,token),turbo?130:340);
 }
/* v105: Treasure-tap route selection without bypassing track physics. */
 function chooseTreasure(stop,lane){
  if(running||finished||!Number.isInteger(stop)||stop<0||stop>=data.steps||!Number.isInteger(lane)||lane<0||lane>2)return false;
  let current=1,broken=false;
  for(let j=0;j<stop;j++){
   current+=choices[j];
   if(current<0||current>2){broken=true;break}
  }
  const direction=lane-current;
  // v257: a distant treasure repairs the earlier junctions in one tap.
  if(broken||Math.abs(direction)>1){
   const planned=planRoute(data),before=choices.slice();
   for(let j=0;j<=stop;j++)choices[j]=planned[j];
   if(choices.every((v,i)=>v===before[i])){msg.textContent='🎁 這站已經連通，按火車出發！';return true}
   history.push(before);redo.length=0;failedStop=-1;save();paint();audio?.play?.('hit');vib(8);
   cells.querySelector('[data-ysw-stop="'+stop+'"]')?.classList.add('ysw-flash');
   msg.textContent='🚂 已接好前面 '+(stop+1)+' 站，火車可以抵達這個寶物！';
   return true;
  }
  if(choices[stop]===direction){msg.textContent='🎁 這站已經對準寶物，繼續下一站！';return true}
  remember();choices[stop]=direction;failedStop=-1;save();paint();audio?.play?.('hit');vib(8);
  cells.querySelector('[data-ysw-stop="'+stop+'"]')?.classList.add('ysw-flash');
  msg.textContent='🎁 第 '+(stop+1)+' 站已選好！再點下一站寶物。';return true;
 }
 cells.addEventListener('click',e=>{
  const b=e.target.closest('[data-ysw-stop]');if(b)retryMissedTreasure(Number(b.dataset.yswStop),Number(b.dataset.yswLane));
 });
 // v229: touching the highlighted missed treasure repairs that station and restarts the train.
 function retryMissedTreasure(stop,lane){
  const missed=failedStop===stop;
  if(!chooseTreasure(stop,lane)||!missed||running||finished)return;
  running=true;paint();
  msg.textContent='🚂 找到漏掉的寶物！火車再出發！';
  audio?.play?.('hit');vib(10);
  travelToken++;animate(simulate(data,choices));
 }
 // v150: one-stroke treasure tracing with pointer ownership, sampled movement and cancel rollback.
 let trace=null,suppressTrustedClickUntil=0;
 function traceVisit(x,y){
  if(!trace)return;
  const hit=traceStopAt(x,y,cells.getBoundingClientRect(),data);
  if(!hit||trace.visited.has(hit.stop))return;
  if(chooseTreasure(hit.stop,hit.lane))trace.visited.add(hit.stop);
 }
 cells.addEventListener('pointerdown',e=>{
  const target=e.target.closest?.('[data-ysw-stop]');
  if(!target||running||finished||trace||e.isPrimary===false)return;
  trace={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,started:false,visited:new Set(),tapStop:Number(target.dataset.yswStop),tapLane:Number(target.dataset.yswLane),before:choices.slice(),historyLength:history.length,redoBefore:redo.map(a=>a.slice()),at:Date.now()};
  if(trace.tapStop===data.steps-1)target.classList.add('ysw-target-holding');
  try{cells.setPointerCapture(e.pointerId)}catch(_){}
 });
 cells.addEventListener('pointermove',e=>{
  const g=trace;if(!g||g.id!==e.pointerId||running||finished)return;
  if(!g.started&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<12)return;
  if(!g.started){g.started=true;cells.querySelector('.ysw-target-holding')?.classList.remove('ysw-target-holding');cells.classList.add('ysw-tracing');traceVisit(g.x,g.y)}
  const dx=e.clientX-g.lastX,dy=e.clientY-g.lastY;
  const samples=Math.max(1,Math.min(120,Math.ceil(Math.hypot(dx,dy)/7)));
  for(let k=1;k<=samples;k++)traceVisit(g.lastX+dx*k/samples,g.lastY+dy*k/samples);
  g.lastX=e.clientX;g.lastY=e.clientY;e.preventDefault();
 },{passive:false});
 function endTrace(e,canceled){
  const g=trace;if(!g||g.id!==e.pointerId)return;
  cells.querySelector('.ysw-target-holding')?.classList.remove('ysw-target-holding');
  if(g.started&&!canceled)traceVisit(e.clientX,e.clientY);
  if(!g.started&&!canceled){
   suppressTrustedClickUntil=Date.now()+600;
   if(g.tapStop===data.steps-1&&Date.now()-g.at>=550&&!running&&!finished){
    const planned=planRoute(data);
    if(!choices.every((v,i)=>v===planned[i])){
     remember();choices=planned;failedStop=-1;save();paint();
    }
    msg.textContent='🚂 按住最後寶物，媽媽接好所有岔道，火車出發！';
    audio?.play?.('hit');vib(10);
    app.querySelector('#ysw-go')?.click();
   }else retryMissedTreasure(g.tapStop,g.tapLane);
  }
  if(g.started){
   suppressTrustedClickUntil=Date.now()+480;
   if(canceled){choices=g.before.slice();history.length=g.historyLength;redo.length=0;redo.push(...g.redoBefore);save();paint();msg.textContent='↩️ 手勢取消，路線恢復原樣！'}
   else{
    const changed=settleTraceHistory(g.before,g.historyLength,g.redoBefore,choices,history,redo);
    if(changed){save();paint()}
    e.preventDefault();
    msg.textContent=changed?'🛤️ 一筆選好 '+g.visited.size+' 站！按 ↩️ 上一步可整筆復原。':'🎁 路線沒有改變，可以按火車出發！';
   }
  }
  trace=null;cells.classList.remove('ysw-tracing');
 }
 cells.addEventListener('pointerup',e=>endTrace(e,false));
 cells.addEventListener('pointercancel',e=>endTrace(e,true));
 cells.addEventListener('lostpointercapture',e=>endTrace(e,true));
 cells.addEventListener('click',e=>{
  if(e.isTrusted&&Date.now()<suppressTrustedClickUntil){e.preventDefault();e.stopImmediatePropagation()}
 },true);
 let controlGesture=null,suppressControlUntil=0,suppressControlIndex=-1;
 controls.addEventListener('pointerdown',e=>{
  const b=e.target.closest?.('[data-ysw]');
  if(!b||running||finished||controlGesture||e.isPrimary===false||e.button>0)return;
  const g={id:e.pointerId,index:Number(b.dataset.ysw),x:e.clientX,y:e.clientY,moved:false,held:false,timer:null};
  controlGesture=g;
  g.timer=setTimeout(()=>{
   if(controlGesture!==g||running||finished||g.moved||run!==epoch)return;
   g.held=true;suppressControlUntil=Date.now()+900;suppressControlIndex=g.index;
   const planned=planRoute(data),next=choices.slice();
   for(let j=0;j<=g.index;j++)next[j]=planned[j];
   const changed=next.some((v,j)=>v!==choices[j]);
   if(changed){remember();choices=next;failedStop=-1;save();paint();controls.querySelector('[data-ysw="'+g.index+'"]')?.classList.add('ysw-flash')}
   msg.textContent=changed?'👩 媽媽接好第 '+(g.index+1)+' 站以前的路了！可按 ↩️ 上一步。':'🌟 到第 '+(g.index+1)+' 站的路已經選對了！';
   audio?.play?.('hit');vib(12);
  },520);
  try{controls.setPointerCapture(e.pointerId)}catch(_){}
 });
 controls.addEventListener('pointermove',e=>{
  const g=controlGesture;if(!g||g.id!==e.pointerId||running||finished)return;
  if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>12)clearTimeout(g.timer);
  if(g.held||gestureMove(e.clientX-g.x,e.clientY-g.y)===null)return;
  g.moved=true;controls.querySelector('[data-ysw="'+g.index+'"]')?.classList.add('ysw-swipe-active');e.preventDefault();
 },{passive:false});
 function endControlGesture(e,canceled){
  const g=controlGesture;if(!g||g.id!==e.pointerId)return;
  clearTimeout(g.timer);controlGesture=null;
  if(g.held){suppressControlUntil=Date.now()+900;suppressControlIndex=g.index;return}
  const b=controls.querySelector('[data-ysw="'+g.index+'"]');b?.classList.remove('ysw-swipe-active');
  if(!g.moved){
   if(canceled||running||finished)return;
   suppressControlUntil=Date.now()+550;suppressControlIndex=g.index;
   const cycle=[0,-1,1],at=cycle.indexOf(choices[g.index]);
   remember();choices[g.index]=cycle[(at+1)%3];failedStop=-1;
   save();paint();audio?.play?.('hit');vib(8);
   msg.textContent='🚂 點一下換方向！也可以上滑、下滑或左右滑。';return;
  }
  suppressControlUntil=Date.now()+550;suppressControlIndex=g.index;
  if(canceled||running||finished){msg.textContent='↩️ 手勢取消，方向沒有改變！';return}
  const direction=gestureMove(e.clientX-g.x,e.clientY-g.y);
  if(direction===null){msg.textContent='👆 往上、下或左右滑，選火車方向！';return}
  if(choices[g.index]===direction){msg.textContent='🚂 方向已經選好了！';return}
  remember();choices[g.index]=direction;failedStop=-1;
  save();paint();audio?.play?.('hit');vib(8);
  msg.textContent='🚂 第 '+(g.index+1)+' 站：'+(direction===-1?'往上':direction===1?'往下':'直走')+'！';
 }
 controls.addEventListener('pointerup',e=>endControlGesture(e,false));
 controls.addEventListener('pointercancel',e=>endControlGesture(e,true));
 controls.addEventListener('lostpointercapture',e=>endControlGesture(e,true));
 controls.addEventListener('click',e=>{
  const b=e.target.closest('[data-ysw]');if(!b||running||finished)return;
  const i=Number(b.dataset.ysw);if(!Number.isInteger(i)||i<0||i>=data.steps)return;
  if(e.detail>0&&i===suppressControlIndex&&Date.now()<suppressControlUntil)return;
  remember();failedStop=-1;const cycle=[0,-1,1],at=cycle.indexOf(choices[i]);choices[i]=cycle[(at+1)%3];
  save();paint();audio?.play?.('hit');vib(8);msg.textContent='🛤️ 看看橘色路線有沒有經過寶物！';
 });
 app.querySelector('#ysw-hint').onclick=()=>{
  if(running||finished)return;const r=simulate(data,choices);let i=r.firstWrong;
  if(i<0){msg.textContent='🎉 都選對了，按火車出發！';return}
  const previous=data.goals[i-1]??1;remember();choices[i]=data.goals[i]-previous;failedStop=-1;
  save();paint();controls.querySelector('[data-ysw="'+i+'"]')?.classList.add('ysw-flash');
  msg.textContent='💡 幫你選好第 '+(i+1)+' 站！';say('看看發光的方向，接著自己選！');
 };
 app.querySelector('#ysw-auto').onclick=()=>{
  if(running||finished||run!==epoch)return;
  const planned=planRoute(data);
  if(choices.every((v,i)=>v===planned[i])){msg.textContent='🎉 每一站都對準寶物了！按火車出發！';return}
  remember();choices=planned;failedStop=-1;save();paint();
  msg.textContent='👩 媽媽幫你排好所有路線！按 🚂 火車出發，或按 ↩️ 上一步自己挑戰。';
  audio?.play?.('hit');vib(10);say('彥彥，媽媽排好路了！按火車出發！');
 };
 app.querySelector('#ysw-undo').onclick=()=>{if(running||finished||!history.length)return;redo.push(choices.slice());choices=history.pop();failedStop=-1;save();paint();msg.textContent='↩️ 回到上一步！按 ↪️ 重做可恢復剛才路線。'};
 app.querySelector('#ysw-redo').onclick=()=>{if(running||finished||!redo.length)return;history.push(choices.slice());choices=redo.pop();failedStop=-1;save();paint();audio?.play?.('hit');vib(8);msg.textContent='↪️ 已恢復剛才的路線！'};
 app.querySelector('#ysw-skip').onclick=()=>{
  if(!running||finished||run!==epoch)return;
  travelToken++;running=false;const result=simulate(data,choices);
  if(result.solved){train.style.opacity='0';paint();win();return}
  failedStop=Math.max(0,result.firstWrong);paint();audio?.play?.('wrong');vib(18);
  msg.textContent='💗 第 '+(failedStop+1)+' 站走錯路！點紅色寶物修路，或按修好錯站再出發。';
  say('第'+(failedStop+1)+'站還沒拿到寶物，點紅色寶物或按修好錯站！');
 };
 app.querySelector('#ysw-speed').onclick=()=>{if(finished)return;turbo=!turbo;state.yswTurbo=turbo;persist();const b=app.querySelector('#ysw-speed');b.setAttribute('aria-pressed',String(turbo));b.textContent=turbo?'🚀 快速':'🐢 慢速';train.style.transitionDuration=turbo?'100ms':'300ms';msg.textContent=turbo?'🚀 小火車加速！':'🐢 小火車慢慢開！';audio?.play?.('pop');vib(8)};
 app.querySelector('#ysw-go').onclick=()=>{if(running||finished)return;failedStop=-1;running=true;paint();const result=simulate(data,choices);msg.textContent='🚂 火車出發！再點小火車可立即看結果！';travelToken++;animate(result)};
 // v256: one-gesture parent assist without changing the normal tap or keyboard launch.
 let trainPointer=null,suppressTrainClickUntil=0;
 train.addEventListener('pointerdown',e=>{
  if(running||finished||trainPointer||e.isPrimary===false||e.button>0)return;
  trainPointer={id:e.pointerId,x:e.clientX,y:e.clientY,at:Date.now()};
  train.classList.add('ysw-holding');
  try{train.setPointerCapture(e.pointerId)}catch(_){}
 });
 train.addEventListener('pointermove',e=>{
  const g=trainPointer;if(!g||g.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>18){
   trainPointer=null;train.classList.remove('ysw-holding');
   suppressTrainClickUntil=Date.now()+600;
   try{if(train.hasPointerCapture?.(e.pointerId))train.releasePointerCapture(e.pointerId)}catch(_){}
  }
 });
 function releaseTrain(e,canceled){
  const g=trainPointer;if(!g||g.id!==e.pointerId)return;
  trainPointer=null;train.classList.remove('ysw-holding');
  suppressTrainClickUntil=Date.now()+600;
  try{if(train.hasPointerCapture?.(e.pointerId))train.releasePointerCapture(e.pointerId)}catch(_){}
  if(canceled||running||finished)return;
  e.preventDefault();
  if(Date.now()-g.at>=550){
   const planned=planRoute(data);
   if(!choices.every((v,i)=>v===planned[i])){
    remember();choices=planned;failedStop=-1;save();paint();
   }
   msg.textContent='👩 媽媽幫你排好路，火車出發！';
   audio?.play?.('hit');vib(10);
  }
  app.querySelector('#ysw-go')?.click();
 }
 train.addEventListener('pointerup',e=>releaseTrain(e,false));
 train.addEventListener('pointercancel',e=>releaseTrain(e,true));
 train.addEventListener('lostpointercapture',e=>releaseTrain(e,true));
 train.onclick=e=>{if(finished)return;if(running){app.querySelector('#ysw-skip')?.click();return}if(e?.detail>0&&Date.now()<suppressTrainClickUntil)return;app.querySelector('#ysw-go')?.click()};
 app.querySelector('#ysw-repair').onclick=()=>{
  if(running||finished||failedStop<0)return;
  const result=simulate(data,choices),i=result.firstWrong;
  if(i<0){failedStop=-1;running=true;paint();travelToken++;animate(result);return}
  const from=result.lanes[i],move=data.goals[i]-from;
  if(!Number.isInteger(from)||![-1,0,1].includes(move)){msg.textContent='💗 請先調整前一站的箭頭！';return}
  remember();choices[i]=move;failedStop=-1;save();running=true;paint();
  msg.textContent='🛠️ 第 '+(i+1)+' 站修好了！火車再出發！';audio?.play?.('hit');vib(10);
  travelToken++;animate(simulate(data,choices));
 };
 app.querySelector('#ysw-voice').onclick=()=>{audio?.unlock?.();say('點任一寶物選路，太遠會自動接好前面的岔道，也可以在箭頭上往上滑、往下滑或左右滑，直接選方向，按速度鍵可以快快開或慢慢開，最後按火車出發，也可以直接點小火車出發，按住小火車半秒就會自動排路再出發！長按任一站方向鍵半秒，媽媽幫你接好到那一站！')};
 app.querySelector('#ysw-back').onclick=()=>{epoch++;window.YanClassics.menu()};
 app.querySelector('#ysw-home').onclick=()=>{epoch++;renderHome()};
 app.querySelector('#ysw-reset').onclick=()=>start(level);
 save();paint();say('彥彥，幫火車選方向，去每一站拿寶物！');
}
const hub=window.YanGameHub;if(hub&&Array.isArray(hub.groups)){const g=hub.groups.find(x=>x[0]==='build');if(g&&!g[4].some(x=>x[3]==='YanRailSwitch'))g[4].push(['🚦','火車岔道尋寶','選上、直走、下，收集寶物','YanRailSwitch'])}
window.YanRailSwitch={start,makeLevel,simulate,planRoute,traceStopAt,gestureMove,checkpointOK,award,MAX};
})();