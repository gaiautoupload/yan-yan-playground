(()=>{'use strict';
const sh=window.YanClassicShared,audio=window.YanClassicAudio;if(!sh||!audio)return;
const friends=[['🐰','小兔子'],['🐱','小貓咪'],['🐶','小狗狗']];
const places=[['🌳','大樹'],['🏕️','帳篷'],['🌻','花叢'],['📦','箱子']];
let owner=null;
function stop(){owner=null;window.YanSpeech?.cancel()}
function checkpoint(saved){
 if(!saved||saved.version!==1||!Array.isArray(saved.deck)||saved.deck.length!==4||new Set(saved.deck).size!==4||saved.deck.some(n=>![-1,0,1,2].includes(n)))return null;
 if(!Array.isArray(saved.opened)||saved.opened.length>4||new Set(saved.opened).size!==saved.opened.length||saved.opened.some(n=>!Number.isInteger(n)||n<0||n>3))return null;
 return {version:1,deck:[...saved.deck],opened:[...saved.opened]};
}
function start(reset=false){
 stop();audio.unlock();
 const saved=reset===true?null:checkpoint(sh.state.hideSeekSession);
 const deck=saved?saved.deck:[0,1,2,-1];if(!saved)for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 const opened=new Set();let celebrated=false,restoring=false;
 const save=()=>{sh.state.hideSeekSession={version:1,deck:[...deck],opened:[...opened]};sh.persist()};
 const clue=['長耳朵','尖耳朵','垂耳朵'];
 const current=()=>friends.findIndex((_,f)=>!opened.has(deck.indexOf(f)));
 const targetText=()=>current()<0?'都找到了！':'找找'+friends[current()][1]+'，看看哪裡露出'+clue[current()]+'。';
 sh.app.innerHTML='<section class="screen seek-screen"><header class="bar"><button class="iconbtn" id="seek-home" aria-label="回首頁">⌂</button><span class="chip">🙈 躲貓貓</span><button class="iconbtn" id="seek-voice" aria-label="再聽一次">🔊</button></header><div class="seek-friends" aria-label="找小兔子、小貓咪、小狗狗">'+friends.map((f,i)=>'<span data-friend="'+i+'" aria-label="還沒找到'+f[1]+'">'+f[0]+'<small>？</small></span>').join('')+'</div><main class="seek-yard" aria-label="躲貓貓遊樂園"><div class="seek-sky" aria-hidden="true">☀️ ☁️ 🦋</div><div class="seek-spots">'+places.map((p,i)=>'<button class="seek-spot" data-spot="'+i+'" aria-label="找找'+p[1]+'後面"><span class="seek-clue ears-'+deck[i]+'" aria-hidden="true"><i></i><i></i></span><span class="seek-cover" aria-hidden="true">'+p[0]+'</span><span class="seek-hand" aria-hidden="true">👆</span></button>').join('')+'</div></main><footer class="seek-footer"><button id="seek-hint" aria-label="給我一個提示">👂 ✨</button><button id="seek-again" aria-label="再玩一次" hidden>🙈 🔄</button></footer><div class="seek-status" role="status" aria-live="polite"></div></section>';
 owner=sh.app.querySelector('.seek-screen');const screen=owner;
 const live=()=>owner===screen&&screen.isConnected;
 const speak=text=>{if(live()&&!restoring)sh.say(text)};
 const announce=text=>{screen.querySelector('.seek-status').textContent=text;speak(text)};
 const markTarget=()=>screen.querySelectorAll('[data-friend]').forEach(b=>{const target=Number(b.dataset.friend)===current();b.classList.toggle('seek-target',target);if(target)b.setAttribute('aria-label','現在找'+friends[current()][1])});
 markTarget();
 const hint=()=>{
  if(!live())return;
  const target=current(),i=target<0?-1:deck.indexOf(target);
  if(i<0){speak('都找到了！要再玩一次嗎？');return}
  screen.querySelectorAll('.seek-spot').forEach(b=>b.classList.remove('seek-peek'));
  screen.querySelector('[data-spot="'+i+'"]').classList.add('seek-peek');
  speak('聽！'+friends[deck[i]][1]+'躲在'+places[i][1]+'後面。點點看！');
 };
 screen.querySelectorAll('[data-spot]').forEach(b=>b.onclick=()=>{
  if(!live())return;const i=Number(b.dataset.spot),f=deck[i];
  if(opened.has(i)){speak(f<0?'小蝴蝶也來玩了！':'找到'+friends[f][1]+'了！');return}
  opened.add(i);b.classList.add('seek-open');b.classList.remove('seek-peek');
  b.innerHTML='<span class="seek-reveal" aria-hidden="true">'+(f<0?'🦋':friends[f][0])+'</span><span class="seek-found" aria-hidden="true">'+(f<0?'✨':'💛')+'</span>';
  b.setAttribute('aria-label',f<0?'發現小蝴蝶':'找到'+friends[f][1]);if(!restoring)audio.play(f<0?'tap':'hit');
  if(f>=0){const badge=screen.querySelector('[data-friend="'+f+'"]');badge.classList.add('found');badge.querySelector('small').textContent='✓';badge.setAttribute('aria-label','找到'+friends[f][1])}
  markTarget();
  const done=deck.every((f,i)=>f<0||opened.has(i));
  if(done&&!celebrated){celebrated=true;screen.classList.add('seek-complete');screen.querySelector('#seek-again').hidden=false;screen.querySelector('#seek-hint').hidden=true;if(!restoring)audio.play('win');announce('都找到了！按下面的猴子和轉圈圈，再玩一次！')}
  else announce((f<0?'哇，是小蝴蝶！':'找到'+friends[f][1]+'了！')+(celebrated?'':targetText()));
  if(!restoring)save();
 });
 screen.querySelector('#seek-home').onclick=()=>{stop();sh.renderHome()};
 screen.querySelector('#seek-again').onclick=()=>start(true);
 screen.querySelector('#seek-hint').onclick=hint;
 screen.querySelector('#seek-voice').onclick=()=>speak(targetText());
 restoring=true;for(const i of saved?.opened||[])screen.querySelector('[data-spot="'+i+'"]').onclick();restoring=false;save();
 speak(celebrated?'都找到了！要再玩一次嗎？':(saved?'我們繼續找！':'我們玩躲貓貓！')+targetText());
}
window.YanHideSeek={start,stop,checkpoint};
})();
