(()=>{'use strict';
/* v409: one-tap guided delivery of one crate to a goal; cancellable, all moves use original press/save/undo. */
/* v372: reversible redo after undo (including rewind of a push), persistent across reload. */
/* v370: tap empty target for safe one-push delivery, retaining manual controls and solver. */
/* v319: defer hold-release action until after native synthesized click to prevent overlay ghost-taps on 320px phones. */
/* v318: hold the guided step to auto-walk and push exactly one box on a safe shortest solution, with cancellation and undo preserved. */
/* v316: long-hold rewind the last crate push; retain v307 drag and legacy controls. */
/* v46: guided one-step Sokoban learning, preserving original mechanics and save key. */
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh;
const MAX=40;
const TEMPLATES=[
["######","#    #","# @$.#","#    #","#    #","######"],
["######","#    #","# @  #","# $  #","# .  #","######"],
["######","#    #","# @$ #","#  . #","#    #","######"],
["######","#    #","# @  #","# $ .#","#    #","######"],
["#######","#     #","# @   #","# $ # #","#   . #","#     #","#######"],
["#######","#     #","# @ $ #","# #   #","#   . #","#     #","#######"],
["#######","#     #","# @$$ #","#  .. #","#     #","#######"],
["#######","#     #","# @   #","# $ $ #","# . . #","#     #","#######"],
["#######","#     #","# @ $ #","# $   #","# . . #","#     #","#######"],
["#######","#     #","# @   #","# $$  #","#  .. #","#     #","#######"]
];
const DIRS=[[-1,0,'L','←'],[1,0,'R','→'],[0,-1,'U','↑'],[0,1,'D','↓']];
const clone=b=>({...b,boxes:b.boxes.slice()});
function rotate(rows){const h=rows.length,w=rows[0].length;return Array.from({length:w},(_,x)=>Array.from({length:h},(_,i)=>rows[h-i-1][x]).join(''))}
function makeLevel(level){
 const n=Math.max(1,Math.min(MAX,Math.round(Number(level)||1))),template=TEMPLATES[Math.floor((n-1)/4)];
 let rows=template.slice();for(let i=0;i<(n-1)%4;i++)rows=rotate(rows);
 const w=rows[0].length,h=rows.length,walls=[],goals=[],boxes=[];let player=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const c=rows[y][x],p=y*w+x;
  if(c==='#')walls.push(p);
  if(c==='.'||c==='+'||c==='*')goals.push(p);
  if(c==='$'||c==='*')boxes.push(p);
  if(c==='@'||c==='+')player=p;
 }
 return {level:n,w,h,walls,goals,boxes,player,steps:0,pushes:0};
}
function move(board,dir){
 const d=DIRS.find(x=>x[2]===dir);if(!d)return null;
 const x=board.player%board.w+d[0],y=Math.floor(board.player/board.w)+d[1];
 if(x<0||y<0||x>=board.w||y>=board.h)return null;
 const next=y*board.w+x;if(board.walls.includes(next))return null;
 const result=clone(board);result.player=next;result.steps=(board.steps||0)+1;
 const boxIndex=result.boxes.indexOf(next);
 if(boxIndex!==-1){
  const bx=x+d[0],by=y+d[1];if(bx<0||by<0||bx>=board.w||by>=board.h)return null;
  const far=by*board.w+bx;if(board.walls.includes(far)||result.boxes.includes(far))return null;
  result.boxes[boxIndex]=far;result.pushes=(board.pushes||0)+1;
 }
 return result;
}
const solved=b=>b.boxes.length===b.goals.length&&b.boxes.every(x=>b.goals.includes(x));
const key=b=>b.player+':'+b.boxes.slice().sort((a,b)=>a-b).join(',');
function solve(board,maxStates=30000){
 const queue=[[board,'']],seen=new Set([key(board)]);let head=0;
 while(head<queue.length&&head<maxStates){
  const [b,path]=queue[head++];if(solved(b))return path;
  for(const d of DIRS){const next=move(b,d[2]);if(!next)continue;const k=key(next);if(seen.has(k))continue;seen.add(k);queue.push([next,path+d[2]])}
 }
 return null;
}

/* v46: A single legal teaching step, recomputed from the CURRENT board.
   This is not auto-completion: the child requests each move. */
function guidedStep(b){
 const path=solve(b);
 if(path===null)return null;
 if(!path)return {dir:null,board:b,remaining:0};
 const next=move(b,path[0]);
 return next?{dir:path[0],board:next,remaining:path.length-1}:null;
}
function guideTile(b,dir){
 const d=DIRS.find(x=>x[2]===dir);if(!d)return -1;
 const x=b.player%b.w+d[0],y=Math.floor(b.player/b.w)+d[1];
 return x>=0&&x<b.w&&y>=0&&y<b.h?y*b.w+x:-1;
}
/* v45: Shortest safe walking route; never pushes a box automatically. */
function walkRoute(b,target){
 if(!Number.isInteger(target)||target<0||target>=b.w*b.h||b.walls.includes(target)||b.boxes.includes(target))return null;
 if(target===b.player)return '';
 const queue=[[b.player,'']],seen=new Set([b.player]);let head=0;
 while(head<queue.length){
  const [pos,path]=queue[head++];
  for(const [dx,dy,dir] of DIRS){
   const x=pos%b.w+dx,y=Math.floor(pos/b.w)+dy;
   if(x<0||x>=b.w||y<0||y>=b.h)continue;
   const next=y*b.w+x;
   if(seen.has(next)||b.walls.includes(next)||b.boxes.includes(next))continue;
   if(next===target)return path+dir;
   seen.add(next);queue.push([next,path+dir]);
  }
 }
 return null;
}
/* v136: tap a distant crate to walk behind it and make exactly one safe push. */
function planBoxPush(b,target,preferredDir=null){
 if(!b.boxes.includes(target))return null;
 const bx=target%b.w,by=Math.floor(target/b.w),plans=[];
 for(const [dx,dy,dir] of DIRS){
  if(preferredDir&&dir!==preferredDir)continue;
  const sx=bx-dx,sy=by-dy,fx=bx+dx,fy=by+dy;
  if(sx<0||sy<0||fx<0||fy<0||sx>=b.w||fx>=b.w||sy>=b.h||fy>=b.h)continue;
  const stand=sy*b.w+sx,dest=fy*b.w+fx;
  if(b.walls.includes(stand)||b.walls.includes(dest)||b.boxes.includes(stand)||b.boxes.includes(dest))continue;
  const route=walkRoute(b,stand);if(route===null)continue;
  let test=b;
  for(const d of route){test=move(test,d);if(!test)break}
  if(!test)continue;
  const after=move(test,dir);
  if(!after||after.pushes<=test.pushes)continue;
  if(!solved(after)&&solve(after,30000)===null)continue;
  plans.push({route,dir,stand,goal:b.goals.includes(dest),steps:route.length+1});
 }
 plans.sort((a,b)=>Number(b.goal)-Number(a.goal)||a.steps-b.steps);
 return plans[0]||null;
}
function checkpoint(level,b){
 state.pushBoxCheckpoint={level,player:b.player,boxes:b.boxes.slice(),steps:b.steps||0,pushes:b.pushes||0};persist();
}
function restore(level){
 const b=makeLevel(level),c=state.pushBoxCheckpoint;
 if(!c||c.level!==level||!Number.isInteger(c.player)||!Array.isArray(c.boxes)||c.boxes.length!==b.boxes.length)return b;
 const cells=[c.player,...c.boxes];
 if(cells.some(x=>!Number.isInteger(x)||x<0||x>=b.w*b.h||b.walls.includes(x))||new Set(c.boxes).size!==c.boxes.length||c.boxes.includes(c.player))return b;
 return {...b,player:c.player,boxes:c.boxes.slice(),steps:Math.max(0,Number(c.steps)||0),pushes:Math.max(0,Number(c.pushes)||0)};
}
function award(level){
 const done=Array.isArray(state.pushBoxCompleted)?state.pushBoxCompleted.filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX):[];
 const fresh=!done.includes(level);
 if(fresh){state.pushBoxCompleted=[...done,level];state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}
 state.pushBoxLevel=level>=MAX?1:level+1;state.pushBoxCheckpoint=null;state.pushBoxUndoHistory=null;state.pushBoxRedoHistory=null;persist();return fresh;
}
let generation=0,stopActiveHold=()=>{};
function stop(){generation++;stopActiveHold()}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();const token=generation;
 const level=Math.max(1,Math.min(MAX,Math.round(Number(requested)||Number(state.pushBoxLevel)||1)));
 let board=requested===undefined?restore(level):makeLevel(level),history=[],redo=[],finished=false,lastSwipe=0,ignoreGridClickUntil=0,walkId=0,walkTarget=-1,hintDir=null,hold=null,ignorePointerClickUntil=0,delivering=false;
 /* v267: restore the last 80 legal undo states after a reload, without changing the storage key. */
 const savedUndo=state.pushBoxUndoHistory,savedRedo=state.pushBoxRedoHistory,oldCheckpoint=state.pushBoxCheckpoint;
 if(requested===undefined&&oldCheckpoint&&oldCheckpoint.level===level&&savedUndo&&savedUndo.level===level&&Array.isArray(savedUndo.boards)&&savedUndo.boards.length<=80){
  const base=makeLevel(level),valid=s=>s&&Number.isInteger(s.player)&&s.player>=0&&s.player<base.w*base.h&&!base.walls.includes(s.player)&&Array.isArray(s.boxes)&&s.boxes.length===base.boxes.length&&new Set(s.boxes).size===s.boxes.length&&s.boxes.every(p=>Number.isInteger(p)&&p>=0&&p<base.w*base.h&&!base.walls.includes(p)&&p!==s.player)&&Number.isInteger(s.steps)&&s.steps>=0&&s.steps<=1000000&&Number.isInteger(s.pushes)&&s.pushes>=0&&s.pushes<=s.steps;
  if(savedUndo.boards.every(valid))history=savedUndo.boards.map(s=>({...base,player:s.player,boxes:s.boxes.slice(),steps:s.steps,pushes:s.pushes}));
  if(savedRedo&&savedRedo.level===level&&Array.isArray(savedRedo.boards)&&savedRedo.boards.length<=80&&savedRedo.boards.every(valid))redo=savedRedo.boards.map(s=>({...base,player:s.player,boxes:s.boxes.slice(),steps:s.steps,pushes:s.pushes}));
 }
 function saveHistory(){const pack=items=>({level,boards:items.slice(-80).map(s=>({player:s.player,boxes:s.boxes.slice(),steps:s.steps||0,pushes:s.pushes||0}))});state.pushBoxUndoHistory=pack(history);state.pushBoxRedoHistory=pack(redo);persist()}
 state.pushBoxLevel=level;checkpoint(level,board);saveHistory();
 app.innerHTML='<section class="screen game classic-screen push-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="push-back" aria-label="回遊戲世界">⌂</button><span class="chip">🚜 挖土機推箱子</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="push-voice" aria-label="聽說明">🔊</button></header>'+
 '<main class="push-stage"><div class="push-family"><img src="./assets/mom.webp" alt="媽媽"><strong>把 📦 推到 🎯 上！</strong><img src="./assets/kid.webp" alt="彥彥"></div>'+
 '<div class="push-progress"><span id="push-goals">🎯 0/1</span><span id="push-steps">🚜 0 步</span><button type="button" id="push-ice" aria-label="進入冰面救援">🧊 冰面救援</button></div>'+
 '<div class="push-board" id="push-board" role="group" aria-label="推箱子地圖"></div>'+
 '<div class="push-message" id="push-message" aria-live="polite">🎯 點目標幫送箱子！也可拖箱子、點箱子或按箭頭</div>'+
 '<div class="push-directions" role="group" aria-label="移動挖土機"><button data-dir="L" aria-label="向左">⬅️</button><button data-dir="U" aria-label="向上">⬆️</button><button data-dir="D" aria-label="向下">⬇️</button><button data-dir="R" aria-label="向右">➡️</button></div>'+
 '<div class="push-tools"><div class="push-history"><button id="push-undo" aria-label="點一下退一步，按住半秒撤回上一次推箱">↩️ 上一步<small>按住退一推</small></button><button type="button" id="push-redo" aria-label="重做剛剛撤銷的一步" disabled>↪️ 重做</button></div><button id="push-hint">💡 看提示</button><button id="push-assist" aria-label="點一下幫走一步，按住半秒放開幫推一個箱子">👣 幫我走一步<small>按住推一箱 📦</small></button><button type="button" id="push-deliver" aria-label="媽媽沿安全路線把一個箱子送到目標，再按可停止" aria-pressed="false">🎯 幫送一箱</button><button id="push-reset">🔄 重來</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="push-home">⌂ 首頁</button><button class="footbtn yellow" id="push-other">🎲 遊戲世界</button></footer></section>';
 const grid=app.querySelector('#push-board'),message=app.querySelector('#push-message');
 function cancelWalk(){walkId++;walkTarget=-1;delivering=false;const b=app.querySelector('#push-deliver');if(b){b.textContent='🎯 幫送一箱';b.setAttribute('aria-pressed','false')}}
 function stopHold(){
  if(!hold)return;
  clearTimeout(hold.timer);hold.button.classList.remove('push-holding');hold=null;
 }
 stopActiveHold=stopHold;
 function nextIsBox(dir){
  const d=DIRS.find(x=>x[2]===dir),x=board.player%board.w+d[0],y=Math.floor(board.player/board.w)+d[1];
  return x>=0&&y>=0&&x<board.w&&y<board.h&&board.boxes.includes(y*board.w+x);
 }
 function beginHold(e,button){
  if(e.isPrimary===false||hold||finished||generation!==token)return;
  const dir=button.dataset.dir;
  hold={id:e.pointerId,button,dir,timer:0};
  button.classList.add('push-holding');ignorePointerClickUntil=Date.now()+600;
  try{button.setPointerCapture?.(e.pointerId)}catch(_){}
  const before=board.pushes;
  if(!press(dir)||board.pushes>before||finished){stopHold();return}
  const id=e.pointerId;
  function repeat(){
   if(!hold||hold.id!==id||generation!==token||finished){stopHold();return}
   if(nextIsBox(dir)){message.textContent='📦 前面有箱子！放開再按一次推它！';stopHold();return}
   const pushes=board.pushes;
   if(!press(dir)||board.pushes>pushes||finished){stopHold();return}
   hold.timer=setTimeout(repeat,100);
  }
  hold.timer=setTimeout(repeat,300);
 }
 function autoWalk(target){
  const path=walkRoute(board,target);
  if(path===null){message.textContent=board.boxes.includes(target)?'📦 木箱要靠自己推，先走到旁邊！':'🧱 這裡走不到，換個位置！';return false}
  if(!path){message.textContent='🚜 已經到這裡囉！';return true}
  cancelWalk();hintDir=null;walkTarget=target;const seq=walkId;
  message.textContent='🚜 自動走路中，隨時可按方向鍵接手！';paint();
  function step(i){
   if(seq!==walkId||generation!==token||finished)return;
   if(i>=path.length){walkTarget=-1;paint();message.textContent='🚜 到達目的地！接著推箱子吧！';return}
   if(!press(path[i],true)){cancelWalk();paint();return}
   setTimeout(()=>step(i+1),125);
  }
  step(0);return true;
 }
 function autoPushBox(target,preferredDir=null){
  const plan=planBoxPush(board,target,preferredDir);
  if(!plan){message.textContent=preferredDir?'📦 這個方向不能安全推！換個方向或點箱子試試':'📦 這個箱子目前推不動！換個位置或按 ↩️ 上一步';fx('error');vib(12);return false}
  cancelWalk();hintDir=null;walkTarget=plan.stand;const seq=walkId;
  message.textContent='🚜 自動走到箱子旁，再幫你推一次！按方向鍵可接手';
  paint();
  function step(i){
   if(seq!==walkId||generation!==token||finished)return;
   if(i<plan.route.length){
    if(!press(plan.route[i],true)){cancelWalk();paint();return}
    setTimeout(()=>step(i+1),125);return;
   }
   if(!board.boxes.includes(target)||!press(plan.dir,true)){cancelWalk();paint();return}
   walkTarget=-1;paint();
   if(!finished)message.textContent='📦 成功推了一次！再點箱子或自己按箭頭';
  }
  step(0);return true;
 }
 /* v318: solve from the CURRENT board, execute only through the first box push.
    Each legal move uses press(), so history, checkpoints, stars and undo stay unchanged. */
 function autoPushNext(){
  stopHold();if(finished||generation!==token)return;
  cancelWalk();hintDir=null;
  const path=solve(board);
  if(path===null){paint();message.textContent='📦 箱子卡住了！先按上一步或重來';fx('error');say('箱子卡住了，先按上一步！');return}
  if(!path){finish();return}
  let test=board,firstPush=-1;
  for(let i=0;i<path.length;i++){
   const next=move(test,path[i]);if(!next)break;
   if(next.pushes>test.pushes){firstPush=i;break}
   test=next;
  }
  if(firstPush<0){message.textContent='🎯 找不到下一次安全推箱！';return}
  const route=path.slice(0,firstPush+1),seq=walkId;
  message.textContent='📦 媽媽幫你走到箱子旁，安全推一次！按方向鍵可以接手';
  function step(i){
   if(seq!==walkId||generation!==token||finished)return;
   if(i>=route.length)return;
   const pushes=board.pushes;
   if(!press(route[i],true)){cancelWalk();return}
   if(board.pushes>pushes){
    if(!finished)message.textContent='📦 已安全推一箱！換彥彥繼續，或再按住幫忙';
    return;
   }
   setTimeout(()=>step(i+1),115);
  }
  step(0);
 }

 /* v409: Guided one-crate delivery follows the existing shortest legal solution.
    Stop at the first newly occupied goal, not at the end of the level.
    Each step passes through press() for checkpoint, undo, redo and star integrity. */
 function autoDeliverOne(){
  stopHold();
  if(finished||generation!==token)return false;
  if(delivering){cancelWalk();paint();message.textContent='⏹️ 已停止幫送！現在換彥彥自己推';return true}
  cancelWalk();hintDir=null;
  const path=solve(board);
  if(path===null){message.textContent='📦 箱子卡住了！先按上一步或重來';fx('error');vib(12);return false}
  if(!path){finish();return true}
  const before=board.boxes.filter(x=>board.goals.includes(x)).length;
  let test=board,until=-1;
  for(let i=0;i<path.length;i++){
   const next=move(test,path[i]);if(!next)break;
   test=next;
   if(test.boxes.filter(x=>test.goals.includes(x)).length>before){until=i+1;break}
  }
  if(until<1){message.textContent='🎯 暫時找不到能送進目標的安全路線！';fx('error');return false}
  const route=path.slice(0,until),seq=walkId;
  delivering=true;
  const button=app.querySelector('#push-deliver');
  button.textContent='⏹ 停止幫送';button.setAttribute('aria-pressed','true');
  message.textContent='👩 媽媽正在安全送一箱！按停止或方向鍵就能接手';
  say('媽媽幫忙送一箱！彥彥隨時可以按停止接手！');
  function step(i){
   if(seq!==walkId||generation!==token||finished)return;
   if(i===route.length){cancelWalk();paint();message.textContent='🎯 成功送進一箱！換彥彥繼續玩！';return}
   if(!press(route[i],true)){cancelWalk();paint();message.textContent='🧱 幫送已停止，換個方向試試';return}
   if(finished)return;
   setTimeout(()=>step(i+1),130);
  }
  step(0);return true;
 }
 function paint(){
  const recommended=guideTile(board,hintDir);
  grid.style.setProperty('--push-cols',board.w);
  grid.innerHTML=Array.from({length:board.w*board.h},(_,i)=>{
   const wall=board.walls.includes(i),goal=board.goals.includes(i),box=board.boxes.includes(i),player=board.player===i;
   const kind=wall?'wall':box?'box':player?'player':goal?'goal':'floor';
   const icon=wall?'🧱':player?'🚜':box?'📦':goal?'🎯':'';
   const label=wall?'牆壁':player?'挖土機':box?(goal?'已放好的箱子':'木箱'):goal?'目標位置':'空地';
   return '<button type="button" class="push-cell push-'+kind+(box&&goal?' push-box-done':'')+(i===walkTarget?' push-route-target':'')+(i===recommended?' push-guide-next':'')+'" data-cell="'+i+'" '+(wall?'disabled':'')+' aria-label="'+label+(i===recommended?'，下一步走這裡':'')+'">'+icon+'</button>';
  }).join('');
  const count=board.boxes.filter(i=>board.goals.includes(i)).length;
  app.querySelector('#push-goals').textContent='🎯 '+count+'/'+board.goals.length;
  app.querySelector('#push-steps').textContent='🚜 '+board.steps+' 步';
  app.querySelector('#push-redo').disabled=finished||redo.length===0;
 }
 function finish(){
  if(finished||generation!==token)return;stopHold();finished=true;
  const fresh=award(level);fx('win');vib([20,35,20]);say('彥彥好棒！箱子都推到目標了！');
  const ov=document.createElement('div');ov.className='overlay';
  ov.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🚜 工程完成！</h2><p>📦 全部箱子都回家了！'+(fresh?'獲得三顆星星！':'再次挑戰成功！')+'</p><button class="primary" id="pushbox-next">▶️ 下一關</button><button class="classic-secondary" id="pushbox-again">🔄 再玩一次</button><button class="classic-secondary" id="pushbox-menu">🎲 遊戲世界</button></div>';
  app.querySelector('.screen').appendChild(ov);
  ov.querySelector('#pushbox-next').onclick=()=>start(level>=MAX?1:level+1);
  ov.querySelector('#pushbox-again').onclick=()=>start(level);
  ov.querySelector('#pushbox-menu').onclick=menu;
 }
 function press(dir,fromWalk=false){
  if(!fromWalk)cancelWalk();
  if(finished||generation!==token)return false;
  const next=move(board,dir);
  if(!next){message.textContent='🧱 前面擋住了，換個方向試試！';fx('error');vib(12);return false}
  history.push(board);if(history.length>80)history.shift();redo=[];
  const pushed=next.pushes>board.pushes;board=next;hintDir=null;checkpoint(level,board);saveHistory();paint();
  message.textContent=pushed?'📦 推動成功！找出通往 🎯 的路！':'🚜 繼續前進！';
  fx(pushed?'yay':'tap');vib(pushed?16:6);
  if(solved(board))finish();
  return true;
 }
 /* v370: Tap an empty target to safely deliver a box with one guided push.
    Only choose a push that the existing solver confirms is still solvable. */
 function autoDeliverGoal(goal){
  if(finished||generation!==token)return false;
  if(board.boxes.includes(goal)){message.textContent='🎯 這個目標已經放好箱子了！';return true}
  const candidates=[];
  for(const target of board.boxes)for(const [dx,dy,dir] of DIRS){
   const x=target%board.w+dx,y=Math.floor(target/board.w)+dy;
   if(x<0||y<0||x>=board.w||y>=board.h||y*board.w+x!==goal)continue;
   const plan=planBoxPush(board,target,dir);
   if(plan)candidates.push({target,dir,steps:plan.steps});
  }
  candidates.sort((a,b)=>a.steps-b.steps);
  if(candidates.length){
   message.textContent='🎯 彥彥點了目標！媽媽幫你把箱子安全送進去！';
   return autoPushBox(candidates[0].target,candidates[0].dir);
  }
  cancelWalk();const next=guidedStep(board);hintDir=next?.dir||null;paint();
  message.textContent=next?.dir?'🎯 還不能直接送進這裡，先走綠色提示格！':'📦 箱子卡住了，按 ↩️ 上一步或重來';
  fx(next?.dir?'tap':'error');return false;
 }
 grid.addEventListener('click',e=>{
  if(Date.now()-lastSwipe<350||Date.now()<ignoreGridClickUntil)return;
  const tile=e.target.closest('[data-cell]');if(!tile)return;
  const cell=Number(tile.dataset.cell),px=board.player%board.w,py=Math.floor(board.player/board.w),x=cell%board.w,y=Math.floor(cell/board.w);
  const dir=DIRS.find(d=>px+d[0]===x&&py+d[1]===y);
  if(board.goals.includes(cell)&&!board.boxes.includes(cell))autoDeliverGoal(cell);else if(dir)press(dir[2]);else if(board.boxes.includes(cell))autoPushBox(cell);else autoWalk(cell);
 });
 /* v307: a crate drag selects its push direction, while empty-floor swipes still drive. */
 let touch=null;
 function clearTouch(){
  if(touch?.tile)touch.tile.classList.remove('push-dragging');
  touch=null;
 }
 grid.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false){ignoreGridClickUntil=Date.now()+450;clearTouch();return}
  if(finished||touch||e.button>0)return;
  const tile=e.target.closest('[data-cell]');
  if(!tile||!grid.contains(tile)||tile.disabled)return;
  const cell=Number(tile.dataset.cell);
  touch={x:e.clientX,y:e.clientY,id:e.pointerId,cell,box:board.boxes.includes(cell),tile,dragging:false};
  try{grid.setPointerCapture?.(e.pointerId)}catch(_){}
 });
 grid.addEventListener('pointermove',e=>{
  if(!touch||touch.id!==e.pointerId||!touch.box)return;
  if(!touch.dragging&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>=16){
   touch.dragging=true;touch.tile.classList.add('push-dragging');
   message.textContent='📦 往想推的方向拖，放開就推一次！';
  }
 });
 grid.addEventListener('pointerup',e=>{
  if(!touch||touch.id!==e.pointerId)return;
  const {x,y,cell,box}=touch,dx=e.clientX-x,dy=e.clientY-y;
  clearTouch();
  if(Math.hypot(dx,dy)<22)return;
  lastSwipe=Date.now();
  const dir=Math.abs(dx)>Math.abs(dy)?dx>0?'R':'L':dy>0?'D':'U';
  if(box)autoPushBox(cell,dir);else press(dir);
 });
 grid.addEventListener('pointercancel',e=>{if(touch&&touch.id===e.pointerId){clearTouch();ignoreGridClickUntil=Date.now()+350}});
 grid.addEventListener('lostpointercapture',e=>{if(touch&&touch.id===e.pointerId)clearTouch()});
 app.querySelectorAll('[data-dir]').forEach(b=>{
  b.addEventListener('pointerdown',e=>beginHold(e,b));
  const end=e=>{
   ignorePointerClickUntil=Date.now()+600;
   if(hold&&hold.button===b&&hold.id===e.pointerId)stopHold();
  };
  b.addEventListener('pointerup',end);
  b.addEventListener('pointercancel',end);
  b.addEventListener('lostpointercapture',end);
  b.addEventListener('click',e=>{
   if(e.detail!==0&&Date.now()<ignorePointerClickUntil)return;
   stopHold();press(b.dataset.dir);
  });
 });
 /* v316: tap to undo one step; hold for 520ms to rewind the last crate push. */
 function undoOne(){
  stopHold();if(finished||!history.length)return;
  cancelWalk();hintDir=null;redo.push(board);if(redo.length>80)redo.shift();board=history.pop();checkpoint(level,board);saveHistory();paint();message.textContent='↩️ 回到上一步！';fx('tap');
 }
 function redoOne(){
  stopHold();if(finished||!redo.length)return;
  cancelWalk();hintDir=null;history.push(board);if(history.length>80)history.shift();board=redo.pop();checkpoint(level,board);saveHistory();paint();message.textContent='↪️ 重做成功！';fx('tap');vib(8);if(solved(board))finish();
 }
 function undoLastPush(){
  stopHold();if(finished)return;
  const currentPushes=board.pushes||0;let index=-1;
  for(let i=history.length-1;i>=0;i--)if((history[i].pushes||0)<currentPushes){index=i;break}
  if(index<0){message.textContent='📦 還沒有可以撤回的推箱動作！';fx('error');return}
  cancelWalk();hintDir=null;redo.push(board,...history.slice(index+1).reverse());if(redo.length>80)redo=redo.slice(-80);board=history[index];history=history.slice(0,index);
  checkpoint(level,board);saveHistory();paint();
  message.textContent='↩️ 已撤回上一次推箱，走路也一起還原！';fx('tap');vib([12,25,12]);
 }
 const undoButton=app.querySelector('#push-undo');
 let undoPointer=null,undoTimer=0,ignoreUndoClickUntil=0;
 function endUndo(e){
  if(e.pointerId!==undoPointer)return;
  if(undoTimer)clearTimeout(undoTimer);undoTimer=0;undoPointer=null;
  undoButton.classList.remove('push-undo-arming','push-undo-fired');
  if(e.type==='pointercancel')ignoreUndoClickUntil=Date.now()+450;
 }
 undoButton.addEventListener('pointerdown',e=>{
  if(finished||undoPointer!==null||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  undoPointer=e.pointerId;undoButton.classList.add('push-undo-arming');
  try{undoButton.setPointerCapture?.(e.pointerId)}catch(_){}
  undoTimer=setTimeout(()=>{
   if(undoPointer!==e.pointerId||finished||generation!==token)return;
   undoTimer=0;ignoreUndoClickUntil=Date.now()+950;
   undoButton.classList.remove('push-undo-arming');
   undoButton.classList.add('push-undo-fired');
   undoLastPush();
  },520);
 });
 ['pointerup','pointercancel','lostpointercapture'].forEach(type=>undoButton.addEventListener(type,endUndo));
 undoButton.addEventListener('contextmenu',e=>e.preventDefault());
 undoButton.onclick=e=>{if(e&&e.detail>0&&Date.now()<ignoreUndoClickUntil)return;undoOne()};
 app.querySelector('#push-redo').onclick=redoOne;
 app.querySelector('#push-deliver').onclick=autoDeliverOne;
 app.querySelector('#push-hint').onclick=()=>{
  stopHold();if(finished)return;
  cancelWalk();const next=guidedStep(board);
  if(!next){hintDir=null;paint();message.textContent='🤔 這條路卡住了！先按 ↩️ 上一步，或重新開始';say('這條路卡住了，先按上一步！');return}
  hintDir=next.dir;paint();
  const d=DIRS.find(x=>x[2]===hintDir);
  message.textContent=d?'💡 看綠色格子！下一步 '+d[3]+'，你自己試試看！':'🎉 已完成！';
  say(d?'看綠色格子，下一步往'+({L:'左',R:'右',U:'上',D:'下'}[hintDir])+'邊走！':'完成了！');
 };
 const assistButton=app.querySelector('#push-assist');
 let assistHold=null,ignoreAssistClickUntil=0;
 function clearAssistHold(){
  if(!assistHold)return;
  clearTimeout(assistHold.timer);assistButton.classList.remove('push-assist-arming','push-assist-ready');assistHold=null;
 }
 assistButton.addEventListener('pointerdown',e=>{
  if(assistHold){
   if(e.pointerId!==assistHold.id){assistHold.cancelled=true;clearTimeout(assistHold.timer);assistButton.classList.remove('push-assist-arming','push-assist-ready')}
   return;
  }
  if(finished||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  const h={id:e.pointerId,x:e.clientX,y:e.clientY,ready:false,cancelled:false,timer:null};
  assistHold=h;assistButton.classList.add('push-assist-arming');
  h.timer=setTimeout(()=>{
   if(assistHold!==h||h.cancelled||generation!==token||finished)return;
   h.ready=true;assistButton.classList.remove('push-assist-arming');assistButton.classList.add('push-assist-ready');
   message.textContent='📦 放開手指，就幫你安全推一箱！';vib(10);
  },550);
 });
 assistButton.addEventListener('pointermove',e=>{
  const h=assistHold;if(!h||h.id!==e.pointerId||h.cancelled)return;
  if(Math.hypot(e.clientX-h.x,e.clientY-h.y)>18){
   h.cancelled=true;clearTimeout(h.timer);assistButton.classList.remove('push-assist-arming','push-assist-ready');
   ignoreAssistClickUntil=Date.now()+800;
  }
 });
 assistButton.addEventListener('pointerup',e=>{
  const h=assistHold;if(!h||h.id!==e.pointerId)return;
  const go=h.ready&&!h.cancelled;clearAssistHold();
  if(go){ignoreAssistClickUntil=Date.now()+950;e.preventDefault?.();setTimeout(()=>{if(generation===token&&!finished)autoPushNext()},0)}
  else if(h.cancelled)ignoreAssistClickUntil=Date.now()+800;
 });
 for(const type of ['pointercancel','lostpointercapture'])assistButton.addEventListener(type,e=>{
  if(assistHold&&assistHold.id===e.pointerId){clearAssistHold();ignoreAssistClickUntil=Date.now()+800}
 });
 assistButton.onclick=e=>{
  if(e?.detail>0&&Date.now()<ignoreAssistClickUntil)return;

  stopHold();if(finished)return;
  cancelWalk();const step=guidedStep(board);
  if(!step){hintDir=null;paint();message.textContent='🤔 沒有安全路線！請按上一步或重來';say('箱子卡住了，試試上一步！');return}
  if(!step.dir){finish();return}
  if(!press(step.dir))return;
  if(finished)return;
  const next=guidedStep(board);hintDir=next&&next.dir||null;paint();
  const d=DIRS.find(x=>x[2]===hintDir);
  message.textContent=d?'👣 幫你走了一步！接著試試 '+d[3]+' 綠色格子':'👣 做得好！繼續推箱子！';
  say('幫你走了一步，接下來換彥彥試試看！');
 };
 app.querySelector('#push-reset').onclick=()=>{stopHold();cancelWalk();hintDir=null;board=makeLevel(level);history=[];redo=[];checkpoint(level,board);saveHistory();paint();message.textContent='🔄 重新開始推箱子！'};
 app.querySelector('#push-ice').onclick=()=>{stop();window.YanIceRescue.start()};
 app.querySelector('#push-voice').onclick=()=>say('彥彥，拖著箱子朝想推的方向滑，就會安全地推一步。按住箭頭可以連續走路，遇到箱子會停。點箱子會自動走到旁邊幫你推一步，點空地也能自動走。按上一步可撤銷，按重做可以把撤銷的步驟走回來。按提示會顯示綠色的下一步，按幫我走一步就會示範一步，按住幫我走一步半秒再放開，媽媽就會幫忙安全推一個箱子。點空的目標，媽媽會幫你安全推一次；按幫送一箱，媽媽會沿安全路線送進一箱，再按停止或方向鍵可以接手。如果還太遠，先走綠色提示格。把所有箱子推到目標上！');
 app.querySelector('#push-back').onclick=menu;
 app.querySelector('#push-other').onclick=menu;
 app.querySelector('#push-home').onclick=()=>{stop();renderHome()};
 paint();say('彥彥，開挖土機推箱子！把箱子推到目標上！');
}
window.YanPushBoxGame={start,stop,makeLevel,move,solved,solve,walkRoute,planBoxPush,guidedStep,guideTile,checkpoint,restore,award};
})();