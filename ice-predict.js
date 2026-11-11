(()=>{'use strict';
/* v369: hold a grid cell to preview without scoring; slide to another cell to answer. */
/* v288: hold a numbered choice 480ms to preview its board location without answering; slide or tap still answers. */
/* v287: four-choice pad supports sliding to a number and releasing once, with cancel and multi-touch guards. */
/* v286: incorrect ice landing cells remain crossed out until the next question. */
/* v272: large numbered four-choice answer buttons mapped to marked ice cells; tap-friendly for pre-readers. */
/* v239: speak the current arrow direction on entry and after each answer; dedicated large replay control for pre-readers. */
/* v236: two wrong guesses reveal the real ice path without scoring; remember four-choice mode across levels. */
/* v214: child-friendly four-choice landing mode, using legal physics endpoints and persistent normal scoring. */
/* v167: watch a real step-by-step sliding demo without scoring or changing checkpoints.
   v165: animated sliding-route teaching overlay with numbered path and hide toggle.
   v51: Ice landing prediction - 20 stages, 3 independent taps per stage.
   Uses the existing v50 physics and deterministic BFS; no old game is overwritten. */
const sh=window.YanClassicShared,ice=window.YanIceRescue;if(!sh||!ice)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh;
const MAX=20,COUNT=3,NAMES={L:'左',R:'右',U:'上',D:'下'},ICONS={L:'⬅️',R:'➡️',U:'⬆️',D:'⬇️'};
let token=0;
function stage(level){
 const board=ice.makeLevel(level),route=ice.solve(board);
 if(!route||route.length<COUNT)throw Error('Prediction stage not solvable: '+level);
 return {board,commands:route.slice(0,COUNT)};
}
function save(level,step,board){
 state.icePredictionCheckpoint={level,step,player:board.player,got:board.got};
 state.icePredictionLevel=level;persist();
}
function restore(level){
 const s=stage(level),c=state.icePredictionCheckpoint;
 if(!c||c.level!==level||!Number.isInteger(c.step)||c.step<0||c.step>=COUNT)return {board:s.board,step:0};
 let board=s.board;
 for(let i=0;i<c.step;i++){const next=ice.slide(board,s.commands[i]);if(!next)return {board:s.board,step:0};board=next}
 if(board.player!==c.player||board.got!==c.got)return {board:s.board,step:0};
 return {board,step:c.step};
}
function award(level){
 const done=Array.isArray(state.icePredictionDone)?state.icePredictionDone.filter(n=>Number.isInteger(n)&&n>=1&&n<=MAX):[];
 const fresh=!done.includes(level);
 if(fresh){state.icePredictionDone=[...done,level];state.stars=(Number(state.stars)||0)+2;state.complete=(Number(state.complete)||0)+1}
 state.icePredictionLevel=level===MAX?1:level+1;
 state.icePredictionCheckpoint=null;persist();return fresh;
}
function start(requested){
 ice.stop();const my=++token;
 const level=Math.max(1,Math.min(MAX,Math.round(Number(requested===undefined?state.icePredictionLevel:requested)||1)));
 const s=stage(level),c=requested===undefined?restore(level):{board:s.board,step:0};
 let board=c.board,step=c.step,hinted=false,finished=false,demoSerial=0,choiceMode=state.icePredictionChoiceMode===true,wrongCount=0,wrongCells=new Set(),halfUsed=false;
 save(level,step,board);
 app.innerHTML='<section class="screen game classic-screen ice-predict-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="pred-back" aria-label="返回冰面救援">❮</button><span class="chip">🎯 猜停哪裡</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="pred-voice" aria-label="聽玩法">🔊</button></header>'+
 '<main class="pred-stage"><div class="pred-family">🚜 彥彥冰面小教室 🧊</div><div id="pred-progress" class="pred-progress"></div>'+
 '<div id="pred-prompt" class="pred-prompt" aria-live="polite"><button type="button" id="pred-repeat" class="pred-repeat" aria-label="重播這一題的滑行方向">🔊 聽方向</button><span id="pred-direction" class="pred-direction"></span></div><div id="pred-board" class="pred-board" role="group" aria-label="點選挖土機將會停下的格子"></div>'+
 '<div id="pred-choice-pad" class="pred-choice-pad" role="group" aria-label="四選一大按鈕，長按預覽位置，輕點作答" hidden></div><div id="pred-tip" class="pred-tip" role="status" aria-live="polite">👆 輕點作答；按住看清楚不計分，滑到別格放開也能作答！</div>'+
 '<div class="pred-tools"><button id="pred-hint" aria-pressed="false">🧭 看路線</button><button id="pred-demo" aria-label="播放冰面滑行示範">▶️ 看滑行</button><button id="pred-help" aria-label="幫我猜這一題">✨ 幫猜一題</button><button id="pred-choices" aria-pressed="false" aria-label="切換四選一落點猜測">🧩 四選一</button><button id="pred-half" aria-label="四選一排除兩個錯誤位置，每題限用一次">🔎 排除兩個</button><button id="pred-undo" aria-label="退回上一題重新猜" disabled>↩️ 退一步</button><button id="pred-reset">🔄 重新挑戰</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="pred-home">⌂ 首頁</button><button class="footbtn yellow" id="pred-ice">🧊 冰面救援</button></footer></section>';
 const grid=app.querySelector('#pred-board'),tip=app.querySelector('#pred-tip');
 function target(){return ice.slide(board,s.commands[step])}
 function readDirection(){if(finished||my!==token||step>=COUNT)return;say('請看箭頭，往'+NAMES[s.commands[step]]+'滑，猜猜挖土機會停在哪一格！')}
 function choiceCandidates(){
  const correct=target();if(!correct)return [];
  const walls=new Set(board.walls),found=new Set([correct.player]);
  for(const dir of ['L','R','U','D']){
   const next=ice.slide(board,dir);
   if(next&&Number.isInteger(next.player)&&!walls.has(next.player)&&next.player!==board.player)found.add(next.player);
   if(found.size>=4)break;
  }
  const seed=(level*13+step*7+board.player*3)%49;
  for(let offset=0;offset<49&&found.size<4;offset++){
   const pos=(seed+offset*11)%49;
   if(!walls.has(pos)&&pos!==board.player)found.add(pos);
  }
  return [...found].slice(0,4);
 }
 function paint(){
  if(finished||step>=COUNT)return;
  app.querySelector('#pred-undo').disabled=step===0;
  const next=target(),walls=new Set(board.walls),found=board.got||0,route=hinted&&next&&Array.isArray(next.path)?next.path:[],candidateList=choiceMode?choiceCandidates():[],choices=choiceMode?new Set(candidateList):null;
   const routeButton=app.querySelector('#pred-hint');routeButton.textContent=hinted?'🙈 收起路線':'🧭 看路線';routeButton.setAttribute('aria-pressed',String(hinted));
  const choiceButton=app.querySelector('#pred-choices');choiceButton.textContent=choiceMode?'🎯 四選一中':'🧩 四選一';choiceButton.setAttribute('aria-pressed',String(choiceMode));
  app.querySelector('#pred-progress').textContent='🎯 '+(step+1)+' / '+COUNT+' 題　'+('⭐'.repeat(step))+'☆'.repeat(COUNT-step);
  app.querySelector('#pred-direction').textContent='如果往 '+ICONS[s.commands[step]]+' '+NAMES[s.commands[step]]+' 滑，會停在哪一格？';
  grid.innerHTML=Array.from({length:49},(_,i)=>{
   const wall=walls.has(i),player=i===board.player,gem=board.gems.indexOf(i),exit=i===board.exit;
   const icon=wall?'🧱':player?'🚜':gem>=0&&!(found&(1<<gem))?'💎':exit?'🏠':'';
   const cls=wall?'pred-wall':player?'pred-player':gem>=0?'pred-gem':exit?'pred-exit':'';
   const hint=hinted&&next&&next.player===i?' pred-target':'';
   const option=choices?(choices.has(i)?' pred-option':' pred-option-muted'):'';
    const eliminated=wrongCells.has(i),eliminatedClass=eliminated?' pred-eliminated':'';
   const optionIndex=choiceMode?candidateList.indexOf(i):-1;
   const optionMark=optionIndex>=0?'<span class="pred-choice-tag" aria-hidden="true">'+['①','②','③','④'][optionIndex]+'</span>':'';
    const eliminatedMark=eliminated?'<span class="pred-eliminated-mark" aria-hidden="true">✕</span>':'';
   const order=route.indexOf(i),trail=order>=0?' pred-route':'';
   const routeAttr=order>=0?' data-route-step="'+(order+1)+'" style="--pred-route-order:'+order+'"':'';
   return '<button type="button" class="pred-cell '+cls+hint+trail+option+eliminatedClass+'" data-pred-cell="'+i+'" '+routeAttr+' '+(wall||eliminated||(choices&&!choices.has(i))?'disabled ':'')+'aria-label="'+(eliminated?'已排除的錯誤位置':wall?'牆壁':player?'挖土機':gem>=0?'寶石':exit?'小房子':'冰面')+'">'+icon+optionMark+eliminatedMark+'</button>';
  }).join('');
  const halfButton=app.querySelector('#pred-half');halfButton.disabled=halfUsed;halfButton.textContent=halfUsed?'🔎 已排除兩個':'🔎 排除兩個';
  const pad=app.querySelector('#pred-choice-pad');
  pad.hidden=!choiceMode;
  pad.innerHTML=choiceMode?candidateList.map((position,index)=>'<button type="button" class="pred-choice-answer'+(wrongCells.has(position)?' pred-eliminated':'')+'" data-pred-choice="'+position+'" '+(wrongCells.has(position)?'disabled ':'')+'aria-label="'+(wrongCells.has(position)?'已排除第':'選擇第')+(index+1)+'個標記位置">'+(wrongCells.has(position)?'✕':['①','②','③','④'][index])+'</button>').join(''):'';
 }
 function stopDemo(){
  demoSerial++;
  grid.querySelectorAll('.pred-demo-active').forEach(cell=>cell.classList.remove('pred-demo-active'));
  const button=app.querySelector('#pred-demo');
  if(button){button.disabled=false;button.textContent='▶️ 看滑行'}
 }
 function demo(){
  if(finished||my!==token)return;
  stopDemo();
  const next=target(),path=next&&Array.isArray(next.path)?next.path:[];
  if(!path.length){tip.textContent='🧭 這題沒有可播放的滑行路線。';return}
  hinted=true;paint();
  const run=demoSerial,button=app.querySelector('#pred-demo');
  button.disabled=true;button.textContent='⏳ 滑行中';
  tip.textContent='👀 看挖土機沿著藍色數字滑行，最後停在黃色格子！';
  let index=0,previous=null;
  function frame(){
   if(my!==token||run!==demoSerial||finished)return;
   if(previous)previous.classList.remove('pred-demo-active');
   if(index>=path.length){
    const last=grid.querySelector('[data-pred-cell="'+next.player+'"]');
    if(last)last.classList.add('pred-demo-active');
    setTimeout(()=>{if(run!==demoSerial||my!==token)return;stopDemo();tip.textContent='🎯 看完示範了！現在自己點黃色停靠格子，不會自動得分。'},650);
    return;
   }
   previous=grid.querySelector('[data-pred-cell="'+path[index]+'"]');
   if(previous)previous.classList.add('pred-demo-active');
   index++;setTimeout(frame,260);
  }
  frame();
 }
 function back(){stopDemo();token++;ice.start()}
 function home(){stopDemo();token++;renderHome()}
 function finish(){
  if(finished||my!==token)return;
  finished=true;const fresh=award(level);fx('win');vib([20,30,20]);say('彥彥猜對三次！太厲害了！');
  const o=document.createElement('div');o.className='overlay';
  o.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎯 落點預測成功！</h2><p>三次都猜對！'+(fresh?'得到兩顆星星！':'再次完成挑戰！')+'</p><button class="primary" id="pred-next">▶️ 下一關</button><button class="classic-secondary" id="pred-again">🔄 再玩一次</button><button class="classic-secondary" id="pred-return">🧊 冰面救援</button></div>';
  app.querySelector('.screen').appendChild(o);
  o.querySelector('#pred-next').onclick=()=>start(level===MAX?1:level+1);
  o.querySelector('#pred-again').onclick=()=>start(level);
  o.querySelector('#pred-return').onclick=back;
 }
 function answer(guess){
  if(finished||my!==token)return false;
  stopDemo();
  const next=target();if(!next)return false;
  if(choiceMode&&!choiceCandidates().includes(guess)){tip.textContent='🧩 請選彩色框框裡的其中一格！';return false}
   if(wrongCells.has(guess)){tip.textContent='❌ 這格剛剛試過了！請選沒有叉叉的格子。';return false}
  if(guess!==next.player){wrongCells.add(guess);wrongCount++;if(wrongCount>=2){hinted=true;paint();tip.textContent='🧭 已排除錯誤位置！跟著藍色路線找黃色終點。';say('看藍色路線，找黃色停靠格子，再點一次！')}else{paint();tip.textContent='❌ 這格不是答案，已打叉叉！再選其他格子。'}fx('error');vib(8);return false}
  board=next;step++;hinted=false;wrongCount=0;wrongCells.clear();halfUsed=false;save(level,step,board);fx('yay');vib(15);
  if(step===COUNT){finish();return true}
  tip.textContent='🌟 答對！挖土機滑到這裡了。再猜下一次！';paint();readDirection();return true;
 }
 // v162: undo a correct guess without losing the level, progress, or earned stars.
 function undo(){
  if(finished||my!==token||step===0)return;
  stopDemo();step--;board=s.board;
  for(let i=0;i<step;i++){const next=ice.slide(board,s.commands[i]);if(!next)throw Error('Undo path invalid');board=next}
  hinted=false;wrongCount=0;wrongCells.clear();halfUsed=false;save(level,step,board);
  tip.textContent='↩️ 回到上一題了！再猜一次挖土機會停哪裡。';
  paint();say('回到上一題，再猜一次！');
 }
 // v139: drag-to-guess with multi-touch protection; ordinary taps still work.
 let swipe=null,suppressCell=null,suppressUntil=0;
 function hitCell(x,y){
  const hit=document.elementFromPoint(x,y),cell=hit&&hit.closest('[data-pred-cell]');
  return cell&&grid.contains(cell)&&!cell.disabled?cell:null;
 }
 function clearSwipe(){
  if(!swipe)return;
  const {origin,id,hover,peekTimer}=swipe;swipe=null;
  if(peekTimer!==null)clearTimeout(peekTimer);
  if(hover)hover.classList.remove('pred-swipe-hover');
  try{if(origin.hasPointerCapture(id))origin.releasePointerCapture(id)}catch(_){}
 }
 grid.addEventListener('pointerdown',e=>{
  if(swipe||e.isPrimary===false||e.button!==0)return;
  const cell=e.target.closest('[data-pred-cell]');if(!cell||cell.disabled)return;
  swipe={id:e.pointerId,origin:cell,x:e.clientX,y:e.clientY,moved:false,hover:cell,peeked:false,peekTimer:null};
  cell.classList.add('pred-swipe-hover');
  const id=e.pointerId;
  swipe.peekTimer=setTimeout(()=>{
   if(!swipe||swipe.id!==id||swipe.moved||finished||my!==token)return;
   swipe.peeked=true;
   tip.textContent='🔎 先看清楚發亮的格子！放開不算作答；輕點才選，或滑到別格再放開。';
   vib(8);
  },480);
  try{cell.setPointerCapture(e.pointerId)}catch(_){}
 });
 grid.addEventListener('pointermove',e=>{
  if(!swipe||e.pointerId!==swipe.id)return;
  if(!swipe.moved&&Math.hypot(e.clientX-swipe.x,e.clientY-swipe.y)<12)return;
  swipe.moved=true;
  if(swipe.peekTimer!==null){clearTimeout(swipe.peekTimer);swipe.peekTimer=null}
  const cell=hitCell(e.clientX,e.clientY);
  if(cell!==swipe.hover){
   if(swipe.hover)swipe.hover.classList.remove('pred-swipe-hover');
   swipe.hover=cell;if(cell)cell.classList.add('pred-swipe-hover');
  }
 });
 grid.addEventListener('pointerup',e=>{
  if(!swipe||e.pointerId!==swipe.id)return;
  const moved=swipe.moved,peeked=swipe.peeked,origin=swipe.origin,cell=moved?hitCell(e.clientX,e.clientY):null;
  clearSwipe();
  if(moved||peeked){
   suppressCell=origin;suppressUntil=Date.now()+600;e.preventDefault();
   if(peeked&&!moved){tip.textContent='🔎 看清楚了！輕點格子作答，或滑到想選的格子再放開。';return}
   if(cell)answer(Number(cell.dataset.predCell));
   else tip.textContent='👆 手指要停在冰面格子上，再放開喔！';
  }
 });
 grid.addEventListener('pointercancel',e=>{
  if(!swipe||e.pointerId!==swipe.id)return;
  if(swipe.moved||swipe.peeked){suppressCell=swipe.origin;suppressUntil=Date.now()+600}
  clearSwipe();
 });
 grid.addEventListener('lostpointercapture',e=>{
  if(swipe&&e.pointerId===swipe.id){
   if(swipe.moved||swipe.peeked){suppressCell=swipe.origin;suppressUntil=Date.now()+600}
   clearSwipe();
  }
 });
 // v287: slide across the four large numbered answers, release to choose.
 // A canceled drag or a second finger never submits; ordinary taps remain intact.
 const choicePad=app.querySelector('#pred-choice-pad');
 let choiceSwipe=null,suppressChoiceOrigin=null,suppressChoiceUntil=0,choicePreviewCell=null;
 function previewChoice(button){
  if(choicePreviewCell){choicePreviewCell.classList.remove('pred-choice-preview');choicePreviewCell=null}
  if(!button)return;
  const cell=grid.querySelector('[data-pred-cell="'+button.dataset.predChoice+'"]');
  if(cell){choicePreviewCell=cell;cell.classList.add('pred-choice-preview')}
 }
 function choiceAt(x,y){
  const hit=document.elementFromPoint(x,y),button=hit&&hit.closest('[data-pred-choice]');
  return button&&choicePad.contains(button)&&!button.disabled?button:null;
 }
 function clearChoiceSwipe(){
  if(!choiceSwipe)return;
  const {origin,id,hover,peekTimer}=choiceSwipe;choiceSwipe=null;
  if(peekTimer!==null)clearTimeout(peekTimer);
  if(hover)hover.classList.remove('pred-choice-hover');
  previewChoice(null);
  try{if(origin.hasPointerCapture(id))origin.releasePointerCapture(id)}catch(_){}
 }
 choicePad.addEventListener('pointerdown',e=>{
  if(choiceSwipe||finished||!choiceMode||e.isPrimary===false||e.button!==0)return;
  const button=e.target.closest('[data-pred-choice]');
  if(!button||button.disabled)return;
  choiceSwipe={id:e.pointerId,origin:button,x:e.clientX,y:e.clientY,moved:false,hover:button,peeked:false,peekTimer:null};
  button.classList.add('pred-choice-hover');previewChoice(button);
  const id=e.pointerId;
  choiceSwipe.peekTimer=setTimeout(()=>{
   if(!choiceSwipe||choiceSwipe.id!==id||choiceSwipe.moved||finished)return;
   choiceSwipe.peeked=true;
   tip.textContent='🔎 看看發亮的冰面位置！放開不作答，輕點才選答案。';
   vib(8);
  },480);
  try{button.setPointerCapture(e.pointerId)}catch(_){}
 });
 choicePad.addEventListener('pointermove',e=>{
  if(!choiceSwipe||e.pointerId!==choiceSwipe.id)return;
  if(!choiceSwipe.moved&&Math.hypot(e.clientX-choiceSwipe.x,e.clientY-choiceSwipe.y)<10)return;
  choiceSwipe.moved=true;
  if(choiceSwipe.peekTimer!==null){clearTimeout(choiceSwipe.peekTimer);choiceSwipe.peekTimer=null}
  const button=choiceAt(e.clientX,e.clientY);
  if(button!==choiceSwipe.hover){
   if(choiceSwipe.hover)choiceSwipe.hover.classList.remove('pred-choice-hover');
   choiceSwipe.hover=button;
   if(button)button.classList.add('pred-choice-hover');
   previewChoice(button);
  }
 });
 choicePad.addEventListener('pointerup',e=>{
  if(!choiceSwipe||e.pointerId!==choiceSwipe.id)return;
  const moved=choiceSwipe.moved,peeked=choiceSwipe.peeked,origin=choiceSwipe.origin,button=moved?choiceAt(e.clientX,e.clientY):null;
  clearChoiceSwipe();
  if(moved||peeked){
   suppressChoiceOrigin=origin;suppressChoiceUntil=Date.now()+600;e.preventDefault();
   if(peeked){tip.textContent='🔎 預覽完成！輕點數字作答，或滑到其他數字再放開。';return}
   if(button)answer(Number(button.dataset.predChoice));
   else tip.textContent='👆 手指停在有數字的答案上，再放開喔！';
  }
 });
 choicePad.addEventListener('pointercancel',e=>{
  if(!choiceSwipe||e.pointerId!==choiceSwipe.id)return;
  if(choiceSwipe.moved||choiceSwipe.peeked){suppressChoiceOrigin=choiceSwipe.origin;suppressChoiceUntil=Date.now()+600}
  clearChoiceSwipe();
 });
 choicePad.addEventListener('lostpointercapture',e=>{
  if(choiceSwipe&&e.pointerId===choiceSwipe.id)clearChoiceSwipe();
 });
 choicePad.addEventListener('click',e=>{
  const button=e.target.closest('[data-pred-choice]');
  if(!button||button.disabled||finished||!choiceMode)return;
  if(button===suppressChoiceOrigin&&Date.now()<suppressChoiceUntil)return;
  answer(Number(button.dataset.predChoice));
 });
 grid.addEventListener('click',e=>{
  const cell=e.target.closest('[data-pred-cell]');if(!cell||cell.disabled)return;
  if(cell===suppressCell&&Date.now()<suppressUntil)return;
  answer(Number(cell.dataset.predCell));
 });
 app.querySelector('#pred-help').onclick=()=>{
  if(finished||my!==token)return;
  const next=target();if(!next)return;
  if(answer(next.player)&&!finished){tip.textContent='✨ 這次幫你猜對了！下一題試試自己猜。';say('這次幫你猜對了，下一題你試試看！')}
 };
 app.querySelector('#pred-choices').onclick=()=>{
  if(finished||my!==token)return;stopDemo();choiceMode=!choiceMode;state.icePredictionChoiceMode=choiceMode;persist();paint();
  tip.textContent=choiceMode?'🧩 輕點數字作答；長按只看冰面位置，滑到其他數字再放開也能作答。':'👆 已回到自由猜測，所有冰面格子都可以選。';
  say(choiceMode?'找找看，四個彩色格子，哪一格是停車位置？':'現在可以自由選冰面格子！');
 };
 app.querySelector('#pred-half').onclick=()=>{
  if(finished||my!==token||halfUsed)return;
  stopDemo();
  if(!choiceMode){choiceMode=true;state.icePredictionChoiceMode=true;persist()}
  const next=target();if(!next)return;
  const eliminated=choiceCandidates().filter(position=>position!==next.player&&!wrongCells.has(position)).slice(0,2);
  if(!eliminated.length){tip.textContent='🔎 錯誤位置已經排除，找找剩下的答案！';return}
  eliminated.forEach(position=>wrongCells.add(position));
  halfUsed=true;paint();
  tip.textContent='🔎 已打叉叉排除 '+eliminated.length+' 個錯誤位置！看看剩下的數字，自己猜猜看。';
  say('排除兩個錯誤答案！請從剩下的數字選一個。');
 };
 app.querySelector('#pred-hint').onclick=()=>{
  if(finished)return;stopDemo();hinted=!hinted;paint();
  tip.textContent=hinted?'🧭 跟著藍色數字看滑行順序，黃色格子就是停靠點！':'👆 路線收起來了，自己猜猜看！';
  if(hinted)say('跟著藍色數字，看挖土機一路滑到黃色格子！');
 };
 app.querySelector('#pred-demo').onclick=demo;
 app.querySelector('#pred-undo').onclick=undo;
 app.querySelector('#pred-reset').onclick=()=>start(level);
 app.querySelector('#pred-back').onclick=back;app.querySelector('#pred-ice').onclick=back;
 app.querySelector('#pred-home').onclick=home;
 app.querySelector('#pred-voice').onclick=readDirection;
 app.querySelector('#pred-repeat').onclick=readDirection;
 paint();readDirection();
}
function attach(){
 const tools=app.querySelector('.ice-screen .ice-tools');if(!tools||tools.querySelector('#ice-predict-entry'))return;
 const b=document.createElement('button');b.id='ice-predict-entry';b.type='button';b.textContent='🎯 猜停哪裡';b.setAttribute('aria-label','開始冰面落點預測挑戰');
 b.onclick=()=>start();tools.appendChild(b);
}
new MutationObserver(attach).observe(app,{childList:true,subtree:true});attach();
window.YanIcePrediction={start,stage,restore,save,award};
})();