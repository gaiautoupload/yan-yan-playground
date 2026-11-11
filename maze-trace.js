(()=>{'use strict';
// v40: finger-following maze control. Uses the existing maze's move/collision rules.
const app=document.querySelector('#app');if(!app)return;
const active=new WeakSet();
function connect(grid){
 if(active.has(grid))return;active.add(grid);
 const shell=grid.closest('.maze-shell');
 const tip=document.createElement('div');tip.className='maze-trace-guide';tip.setAttribute('role','status');tip.textContent='👆 按住挖土機，沿著通道拖曳！';
 const status=shell.querySelector('.maze-status');if(status)status.insertAdjacentElement('afterend',tip);
 let gesture=null,ignoreClickUntil=0;
 const cellAt=(x,y)=>{
  const hit=document.elementFromPoint(x,y);
  return hit&&grid.contains(hit)?hit.closest('.maze-cell[data-cell]'):null;
 };
 function stepTo(cell){
  const player=grid.querySelector('.maze-player[data-cell]');if(!player||!cell||!grid.contains(cell))return false;
  const from=Number(player.dataset.cell),to=Number(cell.dataset.cell);
  const n=Number(getComputedStyle(grid).getPropertyValue('--maze-size'));
  if(!Number.isInteger(n)||n<2||!Number.isInteger(from)||!Number.isInteger(to))return false;
  const dr=Math.floor(to/n)-Math.floor(from/n),dc=to%n-from%n;
  if(Math.abs(dr)+Math.abs(dc)!==1)return false;
  const side=dr===-1?'Top':dr===1?'Bottom':dc===1?'Right':'Left';
  if(parseFloat(player.style['border'+side+'Width'])>0){
   grid.classList.remove('maze-trace-blocked');void grid.offsetWidth;grid.classList.add('maze-trace-blocked');
   tip.textContent='🧱 前面有牆！換條路走';return false;
  }
  cell.click();
  gesture.moved=true;gesture.steps++;
  tip.textContent='🚜 正在開車！已走 '+gesture.steps+' 格';
  return true;
 }
 grid.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||!e.target.closest('.maze-player'))return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,steps:0};
  grid.classList.add('maze-tracing');
  try{grid.setPointerCapture(e.pointerId)}catch(_){}
 },true);
 grid.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id||!grid.isConnected)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  const player=grid.querySelector('.maze-player');if(!player)return;
  const step=Math.max(5,player.getBoundingClientRect().width*.32);
  const count=Math.max(1,Math.min(90,Math.ceil(Math.hypot(dx,dy)/step)));
  for(let i=1;i<=count;i++){
   const cell=cellAt(gesture.x+dx*i/count,gesture.y+dy*i/count);
   if(cell)stepTo(cell);
  }
  gesture.x=e.clientX;gesture.y=e.clientY;
  if(gesture.moved)e.preventDefault();
 },{passive:false});
 function end(e){
  if(!gesture||e.pointerId!==gesture.id)return;
  if(gesture.moved){e.stopImmediatePropagation();ignoreClickUntil=performance.now()+420;
   tip.textContent='🌟 走得好！繼續找寶石，開回家！';
  }else tip.textContent='👆 沿著通道拖曳，或按方向鍵';
  gesture=null;grid.classList.remove('maze-tracing');
 }
 grid.addEventListener('pointerup',end,true);
 grid.addEventListener('pointercancel',end,true);
 grid.addEventListener('lostpointercapture',e=>{if(gesture&&e.pointerId===gesture.id){gesture=null;grid.classList.remove('maze-tracing')}},true);
 grid.addEventListener('click',e=>{
  if(e.isTrusted&&performance.now()<ignoreClickUntil){e.preventDefault();e.stopImmediatePropagation()}
 },true);
}
function scan(){const grid=app.querySelector('#maze-grid');if(grid)connect(grid)}
const observer=new MutationObserver(scan);observer.observe(app,{childList:true,subtree:true});scan();
window.YanMazeTrace={scan,stepRule:(walls,from,to,n)=>{
 const dr=Math.floor(to/n)-Math.floor(from/n),dc=to%n-from%n;
 if(Math.abs(dr)+Math.abs(dc)!==1)return false;
 const bit=dr===-1?1:dr===1?4:dc===1?2:8;
 return (walls[from]&bit)===0;
}};
})();

