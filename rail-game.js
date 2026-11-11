(()=>{'use strict';
/* v402: Change train speed while riding or paused; next track segment uses the new speed, with saved preference and no progress reset. */
/* v401: Win popup can replay the same solved train ride without rebuilding tracks or duplicating stars. */
/* v373.1: Win immediately disables pause and refreshes stars. */
/* v373: Pause/resume a running train without resetting rails, stars or checkpoint. */
/* v353: Three-speed train ride selector with saved preference, touch-friendly launch row, and animation timing matched to speed. */
/* v317: Tap the progress button to show/hide all unfinished rails without solving or changing saved progress. */
/* v294: failed train run highlights one wrong rail; tap it to auto-repair exactly that segment, with undo and checkpoint preserved. */
/* v293: hold the locomotive to repair remaining rails and depart on release; cancel is safe. */
/* v277: hold-to-repair remaining rails. */
/* v234: reliable real touch pointerup on the train even when its board suppresses synthesized clicks; no animated position shift. */
/* v233: tap the visible locomotive to test the track; the same original go validation and scoring apply. */
/* v227: one-tap complete next incorrect rail segment, preserving undo/checkpoint. */
/* v226.1: stable pointer capture only after drag begins; taps remain native. */
/* v226: swipe across rail segments to auto-align in one gesture; cancel rolls back. */
/* v201: long-press a rail segment to auto-align; tap still rotates. */
/* v114: reverse rotation toggle and saved undo.
   v57: 小火車軌道工程師 - distinct spatial rotation game, 24 deterministic levels. */
const shared=window.YanClassicShared;if(!shared)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=shared,audio=window.YanClassicAudio;
const direction=[[0,-1],[1,0],[0,1],[-1,0]];
function turnMask(mask,n){n=((n%4)+4)%4;return ((mask<<n)|(mask>>(4-n)))&15}
function allRoutes(n){const out=[];function rec(r,d,a){if(r===0&&d===0){out.push(a);return}if(r)rec(r-1,d,a+"R");if(d)rec(r,d-1,a+"D")}rec(n-1,n-1,"");return out}
function makeLevel(level){const size=level<=8?4:5, routes=allRoutes(size),route=routes[(level*11+7)%routes.length],cells=[{x:0,y:0}];let x=0,y=0;for(const step of route){if(step==="R")x++;else y++;cells.push({x,y})}const tiles=cells.map((p,i)=>{let mask=0;for(const q of [cells[i-1],cells[i+1]]){if(!q)continue;const d=direction.findIndex(([dx,dy])=>p.x+dx===q.x&&p.y+dy===q.y);mask|=1<<d}return {...p,mask}});const rotations=tiles.map((t,i)=>i===0||i===tiles.length-1?0:(level+i*3)%4);return {level,size,tiles,rotations}}
function isSolved(data,rots){return Array.isArray(rots)&&rots.length===data.tiles.length&&data.tiles.every((t,i)=>turnMask(t.mask,rots[i])===t.mask)}
function rotateAt(data,rots,i,step=1){if(!Number.isInteger(i)||i<=0||i>=data.tiles.length-1)return rots.slice();const out=rots.slice();out[i]=(out[i]+(step===-1?3:1))%4;return out}
function alignPath(data,rots,indices){let out=rots.slice();for(const i of indices)out=alignAt(data,out,i);return out}
function alignAt(data,rots,i){const out=rots.slice();if(!Number.isInteger(i)||i<=0||i>=data.tiles.length-1)return out;const mask=data.tiles[i].mask;if(turnMask(mask,out[i])===mask)return out;for(const delta of [1,3,2]){const next=(out[i]+delta)%4;if(turnMask(mask,next)===mask){out[i]=next;return out}}return out}
 function validCheckpoint(cp,data){return !!cp&&cp.level===data.level&&Array.isArray(cp.rotations)&&cp.rotations.length===data.tiles.length&&cp.rotations.every(x=>Number.isInteger(x)&&x>=0&&x<4)}
const MAX=24;let epoch=0;
function award(level){const done=Array.isArray(state.railDone)?state.railDone.filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX):[];const fresh=!done.includes(level);if(fresh){state.railDone=[...done,level];state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}state.railLevel=level===MAX?1:level+1;state.railCheckpoint=null;persist();return fresh}
function start(requested){
 epoch++;const run=epoch;audio?.unlock?.();
 const level=Math.max(1,Math.min(MAX,Math.round(Number(requested===undefined?state.railLevel:requested)||1)));
 const data=makeLevel(level);const speedOptions=[{label:'🐢 慢車',ms:460},{label:'🚂 正常',ms:260},{label:'⚡ 快車',ms:140}];let speedIndex=Math.max(0,speedOptions.findIndex(s=>s.ms===Number(state.railSpeed)));if(!speedOptions.some(s=>s.ms===Number(state.railSpeed)))speedIndex=1;let rotations=requested===undefined&&validCheckpoint(state.railCheckpoint,data)?state.railCheckpoint.rotations.slice():data.rotations.slice();
 let running=false,finished=false,paused=false,trainStep=0,trainTimer=null,history=[],reverse=false,guidedIndex=-1,showWrong=false;
 app.innerHTML='<section class="screen game classic-screen rail-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="rail-back" aria-label="返回遊戲選單">⌂</button><span class="chip">🚂 小火車工程師</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="rail-voice" aria-label="重播玩法">🔊</button></header>'+
 '<main class="rail-stage allow-scroll"><div class="rail-banner">🚂 🌈 <strong>轉一轉，接好火車軌道！</strong> 🏠</div>'+
 '<button type="button" class="rail-progress" id="rail-progress" aria-pressed="false" aria-label="點一下找出還沒接好的軌道"></button><div class="rail-board" id="rail-board" style="--rail-size:'+data.size+'" role="group" aria-label="點軌道方塊旋轉方向，連接火車站與終點"><div id="rail-cells" class="rail-cells"></div><button type="button" id="rail-train" class="rail-train" aria-label="點小火車試跑，長按六百毫秒放開自動接好所有軌道並出發" title="點一下試跑；按住半秒再放開自動接軌出發">🚂</button></div>'+
 '<div class="rail-message" id="rail-message" role="status" aria-live="polite">👆 轉好軌道後，直接點小火車 🚂 試跑！也能滑過多格接軌</div>'+
 '<div class="rail-actions"><button id="rail-direction" type="button" aria-pressed="false" aria-label="切換逆時針旋轉">↩️ 改成反向轉</button><button id="rail-hint">✨ 幫我接好一段</button><button id="rail-undo">↩️ 上一步</button></div>'+
 '<div class="rail-launch"><button id="rail-speed" type="button" aria-label="切換火車速度">🚂 正常</button><button class="rail-go" id="rail-go">🚂 試跑小火車</button><button id="rail-pause" type="button" aria-label="暫停或繼續小火車" disabled>⏸️ 暫停</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="rail-home">⌂ 首頁</button><button class="footbtn yellow" id="rail-reset">🔄 重新接軌</button></footer></section>';
 const cells=app.querySelector('#rail-cells'),train=app.querySelector('#rail-train'),msg=app.querySelector('#rail-message'),progress=app.querySelector('#rail-progress'),board=app.querySelector('#rail-board');
 const pos=(p)=>({left:((p.x+.5)/data.size*100)+'%',top:((p.y+.5)/data.size*100)+'%'});
 function save(){state.railLevel=level;state.railCheckpoint={level,rotations:rotations.slice()};persist()}
 function trackSVG(mask){const ends=[[50,3],[97,50],[50,97],[3,50]].filter((_,i)=>mask&(1<<i));
 const seg=ends.map(([x,y])=>'<line x1="50" y1="50" x2="'+x+'" y2="'+y+'"/>').join('');
 return '<svg viewBox="0 0 100 100" aria-hidden="true" class="rail-track"><g class="rail-track-bed">'+seg+'</g><g class="rail-track-inner">'+seg+'</g><circle cx="50" cy="50" r="7" fill="#fff6c7"/></svg>'}
 function paint(){
  if(run!==epoch)return;
  if(guidedIndex>0&&turnMask(data.tiles[guidedIndex].mask,rotations[guidedIndex])===data.tiles[guidedIndex].mask)guidedIndex=-1;
  const correct=data.tiles.filter((t,i)=>turnMask(t.mask,rotations[i])===t.mask).length;
  progress.textContent='🛤️ 已接好 '+correct+' / '+data.tiles.length+' 格　⭐ '+(Number(state.stars)||0)+'　'+(showWrong?'👀 橘框提示開啟':'👀 點我找錯軌');
  progress.setAttribute('aria-pressed',String(showWrong));
  const byCell=new Map(data.tiles.map((t,i)=>[t.x+','+t.y,{t,i}]));
  let html='';for(let y=0;y<data.size;y++)for(let x=0;x<data.size;x++){const item=byCell.get(x+','+y);if(!item){html+='<span class="rail-grass" aria-hidden="true">🌿</span>';continue}
   const {t,i}=item,station=i===0||i===data.tiles.length-1,mask=turnMask(t.mask,rotations[i]),correct=mask===t.mask;
   html+='<button type="button" class="rail-cell '+(station?'rail-station':correct?'rail-correct':'rail-turn')+(!correct&&(i===guidedIndex||showWrong)?' rail-guided':'')+'" data-rail="'+i+'" '+(station?'disabled':'')+' aria-label="'+(i===0?'火車出發站':i===data.tiles.length-1?'終點車站':'第'+i+'段軌道，'+(i===guidedIndex?'點一下直接修好':'點一下旋轉，按住自動對齊'))+'">'+trackSVG(mask)+(i===0?'<span class="rail-station-icon">🚉</span>':i===data.tiles.length-1?'<span class="rail-station-icon">🏠</span>':'')+'</button>'}
  cells.innerHTML=html;app.querySelector('#rail-undo').disabled=history.length===0||running;
  app.querySelector('#rail-go').disabled=running;
  const pauseButton=app.querySelector('#rail-pause');pauseButton.disabled=!running||finished;pauseButton.textContent=paused?'▶️ 繼續':'⏸️ 暫停';pauseButton.setAttribute('aria-pressed',String(paused));
  train.disabled=running||finished;app.querySelector('#rail-speed').disabled=finished;train.classList.toggle('rail-ready',isSolved(data,rotations));
 }
 progress.onclick=()=>{if(running||finished)return;showWrong=!showWrong;paint();msg.textContent=showWrong?'👀 橘框就是還沒接好的軌道！點軌道轉一轉，或按幫我接好一段！':'🌿 已收起橘框提示，繼續挑戰！';audio?.play?.('pop');vib(8)};
 function win(){if(run!==epoch||finished)return;finished=true;const fresh=award(level);paint();audio?.play?.('win');fx('win');vib([15,25,15]);say('火車到站了！彥彥真厲害！');
  const overlay=document.createElement('div');overlay.className='overlay';overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🚂 火車順利到站！</h2><p>'+(fresh?'得到三顆星星！':'又完成一次！')+'</p><button class="primary" id="rail-next">▶️ 下一關</button><button class="classic-secondary" id="rail-replay">🚂 再看火車跑</button><button class="classic-secondary" id="rail-again">🔄 再接一次</button><button class="classic-secondary" id="rail-menu">🎲 其他遊戲</button></div>';app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#rail-next').onclick=()=>start(level===MAX?1:level+1);
  overlay.querySelector('#rail-replay').onclick=()=>{if(run!==epoch)return;overlay.remove();if(trainTimer!==null){clearTimeout(trainTimer);trainTimer=null}finished=false;running=true;paused=false;trainStep=0;train.style.transition='none';const origin=pos(data.tiles[0]);train.style.left=origin.left;train.style.top=origin.top;train.style.opacity='1';void train.offsetWidth;train.style.transition='';msg.textContent='🚂 再看一次！軌道不用重接，星星也不會重複增加！';paint();move(0)};
  overlay.querySelector('#rail-again').onclick=()=>start(level);
  overlay.querySelector('#rail-menu').onclick=()=>{epoch++;window.YanClassics.menu()};
 }
 function move(i){if(run!==epoch||finished||!running||paused)return;trainStep=i;if(i>=data.tiles.length){train.style.opacity='0';win();return}
  const p=pos(data.tiles[i]);train.style.left=p.left;train.style.top=p.top;
  if(i===0)train.style.opacity='1';if(i>0)audio?.play?.('hit');
  trainTimer=setTimeout(()=>{trainTimer=null;move(i+1)},speedOptions[speedIndex].ms);
 }
 let hold=null,swipe=null,suppressClickIndex=-1,suppressClickUntil=0,suppressSwipeClickUntil=0;
 function clearHold(){if(!hold)return;clearTimeout(hold.timer);hold.button?.classList.remove('rail-holding');hold=null}
 cells.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||hold||swipe)return;
  const b=e.target.closest?.('[data-rail]');if(!b||running||finished||e.button>0)return;
  const i=Number(b.dataset.rail);if(i<=0||i>=data.tiles.length-1)return;
  const entry={id:e.pointerId,x:e.clientX,y:e.clientY,button:b,timer:null};hold=entry;
  swipe={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,visited:new Set(),before:rotations.slice()};b.classList.add('rail-holding');
  entry.timer=setTimeout(()=>{
   if(hold!==entry||running||finished||run!==epoch)return;
   clearHold();swipe=null;suppressClickIndex=i;suppressClickUntil=Date.now()+900;
   const next=alignAt(data,rotations,i);
   if(next[i]===rotations[i]){msg.textContent='🌟 這段軌道已經接好了！';return}
   history.push(rotations.slice());rotations=next;save();paint();audio?.play?.('hit');vib(12);
   cells.querySelector('[data-rail="'+i+'"]')?.classList.add('rail-hint-flash');
   msg.textContent=isSolved(data,rotations)?'🎉 全部接好了！按小火車出發！':'✨ 長按成功！這段軌道已經接好！';
  },450);
 });
 // Finger trail samples the entire path so fast swipes cannot skip tiles.
 cells.addEventListener('pointermove',e=>{
  const s=swipe;if(!s||s.id!==e.pointerId||running||finished||run!==epoch)return;
  if(!s.moved&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>12){s.moved=true;clearHold();try{cells.setPointerCapture(e.pointerId)}catch(_){}}
  if(!s.moved)return;
  const dx=e.clientX-s.lastX,dy=e.clientY-s.lastY,steps=Math.min(150,Math.max(1,Math.ceil(Math.hypot(dx,dy)/8)));
  const indices=[];
  for(let k=0;k<=steps;k++){
   const px=s.lastX+dx*k/steps,py=s.lastY+dy*k/steps;
   const b=document.elementFromPoint?.(px,py)?.closest?.('[data-rail]');
   const i=b?Number(b.dataset.rail):-1;
   if(i>0&&i<data.tiles.length-1&&!s.visited.has(i)){s.visited.add(i);indices.push(i)}
  }
  s.lastX=e.clientX;s.lastY=e.clientY;
  if(indices.length){
   const next=alignPath(data,rotations,indices);
   if(next.some((v,i)=>v!==rotations[i])){rotations=next;paint();msg.textContent='✨ 滑過軌道就接好了！繼續滑，或放開手指！'}
  }
  e.preventDefault?.();
 });
 function endSwipe(e,cancel){
  if(hold&&hold.id===e.pointerId)clearHold();
  const s=swipe;if(!s||s.id!==e.pointerId)return;
  swipe=null;if(s.moved){try{if(cells.hasPointerCapture?.(e.pointerId))cells.releasePointerCapture(e.pointerId)}catch(_){}}
  if(!s.moved)return;
  suppressSwipeClickUntil=Date.now()+900;
  const changed=rotations.some((v,i)=>v!==s.before[i]);
  if(cancel){rotations=s.before;paint();msg.textContent='↩️ 已取消滑動，軌道沒有改變！';return}
  if(changed){history.push(s.before);save();paint();audio?.play?.('hit');vib(12);
   msg.textContent=isSolved(data,rotations)?'🎉 全部接好了！按小火車出發！':'🛤️ 一筆接好好幾段！再接其他軌道！'}
 }
 cells.addEventListener('pointerup',e=>endSwipe(e,false));
 for(const type of ['pointercancel','lostpointercapture'])cells.addEventListener(type,e=>endSwipe(e,true));
 cells.addEventListener('click',e=>{if(e.detail>0&&Date.now()<suppressSwipeClickUntil)return;const b=e.target.closest('[data-rail]');if(!b||running||finished)return;
  const i=Number(b.dataset.rail);if(i<=0||i>=data.tiles.length-1)return;
  if(e.detail>0&&i===suppressClickIndex&&Date.now()<suppressClickUntil){suppressClickIndex=-1;return}
  const guided=guidedIndex===i;guidedIndex=-1;
  const next=guided?alignAt(data,rotations,i):rotateAt(data,rotations,i,reverse?-1:1);
  if(next.every((v,j)=>v===rotations[j])){paint();msg.textContent='🌟 這段軌道已經接好了！';return}
  history.push(rotations.slice());rotations=next;save();audio?.play?.('hit');vib(8);
  msg.textContent=isSolved(data,rotations)?'🎉 軌道接好了！按小火車出發！':guided?'✨ 點一下就修好這段！再點小火車找下一段！':reverse?'↩️ 逆時針轉好了！繼續接軌！':'↪️ 順時針轉好了！繼續接軌！';paint();
 });
 const speedButton=app.querySelector('#rail-speed');
 function paintSpeed(){const opt=speedOptions[speedIndex];speedButton.textContent=opt.label;speedButton.setAttribute('aria-label','火車速度：'+opt.label+'，點一下切換');train.style.setProperty('--rail-travel',Math.max(90,opt.ms-20)+'ms')}
 speedButton.onclick=()=>{if(finished||run!==epoch)return;speedIndex=(speedIndex+1)%speedOptions.length;const opt=speedOptions[speedIndex];state.railSpeed=opt.ms;persist();paintSpeed();msg.textContent=running?(paused?'⏸️ 已選'+opt.label+'！繼續開車後就會變速！':'🚂 已切換成'+opt.label+'！下一段軌道開始變速！'):'🚂 已切換成'+opt.label+'！接好軌道後按小火車出發！';audio?.play?.('pop');vib(8)};
 paintSpeed();
 app.querySelector('#rail-pause').onclick=()=>{
  if(!running||finished||run!==epoch)return;
  if(!paused){paused=true;if(trainTimer!==null){clearTimeout(trainTimer);trainTimer=null}train.style.transition='none';msg.textContent='⏸️ 小火車暫停了！點繼續就會從這一格接著開！';}
  else{paused=false;train.style.transition='';msg.textContent='▶️ 小火車繼續出發！';move(trainStep+1)}
  paint();audio?.play?.('pop');vib(8);
 };
 app.querySelector('#rail-direction').onclick=()=>{if(running||finished)return;reverse=!reverse;const b=app.querySelector('#rail-direction');b.setAttribute('aria-pressed',String(reverse));b.textContent=reverse?'↪️ 改成順向轉':'↩️ 改成反向轉';msg.textContent=reverse?'↩️ 現在點軌道會逆時針轉！':'↪️ 現在點軌道會順時針轉！';audio?.play?.('pop');vib(8)};
 // v277: tap helps one rail, hold 550ms helps all remaining, one undo step.
 const hintButton=app.querySelector('#rail-hint');
 let hintHold=null,suppressHintClickUntil=0;
 function repairOne(){
  if(running||finished||hintHold)return;
  const i=data.tiles.findIndex((t,j)=>j>0&&j<data.tiles.length-1&&turnMask(t.mask,rotations[j])!==t.mask);
  if(i<0){msg.textContent='🚂 都接好了！按小火車出發！';return}
  const before=rotations.slice(),next=alignAt(data,rotations,i);
  if(next[i]===before[i])return;
  history.push(before);rotations=next;save();paint();audio?.play?.('hit');vib(12);
  cells.querySelector('[data-rail="'+i+'"]')?.classList.add('rail-hint-flash');
  msg.textContent=isSolved(data,rotations)?'🎉 每段都接好了！按小火車出發！':'✨ 已接好一整段！再試著接下一段！';
  say('這段軌道接好了！再接下一段！');
 }
 function repairAll(h){
  if(running||finished||run!==epoch)return;
  const before=rotations.slice(),indices=data.tiles.map((_,i)=>i).filter(i=>i>0&&i<data.tiles.length-1);
  const next=alignPath(data,rotations,indices);
  if(next.every((v,i)=>v===before[i])){msg.textContent='🚂 已經全部接好，點小火車出發！';return}
  history.push(before);rotations=next;save();paint();audio?.play?.('hit');vib([12,25,12]);
  msg.textContent='🌈 長按成功！剩下的軌道一次接好，現在點小火車試跑！';
  say('軌道全部接好了！現在點小火車出發！');h.changed=true;
 }
 hintButton.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||e.button>0||hintHold||running||finished)return;
  const h={id:e.pointerId,changed:false,before:rotations.slice(),timer:null,fired:false};
  hintHold=h;hintButton.classList.add('rail-hint-holding');
  h.timer=setTimeout(()=>{
   if(hintHold!==h||run!==epoch||running||finished)return;
   h.fired=true;suppressHintClickUntil=Date.now()+900;repairAll(h);
  },550);
 });
 function finishHint(e,cancel){
  const h=hintHold;if(!h||h.id!==e.pointerId)return;
  clearTimeout(h.timer);hintHold=null;hintButton.classList.remove('rail-hint-holding');
  if(!h.fired)return;
  suppressHintClickUntil=Date.now()+900;
  if(cancel&&h.changed){rotations=h.before;history.pop();save();paint();msg.textContent='↩️ 已取消長按，軌道回到原本狀態！'}
 }
 hintButton.addEventListener('pointerup',e=>finishHint(e,false));
 for(const kind of ['pointercancel','lostpointercapture'])hintButton.addEventListener(kind,e=>finishHint(e,true));
 hintButton.addEventListener('click',e=>{if(e.detail>0&&Date.now()<suppressHintClickUntil)return;repairOne()});
 app.querySelector('#rail-undo').onclick=()=>{if(running||finished||!history.length)return;rotations=history.pop();save();paint();msg.textContent='↩️ 回到上一步了！'};
 app.querySelector('#rail-go').onclick=()=>{if(running||finished)return;if(!isSolved(data,rotations)){audio?.play?.('wrong');vib(20);const i=data.tiles.findIndex((t,j)=>turnMask(t.mask,rotations[j])!==t.mask);guidedIndex=i;paint();cells.querySelector('[data-rail="'+i+'"]')?.classList.add('rail-hint-flash');msg.textContent='💗 點一下發光的軌道，就能直接修好這一段！';say('這段軌道亮起來了，點一下就能修好！');return}
  running=true;paused=false;trainStep=0;msg.textContent='🚂 嗚嗚！小火車出發囉！';paint();train.style.opacity='1';move(0);
 };
 app.querySelector('#rail-voice').onclick=()=>{audio?.unlock?.();say('彥彥，點一下軌道旋轉，按住半秒或滑過軌道自動接好，也可以按幫我接好一段，再按小火車出發！')};
 app.querySelector('#rail-back').onclick=()=>{epoch++;window.YanClassics.menu()};
 app.querySelector('#rail-home').onclick=()=>{epoch++;renderHome()};
 app.querySelector('#rail-reset').onclick=()=>start(level);
 train.style.left=pos(data.tiles[0]).left;train.style.top=pos(data.tiles[0]).top;train.style.opacity='1';
 // v293: hold the locomotive 600ms, release to repair all remaining rails and depart.
 // Nothing changes until release: pointercancel, scrolling away and second fingers cannot submit.
 let trainTouch=null,suppressTrainClickUntil=0;
 function clearTrainHold(t){
  if(t?.timer!==null)clearTimeout(t.timer);
  train.classList.remove('rail-train-armed');
 }
 train.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||e.button>0||running||finished||trainTouch)return;
  const t={id:e.pointerId,x:e.clientX,y:e.clientY,type:e.pointerType,armed:false,canceled:false,timer:null};
  trainTouch=t;
  t.timer=setTimeout(()=>{
   if(trainTouch!==t||t.canceled||run!==epoch||running||finished)return;
   t.armed=true;train.classList.add('rail-train-armed');
   msg.textContent='🌈 放開小火車，媽媽就幫你接好軌道並出發！';
   vib(10);
  },600);
 });
 train.addEventListener('pointermove',e=>{
  const t=trainTouch;if(!t||t.id!==e.pointerId||t.canceled)return;
  if(Math.hypot(e.clientX-t.x,e.clientY-t.y)>14){
   t.canceled=true;clearTrainHold(t);
   msg.textContent='✋ 已取消長按，軌道保持原樣！';
  }
 });
 train.addEventListener('pointerup',e=>{
  const t=trainTouch;if(!t||t.id!==e.pointerId)return;
  trainTouch=null;clearTrainHold(t);
  if(t.canceled||running||finished||run!==epoch){
   suppressTrainClickUntil=Date.now()+700;return;
  }
  if(t.armed){
   suppressTrainClickUntil=Date.now()+900;e.preventDefault?.();
   const before=rotations.slice();
   const indices=data.tiles.map((_,i)=>i).filter(i=>i>0&&i<data.tiles.length-1);
   const next=alignPath(data,rotations,indices);
   if(next.some((v,i)=>v!==before[i])){
    history.push(before);rotations=next;save();paint();audio?.play?.('hit');vib([12,20,12]);
   }
   msg.textContent='🌈 軌道接好了，小火車馬上出發！';
   app.querySelector('#rail-go').click();
   return;
  }
  if(t.type==='touch'){
   suppressTrainClickUntil=Date.now()+700;
   app.querySelector('#rail-go').click();
  }
 });
 for(const kind of ['pointercancel','lostpointercapture'])train.addEventListener(kind,e=>{
  if(trainTouch?.id!==e.pointerId)return;
  clearTrainHold(trainTouch);trainTouch=null;suppressTrainClickUntil=Date.now()+700;
 });
 train.addEventListener('contextmenu',e=>e.preventDefault());
 train.onclick=e=>{if(e?.detail>0&&Date.now()<suppressTrainClickUntil)return;app.querySelector('#rail-go').click()};
 save();paint();say('彥彥，點上方進度找出還沒接好的軌道！點一下旋轉，按住半秒接好，或沿軌道滑過多格一次接好！');
}
const hub=window.YanGameHub;if(hub&&Array.isArray(hub.groups)){const g=hub.groups.find(x=>x[0]==='build');if(g&&!g[4].some(x=>x[3]==='YanTrainGame'))g[4].push(['🚂','小火車軌道','旋轉鐵軌，讓火車回家','YanTrainGame'])}
window.YanTrainGame={start,makeLevel,isSolved,rotateAt,alignAt,alignPath,turnMask,validCheckpoint,award,MAX};
})();