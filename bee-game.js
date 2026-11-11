/* v406: on-demand safe dashed flight route shows children where to draw, without awarding progress. */
/* v380: hold mom assist for 600ms to safely fly three successive flowers, tap still flies one; cancellation keeps saved progress. */
/* v375: tap any flower to hear its number without collecting or changing checkpoints. */
/* v339: optional automatic spoken next-flower number after correct/wrong/undo; saved in existing progress object. */
(()=>{'use strict';
/* v333: fast swipe release collects a flower even without intermediate pointermove; wrong taps give feedback. */
/* v304: draw mode supports release-to-snap and a direct next-flower tap outside storm mode; storm path remains collision-checked. */
/* v280: tap any earlier completed flower to rewind multiple steps in one gesture, keyboard accessible and checkpoint-safe. */
/* v193: one-tap guided assist flies safely to and collects the next flower, cancellable without changing checkpoints. */
/* v179: continuous finger flight collects successive flowers without lifting; checkpoints preserved. */
/* v178: animated cloud-safe flight tutorial; never scores or changes checkpoints. */
/* v173: one-tap undo last collected flower, persisted without touching earned stars. */
/* v54: Finger-drawn bee pollination trail; 24 deterministic, resumable levels. */
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh,audio=window.YanClassicAudio;

/* v56: optional cloud-dodging flight. Deterministic obstacles avoid all flower centres. */
const CLOUD_SPOTS=[[23,42],[48,45],[72,45],[38,68],[65,69],[78,23],[35,22],[55,81],[17,65],[83,79],[55,25],[23,22],[78,65],[40,85],[60,12],[15,50]].map(([x,y])=>({x,y}));
function makeClouds(level,nodes){
 const points=[{x:9,y:82},...nodes],clouds=[];
 for(let i=0;i<CLOUD_SPOTS.length&&clouds.length<3;i++){
  const p=CLOUD_SPOTS[(i+level*3)%CLOUD_SPOTS.length];
  if(points.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>19)&&clouds.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>23))clouds.push(p);
 }
 return clouds;
}
function segmentHitsCloud(a,b,clouds,width,height){
 const radius=Math.max(22,Math.min(width,height)*.071);
 return clouds.some(c=>{
  const ax=a.x*width/100,ay=a.y*height/100,bx=b.x*width/100,by=b.y*height/100,cx=c.x*width/100,cy=c.y*height/100;
  const dx=bx-ax,dy=by-ay,denom=dx*dx+dy*dy;
  const t=denom?Math.max(0,Math.min(1,((cx-ax)*dx+(cy-ay)*dy)/denom)):0;
  return Math.hypot(cx-ax-dx*t,cy-ay-dy*t)<radius;
 });
}
const MAX=24,ICONS=['🌻','🌷','🌹','🌺','🍀','🌼','🍓','🌸'];let epoch=0;
/* v107: sweep across a flower even when pointermove skips its centre. */
function segmentTouchesFlower(a,b,target,width,height,radius){
 if(!target||!width||!height)return false;
 const dx=(b.x-a.x)*width/100,dy=(b.y-a.y)*height/100;
 const vx=(target.x-a.x)*width/100,vy=(target.y-a.y)*height/100;
 const den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,(vx*dx+vy*dy)/den)):0;
 return Math.hypot(vx-dx*t,vy-dy*t)<=radius;
}