;(()=>{'use strict';
// v157: Optional tap-to-drive mode; legal shortest paths reuse the original maze click/move/save rules.
function shortestPath(walls,from,to,n,blocked=[]){
 if(!Number.isInteger(n)||n<2||!Array.isArray(walls)||walls.length!==n*n||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=n*n||to>=n*n)return null;
 const deny=new Set(blocked);
 if(deny.has(to))return null;
 if(from===to)return [];
 const prev=Array(n*n).fill(-1),queue=[from];prev[from]=from;
 const dirs=[[-1,0,1,4],[0,1,2,8],[1,0,4,1],[0,-1,8,2]];
 for(let head=0;head<queue.length;head++){
  const cur=queue[head],r=Math.floor(cur/n),c=cur%n;
  for(const [dr,dc,wall,opposite] of dirs){
   const nr=r+dr,nc=c+dc;if(nr<0||nr>=n||nc<0||nc>=n)continue;
   const next=nr*n+nc;if(prev[next]!==-1||deny.has(next)||(walls[cur]&wall)||(walls[next]&opposite))continue;
   prev[next]=cur;if(next===to){const path=[];let at=to;while(at!==from){path.push(at);at=prev[at]}return path.reverse()}
   queue.push(next);
  }
 }
 return null;
}
window.YanMazeAutoRoute={shortestPath};
const app=document.querySelector('#app');if(!app)return;
const connected=new WeakSet();
function connect(grid){
 if(connected.has(grid))return;
 const shell=grid.closest('.maze-shell'),tools=shell&&shell.querySelector('.maze-guide-tools');
 if(!tools)return;connected.add(grid);
 const button=document.createElement('button');button.type='button';button.className='maze-auto-button';button.textContent='👆 點格子自動開車';button.setAttribute('aria-pressed','false');tools.appendChild(button);
 const tip=document.createElement('div');tip.className='maze-auto-status';tip.setAttribute('role','status');tip.setAttribute('aria-live','polite');tip.textContent='先按「點格子自動開車」，再點想去的格子';tools.insertAdjacentElement('afterend',tip);
 let enabled=false,stepping=false,timer=0,run=0;
 function cancel(){run++;if(timer)clearTimeout(timer);timer=0;stepping=false}
 button.addEventListener('click',()=>{
  cancel();enabled=!enabled;button.setAttribute('aria-pressed',String(enabled));button.textContent=enabled?'🟢 自動開車中 · 點我關閉':'👆 點格子自動開車';
  grid.classList.toggle('maze-auto-active',enabled);
  tip.textContent=enabled?'👆 點任何通道格子，挖土機會沿路開過去！':'👆 已關閉自動開車，繼續用手指拖曳';
 });
 grid.addEventListener('click',e=>{
  if(!enabled||stepping)return;
  const cell=e.target.closest&&e.target.closest('.maze-cell[data-cell]');
  if(!cell||!grid.contains(cell))return;
  e.preventDefault();e.stopImmediatePropagation();cancel();
  const player=grid.querySelector('.maze-player[data-cell]');
  const n=parseInt(getComputedStyle(grid).getPropertyValue('--maze-size'),10);
  const from=player&&Number(player.dataset.cell),to=Number(cell.dataset.cell);
  const cells=Array.from(grid.querySelectorAll('.maze-cell[data-cell]'));
  if(!Number.isInteger(from)||!Number.isInteger(to)||!Number.isInteger(n)||cells.length!==n*n){tip.textContent='🚜 迷宮正在更新，請再點一次';return}
  if(cell.classList.contains('maze-locked')){tip.textContent='💎 先找齊寶石，再開到小房子！';return}
  const walls=cells.map(x=>(parseFloat(x.style.borderTopWidth)>0?1:0)|(parseFloat(x.style.borderRightWidth)>0?2:0)|(parseFloat(x.style.borderBottomWidth)>0?4:0)|(parseFloat(x.style.borderLeftWidth)>0?8:0));
  const blocked=[]; // The house can be traversed before all gems; only victory is locked.
  const path=shortestPath(walls,from,to,n,blocked);
  if(path===null){tip.textContent='🧱 沒有通道可以到那裡，換個格子！';return}
  if(!path.length){tip.textContent='🚜 挖土機已經在這一格！';return}
  tip.textContent='🚜 出發！沿著通道開 '+path.length+' 格';
  const ticket=run;
  function advance(){
   if(ticket!==run||!enabled||!grid.isConnected)return;
   const next=path.shift(),target=grid.querySelector('.maze-cell[data-cell="'+next+'"]');
   if(!target){tip.textContent='🚜 關卡已更新，請重新選目的地';return}
   stepping=true;try{target.click()}finally{stepping=false}
   const current=grid.querySelector('.maze-player[data-cell]');
   if(!current||Number(current.dataset.cell)!==next){tip.textContent='🧱 前面無法通過，請換條路';return}
   if(path.length){timer=setTimeout(advance,145)}else{timer=0;tip.textContent='🌟 到達目的地！繼續找寶石！'}
  }
  advance();
 },true);
}
function scan(){const grid=app.querySelector('#maze-grid');if(grid)connect(grid)}
const observer=new MutationObserver(scan);observer.observe(app,{childList:true,subtree:true});scan();
})();

