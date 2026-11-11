(()=>{'use strict';
const sh=window.YanClassicShared,audio=window.YanClassicAudio;if(!sh||!audio)return;
let owner=null,cleanup=()=>{};
function stop(){cleanup();cleanup=()=>{};owner=null;window.YanSpeech?.cancel()}
function start(){
 stop();audio.unlock();let activity='hug',food='🍌',sleeping=false,washed=false,fed=false;
 sh.app.innerHTML='<section class="screen pretend-screen"><header class="bar"><button class="iconbtn" id="pretend-home" aria-label="回首頁">⌂</button><span class="chip">🧸 照顧娃娃</span><button class="iconbtn" id="pretend-voice" aria-label="再聽一次">🔊</button></header><main class="pretend-room"><div class="pretend-window" aria-hidden="true">☀️ ☁️</div><div class="pretend-hearts" aria-hidden="true">💛 💛 💛</div><button class="pretend-baby" id="pretend-baby" aria-label="抱抱娃娃"><span class="pretend-face" aria-hidden="true">👶</span><span class="pretend-effect" aria-hidden="true">🧸</span><span class="pretend-hand" aria-hidden="true">👆</span></button><div class="pretend-bed" aria-hidden="true">🛏️</div><div class="pretend-food" aria-label="選擇食物" hidden><button data-food="🍌" aria-label="選香蕉">🍌</button><button data-food="🍓" aria-label="選草莓">🍓</button><button data-food="🥣" aria-label="選粥">🥣</button></div></main><footer class="pretend-tools" aria-label="自由選擇照顧方式"><button data-activity="feed" aria-label="餵飯" aria-pressed="false">🥣</button><button data-activity="bath" aria-label="洗澡" aria-pressed="false">🛁</button><button data-activity="hug" aria-label="抱抱" aria-pressed="true">🧸</button><button data-activity="sleep" aria-label="睡覺" aria-pressed="false">🌙</button></footer><div class="pretend-status" role="status" aria-live="polite"></div></section>';
 const screen=sh.app.querySelector('.pretend-screen');owner=screen;
 const live=()=>owner===screen&&screen.isConnected;
 const baby=screen.querySelector('#pretend-baby'),effect=screen.querySelector('.pretend-effect');
 const tell=text=>{if(live()){screen.querySelector('.pretend-status').textContent=text;sh.say(text)}};
 function paint(){
  screen.dataset.activity=activity;screen.classList.toggle('is-asleep',sleeping);
  screen.querySelector('.pretend-window').textContent=sleeping?'🌙 ⭐':'☀️ ☁️';
  screen.querySelector('.pretend-face').textContent=sleeping?'😴':'👶';
  screen.querySelector('.pretend-food').hidden=activity!=='feed';
  screen.querySelectorAll('[data-activity]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.activity===activity)));
  screen.querySelectorAll('[data-food]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.food===food)));
  effect.textContent=activity==='feed'?(fed?'😋':food):activity==='bath'?(washed?'✨':'🫧'):activity==='sleep'?(sleeping?'💤':'🌙'):'💛';
  baby.setAttribute('aria-label',activity==='feed'?'餵娃娃吃東西':activity==='bath'?'幫娃娃洗泡泡':activity==='sleep'?(sleeping?'叫醒娃娃':'哄娃娃睡覺'):'抱抱娃娃');
 }
 let drag=null;const listeners=new AbortController();
 function cancelDrag(){const old=drag;drag=null;screen.querySelector('.pretend-drag-food')?.remove();baby.classList.remove('pretend-drop-ready');if(old&&old.button.hasPointerCapture(old.id))old.button.releasePointerCapture(old.id)}
 cleanup=()=>{cancelDrag();listeners.abort()};
 const prompts={feed:'把食物拖給娃娃。也可以選食物，再點娃娃。',bath:'洗澡囉！點點娃娃，洗出香香的泡泡。',hug:'來抱抱！點點娃娃，給一個大抱抱。',sleep:'晚安。點點娃娃，陪他睡覺。'};
 screen.querySelectorAll('[data-activity]').forEach(b=>b.onclick=()=>{if(!live())return;cancelDrag();activity=b.dataset.activity;if(activity!=='sleep')sleeping=false;washed=false;fed=false;paint();audio.play('tap');tell(prompts[activity])});
 screen.querySelectorAll('[data-food]').forEach(b=>{
  let suppressClick=false;
  b.onclick=()=>{if(suppressClick){suppressClick=false;return}if(!live())return;food=b.dataset.food;fed=false;paint();tell(({ '🍌':'香蕉','🍓':'草莓','🥣':'粥'})[food]+'，拖給娃娃，或點娃娃餵一口。')};
  b.onpointerdown=e=>{if(!live()||activity!=='feed'||drag||e.button!==0)return;suppressClick=false;drag={id:e.pointerId,button:b,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture(e.pointerId)};
  b.onpointermove=e=>{
   if(!drag||drag.id!==e.pointerId||drag.button!==b)return;
   if(!live()||activity!=='feed'){cancelDrag();return}
   if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8)return;
   drag.moved=true;suppressClick=true;e.preventDefault();
   let ghost=screen.querySelector('.pretend-drag-food');if(!ghost){ghost=document.createElement('span');ghost.className='pretend-drag-food';ghost.setAttribute('aria-hidden','true');ghost.textContent=b.dataset.food;screen.appendChild(ghost)}
   ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
   const r=baby.getBoundingClientRect();baby.classList.toggle('pretend-drop-ready',e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);
  };
  b.onpointerup=e=>{if(!drag||drag.id!==e.pointerId||drag.button!==b)return;const moved=drag.moved,r=baby.getBoundingClientRect(),hit=moved&&live()&&activity==='feed'&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;cancelDrag();if(hit){food=b.dataset.food;baby.click()}else if(moved)tell('沒關係，再拖給娃娃。')};
  b.onpointercancel=b.onlostpointercapture=e=>{if(drag&&drag.id===e.pointerId){suppressClick=true;cancelDrag()}};
 });
 window.addEventListener('blur',cancelDrag,{signal:listeners.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDrag()},{signal:listeners.signal});
 baby.onclick=()=>{
  if(!live())return;
  baby.classList.remove('pretend-bounce');void baby.offsetWidth;baby.classList.add('pretend-bounce');
  if(activity==='feed'){fed=true;tell('啊嗚！好好吃，謝謝你！')}
  else if(activity==='bath'){washed=!washed;tell(washed?'泡泡沖乾淨了，香香的！':'搓搓泡泡，洗洗小手！')}
  else if(activity==='sleep'){sleeping=!sleeping;tell(sleeping?'呼，娃娃睡著了。晚安。':'早安！我們再一起玩。')}
  else tell('抱緊緊！娃娃好開心，謝謝你照顧我。');
  paint();audio.play(activity==='sleep'?'tap':'hit');
 };
 screen.querySelector('#pretend-home').onclick=()=>{stop();sh.renderHome()};
 screen.querySelector('#pretend-voice').onclick=()=>tell(prompts[activity]);
 paint();tell('我們來照顧娃娃！餵飯、洗澡、抱抱，想玩哪一個都可以。');
}
window.YanPretendPlay={start,stop};
})();
