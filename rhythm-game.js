(()=>{
'use strict';
// v335: replay only already completed notes without revealing future notes or changing progress.
// v334: tap any previously completed star or score note to rewind directly, preserving the saved melody and earned progress.
// v285: free-play instrument mode lets children explore and swipe notes without scoring, preserves checkpoints.
// v282: two-note practice replay without resetting correct answers or checkpoints.
// v273: optional visual score, persistent toggle, ear-only protection.
// v198.1: restore an unfinished melody when re-entering from the five-world hub; replay remains explicit.
// v198: optional guided next-note spotlight, preserved progress and accessibility.
// v195: suppress synthetic touch clicks even when click.detail is 0; preserve keyboard clicks.
// v194: replay only the unplayed notes without resetting progress.
// v174: undo one correct note, preserving checkpoint and replay state.
// v144: one-tap parent assist plays exactly the next correct note using the original scoring and persistence path.
// v143: wrong notes preserve completed notes, replay only the remaining melody, and save partial progress.
// v138: replay or switch listening modes without losing correctly played notes.
// v124: finger swipe melody, safe capture and keyboard support.
// v32: touch-first music sequence memory. Existing files and family photos untouched.
const s=window.YanClassicShared,a=window.YanClassicAudio;if(!s||!a)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=s,MAX=40,ROUNDS=3;
const P=[['sun','☀️','太陽',523.25],['flower','🌸','花朵',587.33],['car','🚗','小汽車',659.25],['dog','🐶','小狗',783.99]];
function makeRound(level,round,rng=Math.random){const n=level<=8?2:level<=18?3:level<=30?4:5,sequence=[];for(let i=0;i<n;i++){const opts=P.filter(p=>!i||p[0]!==sequence[i-1]);sequence.push(opts[Math.floor(rng()*opts.length)][0])}return {level,round,sequence,length:n}}
function checkTap(seq,i,pad){const correct=seq[i]===pad;return {correct,nextIndex:correct?i+1:0,complete:correct&&i+1===seq.length}}
let generation=0,timers=[],ctx;
function stop(){generation++;timers.forEach(clearTimeout);timers=[];try{window.YanSpeech?.cancel()}catch(_){}}
function later(fn,ms,token){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(token===generation)fn()},ms);timers.push(id)}
function tone(id){const p=P.find(x=>x[0]===id);if(!p)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C){a.play('hit');return}ctx=ctx||new C();if(ctx.state==='suspended')ctx.resume().catch(()=>{});const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type='sine';o.frequency.setValueAtTime(p[3],t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.33);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.35)}catch(_){a.play('hit')}}
function menu(){stop();window.YanClassics.menu()}
function start(requested,forceRestart=false){
 stop();a.unlock();const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.rhythmLevel)||1)),token=generation;
 const saved=state.rhythmSession,sameCheckpoint=Number(state.rhythmCheckpointLevel)===level;
 const continuing=!forceRestart&&sameCheckpoint&&((saved&&Number(saved.level)===level)||(Number(state.rhythmRound)>0&&Number(state.rhythmRound)<ROUNDS));
 let round=continuing?Math.max(0,Math.min(ROUNDS-1,Number(state.rhythmRound)||0)):0;
 if(!continuing)state.rhythmSession=null;state.rhythmCheckpointLevel=level;state.rhythmRound=round;persist();
 let task,index=0,demoing=false,locked=false;
 app.innerHTML='<section class="screen game classic-screen rhythm-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="rhythm-back" aria-label="返回經典遊戲">⌂</button><span class="chip">🎵 彥彥音樂記憶</span><span class="chip">⭐ '+level+'/'+MAX+'</span><button class="iconbtn" id="rhythm-speak" aria-label="重播語音">🔊</button></header>'+
 '<main class="rhythm-stage"><div class="rhythm-family"><img src="./assets/mom.webp" alt="媽媽"><strong>👂 聽一聽，點或滑奏音樂！</strong><img src="./assets/kid.webp" alt="彥彥"></div>'+
 '<div class="rhythm-status"><span id="rhythm-round"></span><span id="rhythm-progress"></span></div><div class="rhythm-dots" id="rhythm-dots"></div>'+
 '<div class="rhythm-score" id="rhythm-score" aria-label="整首音樂的圖像樂譜" hidden></div><div class="rhythm-pads" id="rhythm-pads">'+P.map(p=>'<button class="rhythm-pad rhythm-'+p[0]+'" data-pad="'+p[0]+'" aria-label="'+p[2]+'音符"><span>'+p[1]+'</span><small>'+p[2]+'</small></button>').join('')+'</div>'+
 '<div class="rhythm-guide" id="rhythm-guide" aria-live="polite">👂 聽音樂！</div><div class="rhythm-actions"><button id="rhythm-play">▶️ 再聽（不重來）</button><button id="rhythm-remaining" aria-label="只重播還沒彈對的音符" disabled>🎧 只聽剩下的</button><button id="rhythm-completed" aria-label="只重播我已經彈對的音符，不提示未完成的答案" disabled>🎵 聽我彈過的</button><button id="rhythm-chunk" aria-label="只聽接下來最多兩個音符，不清除答對進度">🎶 聽接下來兩個</button><button id="rhythm-hint">💡 提示下一個</button><button id="rhythm-help" aria-label="請媽媽幫忙彈奏下一個正確音符">👩 媽媽幫彈一個</button><button id="rhythm-undo" aria-label="退回上一個已彈對的音符" disabled>↩️ 退一個音</button></div><div class="rhythm-speed"><button id="rhythm-score-toggle" aria-pressed="false">🎼 看樂譜</button><button id="rhythm-slow" aria-pressed="false">🐢 慢速聽音樂</button><button id="rhythm-ear" aria-pressed="false">👂 耳朵挑戰</button><button id="rhythm-train" aria-pressed="false">✨ 跟彈燈：關</button><button id="rhythm-freeplay" aria-pressed="false" aria-label="自由試音，不影響已答對的音符">🎹 自由試音：關</button></div></main>'+ 
 '<footer class="bottombar"><button class="footbtn blue" id="rhythm-home">⌂ 首頁</button><button class="footbtn yellow" id="rhythm-retry">🔄 重玩</button></footer></section>';
 const padsBox=app.querySelector('#rhythm-pads'),pads=[...app.querySelectorAll('[data-pad]')],guide=app.querySelector('#rhythm-guide'),dots=app.querySelector('#rhythm-dots'),play=app.querySelector('#rhythm-play'),remainingBtn=app.querySelector('#rhythm-remaining'),completedBtn=app.querySelector('#rhythm-completed'),chunkBtn=app.querySelector('#rhythm-chunk'),hint=app.querySelector('#rhythm-hint'),help=app.querySelector('#rhythm-help'),undo=app.querySelector('#rhythm-undo'),slow=app.querySelector('#rhythm-slow'),ear=app.querySelector('#rhythm-ear'),train=app.querySelector('#rhythm-train'),freeplayBtn=app.querySelector('#rhythm-freeplay');
 const scoreBox=app.querySelector('#rhythm-score'),scoreToggle=app.querySelector('#rhythm-score-toggle');
 let gesture=null,suppressClickUntil=0,freeplay=false;
 const cue=()=>say('彥彥，先聽媽媽的音樂，再照順序點，或用手指滑過圖案喔！');
 function updateFreeplay(){freeplayBtn.setAttribute('aria-pressed',String(freeplay));freeplayBtn.textContent=freeplay?'🎹 自由試音：開':'🎹 自由試音：關';freeplayBtn.disabled=demoing||locked;completedBtn.disabled=demoing||locked||freeplay||index===0;app.querySelector('.rhythm-screen')?.classList.toggle('rhythm-freeplay',freeplay);[...dots.querySelectorAll('[data-rewind]'),...scoreBox.querySelectorAll('[data-rewind]')].forEach(b=>b.disabled=demoing||locked||freeplay)}
 updateFreeplay();
 function updateSpeed(){slow.setAttribute('aria-pressed',String(!!state.rhythmSlow));slow.textContent=state.rhythmSlow?'🐢 慢速模式：開':'🐇 正常速度：點我慢速'}updateSpeed();
 function updateEar(){ear.setAttribute('aria-pressed',String(!!state.rhythmEarOnly));ear.textContent=state.rhythmEarOnly?'👂 耳朵挑戰：開':'👀 看圖聽音樂'}
 updateEar();
 function updateTrain(){const on=!!state.rhythmTrain;train.setAttribute('aria-pressed',String(on));train.textContent=on?'✨ 跟彈燈：開':'✨ 跟彈燈：關';pads.forEach(b=>{const next=!!(on&&!demoing&&!locked&&task&&task.sequence[index]===b.dataset.pad);b.classList.toggle('rhythm-next',next);b.setAttribute('aria-current',next?'step':'false')})}
 updateTrain();
 function updateScore(){
  const show=!!state.rhythmScore;
  scoreToggle.setAttribute('aria-pressed',String(show));
  scoreToggle.textContent=show?'🎼 收起樂譜':'🎼 看樂譜';
  scoreBox.hidden=!show;
  if(!task){scoreBox.innerHTML='';return}
  scoreBox.innerHTML=task.sequence.map((id,i)=>{
   const p=P.find(x=>x[0]===id);
   const done=i<index,tag=done?'button':'span';return '<'+tag+(done?' type="button" data-rewind="'+i+'"'+(demoing||locked||freeplay?' disabled':''):'')+' class="rhythm-score-note '+(done?'done':i===index?'current':'upcoming')+'" aria-label="第'+(i+1)+'個音符：'+p[2]+(done?'，點一下回到這個音符':'')+'"><b>'+p[1]+'</b><small>'+(i+1)+'</small></'+tag+'>';
  }).join('');
 }
 function progress(){app.querySelector('#rhythm-round').textContent='🌟 '+(round+1)+' / '+ROUNDS;app.querySelector('#rhythm-progress').textContent='🎶 '+index+' / '+task.length;dots.innerHTML=task.sequence.map((_,i)=>i<index?'<button type="button" class="done rhythm-dot-rewind" data-rewind="'+i+'" aria-label="回到第'+(i+1)+'個音符重新彈"'+(demoing||locked||freeplay?' disabled':'')+'>⭐</button>':'<span>●</span>').join('');undo.disabled=demoing||locked||index===0;remainingBtn.disabled=demoing||locked||index===0;completedBtn.disabled=demoing||locked||freeplay||index===0;chunkBtn.disabled=demoing||locked;updateTrain();updateScore()}
 function flash(id){const b=pads.find(x=>x.dataset.pad===id);if(!b)return;b.classList.add('rhythm-lit');later(()=>b.classList.remove('rhythm-lit'),state.rhythmSlow?510:330,token)}
 function demo(keepProgress=false,onlyRemaining=false,limit=Infinity,onlyCompleted=false){if(token!==generation||!task)return;const savedIndex=keepProgress?index:0;demoing=true;locked=false;updateFreeplay();index=savedIndex;progress();play.disabled=true;hint.disabled=true;help.disabled=true;undo.disabled=true;slow.disabled=true;chunkBtn.disabled=true;guide.textContent=onlyCompleted?'🎵 聽你剛才彈對的音符，不會偷看後面的答案！':keepProgress&&savedIndex?'👂 再聽一次，已答對的音符保留！':state.rhythmEarOnly?'👂 只聽聲音，記住音符順序！':'👂 聽音樂，看圖案亮起來！';const gap=state.rhythmSlow?950:620,remaining=(onlyCompleted?task.sequence.slice(0,savedIndex):onlyRemaining&&savedIndex?task.sequence.slice(savedIndex):task.sequence).slice(0,limit);remaining.forEach((id,i)=>later(()=>{tone(id);if(!state.rhythmEarOnly)flash(id)},180+i*gap,token));later(()=>{demoing=false;updateFreeplay();play.disabled=false;hint.disabled=false;help.disabled=false;undo.disabled=index===0;remainingBtn.disabled=index===0;completedBtn.disabled=freeplay||index===0;chunkBtn.disabled=false;slow.disabled=false;updateTrain();guide.textContent=keepProgress&&savedIndex?'💗 已保留 '+savedIndex+' 個音符，從下一個繼續！':state.rhythmEarOnly?'👆 換你了！憑耳朵點或滑奏！':'👆 換你了！依序點或滑奏！'},220+remaining.length*gap,token)}
 function begin(){if(token!==generation)return;freeplay=false;updateFreeplay();const fresh=makeRound(level,round),saved=state.rhythmSession;const valid=saved&&saved.level===level&&saved.round===round&&Array.isArray(saved.sequence)&&saved.sequence.length===fresh.length&&saved.sequence.every((id,i)=>P.some(p=>p[0]===id)&&(!i||id!==saved.sequence[i-1]));task=valid?{...fresh,sequence:saved.sequence.slice()}:fresh;index=valid?Math.max(0,Math.min(task.length-1,Number(saved.index)||0)):0;state.rhythmSession={level,round,sequence:task.sequence.slice(),index};persist();locked=false;progress();cue();later(()=>demo(index>0),500,token)}
 function finish(){if(token!==generation)return;state.rhythmLevel=Math.max(Number(state.rhythmLevel)||1,Math.min(MAX,level+1));state.rhythmCheckpointLevel=state.rhythmLevel;state.rhythmRound=0;state.rhythmSession=null;state.rhythmWins=(Number(state.rhythmWins)||0)+1;state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();a.play('win');fx('win');vib([15,30,15]);say('彥彥好棒！你是小小音樂家！');const ov=document.createElement('div');ov.className='overlay';ov.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 小小音樂家！</h2><p>🎵 三首音樂都記住了！</p><button class="primary" id="rhythm-next">▶️ 下一關</button><button class="classic-secondary" id="rhythm-again">🔄 再玩一次</button><button class="classic-secondary" id="rhythm-menu">🎲 其他遊戲</button></div>';app.querySelector('.screen').appendChild(ov);ov.querySelector('#rhythm-next').onclick=()=>start(level>=MAX?1:level+1);ov.querySelector('#rhythm-again').onclick=()=>start(level,true);ov.querySelector('#rhythm-menu').onclick=menu}
 function playPad(b){if(demoing||locked||token!==generation)return;a.unlock();tone(b.dataset.pad);flash(b.dataset.pad);if(freeplay){guide.textContent='🎹 自由試音中！隨意點或滑，已答對的音符不會消失。';return}const result=checkTap(task.sequence,index,b.dataset.pad);if(!result.correct){locked=true;updateFreeplay();play.disabled=true;hint.disabled=true;help.disabled=true;undo.disabled=true;slow.disabled=true;chunkBtn.disabled=true;remainingBtn.disabled=true;completedBtn.disabled=true;updateTrain();a.play('wrong');vib(12);guide.textContent='💗 前面答對的保留！聽剩下的音符再試！';b.classList.add('rhythm-error');later(()=>b.classList.remove('rhythm-error'),500,token);later(()=>demo(true,true),650,token);return}index=result.nextIndex;if(state.rhythmSession)state.rhythmSession.index=index;persist();progress();vib(10);if(!result.complete){guide.textContent='🌟 對了！繼續下一個！';return}locked=true;updateFreeplay();play.disabled=true;hint.disabled=true;help.disabled=true;undo.disabled=true;slow.disabled=true;chunkBtn.disabled=true;remainingBtn.disabled=true;completedBtn.disabled=true;updateTrain();a.play('hit');fx('yay');guide.textContent='🎉 這首音樂完成了！';round++;state.rhythmSession=null;state.rhythmRound=round;state.rhythmCheckpointLevel=level;persist();later(round>=ROUNDS?finish:begin,850,token)}

 // v334: direct rewind via a completed star or visible score note, with checkpoint persistence.
 function rewindTo(e){
  const b=e.target.closest?.('[data-rewind]');
  if(!b||demoing||locked||freeplay||token!==generation||!task)return;
  const n=Number(b.dataset.rewind);if(!Number.isInteger(n)||n<0||n>=index)return;
  index=n;if(state.rhythmSession)state.rhythmSession.index=index;
  persist();progress();tone(task.sequence[index]);flash(task.sequence[index]);
  guide.textContent='↩️ 回到第 '+(index+1)+' 個音符，從這裡繼續！';vib(8);
 }
 dots.addEventListener('click',rewindTo);
 scoreBox.addEventListener('click',rewindTo);

 // v124: one-finger gesture, 10px segment sampling and full cancellation cleanup.
 function clearGesture(e){
  if(!gesture||e&&e.pointerId!==gesture.id)return;
  const id=gesture.id;gesture=null;padsBox.classList.remove('rhythm-swiping');
  suppressClickUntil=Date.now()+700;
  try{if(padsBox.hasPointerCapture?.(id))padsBox.releasePointerCapture(id)}catch(_){}
 }
 padsBox.addEventListener('pointerdown',e=>{
  if(gesture||e.isPrimary===false||e.pointerType==='mouse'&&e.button!==0||demoing||locked||token!==generation)return;
  const b=e.target.closest?.('[data-pad]');if(!b||!padsBox.contains(b))return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,last:b.dataset.pad};
  suppressClickUntil=Date.now()+700;padsBox.classList.add('rhythm-swiping');
  try{padsBox.setPointerCapture(e.pointerId)}catch(_){}
  e.preventDefault?.();a.unlock();playPad(b);
 });
 padsBox.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id||demoing||locked||token!==generation)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/10));
  for(let k=1;k<=steps;k++){
   const hit=document.elementFromPoint(gesture.x+dx*k/steps,gesture.y+dy*k/steps);
   const b=hit?.closest?.('[data-pad]'),id=b&&padsBox.contains(b)?b.dataset.pad:null;
   if(id!==gesture.last){gesture.last=id;if(id)playPad(b)}
   if(locked)break;
  }
  gesture.x=e.clientX;gesture.y=e.clientY;e.preventDefault?.();
 });
 padsBox.addEventListener('pointerup',clearGesture);
 padsBox.addEventListener('pointercancel',clearGesture);
 padsBox.addEventListener('lostpointercapture',clearGesture);
 pads.forEach(b=>b.addEventListener('click',e=>{if(Date.now()<suppressClickUntil&&(e.pointerType||e.detail!==0||e.sourceCapabilities?.firesTouchEvents))return;playPad(b)}));
 app.querySelector('#rhythm-back').onclick=menu;app.querySelector('#rhythm-home').onclick=()=>{stop();renderHome()};app.querySelector('#rhythm-retry').onclick=()=>start(level,true);app.querySelector('#rhythm-speak').onclick=()=>{a.unlock();cue()};play.onclick=()=>{if(!demoing&&!locked){a.unlock();demo(true)}};remainingBtn.onclick=()=>{if(!demoing&&!locked&&index>0){a.unlock();demo(true,true)}};completedBtn.onclick=()=>{if(!demoing&&!locked&&!freeplay&&index>0&&token===generation){a.unlock();demo(true,false,Infinity,true)}};chunkBtn.onclick=()=>{if(!demoing&&!locked&&token===generation){a.unlock();demo(true,true,2);guide.textContent='🎶 只聽接下來兩個音，已答對的保留！'}};hint.onclick=()=>{if(demoing||locked)return;a.unlock();const id=task.sequence[index];flash(id);tone(id);guide.textContent='💡 看亮起來的圖案！'};help.onclick=()=>{if(demoing||locked||token!==generation||!task)return;const b=pads.find(x=>x.dataset.pad===task.sequence[index]);if(!b)return;playPad(b);if(!locked)guide.textContent='👩 媽媽幫彈一個！接下來自己試試！'};undo.onclick=()=>{if(demoing||locked||token!==generation||!task||index<=0)return;index--;if(state.rhythmSession)state.rhythmSession.index=index;persist();progress();tone(task.sequence[index]);flash(task.sequence[index]);guide.textContent='↩️ 已退回一個音符，重新彈這個！';vib(8)};scoreToggle.onclick=()=>{if(token!==generation)return;state.rhythmScore=!state.rhythmScore;if(state.rhythmScore){state.rhythmEarOnly=false;updateEar()}persist();updateScore();guide.textContent=state.rhythmScore?'🎼 看圖案順序，跟著樂譜彈音樂！':'👂 收起樂譜，靠耳朵記音樂！';a.play('pop')};slow.onclick=()=>{if(demoing||locked)return;state.rhythmSlow=!state.rhythmSlow;persist();updateSpeed();demo(true)};ear.onclick=()=>{if(demoing||locked)return;state.rhythmEarOnly=!state.rhythmEarOnly;if(state.rhythmEarOnly){state.rhythmTrain=false;state.rhythmScore=false}persist();updateEar();updateTrain();updateScore();demo(true)};train.onclick=()=>{if(demoing||locked)return;state.rhythmTrain=!state.rhythmTrain;if(state.rhythmTrain)state.rhythmEarOnly=false;persist();updateEar();updateTrain();guide.textContent=state.rhythmTrain?'✨ 看橘色光圈，照順序彈音符！':'👂 自己聽音樂，照順序彈！'};freeplayBtn.onclick=()=>{if(demoing||locked||gesture||token!==generation)return;freeplay=!freeplay;updateFreeplay();guide.textContent=freeplay?'🎹 自由試音：點或滑奏四個圖案，完全不計分！':'🎵 回到挑戰，從剛才答對的音符繼續！';a.play('pop')};begin()
}
function enhance(){const m=app.querySelector('.classic-menu');if(!m||m.querySelector('#rhythm-entry'))return;const b=document.createElement('button');b.id='rhythm-entry';b.className='classic-tile rhythm-tile';b.setAttribute('aria-label','開始彥彥音樂記憶');b.innerHTML='<span class="classic-big">🎵🥁</span><strong>音樂記憶</strong><span>👂 🎶 👆</span><small>⭐ '+(Number(state.rhythmLevel)||1)+' / '+MAX+'</small>';m.insertBefore(b,m.querySelector('.classic-audio-controls'));b.onclick=()=>start()}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();window.YanRhythmGame={start,stop,makeRound,checkTap,enhance}
})();