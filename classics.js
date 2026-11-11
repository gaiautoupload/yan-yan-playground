(()=>{
'use strict';
const {app,state,persist,say,fx,vib,bg,renderHome}=window.YanClassicShared;
const audio=window.YanClassicAudio;
if(!audio)throw Error('Classic sound engine missing');
let timers=[],session=0;
const later=(fn,ms)=>{const id=setTimeout(()=>{timers=timers.filter(t=>t!==id);fn()},ms);timers.push(id);return id};
function clean(){session++;timers.forEach(clearTimeout);timers=[];window.speechSynthesis?.cancel()}
function menu(){
 clean();audio.unlock();audio.play('welcome');
 app.innerHTML='<section class="screen game classic-screen">'+bg('play')+'<header class="bar"><button class="iconbtn" id="classic-back">⌂</button><span class="chip">🎲 經典小遊戲</span><span class="chip">👩‍👦</span></header><main class="classic-menu"><div class="classic-family"><img src="./assets/mom.webp"><span>🎈 一起來玩！</span><img src="./assets/kid.webp"></div><button class="classic-tile wood-tile" id="wood-entry"><span class="classic-big">🚦🏃</span><strong>123 木頭人</strong><span>🟢 👆 ➜ 🔴 ✋</span><small>⭐ '+state.woodLevel+' / 60</small></button><button class="classic-tile mole-tile" id="mole-entry"><span class="classic-big">🐹🌼</span><strong>打地鼠</strong><span>👀 👉 🐹 ⭐</span><small>⭐ '+state.moleLevel+' / 60</small></button><button class="classic-tile color-tile" id="color-entry"><span class="classic-big">🔴🟡🔵</span><strong>顏色分類</strong><span>🍎 ➜ 🧺</span><small>⭐ '+state.colorLevel+' / 60</small></button><button class="classic-tile meteor-tile" id="meteor-entry" aria-label="開始彥彥躲隕石"><span class="classic-big">☄️🏃</span><strong>躲隕石</strong><span>⬅️ 🏃 ➡️　❤️×5</span><small>🏆 '+(Number(state.meteorBest)||0)+' 次閃避</small></button><div class="classic-audio-controls"><button id="classic-sfx-toggle" aria-pressed="'+(audio.enabled()?'true':'false')+'">'+(audio.enabled()?'🔊 音效':'🔇 音效')+'</button><button id="classic-voice-toggle" aria-pressed="'+(state.voice?'true':'false')+'">'+(state.voice?'🗣️ 語音':'🔇 語音')+'</button><button class="classic-test-sound" id="classic-test-sound">🎧 試聲音</button></div></main></section>';
 app.querySelector('#classic-back').onclick=()=>{clean();renderHome()};
 app.querySelector('#wood-entry').onclick=wood;
 app.querySelector('#mole-entry').onclick=mole;
 app.querySelector('#color-entry').onclick=colorSort;
 app.querySelector('#meteor-entry').onclick=()=>{clean();window.YanMeteors.start()};
 app.querySelector('#classic-sfx-toggle').onclick=()=>{state.classicSound=!audio.enabled();persist();menu()};
 app.querySelector('#classic-voice-toggle').onclick=()=>{state.voice=!state.voice;persist();menu();if(state.voice)audio.voice('彥彥，語音開啟囉！')};
 app.querySelector('#classic-test-sound').onclick=()=>{state.classicSound=true;state.voice=true;persist();const result=audio.test();const toast=document.createElement('div');toast.className='classic-audio-result';toast.textContent=result.effect?'🎵 已播放音效！語音需要手機的中文語音服務。':'⚠️ 請開啟手機媒體音量，再點一次';app.querySelector('.screen')?.appendChild(toast);setTimeout(()=>toast.remove(),2600);app.querySelector('#classic-sfx-toggle').textContent='🔊 音效';app.querySelector('#classic-voice-toggle').textContent='🗣️ 語音';};
 say('彥彥，來和媽媽玩一二三木頭人，或是打地鼠吧！');
}
function header(title,level){
 return '<header class="bar topbar classic-top"><button class="iconbtn" id="classic-back">⌂</button><span class="chip">'+title+'</span><span class="chip">⭐ '+level+'/60</span><button class="iconbtn" id="classic-speak">🔊</button></header>';
}
function win(title,desc,next){
 const el=document.createElement('div');el.className='overlay';
 el.innerHTML='<div class="popup"><div class="faces"><img src="./assets/mom.webp"><img src="./assets/kid.webp"></div><div class="stars">⭐⭐⭐</div><h2>'+title+'</h2><p>'+desc+'</p><button class="primary" id="classic-next">▶️ 下一關</button><button class="classic-secondary" id="classic-return">🎲 其他遊戲</button></div>';
 app.querySelector('.screen').appendChild(el);
 el.querySelector('#classic-next').onclick=next;
 el.querySelector('#classic-return').onclick=menu;
}
function wood(){
 clean();audio.unlock();audio.play('welcome');const token=session,level=state.woodLevel;
 const checkpoint=state.woodCheckpoint?.level===level?state.woodCheckpoint:null;
 let phase='ready',hold=false,done=false,progress=checkpoint?Math.max(0,Math.min(98,Number(checkpoint.progress)||0)):0,
 misses=checkpoint?Math.max(0,Number(checkpoint.misses)||0):0,steps=0,penalized=false,round=0;
 let savedAt=progress;
 const live=()=>session===token&&!done;
 const practice=()=>state.woodPractice===true;
 function saveCheckpoint(force=false){
  if(!live())return;
  if(!force&&Math.abs(progress-savedAt)<4)return;
  state.woodCheckpoint=progress>0?{level,progress:Math.round(progress*10)/10,misses}:null;
  savedAt=progress;persist();
 }
 app.innerHTML='<section class="screen game classic-screen">'+bg('play')+header('🚦 123 木頭人',level)
 +'<main class="wood-game"><div class="wood-signal ready" id="wood-signal" aria-live="polite">🎧 聽口令，準備！</div><div class="wood-parent"><div id="wood-mom" class="wood-mom"><img src="./assets/mom.webp" alt="媽媽"></div><div id="wood-words">👂 一二三木頭人</div></div>'
 +'<div class="wood-field"><div class="wood-path"><span class="wood-house">🏠</span><div class="wood-kid" id="wood-kid"><img src="./assets/kid.webp" alt="彥彥"></div></div><div class="wood-progress"><div id="wood-progress"></div></div></div>'
 +'<button id="wood-hold" class="wood-hold" aria-label="綠燈時按住前進，紅燈時放開">👆 按住前進 🏃</button>'
 +'<div class="wood-toolbar"><button id="wood-speed" aria-label="切換慢速練習">🐢 慢慢玩</button><button id="wood-pause" aria-label="暫停遊戲">⏸ 暫停</button><button id="wood-restart" aria-label="重新開始這一關">🔄 重來</button></div>'
 +'<div class="classic-instructions" id="wood-status">🟢 👆 🏃　🔴 ✋ 🧊</div></main></section>';
 app.querySelector('#classic-back').onclick=()=>{saveCheckpoint(true);menu()};
 const signal=app.querySelector('#wood-signal'),mom=app.querySelector('#wood-mom'),words=app.querySelector('#wood-words'),
 kid=app.querySelector('#wood-kid'),meter=app.querySelector('#wood-progress'),button=app.querySelector('#wood-hold'),
 speed=app.querySelector('#wood-speed'),pause=app.querySelector('#wood-pause'),restart=app.querySelector('#wood-restart'),status=app.querySelector('#wood-status');
 function paint(){
  if(!live())return;
  const ready=phase==='ready',paused=phase==='paused';
  signal.className='wood-signal '+phase;
  signal.textContent=paused?'⏸ 暫停中，按繼續！':ready?'🎧 聽口令，準備！':phase==='green'?'🟢 一、二、三！':'🔴 木頭人！停！';
  mom.classList.toggle('turned',phase==='red');
  words.textContent=paused?'✋ 休息一下':!state.voice?'🔇 點右上角 🔊':!audio.canSpeak()?'🔇 請開啟手機語音':ready?'👂 一二三木頭人':phase==='green'?'1️⃣ 2️⃣ 3️⃣ 🏃':'🛑 ✋ 🧊';
  button.disabled=ready||paused;
  button.textContent=paused?'⏸ 暫停中':ready?'🎧 聽完就開始':phase==='green'?'👆 按住前進 🏃':'✋ 放開，不要動';
  button.classList.toggle('stop',phase==='red');
  kid.style.left=Math.min(86,progress*.86)+'%';meter.style.width=progress+'%';
  speed.textContent=practice()?'🐇 正常速度':'🐢 慢慢玩';
  speed.setAttribute('aria-pressed',String(practice()));
  pause.textContent=paused?'▶️ 繼續':'⏸ 暫停';
  status.textContent='🏁 '+Math.floor(progress)+'%　'+(practice()?'🐢 練習':'🚦 挑戰')+'　'+(misses?'💛 再試 '+misses:'⭐ 加油');
 }
 function forward(n){
  if(!live()||phase!=='green')return;
  progress=Math.min(100,progress+n);paint();saveCheckpoint();
  if(progress>=100){
   done=true;hold=false;clean();audio.play('win');fx('win');vib([20,30,20]);
   state.woodCheckpoint=null;
   const first=level<60||state.woodMaxAwarded!==true;
   state.woodLevel=Math.min(60,level+1);
   if(first){state.stars+=3;state.complete++;if(level===60)state.woodMaxAwarded=true}
   persist();win('🏠 彥彥到家了！','媽媽說：彥彥真的會玩一二三木頭人了！',wood);say('太棒了，彥彥成功走到家了！');
  }
 }
 function caught(){
  if(!live()||penalized)return;
  penalized=true;hold=false;misses++;progress=Math.max(0,progress-8);
  audio.play('wrong');fx('error');vib([50,30,50]);paint();saveCheckpoint(true);
  audio.voice('哎呀，動到了！下次聽到木頭人就放開手！');
 }
 function red(){
  if(!live()||phase!=='green')return;
  phase='red';paint();audio.play('stop');audio.voice('木頭人！不可以動！');
  later(()=>{if(live()&&phase==='red'&&hold)caught()},practice()?1200:650);
  later(green,practice()?3200:level>30?2050:2450);
 }
 function green(){
  if(!live()||phase==='paused')return;
  phase='green';penalized=false;round++;paint();audio.play('go');
  const cue=round,began=Date.now();
  audio.speakTimed('一、二、三，木頭人！',()=>{
   const wait=practice()?Math.max(0,4700-(Date.now()-began)):0;
   later(()=>{if(live()&&phase==='green'&&cue===round)red()},wait);
  },practice()?6200:level>25?3300:3900);
 }
 function tick(){
  if(!live()||phase==='paused')return;
  if(hold&&phase==='green'&&!document.hidden){forward(level>25?1.05:1.4);if(++steps%5===0)audio.play('step')}
  if(live())later(tick,95);
 }
 function down(e){
  e.preventDefault();if(!live()||phase!=='green')return;
  hold=true;audio.play('step');forward(2.5);fx('tap');try{button.setPointerCapture(e.pointerId)}catch(_){}
 }
 button.addEventListener('pointerdown',down);
 for(const ev of ['pointerup','pointercancel','lostpointercapture','pointerleave'])button.addEventListener(ev,()=>{hold=false;saveCheckpoint(true)});
 button.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();down({preventDefault(){},pointerId:-1})}});
 button.addEventListener('keyup',()=>{hold=false;saveCheckpoint(true)});
 speed.onclick=()=>{hold=false;saveCheckpoint(true);state.woodPractice=!practice();persist();wood()};
 pause.onclick=()=>{
  if(!live())return;hold=false;
  if(phase==='paused'){phase='ready';paint();later(green,550);later(tick,95);return}
  phase='paused';round++;timers.forEach(clearTimeout);timers=[];window.speechSynthesis?.cancel();
  saveCheckpoint(true);paint();
 };
 restart.onclick=()=>{state.woodCheckpoint=null;persist();wood()};
 app.querySelector('#classic-speak').onclick=()=>{
  audio.unlock();state.voice=true;persist();
  if(phase==='paused')audio.voice('現在暫停了，按繼續再開始！');
  else if(phase==='green')green();
  else if(phase==='red')audio.voice('木頭人！不可以動！');
  else audio.voice('彥彥，聽好口令！一、二、三，木頭人！');
 };
 paint();
 const introRound=round;
 audio.speakTimed('彥彥，聽好囉！一、二、三，木頭人！聽到木頭人，要放開手！',()=>{if(live()&&phase==='ready'&&round===introRound)green()},5600);
 later(tick,95);
}
function mole(){
 clean();audio.unlock();audio.play('welcome');const token=session,level=state.moleLevel,goal=Math.min(15,6+Math.floor((level-1)/4));
 const cp=state.moleCheckpoint?.level===level?state.moleCheckpoint:null;
 let score=cp?Math.max(0,Math.min(goal-1,Number(cp.score)||0)):0,seconds=cp?Math.max(1,Math.min(45,Number(cp.seconds)||45)):45,active=-1,done=false,previous=-1,paused=false,kind='normal',spawns=cp?Math.max(0,Number(cp.spawns)||0):0,streak=cp?Math.max(0,Number(cp.streak)||0):0;
 let message='🐹 找鼴鼠　🌟 金色+2　🦋 蝴蝶不要碰';
 const save=()=>{if(!done){state.moleCheckpoint={level,score,seconds,spawns,streak};persist()}};
 const live=()=>session===token&&!done;
 app.innerHTML='<section class="screen game classic-screen">'+bg('play')+header('🐹 打地鼠',level)
 +'<main class="mole-game"><div class="mole-family"><img src="./assets/mom.webp"><strong>🐹 小鼴鼠在哪？</strong><img src="./assets/kid.webp"></div><div class="mole-stats"><span id="mole-points">⭐ '+score+'/'+goal+'</span><span id="mole-time">⏳ '+seconds+'</span><button id="mole-pause" aria-label="暫停或繼續打地鼠">⏸ 暫停</button></div>'
 +'<div class="mole-grid">'+Array.from({length:9},(_,i)=>'<button class="mole-hole" data-hole="'+i+'" aria-label="洞口'+(i+1)+'"><span>🌱</span></button>').join('')+'</div><div class="classic-instructions mole-message" id="mole-message" aria-live="polite">'+message+'</div></main></section>';
 app.querySelector('#classic-back').onclick=()=>{save();menu()};app.querySelector('#classic-speak').onclick=()=>{audio.unlock();audio.play('test');say('找到鼴鼠就點一下。金色鼴鼠加兩分，蝴蝶不要碰喔！')};
 const holes=[...app.querySelectorAll('[data-hole]')],points=app.querySelector('#mole-points'),time=app.querySelector('#mole-time'),pause=app.querySelector('#mole-pause'),msg=app.querySelector('#mole-message');
 function paint(){holes.forEach((h,i)=>{const on=i===active;h.classList.toggle('up',on);h.classList.toggle('gold',on&&kind==='gold');h.classList.toggle('butterfly',on&&kind==='butterfly');h.querySelector('span').textContent=on?(kind==='gold'?'🐹✨':kind==='butterfly'?'🦋':'🐹'):'🌱';h.setAttribute('aria-label',on?(kind==='gold'?'金色鼴鼠':kind==='butterfly'?'蝴蝶不要碰':'鼴鼠'):'洞口'+(i+1))});points.textContent='⭐ '+Math.min(score,goal)+'/'+goal;time.textContent='⏳ '+seconds;pause.textContent=paused?'▶️ 繼續':'⏸ 暫停';msg.textContent=paused?'⏸ 休息一下，按繼續！':message}
 function success(){done=true;clean();state.moleCheckpoint=null;state.moleLevel=Math.min(60,level+1);const first=level<60||state.moleMaxAwarded!==true;if(first){state.stars+=3;state.complete++;if(level===60)state.moleMaxAwarded=true}persist();audio.play('win');fx('win');vib([25,40,25]);win('🐹 找到全部了！','媽媽說：彥彥好厲害，連金色鼴鼠都找到了！',mole);say('彥彥好棒！全部小鼴鼠都被你找到了！')}
 function fail(){done=true;clean();state.moleCheckpoint=null;persist();audio.play('lose');const cover=document.createElement('div');cover.className='overlay';cover.innerHTML='<div class="popup"><div class="stars">🐹 💛 🐹</div><h2>再玩一次！</h2><p>媽媽陪你一起找！</p><button class="primary" id="mole-retry">🔄 再玩一次</button><button class="classic-secondary" id="mole-other">🎲 其他遊戲</button></div>';app.querySelector('.screen').appendChild(cover);cover.querySelector('#mole-retry').onclick=mole;cover.querySelector('#mole-other').onclick=menu;say('好努力！我們再一起找找小鼴鼠吧！')}
 function pop(){if(!live()||paused)return;let i=Math.floor(Math.random()*8);if(i>=previous)i++;active=i;previous=i;spawns++;kind=level>=8&&spawns%7===0?'butterfly':level>=3&&spawns%4===0?'gold':'normal';paint();audio.play(kind==='gold'?'yay':'pop');later(pop,Math.max(580,980-level*7))}
 function count(){if(!live()||paused)return;if(!document.hidden)seconds--;if(seconds%5===0)save();paint();if(seconds>0&&seconds<=10)audio.play('tick');if(seconds<=0){fail();return}later(count,1000)}
 holes.forEach((h,i)=>h.onclick=()=>{if(!live()||paused)return;if(i!==active){audio.play('wrong');fx('error');vib(8);return}if(kind==='butterfly'){active=-1;streak=0;message='🦋 蝴蝶是朋友，等鼴鼠出來！';audio.play('wrong');vib(8);paint();save();return}const gain=kind==='gold'?2:1;active=-1;score+=gain;streak++;message=gain===2?'🌟 金色鼴鼠 +2！':streak>=3?'🔥 連續找到 '+streak+' 隻！':'🐹 找到了！再來一隻！';audio.play(gain===2?'yay':'hit');fx('yay');vib(gain===2?[15,25,15]:15);paint();if(score>=goal){success();return}save();if(score>=Math.ceil(goal/2)&&score-gain<Math.ceil(goal/2))say('找到一半了！彥彥繼續加油！')});
 pause.onclick=()=>{if(!live())return;paused=!paused;if(paused){active=-1;timers.forEach(clearTimeout);timers=[];save();paint();return}message='🐹 繼續找鼴鼠！';paint();pop();later(count,1000)};
 paint();pop();later(count,1000);say('快看，小鼴鼠跑出來了！找到'+goal+'分就過關。金色鼴鼠兩分，蝴蝶不要碰！');
}

