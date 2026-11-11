(()=>{'use strict';
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh,audio=window.YanClassicAudio;
const MAX=24,cars=['🚜','🚛','🚒','🚚','🚙','🚐','🚕','🚓'];let epoch=0;
function config(n){n=Math.max(1,Math.min(MAX,Math.round(Number(n)||1)));const cells=Array.from({length:12},(_,i)=>i);let seed=n*73+17;for(let i=11;i>0;i--){seed=(seed*1664525+1013904223)>>>0;const j=seed%(i+1);[cells[i],cells[j]]=[cells[j],cells[i]]}return {car:cars[(n-1)%cars.length],spots:cells.slice(0,Math.min(8,3+Math.floor((n-1)/4))).map((c,i)=>({id:i,x:14+(c%4)*24,y:20+Math.floor(c/4)*29}))}}
function award(n){const done=Array.isArray(state.ywashDone)?state.ywashDone.filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX):[];const fresh=!done.includes(n);if(fresh){state.ywashDone=[...done,n];state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}state.ywashLevel=n===MAX?1:n+1;state.ywashCheckpoint=null;persist();return fresh}
function start(requested,reset){epoch++;const run=epoch;audio?.unlock?.();const n=Math.max(1,Math.min(MAX,Math.round(Number(requested===undefined?state.ywashLevel:requested)||1))),cfg=config(n),cp=!reset&&requested===undefined?state.ywashCheckpoint:null;
let stage=cp&&cp.level===n&&['foam','scrub','rinse','dry'].includes(cp.stage)?cp.stage:'foam',cleaned=new Set(cp&&cp.level===n&&Array.isArray(cp.cleaned)?cp.cleaned.filter(i=>Number.isInteger(i)&&i>=0&&i<cfg.spots.length):[]),finished=false,drag=false,activePointer=null,lastPoint=null,finishPointer=null,finishStart=null,finishStage=null,challenge=!!(cp&&cp.level===n&&cp.challenge),lastWrongAt=0;
app.innerHTML='<section class="screen game classic-screen yw-screen">'+bg('play')+'<header class="bar topbar"><button class="iconbtn" id="yw-back">⌂</button><span class="chip">🫧 工程車洗車場</span><span class="chip">⭐ '+n+'/'+MAX+'</span><button class="iconbtn" id="yw-voice">🔊</button></header><main class="yw-stage allow-scroll"><div class="yw-title">🚜 幫工程車洗香香！</div><div class="yw-status" id="yw-status" role="status" aria-live="polite"></div><div class="yw-pad" id="yw-pad" aria-label="用手指擦洗車子"><div class="yw-sky">☀️ 🌈 ☁️</div><div class="yw-car">'+cfg.car+'</div><div class="yw-ground">🪴 🌼 🧽 🌼 🪴</div>'+cfg.spots.map(s=>'<span class="yw-dirt" data-spot="'+s.id+'" style="left:'+s.x+'%;top:'+s.y+'%">🟤</span>').join('')+'<div class="yw-sponge" id="yw-sponge" aria-hidden="true">🧽</div><div class="yw-gesture-meter" id="yw-gesture-meter" aria-hidden="true"><div class="yw-gesture-track"><div id="yw-gesture-fill"></div></div><span id="yw-gesture-icon">💦</span></div><div class="yw-shine" id="yw-shine">✨✨✨</div></div><div class="yw-meter"><div id="yw-meter"></div></div><div class="yw-actions"><button id="yw-foam">🫧 泡泡</button><button id="yw-rinse">💦 沖水</button><button id="yw-dry">🧻 擦乾</button><button id="yw-hint">💡 幫一下</button></div><div class="yw-help">👆 摸車子冒泡泡、滑動擦泥巴；再滑動沖水、擦乾！按鍵也能操作；長按💡幫一下會連續擦泥巴，放開停止！</div><div class="yw-tools"><button id="yw-order" class="yw-order" type="button">🎯 開啟數字順序挑戰</button><button id="yw-undo" class="yw-order yw-undo" type="button" disabled>↶ 擦回一塊</button></div><button id="yw-retry" class="yw-retry">🔄 重玩這關</button></main><footer class="bottombar"><button class="footbtn blue" id="yw-home">⌂ 首頁</button><button class="footbtn yellow" id="yw-menu">🎲 其他遊戲</button></footer></section>';
const el=id=>app.querySelector('#'+id),pad=el('yw-pad');
function save(){if(run!==epoch||finished)return;state.ywashLevel=n;state.ywashCheckpoint={level:n,stage,cleaned:[...cleaned],challenge};persist()}
function paint(){if(run!==epoch)return;app.querySelectorAll('[data-spot]').forEach(e=>{const i=Number(e.dataset.spot);e.hidden=cleaned.has(i);e.textContent=challenge?'①②③④⑤⑥⑦⑧'[i]:'🟤';e.classList.toggle('yw-dirt-target',challenge&&stage==='scrub'&&i===cleaned.size)});el('yw-order').disabled=finished||cleaned.size>0||stage==='rinse'||stage==='dry';el('yw-undo').disabled=finished||!cleaned.size||stage==='foam'||stage==='dry';el('yw-order').textContent=challenge?'🎯 順序挑戰已開（點我關閉）':'🎯 開啟數字順序挑戰';el('yw-meter').style.width=(100*cleaned.size/cfg.spots.length)+'%';el('yw-foam').disabled=stage!=='foam'||finished;el('yw-rinse').disabled=stage!=='rinse'||finished;el('yw-dry').disabled=stage!=='dry'||finished;pad.classList.toggle('yw-foamy',stage==='scrub');pad.classList.toggle('yw-wet',stage==='dry');pad.classList.toggle('yw-rinse-ready',stage==='rinse');pad.classList.toggle('yw-dry-ready',stage==='dry');el('yw-status').textContent=stage==='foam'?'🫧 直接摸車子，泡泡就來了！':stage==='scrub'?(challenge?'🎯 依序擦亮亮的 '+('①②③④⑤⑥⑦⑧'[cleaned.size]||'✨')+'！ ':'🧽 第二步：擦泥巴 ')+cleaned.size+'/'+cfg.spots.length:stage==='rinse'?'💦 在車上滑動沖水！也可按沖水':'🧻 在車上滑動擦乾！也可按擦乾';save()}
function foam(){if(stage!=='foam'||finished)return false;stage='scrub';audio?.play?.('hit');say('泡泡來了！用手指把泥巴擦掉！');paint();return true}
function clean(id){if(stage!=='scrub'||finished||!Number.isInteger(id)||id<0||id>=cfg.spots.length||cleaned.has(id))return false;if(challenge&&id!==cleaned.size){if(Date.now()-lastWrongAt>900){lastWrongAt=Date.now();el('yw-status').textContent='🔎 先擦亮亮的 '+('①②③④⑤⑥⑦⑧'[cleaned.size]||'✨')+'！';audio?.play?.('wrong');vib(10)}return false}cleaned.add(id);audio?.play?.('hit');vib(6);if(cleaned.size===cfg.spots.length){stage='rinse';say('好棒！現在按沖水！')}paint();return true}
function rinse(){if(stage!=='rinse'||finished)return false;stage='dry';audio?.play?.('hit');say('沖乾淨了！幫車子擦乾！');paint();return true}
function win(){if(finished||run!==epoch)return false;finished=true;const fresh=award(n);audio?.play?.('win');fx('win');vib([20,30,20]);say('太棒了！工程車洗得亮晶晶！');pad.classList.add('yw-clean');el('yw-shine').classList.add('visible');const overlay=document.createElement('div');overlay.className='overlay';overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>✨ 洗車成功！</h2><p>'+(fresh?'得到三顆星星！':'再次成功過關！')+'</p><button class="primary" id="yw-next">▶️ 下一關</button><button class="classic-secondary" id="yw-again">🔄 再玩一次</button><button class="classic-secondary" id="yw-other">🎲 其他遊戲</button></div>';app.querySelector('.screen').appendChild(overlay);overlay.querySelector('#yw-next').onclick=()=>start(n===MAX?1:n+1,true);overlay.querySelector('#yw-again').onclick=()=>start(n,true);overlay.querySelector('#yw-other').onclick=()=>{epoch++;window.YanClassics.menu()};return true}
function dry(){if(stage!=='dry'||finished)return false;return win()}
function scrub(e){
 if(stage!=='scrub'||finished)return;
 const r=pad.getBoundingClientRect();
 if(!r.width||!r.height)return;
 const point={x:e.clientX-r.left,y:e.clientY-r.top},from=lastPoint||point;
 const dx=point.x-from.x,dy=point.y-from.y,lengthSq=dx*dx+dy*dy;
 const radius=Math.max(27,Math.min(r.width,r.height)*.095);
 for(const s of cfg.spots){
  const sx=s.x*r.width/100,sy=s.y*r.height/100;
  const t=lengthSq?Math.max(0,Math.min(1,((sx-from.x)*dx+(sy-from.y)*dy)/lengthSq)):0;
  if(Math.hypot(sx-from.x-dx*t,sy-from.y-dy*t)<radius)clean(s.id);
 }
 lastPoint=point;
 const sponge=el('yw-sponge');
 sponge.style.left=point.x+'px';
 sponge.style.top=point.y+'px';
}
function stopScrub(){drag=false;activePointer=null;lastPoint=null;pad.classList.remove('yw-scrubbing')}
// v383: optional number-order scrubbing puzzle; wrong spots do not clear, checkpoint retains mode.
// v259: rinse and dry by swiping across the car; buttons remain accessible.
// v297: show finger-following rinse/dry progress and finish as soon as a real swipe crosses 52px.
const gestureMeter=el('yw-gesture-meter'),gestureFill=el('yw-gesture-fill'),gestureIcon=el('yw-gesture-icon');
function stopFinish(){finishPointer=null;finishStart=null;finishStage=null;pad.classList.remove('yw-gesture-active');gestureMeter.classList.remove('visible');gestureFill.style.width='0%'}
function finishSwipe(e){if(e.pointerId!==finishPointer)return;const startPoint=finishStart,expected=finishStage;const distance=startPoint?Math.hypot(e.clientX-startPoint.x,e.clientY-startPoint.y):0;stopFinish();if(!startPoint||finished||stage!==expected)return;if(distance<52){el('yw-status').textContent='👆 再滑長一點，進度條滿格就完成！';return}if(expected==='rinse')rinse();else if(expected==='dry')dry()}
function updateFinish(e){if(e.pointerId!==finishPointer||!finishStart||finished)return;const distance=Math.hypot(e.clientX-finishStart.x,e.clientY-finishStart.y),rect=pad.getBoundingClientRect();gestureFill.style.width=Math.min(100,Math.round(distance/52*100))+'%';gestureIcon.style.left=Math.max(20,Math.min(rect.width-20,e.clientX-rect.left))+'px';gestureIcon.style.top=Math.max(20,Math.min(rect.height-20,e.clientY-rect.top))+'px';if(distance>=52)finishSwipe(e)}
pad.addEventListener('pointerdown',e=>{
 if(finished||drag||finishPointer!==null)return;
 if(stage==='rinse'||stage==='dry'){finishPointer=e.pointerId;finishStart={x:e.clientX,y:e.clientY};finishStage=stage;pad.classList.add('yw-gesture-active');gestureMeter.classList.add('visible');gestureIcon.textContent=stage==='rinse'?'💦':'🧻';gestureFill.style.width='0%';try{pad.setPointerCapture(e.pointerId)}catch(_){}updateFinish(e);e.preventDefault();return}
 if(stage!=='foam'&&stage!=='scrub')return;
 if(stage==='foam'&&!foam())return;
 drag=true;activePointer=e.pointerId;lastPoint=null;pad.classList.add('yw-scrubbing');try{pad.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault();scrub(e)
});
pad.addEventListener('pointermove',e=>{if(drag&&e.pointerId===activePointer){e.preventDefault();scrub(e)}else if(e.pointerId===finishPointer){e.preventDefault();updateFinish(e)}});
pad.addEventListener('pointerup',e=>{if(e.pointerId===activePointer)stopScrub();else finishSwipe(e)});
pad.addEventListener('pointercancel',e=>{if(e.pointerId===activePointer)stopScrub();if(e.pointerId===finishPointer)stopFinish()});
pad.addEventListener('lostpointercapture',e=>{if(e.pointerId===activePointer)stopScrub();if(e.pointerId===finishPointer)stopFinish()});
// v386: hold the existing help button to clean remaining mud one spot at a time; release or cancel stops immediately.
let hintHold=null,suppressHintUntil=0;
const hintButton=el('yw-hint');
hintButton.style.touchAction='none';
hintButton.setAttribute('aria-label','輕點幫忙一步；按住半秒連續擦泥巴，放開停止');
function stopHintHold(e,canceled){
 const g=hintHold;if(!g||g.id!==e.pointerId)return;
 clearTimeout(g.timer);clearInterval(g.repeat);hintHold=null;
 hintButton.textContent='💡 幫一下';
 if(g.active||canceled){
  suppressHintUntil=Date.now()+650;
  if(g.active)el('yw-status').textContent=stage==='rinse'?'🫧 泥巴擦完了！現在滑動沖水！':'✋ 放開了，換彥彥自己擦！';
 }
}
hintButton.addEventListener('pointerdown',e=>{
 if(finished||hintHold||e.isPrimary===false||e.button>0)return;
 const g={id:e.pointerId,x:e.clientX,y:e.clientY,active:false,timer:null,repeat:null};hintHold=g;
 g.timer=setTimeout(()=>{
  if(hintHold!==g||finished||run!==epoch)return;
  g.active=true;hintButton.textContent='🧽 正在幫擦…';
  const step=()=>{
   if(hintHold!==g||finished||run!==epoch||stage==='rinse'||stage==='dry'){clearInterval(g.repeat);return}
   if(stage==='foam')foam();
   if(stage==='scrub'){const spot=cfg.spots.find(s=>!cleaned.has(s.id));if(spot)clean(spot.id)}
  };
  step();g.repeat=setInterval(step,320);
 },550);
 try{hintButton.setPointerCapture(e.pointerId)}catch(_){}
});
hintButton.addEventListener('pointermove',e=>{
 const g=hintHold;if(!g||g.id!==e.pointerId||g.active)return;
 if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>14)stopHintHold(e,true);
});
hintButton.addEventListener('pointerup',e=>stopHintHold(e,false));
hintButton.addEventListener('pointercancel',e=>stopHintHold(e,true));
hintButton.addEventListener('lostpointercapture',e=>stopHintHold(e,true));
el('yw-order').onclick=()=>{if(finished||cleaned.size>0||stage==='rinse'||stage==='dry')return;challenge=!challenge;paint();say(challenge?'按照一二三順序擦泥巴！':'自由擦泥巴！')};el('yw-foam').onclick=foam;el('yw-rinse').onclick=rinse;el('yw-dry').onclick=dry;el('yw-hint').onclick=()=>{if(Date.now()<suppressHintUntil)return;if(stage==='foam')foam();else if(stage==='scrub'){const s=cfg.spots.find(s=>!cleaned.has(s.id));if(s){clean(s.id);say('看這裡！一起擦乾淨！')}}else if(stage==='rinse')rinse();else if(stage==='dry')dry()};
// v384: undo the most recently scrubbed dirt, including the last dirt before rinse. Keep checkpoint, mode and star accounting unchanged.
el('yw-undo').onclick=()=>{if(finished||!cleaned.size||(stage!=='scrub'&&stage!=='rinse'))return;const last=[...cleaned].pop();cleaned.delete(last);if(stage==='rinse')stage='scrub';audio?.play?.('pop');vib(8);paint();el('yw-status').textContent='↶ 擦回一塊！可以再試一次。';say('再試一次！')};
el('yw-retry').onclick=()=>start(n,true);el('yw-voice').onclick=()=>{audio?.unlock?.();say('幫彥彥洗工程車！直接摸車子就有泡泡！用手指擦泥巴，接著在車上滑動沖水，再滑動擦乾！也可以按下方按鍵！')};el('yw-back').onclick=el('yw-menu').onclick=()=>{epoch++;window.YanClassics.menu()};el('yw-home').onclick=()=>{epoch++;renderHome()};paint();say('工程車髒髒的！直接摸車子就有泡泡，再擦泥巴！')}
const hub=window.YanGameHub;if(hub&&Array.isArray(hub.groups)){const g=hub.groups.find(x=>x[0]==='build');if(g&&!g[4].some(x=>x[3]==='YanWashGame'))g[4].push(['🫧','工程車洗車場','泡泡、擦洗、沖水、擦乾','YanWashGame'])}
window.YanWashGame={start,config,award,MAX};
})();