(()=>{'use strict';
// v371: undo reverses the whole finger stroke, not only the last dot; parent assist stays individually undoable.
// v253: short tap assists one checkpoint; hold for 440ms to auto-trace every 580ms, release/cancel stops, multitouch guarded.
// v238: non-scoring animated parent demonstration with cancel, gesture interrupt, and lifecycle cleanup. v148: live blue finger trail while tracing; cleanup on release/cancel/finish/undo/reset. v147: choose among 12 playable tracing shapes; v146 parent-assisted one-step tracing with real saved progress, undo and existing star awards.
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh;
const SHAPES=[["🌈","彩虹小路",[[140,320],[380,320],[620,320],[860,320]]],["⛰️","小山",[[160,510],[500,130],[840,510],[160,510]]],["🪟","方形窗戶",[[220,140],[780,140],[780,510],[220,510],[220,140]]],["🏠","媽媽的家",[[180,540],[180,300],[500,100],[820,300],[820,540],[180,540]]],["🌲","森林大樹",[[500,100],[230,330],[390,330],[280,520],[720,520],[610,330],[770,330]]],["⭐","閃亮星星",[[500,90],[620,460],[210,240],[790,240],[380,460],[500,90]]],["⛵","小帆船",[[160,440],[840,440],[710,570],[290,570],[160,440],[500,440],[500,140]]],["🚀","火箭飛天",[[500,100],[690,280],[690,460],[500,570],[310,460],[310,280],[500,100]]],["🌸","花朵",[[500,110],[690,200],[800,390],[630,550],[370,550],[200,390],[310,200],[500,110],[500,550]]],["🐟","小魚",[[160,320],[360,140],[640,140],[840,320],[640,500],[360,500],[160,320],[80,520],[160,320]]],["🚜","挖土機",[[170,510],[830,510],[830,350],[650,350],[570,180],[400,180],[330,350],[170,350],[170,510],[170,210]]],["🦋","彩色蝴蝶",[[500,320],[280,110],[140,300],[280,520],[500,320],[720,110],[860,300],[720,520],[500,320],[500,100],[500,560]]]];
const MAX=SHAPES.length;
const nextLevel=n=>n>=MAX?1:n+1;
let activeDemoStop=null;
const point=(p)=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const near=(a,b,r=94)=>point(a)&&point(b)&&Math.hypot(a[0]-b[0],a[1]-b[1])<=r;
function segmentHit(a,b,p,r=94){
 if(!point(a)||!point(b)||!point(p))return false;
 const dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len)):0;
 return Math.hypot(a[0]+t*dx-p[0],a[1]+t*dy-p[1])<=r;
}
function advance(level,progress,p){
 const shape=SHAPES[level-1];if(!shape||!Number.isInteger(progress)||progress<0||progress>=shape[2].length)return progress;
 return near(shape[2][progress],p)?progress+1:progress;
}
function award(level){
 if(!Number.isInteger(level)||level<1||level>MAX)return false;
 const done=Array.isArray(state.traceCompleted)?state.traceCompleted.filter(n=>Number.isInteger(n)&&n>=1&&n<=MAX):[];
 const fresh=!done.includes(level);
 if(fresh){state.traceCompleted=[...done,level];state.stars=(Number(state.stars)||0)+2;state.complete=(Number(state.complete)||0)+1;}
 state.traceLevel=nextLevel(level);state.traceProgress=0;persist();return fresh;
}
function start(requested){
 if(activeDemoStop){activeDemoStop();activeDemoStop=null;}
 const level=Math.min(MAX,Math.max(1,Math.round(Number(requested)||Number(state.traceLevel)||1)));
 const shape=SHAPES[level-1],points=shape[2];
 let progress=Number(state.traceLevel)===level?Math.min(points.length-1,Math.max(0,Number(state.traceProgress)||0)):0;
 let finished=false,dragId=null,lastPointer=null,strokeStart=null;
 const undoStrokes=[];
 state.traceLevel=level;state.traceProgress=progress;persist();
 app.innerHTML='<section class="screen game classic-screen trace-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="trace-back" aria-label="返回小小畫家">❮</button><span class="chip">✏️ 手指描圖挑戰</span><span class="chip">⭐ '+level+'/'+MAX+'</span></header>'+
 '<main class="trace-stage"><div class="trace-family"><img src="./assets/mom.webp" alt="媽媽"><b>'+shape[0]+' '+shape[1]+'</b><img src="./assets/kid.webp" alt="彥彥"></div>'+
 '<div class="trace-instruction">👆 從 <strong>1</strong> 開始，跟著藍線描出圖案！</div>'+
 '<div class="trace-paper"><svg id="trace-board" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-label="依照數字順序連線描圖" role="img"><rect width="1000" height="650" fill="#fffdf4"/><path id="trace-guide-line" fill="none" stroke="#c5d4e3" stroke-width="11" stroke-dasharray="19 20" stroke-linecap="round"/><path id="trace-done-line" fill="none" stroke="#ec7c91" stroke-width="19" stroke-linejoin="round" stroke-linecap="round"/><path id="trace-live-line" fill="none" stroke="#39a9e8" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><path id="trace-demo-line" fill="none" stroke="#8860ed" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><circle id="trace-demo-cursor" cx="0" cy="0" r="28" fill="#8860ed" stroke="white" stroke-width="8" visibility="hidden"/><g id="trace-dots"></g></svg></div>'+
 '<div class="trace-status" id="trace-status" aria-live="polite"></div>'+
 '<div class="trace-meter"><div id="trace-fill"></div></div>'+
 '<div class="trace-actions"><button id="trace-pick" type="button" aria-label="挑選描圖圖案">🖼️ 選圖案</button><button id="trace-assist" type="button" aria-label="點一下媽媽幫連一點，長按持續幫忙畫，放開停止">👩 媽媽牽一筆／長按連畫</button><button id="trace-demo" type="button" aria-pressed="false">👀 媽媽示範</button><button id="trace-hint">💡 提示下一點</button><button id="trace-undo">↶ 收回這一筆</button><button id="trace-reset">🔄 重新描圖</button><button id="trace-voice">🔊 聽說明</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="trace-home">⌂ 首頁</button><button class="footbtn yellow" id="trace-paint">🎨 自由畫畫</button></footer></section>';
 const svg=app.querySelector('#trace-board'),dots=app.querySelector('#trace-dots'),status=app.querySelector('#trace-status');
 const path=arr=>arr.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ');
 const guide=app.querySelector('#trace-guide-line'),doneLine=app.querySelector('#trace-done-line'),liveLine=app.querySelector('#trace-live-line'),fill=app.querySelector('#trace-fill');
 const demoLine=app.querySelector('#trace-demo-line'),demoCursor=app.querySelector('#trace-demo-cursor'),demoBtn=app.querySelector('#trace-demo');
 let demoTimer=null,demoIndex=0;
 function stopDemo(){
  if(demoTimer!==null){clearTimeout(demoTimer);demoTimer=null}
  demoIndex=0;demoLine.removeAttribute('d');demoCursor.setAttribute('visibility','hidden');
  demoBtn.textContent='👀 媽媽示範';demoBtn.setAttribute('aria-pressed','false');
 }
 activeDemoStop=stopDemo;
 function demoTick(){
  if(!app.contains(svg)||finished){stopDemo();return}
  demoIndex++;
  demoLine.setAttribute('d',path(points.slice(0,demoIndex)));
  const p=points[demoIndex-1];
  demoCursor.setAttribute('cx',p[0]);demoCursor.setAttribute('cy',p[1]);demoCursor.setAttribute('visibility','visible');
  if(demoIndex<points.length)demoTimer=setTimeout(demoTick,520);
  else demoTimer=setTimeout(()=>{
   stopDemo();status.textContent='👆 示範結束，換彥彥從第 '+(progress+1)+' 點開始！';
  },900);
 }
 demoBtn.onclick=()=>{
  if(demoTimer!==null){stopDemo();status.textContent='👆 示範已停止，換彥彥畫畫！';return}
  if(finished||dragId!==null)return;
  demoIndex=0;demoBtn.textContent='⏹️ 停止示範';demoBtn.setAttribute('aria-pressed','true');
  status.textContent='👀 媽媽示範中，不會改變星星或描圖進度';
  say('先看媽媽怎麼畫，再換彥彥畫！');
  demoTick();
 };
 let trailActive=false;
 function drawTrail(p){if(!trailActive||dragId===null||finished||progress<1){liveLine.removeAttribute('d');return}liveLine.setAttribute('d',path([points[progress-1],p]));}
 guide.setAttribute('d',path(points));
 function render(){
  doneLine.setAttribute('d',path(points.slice(0,progress)));
  fill.style.width=Math.round(progress/points.length*100)+'%';
  dots.innerHTML=points.map((p,i)=>({p,i})).sort((a,b)=>Number(a.i===progress)-Number(b.i===progress)).map(({p,i})=>{
   const current=i===progress;
   const completed=i<progress;
   return '<g class="'+(current?'trace-current':completed?'trace-done':'trace-wait')+'" transform="translate('+p[0]+' '+p[1]+')">'+
    (current?'<circle r="88" fill="#ffe3a1" opacity=".7"/>':'')+
    '<circle r="46" fill="'+(completed?'#9ee5b3':current?'#ffb952':'#e8f1f7')+'" stroke="white" stroke-width="9"/>'+
    '<text text-anchor="middle" y="14" font-size="43" font-weight="900" fill="#4b5572">'+(i+1)+'</text></g>';
  }).join('');
  status.textContent=progress>=points.length?'🎉 全部完成！':progress===0?'👆 先找到發光的 1 號圓圈':'✨ 很棒！接著找 '+(progress+1)+' 號';
 }
 function position(e){const r=svg.getBoundingClientRect();return [(e.clientX-r.left)*1000/Math.max(1,r.width),(e.clientY-r.top)*650/Math.max(1,r.height)]}
 function step(p){
  if(finished)return;
  const next=advance(level,progress,p);
  if(next===progress)return;
  progress=next;state.traceLevel=level;state.traceProgress=progress;persist();fx('tap');vib(9);render();
  if(progress===points.length)finish();
 }
 function finish(){
  if(finished)return;stopDemo();clearAssist();finished=true;liveLine.removeAttribute('d');trailActive=false;
  const fresh=award(level);fx('win');vib([18,30,18]);say('太棒了！彥彥把'+shape[1]+'畫出來了！');
  const ov=document.createElement('div');ov.className='overlay';ov.innerHTML='<div class="popup"><div class="stars">🌈 ⭐⭐</div><h2>描圖成功！</h2><p>'+(fresh?'得到兩顆星星！':'再挑戰成功！')+' 媽媽說：彥彥真棒！</p><button class="primary" id="trace-next">▶️ 下一個圖案</button><button class="classic-secondary" id="trace-again">🔄 再畫一次</button></div>';
  app.querySelector('.trace-screen').appendChild(ov);
  ov.querySelector('#trace-next').onclick=()=>start(nextLevel(level));
  ov.querySelector('#trace-again').onclick=()=>start(level);
 }
 function chooseShape(){
  if(finished||dragId!==null||app.querySelector('.trace-gallery-overlay'))return;
  stopDemo();
  const ov=document.createElement('div');ov.className='overlay trace-gallery-overlay';
  const completed=Array.isArray(state.traceCompleted)?state.traceCompleted:[];
  ov.innerHTML='<div class="popup trace-gallery" role="dialog" aria-modal="true" aria-label="選擇描圖圖案"><h2>🖼️ 想畫哪一張？</h2><div class="trace-gallery-grid">'+
   SHAPES.map((shape,i)=>'<button type="button" class="trace-gallery-choice'+(i+1===level?' trace-gallery-selected':'')+'" data-trace-level="'+(i+1)+'" aria-label="'+shape[1]+'"><span class="trace-gallery-emoji">'+shape[0]+'</span><span>'+shape[1]+'</span><small>'+(completed.includes(i+1)?'⭐ 已完成':i+1===level?'👆 目前':'第 '+(i+1)+' 張')+'</small></button>').join('')+
   '</div><button type="button" class="classic-secondary" id="trace-gallery-close">↩️ 繼續畫</button></div>';
  const close=()=>{document.removeEventListener('keydown',esc);ov.remove()};
  const esc=e=>{if(e.key==='Escape')close()};
  app.querySelector('.trace-screen').appendChild(ov);
  ov.querySelector('#trace-gallery-close').onclick=close;
  ov.querySelectorAll('[data-trace-level]').forEach(btn=>btn.onclick=()=>{
   const chosen=Number(btn.dataset.traceLevel);
   close();if(Number.isInteger(chosen)&&chosen>=1&&chosen<=MAX)start(chosen);
  });
  ov.addEventListener('click',e=>{if(e.target===ov)close()});
  document.addEventListener('keydown',esc);
 }
 app.querySelector('#trace-pick').onclick=chooseShape;
 function sweep(a,b){
  if(finished||!a||!b)return;
  let from=a;
  for(let n=0;n<points.length&&!finished;n++){
   const target=points[progress];
   if(!target||!segmentHit(from,b,target))break;
   const before=progress;step(target);
   if(progress===before)break;
   from=target;
  }
 }
 function endGesture(e,apply){
  if(dragId!==e.pointerId)return;
  if(apply&&!finished)sweep(lastPointer,position(e));
  if(strokeStart!==null&&progress>strokeStart&&!finished)undoStrokes.push(strokeStart);
  strokeStart=null;dragId=null;lastPointer=null;trailActive=false;liveLine.removeAttribute('d');
 }
 svg.addEventListener('pointerdown',e=>{
  if(finished||dragId!==null||(e.pointerType==='mouse'&&e.button!==0))return;
  stopDemo();e.preventDefault();dragId=e.pointerId;strokeStart=progress;lastPointer=position(e);
  try{svg.setPointerCapture(e.pointerId)}catch(_){}
  const before=progress;step(lastPointer);
  trailActive=progress>before||(progress>0&&near(points[progress-1],lastPointer,130));
  drawTrail(lastPointer);
 });
 svg.addEventListener('pointermove',e=>{
  if(dragId!==e.pointerId)return;
  e.preventDefault();const p=position(e);const before=progress;sweep(lastPointer,p);if(progress>before)trailActive=true;lastPointer=p;drawTrail(p);
 });
 svg.addEventListener('pointerup',e=>endGesture(e,true));
 svg.addEventListener('pointercancel',e=>endGesture(e,false));
 svg.addEventListener('lostpointercapture',e=>endGesture(e,false));
 // v146: a real, reversible one-step assist; never bypass the normal scoring or save path.
 const assistBtn=app.querySelector('#trace-assist');
 let assistHold=null,assistSuppressUntil=0;
 function clearAssist(){
  const g=assistHold;if(!g)return false;
  assistHold=null;
  if(g.timer!==null)clearTimeout(g.timer);
  if(g.repeat!==null)clearInterval(g.repeat);
  assistBtn.classList.remove('trace-assist-holding');
  return g.held;
 }
 function assistStep(quiet=false){
  if(finished||dragId!==null)return false;
  const p=points[progress];if(!p)return false;
  stopDemo();
  const before=progress;step(p);
  if(progress>before&&!finished)undoStrokes.push(before);
  if(progress>before&&!finished){
   status.textContent=quiet?'👩 媽媽牽著畫到第 '+progress+' 點，放開就停！':'👩 媽媽連好了第 '+progress+' 點，下一個換彥彥！';
   if(!quiet)say('媽媽幫你連一點，下一個換彥彥試試！');
  }
  return progress>before;
 }
 activeDemoStop=()=>{stopDemo();clearAssist()};
 assistBtn.addEventListener('pointerdown',e=>{
  if(finished||dragId!==null||assistHold||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  const g={id:e.pointerId,x:e.clientX,y:e.clientY,timer:null,repeat:null,held:false};
  assistHold=g;
  try{assistBtn.setPointerCapture(e.pointerId)}catch(_){}
  g.timer=setTimeout(()=>{
   if(assistHold!==g||finished||dragId!==null)return;
   g.held=true;assistBtn.classList.add('trace-assist-holding');
   status.textContent='👩 媽媽牽著畫，放開就停！';
   say('媽媽牽著彥彥畫，放開手就停！');
   assistStep(true);
   if(assistHold===g&&!finished)g.repeat=setInterval(()=>{
    if(assistHold!==g||finished){clearAssist();return}
    assistStep(true);
   },580);
  },440);
 });
 assistBtn.addEventListener('pointermove',e=>{
  if(!assistHold||assistHold.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-assistHold.x,e.clientY-assistHold.y)>18){assistSuppressUntil=Date.now()+650;clearAssist()}
 });
 assistBtn.addEventListener('pointerup',e=>{
  if(!assistHold||assistHold.id!==e.pointerId)return;
  const held=assistHold.held;clearAssist();assistSuppressUntil=Date.now()+650;
  if(!held)assistStep(false);
 });
 const cancelAssist=e=>{
  if(assistHold&&assistHold.id===e.pointerId){assistSuppressUntil=Date.now()+650;clearAssist()}
 };
 assistBtn.addEventListener('pointercancel',cancelAssist);
 assistBtn.addEventListener('lostpointercapture',cancelAssist);
 assistBtn.onclick=e=>{
  if(e.detail>0&&Date.now()<assistSuppressUntil)return;
  assistStep(false);
 };
 app.querySelector('#trace-hint').onclick=()=>{
  if(finished)return;
  const p=points[progress];if(!p)return;
  status.textContent='💡 下一個是 '+(progress+1)+' 號，找發光的圓圈！';
  say('彥彥，找到 '+(progress+1)+' 號圓圈，再用手指連過去！');
 };
 app.querySelector('#trace-undo').onclick=()=>{
  if(finished||progress===0)return;
  stopDemo();dragId=null;lastPointer=null;strokeStart=null;trailActive=false;liveLine.removeAttribute('d');progress=undoStrokes.length?undoStrokes.pop():progress-1;
  state.traceLevel=level;state.traceProgress=progress;persist();render();
  say('收回一點，再試一次！');
 };
 app.querySelector('#trace-reset').onclick=()=>{stopDemo();dragId=null;lastPointer=null;strokeStart=null;undoStrokes.length=0;trailActive=false;liveLine.removeAttribute('d');progress=0;state.traceLevel=level;state.traceProgress=0;persist();render()};
 app.querySelector('#trace-voice').onclick=()=>say('請從一號開始，依照數字順序，用手指連線。每完成一張圖案可以獲得星星！');
 app.querySelector('#trace-back').onclick=()=>{stopDemo();window.YanPaintStudio.start()};
 app.querySelector('#trace-paint').onclick=()=>{stopDemo();window.YanPaintStudio.start()};
 app.querySelector('#trace-home').onclick=()=>{stopDemo();renderHome()};
 render();say('彥彥，跟著數字畫出'+shape[1]+'！');
}
function enhance(){
 const tools=app.querySelector('.paint-tools');if(!tools||tools.querySelector('#trace-entry'))return;
 const btn=document.createElement('button');btn.id='trace-entry';btn.type='button';btn.className='trace-entry';
 btn.textContent='✏️ 描圖挑戰';btn.setAttribute('aria-label','開始手指描圖挑戰');
 btn.onclick=()=>start();tools.appendChild(btn);
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanTraceArt={start,advance,award,nextLevel,shapes:SHAPES,enhance,segmentHit};
})();