;(()=>{'use strict';
// v246: choose slow/normal/fast speed for gem auto-drive, including live changes while running and paused; never affects manual driving or saves.
// v213: keep pause/resume clicks from being mistaken for external manual input (real Chromium E2E fix).
// v212: pause/resume one-tap gem collection without resetting the route; retains legal cell.click(), cancel and saved progress.
// v196: one-tap collect all gems and return home, with cancelable chaining. Uses existing legal maze cell.click(), preserving original scoring and save.
const app=document.querySelector('#app'),route=window.YanMazeAutoRoute;
if(!app||!route||typeof route.shortestPath!=='function')return;
const linked=new WeakSet();
function plan(walls,from,treasures,goal,n,blocked){
 const targets=treasures.length?treasures:[goal];
 let best=null;
 for(const target of targets){
  const path=route.shortestPath(walls,from,target,n,blocked);
  if(path!==null&&(!best||path.length<best.path.length))best={target,path};
 }
 return best;
}
window.YanMazeGemPilot={plan};
function connect(grid){
 if(linked.has(grid))return;
 const shell=grid.closest('.maze-shell'),tools=shell&&shell.querySelector('.maze-guide-tools');
 if(!tools)return;
 linked.add(grid);
 const button=document.createElement('button');
 button.type='button';button.className='maze-auto-button maze-gem-button';
 button.textContent='🏁 全部收齊回家';button.setAttribute('aria-label','自動收齊寶石再回家，可隨時停車');
 tools.appendChild(button);
 const pauseButton=document.createElement('button');pauseButton.type='button';pauseButton.className='maze-auto-button maze-pause-button';pauseButton.textContent='⏸ 暫停';pauseButton.disabled=true;pauseButton.setAttribute('aria-label','暫停或繼續自動收集寶石');tools.appendChild(pauseButton);
 const stepButton=document.createElement('button');stepButton.type='button';stepButton.className='maze-auto-button maze-step-button';stepButton.textContent='👣 幫我走一步';stepButton.setAttribute('aria-label','朝最近寶石或小房子走一格');tools.appendChild(stepButton);
 const speeds=[{name:'🐢 慢慢開',ms:300},{name:'🚜 正常速度',ms:150},{name:'⚡ 快快開',ms:80}];
 let speedIndex=1;
 const speedButton=document.createElement('button');speedButton.type='button';speedButton.className='maze-auto-button maze-speed-button';
 speedButton.textContent='🚦 '+speeds[speedIndex].name;speedButton.setAttribute('aria-label','切換自動開車速度，慢慢開、正常速度、快快開');
 speedButton.setAttribute('aria-live','polite');tools.appendChild(speedButton);
 const tip=document.createElement('div');
 tip.className='maze-auto-status maze-gem-status';tip.setAttribute('role','status');tip.setAttribute('aria-live','polite');
 tip.textContent='🏁 按一下，挖土機會收齊寶石再回家！';
 tools.insertAdjacentElement('afterend',tip);
 let running=false,paused=false,stepping=false,timer=0,ticket=0,pending=null;
 speedButton.addEventListener('click',()=>{speedIndex=(speedIndex+1)%speeds.length;speedButton.textContent='🚦 '+speeds[speedIndex].name;tip.textContent='🚦 已改成'+speeds[speedIndex].name+'！'+(paused?'按繼續再出發！':running?'下一格開始套用新速度！':'按全部收齊回家試試！')});
 function schedule(next,delay){pending=next;timer=setTimeout(()=>{timer=0;pending=null;if(!paused)next()},delay)}
 pauseButton.addEventListener('click',()=>{
  if(!running)return;
  if(!paused){paused=true;if(timer)clearTimeout(timer);timer=0;pauseButton.textContent='▶️ 繼續';button.textContent='⏹ 結束';tip.textContent='⏸ 已暫停，按「繼續」從這格接著開！'}
  else{paused=false;pauseButton.textContent='⏸ 暫停';button.textContent='⏹ 停車';tip.textContent='🚜 繼續出發！';if(pending){const next=pending;pending=null;schedule(next,50)}}
 });
 function stop(message){
  ticket++;if(timer)clearTimeout(timer);timer=0;pending=null;running=false;paused=false;stepping=false;
  pauseButton.disabled=true;pauseButton.textContent='⏸ 暫停';button.textContent='🏁 全部收齊回家';
  if(message)tip.textContent=message;
 }
 stepButton.addEventListener('click',()=>{
  if(running||timer)stop('👣 改成一步一步走！');
  const auto=tools.querySelector('.maze-auto-button[aria-pressed="true"]');
  if(auto)auto.click();
  const cells=Array.from(grid.querySelectorAll('.maze-cell[data-cell]'));
  const n=parseInt(getComputedStyle(grid).getPropertyValue('--maze-size'),10);
  const player=grid.querySelector('.maze-player[data-cell]');
  if(!player||!Number.isInteger(n)||n<2||cells.length!==n*n){tip.textContent='🚜 迷宮正在更新，請再試一次';return}
  const from=Number(player.dataset.cell);
  const treasures=cells.filter(x=>x.classList.contains('maze-treasure')).map(x=>Number(x.dataset.cell));
  const home=grid.querySelector('.maze-goal[data-cell]');
  if(!home){tip.textContent='🏠 找不到小房子，請重新進入關卡';return}
  const walls=cells.map(x=>(parseFloat(x.style.borderTopWidth)>0?1:0)|(parseFloat(x.style.borderRightWidth)>0?2:0)|(parseFloat(x.style.borderBottomWidth)>0?4:0)|(parseFloat(x.style.borderLeftWidth)>0?8:0));
  const route=plan(walls,from,treasures,Number(home.dataset.cell),n,[]);
  if(!route){tip.textContent='🧱 找不到可走的通道，換個方向試試';return}
  if(!route.path.length){tip.textContent='🌟 已經到達目的地！';return}
  const next=route.path[0],target=grid.querySelector('.maze-cell[data-cell="'+next+'"]');
  if(!target){tip.textContent='🚜 迷宮正在更新，請再按一次';return}
  target.click();
  const after=grid.querySelector('.maze-player[data-cell]');
  if(after&&Number(after.dataset.cell)===next){
   tip.textContent=treasures.length?'💎 走對了！再按一次找寶石':'🏠 再按一次，繼續開回家！';
  }else if(grid.isConnected){tip.textContent='🧱 這一步被擋住了，試試方向鍵！'}
 });
 button.addEventListener('click',()=>{
  if(timer&&!running){clearTimeout(timer);timer=0}
  if(running){stop('🛑 已停車，可以自己開！');return}
  const auto=tools.querySelector('.maze-auto-button:not(.maze-gem-button)');
  if(auto&&auto.getAttribute('aria-pressed')==='true')auto.click();
  const cells=Array.from(grid.querySelectorAll('.maze-cell[data-cell]'));
  const n=parseInt(getComputedStyle(grid).getPropertyValue('--maze-size'),10);
  const player=grid.querySelector('.maze-player[data-cell]');
  if(!player||!Number.isInteger(n)||n<2||cells.length!==n*n){tip.textContent='🚜 迷宮正在更新，請再試一次';return}
  const from=Number(player.dataset.cell);
  const treasures=cells.filter(x=>x.classList.contains('maze-treasure')).map(x=>Number(x.dataset.cell));
  const goalCell=grid.querySelector('.maze-goal[data-cell]');
  if(!goalCell){tip.textContent='🏠 找不到小房子，請重新進入關卡';return}
  const goal=Number(goalCell.dataset.cell);
  const walls=cells.map(x=>(parseFloat(x.style.borderTopWidth)>0?1:0)|(parseFloat(x.style.borderRightWidth)>0?2:0)|(parseFloat(x.style.borderBottomWidth)>0?4:0)|(parseFloat(x.style.borderLeftWidth)>0?8:0));
  const blocked=[]; // The house can be traversed before all gems; only victory is locked.
  const result=plan(walls,from,treasures,goal,n,blocked);
  if(!result){tip.textContent='🧱 暫時沒有可走的通道，請用方向鍵試試';return}
  if(!result.path.length){tip.textContent='🌟 已到達目的地！';return}
  const path=result.path.slice();
  running=true;paused=false;pauseButton.disabled=false;pauseButton.textContent='⏸ 暫停';button.textContent='⏹ 停車';
  tip.textContent=treasures.length?'💎 出發找寶石！還有 '+path.length+' 格':'🏠 寶石收齊！開車回家！';
  const currentTicket=++ticket;
  function advance(){
   if(!running||paused||currentTicket!==ticket||!grid.isConnected)return;
   const next=path.shift(),target=grid.querySelector('.maze-cell[data-cell="'+next+'"]');
   if(!target){stop('🚜 關卡已更新，請再按一次');return}
   stepping=true;try{target.click()}finally{stepping=false}
   const current=grid.querySelector('.maze-player[data-cell]');
   if(!current||Number(current.dataset.cell)!==next){stop('🧱 前面不能通過，請自己開看看');return}
   if(path.length){
    tip.textContent='🚜 還有 '+path.length+' 格就到啦！';
    schedule(advance,speeds[speedIndex].ms);
   }else if(next===goal&&!grid.querySelectorAll('.maze-treasure').length){
    stop('🏠 寶石收齊，成功回家！');
   }else{
    stop('💎 找到寶石！自動繼續找下一顆');
    const resumeTicket=ticket;
    timer=setTimeout(()=>{timer=0;if(ticket===resumeTicket&&grid.isConnected)button.click()},220);
   }
  }
  advance();
 });
 grid.addEventListener('pointerdown',()=>{if(running||timer)stop('👆 換你自己開車！')},true);
 grid.addEventListener('click',()=>{if((running&&!stepping)||(!running&&timer))stop('👆 換你自己開車！')},true);
 shell.addEventListener('click',e=>{
  if((running||timer)&&e.target!==button&&e.target!==pauseButton&&e.target!==speedButton&&!grid.contains(e.target))stop('👆 已切換手動操作');
 },true);
}
function scan(){const grid=app.querySelector('#maze-grid');if(grid)connect(grid)}
new MutationObserver(scan).observe(app,{childList:true,subtree:true});scan();
})();