const COLOR_GROUPS=[
 {id:'red',name:'紅色',symbol:'🔴',pool:['🍎','🍓','❤️']},
 {id:'yellow',name:'黃色',symbol:'🟡',pool:['🍋','🌻','⭐']},
 {id:'blue',name:'藍色',symbol:'🔵',pool:['🫐','💧','💙']},
 {id:'green',name:'綠色',symbol:'🟢',pool:['🥦','🍀','🐸']},
 {id:'purple',name:'紫色',symbol:'🟣',pool:['🍇','🍆','💜']}
];
function makeColorLevel(level){
 const n=level<=20?3:level<=40?4:5,colors=COLOR_GROUPS.slice(0,n),count=n===3?9:n*2;
 let seed=(level*7919+23)>>>0;
 const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
 const items=Array.from({length:count},(_,i)=>{
  const group=colors[i%n];
  return {id:i,color:group.id,emoji:group.pool[(Math.floor(i/n)+level)%group.pool.length]};
 });
 for(let i=items.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[items[i],items[j]]=[items[j],items[i]]}
 return {colors,items};
}
function colorSort(){
 clean();audio.unlock();audio.play('welcome');const token=session,level=state.colorLevel,question=makeColorLevel(level);
 const colors=question.colors,items=question.items;
 const signature=items.map(o=>o.id+':'+o.color+':'+o.emoji).join('|');
 const saved=state.colorSession;
 const valid=!!(saved&&saved.level===level&&saved.signature===signature&&Array.isArray(saved.sorted)
  &&saved.sorted.length<items.length&&saved.sorted.every(i=>Number.isInteger(i)&&i>=0&&i<items.length)
  &&new Set(saved.sorted).size===saved.sorted.length);
 const sorted=new Set(valid?saved.sorted:[]);
 let selected=-1,score=sorted.size,done=false;
 const live=()=>session===token&&!done;
 function saveCheckpoint(){
  if(!live())return;
  state.colorSession=sorted.size?{level,signature,sorted:[...sorted]}:null;
  persist();
 }
 app.innerHTML='<section class="screen game classic-screen">'+bg('play')+header('🎨 顏色分類',level)
 +'<main class="sort-game"><div class="sort-family"><img src="./assets/mom.webp" alt="媽媽"><span id="sort-prompt">👆 🍎 ➜ 🧺</span><img src="./assets/kid.webp" alt="彥彥"></div>'
 +'<div class="sort-progress"><span>⭐ <b id="sort-count">0</b> / '+items.length+'</span><div class="sort-meter"><div id="sort-meter"></div></div></div>'
 +'<div class="sort-items">'+items.map((o,i)=>'<button class="sort-item" data-item="'+i+'" aria-label="'+o.color+' '+o.emoji+'"><span class="sort-dot '+o.color+'"></span><span class="sort-emoji">'+o.emoji+'</span></button>').join('')+'</div>'
 +'<div class="sort-arrow"><button id="sort-undo" aria-label="撤銷上一個正確分類" disabled>↶ 退一個</button><span>👇 🧺 👇</span><button id="sort-restart" aria-label="重新開始顏色分類">🔄 重來</button></div>'
 +'<div class="sort-baskets" style="--bins:'+colors.length+'">'+colors.map(c=>'<button class="sort-basket '+c.id+'" data-bin="'+c.id+'" aria-label="'+c.name+'籃子"><span>'+c.symbol+'</span><strong>🧺</strong></button>').join('')+'</div></main></section>';
 app.querySelector('#classic-back').onclick=()=>{saveCheckpoint();menu()};
 app.querySelector('#classic-speak').onclick=()=>{audio.play('test');say('顏色分類！先點一個圖案，再點下面一樣顏色的籃子。把所有東西放好就過關！')};
 const buttons=[...app.querySelectorAll('[data-item]')],baskets=[...app.querySelectorAll('[data-bin]')];
 const prompt=app.querySelector('#sort-prompt'),count=app.querySelector('#sort-count'),meter=app.querySelector('#sort-meter'),undo=app.querySelector('#sort-undo');
 for(const i of sorted){const b=buttons[i];b.disabled=true;b.classList.add('sorted');b.innerHTML='<span class="sort-check">✨</span>'}
 count.textContent=String(score);meter.style.width=(score/items.length*100)+'%';undo.disabled=score===0;
 if(score)prompt.textContent='💾 已恢復上次分類！';
 app.querySelector('#sort-restart').onclick=()=>{state.colorSession=null;persist();colorSort()};
 undo.onclick=()=>{
  if(!live()||!sorted.size)return;
  const i=[...sorted].pop(),o=items[i],b=buttons[i];
  sorted.delete(i);score=sorted.size;selected=-1;
  b.disabled=false;b.classList.remove('sorted','selected');
  b.innerHTML='<span class="sort-dot '+o.color+'"></span><span class="sort-emoji">'+o.emoji+'</span>';
  buttons.forEach(x=>x.classList.remove('selected'));
  count.textContent=String(score);meter.style.width=(score/items.length*100)+'%';
  undo.disabled=score===0;saveCheckpoint();
  prompt.textContent='↶ '+o.emoji+' 再試一次！';audio.play('step');vib(8);
 };
 function choose(i){
  if(!live()||buttons[i].disabled)return;
  selected=i;buttons.forEach((b,j)=>b.classList.toggle('selected',i===j));
  const o=items[i],c=colors.find(x=>x.id===o.color);
  prompt.textContent=o.emoji+' ➜ '+c.symbol+' 🧺';
  audio.play('step');fx('tap');vib(8);
 }
 function drop(color){
  if(!live())return;
  if(selected<0){prompt.textContent='👆 🍎 ➜ 🧺';say('先點上面的圖案，再點下面的籃子喔！');return}
  const o=items[selected],btn=buttons[selected];
  if(o.color!==color){
   const b=baskets.find(x=>x.dataset.bin===color);
   b.classList.remove('sort-wrong');void b.offsetWidth;b.classList.add('sort-wrong');
   audio.play('wrong');fx('error');vib([30,25,30]);prompt.textContent='🤔 '+o.emoji+' ➜ '+colors.find(x=>x.id===o.color).symbol;
   return;
  }
  btn.disabled=true;btn.classList.remove('selected');btn.classList.add('sorted');btn.innerHTML='<span class="sort-check">✨</span>';
  sorted.add(selected);selected=-1;score++;count.textContent=String(score);meter.style.width=(score/items.length*100)+'%';undo.disabled=false;
  if(score<items.length)saveCheckpoint();
  const basket=baskets.find(x=>x.dataset.bin===color);basket.classList.add('sort-good');
  later(()=>basket.classList.remove('sort-good'),340);
  audio.play('hit');fx('yay');vib(18);prompt.textContent='🌟 '+o.emoji+' ➜ '+colors.find(x=>x.id===color).symbol;
  if(score>=items.length){
   done=true;clean();state.colorSession=null;state.colorLevel=Math.min(60,level+1);state.stars+=3;state.complete++;persist();
   audio.play('win');win('🎨 分類成功！','媽媽說：彥彥把顏色都分對了！',colorSort);
   say('彥彥真厲害！每一個顏色都放進正確的籃子裡了！');
  }else if(score===Math.ceil(items.length/2)){say('好棒！已經分好一半了！')}
 }
 buttons.forEach((b,i)=>{
  let drag=null,ignoreClick=false;
  b.onclick=()=>{if(ignoreClick){ignoreClick=false;return}choose(i)};
  const basketAt=(x,y)=>{
   const prev=b.style.pointerEvents;b.style.pointerEvents='none';
   const hit=document.elementFromPoint(x,y)?.closest('[data-bin]');
   b.style.pointerEvents=prev;return hit;
  };
  const reset=()=>{
   b.classList.remove('dragging');b.style.transform='';b.style.zIndex='';
   baskets.forEach(x=>x.classList.remove('drag-target'));
  };
  b.addEventListener('pointerdown',e=>{
   if(b.disabled||(e.pointerType==='mouse'&&e.button!==0))return;
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
   try{b.setPointerCapture(e.pointerId)}catch(_){}
  });
  b.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(!drag.moved&&Math.hypot(dx,dy)>12){drag.moved=true;choose(i);b.classList.add('dragging')}
   if(!drag.moved)return;
   e.preventDefault();b.style.transform='translate('+dx+'px,'+dy+'px) scale(1.06)';b.style.zIndex='5';
   const hit=basketAt(e.clientX,e.clientY);
   baskets.forEach(x=>x.classList.toggle('drag-target',x===hit));
  });
  b.addEventListener('pointerup',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const moved=drag.moved,hit=moved?basketAt(e.clientX,e.clientY):null;
   drag=null;reset();
   if(moved){
    ignoreClick=true;setTimeout(()=>{ignoreClick=false},150);
    if(hit)drop(hit.dataset.bin);else prompt.textContent='👇 拖到下面的籃子！';
   }
  });
  b.addEventListener('pointercancel',()=>{drag=null;reset()});
  b.addEventListener('lostpointercapture',()=>{if(drag){drag=null;reset()}});
 });
 baskets.forEach(b=>b.onclick=()=>drop(b.dataset.bin));
 say(score?'上次分類已經幫你保存了！繼續把圖案放進正確的籃子吧！':'媽媽和彥彥一起玩顏色分類！可以拖動圖案到籃子，也可以先點圖案再點籃子！');
}

window.YanClassics={menu,wood,mole,colorSort,makeColorLevel,clean,meteor:()=>{clean();window.YanMeteors.start()}};
})();