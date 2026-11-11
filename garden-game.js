/* v404: reversible garden redo stack persists through reload, invalidated by new care actions. */
(()=>{'use strict';
/* v354: optional 650ms long-press on an easy-care flower pot completes its remaining care stages with reversible history. */
/* v338: persistent 12-step undo history for garden actions and sweeps. */
/* v309: one-finger easy-care sweep across pots; commit only on release, once per pot, with cancel/multitouch safety. */
/* v264: optional tap-a-pot easy care advances exactly one valid stage, with undo and saved checkpoints. */
/* v204: optional one-tap legal care action. */
/* v156: sweep care tool across multiple beds in one gesture; only matching stages advance. */
/* v141: direct care-tool drag to beds; wrong targets and cancellation safe. */
/* v140: direct seed-to-bed drag planting, correct and wrong targets, pointer cancellation. */
/* v112: fast multi-bed rain sweep with interpolated pointer path and multi-touch protection. */
/* v108: one-step undo with persistent checkpoint. */
/* v53: 24-stage touch garden with rain-cloud swipe watering. Independent mechanics, persistent checkpoints, no private photos. */
const sh=window.YanClassicShared, audio=window.YanClassicAudio;
if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh;
const MAX=24;
const PLANTS=[{id:'rose',icon:'🌹',name:'玫瑰'},{id:'sunflower',icon:'🌻',name:'向日葵'},{id:'tulip',icon:'🌷',name:'鬱金香'},{id:'hibiscus',icon:'🌺',name:'花花'},{id:'cactus',icon:'🌵',name:'仙人掌'},{id:'strawberry',icon:'🍓',name:'草莓'},{id:'clover',icon:'🍀',name:'幸運草'}];
const ACTIONS={water:{icon:'💧',name:'澆水'},sun:{icon:'☀️',name:'曬太陽'},harvest:{icon:'🧺',name:'收成'}};
let epoch=0;
function sweepBeds(a,b,lookup){
 if(!a||!b||typeof lookup!=='function')return [];
 const dx=b.x-a.x,dy=b.y-a.y;
 const count=Math.max(1,Math.min(240,Math.ceil(Math.hypot(dx,dy)/10)));
 const hits=[],seen=new Set();
 for(let i=1;i<=count;i++){
  const id=lookup(a.x+dx*i/count,a.y+dy*i/count);
  if(Number.isInteger(id)&&id>=0&&!seen.has(id)){seen.add(id);hits.push(id)}
 }
 return hits;
}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
function shuffle(list,rand){let a=list.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeLevel(level){
 const n=level<=8?2:level<=16?3:4,rand=rng(520026+level*7919);
 const plants=shuffle(PLANTS,rand),targets=plants.slice(0,n).map(x=>x.id);
 return {level,targets,tray:shuffle(plants.slice(0,Math.min(PLANTS.length,n+2)).map(x=>x.id),rand),stages:targets.map(()=>0)};
}
function apply(board,tool,index){
 if(!board||!Number.isInteger(index)||index<0||index>=board.targets.length)return {ok:false,reason:'invalid'};
 const stage=board.stages[index],need=stage===0?'seed:'+board.targets[index]:stage===1?'water':stage===2?'sun':stage===3?'harvest':null;
 if(!need||tool!==need)return {ok:false,reason:need?'wrong':'done',need};
 const next={...board,stages:board.stages.slice()};next.stages[index]++;
 return {ok:true,board:next,complete:next.stages.every(s=>s===4),next:next.stages[index]};
}
function validCheckpoint(saved,base){
 return !!saved&&saved.level===base.level&&Array.isArray(saved.stages)&&saved.stages.length===base.targets.length&&saved.stages.every(s=>Number.isInteger(s)&&s>=0&&s<=4)&&saved.stages.some(s=>s<4);
}
function save(board){state.gardenLevel=board.level;state.gardenCheckpoint={level:board.level,stages:board.stages.slice()};persist()}
function award(level){
 const done=Array.isArray(state.gardenDone)?state.gardenDone.filter(n=>Number.isInteger(n)&&n>=1&&n<=MAX):[];
 const fresh=!done.includes(level);
 if(fresh){state.gardenDone=[...done,level];state.gardenHarvested=(Number(state.gardenHarvested)||0)+(level<=8?2:level<=16?3:4);state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1}
 state.gardenLevel=level===MAX?1:level+1;state.gardenCheckpoint=null;state.gardenUndo=null;state.gardenUndoHistory=[];state.gardenRedoHistory=[];persist();return fresh;
}
function start(requested){
 epoch++;const run=epoch;
 audio?.unlock?.();
 const level=Math.max(1,Math.min(MAX,Math.round(Number(requested===undefined?state.gardenLevel:requested)||1)));
 let board=makeLevel(level);
 if(requested===undefined&&validCheckpoint(state.gardenCheckpoint,board))board.stages=state.gardenCheckpoint.stages.slice();
 else {state.gardenUndo=null;state.gardenUndoHistory=[];state.gardenRedoHistory=[];}
 let tool='seed:'+board.targets[board.stages.findIndex(s=>s===0)] ;
 if(!board.stages.some(s=>s===0))tool=board.stages.some(s=>s===1)?'water':board.stages.some(s=>s===2)?'sun':'harvest';
 let finished=false,highlight=-1,rainMode=false,easyCare=!!state.gardenEasyCare,dragging=false,dragMoved=false,rainPointer=null,rainLast=null,suppressRainClickUntil=0;
 const validUndoFrame=frame=>!!frame&&frame.level===level&&Array.isArray(frame.stages)&&frame.stages.length===board.stages.length&&frame.stages.every(s=>Number.isInteger(s)&&s>=0&&s<=4);
 const oneStepBack=frame=>{
  if(!validUndoFrame(frame))return false;
  let changes=0;
  for(let i=0;i<board.stages.length;i++){const d=board.stages[i]-frame.stages[i];if(d===1)changes++;else if(d!==0)return false}
  return changes===1;
 };
 state.gardenUndoHistory=Array.isArray(state.gardenUndoHistory)?state.gardenUndoHistory.filter(validUndoFrame).slice(-12):[];
 if(!state.gardenUndoHistory.length&&oneStepBack(state.gardenUndo))state.gardenUndoHistory=[{level,stages:state.gardenUndo.stages.slice()}];
 if(state.gardenUndoHistory.length&&!oneStepBack(state.gardenUndoHistory[state.gardenUndoHistory.length-1]))state.gardenUndoHistory=[];
 state.gardenUndo=state.gardenUndoHistory.length?state.gardenUndoHistory[state.gardenUndoHistory.length-1]:null;
 const redoIsNext=frame=>validUndoFrame(frame)&&frame.stages.every((s,i)=>s>=board.stages[i]&&s<=board.stages[i]+1)&&frame.stages.reduce((n,s,i)=>n+s-board.stages[i],0)===1;
 state.gardenRedoHistory=Array.isArray(state.gardenRedoHistory)?state.gardenRedoHistory.filter(validUndoFrame).slice(-12):[];
 if(!redoIsNext(state.gardenRedoHistory[state.gardenRedoHistory.length-1]))state.gardenRedoHistory=[];
 function rememberUndo(){
  state.gardenRedoHistory=[];
  const frame={level,stages:board.stages.slice()},history=state.gardenUndoHistory;
  if(!history.length||history[history.length-1].stages.some((s,i)=>s!==frame.stages[i]))history.push(frame);
  if(history.length>12)history.splice(0,history.length-12);
  state.gardenUndo=history[history.length-1];
 }
 app.innerHTML='<section class="screen game classic-screen garden-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="garden-back" aria-label="返回遊戲選單">⌂</button><span class="chip">🌷 彥彥小花園</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="garden-voice" aria-label="重播玩法">🔊</button></header>'+
 '<main class="garden-stage allow-scroll"><div class="garden-banner">🌈 ☀️ 🦋 <strong>🚜 彥彥種花園</strong> 🐝 🌳</div>'+
 '<div class="garden-progress" id="garden-progress"></div><div class="garden-beds" id="garden-beds" role="group" aria-label="花園種植區"></div>'+
 '<div class="garden-caption">🌱 選種子　→　💧 澆水　→　☀️ 曬太陽　→　🧺 收成（開啟一碰照顧：輕點一步，長按花盆收成）</div>'+
 '<div class="garden-seeds" id="garden-seeds" role="group" aria-label="選擇種子"></div>'+
 '<div class="garden-tools" id="garden-tools" role="group" aria-label="照顧花園的工具"></div>'+'<button class="garden-rain" id="garden-rain" type="button" aria-pressed="false">🌧️ 雨雲澆花：滑過多盆一起澆水</button>'+
 '<button class="garden-easy" id="garden-easy" type="button" aria-pressed="false">👩 一碰照顧：關</button>'+
 '<div class="garden-message" id="garden-message" role="status" aria-live="polite">👆 點種子再點花盆，或拖種子／工具到花盆！</div>'+
 '<button class="garden-hint" id="garden-hint" type="button">💡 幫我找下一步</button><button class="garden-hint garden-auto-step" id="garden-auto-step" type="button">✨ 幫我做一步</button><button class="garden-hint" id="garden-undo" type="button">↶ 收回上一步</button><button class="garden-hint garden-redo" id="garden-redo" type="button">↷ 重做剛才一步</button></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="garden-home">⌂ 首頁</button><button class="footbtn yellow" id="garden-reset">🔄 重新種花</button></footer></section>';
 const beds=app.querySelector('#garden-beds'),seeds=app.querySelector('#garden-seeds'),tools=app.querySelector('#garden-tools'),msg=app.querySelector('#garden-message');
 const rain=app.querySelector('#garden-rain');
 const plant=id=>PLANTS.find(p=>p.id===id);
 const iconAt=(id,stage)=>stage===0?'🪴':stage===1?'🌱':stage===2?'🌿':stage===3?plant(id).icon:'🧺';
 function cue(){say('彥彥，先選種子再點花盆，或直接把種子拖到相同圖案的花盆。水壺、太陽、籃子可以按住滑過好幾盆，一次照顧多盆。種好要澆水、曬太陽，最後收成！')}
 function paint(){
  if(run!==epoch)return;
  const done=board.stages.filter(s=>s===4).length;
  app.querySelector('#garden-progress').textContent='🌟 '+done+' / '+board.targets.length+' 盆　　🌷 已收成 '+(Number(state.gardenHarvested)||0)+' 盆';
  beds.classList.toggle('garden-easy-sweep',easyCare&&!finished);
  beds.innerHTML=board.targets.map((id,i)=>'<button type="button" class="garden-bed '+(highlight===i?'garden-highlight':'')+'" data-bed="'+i+'" aria-label="'+plant(id).name+'花盆，'+['尚未種植','已種下','已澆水','已曬太陽','已收成'][board.stages[i]]+'"><span class="garden-target">'+plant(id).icon+'</span><span class="garden-grown">'+iconAt(id,board.stages[i])+'</span><span class="garden-step">'+['❔','💧','☀️','🧺','⭐'][board.stages[i]]+'</span></button>').join('');
  seeds.innerHTML=board.tray.map(id=>'<button type="button" class="garden-seed '+(tool==='seed:'+id?'garden-active':'')+'" data-seed="'+id+'" aria-label="選擇'+plant(id).name+'種子" aria-pressed="'+(tool==='seed:'+id)+'"><span>'+plant(id).icon+'</span><small>🌱</small></button>').join('');
  tools.innerHTML=Object.entries(ACTIONS).map(([id,a])=>'<button type="button" class="garden-tool '+(tool===id?'garden-active':'')+'" data-tool="'+id+'" aria-label="'+a.name+'" aria-pressed="'+(tool===id)+'"><span>'+a.icon+'</span><small>'+a.name+'</small></button>').join('');
  rain.classList.toggle('garden-rain-active',rainMode);
  rain.setAttribute('aria-pressed',String(rainMode));
  rain.disabled=finished||!board.stages.includes(1);
  const easy=app.querySelector('#garden-easy');easy.disabled=finished;easy.setAttribute('aria-pressed',String(easyCare));easy.textContent=easyCare?'👩 一碰照顧：開（點／滑／長按）':'👩 一碰照顧：關（點我開啟）';
  const undo=app.querySelector('#garden-undo');undo.disabled=finished||!oneStepBack(state.gardenUndoHistory[state.gardenUndoHistory.length-1]);undo.textContent='↶ 收回上一步（可收回 '+state.gardenUndoHistory.length+' 步）';
  const redo=app.querySelector('#garden-redo');redo.disabled=finished||!redoIsNext(state.gardenRedoHistory[state.gardenRedoHistory.length-1]);redo.textContent='↷ 再做一步（可重做 '+state.gardenRedoHistory.length+' 步）';
  app.querySelector('#garden-auto-step').disabled=finished;
 }
 function chooseNext(){const i=board.stages.findIndex(s=>s<4);if(i<0)return;const s=board.stages[i];tool=s===0?'seed:'+board.targets[i]:s===1?'water':s===2?'sun':'harvest'}
 /* v204: one-tap complete exactly one legal garden action, preserving undo and checkpoints. */
 function assistStep(){
  if(finished||run!==epoch)return false;
  const i=board.stages.findIndex(s=>s<4);if(i<0)return false;
  const stage=board.stages[i];
  const action=stage===0?'seed:'+board.targets[i]:stage===1?'water':stage===2?'sun':'harvest';
  const result=apply(board,action,i);if(!result.ok)return false;
  rememberUndo();
  board=result.board;rainMode=false;save(board);
  audio?.play?.('hit');vib(10);
  if(result.complete){highlight=-1;paint();win();return true}
  chooseNext();highlight=board.stages.findIndex(s=>s<4);paint();
  msg.textContent='✨ 幫你完成一步！接下來照顧發光的花盆。';
  return true;
 }
 function waterBed(index){
  if(!rainMode||finished||run!==epoch||board.stages[index]!==1)return false;
  const r=apply(board,'water',index);if(!r.ok)return false;
  rememberUndo();board=r.board;highlight=-1;save(board);audio?.play?.('hit');vib(10);
  if(r.complete){paint();win();return true;}
  if(board.stages.includes(1))tool='water';else{rainMode=false;chooseNext();}
  msg.textContent='🌧️ 雨雲澆水成功！';paint();return true;
 }
 function activateRain(){
  if(finished||!board.stages.includes(1))return;
  easyCare=false;state.gardenEasyCare=false;persist();rainMode=true;tool='water';highlight=board.stages.findIndex(s=>s===1);
  msg.textContent='🌧️ 點花盆，或按住雨雲拖過需要水的花盆！';paint();
 }
 function win(){
  if(finished||run!==epoch)return;finished=true;
  const fresh=award(level);audio?.play?.('win');fx('win');vib([15,25,15]);say('太棒了！彥彥把花園照顧得好漂亮！');
  const overlay=document.createElement('div');overlay.className='overlay';
  overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🌷 花園開花啦！</h2><p>🌻 🌹 🌷 '+(fresh?'得到三顆星星！':'再次完成種花！')+'</p><button class="primary" id="garden-next">▶️ 下一關</button><button class="classic-secondary" id="garden-again">🔄 再種一次</button><button class="classic-secondary" id="garden-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.screen').appendChild(overlay);
  overlay.querySelector('#garden-next').onclick=()=>start(level===MAX?1:level+1);
  overlay.querySelector('#garden-again').onclick=()=>start(level);
  overlay.querySelector('#garden-menu').onclick=()=>{epoch++;window.YanClassics.menu()};
 }

 // v140: one-finger seed-to-bed planting, with wrong-bed rejection and original tap-to-select preserved.
 let seedDrag=null,seedClickBlockUntil=0,seedClickBlockId='';
 const seedBedAt=(x,y)=>{
  const node=document.elementFromPoint(x,y)?.closest('[data-bed]');
  return node&&beds.contains(node)?Number(node.dataset.bed):-1;
 };
 function clearSeedDrag(){
  if(!seedDrag)return;
  seedDrag.ghost?.remove();
  beds.querySelectorAll('[data-bed]').forEach(b=>b.classList.remove('garden-drop-ready','garden-drop-wrong'));
  seedDrag=null;
 }
 seeds.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-seed]');
  if(!b||!seeds.contains(b)||seedDrag||finished||run!==epoch||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  audio?.unlock?.();
  seedDrag={pointerId:e.pointerId,id:b.dataset.seed,x:e.clientX,y:e.clientY,moved:false,ghost:null};
  try{b.setPointerCapture(e.pointerId)}catch(_){}
 });
 seeds.addEventListener('pointermove',e=>{
  const d=seedDrag;if(!d||e.pointerId!==d.pointerId||run!==epoch)return;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<12)return;
  if(!d.moved){
   d.moved=true;d.ghost=document.createElement('div');d.ghost.className='garden-seed-ghost';
   d.ghost.textContent=plant(d.id).icon;app.querySelector('.garden-screen').appendChild(d.ghost);
  }
  e.preventDefault();d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
  const target=seedBedAt(e.clientX,e.clientY);
  beds.querySelectorAll('[data-bed]').forEach(b=>{
   const hit=Number(b.dataset.bed)===target;
   b.classList.toggle('garden-drop-ready',hit&&board.stages[target]===0&&board.targets[target]===d.id);
   b.classList.toggle('garden-drop-wrong',hit&&(board.stages[target]!==0||board.targets[target]!==d.id));
  });
 });
 function endSeedDrag(e,commit){
  const d=seedDrag;if(!d||e.pointerId!==d.pointerId)return;
  const moved=d.moved,id=d.id,target=commit&&moved?seedBedAt(e.clientX,e.clientY):-1;
  if(moved){seedClickBlockId=id;seedClickBlockUntil=Date.now()+700;}
  clearSeedDrag();
  if(!commit||!moved||finished||run!==epoch)return;
  if(target<0){msg.textContent='🌱 把種子拖到相同圖案的花盆！';return}
  const r=apply(board,'seed:'+id,target);
  if(!r.ok){
   audio?.play?.('wrong');vib(8);highlight=target;
   msg.textContent='💗 圖案不一樣，再找 '+plant(id).icon+' 的花盆！';paint();return;
  }
  rememberUndo();board=r.board;rainMode=false;highlight=-1;
  save(board);audio?.play?.('hit');vib(10);
  msg.textContent='🌱 種好囉！接著澆水！';
  if(r.complete){paint();win();return}
  tool='water';paint();
 }
 seeds.addEventListener('pointerup',e=>endSeedDrag(e,true));
 seeds.addEventListener('pointercancel',e=>endSeedDrag(e,false));
 seeds.addEventListener('lostpointercapture',e=>endSeedDrag(e,false));
 seeds.onclick=e=>{const b=e.target.closest('[data-seed]');if(!b||finished)return;if(e.detail>0&&b.dataset.seed===seedClickBlockId&&Date.now()<seedClickBlockUntil){seedClickBlockUntil=0;return;}audio?.unlock?.();rainMode=false;if(easyCare){easyCare=false;state.gardenEasyCare=false;persist()}tool='seed:'+b.dataset.seed;highlight=-1;msg.textContent='🌱 '+plant(b.dataset.seed).icon+'　點相同圖案的花盆！';paint()};

 // v141: drag a watering can, sunshine, or basket onto a bed in one gesture.
 let careDrag=null,careClickBlockUntil=0,careClickBlockId='';
 function clearCareDrag(){
  if(!careDrag)return;
  careDrag.ghost?.remove();
  beds.querySelectorAll('[data-bed]').forEach(b=>b.classList.remove('garden-drop-ready','garden-drop-wrong'));
  careDrag=null;
 }
 tools.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-tool]');
  if(!b||!tools.contains(b)||careDrag||finished||run!==epoch||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  audio?.unlock?.();
  careDrag={pointerId:e.pointerId,id:b.dataset.tool,x:e.clientX,y:e.clientY,moved:false,ghost:null,last:{x:e.clientX,y:e.clientY},trail:[],seen:new Set()};
  try{b.setPointerCapture(e.pointerId)}catch(_){}
 });
 tools.addEventListener('pointermove',e=>{
  const d=careDrag;if(!d||e.pointerId!==d.pointerId||run!==epoch)return;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<12)return;
  if(!d.moved){
   d.moved=true;d.ghost=document.createElement('div');d.ghost.className='garden-seed-ghost garden-tool-ghost';
   d.ghost.textContent=ACTIONS[d.id].icon;app.querySelector('.garden-screen').appendChild(d.ghost);
  }
  e.preventDefault();d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
  const next={x:e.clientX,y:e.clientY};
  for(const index of sweepBeds(d.last,next,seedBedAt)){
   if(!d.seen.has(index)){d.seen.add(index);d.trail.push(index)}
  }
  d.last=next;
  const target=seedBedAt(e.clientX,e.clientY);
  beds.querySelectorAll('[data-bed]').forEach(b=>{
   const index=Number(b.dataset.bed),hit=index===target;
   const stage=board.stages[index],required=stage===1?'water':stage===2?'sun':stage===3?'harvest':'';
   b.classList.toggle('garden-drop-ready',(hit||d.seen.has(index))&&required===d.id);
   b.classList.toggle('garden-drop-wrong',hit&&required!==d.id);
  });
 });
 function endCareDrag(e,commit){
  const d=careDrag;if(!d||e.pointerId!==d.pointerId)return;
  const moved=d.moved,id=d.id,target=commit&&moved?seedBedAt(e.clientX,e.clientY):-1;
  if(target>=0&&!d.seen.has(target)){d.seen.add(target);d.trail.push(target)}
  const trail=d.trail.slice();
  if(moved){careClickBlockId=id;careClickBlockUntil=Date.now()+700;}
  clearCareDrag();
  if(!commit||!moved||finished||run!==epoch)return;
  if(!trail.length){msg.textContent='🌷 把工具滑過需要照顧的花盆！';return;}
  let applied=0,skipped=0;
  for(const index of trail){
   const r=apply(board,id,index);
   if(!r.ok){skipped++;continue;}
   rememberUndo();
   board=r.board;save(board);applied++;
  }
  if(!applied){
   audio?.play?.('wrong');vib(8);highlight=target>=0?target:trail[trail.length-1];
   msg.textContent='💗 這些花盆現在不需要'+ACTIONS[id].name+'，看看花盆下方圖案！';paint();return;
  }
  rainMode=false;highlight=-1;audio?.play?.('hit');vib(10);
  msg.textContent=applied>1?'✨ 一次照顧 '+applied+' 盆成功！'+(skipped?' 其他花盆還沒到這一步。':''):'🌷 '+ACTIONS[id].name+'成功！';
  if(board.stages.every(s=>s===4)){paint();win();return;}
  const neededStage=id==='water'?1:id==='sun'?2:3;
  if(board.stages.includes(neededStage))tool=id;else chooseNext();
  paint();
 }
 tools.addEventListener('pointerup',e=>endCareDrag(e,true));
 tools.addEventListener('pointercancel',e=>endCareDrag(e,false));
 tools.addEventListener('lostpointercapture',e=>endCareDrag(e,false));
 tools.onclick=e=>{const b=e.target.closest('[data-tool]');if(!b||finished)return;if(e.detail>0&&b.dataset.tool===careClickBlockId&&Date.now()<careClickBlockUntil){careClickBlockUntil=0;return;}audio?.unlock?.();rainMode=false;if(easyCare){easyCare=false;state.gardenEasyCare=false;persist()}tool=b.dataset.tool;highlight=-1;msg.textContent=ACTIONS[tool].icon+' 點需要'+ACTIONS[tool].name+'的花盆！';paint()};
 rain.onclick=e=>{if(e.detail!==0&&Date.now()<suppressRainClickUntil)return;activateRain();};
 rain.onpointerdown=e=>{
  if(rain.disabled||dragging||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  audio?.unlock?.();activateRain();dragging=true;dragMoved=false;rainPointer=e.pointerId;
  rainLast={x:e.clientX,y:e.clientY};suppressRainClickUntil=Date.now()+650;
  e.preventDefault();try{rain.setPointerCapture(e.pointerId)}catch(_){}
 };
 rain.onpointermove=e=>{
  if(!dragging||e.pointerId!==rainPointer||run!==epoch)return;
  e.preventDefault();const next={x:e.clientX,y:e.clientY};
  if(Math.hypot(next.x-rainLast.x,next.y-rainLast.y)>4)dragMoved=true;
  const hits=sweepBeds(rainLast,next,(x,y)=>{
   const b=document.elementFromPoint(x,y)?.closest('[data-bed]');
   return b&&beds.contains(b)?Number(b.dataset.bed):-1;
  });
  rainLast=next;
  for(const index of hits){if(finished||run!==epoch)break;waterBed(index)}
 };
 function endRain(e){
  if(e.pointerId!==rainPointer)return;
  dragging=false;rainPointer=null;rainLast=null;
 }
 rain.onpointerup=rain.onpointercancel=rain.onlostpointercapture=endRain;
 app.querySelector('#garden-easy').onclick=()=>{
  if(finished||run!==epoch)return;
  easyCare=!easyCare;rainMode=false;state.gardenEasyCare=easyCare;persist();
  highlight=easyCare?board.stages.findIndex(s=>s<4):-1;
  msg.textContent=easyCare?'👩 點想照顧的花盆，每點一次就完成一步！':'🌱 選種子或工具，再點花盆！';
  audio?.play?.('pop');vib(8);paint();
 };
 /* v309: easy-care sweep commits one legal stage per visited pot only on pointerup. */
 let easySweep=null,suppressBedClickUntil=0;
 function clearEasySweep(){
  if(!easySweep)return;
  beds.querySelectorAll('[data-bed]').forEach(b=>b.classList.remove('garden-sweep-visited','garden-hold-progress'));
  easySweep=null;
 }
 beds.addEventListener('pointerdown',e=>{
  if(!easyCare||finished||run!==epoch||easySweep||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  const b=e.target.closest('[data-bed]');if(!b||!beds.contains(b))return;
  const index=Number(b.dataset.bed);
  if(!Number.isInteger(index)||index<0||index>=board.targets.length)return;
  easySweep={pointerId:e.pointerId,x:e.clientX,y:e.clientY,at:Date.now(),last:{x:e.clientX,y:e.clientY},moved:false,trail:[index],seen:new Set([index])};
  b.classList.add('garden-hold-progress');
  try{b.setPointerCapture(e.pointerId)}catch(_){}
 });
 beds.addEventListener('pointermove',e=>{
  const d=easySweep;if(!d||e.pointerId!==d.pointerId||run!==epoch)return;
  const next={x:e.clientX,y:e.clientY};
  if(!d.moved&&Math.hypot(next.x-d.x,next.y-d.y)<12)return;
  d.moved=true;e.preventDefault();
  beds.querySelectorAll('.garden-hold-progress').forEach(b=>b.classList.remove('garden-hold-progress'));
  for(const index of sweepBeds(d.last,next,seedBedAt)){
   if(!d.seen.has(index)){d.seen.add(index);d.trail.push(index)}
  }
  d.last=next;
  beds.querySelectorAll('[data-bed]').forEach(b=>b.classList.toggle('garden-sweep-visited',d.seen.has(Number(b.dataset.bed))));
 });
 function endEasySweep(e,commit){
  const d=easySweep;if(!d||e.pointerId!==d.pointerId)return;
  const moved=d.moved,trail=d.trail.slice(),held=commit&&!moved&&Date.now()-d.at>=650;
  if(commit&&moved){
   const index=seedBedAt(e.clientX,e.clientY);
   if(index>=0&&!d.seen.has(index))trail.push(index);
  }
  clearEasySweep();
  if(held&&easyCare&&!finished&&run===epoch){
   suppressBedClickUntil=Date.now()+750;
   const index=trail[0];let applied=0;
   while(board.stages[index]<4){
    const stage=board.stages[index];
    const action=stage===0?'seed:'+board.targets[index]:stage===1?'water':stage===2?'sun':'harvest';
    const result=apply(board,action,index);if(!result.ok)break;
    rememberUndo();board=result.board;applied++;
   }
   if(!applied){msg.textContent='⭐ 這盆已收成，換另一盆試試！';paint();return;}
   rainMode=false;highlight=board.stages.findIndex(s=>s<4);
   save(board);audio?.play?.('hit');vib([10,20,10]);
   msg.textContent='🌷 長按成功！這盆完成 '+applied+' 步，開花收成啦！';
   if(board.stages.every(s=>s===4)){paint();win();return;}
   chooseNext();paint();return;
  }
  if(!commit||!moved||!easyCare||finished||run!==epoch)return;
  suppressBedClickUntil=Date.now()+700;
  let applied=0;
  for(const index of trail){
   const stage=board.stages[index];
   const action=stage===0?'seed:'+board.targets[index]:stage===1?'water':stage===2?'sun':stage===3?'harvest':null;
   if(!action)continue;
   const result=apply(board,action,index);if(!result.ok)continue;
   rememberUndo();
   board=result.board;applied++;
  }
  if(!applied){msg.textContent='⭐ 這些花盆已完成，滑到其他花盆試試！';paint();return;}
  highlight=board.stages.findIndex(s=>s<4);
  save(board);audio?.play?.('hit');vib(10);
  msg.textContent='✨ 滑過 '+applied+' 盆！每盆照顧一步，繼續種花！';
  paint();
  if(board.stages.every(s=>s===4))win();
 }
 beds.addEventListener('pointerup',e=>endEasySweep(e,true));
 beds.addEventListener('pointercancel',e=>endEasySweep(e,false));
 beds.addEventListener('lostpointercapture',e=>endEasySweep(e,false));
 beds.onclick=e=>{
  if(e.detail>0&&Date.now()<suppressBedClickUntil)return;
  const b=e.target.closest('[data-bed]');if(!b||finished||run!==epoch)return;audio?.unlock?.();
  const index=Number(b.dataset.bed);
  if(rainMode){if(!waterBed(index)){audio?.play?.('wrong');msg.textContent='🌧️ 先種下種子，才能用雨雲澆水！';highlight=index;paint();}return;}
  const stage=board.stages[index];
  const selectedTool=easyCare&&stage<4?(stage===0?'seed:'+board.targets[index]:stage===1?'water':stage===2?'sun':'harvest'):tool;
  const r=apply(board,selectedTool,index);
  if(!r.ok){audio?.play?.('wrong');vib(8);msg.textContent=r.reason==='done'?'⭐ 這盆已經完成囉！':'💗 再看看花盆的圖案和下一步！';highlight=index;paint();return}
  rememberUndo();board=r.board;highlight=easyCare?board.stages.findIndex(s=>s<4):-1;save(board);audio?.play?.('hit');vib(10);
  msg.textContent=r.next===1?'🌱 種好囉！換澆水！':r.next===2?'💧 喝飽水了！曬太陽！':r.next===3?'☀️ 長大囉！來收成！':'🌷 收成成功！';
  if(r.complete){paint();win();return}
  tool=r.next===1?'water':r.next===2?'sun':r.next===3?'harvest':null;
  if(!tool)chooseNext();paint();
 };
 function undoLast(){
  if(finished||run!==epoch)return false;
  const history=state.gardenUndoHistory,prev=history[history.length-1];
  if(!oneStepBack(prev)){msg.textContent='↶ 還沒有可以收回的步驟！';return false;}
  const old=prev.stages,changed=old.findIndex((s,i)=>board.stages[i]===s+1);
  state.gardenRedoHistory.push({level,stages:board.stages.slice()});if(state.gardenRedoHistory.length>12)state.gardenRedoHistory.shift();
  board={...board,stages:old.slice()};history.pop();
  state.gardenUndo=history.length?history[history.length-1]:null;
  rainMode=false;highlight=changed;
  const s=board.stages[changed];
  tool=s===0?'seed:'+board.targets[changed]:s===1?'water':s===2?'sun':'harvest';
  save(board);paint();msg.textContent='↶ 收回上一步！再試試發光的花盆！';audio?.play?.('tap');vib(8);return true;
 }
 app.querySelector('#garden-undo').onclick=undoLast;
 function redoLast(){
  if(finished||run!==epoch)return false;
  const stack=state.gardenRedoHistory,next=stack[stack.length-1];
  if(!redoIsNext(next)){msg.textContent='↷ 還沒有可以重做的步驟！';return false;}
  const changed=next.stages.findIndex((s,i)=>s===board.stages[i]+1);
  const history=state.gardenUndoHistory;
  history.push({level,stages:board.stages.slice()});if(history.length>12)history.shift();
  state.gardenUndo=history[history.length-1];
  board={...board,stages:next.stages.slice()};stack.pop();
  rainMode=false;highlight=changed;chooseNext();save(board);paint();
  msg.textContent='↷ 重做成功！剛才的照顧步驟回來了！';audio?.play?.('hit');vib(8);
  if(board.stages.every(s=>s===4))win();
  return true;
 }
 app.querySelector('#garden-redo').onclick=redoLast;
 app.querySelector('#garden-auto-step').onclick=assistStep;
 app.querySelector('#garden-hint').onclick=()=>{
  if(finished)return;const i=board.stages.findIndex(s=>s<4);if(i<0)return;
  highlight=i;const s=board.stages[i];tool=s===0?'seed:'+board.targets[i]:s===1?'water':s===2?'sun':'harvest';
  const action=s===0?'選'+plant(board.targets[i]).name+'種子':s===1?'拿水壺澆水':s===2?'讓花曬太陽':'拿籃子收成';
  msg.textContent='💡 發光的花盆：'+action+'！';say('看發光的花盆，'+action+'！');paint();
 };
 app.querySelector('#garden-voice').onclick=()=>{audio?.unlock?.();cue()};
 app.querySelector('#garden-back').onclick=()=>{epoch++;window.YanClassics.menu()};
 app.querySelector('#garden-home').onclick=()=>{epoch++;renderHome()};
 app.querySelector('#garden-reset').onclick=()=>start(level);
 save(board);paint();cue();
}
const hub=window.YanGameHub;
if(hub&&Array.isArray(hub.groups)){
 const group=hub.groups.find(g=>g[0]==='logic');
 if(group&&!group[4].some(item=>item[3]==='YanGardenGame'))group[4].push(['🌷','彥彥小花園','種花、澆水、曬太陽','YanGardenGame']);
}
window.YanGardenGame={start,makeLevel,apply,validCheckpoint,award,sweepBeds,MAX};
})();