;(()=>{'use strict';
// v247: Show a legal, non-moving route to the nearest gem (or home) as a child-friendly visual hint.
const app=document.querySelector('#app'),routing=window.YanMazeAutoRoute;
if(!app||!routing||typeof routing.shortestPath!=='function')return;
const linked=new WeakSet();
function chooseRoute(walls,from,treasures,goal,n){
 let best=null;
 for(const to of (treasures.length?treasures:[goal])){
  const path=routing.shortestPath(walls,from,to,n,[]);
  if(path!==null&&(!best||path.length<best.path.length))best={to,path};
 }
 return best;
}
function connect(grid){
 if(linked.has(grid))return;
 const shell=grid.closest('.maze-shell'),tools=shell&&shell.querySelector('.maze-guide-tools');
 if(!tools)return;
 linked.add(grid);
 const button=document.createElement('button');
 button.type='button';button.className='maze-auto-button maze-route-preview-button';
 button.textContent='🔦 看路線';button.setAttribute('aria-pressed','false');
 button.setAttribute('aria-label','顯示到最近寶石或家的安全路線，不會自動移動');
 tools.appendChild(button);
 const tip=document.createElement('div');
 tip.className='maze-route-preview-status';tip.setAttribute('role','status');tip.setAttribute('aria-live','polite');
 tip.textContent='🔦 不知道往哪開？按「看路線」亮出通道！';
 tools.insertAdjacentElement('afterend',tip);
 let enabled=false,queued=false;
 function clear(){
  for(const cell of grid.querySelectorAll('.maze-route-hint,.maze-route-hint-next,.maze-route-hint-goal')){
   cell.classList.remove('maze-route-hint','maze-route-hint-next','maze-route-hint-goal');
  }
 }
 function paint(){
  queued=false;if(!enabled||!grid.isConnected)return;
  clear();
  const cells=Array.from(grid.querySelectorAll('.maze-cell[data-cell]'));
  const n=parseInt(getComputedStyle(grid).getPropertyValue('--maze-size'),10);
  const player=grid.querySelector('.maze-player[data-cell]');
  const goal=grid.querySelector('.maze-goal[data-cell]');
  if(!player||!goal||!Number.isInteger(n)||n<2||cells.length!==n*n){
   tip.textContent='🔦 迷宮正在更新，請稍後再看路線';return;
  }
  const from=Number(player.dataset.cell),home=Number(goal.dataset.cell);
  const treasures=cells.filter(cell=>cell.classList.contains('maze-treasure')).map(cell=>Number(cell.dataset.cell));
  const walls=cells.map(cell=>
   (parseFloat(cell.style.borderTopWidth)>0?1:0)|
   (parseFloat(cell.style.borderRightWidth)>0?2:0)|
   (parseFloat(cell.style.borderBottomWidth)>0?4:0)|
   (parseFloat(cell.style.borderLeftWidth)>0?8:0));
  const result=chooseRoute(walls,from,treasures,home,n);
  if(!result){tip.textContent='🧱 目前沒有可通行路線，試試方向鍵';return}
  if(!result.path.length){tip.textContent=treasures.length?'💎 寶石就在這裡！':'🏠 已經到家啦！';return}
  for(const index of result.path){
   const cell=cells[index];if(cell)cell.classList.add('maze-route-hint');
  }
  const first=cells[result.path[0]],last=cells[result.path[result.path.length-1]];
  if(first)first.classList.add('maze-route-hint-next');
  if(last)last.classList.add('maze-route-hint-goal');
  tip.textContent=(treasures.length?'💎 黃色路線通往最近的寶石':'🏠 黃色路線帶你回家')+' · '+result.path.length+' 格，先走亮綠色那格！';
 }
 function queue(){
  if(!enabled||queued)return;
  queued=true;setTimeout(()=>{if(grid.isConnected)paint();else queued=false},0);
 }
 button.addEventListener('click',()=>{
  enabled=!enabled;button.setAttribute('aria-pressed',String(enabled));
  button.textContent=enabled?'🔦 關閉路線':'🔦 看路線';
  if(enabled)paint();else{clear();tip.textContent='👆 已收起路線，自己試試走迷宮！'}
 });
 grid.addEventListener('click',queue);
 grid.addEventListener('pointerup',queue);
 new MutationObserver(queue).observe(grid,{childList:true,subtree:true});
}
function scan(){const grid=app.querySelector('#maze-grid');if(grid)connect(grid)}
new MutationObserver(scan).observe(app,{childList:true,subtree:true});scan();
window.YanMazeRoutePreview={chooseRoute,scan};
})();


