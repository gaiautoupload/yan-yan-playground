(()=>{
'use strict';
// v377: live route-lamp toggle keeps correct/incorrect route cues visible while rotating, without scoring.
// v376: drag across several pipes in aim mode to auto-align a whole stroke with one undo.
// v183.1: targeted pipe auto-alignment with undo, multi-touch and click safeguards.
// v182: non-scoring full-route preview highlights connected and misaligned pipes.
// v177: undo last tap, whole swipe or assist move; preserve progress and keyboard.
const sh=window.YanClassicShared,a=window.YanClassicAudio;
if(!sh||!a)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh,MAX=40,ROUNDS=3,DIR=[[-1,0,1],[0,1,2],[1,0,4],[0,-1,8]];
function rng(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function rotate(mask){return ((mask<<1)&15)|(mask>>3)}
function port(from,to,n){const d=to-from;return d===-n?1:d===1?2:d===n?4:d===-1?8:0}
function makeRound(level,round){
 const n=level<=10?3:level<=25?4:level<=35?5:6,rand=rng(20261027+level*9539+round*1777);
 const moves=[...Array(n-1).fill(1),...Array(n-1).fill(n)];
 for(let i=moves.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[moves[i],moves[j]]=[moves[j],moves[i]]}
 const path=[0];for(const d of moves)path.push(path[path.length-1]+d);
 const goal=Array(n*n).fill(0);
 path.forEach((at,i)=>{if(i)goal[at]|=port(at,path[i-1],n);if(i<path.length-1)goal[at]|=port(at,path[i+1],n)});
 const masks=goal.slice();
 path.slice(1,-1).forEach(at=>{const straight=goal[at]===5||goal[at]===10;const turns=straight?(rand()<.5?1:3):1+Math.floor(rand()*3);for(let k=0;k<turns;k++)masks[at]=rotate(masks[at])});
 return {n,path,goal,masks,level,round};
}
function flow(task,masks){
 const n=task.n,seen=new Set([0]),queue=[0];
 for(let q=0;q<queue.length;q++){
  const i=queue[q],r=Math.floor(i/n),c=i%n;
  for(const [dr,dc,bit] of DIR){const rr=r+dr,cc=c+dc;if(rr<0||rr>=n||cc<0||cc>=n)continue;
   const j=rr*n+cc,back=rotate(rotate(bit));
   if((masks[i]&bit)&&(masks[j]&back)&&!seen.has(j)){seen.add(j);queue.push(j)}
  }
 }
 return seen;
}
function solved(task,masks){return flow(task,masks).has(task.n*task.n-1)}
function routeGuide(task,turns){const masks=apply(task,turns);return {path:task.path.slice(),needsTurn:task.path.slice(1,-1).filter(i=>masks[i]!==task.goal[i])}}
function validTurns(task,turns){return Array.isArray(turns)&&turns.length===task.n*task.n&&turns.every(t=>Number.isInteger(t)&&t>=0&&t<4)}
function apply(task,turns){return task.masks.map((m,i)=>{for(let t=0;t<(turns[i]||0);t++)m=rotate(m);return m})}
let generation=0,timers=[];
function stop(){generation++;timers.forEach(clearTimeout);timers=[];try{window.speechSynthesis?.cancel()}catch(_){}}
function later(fn,ms,token){const id=setTimeout(()=>{timers=timers.filter(t=>t!==id);if(token===generation)fn()},ms);timers.push(id)}
function menu(){stop();window.YanClassics.menu()}
function pipeSvg(mask,wet){
 let s='';for(const [dr,dc,bit] of DIR)if(mask&bit)s+='<path d="M50 50 L'+(50+dc*49)+' '+(50+dr*49)+'"/>';
 return '<svg viewBox="0 0 100 100" aria-hidden="true" class="pipe-svg '+(wet?'wet':'')+'"><g>'+s+'<circle cx="50" cy="50" r="16"/></g></svg>';
}
function start(requested){
 stop();a.unlock();const token=generation,level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.pipeLevel)||1));
 let round=requested===undefined&&Number(state.pipeCheckpointLevel)===level?Math.max(0,Math.min(ROUNDS-1,Number(state.pipeRound)||0)):0;
 let task=makeRound(level,round),turns=requested===undefined&&Number(state.pipeCheckpointLevel)===level&&validTurns(task,state.pipeTurns)?state.pipeTurns.slice():Array(task.n*task.n).fill(0);
 let locked=false,finished=false,undoStack=[],reverse=false,aimMode=false,routeLamp=false;
 app.innerHTML='<section class="screen game classic-screen pipe-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="pipe-back" aria-label="返回遊戲">⌂</button><span class="chip">🚜 水管大救援</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="pipe-speak" aria-label="重播語音">🔊</button></header>'+
 '<main class="pipe-stage allow-scroll"><div class="pipe-hero"><img src="./assets/excavator.webp" alt="挖土機"><strong>💧 幫花園接水管！ 🌻</strong><img src="./assets/family-home.webp" alt="親子遊戲"></div>'+
 '<div class="pipe-status"><span id="pipe-round">🌟 1 / 3</span><span id="pipe-water">💧 接通水管</span></div>'+
 '<div id="pipe-board" class="pipe-board" role="group" aria-label="點擊或用手指滑過水管轉動方向"></div>'+
 '<div class="pipe-message" id="pipe-message" aria-live="polite">👆 點一下，或滑過多條水管連續轉動！</div>'+
 '<div class="pipe-actions"><button id="pipe-hint" type="button" aria-pressed="false">🗺️ 路線燈：關</button><button id="pipe-help" type="button">✨ 幫接一節</button><button id="pipe-aim" type="button" aria-pressed="false">🎯 指哪修哪：關</button><button id="pipe-reverse" type="button" aria-pressed="false">↶ 逆轉：關</button><button id="pipe-undo" type="button" disabled>↩️ 上一步</button><button id="pipe-replay" type="button">🔊 聽媽媽說</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="pipe-home">⌂ 首頁</button><button class="footbtn yellow" id="pipe-retry">🔄 重玩</button></footer></section>';
 const board=app.querySelector('#pipe-board'),msg=app.querySelector('#pipe-message');
 function save(){state.pipeCheckpointLevel=level;state.pipeRound=round;state.pipeTurns=turns.slice();persist()}
 function cue(){say('彥彥，花園沒有水了！點水管或用手指滑過水管，讓水從水滴流到花朵！')}
 function paint(){
  const masks=apply(task,turns),wet=flow(task,masks),start=0,end=task.n*task.n-1;
  board.style.setProperty('--pipe-size',task.n);
   board.classList.toggle('pipe-lamp-on',routeLamp);
  board.innerHTML=masks.map((m,i)=>{
   const path=task.goal[i]!==0,endpoint=i===start||i===end;
   return '<button type="button" data-pipe="'+i+'" class="pipe-cell '+(path?'pipe-active':'pipe-grass')+' '+(wet.has(i)?'pipe-wet':'')+(routeLamp&&path?(m===task.goal[i]?' pipe-route-ready':' pipe-turn-needed'):'')+'" '+(!path||endpoint||locked?'disabled':'')+' aria-label="'+(i===start?'水源':i===end?'花朵':path?'轉動水管':'草地')+'">'+(path?pipeSvg(m,wet.has(i)):'🌱')+(i===start?'<span class="pipe-end">💧</span>':i===end?'<span class="pipe-end">🌻</span>':'')+'</button>'
  }).join('');
  app.querySelector('#pipe-round').textContent='🌟 '+(round+1)+' / '+ROUNDS;
  app.querySelector('#pipe-water').textContent=solved(task,masks)?'🎉 水流到花園了！':'💧 已接通 '+wet.size+'/'+task.path.length;
  app.querySelector('#pipe-undo').disabled=locked||undoStack.length===0;
 }
 function begin(){if(token!==generation)return;aimMode=false;const aim=app.querySelector('#pipe-aim');if(aim){aim.setAttribute('aria-pressed','false');aim.textContent='🎯 指哪修哪：關'}task=makeRound(level,round);turns=Array(task.n*task.n).fill(0);locked=false;undoStack=[];msg.textContent='👆 點水管或滑過多條水管，接到花朵！';save();paint();cue()}
 function finish(){if(finished||token!==generation)return;finished=true;locked=true;
  state.pipeLevel=Math.max(Number(state.pipeLevel)||1,Math.min(MAX,level+1));state.pipeCheckpointLevel=state.pipeLevel;state.pipeRound=0;state.pipeTurns=[];
  state.pipeWins=(Number(state.pipeWins)||0)+1;state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  a.play('win');fx('win');vib([20,30,20]);say('太棒了！彥彥幫花園接好水管了！');
  const ov=document.createElement('div');ov.className='overlay';ov.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🌻 花園有水了！</h2><p>🚜 彥彥完成三次水管救援！</p><button class="primary" id="pipe-next">▶️ 下一關</button><button class="classic-secondary" id="pipe-again">🔄 再玩一次</button><button class="classic-secondary" id="pipe-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(ov);ov.querySelector('#pipe-next').onclick=()=>start(level>=MAX?1:level+1);ov.querySelector('#pipe-again').onclick=()=>start(level);ov.querySelector('#pipe-menu').onclick=menu;
 }
 function roundComplete(){if(locked||token!==generation)return;locked=true;paint();msg.textContent='🌈 水流通了！花朵喝到水囉！';a.play('win');fx('yay');vib([12,20,12]);say('水流到花朵了！好厲害！');later(()=>{if(round===ROUNDS-1)finish();else{round++;begin()}},900,token)}
 // v99: touch/mouse drag can rotate each visited pipe once, including fast sweeps.
 let sweep=null,lastPointerEnd=0,aimPointerId=null,aimLastX=0,aimLastY=0,aimVisited=null,aimUndoTaken=false;
 function setAim(on){
  aimMode=!!on;const b=app.querySelector('#pipe-aim');
  if(b){b.setAttribute('aria-pressed',String(aimMode));b.textContent=aimMode?'🎯 指哪修哪：開':'🎯 指哪修哪：關'}
  board.classList.toggle('pipe-aim-swipe',aimMode);
 }
 function alignAt(i,keepAim=false){
  if(locked||token!==generation||!Number.isInteger(i)||i<=0||i>=task.n*task.n-1||!task.goal[i])return false;
  const masks=apply(task,turns);let m=masks[i],steps=0;
  while(m!==task.goal[i]&&steps<4){m=rotate(m);steps++}
  if(steps===0){if(!keepAim)setAim(false);msg.textContent='🌱 這節水管已接好，試試別節！';return false}
  if(steps>=4)return false;
  if(!keepAim||!aimUndoTaken){undoStack.push(turns.slice());if(undoStack.length>30)undoStack.shift();if(keepAim)aimUndoTaken=true}
  turns[i]=(turns[i]+steps)%4;if(!keepAim)setAim(false);save();paint();a.play('hit');fx('yay');vib(12);
  msg.textContent='🎯 這節水管對準了！繼續接到花朵！';
  if(solved(task,apply(task,turns)))roundComplete();
  return true;
 }
 function turnAt(i,continuation=false){
  if(locked||token!==generation||!Number.isInteger(i)||i<=0||i>=task.n*task.n-1||!task.goal[i])return false;
  a.unlock();if(!continuation){undoStack.push(turns.slice());if(undoStack.length>30)undoStack.shift()}turns[i]=(turns[i]+(reverse?3:1))%4;save();paint();a.play('hit');vib(8);
  msg.textContent=reverse?'↶ 逆時針轉水管！':'💧 滑過水管，一格一格接起來！';
  if(solved(task,apply(task,turns)))roundComplete();
  return true;
 }
 function visitAt(x,y){
  const el=document.elementFromPoint?.(x,y),b=el?.closest?.('[data-pipe]');
  if(!b||!board.contains(b))return;
  const i=Number(b.dataset.pipe);
  if(sweep&&!sweep.visited.has(i)){sweep.visited.add(i);turnAt(i,true)}
 }
 function endSweep(e){
  if(aimPointerId===e.pointerId){aimPointerId=null;aimVisited=null;aimUndoTaken=false;setAim(false);lastPointerEnd=Date.now();try{if(board.hasPointerCapture?.(e.pointerId))board.releasePointerCapture(e.pointerId)}catch(_){}return}
  if(!sweep||e.pointerId!==sweep.id)return;
  sweep=null;lastPointerEnd=Date.now();
  try{if(board.hasPointerCapture?.(e.pointerId))board.releasePointerCapture(e.pointerId)}catch(_){}
 }
 board.addEventListener('pointerdown',e=>{
  if(locked||token!==generation||sweep||aimPointerId!==null||(e.pointerType==='mouse'&&e.button!==0))return;
  const b=e.target.closest?.('[data-pipe]'),i=b?Number(b.dataset.pipe):-1;
  if(i<=0||i>=task.n*task.n-1||!task.goal[i])return;
  if(aimMode){e.preventDefault();aimPointerId=e.pointerId;aimLastX=e.clientX;aimLastY=e.clientY;aimVisited=new Set([i]);aimUndoTaken=false;lastPointerEnd=Date.now();try{board.setPointerCapture?.(e.pointerId)}catch(_){}alignAt(i,true);return}
  e.preventDefault();sweep={id:e.pointerId,x:e.clientX,y:e.clientY,visited:new Set([i])};
  try{board.setPointerCapture?.(e.pointerId)}catch(_){}
  turnAt(i);
 });
 board.addEventListener('pointermove',e=>{
  if(aimPointerId===e.pointerId&&aimVisited&&!locked&&token===generation){
   const dx=e.clientX-aimLastX,dy=e.clientY-aimLastY,steps=Math.min(120,Math.max(1,Math.ceil(Math.hypot(dx,dy)/10)));
   for(let s=1;s<=steps&&!locked;s++){
    const b=document.elementFromPoint?.(aimLastX+dx*s/steps,aimLastY+dy*s/steps)?.closest?.('[data-pipe]');
    if(!b||!board.contains(b))continue;
    const i=Number(b.dataset.pipe);
    if(!aimVisited.has(i)){aimVisited.add(i);alignAt(i,true)}
   }
   aimLastX=e.clientX;aimLastY=e.clientY;return;
  }
  if(!sweep||sweep.id!==e.pointerId||locked||token!==generation)return;
  const dx=e.clientX-sweep.x,dy=e.clientY-sweep.y;
  const steps=Math.min(120,Math.max(1,Math.ceil(Math.hypot(dx,dy)/12)));
  for(let s=1;s<=steps&&!locked;s++)visitAt(sweep.x+dx*s/steps,sweep.y+dy*s/steps);
  sweep.x=e.clientX;sweep.y=e.clientY;
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(type,endSweep);
 board.addEventListener('click',e=>{
  // Pointerdown already rotated; keep detail=0 keyboard and assistive clicks working.
  if(e.detail>0&&Date.now()-lastPointerEnd<650)return;
  const b=e.target.closest('[data-pipe]');if(!b)return;if(aimMode)alignAt(Number(b.dataset.pipe));else turnAt(Number(b.dataset.pipe));
 });
 app.querySelector('#pipe-aim').onclick=()=>{
  if(locked||token!==generation)return;
  setAim(!aimMode);msg.textContent=aimMode?'🎯 按住滑過多節水管，沿路自動對準！':'👆 已回到一般旋轉模式。';
  a.play('hit');vib(6);
 };
 app.querySelector('#pipe-reverse').onclick=()=>{
  if(locked||token!==generation)return;
  reverse=!reverse;const button=app.querySelector('#pipe-reverse');
  button.setAttribute('aria-pressed',String(reverse));button.textContent=reverse?'↶ 逆轉：開':'↶ 逆轉：關';
  msg.textContent=reverse?'↶ 現在點水管會往回轉，滑過也可以！':'↷ 現在恢復順時針轉水管！';
  a.play('hit');vib(6);
 };
 app.querySelector('#pipe-undo').onclick=()=>{
  if(locked||sweep||token!==generation||!undoStack.length)return;
  turns=undoStack.pop();save();paint();a.play('hit');vib(6);
  msg.textContent='↩️ 已回到上一步，再試試！';
 };
 app.querySelector('#pipe-hint').onclick=()=>{
   if(locked||token!==generation)return;
   routeLamp=!routeLamp;
   const b=app.querySelector('#pipe-hint');
   b.setAttribute('aria-pressed',String(routeLamp));
   b.textContent=routeLamp?'🗺️ 路線燈：開':'🗺️ 路線燈：關';
   paint();
   if(routeLamp){
    const wrong=routeGuide(task,turns).needsTurn.length;
    msg.textContent=wrong?'🗺️ 綠色水管已對準，橘色還要轉！剩 '+wrong+' 節。':'🌻 全部接對了，水快流到花朵！';
    say('彥彥，沿著綠色水路，把橘色水管轉對！');
   }else msg.textContent='👆 路線燈關閉了，自己試著接水管！';
   a.play('hit');vib(6);
  };
 app.querySelector('#pipe-help').onclick=()=>{
  if(locked||finished||token!==generation)return;
  const masks=apply(task,turns);
  const i=task.path.slice(1,-1).find(j=>masks[j]!==task.goal[j]);
  if(i===undefined){msg.textContent='🌻 水管已經接好了！';return}
  let mask=masks[i],steps=0;
  while(mask!==task.goal[i]&&steps<4){mask=rotate(mask);steps++}
  if(mask!==task.goal[i]||steps===0||steps>=4)return;
  undoStack.push(turns.slice());if(undoStack.length>30)undoStack.shift();
  turns[i]=(turns[i]+steps)%4;save();paint();
  a.play('hit');fx('yay');vib(12);
  const cell=board.querySelector('[data-pipe="'+i+'"]');
  if(cell){cell.classList.add('pipe-hint');later(()=>{if(cell.isConnected)cell.classList.remove('pipe-hint')},850,token)}
  msg.textContent='✨ 已幫你接好一節水管，繼續加油！';
  if(solved(task,apply(task,turns)))roundComplete();
 };
 app.querySelector('#pipe-back').onclick=menu;app.querySelector('#pipe-home').onclick=()=>{stop();renderHome()};app.querySelector('#pipe-retry').onclick=()=>start(level);
 app.querySelector('#pipe-speak').onclick=()=>{a.unlock();cue()};app.querySelector('#pipe-replay').onclick=()=>{a.unlock();cue()};
 save();paint();if(solved(task,apply(task,turns)))later(roundComplete,350,token);else cue();
}
function enhance(){const m=app.querySelector('.classic-menu');if(!m||m.querySelector('#pipe-entry'))return;const b=document.createElement('button');b.id='pipe-entry';b.className='classic-tile pipe-tile';b.setAttribute('aria-label','開始挖土機水管大救援');b.innerHTML='<span class="classic-big">🚜💧</span><strong>水管大救援</strong><span>🔧 ➜ 🌻</span><small>⭐ '+(Number(state.pipeLevel)||1)+' / '+MAX+'</small>';m.insertBefore(b,m.querySelector('.classic-audio-controls'));b.onclick=()=>start()}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanPipeGame={start,stop,makeRound,rotate,flow,solved,apply,validTurns,routeGuide,enhance};
})();