(()=>{
'use strict';
// v284: undo the most recent dig (including an accidental swipe) with immediate checkpoint persistence; no extra assist credits.
// v283: one-tap mom assist digs one real treasure per level, with checkpoint-safe usage and original scoring.
// v158: swipe-to-dig plus deterministic, resumable, touch-first excavator treasure dig. No original family images altered.
const sh=window.YanClassicShared,a=window.YanClassicAudio,photos=window.YanFamilyPhotos||[];
if(!sh||!a)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh;
const MAX=40,GOAL=3,PRIZES=['💎','🪙','🦕','⭐','🐚','🦴','🍓','🧸','🌈','🏆'];
function seeded(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296}}
function makeBoard(level){
 const n=level<=10?4:level<=25?5:6,rng=seeded(20261027+level*7919),cells=Array.from({length:n*n},(_,i)=>i);
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]]}
 return {size:n,treasures:cells.slice(0,GOAL).map((index,i)=>({index,icon:PRIZES[(level*3+i)%PRIZES.length]}))};
}
function evaluate(board,opened,index){
 if(opened.includes(index))return {kind:'repeat',found:board.treasures.filter(t=>opened.includes(t.index)).length};
 const treasure=board.treasures.find(t=>t.index===index),all=opened.concat(index),found=board.treasures.filter(t=>all.includes(t.index)).length;
 const unseen=board.treasures.filter(t=>!all.includes(t.index));
 const distance=unseen.length?Math.min(...unseen.map(t=>Math.abs(Math.floor(t.index/board.size)-Math.floor(index/board.size))+Math.abs(t.index%board.size-index%board.size))):0;
 return {kind:treasure?'treasure':'empty',icon:treasure?.icon||'🪨',found,complete:found===GOAL,distance};
}
function nextAssistTreasure(board,opened){return board.treasures.find(t=>!opened.includes(t.index))||null}
let generation=0,timers=[];
function stop(){generation++;timers.forEach(clearTimeout);timers=[]}
function later(fn,ms,token){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(generation===token)fn()},ms);timers.push(id)}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();a.unlock();const token=generation;
 const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.digLevel)||1));
 const board=makeBoard(level),valid=new Set(Array.from({length:board.size*board.size},(_,i)=>i));
 let opened=(requested===undefined&&Number(state.digCheckpointLevel)===level&&Array.isArray(state.digOpened))?state.digOpened.filter(x=>Number.isInteger(x)&&valid.has(x)):[];
 opened=[...new Set(opened)];
 let assisted=requested===undefined&&state.digAssistCheckpoint?.level===level&&state.digAssistCheckpoint.used===true;
 if(requested!==undefined)state.digAssistCheckpoint=null;
 state.digCheckpointLevel=level;state.digOpened=opened.slice();persist();
 const photo=photos[(level-1)%Math.max(photos.length,1)];
 app.innerHTML='<section class="screen game classic-screen dig-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="dig-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🚜 挖土機尋寶</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="dig-speak" aria-label="重播語音">🔊</button></header>'+
 '<main class="dig-stage allow-scroll"><div class="dig-hero"><img class="dig-excavator" src="./assets/excavator.webp" alt="挖土機"><div class="dig-hero-text"><strong>🚜 彥彥！挖出 3 個寶物！</strong><span>👆 點一下或按住滑過土塊 💎</span></div><img class="dig-family" id="dig-family" src="'+(photo?photo.scene:'./assets/family-home.webp')+'" alt="媽媽與彥彥"></div>'+
 '<div class="dig-info"><span id="dig-progress" aria-live="polite">💎 0 / 3</span><span id="dig-count">⛏️ 0 次挖掘</span></div>'+
 '<div class="dig-grid" id="dig-grid" style="--dig-cols:'+board.size+'" role="group" aria-label="挖土機尋寶土地"></div>'+
 '<div class="dig-message" id="dig-message" aria-live="polite">👆 點土地，或按住滑過土塊連續挖寶！</div>'+
 '<div class="dig-actions"><button id="dig-hint" type="button">🧭 寶物雷達</button><button id="dig-assist" type="button">👩 幫挖一格</button><button id="dig-undo" type="button" aria-label="撤銷上一格挖掘">↩️ 退一格</button><button id="dig-replay" type="button">🔊 聽媽媽說</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="dig-home">⌂ 首頁</button><button class="footbtn yellow" id="dig-retry">🔄 重玩</button></footer></section>';
 const grid=app.querySelector('#dig-grid'),message=app.querySelector('#dig-message'),hint=app.querySelector('#dig-hint'),assist=app.querySelector('#dig-assist'),undo=app.querySelector('#dig-undo');
 const photoEl=app.querySelector('#dig-family');photoEl.onerror=()=>{photoEl.onerror=null;photoEl.src='./assets/family-home.webp'};
 let finished=false,locked=false;
 function cue(){say('彥彥，開挖土機挖寶囉！點土地，或用手指滑過土塊，找出三個寶物！按雷達可以找到提示！')}
 function paint(){
  const found=board.treasures.filter(t=>opened.includes(t.index)).length;
  app.querySelector('#dig-progress').textContent='💎 '+found+' / '+GOAL;
  app.querySelector('#dig-count').textContent='⛏️ '+opened.length+' 次挖掘';
  grid.innerHTML=Array.from({length:board.size*board.size},(_,i)=>{
   const done=opened.includes(i),t=board.treasures.find(x=>x.index===i),icon=done?(t?t.icon:'🪨'):'🌱';
   return '<button type="button" class="dig-cell '+(done?(t?'dig-found':'dig-empty'):'')+'" data-dig="'+i+'" aria-label="'+(done?(t?'找到寶物':'挖過的土地'):'挖掘第'+(i+1)+'格')+'" '+(done?'disabled':'')+'><span>'+icon+'</span></button>';
  }).join('');
  undo.disabled=!opened.length||finished||locked;
  assist.disabled=assisted||finished||locked||!nextAssistTreasure(board,opened);
  assist.textContent=assisted?'👩 已幫挖過':'👩 幫挖一格';
 }
 function finish(){if(finished||generation!==token||board.treasures.some(t=>!opened.includes(t.index)))return;finished=true;locked=true;
  state.digLevel=Math.max(Number(state.digLevel)||1,Math.min(MAX,level+1));
  state.digCheckpointLevel=state.digLevel;state.digOpened=[];state.digAssistCheckpoint=null;
  state.digWins=(Number(state.digWins)||0)+1;state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();
  a.play('win');fx('win');vib([18,30,18]);say('太棒了！彥彥找到三個寶物！');
  const overlay=document.createElement('div');overlay.className='overlay';overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 尋寶成功！</h2><p>🚜 找到三個寶物！</p><button class="primary" id="dig-next">▶️ 下一關</button><button class="classic-secondary" id="dig-again">🔄 再挖一次</button><button class="classic-secondary" id="dig-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#dig-next').onclick=()=>start(level>=MAX?1:level+1);
  overlay.querySelector('#dig-again').onclick=()=>start(level);
  overlay.querySelector('#dig-menu').onclick=menu;
 }

 function dig(index){
  if(finished||locked||generation!==token||!Number.isInteger(index)||!valid.has(index))return false;
  const result=evaluate(board,opened,index);if(result.kind==='repeat')return false;
  a.unlock();opened.push(index);state.digCheckpointLevel=level;state.digOpened=opened.slice();persist();paint();
  if(result.kind==='treasure'){
   a.play('hit');fx('yay');vib([10,15,10]);message.textContent='🎉 挖到 '+result.icon+'！已找到 '+result.found+' 個！';
   if(result.complete){locked=true;later(finish,650,token)}
   else say('好棒！找到寶物了，再找找其他寶物！');
  }else{
   a.play('tap');vib(8);message.textContent=result.distance<=1?'🔥 很近了！寶物就在附近！':result.distance<=3?'✨ 附近有寶物，再挖挖看！':'🧭 按雷達找方向！';
  }
  return true;
 }
 // v158: One-finger continuous digging; regular taps and saved checkpoints still work.
 grid.style.touchAction='none';
 let sweep=null,suppressClickUntil=0;
 function cellAt(x,y){
  const node=document.elementFromPoint(x,y),cell=node&&node.closest&&node.closest('[data-dig]');
  return cell&&grid.contains(cell)?Number(cell.dataset.dig):null;
 }
 function stroke(x1,y1,x2,y2){
  const steps=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/9));
  for(let i=1;i<=steps;i++){
   if(locked||finished)break;
   const index=cellAt(x1+(x2-x1)*i/steps,y1+(y2-y1)*i/steps);
   if(index!==null)dig(index);
  }
 }
 grid.addEventListener('pointerdown',e=>{
  const cell=e.target.closest&&e.target.closest('[data-dig]');
  if(sweep||locked||finished||!cell||cell.disabled||(e.button!==undefined&&e.button!==0))return;
  sweep={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,start:Number(cell.dataset.dig),active:false};
 });
 grid.addEventListener('pointermove',e=>{
  if(!sweep||e.pointerId!==sweep.id||locked||finished)return;
  if(!sweep.active){
   if(Math.hypot(e.clientX-sweep.x,e.clientY-sweep.y)<12)return;
   sweep.active=true;
   try{grid.setPointerCapture&&grid.setPointerCapture(e.pointerId)}catch(_){}
   dig(sweep.start);
  }
  stroke(sweep.lastX,sweep.lastY,e.clientX,e.clientY);
  sweep.lastX=e.clientX;sweep.lastY=e.clientY;
  if(e.cancelable)e.preventDefault();
 });
 function endSweep(e,cancel){
  if(!sweep||e.pointerId!==sweep.id)return;
  if(sweep.active){
   if(!cancel&&!locked&&!finished)stroke(sweep.lastX,sweep.lastY,e.clientX,e.clientY);
   suppressClickUntil=Date.now()+350;
   try{if(grid.hasPointerCapture&&grid.hasPointerCapture(e.pointerId))grid.releasePointerCapture(e.pointerId)}catch(_){}
  }
  sweep=null;
 }
 grid.addEventListener('pointerup',e=>endSweep(e,false));
 grid.addEventListener('pointercancel',e=>endSweep(e,true));
 grid.addEventListener('lostpointercapture',e=>endSweep(e,true));
 grid.addEventListener('click',e=>{
  if(Date.now()<suppressClickUntil){e.preventDefault();return}
  const cell=e.target.closest&&e.target.closest('[data-dig]');
  if(cell)dig(Number(cell.dataset.dig));
 });
 hint.onclick=()=>{
  if(finished||locked||generation!==token)return;a.unlock();
  const remain=board.treasures.filter(t=>!opened.includes(t.index));if(!remain.length)return;
  const t=remain[0],button=grid.querySelector('[data-dig="'+t.index+'"]');if(!button)return;
  button.classList.add('dig-hinted');message.textContent='🧭 雷達發現寶物！找發光的土塊！';a.play('hit');vib(10);say('看！這一塊土地亮起來了，快去挖寶！');
  later(()=>button.classList.remove('dig-hinted'),1700,token);
 };
 assist.onclick=()=>{
  if(assisted||finished||locked||generation!==token)return;
  const target=nextAssistTreasure(board,opened);if(!target)return;
  assisted=true;state.digAssistCheckpoint={level,used:true};persist();
  if(!dig(target.index)){assisted=false;state.digAssistCheckpoint=null;persist();paint();return}
  message.textContent='👩 媽媽幫你挖到 '+target.icon+'！接著換你挖！';
  say('媽媽幫你挖到一個寶物，接下來換你找！');
 };
 undo.onclick=()=>{
  if(finished||locked||generation!==token||!opened.length)return;
  const index=opened.pop();state.digCheckpointLevel=level;state.digOpened=opened.slice();persist();paint();
  message.textContent='↩️ 第 '+(index+1)+' 格已復原！再試試別的地方！';a.play('tap');vib(8);
 };
 app.querySelector('#dig-back').onclick=menu;
 app.querySelector('#dig-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#dig-retry').onclick=()=>start(level);
 app.querySelector('#dig-speak').onclick=()=>{a.unlock();cue()};
 app.querySelector('#dig-replay').onclick=()=>{a.unlock();cue()};
 paint();if(board.treasures.every(t=>opened.includes(t.index)))later(finish,350,token);else cue();
}
function enhance(){const m=app.querySelector('.classic-menu');if(!m)return;
 m.classList.add('allow-scroll');
 if(!m.querySelector('#dig-entry')){
  const b=document.createElement('button');b.id='dig-entry';b.className='classic-tile dig-tile';b.setAttribute('aria-label','開始挖土機尋寶');
  b.innerHTML='<span class="classic-big">🚜💎</span><strong>挖土機尋寶</strong><span>⛏️ 🌱 💎</span><small>⭐ '+(Number(state.digLevel)||1)+' / '+MAX+'</small>';
  m.insertBefore(b,m.querySelector('.classic-audio-controls'));b.onclick=()=>start();
 }
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanDigGame={start,stop,makeBoard,evaluate,nextAssistTreasure,enhance};
})();