;(()=>{'use strict';
// v324: a longer swipe from an empty maze tile drives several legal cells.
// Every step uses the original direction button, retaining walls, gems, undo, save and victory.
const app=document.querySelector('#app');if(!app)return;
const linked=new WeakSet();
const stepsForDistance=(distance,cellSize)=>Math.min(5,Math.max(1,1+Math.floor(Math.max(0,distance-26)/Math.max(28,cellSize*.85))));
function connect(grid){
 if(linked.has(grid))return;linked.add(grid);
 const shell=grid.closest('.maze-shell'),controls=shell&&shell.querySelector('.maze-controls');
 if(!controls)return;
 const tip=shell.querySelector('.maze-trace-guide');
 let gesture=null,ignoreClickUntil=0;const canceled=new Set();
 function reset(){if(gesture){const id=gesture.id;gesture=null;try{if(grid.hasPointerCapture(id))grid.releasePointerCapture(id)}catch(_){}}grid.classList.remove('maze-swipe-ready')}
 grid.addEventListener('pointerdown',e=>{
  if(gesture&&e.pointerId!==gesture.id){canceled.add(gesture.id);canceled.add(e.pointerId);reset();e.stopImmediatePropagation();return}
  if(gesture||!e.isPrimary||!['touch','pen'].includes(e.pointerType)||!e.target.closest?.('.maze-cell')||e.target.closest('.maze-player')||grid.classList.contains('maze-auto-active'))return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY};grid.classList.add('maze-swipe-ready');
  try{grid.setPointerCapture(e.pointerId)}catch(_){}
 },true);
 grid.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id)return;
  if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>18)e.preventDefault();
 },{passive:false});
 grid.addEventListener('pointerup',e=>{
  if(canceled.delete(e.pointerId)){e.preventDefault();e.stopImmediatePropagation();return}
  if(!gesture||e.pointerId!==gesture.id)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,distance=Math.hypot(dx,dy);
  const dir=Math.abs(dx)>Math.abs(dy)*1.15?(dx>0?'right':'left'):Math.abs(dy)>Math.abs(dx)*1.15?(dy>0?'down':'up'):null;
  reset();if(distance<26||!dir)return;
  const button=controls.querySelector('[data-dir="'+dir+'"]');if(!button||button.disabled)return;
  ignoreClickUntil=performance.now()+450;e.preventDefault();e.stopImmediatePropagation();
  const first=grid.querySelector('.maze-cell[data-cell]');
  const size=first?.getBoundingClientRect().width||45;
  const wanted=stepsForDistance(distance,size);let moved=0;
  for(let i=0;i<wanted;i++){
   if(!grid.isConnected)break;
   const before=grid.querySelector('.maze-player[data-cell]')?.dataset.cell;
   if(before===undefined)break;
   button.click();
   const after=grid.querySelector('.maze-player[data-cell]')?.dataset.cell;
   if(after===undefined||after===before)break;
   moved++;
   const player=grid.querySelector('.maze-player[data-cell]');
   if(player?.classList.contains('maze-goal')&&!grid.querySelector('.maze-treasure'))break;
  }
  if(tip)tip.textContent=moved?'🚜 一滑開了 '+moved+' 格！繼續找寶石！':'🧱 前面有牆，換個方向滑！';
 },true);
 grid.addEventListener('pointercancel',e=>{canceled.delete(e.pointerId);if(gesture&&e.pointerId===gesture.id)reset()},true);
 grid.addEventListener('lostpointercapture',e=>{if(gesture&&e.pointerId===gesture.id)reset()},true);
 grid.addEventListener('click',e=>{if(e.isTrusted&&performance.now()<ignoreClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
}
function scan(){const grid=app.querySelector('#maze-grid');if(grid)connect(grid)}
new MutationObserver(scan).observe(app,{childList:true,subtree:true});scan();
window.YanMazeSwipe={scan,stepsForDistance};
})();


