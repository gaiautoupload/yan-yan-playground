(()=>{'use strict';
// v374: Reverse a child's melody in one tap with undo/redo and mandatory full replay before saving.
// v352: Long-press a picture pad for non-scoring note audition; taps and swipe composition still work.
// v328: Tap composed notes to audition and play from selected note; full playback remains required for saving.
// v326: Swipe across the four large picture pads to compose several notes in one finger gesture; canceled and second touches cannot alter the draft.
// v325: Add an immediate Stop Playback control; cancel queued notes without clearing draft or awarding a save.
// v306: Restore visible Music Studio entry in the current five-category hub, not obsolete relay-only markup.
// v305: One-tap complete the remaining melody while preserving the child's own notes, with undo/redo and saved draft.
// v281: Delete any selected melody note in one tap with undo/redo and draft preservation.
// v242: Repeat any selected note (or last note) with one tap; full-capacity guard, undo/redo and saved draft remain intact.
// v188: Slow-listening mode with illuminated note-by-note playback for preschoolers.
// v161: undo/redo up to 30 melody edits while preserving the remove-last-note action.
// v160: one-tap melody inspiration, editable and saved as a draft.
// v159: reorder composition by dragging or accessible left/right controls, retaining draft and save rules.
// v41: creative music studio, not another right-answer matching game.
const s=window.YanClassicShared,a=window.YanClassicAudio;
if(!s||!a)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=s;
const MAX=20,NOTES=[['sun','☀️','太陽',523.25],['flower','🌸','花朵',587.33],['car','🚗','小汽車',659.25],['dog','🐶','小狗',783.99]];
const validIds=new Set(NOTES.map(n=>n[0]));
const target=n=>n<=7?4:n<=14?6:8;
const nextLevel=n=>n>=MAX?1:n+1;
const clean=notes=>Array.isArray(notes)?notes.filter(n=>validIds.has(n)).slice(0,8):[];
function duplicateNote(notes,index,limit){if(!Array.isArray(notes)||!notes.length||notes.length>=limit)return Array.isArray(notes)?notes.slice():[];const i=Number.isInteger(index)&&index>=0&&index<notes.length?index:notes.length-1;const out=notes.slice();out.splice(i+1,0,out[i]);return out}
function reverseMelody(notes){return Array.isArray(notes)?notes.slice().reverse():[]}
function removeNote(notes,index){if(!Array.isArray(notes))return [];if(!Number.isInteger(index)||index<0||index>=notes.length)return notes.slice();const out=notes.slice();out.splice(index,1);return out}
function moveNote(notes,from,to){if(!Array.isArray(notes)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=notes.length||to>=notes.length)return Array.isArray(notes)?notes.slice():[];const out=notes.slice(),[item]=out.splice(from,1);out.splice(to,0,item);return out}
const valid=(notes,n)=>Array.isArray(notes)&&notes.length===target(n)&&notes.every(id=>validIds.has(id));
// Compose a full, playable melody; prevent three identical consecutive notes.
function compose(level,random=Math.random){
 const out=[],len=target(level),ids=NOTES.map(n=>n[0]);
 for(let i=0;i<len;i++){
  const choices=ids.filter(id=>!(i>=2&&out[i-1]===id&&out[i-2]===id));
  const raw=Number(random()),index=Math.max(0,Math.min(choices.length-1,Math.floor((Number.isFinite(raw)?raw:0)*choices.length)));
  out.push(choices[index]);
 }
 return out;
}
function fillMelody(notes,level,random=Math.random){
 const out=Array.isArray(notes)?notes.filter(id=>validIds.has(id)).slice(0,target(level)):[];
 const ids=NOTES.map(n=>n[0]),needed=target(level);
 while(out.length<needed){
  const choices=ids.filter(id=>!(out.length>=2&&out[out.length-1]===id&&out[out.length-2]===id));
  const raw=Number(random()),index=Math.max(0,Math.min(choices.length-1,Math.floor((Number.isFinite(raw)?raw:0)*choices.length)));
  out.push(choices[index]);
 }
 return out;
}
let generation=0,timers=[],audioCtx=null;
function stop(){generation++;timers.forEach(clearTimeout);timers=[]}
function later(fn,ms,token){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(token===generation&&app.querySelector('.studio-screen'))fn()},ms);timers.push(id)}
function sound(id){
 const n=NOTES.find(x=>x[0]===id);if(!n||state.classicSound===false)return false;
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C){a.play('hit');return false}
  audioCtx=audioCtx||new C();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  const t=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type='triangle';osc.frequency.setValueAtTime(n[3],t);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.13,t+.018);gain.gain.exponentialRampToValueAtTime(.0001,t+.28);
  osc.connect(gain);gain.connect(audioCtx.destination);osc.start(t);osc.stop(t+.3);return true;
 }catch(e){a.play('hit');return false}
}
function commit(level,notes,listened){
 if(!listened||!valid(notes,level))return {ok:false};
 const completed=Array.isArray(state.musicStudioCompleted)?state.musicStudioCompleted.filter(n=>Number.isInteger(n)&&n>=1&&n<=MAX):[];
 const first=!completed.includes(level);
 state.musicStudioCompleted=first?[...completed,level]:completed;
 const songs=Array.isArray(state.musicStudioSongs)?state.musicStudioSongs:[];
 state.musicStudioSongs=[{level,notes:[...notes]},...songs.filter(x=>x&&Array.isArray(x.notes))].slice(0,12);
 if(first){state.stars=(Number(state.stars)||0)+2;state.complete=(Number(state.complete)||0)+1}
 state.musicStudioLevel=nextLevel(level);state.musicStudioDraft=[];state.musicStudioDraftLevel=state.musicStudioLevel;
 persist();return {ok:true,first};
}
function menu(){stop();window.YanClassics.menu()}
function start(requested){
 stop();a.unlock();const level=Math.max(1,Math.min(MAX,Number(requested)||Number(state.musicStudioLevel)||1));
 const token=generation,needed=target(level);
 let notes=state.musicStudioDraftLevel===level?clean(state.musicStudioDraft).slice(0,needed):[];
 let playing=false,listened=false,selected=-1,slowMode=false,undoHistory=[],redoHistory=[];
 state.musicStudioLevel=level;state.musicStudioDraftLevel=level;state.musicStudioDraft=[...notes];persist();
 app.innerHTML='<section class="screen game classic-screen studio-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="studio-back" aria-label="返回遊戲世界">⌂</button><span class="chip">🎼 彥彥小小作曲家</span><span class="chip">⭐ '+level+'/'+MAX+'</span></header>'+
 '<main class="studio-stage"><div class="studio-family"><img src="./assets/mom.webp" alt="媽媽"><strong>🎶 自己創作一首歌！</strong><img src="./assets/kid.webp" alt="彥彥"></div>'+
 '<div class="studio-progress" id="studio-progress" aria-live="polite"></div><div class="studio-notes" id="studio-notes" aria-label="你創作的音符"></div>'+
 '<div class="studio-pads">'+NOTES.map(n=>'<button class="studio-pad studio-'+n[0]+'" data-note="'+n[0]+'" aria-label="彈奏'+n[2]+'音符"><span>'+n[1]+'</span><small>'+n[2]+'</small></button>').join('')+'</div>'+
 '<div class="studio-guide" id="studio-guide" aria-live="polite">👆 點一下加入音符，按住半秒先聽聲音，滑過圖案一筆編旋律！</div>'+
 '<div class="studio-actions"><button id="studio-left">⬅️ 左移</button><button id="studio-right">➡️ 右移</button><button id="studio-undo">↩️ 退一個</button><button id="studio-repeat">🔁 重複音符</button><button id="studio-reverse" type="button" aria-label="把整首旋律的音符順序倒轉">🔄 倒轉旋律</button><button id="studio-autofill">✨ 補完旋律</button><button id="studio-delete">🗑️ 刪除選中</button><button id="studio-history-back">↶ 復原修改</button><button id="studio-history-next">↷ 重做修改</button><button id="studio-clear">🧹 重來</button><button id="studio-inspire">🎲 靈感旋律</button><button id="studio-slow" aria-pressed="false">🐢 慢慢聽：關</button><button id="studio-play">▶️ 聽我的歌</button><button id="studio-play-from" disabled aria-label="從選中的音符開始試聽">🎧 從這裡聽</button><button id="studio-stop" disabled>⏹️ 停止播放</button><button id="studio-save">⭐ 保存作品</button></div>'+
 '<button class="studio-library-toggle" id="studio-library-toggle">📚 我的歌曲</button><div class="studio-library" id="studio-library" hidden></div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="studio-home">⌂ 首頁</button><button class="footbtn yellow" id="studio-help">🔊 聽說明</button></footer></section>';
 const guide=app.querySelector('#studio-guide'),pads=[...app.querySelectorAll('[data-note]')],play=app.querySelector('#studio-play'),playFrom=app.querySelector('#studio-play-from'),stopPlay=app.querySelector('#studio-stop'),save=app.querySelector('#studio-save'),noteStrip=app.querySelector('#studio-notes');
 let drag=null,suppressSlotClickUntil=0;
 function draft(){state.musicStudioDraft=[...notes];state.musicStudioDraftLevel=level;persist()}
 function remember(){undoHistory.push([...notes]);if(undoHistory.length>30)undoHistory.shift();redoHistory=[]}
 function restoreEdit(from,to,label){if(playing||!from.length)return;to.push([...notes]);if(to.length>30)to.shift();notes=from.pop();selected=-1;listened=false;draft();update();guide.textContent=label;vib(9)}
 function update(){
  app.querySelector('#studio-progress').textContent='🎵 '+notes.length+' / '+needed+' 個音符';
  if(selected>=notes.length)selected=-1;
  noteStrip.innerHTML=Array.from({length:needed},(_,i)=>notes[i]
   ?'<button type="button" class="filled'+(selected===i?' studio-selected':'')+'" data-slot="'+i+'" aria-label="第'+(i+1)+'個音符，點擊選取並聽聲音，再點下方圖案更換">'+(NOTES.find(n=>n[0]===notes[i])||[])[1]+'</button>'
   :'<span aria-hidden="true">♪</span>').join('');
  noteStrip.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{if(playing||Date.now()<suppressSlotClickUntil)return;const i=Number(b.dataset.slot);if(!Number.isInteger(i)||i<0||i>=notes.length)return;selected=selected===i?-1:i;update();a.unlock();sound(notes[i]);flash(notes[i]);vib(6);guide.textContent=selected>=0?'🎧 第'+(i+1)+'個音符，按「從這裡聽」可試聽後半段，或點下方圖案更換！':'🎵 聽到了！點音符可再選取';});
  pads.forEach(b=>b.disabled=playing||(notes.length>=needed&&selected<0));
  play.disabled=playing||notes.length!==needed;
  playFrom.disabled=playing||selected<0||selected>=notes.length;
  stopPlay.disabled=!playing;
  save.disabled=playing||!listened||notes.length!==needed;
  app.querySelector('#studio-undo').disabled=playing||!notes.length;
   app.querySelector('#studio-repeat').disabled=playing||!notes.length||notes.length>=needed;
  app.querySelector('#studio-reverse').disabled=playing||notes.length<2||notes.every((id,i)=>id===notes[notes.length-1-i]);
  app.querySelector('#studio-autofill').disabled=playing||!notes.length||notes.length>=needed;
  app.querySelector('#studio-delete').disabled=playing||selected<0||selected>=notes.length;
  app.querySelector('#studio-history-back').disabled=playing||!undoHistory.length;
  app.querySelector('#studio-history-next').disabled=playing||!redoHistory.length;
  app.querySelector('#studio-clear').disabled=playing||!notes.length;
  app.querySelector('#studio-inspire').disabled=playing;
  app.querySelector('#studio-slow').disabled=playing;
  app.querySelector('#studio-left').disabled=playing||selected<=0;
  app.querySelector('#studio-right').disabled=playing||selected<0||selected>=notes.length-1;
 }
 function flash(id){const b=pads.find(x=>x.dataset.note===id);if(!b)return;b.classList.add('studio-lit');later(()=>b.classList.remove('studio-lit'),230,token)}
 function stopPlayback(){
  if(!playing)return;
  timers.forEach(clearTimeout);timers=[];
  playing=false;listened=false;
  noteStrip.querySelectorAll('.studio-playing').forEach(b=>b.classList.remove('studio-playing'));
  pads.forEach(b=>b.classList.remove('studio-lit'));
  guide.textContent='⏹️ 已停止播放，音符都保留了！按「聽我的歌」可重新聽！';
  update();vib(8);
 }
 stopPlay.onclick=stopPlayback;
 function playback(song,mark,startIndex=0){
  if(playing||!song.length)return;
  const offset=Math.max(0,Math.min(song.length-1,Number(startIndex)||0));
  a.unlock();playing=true;listened=false;selected=-1;guide.textContent=offset?'🎧 從第 '+(offset+1)+' 個音符開始試聽！':'👂 聽聽自己創作的旋律！';update();
  const beat=slowMode?700:360;
  song.slice(offset).forEach((id,j)=>{const i=j+offset;later(()=>{
   sound(id);flash(id);
   if(mark){const slot=noteStrip.querySelector('[data-slot="'+i+'"]');if(slot){slot.classList.add('studio-playing');later(()=>slot.classList.remove('studio-playing'),Math.min(beat-80,500),token)}}
  },100+j*beat,token)});
  later(()=>{playing=false;if(mark&&offset===0&&valid(notes,level))listened=true;guide.textContent=offset?'🎧 試聽完成！保存前要從頭聽完整首歌。':mark?'🌟 好聽！可以保存這首歌了！':'🎶 這是你之前創作的歌曲！';update()},200+(song.length-offset)*beat,token);
 }

 // v159: reorder the composed melody directly by dragging a filled note to another slot.
 function moveSelected(dir){if(playing||selected<0)return;const to=selected+dir;if(to<0||to>=notes.length)return;remember();notes=moveNote(notes,selected,to);selected=to;listened=false;draft();update();guide.textContent='🎼 音符移好了！重新聽一次就能保存！';vib(9)}
 function slotAt(e){const hit=document.elementFromPoint?.(e.clientX,e.clientY),slot=hit?.closest?.('[data-slot]');return slot&&noteStrip.contains(slot)?Number(slot.dataset.slot):-1}
 function clearDrag(){if(!drag)return;const id=drag.id;drag=null;noteStrip.classList.remove('studio-dragging');noteStrip.querySelectorAll('.studio-drop-target').forEach(b=>b.classList.remove('studio-drop-target'));try{if(noteStrip.hasPointerCapture?.(id))noteStrip.releasePointerCapture(id)}catch(_){}}
 noteStrip.addEventListener('pointerdown',e=>{if(playing||drag||e.isPrimary===false||e.pointerType==='mouse'&&e.button!==0)return;const slot=e.target.closest?.('[data-slot]');if(!slot||!noteStrip.contains(slot))return;drag={id:e.pointerId,from:Number(slot.dataset.slot),x:e.clientX,y:e.clientY,moved:false};});
 noteStrip.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>=12){drag.moved=true;try{noteStrip.setPointerCapture(e.pointerId)}catch(_){}}if(!drag.moved)return;e.preventDefault?.();const to=slotAt(e);noteStrip.classList.add('studio-dragging');noteStrip.querySelectorAll('.studio-drop-target').forEach(b=>b.classList.remove('studio-drop-target'));if(to>=0&&to!==drag.from)noteStrip.querySelector('[data-slot="'+to+'"]')?.classList.add('studio-drop-target')});
 noteStrip.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const from=drag.from,to=slotAt(e),moved=drag.moved;clearDrag();if(!moved)return;suppressSlotClickUntil=Date.now()+700;e.preventDefault?.();if(to<0||to===from||playing)return;remember();notes=moveNote(notes,from,to);selected=-1;listened=false;draft();update();vib(12);guide.textContent='🎼 順序換好了！按「聽我的歌」再聽一次！'});
 noteStrip.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.id){suppressSlotClickUntil=Date.now()+700;clearDrag()}});
 noteStrip.addEventListener('lostpointercapture',e=>{if(e.target===noteStrip&&drag&&e.pointerId===drag.id)clearDrag()});
 noteStrip.addEventListener('click',e=>{if(Date.now()<suppressSlotClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
 app.querySelector('#studio-left').onclick=()=>moveSelected(-1);
 app.querySelector('#studio-right').onclick=()=>moveSelected(1);
 app.querySelector('#studio-history-back').onclick=()=>restoreEdit(undoHistory,redoHistory,'↶ 已復原上一個修改！');
 app.querySelector('#studio-history-next').onclick=()=>restoreEdit(redoHistory,undoHistory,'↷ 已重做剛才的修改！');
 pads.forEach(b=>b.onclick=()=>{
  if(playing||(notes.length>=needed&&selected<0))return;
  a.unlock();sound(b.dataset.note);flash(b.dataset.note);remember();
  if(selected>=0&&selected<notes.length){notes[selected]=b.dataset.note;selected=-1;guide.textContent='🎯 音符換好了！按「聽我的歌」再聽一次！'}
  else{notes.push(b.dataset.note);guide.textContent=notes.length===needed?'🎉 音符排好了！按「聽我的歌」':'🎵 真好聽！繼續加音符'}
  listened=false;draft();vib(9);update();
 });

 // v326: Finger painting a melody: collect pads on the real gesture, commit only on release.
 // Cancellation and secondary fingers never change notes, undo history or saved drafts.
 const padSurface=app.querySelector('.studio-pads');
 let padGesture=null,suppressPadClickUntil=0;
 function padAt(x,y){
  const hit=document.elementFromPoint?.(x,y),pad=hit?.closest?.('[data-note]');
  return pad&&padSurface.contains(pad)?pad:null;
 }
 function collectPad(pad){
  if(!padGesture||!pad||pad.disabled||padGesture.last===pad)return;
  padGesture.last=pad;padGesture.path.push(pad);pad.classList.add('studio-swipe-hit');
 }
 function tracePads(x,y){
  if(!padGesture)return;
  const fromX=padGesture.lastX,fromY=padGesture.lastY,dist=Math.hypot(x-fromX,y-fromY);
  const count=Math.max(1,Math.ceil(dist/8));
  for(let i=1;i<=count;i++)collectPad(padAt(fromX+(x-fromX)*i/count,fromY+(y-fromY)*i/count));
  padGesture.lastX=x;padGesture.lastY=y;
  guide.textContent='🎼 滑過 '+padGesture.path.length+' 個圖案，放開就加入旋律！';
 }
 function clearPadPreviewTimer(g){
  if(g&&g.previewTimer!==null){clearTimeout(g.previewTimer);timers=timers.filter(t=>t!==g.previewTimer);g.previewTimer=null}
 }
 function clearPadGesture(){
  if(!padGesture)return;
  const old=padGesture,id=old.id;clearPadPreviewTimer(old);old.start.classList.remove('studio-previewing');padGesture=null;
  padSurface.classList.remove('studio-swipe-active');
  pads.forEach(p=>p.classList.remove('studio-swipe-hit'));
  try{if(padSurface.hasPointerCapture?.(id))padSurface.releasePointerCapture(id)}catch(_){}
 }
 padSurface.addEventListener('pointerdown',e=>{
  suppressPadClickUntil=0;
  if(playing||padGesture||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  const pad=e.target.closest?.('[data-note]');
  if(!pad||!padSurface.contains(pad)||pad.disabled)return;
  const held={id:e.pointerId,start:pad,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,last:null,path:[],moved:false,preview:false,previewTimer:null};
  padGesture=held;
  held.previewTimer=later(()=>{
   held.previewTimer=null;
   if(padGesture!==held||held.moved||playing||generation!==token)return;
   held.preview=true;a.unlock();sound(pad.dataset.note);flash(pad.dataset.note);vib(8);
   const name=(NOTES.find(n=>n[0]===pad.dataset.note)||[])[2]||'音符';
   pad.classList.add('studio-previewing');guide.textContent='🎧 '+name+'！只試聽，不會加進旋律';
  },520,token);
 });
 padSurface.addEventListener('pointermove',e=>{
  if(!padGesture||e.pointerId!==padGesture.id)return;
  if(padGesture.preview)return;
  if(Math.hypot(e.clientX-padGesture.x,e.clientY-padGesture.y)>=10)clearPadPreviewTimer(padGesture);
  if(!padGesture.moved&&Math.hypot(e.clientX-padGesture.x,e.clientY-padGesture.y)>=12){
   padGesture.moved=true;padSurface.classList.add('studio-swipe-active');
   try{padSurface.setPointerCapture(e.pointerId)}catch(_){}
   collectPad(padGesture.start);
  }
  if(!padGesture.moved)return;
  e.preventDefault?.();tracePads(e.clientX,e.clientY);
 });
 padSurface.addEventListener('pointerup',e=>{
  if(!padGesture||e.pointerId!==padGesture.id)return;
  const moved=padGesture.moved,preview=padGesture.preview;
  if(moved)tracePads(e.clientX,e.clientY);
  const path=padGesture.path.slice(),room=Math.max(0,needed-notes.length+(selected>=0?1:0));
  clearPadGesture();
  if(preview){suppressPadClickUntil=Date.now()+650;e.preventDefault?.();return}
  if(!moved)return;
  e.preventDefault?.();
  let added=0;
  for(const pad of path.slice(0,room)){if(!pad.disabled){pad.click();added++}}
  suppressPadClickUntil=Date.now()+600;
  guide.textContent=added?'🎼 一筆加入 '+added+' 個音符！'+(notes.length===needed?' 現在聽聽你的歌！':' 再滑一次吧！'):'🎼 旋律已排滿，按「聽我的歌」！';
 });
 padSurface.addEventListener('pointercancel',e=>{if(padGesture&&e.pointerId===padGesture.id)clearPadGesture()});
 padSurface.addEventListener('lostpointercapture',e=>{if(e.target===padSurface&&padGesture&&e.pointerId===padGesture.id)clearPadGesture()});
 padSurface.addEventListener('click',e=>{
  if(Date.now()<suppressPadClickUntil){e.preventDefault?.();e.stopImmediatePropagation?.();suppressPadClickUntil=0}
 },true);
 padSurface.addEventListener('contextmenu',e=>{if(e.target.closest?.('[data-note]'))e.preventDefault()});
 app.querySelector('#studio-undo').onclick=()=>{if(playing||!notes.length)return;remember();notes.pop();selected=-1;listened=false;draft();update();guide.textContent='↩️ 可以換一個音符！'};
 app.querySelector('#studio-autofill').onclick=()=>{
  if(playing||!notes.length||notes.length>=needed)return;
  const original=notes.length;remember();notes=fillMelody(notes,level);selected=-1;listened=false;draft();update();
  a.unlock();sound(notes[original]);flash(notes[original]);vib(12);
  guide.textContent='✨ 保留你前面 '+original+' 個音符，媽媽幫忙接完！按「聽我的歌」再保存！';
 };
 app.querySelector('#studio-reverse').onclick=()=>{
  if(playing||notes.length<2||notes.every((id,i)=>id===notes[notes.length-1-i]))return;
  remember();notes=reverseMelody(notes);selected=-1;listened=false;draft();update();
  a.unlock();sound(notes[0]);flash(notes[0]);vib(12);
  guide.textContent='🔄 音符順序倒過來了！按「聽我的歌」比較新旋律，或按「復原修改」變回原本的歌。';
 };
 app.querySelector('#studio-repeat').onclick=()=>{if(playing||!notes.length||notes.length>=needed)return;const i=selected>=0&&selected<notes.length?selected:notes.length-1;const id=notes[i];remember();notes=duplicateNote(notes,i,needed);selected=i+1;listened=false;draft();update();a.unlock();sound(id);flash(id);vib(12);guide.textContent='🎵 已複製第'+(i+1)+'個音符！再按一次可以繼續重複。'};
  app.querySelector('#studio-delete').onclick=()=>{if(playing||selected<0||selected>=notes.length)return;remember();notes=removeNote(notes,selected);selected=-1;listened=false;draft();update();vib(10);guide.textContent='🗑️ 已刪除選中的音符！可以加入新音符，復原修改也能找回。'};
  app.querySelector('#studio-clear').onclick=()=>{if(playing||!notes.length)return;remember();notes=[];selected=-1;listened=false;draft();update();guide.textContent='🌈 再創作一首新的！'};
 app.querySelector('#studio-inspire').onclick=()=>{
  if(playing)return;
  remember();notes=compose(level);selected=-1;listened=false;draft();update();
  sound(notes[0]);flash(notes[0]);vib(12);
  guide.textContent='🎲 媽媽給你一段新旋律！可以拖動、換音符，聽完再保存！';
 };
 app.querySelector('#studio-slow').onclick=e=>{if(playing)return;slowMode=!slowMode;e.currentTarget.setAttribute('aria-pressed',String(slowMode));e.currentTarget.textContent=slowMode?'🐢 慢慢聽：開':'🐢 慢慢聽：關';guide.textContent=slowMode?'🐢 每個音符慢慢響，跟著亮起來的圖案聽！':'🎵 恢復正常速度，按「聽我的歌」！';vib(8)};
 play.onclick=()=>{if(valid(notes,level))playback([...notes],true)};
 playFrom.onclick=()=>{if(!playing&&selected>=0&&selected<notes.length)playback([...notes],true,selected)};
 save.onclick=()=>{
  const result=commit(level,notes,listened);if(!result.ok){guide.textContent='👂 先排好音符，再播放聽一次喔！';return}
  fx('win');vib([12,24,12]);say('彥彥創作了一首自己的歌！好棒！');
  const ov=document.createElement('div');ov.className='overlay';ov.innerHTML='<div class="popup"><div class="stars">🎼 ⭐⭐</div><h2>🎉 我的第一首歌！</h2><p>🎵 這首歌是彥彥自己創作的！</p><button class="primary" id="studio-next">▶️ 創作下一首</button><button class="classic-secondary" id="studio-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.studio-screen').appendChild(ov);
  ov.querySelector('#studio-next').onclick=()=>start(nextLevel(level));ov.querySelector('#studio-menu').onclick=menu;
 };
 const lib=app.querySelector('#studio-library');
 app.querySelector('#studio-library-toggle').onclick=()=>{
  lib.hidden=!lib.hidden;if(lib.hidden)return;
  const songs=Array.isArray(state.musicStudioSongs)?state.musicStudioSongs.slice(0,12):[];
  lib.innerHTML=songs.length?songs.map((x,i)=>'<button data-song="'+i+'">▶️ 第'+x.level+'首　'+clean(x.notes).map(id=>(NOTES.find(n=>n[0]===id)||[])[1]).join(' ')+'</button>').join(''):'還沒有保存的歌曲，快來創作第一首！';
  lib.querySelectorAll('[data-song]').forEach(b=>b.onclick=()=>{const x=songs[Number(b.dataset.song)];if(x)playback(clean(x.notes),false)});
 };
 app.querySelector('#studio-back').onclick=menu;app.querySelector('#studio-home').onclick=()=>{stop();renderHome()};
 app.querySelector('#studio-help').onclick=()=>{a.unlock();say('彥彥，先點四種圖案排音符，按住圖案半秒可以先聽聲音，不會加進旋律，點上方音符可以單獨聽聲音，選好後按從這裡聽可試聽後半段；保存前仍須從頭聽完整首歌。再按左右移動，也可以用手指把音符拖到新位置；按復原或重做可以找回之前的修改；點新圖案可以換音符；按刪除選中可以刪掉中間的音符；按重複音符會複製選中的音符，沒選時會重複最後一個。按倒轉旋律可以把整首歌的音符順序反過來，再聽聽不同的旋律，復原修改可以變回原本的歌。也可以先選幾個音符，再按補完旋律，保留你選的音符讓媽媽接著編；按靈感旋律，讓媽媽先編一首，再改成自己的歌。按慢慢聽可以讓音符一個一個亮起來，播放時按停止播放可以保留音符，重新聽完再保存！')};
 update();say('彥彥，今天當小小作曲家！點上方的音符，就可以換成其他聲音！');
}
function enhance(){
 const hub=app.querySelector('#yan-hub');
 if(!hub||hub.dataset.group!=='memory'||hub.querySelector('#studio-entry'))return;
 const b=document.createElement('button');b.id='studio-entry';b.className='studio-entry';b.type='button';
 b.innerHTML='<span>🎼</span><b>自由作曲工坊<small>自己彈、自己編、自己保存歌曲</small></b>';
 b.onclick=()=>start();const anchor=hub.querySelector('.hub-cats')||hub.querySelector('.hub-modes')||hub.querySelector('.hub-relay[data-r="memory"]');if(anchor)anchor.insertAdjacentElement('afterend',b);else hub.appendChild(b);
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanMusicStudio={start,stop,target,nextLevel,clean,valid,moveNote,removeNote,duplicateNote,reverseMelody,compose,fillMelody,commit,enhance};
})();