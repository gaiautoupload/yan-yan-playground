(()=>{'use strict';
/* v381: Hold a gem or house 520ms to follow the full shortest route; short taps still navigate two slides. */
/* v270: Tap a gem or house directly for two-step assisted navigation; keyboard accessible. */
/* v206: One-tap full-route guided demonstration, interruptible by child controls.
   v137: Fill a playable shortest-route command queue without auto-playing.
   v50: Route-programming mode with eight commands, preview, execute, undo queue.
   v48: Visual ice-path guidance and single-step rescue demonstration.
   v47: Sliding-ice rescue. One swipe travels until an obstacle, not a maze step.
   Every stage is seeded, reproducible, and independently checked by BFS. */
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh;
const MAX=20,SIZE=7,ALL=SIZE*SIZE,DIRS=[[-1,0,'L','⬅️'],[0,-1,'U','⬆️'],[0,1,'D','⬇️'],[1,0,'R','➡️']];
function rand(seed){let a=seed>>>0;return ()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296}}
function slide(b,dir){
 const d=DIRS.find(x=>x[2]===dir);if(!d)return null;
 let pos=b.player,got=b.got||0;const path=[];
 while(true){
  const x=pos%SIZE+d[0],y=Math.floor(pos/SIZE)+d[1],p=y*SIZE+x;
  if(x<0||x>=SIZE||y<0||y>=SIZE||b.walls.includes(p))break;
  pos=p;path.push(p);const gem=b.gems.indexOf(p);if(gem>=0)got|=1<<gem;
 }
 if(!path.length)return null;
 return {...b,player:pos,got,steps:(b.steps||0)+1,path};
}
const won=b=>b.player===b.exit&&b.got===(1<<b.gems.length)-1;
function solve(b){
 const seen=new Set(),queue=[[b,'']];let head=0;
 while(head<queue.length){
  const [node,path]=queue[head++],key=node.player+':'+node.got;
  if(seen.has(key))continue;seen.add(key);
  if(won(node))return path;
  for(const d of DIRS){const next=slide(node,d[2]);if(next&&!seen.has(next.player+':'+next.got))queue.push([next,path+d[2]])}
 }
 return null;
}
function nextGuide(b){
 const path=solve(b);if(path===null||!path.length)return null;
 const next=slide(b,path[0]);return next?{dir:path[0],board:next,remaining:path.length-1}:null;
}
/* v49: BFS route to a chosen stop, gem or fully collected exit. */
function routeTo(b,target){
 if(!Number.isInteger(target)||target<0||target>=ALL||b.walls.includes(target))return null;
 const gem=b.gems.indexOf(target),exit=target===b.exit;
 const done=x=>exit?won(x):gem>=0?!!(x.got&(1<<gem)):x.player===target;
 if(done(b))return '';
 const seen=new Set([b.player+':'+b.got]),q=[[b,'']];let head=0;
 while(head<q.length){
  const [node,path]=q[head++];
  for(const d of DIRS){const next=slide(node,d[2]);if(!next)continue;
   const key=next.player+':'+next.got;if(seen.has(key))continue;
   const route=path+d[2];if(done(next))return route;
   seen.add(key);q.push([next,route]);}
 }return null;
}
function makeLevel(n){
 const level=Math.max(1,Math.min(MAX,Math.round(Number(n)||1)));
 const rng=rand((0x7A1C23+level*7919)>>>0);
 const perimeter=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(x===0||y===0||x===SIZE-1||y===SIZE-1)perimeter.push(y*SIZE+x);
 const inner=[];for(let y=1;y<SIZE-1;y++)for(let x=1;x<SIZE-1;x++)inner.push(y*SIZE+x);
 for(let attempt=0;attempt<1200;attempt++){
  const shuffled=inner.slice().sort(()=>rng()-.5); // deterministic seeded shuffle
  const wallCount=3+Math.min(6,Math.floor((level-1)/3));
  const walls=perimeter.concat(shuffled.slice(0,wallCount));
  const floor=inner.filter(x=>!walls.includes(x));
  const picks=floor.slice();for(let i=picks.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[picks[i],picks[j]]=[picks[j],picks[i]]}
  const gemCount=level<=6?1:level<=14?2:3;
  const b={level,walls,player:picks[0],exit:picks[1],gems:picks.slice(2,2+gemCount),got:0,steps:0};
  const path=solve(b);
  if(path&&path.length>=Math.min(5,3+Math.floor(level/7))&&path.length<=23)return {...b,ideal:path.length};
 }
 // Deterministic fallback is itself verified; no unplayable board is shipped.
 const walls=perimeter.concat([16,24,32]),b={level,walls,player:8,exit:40,gems:[10],got:0,steps:0};
 const path=solve(b);if(path===null)throw Error('Ice stage generator could not find a solvable level '+level);
 return {...b,ideal:path.length};
}
function save(b){
 state.iceRescueCheckpoint={level:b.level,player:b.player,got:b.got,steps:b.steps};
 persist();
}
function restore(level){
 const b=makeLevel(level),c=state.iceRescueCheckpoint;
 if(!c||c.level!==level||!Number.isInteger(c.player)||!Number.isInteger(c.got)||!Number.isInteger(c.steps)||c.steps<0||c.steps>9999||c.got<0||c.got>(1<<b.gems.length)-1||b.walls.includes(c.player))return b;
 return {...b,player:c.player,got:c.got,steps:c.steps};
}
function award(level){
 const done=Array.isArray(state.iceRescueCompleted)?state.iceRescueCompleted.filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX):[];
 const fresh=!done.includes(level);
 if(fresh){state.iceRescueCompleted=[...done,level];state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}
 state.iceRescueLevel=level>=MAX?1:level+1;state.iceRescueCheckpoint=null;persist();return fresh;
}
let generation=0;
function stop(){generation++}
function start(requested){
 stop();const token=generation,level=Math.max(1,Math.min(MAX,Math.round(Number(requested)||Number(state.iceRescueLevel)||1)));
 let board=requested===undefined?restore(level):makeLevel(level),history=[],finished=false,hint=null,trail=[],guideTrail=[],navMode=false,navTarget=-1,autoId=0,lastSwipe=0,planMode=false,planRunning=false,planQueue=[],planTrail=[],demoRunning=false;
 state.iceRescueLevel=level;save(board);
 app.innerHTML='<section class="screen game classic-screen ice-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="ice-back" aria-label="回推箱子">❮</button><span class="chip">🧊 冰面救援</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="ice-voice" aria-label="聽玩法">🔊</button></header>'+
 '<main class="ice-stage"><div class="ice-family"><img src="./assets/mom.webp" alt="媽媽"><strong>點寶物滑兩段，按住滑到底！</strong><img src="./assets/kid.webp" alt="彥彥"></div>'+
 '<div class="ice-progress"><span id="ice-gems">💎 0/1</span><span id="ice-steps">🛷 0 次</span><span id="ice-best">🎯</span></div>'+
 '<div id="ice-board" class="ice-board" role="group" aria-label="滑冰地圖"></div>'+
 '<div id="ice-tip" class="ice-tip" role="status" aria-live="polite">👆 點寶物滑兩段；按住半秒一路滑到寶物！</div>'+
 '<div class="ice-directions" role="group" aria-label="滑行方向"><button data-ice="L" aria-label="向左滑">⬅️</button><button data-ice="U" aria-label="向上滑">⬆️</button><button data-ice="D" aria-label="向下滑">⬇️</button><button data-ice="R" aria-label="向右滑">➡️</button></div>'+
 '<div id="ice-plan-panel" class="ice-plan" hidden><div class="ice-plan-label">🧠 先排好方向，再一起滑！<span id="ice-plan-queue" aria-live="polite">尚未排路線</span></div><div class="ice-plan-actions"><button id="ice-plan-fill">✨ 幫我排</button><button id="ice-plan-run">▶️ 開始滑</button><button id="ice-plan-pop">↩️ 少一步</button><button id="ice-plan-clear">🗑️ 清空</button></div></div>'+ 
 '<div class="ice-tools"><button id="ice-plan-toggle" aria-pressed="false">🧠 排路線</button><button id="ice-nav" aria-pressed="false">🎯 點格導航</button><button id="ice-undo" aria-label="回上一步">↩️ 復原</button><button id="ice-hint" aria-label="看下一次滑行的完整路線">💡 看路線</button><button id="ice-assist" aria-label="幫我滑正確的一步">👣 走一步</button><button id="ice-demo" aria-pressed="false" aria-label="媽媽示範整條路線，再按一次可停止">🎬 媽媽示範</button><button id="ice-reset">🔄 重來</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="ice-home">⌂ 首頁</button><button class="footbtn yellow" id="ice-push">🚜 推箱子</button></footer></section>';
 const grid=app.querySelector('#ice-board'),tip=app.querySelector('#ice-tip');
 function paint(){
  const walls=new Set(board.walls);
  grid.innerHTML=Array.from({length:ALL},(_,i)=>{
   const wall=walls.has(i),player=i===board.player,exit=i===board.exit,gem=board.gems.indexOf(i),found=gem>=0&&!!(board.got&(1<<gem));
   const ico=wall?'🧱':player?'🚜':gem>=0&&!found?'💎':exit?'🏠':'';
   const cls=wall?'ice-wall':player?'ice-player':gem>=0&&!found?'ice-gem':exit?'ice-exit':'ice-floor';
   return '<div data-ice-cell="'+i+'" class="ice-cell '+cls+((gem>=0&&!found||exit)?' ice-tap-goal':'')+(trail.includes(i)?' ice-trail':'')+(guideTrail.includes(i)?' ice-guide-trail':'')+(guideTrail.length&&i===guideTrail[guideTrail.length-1]?' ice-guide-target':'')+(navMode&&i===navTarget?' ice-nav-target':'')+(planTrail.includes(i)?' ice-plan-trail':'')+(planTrail.length&&i===planTrail[planTrail.length-1]?' ice-plan-target':'')+'"'+((gem>=0&&!found||exit)?' role="button" tabindex="0"':'')+' aria-label="'+(wall?'牆':player?'彥彥挖土機':exit?'回家出口':gem>=0&&!found?'寶石':'冰面')+'">'+ico+'</div>';
  }).join('');
  app.querySelector('#ice-gems').textContent='💎 '+board.gems.filter((_,i)=>board.got&(1<<i)).length+'/'+board.gems.length;
  app.querySelector('#ice-steps').textContent='🛷 '+board.steps+' 次';
  app.querySelector('#ice-best').textContent='🎯 '+board.ideal+' 次';
  app.querySelectorAll('[data-ice]').forEach(btn=>btn.classList.toggle('ice-recommended',btn.dataset.ice===hint));
  renderPlan();
 }
 function cancelAuto(){autoId++;planRunning=false;demoRunning=false;const b=app.querySelector('#ice-demo');if(b){b.textContent='🎬 媽媽示範';b.setAttribute('aria-pressed','false')}}
 function planSimulation(){
  let b=board;const cells=[];
  for(const d of planQueue){const next=slide(b,d);if(!next)return null;cells.push(...next.path);b=next}
  return {board:b,cells};
 }
 function renderPlan(){
  const panel=app.querySelector('#ice-plan-panel');if(!panel)return;
  panel.hidden=!planMode;
  const icons={L:'⬅️',U:'⬆️',D:'⬇️',R:'➡️'};
  app.querySelector('#ice-plan-queue').textContent=planQueue.length?planQueue.map(d=>icons[d]).join(' ')+' ('+planQueue.length+'/8)':'尚未排路線';
  for(const id of ['ice-plan-run','ice-plan-pop','ice-plan-clear'])app.querySelector('#'+id).disabled=planRunning||!planQueue.length;
  app.querySelector('#ice-plan-fill').disabled=planRunning||finished||planQueue.length>=8;
 }
 function clearPlan(){planQueue=[];planTrail=[];renderPlan()}
 function enqueue(dir){
  if(finished||planRunning)return false;
  if(planQueue.length>=8){tip.textContent='🧠 最多先排八步，按開始滑吧！';return false}
  const sim=planSimulation();
  if(!sim||won(sim.board)){tip.textContent='🏠 路線已經到家，按開始滑吧！';return false}
  const next=slide(sim.board,dir);
  if(!next){tip.textContent='🧱 這一步會撞牆，換個方向！';fx('error');return false}
  planQueue.push(dir);const check=planSimulation();planTrail=check.cells;hint=null;guideTrail=[];paint();
  tip.textContent=won(check.board)?'🏠 路線排好了！按開始滑！':'🧠 已排 '+planQueue.length+' 步，還能繼續加方向！';fx('tap');return true;
 }
 function fillShortestPlan(){
  if(finished||planRunning||!planMode)return false;
  const sim=planSimulation();
  if(!sim){tip.textContent='🧱 目前路線有障礙，先少一步！';fx('error');return false}
  if(won(sim.board)){tip.textContent='🏠 已經排到家！按開始滑！';return false}
  const path=solve(sim.board);
  if(path===null){tip.textContent='🤔 這裡沒有可行路線，先復原！';fx('error');return false}
  const count=Math.min(8-planQueue.length,path.length);
  if(count<=0){tip.textContent='🧠 八步已滿，按開始滑！';return false}
  planQueue.push(...path.slice(0,count).split(''));
  const result=planSimulation();if(!result)throw Error('Generated ice route invalid');
  planTrail=result.cells;hint=null;guideTrail=[];paint();
  tip.textContent=won(result.board)?'🏠 路線排到家囉！按開始滑！':'✨ 幫你排了 '+count+' 步！按開始滑，還可以繼續排！';
  fx('tap');return true;
 }
 function chooseDirection(dir){return planMode?enqueue(dir):press(dir)}
 function runPlan(){
  if(finished||planRunning||!planQueue.length)return;
  cancelAuto();navTarget=-1;const id=autoId,commands=planQueue.slice();
  clearPlan();planRunning=true;renderPlan();tip.textContent='🚜 挖土機照排好的路線出發！';
  function step(i){
   if(id!==autoId||generation!==token||finished)return;
   if(i===commands.length){planRunning=false;renderPlan();tip.textContent='🧠 路線完成！再排下一段吧！';return}
   if(!press(commands[i],true)){planRunning=false;renderPlan();return}
   if(!finished)setTimeout(()=>step(i+1),330);
  }
  step(0);
 }
 function finish(){
  if(finished||generation!==token)return;
  finished=true;cancelAuto();const fresh=award(level);fx('win');vib([25,35,25]);say('彥彥滑冰成功！寶石都收集好了，回家囉！');
  const overlay=document.createElement('div');overlay.className='overlay';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🧊 滑冰救援成功！</h2><p>寶石全部帶回家！'+(fresh?'獲得三顆星星！':'再次挑戰成功！')+'</p><button class="primary" id="ice-next">▶️ 下一關</button><button class="classic-secondary" id="ice-again">🔄 再玩一次</button><button class="classic-secondary" id="ice-return">🚜 推箱子</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#ice-next').onclick=()=>start(level>=MAX?1:level+1);
  overlay.querySelector('#ice-again').onclick=()=>start(level);
  overlay.querySelector('#ice-return').onclick=back;
 }
 function press(dir,fromAuto=false){
  if(!fromAuto){cancelAuto();clearPlan()}
  if(finished||generation!==token)return false;
  const next=slide(board,dir);
  if(!next){tip.textContent='🧱 這邊有牆，換個方向滑！';fx('error');vib(10);return false}
  history.push(board);if(history.length>80)history.shift();
  const newly=next.got!==board.got;
  trail=next.path.slice();guideTrail=[];board=next;hint=null;save(board);paint();
  tip.textContent=newly?'💎 收到寶石！繼續滑到小房子！':'🧊 咻！滑了 '+trail.length+' 格！';
  fx(newly?'yay':'tap');vib(newly?18:8);
  if(won(board))finish();
  else setTimeout(()=>{if(generation===token&&!finished){trail=[];paint()}},380);
  return true;
 }
 function goTo(target,direct=false,full=false){
  if((!navMode&&!direct)||finished||planMode)return false;
  const path=routeTo(board,target);
  if(path===null){tip.textContent='🧱 這裡滑不到，選另一個格子！';fx('error');return false}
  if(!path){tip.textContent='🚜 已經到這裡了！';return true}
  cancelAuto();const id=autoId;navTarget=target;hint=null;guideTrail=[];paint();
  const steps=full?path:path.slice(0,2);
  tip.textContent=full?'🚜 按住成功！沿最短路線滑向目標，點方向鍵可接手！':'🎯 導航滑行中！一次最多兩段。';
  function step(i){
   if(id!==autoId||generation!==token||finished)return;
   if(i>=steps.length){navTarget=-1;paint();tip.textContent=full?'🎁 已滑到目標！繼續收集寶石！':'🎯 再點目標或自己滑行！';return}
   if(!press(steps[i],true)){cancelAuto();return}
   if(!finished)setTimeout(()=>step(i+1),210);
  }step(0);return true;
 }
 app.querySelector('#ice-plan-toggle').onclick=()=>{
  cancelAuto();planMode=!planMode;clearPlan();
  if(planMode){navMode=false;navTarget=-1;const nav=app.querySelector('#ice-nav');nav.setAttribute('aria-pressed','false');nav.textContent='🎯 點格導航'}
  const toggle=app.querySelector('#ice-plan-toggle');toggle.setAttribute('aria-pressed',String(planMode));toggle.textContent=planMode?'🧠 排路線中':'🧠 排路線';paint();
  tip.textContent=planMode?'🧠 點方向箭頭排路線，然後按開始滑！':'🧊 用方向鍵或手指滑行！';
  say(planMode?'先點箭頭排路線，再按開始滑。':'自己滑行囉！');
 };
 app.querySelector('#ice-plan-fill').onclick=fillShortestPlan;
 app.querySelector('#ice-plan-run').onclick=runPlan;
 app.querySelector('#ice-plan-pop').onclick=()=>{if(planRunning)return;planQueue.pop();const s=planSimulation();planTrail=s?s.cells:[];paint();tip.textContent='↩️ 已拿掉最後一步！'};
 app.querySelector('#ice-plan-clear').onclick=()=>{if(planRunning)return;clearPlan();paint();tip.textContent='🗑️ 路線清空，可以重新排！'};
 app.querySelector('#ice-nav').onclick=()=>{
  planMode=false;clearPlan();const toggle=app.querySelector('#ice-plan-toggle');toggle.setAttribute('aria-pressed','false');toggle.textContent='🧠 排路線';
  cancelAuto();navMode=!navMode;navTarget=-1;paint();
  const b=app.querySelector('#ice-nav');b.setAttribute('aria-pressed',String(navMode));
  b.textContent=navMode?'🎯 導航已開':'🎯 點格導航';
  tip.textContent=navMode?'🎯 點寶石、空地或小房子，挖土機會滑過去！':'🧊 使用方向鍵自己滑行！';
  say(navMode?'點想去的地方，挖土機帶你滑一小段。':'換成自己滑行囉！');
 };
 function chooseGoal(target){
  if(finished||planMode||Date.now()-lastSwipe<350||Date.now()<suppressGoalClickUntil)return false;
  const gem=board.gems.some((p,i)=>p===target&&!(board.got&(1<<i)));
  if(!navMode&&!gem&&target!==board.exit)return false;
  return goTo(target,!navMode);
 }
 grid.addEventListener('click',e=>{
  const c=e.target.closest('[data-ice-cell]');
  if(c)chooseGoal(Number(c.dataset.iceCell));
 });
 grid.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const c=e.target.closest('[data-ice-cell]');
  if(!c)return;
  const target=Number(c.dataset.iceCell);
  const gem=board.gems.some((p,i)=>p===target&&!(board.got&(1<<i)));
  if(navMode||gem||target===board.exit){e.preventDefault();chooseGoal(target)}
 });
 let touch=null,goalHold=null,suppressGoalClickUntil=0;
 function cancelGoalHold(){
  if(!goalHold)return;
  clearTimeout(goalHold.timer);
  goalHold.cell.classList.remove('ice-hold-target');
  goalHold=null;
 }
 grid.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||e.button>0)return;
  touch={id:e.pointerId,x:e.clientX,y:e.clientY};
  const cell=e.target.closest?.('[data-ice-cell]');
  if(!cell||finished||planMode||goalHold)return;
  const target=Number(cell.dataset.iceCell);
  const gem=board.gems.some((p,i)=>p===target&&!(board.got&(1<<i)));
  if(!navMode&&!gem&&target!==board.exit)return;
  const hold={id:e.pointerId,cell,x:e.clientX,y:e.clientY,target,timer:null};
  goalHold=hold;cell.classList.add('ice-hold-target');
  try{cell.setPointerCapture?.(e.pointerId)}catch(_){}
  hold.timer=setTimeout(()=>{
   if(goalHold!==hold||finished||planMode||generation!==token)return;
   goalHold=null;cell.classList.remove('ice-hold-target');
   suppressGoalClickUntil=Date.now()+800;lastSwipe=Date.now();
   const started=goTo(target,!navMode,true);
   if(started){fx('tap');vib(12)}
  },520);
 });
 grid.addEventListener('pointermove',e=>{
  const h=goalHold;
  if(h&&h.id===e.pointerId&&Math.hypot(e.clientX-h.x,e.clientY-h.y)>14)cancelGoalHold();
 });
 grid.addEventListener('pointerup',e=>{if(goalHold?.id===e.pointerId)cancelGoalHold()});
 grid.addEventListener('pointercancel',e=>{if(goalHold?.id===e.pointerId)cancelGoalHold()});
 grid.addEventListener('lostpointercapture',e=>{if(goalHold?.id===e.pointerId)cancelGoalHold()});
 grid.addEventListener('pointerup',e=>{
  if(!touch||touch.id!==e.pointerId)return;
  const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;
  if(Math.hypot(dx,dy)<24)return;
  lastSwipe=Date.now();chooseDirection(Math.abs(dx)>Math.abs(dy)?dx>0?'R':'L':dy>0?'D':'U');
 });
 grid.addEventListener('pointercancel',()=>{touch=null});
 app.querySelectorAll('[data-ice]').forEach(b=>b.onclick=()=>chooseDirection(b.dataset.ice));
 app.querySelector('#ice-undo').onclick=()=>{cancelAuto();clearPlan();if(finished||!history.length)return;board=history.pop();hint=null;trail=[];guideTrail=[];save(board);paint();tip.textContent='↩️ 回到上一步！'};
 app.querySelector('#ice-hint').onclick=()=>{
  if(finished)return;
  const guide=nextGuide(board);
  if(!guide){tip.textContent='🤔 先按復原或重來！';say('先按復原，重新找路！');return}
  hint=guide.dir;guideTrail=guide.board.path.slice();paint();
  const names={L:'左',R:'右',U:'上',D:'下'};
  tip.textContent='💡 看藍色滑行路線，往'+names[hint]+'邊滑，停在亮光位置！';
  say('彥彥，往'+names[hint]+'邊滑，看看藍色的路線！');
 };
 app.querySelector('#ice-assist').onclick=()=>{
  if(finished)return;
  const guide=nextGuide(board);
  if(!guide){tip.textContent='🤔 先按復原或重來！';say('先按復原，重新找路！');return}
  clearPlan();if(press(guide.dir)&&!finished){tip.textContent='👣 示範一步完成！輪到彥彥自己滑囉！';say('這一步完成了，輪到彥彥囉！')}
 };
 app.querySelector('#ice-demo').onclick=()=>{
  if(finished||generation!==token)return;
  if(demoRunning){cancelAuto();tip.textContent='⏹ 已停止示範，換彥彥自己滑！';return}
  const route=solve(board);
  if(route===null){tip.textContent='🤔 目前沒有到家的路，先復原或重玩！';fx('error');return}
  if(!route){tip.textContent='🏠 已經到家囉！';return}
  cancelAuto();clearPlan();navTarget=-1;hint=null;guideTrail=[];demoRunning=true;
  const id=autoId,button=app.querySelector('#ice-demo'),names={L:'左',R:'右',U:'上',D:'下'};
  button.textContent='⏹ 停止示範';button.setAttribute('aria-pressed','true');
  tip.textContent='🎬 媽媽示範 '+route.length+' 步，點停止或方向鍵就能自己玩！';
  say('媽媽來示範，看看挖土機怎麼滑到家！');
  let i=0;
  function tick(){
   if(id!==autoId||generation!==token||finished||!demoRunning)return;
   if(i>=route.length){cancelAuto();return}
   const dir=route[i++];
   if(!press(dir,true)){cancelAuto();tip.textContent='🧱 示範暫停，請自己試試！';return}
   if(!finished){tip.textContent='🎬 第 '+i+'/'+route.length+' 步，往'+names[dir]+'滑；點方向鍵可接手！';setTimeout(tick,480)}
  }
  tick();
 };
 app.querySelector('#ice-reset').onclick=()=>{cancelAuto();clearPlan();navTarget=-1;board=makeLevel(level);history=[];hint=null;trail=[];guideTrail=[];save(board);paint();tip.textContent='🔄 再來挑戰！'};
 app.querySelector('#ice-voice').onclick=()=>say('彥彥，點一下寶石或小屋滑兩段，按住半秒會沿最短路線一直滑到目標！挖土機在冰面上，一滑就會滑到底，撞到牆才停！收集所有寶石，再停在小房子上。可以按媽媽示範看完整路線，再按停止或方向鍵自己接手！');
 function back(){stop();window.YanPushBoxGame.start()}
 app.querySelector('#ice-back').onclick=back;app.querySelector('#ice-push').onclick=back;
 app.querySelector('#ice-home').onclick=()=>{stop();renderHome()};
 paint();say('彥彥，來玩冰面救援！點寶石或小屋滑兩段，按住半秒會一路滑到寶物，也能自己滑動收集寶石回家！');
}
window.YanIceRescue={start,stop,makeLevel,slide,solve,routeTo,nextGuide,won,save,restore,award};
})();