;(()=>{'use strict';
// v365: Drive to exactly the next gem (or home when gems are gone), using original legal cell clicks.
const app=document.querySelector('#app'),routing=window.YanMazeAutoRoute;
if(!app||!routing||typeof routing.shortestPath!=='function')return;
const linked=new WeakSet();
function connect(grid){
 if(linked.has(grid))return;
 const shell=grid.closest('.maze-shell'),tools=shell&&shell.querySelector('.maze-guide-tools');
 if(!tools)return;linked.add(grid);
 const button=document.createElement('button');button.type='button';button.className='maze-auto-button maze-next-gem-button';
 button.textContent='💎 開到下一顆';button.setAttribute('aria-label','自動開到最近一顆寶石，沒有寶石就開回家，可隨時停止');button.setAttribute('aria-pressed','false');tools.appendChild(button);
 const tip=document.createElement('div');tip.className='maze-auto-status maze-next-gem-status';tip.setAttribute('role','status');tip.setAttribute('aria-live','polite');
 tip.textContent='💎 按一下，只開到下一顆寶石！';tools.insertAdjacentElement('afterend',tip);
 let running=false,stepping=false,timer=0,ticket=0;
 function stop(message){ticket++;if(timer)clearTimeout(timer);timer=0;running=false;stepping=false;button.textContent='💎 開到下一顆';button.setAttribute('aria-pressed','false');if(message)tip.textContent=message}
 button.addEventListener('click',()=>{
  if(running){stop('🛑 已停車，換你自己開！');return}
  const other=tools.querySelector('.maze-gem-button');
  if(other&&/停車|結束/.test(other.textContent))other.click();
  const auto=tools.querySelector('.maze-auto-button[aria-pressed="true"]');if(auto&&auto!==button)auto.click();
  const cells=Array.from(grid.querySelectorAll('.maze-cell[data-cell]'));
  const n=parseInt(getComputedStyle(grid).getPropertyValue('--maze-size'),10);
  const player=grid.querySelector('.maze-player[data-cell]'),home=grid.querySelector('.maze-goal[data-cell]');
  if(!player||!home||!Number.isInteger(n)||n<2||cells.length!==n*n){tip.textContent='🚜 迷宮正在更新，請再試一次';return}
  const from=Number(player.dataset.cell),treasures=cells.filter(x=>x.classList.contains('maze-treasure')).map(x=>Number(x.dataset.cell));
  const walls=cells.map(x=>(parseFloat(x.style.borderTopWidth)>0?1:0)|(parseFloat(x.style.borderRightWidth)>0?2:0)|(parseFloat(x.style.borderBottomWidth)>0?4:0)|(parseFloat(x.style.borderLeftWidth)>0?8:0));
  let best=null;
  for(const to of (treasures.length?treasures:[Number(home.dataset.cell)])){
   const path=routing.shortestPath(walls,from,to,n,[]);
   if(path!==null&&(!best||path.length<best.length))best=path;
  }
  if(!best){tip.textContent='🧱 找不到通道，試試方向鍵！';return}
  if(!best.length){tip.textContent='🌟 已經在目的地了！';return}
  const path=best.slice(),goingHome=!treasures.length;
  running=true;button.textContent='⏹ 停止這趟';button.setAttribute('aria-pressed','true');
  tip.textContent=goingHome?'🏠 開車回家！':'💎 出發找最近的寶石！';
  const run=++ticket;
  function advance(){
   if(!running||run!==ticket)return;
   if(!grid.isConnected){stop('🌟 關卡已切換，完成這趟！');return}
   const next=path.shift(),target=grid.querySelector('.maze-cell[data-cell="'+next+'"]');
   if(!target){stop('🚜 迷宮已更新，請再按一次');return}
   stepping=true;try{target.click()}finally{stepping=false}
   if(!grid.isConnected){stop('🎉 到達目的地，過關啦！');return}
   const current=grid.querySelector('.maze-player[data-cell]');
   if(!current||Number(current.dataset.cell)!==next){stop('🧱 前面不能通過，請自己開看看');return}
   if(path.length){tip.textContent='🚜 還有 '+path.length+' 格';timer=setTimeout(()=>{timer=0;advance()},160)}
   else stop(goingHome?'🏠 到家啦！':'💎 找到一顆！再按一次找下一顆！');
  }
  advance();
 });
 grid.addEventListener('pointerdown',()=>{if(running)stop('👆 換你自己開車！')},true);
 grid.addEventListener('click',()=>{if(running&&!stepping)stop('👆 換你自己開車！')},true);
 shell.addEventListener('click',e=>{if(running&&e.target!==button&&!grid.contains(e.target))stop('👆 已切換手動操作')},true);
}
function scan(){const grid=app.querySelector('#maze-grid');if(grid)connect(grid)}
new MutationObserver(scan).observe(app,{childList:true,subtree:true});scan();
window.YanMazeNextGem={scan};
})();