/* v178: shortest safe demonstration route, including the optional storm clouds. */
function planBeeDemo(a,b,clouds,w,h){
 if(!clouds.length||!segmentHitsCloud(a,b,clouds,w,h))return [a,b];
 const step=5,side=21,idx=(x,y)=>y*side+x,pt=i=>({x:(i%side)*step,y:Math.floor(i/side)*step});
 const start=idx(Math.round(a.x/step),Math.round(a.y/step));
 if(segmentHitsCloud(a,pt(start),clouds,w,h))return null;
 const queue=[start],prev=new Int16Array(side*side).fill(-1);prev[start]=start;let end=-1;
 for(let q=0;q<queue.length;q++){
  const at=queue[q],p=pt(at);
  if(Math.hypot((p.x-b.x)*w/100,(p.y-b.y)*h/100)<=Math.max(w,h)*.12&&!segmentHitsCloud(p,b,clouds,w,h)){end=at;break}
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;
   const nx=at%side+dx,ny=Math.floor(at/side)+dy;
   if(nx<0||nx>=side||ny<0||ny>=side)continue;
   const ni=idx(nx,ny);
   if(prev[ni]!==-1||segmentHitsCloud(p,pt(ni),clouds,w,h))continue;
   prev[ni]=at;queue.push(ni);
  }
 }
 if(end<0)return null;
 const route=[b];for(let at=end;at!==start;at=prev[at])route.push(pt(at));
 route.push(pt(start),a);route.reverse();return route;
}
function rand(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)}
function makeLevel(level){
 const n=3+Math.floor((level-1)/6),r=rand(540054+level*7907),spots=[];
 for(let y=0;y<3;y++)for(let x=0;x<4;x++)spots.push({x:15+x*23,y:18+y*32});
 for(let i=spots.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[spots[i],spots[j]]=[spots[j],spots[i]]}
 const nodes=spots.slice(0,n).map((p,i)=>({...p,icon:ICONS[(level+i*3)%ICONS.length],num:i+1}));
 return {level,nodes};
}
function validCheckpoint(cp,level,n){return !!cp&&cp.level===level&&Number.isInteger(cp.done)&&cp.done>=0&&cp.done<n}
function advance(done,index,n){return Number.isInteger(index)&&index===done&&done<n?done+1:done}
function rewindCount(done,index){return Number.isInteger(index)&&index>=0&&index<done-1?index+1:done}
function award(level){
 const done=Array.isArray(state.beeDone)?state.beeDone.filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX):[];
 const fresh=!done.includes(level);
 if(fresh){state.beeDone=[...done,level];state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}
 state.beeLevel=level===MAX?1:level+1;state.beeCheckpoint=null;persist();return fresh;
}
function start(requested){
 epoch++;const run=epoch;audio?.unlock?.();
 const level=Math.max(1,Math.min(MAX,Math.round(Number(requested===undefined?state.beeLevel:requested)||1)));
 const data=makeLevel(level);let done=requested===undefined&&validCheckpoint(state.beeCheckpoint,level,data.nodes.length)?state.beeCheckpoint.done:0;
 let finished=false,dragging=false,listenMode=false,drawMode=!!state.beeDrawMode,stormMode=!!state.beeStormMode,voiceGuide=!!state.beeVoiceGuide,stroke=[],routeHint=null,activePointer=null,lastPoint=null,demoing=false,demoTimer=null;
 let assistHoldTimer=null,assistPointer=null,assistLongHeld=false,autoFlights=0,autoFlightTimer=null;
 if(stormMode)drawMode=true;
 const clouds=makeClouds(level,data.nodes);
 app.innerHTML='<section class="screen game classic-screen bee-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="bee-back" aria-label="返回遊戲選單">⌂</button><span class="chip">🐝 蜜蜂畫線採蜜</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="bee-voice" aria-label="重播玩法">🔊</button></header>'+
 '<main class="bee-stage allow-scroll"><div class="bee-banner">🌷 🐝 🌻 <strong>小蜜蜂採花蜜</strong> 🌺 🌈</div><div class="bee-progress" id="bee-progress"></div>'+
 '<div class="bee-board" id="bee-board" role="group" aria-label="依照數字順序，點擊或用手指畫線連接花朵"><svg class="bee-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" id="bee-lines"></svg><span class="bee-start" style="left:9%;top:82%">🐝</span><svg class="bee-ink" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" id="bee-ink"></svg><span class="bee-flyer" id="bee-flyer" aria-hidden="true">🐝</span><div id="bee-clouds" class="bee-clouds" aria-hidden="true"></div><div id="bee-nodes"></div></div>'+
 '<div class="bee-message" id="bee-message" role="status" aria-live="polite">👆 畫到發光花朵再放手，也能採蜜！</div>'+
 '<div class="bee-mode-row"><button class="bee-draw-toggle" id="bee-draw" type="button" aria-pressed="false">✏️ 畫線：關</button><button class="bee-storm-toggle" id="bee-storm" type="button" aria-pressed="false">☁️ 躲雨雲：關</button></div><div class="bee-actions"><button id="bee-demo" type="button">▶️ 看飛行</button><button id="bee-assist" type="button" aria-label="點一下幫飛一朵，按住六百毫秒連飛三朵">👩 幫飛一朵／長按三朵</button><button id="bee-hint">💡 找下一朵</button><button type="button" id="bee-route" aria-pressed="false">🧭 畫出路線</button><button type="button" id="bee-voice-guide" aria-pressed="false">👂 自動報數：關</button><button type="button" id="bee-listen" aria-pressed="false">🔢 點花聽數字：關</button><button type="button" id="bee-undo" disabled>↩️ 退回一朵</button><button id="bee-restart">🔄 重畫</button></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="bee-home">⌂ 首頁</button><button class="footbtn yellow" id="bee-menu">🎲 其他遊戲</button></footer></section>';
 const board=app.querySelector('#bee-board'),nodes=app.querySelector('#bee-nodes'),lines=app.querySelector('#bee-lines'),msg=app.querySelector('#bee-message'),ink=app.querySelector('#bee-ink'),flyer=app.querySelector('#bee-flyer'),drawBtn=app.querySelector('#bee-draw'),stormBtn=app.querySelector('#bee-storm'),cloudLayer=app.querySelector('#bee-clouds'),voiceBtn=app.querySelector('#bee-voice-guide'),listenBtn=app.querySelector('#bee-listen');
 const anchor=()=>done?data.nodes[done-1]:{x:9,y:82};
 const point=e=>{const r=board.getBoundingClientRect();return {x:Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))}};
 const distance=(a,b)=>Math.hypot((a.x-b.x)*board.clientWidth/100,(a.y-b.y)*board.clientHeight/100);
 function paintFlight(){const p=stroke.length?stroke[stroke.length-1]:anchor();flyer.style.left=p.x+'%';flyer.style.top=p.y+'%';
  board.classList.toggle('bee-drawing',drawMode);board.classList.toggle('bee-demoing',demoing);board.classList.toggle('bee-storm',stormMode);drawBtn.disabled=stormMode;drawBtn.setAttribute('aria-pressed',String(drawMode));stormBtn.setAttribute('aria-pressed',String(stormMode));stormBtn.textContent=stormMode?'☁️ 躲雨雲：開':'☁️ 躲雨雲：關';drawBtn.textContent=drawMode?'✏️ 畫線：開':'✏️ 畫線：關';
  const routeBtn=app.querySelector('#bee-route');if(routeBtn){routeBtn.setAttribute('aria-pressed',String(!!routeHint));routeBtn.textContent=routeHint?'🧭 收起路線':'🧭 畫出路線'}
  ink.innerHTML=(routeHint&&routeHint.length>1?'<polyline class="bee-route-guide" points="'+routeHint.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')+'"/>':'')+((drawMode||demoing)&&stroke.length>1?'<polyline points="'+stroke.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')+'" fill="none" stroke="#ff8b35" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>':'');
 }

 function stopDemo(preserveAuto=false){
  if(!preserveAuto){autoFlights=0;if(autoFlightTimer!==null){clearTimeout(autoFlightTimer);autoFlightTimer=null}}
  if(demoTimer!==null){clearTimeout(demoTimer);demoTimer=null}
  if(!demoing)return;
  demoing=false;stroke=[];const btn=app.querySelector('#bee-demo');if(btn)btn.textContent='▶️ 看飛行';const assist=app.querySelector('#bee-assist');if(assist)assist.textContent='👩 幫飛一朵／長按三朵';paintFlight();
 }
 function announceNext(){if(voiceGuide&&!finished&&run===epoch&&done<data.nodes.length)say('下一朵是第 '+(done+1)+' 朵花。')}
 function updateVoiceButton(){voiceBtn.setAttribute('aria-pressed',String(voiceGuide));voiceBtn.textContent=voiceGuide?'👂 自動報數：開':'👂 自動報數：關'}
 function updateListenButton(){listenBtn.setAttribute('aria-pressed',String(listenMode));listenBtn.textContent=listenMode?'🔢 點花聽數字：開':'🔢 點花聽數字：關'}
 function hearFlower(i){if(!listenMode||finished||run!==epoch||!Number.isInteger(i)||i<0||i>=data.nodes.length)return false;audio?.unlock?.();say('第 '+(i+1)+' 朵花');msg.textContent='🔢 這是第 '+(i+1)+' 朵花！只聽數字，不會採蜜。';vib(8);return true}
 function save(){state.beeLevel=level;state.beeCheckpoint={level,done};persist()}
 function paint(){
  if(run!==epoch)return;
  app.querySelector('#bee-progress').textContent='🐝 已採蜜 '+done+' / '+data.nodes.length+' 朵　　⭐ '+(Number(state.stars)||0)+' 顆星';
  app.querySelector('#bee-undo').disabled=finished||done===0;updateVoiceButton();updateListenButton();
  cloudLayer.innerHTML=stormMode?clouds.map(p=>'<span class="bee-cloud" style="left:'+p.x+'%;top:'+p.y+'%">☁️</span>').join(''):'';
  nodes.innerHTML=data.nodes.map((p,i)=>'<button type="button" class="bee-flower '+(i<done-1?'bee-rewindable ':'')+(i<done?'bee-done':i===done?'bee-next':'bee-wait')+'" data-flower="'+i+'" style="left:'+p.x+'%;top:'+p.y+'%" aria-label="第'+(i+1)+'朵花，'+(i<done-1?'已採蜜，點擊可退回這朵':i<done?'已採蜜':i===done?'下一朵':'尚未輪到')+'"><span>'+p.icon+'</span><b>'+p.num+'</b></button>').join('');
  const pts=[{x:9,y:82},...data.nodes.slice(0,done)];
  lines.innerHTML=pts.slice(1).map((p,i)=>'<line x1="'+pts[i].x+'" y1="'+pts[i].y+'" x2="'+p.x+'" y2="'+p.y+'" stroke="#f4a61e" stroke-width="1.8" stroke-linecap="round"/>').join('');paintFlight();
 }
 function win(){if(finished||run!==epoch)return;stopDemo();finished=true;const fresh=award(level);audio?.play?.('win');fx('win');vib([15,25,15]);say('太棒了！小蜜蜂採到所有花蜜了！');
  const overlay=document.createElement('div');overlay.className='overlay';overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>'+(stormMode?'☁️ 成功繞過烏雲！':'🐝 採蜜成功！')+'</h2><p>🌻 🌷 🌺 '+(fresh?'得到三顆星星！':'又完成一次！')+'</p><button class="primary" id="bee-next">▶️ 下一關</button><button class="classic-secondary" id="bee-again">🔄 再玩一次</button><button class="classic-secondary" id="bee-leave">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#bee-next').onclick=()=>start(level===MAX?1:level+1);
  overlay.querySelector('#bee-again').onclick=()=>start(level);
  overlay.querySelector('#bee-leave').onclick=()=>{epoch++;window.YanClassics.menu()};
 }
 function rewindTo(i){
  const next=rewindCount(done,i);
  if(finished||run!==epoch||next===done)return false;
  stopDemo();
  if(activePointer!==null){try{if(board.hasPointerCapture?.(activePointer))board.releasePointerCapture(activePointer)}catch(_){}}
  activePointer=null;lastPoint=null;dragging=false;stroke=[];
  done=next;routeHint=null;save();paint();announceNext();
  msg.textContent='↩️ 已飛回第 '+done+' 朵花！從第 '+(done+1)+' 朵繼續採蜜！';
  audio?.play?.('hit');vib(8);return true;
 }
 function collect(i,keepGesture=false){if(finished||listenMode||run!==epoch)return false;if(demoing)stopDemo(autoFlights>0);const next=advance(done,i,data.nodes.length);
  if(next===done){if(i!==done){audio?.play?.('wrong');msg.textContent='💗 找發光的下一朵花！';if(voiceGuide)announceNext()}return false}
  done=next;routeHint=null;stroke=keepGesture?[anchor()]:[];dragging=!!keepGesture;save();audio?.play?.('hit');vib(10);msg.textContent=done===data.nodes.length?'🎉 花蜜收集完成！':'🐝 採到啦！不用放開手指，繼續滑到第 '+(done+1)+' 朵花！';paint();
  if(done===data.nodes.length)win();else{
   announceNext();
   if(autoFlights>0){autoFlights--;
    if(autoFlights>0)autoFlightTimer=setTimeout(()=>{autoFlightTimer=null;if(autoFlights>0&&run===epoch&&!finished&&!demoing&&activePointer===null)assistAction();else autoFlights=0},220);
   }
  }return true;
 }
 function hitPoint(e){const rect=board.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100,p=data.nodes[done];
  if(p&&Math.hypot((x-p.x)*rect.width/100,(y-p.y)*rect.height/100)<30)collect(done,true);
 }
 board.addEventListener('pointerdown',e=>{
  if(finished||activePointer!==null||e.isPrimary===false)return;
  const prior=e.target.closest?.('[data-flower]');
  if(listenMode){if(prior)hearFlower(Number(prior.dataset.flower));e.preventDefault?.();return}
  if(prior&&rewindTo(Number(prior.dataset.flower))){e.preventDefault?.();return}
  if(prior&&Number(prior.dataset.flower)>done&&!drawMode){msg.textContent='💗 先找發光的第 '+(done+1)+' 朵花！';audio?.play?.('wrong');vib(16);if(voiceGuide)announceNext()}
  if(demoing)stopDemo();
  audio?.unlock?.();
  const p=point(e);if(routeHint){routeHint=null;paintFlight()}
  /* Preschool-friendly: a quick tap on the next flower works in ordinary draw mode.
     Storm mode still requires a cloud-safe flight from the bee. */
  if(drawMode&&!stormMode&&data.nodes[done]&&distance(p,data.nodes[done])<=Math.max(30,board.clientWidth*.095)){
   collect(done);e.preventDefault?.();return;
  }
  if(drawMode){
   const a=anchor();
   if(distance(p,a)>Math.max(30,board.clientWidth*.13)){msg.textContent='🐝 從小蜜蜂的位置開始畫線！';return}
   stroke=[a,p];dragging=true;paintFlight();
  }else{dragging=true}
  activePointer=e.pointerId;lastPoint=p;
  try{board.setPointerCapture(e.pointerId)}catch(_){}
  if(!drawMode)hitPoint(e);
 });
 board.addEventListener('pointermove',e=>{
  if(!dragging||finished||e.pointerId!==activePointer)return;
  const p=point(e),target=data.nodes[done];
  if(!drawMode){
   if(segmentTouchesFlower(lastPoint||p,p,target,board.clientWidth,board.clientHeight,30))collect(done,true);
   lastPoint=p;return;
  }
  const last=stroke[stroke.length-1];if(distance(p,last)<3)return;
  if(stormMode&&segmentHitsCloud(last,p,clouds,board.clientWidth,board.clientHeight)){
   dragging=false;stroke=[];paintFlight();msg.textContent='☁️ 撞到烏雲！繞開它再飛一次！';audio?.play?.('wrong');vib(35);return;
  }
  stroke.push(p);if(stroke.length>240)stroke.splice(1,1);
  if(segmentTouchesFlower(last,p,target,board.clientWidth,board.clientHeight,Math.max(26,board.clientWidth*.085))){collect(done,true);return}
  paintFlight();
 });
 function endStroke(e){
  if(e.pointerId!==activePointer)return;
  /* v333: mobile flicks can jump directly from pointerdown to pointerup.
     Check the final swept segment in ordinary mode; cancel/lost capture never scores. */
  if(e.type==='pointerup'&&dragging&&!finished){
   const p=point(e),target=data.nodes[done],last=drawMode?(stroke[stroke.length-1]||lastPoint||anchor()):(lastPoint||p);
   if(drawMode){
    if(target&&stormMode&&segmentHitsCloud(last,p,clouds,board.clientWidth,board.clientHeight)){
     msg.textContent='☁️ 最後這段飛過烏雲了！請繞開再試！';audio?.play?.('wrong');vib(35);
    }else if(target&&segmentTouchesFlower(last,p,target,board.clientWidth,board.clientHeight,Math.max(30,board.clientWidth*.095))){
     collect(done);
    }
   }else if(target&&segmentTouchesFlower(last,p,target,board.clientWidth,board.clientHeight,30)){
    collect(done);
   }
  }
  activePointer=null;lastPoint=null;dragging=false;if(drawMode){stroke=[];paintFlight()}
 }
 board.addEventListener('pointerup',endStroke);board.addEventListener('pointercancel',endStroke);board.addEventListener('lostpointercapture',endStroke);
 drawBtn.onclick=()=>{if(finished||stormMode)return;stopDemo();drawMode=!drawMode;routeHint=null;dragging=false;activePointer=null;lastPoint=null;stroke=[];state.beeDrawMode=drawMode;persist();
  msg.textContent=drawMode?'✏️ 從小蜜蜂畫到花朵，放手會吸附；也可以直接點花朵！':'👆 點花朵，或用手指滑過花朵！';paintFlight();say(drawMode?'從小蜜蜂開始畫線，飛到發光的花花！':'用手指點發光的花花！')};
 stormBtn.onclick=()=>{if(finished)return;stopDemo();stormMode=!stormMode;routeHint=null;if(stormMode)drawMode=true;
  dragging=false;activePointer=null;lastPoint=null;stroke=[];state.beeStormMode=stormMode;state.beeDrawMode=drawMode;persist();paint();
  msg.textContent=stormMode?'☁️ 用手指畫彎彎的路，繞過烏雲採花蜜！':'🐝 烏雲消失了，繼續採蜜！';
  say(stormMode?'小蜜蜂要繞過烏雲，才能採到花蜜喔！':'烏雲消失了！')};
 nodes.addEventListener('click',e=>{if(e.detail!==0)return;const b=e.target.closest('[data-flower]');if(b){const i=Number(b.dataset.flower);if(listenMode)hearFlower(i);else if(!rewindTo(i))collect(i)}});
 app.querySelector('#bee-demo').onclick=()=>{
  if(finished||run!==epoch)return;
  if(demoing){stopDemo();msg.textContent='✋ 示範已停止，換你來飛！';return}
  if(activePointer!==null)return;
  const target=data.nodes[done];if(!target)return;
  const path=planBeeDemo(anchor(),target,stormMode?clouds:[],board.clientWidth,board.clientHeight);
  if(!path||path.some((p,i)=>i>0&&segmentHitsCloud(path[i-1],p,stormMode?clouds:[],board.clientWidth,board.clientHeight))){
   msg.textContent='☁️ 這次找不到安全路線，請自己繞過烏雲！';return;
  }
  const frames=[path[0]];
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],length=Math.hypot((b.x-a.x)*board.clientWidth/100,(b.y-a.y)*board.clientHeight/100);
   const count=Math.max(1,Math.ceil(length/13));
   for(let j=1;j<=count;j++)frames.push({x:a.x+(b.x-a.x)*j/count,y:a.y+(b.y-a.y)*j/count});
  }
  demoing=true;stroke=[frames[0]];paintFlight();app.querySelector('#bee-demo').textContent='⏹️ 停止示範';
  msg.textContent='👀 看小蜜蜂怎麼飛！示範不會幫你採蜜。';
  let i=1;
  function frame(){
   if(run!==epoch||!demoing)return;
   stroke.push(frames[i++]);paintFlight();
   if(i<frames.length)demoTimer=setTimeout(frame,55);
   else demoTimer=setTimeout(()=>{if(run!==epoch||!demoing)return;stopDemo();msg.textContent='🐝 換你試試！跟著剛才的路線飛到發光花朵！'},350);
  }
  demoTimer=setTimeout(frame,90);
 };
 function assistAction(){
  if(finished||run!==epoch)return;
  if(demoing){stopDemo();msg.textContent='✋ 已取消幫飛，換你來採蜜！';return}
  if(activePointer!==null)return;
  const target=data.nodes[done];if(!target)return;
  const obstacles=stormMode?clouds:[];
  const path=planBeeDemo(anchor(),target,obstacles,board.clientWidth,board.clientHeight);
  if(!path||path.some((p,i)=>i>0&&segmentHitsCloud(path[i-1],p,obstacles,board.clientWidth,board.clientHeight))){
   autoFlights=0;msg.textContent='☁️ 這朵花沒有安全路線，試著關掉烏雲或自己飛！';return;
  }
  const frames=[path[0]];
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],length=Math.hypot((b.x-a.x)*board.clientWidth/100,(b.y-a.y)*board.clientHeight/100);
   const count=Math.max(1,Math.ceil(length/16));
   for(let j=1;j<=count;j++)frames.push({x:a.x+(b.x-a.x)*j/count,y:a.y+(b.y-a.y)*j/count});
  }
  demoing=true;stroke=[frames[0]];paintFlight();
  app.querySelector('#bee-assist').textContent=autoFlights>0?'⏹️ 停止連飛 '+autoFlights+' 朵':'⏹️ 停止幫飛';
  msg.textContent='👩 媽媽帶小蜜蜂飛到下一朵，完成後會幫你採蜜！';
  let i=1;
  function fly(){
   if(run!==epoch||!demoing)return;
   if(i<frames.length){stroke.push(frames[i++]);paintFlight();demoTimer=setTimeout(fly,45)}
   else{demoTimer=null;collect(done)}
  }
  demoTimer=setTimeout(fly,80);
 }
 const assistBtn=app.querySelector('#bee-assist');
 const clearAssistHold=()=>{if(assistHoldTimer!==null){clearTimeout(assistHoldTimer);assistHoldTimer=null}assistPointer=null};
 assistBtn.addEventListener('pointerdown',e=>{
  if(finished||run!==epoch||e.isPrimary===false||assistPointer!==null)return;
  assistPointer=e.pointerId;assistLongHeld=false;
  assistHoldTimer=setTimeout(()=>{
   assistHoldTimer=null;
   if(run!==epoch||finished||assistPointer!==e.pointerId||activePointer!==null)return;
   assistLongHeld=true;autoFlights=3;audio?.unlock?.();assistAction();
  },600);
 });
 assistBtn.addEventListener('pointerup',e=>{if(assistPointer===e.pointerId){clearAssistHold();if(assistLongHeld)setTimeout(()=>{assistLongHeld=false},900)}});
 assistBtn.addEventListener('pointercancel',e=>{if(assistPointer===e.pointerId){clearAssistHold();if(assistLongHeld)stopDemo();assistLongHeld=false}});
 assistBtn.addEventListener('pointerleave',e=>{if(assistPointer===e.pointerId&&assistHoldTimer!==null)clearAssistHold()});
 assistBtn.onclick=e=>{
  if(assistLongHeld){assistLongHeld=false;e?.preventDefault?.();return}
  if(autoFlightTimer!==null){clearTimeout(autoFlightTimer);autoFlightTimer=null}
  autoFlights=0;assistAction();
 };
 listenBtn.onclick=()=>{if(finished||run!==epoch)return;stopDemo();if(activePointer!==null){try{if(board.hasPointerCapture?.(activePointer))board.releasePointerCapture(activePointer)}catch(_){}}activePointer=null;lastPoint=null;dragging=false;stroke=[];listenMode=!listenMode;updateListenButton();paintFlight();msg.textContent=listenMode?'🔢 點任何花朵，聽第幾朵！不會改變採蜜進度。':'🐝 回到採蜜模式！找發光的下一朵花。';say(listenMode?'點花花，聽聽是第幾朵！':'現在繼續採蜜！')};
 voiceBtn.onclick=()=>{if(finished||run!==epoch)return;audio?.unlock?.();voiceGuide=!voiceGuide;state.beeVoiceGuide=voiceGuide;persist();updateVoiceButton();msg.textContent=voiceGuide?'👂 自動報數開啟！採到花就會告訴你下一朵。':'🔇 自動報數關閉，仍可按找下一朵聽提示。';if(voiceGuide)announceNext()};
 app.querySelector('#bee-route').onclick=()=>{
  if(finished||run!==epoch||activePointer!==null)return;
  if(routeHint){routeHint=null;paintFlight();msg.textContent='🧭 路線已收起，自己試著飛！';return}
  stopDemo();
  const target=data.nodes[done];if(!target)return;
  const obstacles=stormMode?clouds:[],path=planBeeDemo(anchor(),target,obstacles,board.clientWidth,board.clientHeight);
  if(!path||path.some((p,i)=>i>0&&segmentHitsCloud(path[i-1],p,obstacles,board.clientWidth,board.clientHeight))){
   msg.textContent='☁️ 暫時找不到安全路線，試著關掉烏雲！';return;
  }
  routeHint=path;paintFlight();msg.textContent='🧭 跟著藍色虛線飛到發光的花朵！不會自動過關。';
  audio?.unlock?.();say('跟著藍色虛線飛到發光的花花！');
 };
 app.querySelector('#bee-hint').onclick=()=>{if(finished)return;msg.textContent='💡 看發光的第 '+(done+1)+' 朵花！';say('彥彥，找發光的花花！第'+(done+1)+'朵。');paint()};
 function undoOne(){
  if(finished||run!==epoch||done===0)return;
  stopDemo();
  if(activePointer!==null){try{if(board.hasPointerCapture?.(activePointer))board.releasePointerCapture(activePointer)}catch(_){}}
  activePointer=null;lastPoint=null;dragging=false;stroke=[];
  done--;routeHint=null;save();paint();announceNext();
  msg.textContent='↩️ 退回第 '+(done+1)+' 朵，重新採蜜！';
  audio?.play?.('hit');vib(8);
 }
 app.querySelector('#bee-undo').onclick=undoOne;
 app.querySelector('#bee-restart').onclick=()=>{stopDemo();start(level)};
 app.querySelector('#bee-voice').onclick=()=>{audio?.unlock?.();say('用手指畫線，依照數字，讓小蜜蜂一朵一朵採花蜜！')};
 app.querySelector('#bee-back').onclick=app.querySelector('#bee-menu').onclick=()=>{stopDemo();epoch++;window.YanClassics.menu()};
 app.querySelector('#bee-home').onclick=()=>{stopDemo();epoch++;renderHome()};
 save();paint();if(voiceGuide)announceNext();else say('彥彥，跟著發光的花花，用手指畫線，幫小蜜蜂採蜜！');
}
const hub=window.YanGameHub;
if(hub&&Array.isArray(hub.groups)){const group=hub.groups.find(g=>g[0]==='logic');if(group&&!group[4].some(i=>i[3]==='YanBeeGame'))group[4].push(['🐝','蜜蜂畫線採蜜','手指連花、依序採蜜','YanBeeGame'])}
window.YanBeeGame={start,makeLevel,makeClouds,segmentHitsCloud,segmentTouchesFlower,planBeeDemo,validCheckpoint,advance,rewindCount,award,MAX};
})();