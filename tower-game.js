(()=>{'use strict';
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh,audio=window.YanClassicAudio;
const MAX=24;let epoch=0;
function config(n){n=Math.max(1,Math.min(MAX,Math.round(Number(n)||1)));return {level:n,goal:3+Math.floor((n-1)/6),speed:0.28+(n-1)*0.012};}
function intersection(left,width,targetLeft,targetWidth){return Math.max(0,Math.min(left+width,targetLeft+targetWidth)-Math.max(left,targetLeft));}
function award(n){const done=Array.isArray(state.ytowerDone)?state.ytowerDone.filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX):[];const fresh=!done.includes(n);if(fresh){state.ytowerDone=[...done,n];state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}state.ytowerLevel=n===MAX?1:n+1;state.ytowerCheckpoint=null;persist();return fresh;}
function start(requested,reset){
 epoch++;const run=epoch;audio?.unlock?.();
 const n=Math.max(1,Math.min(MAX,Math.round(Number(requested===undefined?state.ytowerLevel:requested)||1))),cfg=config(n);
 const cp=!reset&&requested===undefined?state.ytowerCheckpoint:null;
 let coop=cp&&cp.level===n&&typeof cp.coop==='boolean'?cp.coop:state.ytowerCoop===true;
 let colorMode=cp&&cp.level===n&&typeof cp.colorMode==='boolean'?cp.colorMode:state.ytowerColorMode===true;
 let selectedColor=cp&&cp.level===n&&typeof cp.selectedColor==='string'?cp.selectedColor:null;
 const COLORS=[['red','🔴','紅色'],['yellow','🟡','黃色'],['blue','🔵','藍色']];
 const targetColor=()=>COLORS[(n+layers.length*2)%3];
 let layers=cp&&cp.level===n&&Array.isArray(cp.layers)?cp.layers.filter(x=>Number.isFinite(x.left)&&Number.isFinite(x.width)&&x.width>=14&&x.width<=56).slice(0,cfg.goal):[];
 let left=layers.length?layers[layers.length-1].left:22,width=layers.length?layers[layers.length-1].width:56;
 let moving=0,dir=1,slow=!!(cp&&cp.level===n&&cp.slow),finished=false,paused=false,last=0,raf=0,busy=false;
 let magnets=cp&&cp.level===n&&Number.isInteger(cp.magnets)?Math.max(0,Math.min(2,cp.magnets)):2, lampState=null;
 let holdPointer=null,holdTimer=null,holdArmed=false,holdIgnoreClickUntil=0;
 let boardPointer=null,boardDragging=false,boardStartX=0,boardStartY=0,boardClickUntil=0;
 app.innerHTML='<section class="screen game classic-screen yt-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="yt-back">⌂</button><span class="chip">🏗️ 工地疊高塔</span><span class="chip">⭐ '+n+'/'+MAX+'</span><button class="iconbtn" id="yt-voice">🔊</button></header>'+
 '<main class="yt-stage allow-scroll"><div class="yt-banner">🚜 看準位置，按下「放下積木」！</div>'+
 '<div class="yt-coop"><button id="yt-coop" aria-pressed="'+coop+'">👩‍👦 親子接力：'+(coop?'開':'關')+'</button><button id="yt-color-mode" aria-pressed="'+colorMode+'">🌈 彩虹任務：'+(colorMode?'開':'關')+'</button><div id="yt-turn" role="status" aria-live="polite"></div></div>'+
 '<div class="yt-status" id="yt-status" role="status" aria-live="polite">🧱 疊好 '+cfg.goal+' 層就過關！</div>'+
 '<div class="yt-color-task" id="yt-color-task" hidden><div class="yt-color-hint" id="yt-color-hint"></div><div class="yt-colors" id="yt-colors"><button data-yt-color="red" aria-label="紅色積木">🔴</button><button data-yt-color="yellow" aria-label="黃色積木">🟡</button><button data-yt-color="blue" aria-label="藍色積木">🔵</button></div></div>'+ 
 '<div class="yt-progress" id="yt-progress"></div><button type="button" class="yt-lamp" id="yt-lamp" aria-label="等綠燈亮起後，點這裡放下積木" aria-live="off">🟠 等綠燈再放</button>'+
 '<div class="yt-board" id="yt-board" role="button" tabindex="0" aria-label="點擊放下積木，或拖曳積木後放開"><div class="yt-cloud">☁️ ☁️</div><div class="yt-hook">🏗️</div><div class="yt-guide" id="yt-guide"></div><div class="yt-stack" id="yt-stack"></div><div class="yt-moving" id="yt-moving"></div><div class="yt-ground">🚜 🏠 🌳</div></div>'+
 '<div class="yt-controls"><button class="yt-drop" id="yt-drop">🧱 放下積木！</button><button id="yt-slow" aria-pressed="'+slow+'">🐢 慢速：'+(slow?'開':'關')+'</button></div>'+
 '<div class="yt-actions"><button id="yt-undo" aria-label="收回上一層積木">↶ 收回上一層</button><button id="yt-pause">⏸️ 暫停</button><button id="yt-retry">🔄 重玩</button><button class="yt-magnet" id="yt-magnet">🧲 磁鐵幫忙 ×2</button></div>'+
 '<div class="yt-tip">👆 在高塔畫面左右拖曳積木，放開就放下；點一下也能立即放。長按按鈕可等 🟢 綠燈自動放！</div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="yt-home">⌂ 首頁</button><button class="footbtn yellow" id="yt-menu">🎲 其他遊戲</button></footer></section>';
 const el=id=>app.querySelector('#'+id),status=el('yt-status'),stack=el('yt-stack'),block=el('yt-moving'),guide=el('yt-guide');
 function save(){if(run!==epoch||finished)return;state.ytowerLevel=n;state.ytowerCoop=coop;state.ytowerCheckpoint={level:n,layers:layers.map(x=>({...x})),slow,coop,magnets,colorMode,selectedColor};persist()}
 function updateLamp(){const ok=intersection(moving,width,left,width)>=Math.max(14,width*.36);if(ok===lampState)return;lampState=ok;const lamp=el('yt-lamp');lamp.textContent=ok?'🟢 對準了！點我放下！':'🟠 等綠燈再放';lamp.setAttribute('aria-label',ok?'積木已對準，點這裡放下':'尚未對準，請等待綠燈');lamp.classList.toggle('yt-ready',ok)}
 function paint(){
  el('yt-progress').textContent='🏗️ '+layers.length+' / '+cfg.goal+' 層　'+('⭐'.repeat(layers.length));
  el('yt-turn').textContent=coop?'輪到 '+(layers.length%2===0?'🚜 彥彥':'👩 媽媽')+' 放積木　🚜 '+Math.ceil(layers.length/2)+' 層 · 👩 '+Math.floor(layers.length/2)+' 層':'🚜 彥彥自己蓋高塔';
  el('yt-coop').setAttribute('aria-pressed',String(coop));
  el('yt-coop').textContent='👩‍👦 親子接力：'+(coop?'開':'關');
  el('yt-color-mode').setAttribute('aria-pressed',String(colorMode));el('yt-color-mode').textContent='🌈 彩虹任務：'+(colorMode?'開':'關');
  const task=el('yt-color-task');task.hidden=!colorMode;
  if(colorMode){const target=targetColor();el('yt-color-hint').textContent='找出 '+target[1]+' '+target[2]+'積木，再放下！';
   app.querySelectorAll('[data-yt-color]').forEach(b=>{b.setAttribute('aria-pressed',String(selectedColor===b.dataset.ytColor));b.classList.toggle('yt-correct',selectedColor===target[0]&&selectedColor===b.dataset.ytColor)})}
  el('yt-drop').textContent=holdArmed?'🟢 等綠燈，自動放！':coop?(layers.length%2===0?'🚜 彥彥放下！':'👩 媽媽放下！'):'🧱 放下積木！';
  stack.innerHTML=layers.map((b,i)=>'<div class="yt-layer" style="left:'+b.left+'%;width:'+b.width+'%;bottom:'+(i*36)+'px;background:hsl('+((i*38+34)%360)+' 86% 67%)"></div>').join('');
  guide.style.left=left+'%';guide.style.width=width+'%';guide.style.bottom=(layers.length*36+5)+'px';
  block.style.width=width+'%';block.style.left=moving+'%';block.style.bottom=(layers.length*36+50)+'px';
  el('yt-drop').disabled=finished||busy||paused;
  el('yt-undo').disabled=finished||busy||paused||layers.length===0;
  el('yt-magnet').disabled=finished||busy||paused||magnets===0;
  el('yt-magnet').textContent='🧲 磁鐵幫忙 ×'+magnets;
  updateLamp();
 }
 function finish(){
  finished=true;cancelAnimationFrame(raf);const fresh=award(n);audio?.play?.('win');fx('win');vib([20,30,20]);say('太棒了！高塔完成！');
  const overlay=document.createElement('div');overlay.className='overlay';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🏗️ 高塔完成！</h2><p>'+(coop?'🚜 彥彥與 👩 媽媽合作完成！<br>':'')+(fresh?'獲得三顆星星！':'又成功了！')+'</p><button class="primary" id="yt-next">▶️ 下一關</button><button class="classic-secondary" id="yt-again">🔄 再玩一次</button><button class="classic-secondary" id="yt-other">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#yt-next').onclick=()=>start(n===MAX?1:n+1,true);
  overlay.querySelector('#yt-again').onclick=()=>start(n,true);
  overlay.querySelector('#yt-other').onclick=()=>{epoch++;window.YanClassics.menu()};
 }
 function drop(){
  if(finished||busy||paused||run!==epoch)return false;
  if(colorMode&&selectedColor!==targetColor()[0]){status.textContent='🌈 先選對 '+targetColor()[1]+' 積木！';fx('error');say('先找出'+targetColor()[2]+'積木');return false;}
  const hit=intersection(moving,width,left,width),needed=Math.max(14,width*.36);
  busy=true;el('yt-drop').disabled=true;block.classList.add('yt-falling');audio?.play?.('hit');vib(9);
  setTimeout(()=>{
   if(run!==epoch)return;
   block.classList.remove('yt-falling');
   if(hit<needed){status.textContent='💨 積木掉下去了，再看準一點！';say('再試一次！');vib([35,30,35]);moving=0;dir=1;}
   else{
    const newLeft=Math.max(moving,left),newWidth=hit;
    layers.push({left:Math.round(newLeft*100)/100,width:Math.round(newWidth*100)/100});selectedColor=null;
    left=newLeft;width=newWidth;
    status.textContent='🎉 '+(coop?(layers.length%2===1?'彥彥':'媽媽')+'疊得好！':'疊得好！')+'還差 '+(cfg.goal-layers.length)+' 層';
    if(layers.length>=cfg.goal){finish();return;}
    moving=0;dir=1;save();fx('good');if(colorMode)say('下一塊請找'+targetColor()[2]+'積木');
   }
   busy=false;paint();
  },260);
  return true;
 }
 function undo(){
  if(finished||busy||paused||run!==epoch||layers.length===0)return false;
  layers.pop();const prev=layers[layers.length-1];
  left=prev?prev.left:22;width=prev?prev.width:56;
  moving=0;dir=1;last=0;selectedColor=null;lampState=null;
  save();paint();status.textContent='↶ 收回上一層！重新對準，再放下積木！';
  audio?.play?.('hit');vib(8);return true;
 }
 function stopHold(showCancel){
  if(holdTimer!==null){clearTimeout(holdTimer);holdTimer=null;}
  const wasArmed=holdArmed;holdArmed=false;holdPointer=null;
  const btn=el('yt-drop');btn.classList.remove('yt-holding');
  btn.textContent=coop?(layers.length%2===0?'🚜 彥彥放下！':'👩 媽媽放下！'):'🧱 放下積木！';
  if(showCancel&&wasArmed&&!busy&&!finished)status.textContent='👆 已取消等綠燈，點一下仍可立即放！';
 }
 function tick(t){
  if(run!==epoch||finished)return;
  if(!last)last=t;const dt=Math.min(48,Math.max(0,t-last));last=t;
  if(!paused&&!busy&&!boardDragging){moving+=dir*cfg.speed*(slow?.42:1)*dt/16.67;if(moving>=100-width){moving=100-width;dir=-1}if(moving<=0){moving=0;dir=1}block.style.left=moving+'%';}
  updateLamp();
  if(holdArmed&&!busy&&!paused&&intersection(moving,width,left,width)>=Math.max(14,width*.36)){
   holdIgnoreClickUntil=Date.now()+1100;stopHold(false);drop();
  }
  raf=requestAnimationFrame(tick);
 }
 el('yt-lamp').onclick=()=>{if(finished||busy||paused||run!==epoch)return;if(!lampState){status.textContent='🟠 還沒對準，等綠燈亮起再點！';vib(6);return;}drop();};
 el('yt-magnet').onclick=()=>{if(finished||busy||paused||run!==epoch||magnets<1)return;if(colorMode&&selectedColor!==targetColor()[0]){status.textContent='🌈 先選對 '+targetColor()[1]+' 積木，才使用磁鐵！';return;}magnets--;moving=left;save();paint();status.textContent='🧲 磁鐵幫你對準了！';drop()};
 const dropBtn=el('yt-drop');
 dropBtn.onpointerdown=e=>{
  if(run!==epoch||finished||busy||paused||e.isPrimary===false||holdPointer!==null)return;
  holdIgnoreClickUntil=0;holdPointer=e.pointerId??0;
  holdTimer=setTimeout(()=>{
   holdTimer=null;
   if(run!==epoch||holdPointer===null||finished||busy||paused)return;
   holdArmed=true;holdIgnoreClickUntil=Date.now()+1100;
   dropBtn.classList.add('yt-holding');dropBtn.textContent='🟢 等綠燈，自動放！';
   status.textContent='🎯 保持按住，綠燈亮起就幫你放下！';vib(8);
  },320);
 };
 dropBtn.onpointerup=e=>{
  if(holdPointer===null||(e.pointerId??0)!==holdPointer)return;
  if(holdArmed)holdIgnoreClickUntil=Date.now()+1100;
  stopHold(true);
 };
 dropBtn.onpointercancel=e=>{if(holdPointer!==null&&(e.pointerId??0)===holdPointer)stopHold(true)};
 dropBtn.onlostpointercapture=e=>{if(holdPointer!==null&&(e.pointerId??0)===holdPointer)stopHold(true)};
 dropBtn.onclick=e=>{if(e&&e.detail>0&&Date.now()<holdIgnoreClickUntil)return;drop()};
 const board=el('yt-board');
 function boardMove(e){
  const r=board.getBoundingClientRect();if(!r.width)return;
  moving=Math.max(0,Math.min(100-width,(e.clientX-r.left)/r.width*100-width/2));
  block.style.left=moving+'%';updateLamp();
 }
 function clearBoardDrag(){
  boardPointer=null;boardDragging=false;board.classList.remove('yt-dragging');last=0;
 }
 board.addEventListener('pointerdown',e=>{
  if(boardPointer!==null||finished||busy||paused||run!==epoch||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  boardPointer=e.pointerId??0;boardStartX=e.clientX;boardStartY=e.clientY;
  try{board.setPointerCapture(e.pointerId)}catch(_){}
 });
 board.addEventListener('pointermove',e=>{
  if(boardPointer===null||(e.pointerId??0)!==boardPointer)return;
  if(!boardDragging&&Math.hypot(e.clientX-boardStartX,e.clientY-boardStartY)>=12){
   boardDragging=true;board.classList.add('yt-dragging');
   status.textContent='👆 左右拖曳對準，放開就疊上去！';
  }
  if(boardDragging){boardMove(e);e.preventDefault();}
 });
 board.addEventListener('pointerup',e=>{
  if(boardPointer===null||(e.pointerId??0)!==boardPointer)return;
  const wasDragging=boardDragging;
  if(wasDragging){boardMove(e);boardClickUntil=Date.now()+900;}
  clearBoardDrag();
  if(wasDragging){e.preventDefault();drop();}
 });
 ['pointercancel','lostpointercapture'].forEach(type=>board.addEventListener(type,e=>{
  if(boardPointer===null||(e.pointerId??0)!==boardPointer)return;
  if(boardDragging){boardClickUntil=Date.now()+900;status.textContent='👆 已取消拖曳，再試一次！';}
  clearBoardDrag();
 }));
 board.onclick=e=>{if(e&&e.detail>0&&Date.now()<boardClickUntil)return;drop()};
 app.querySelectorAll('[data-yt-color]').forEach(b=>b.onclick=()=>{if(finished||busy||paused)return;selectedColor=b.dataset.ytColor;save();paint();if(selectedColor===targetColor()[0]){status.textContent='🎉 選對顏色！現在放下積木！';fx('good')}else{status.textContent='👀 再找找 '+targetColor()[1]+' 積木';fx('error');say('請找'+targetColor()[2])}});
 el('yt-board').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();drop()}};
 el('yt-coop').onclick=()=>{if(finished)return;coop=!coop;state.ytowerCoop=coop;state.ytowerCheckpoint=null;persist();start(n,true)};
 el('yt-color-mode').onclick=()=>{if(finished)return;colorMode=!colorMode;state.ytowerColorMode=colorMode;state.ytowerCheckpoint=null;persist();start(n,true)};
 el('yt-undo').onclick=undo;
 el('yt-slow').onclick=()=>{slow=!slow;el('yt-slow').textContent='🐢 慢速：'+(slow?'開':'關');el('yt-slow').setAttribute('aria-pressed',String(slow));save()};
 el('yt-pause').onclick=()=>{paused=!paused;el('yt-pause').textContent=paused?'▶️ 繼續':'⏸️ 暫停';last=0;paint()};
 el('yt-retry').onclick=()=>start(n,true);
 el('yt-voice').onclick=()=>{audio?.unlock?.();say('看準積木位置，按放下積木，疊高高！')};
 el('yt-back').onclick=el('yt-menu').onclick=()=>{epoch++;cancelAnimationFrame(raf);window.YanClassics.menu()};
 el('yt-home').onclick=()=>{epoch++;cancelAnimationFrame(raf);renderHome()};
 paint();save();raf=requestAnimationFrame(tick);if(colorMode)say('彩虹任務開始！先找'+targetColor()[2]+'積木，再看準綠燈放下！');else say(coop?'親子接力蓋高塔！彥彥先放，媽媽接著放！看到綠燈就放下！':'工地疊高塔！看到綠燈再放積木，也可以按磁鐵幫忙！');
}
const hub=window.YanGameHub;if(hub&&Array.isArray(hub.groups)){const g=hub.groups.find(x=>x[0]==='build');if(g&&!g[4].some(x=>x[3]==='YanTowerGame'))g[4].push(['🏗️','工地疊高塔','看準位置，堆高積木','YanTowerGame'])}
window.YanTowerGame={start,config,intersection,award,MAX};
})();