(()=>{
'use strict';
// v411: Reverse-listen through available photos without scoring; explicit answer confirmation remains.
// v410: Two-choice beginner levels also get spoken turn-by-turn selection and explicit confirmation; no scoring on listening.
// v408: Explicit confirmation selects only the highlighted, still-valid photo after listening.
// v399: A big compare button reads the two remaining active photos; eliminated cards are never spoken.
// v398: While hearing all choices, show a preschool-sized stop button; cancel speech without answering.\n// v397: Tap to hear one photo; hold 650ms to hear all choices in one utterance.
// Listening never submits an answer or changes progress.
const app=document.getElementById('app');
if(!app)return;
const names={petshop:'寵物店看狗狗',playground:'公園跑跑',restaurant:'一起吃飯',bedtime:'睡前看故事書',school:'背書包去上學',swing:'公園盪鞦韆',picnic:'跟狗狗貓咪野餐'};
const HOLD_MS=650;
let active=null;
let compareControl=null,compareWrap=null;

let stopControl=null,stopGrid=null,stopPoll=null,stopExpiry=null;
function clearStop(){
 if(stopPoll!==null){clearInterval(stopPoll);stopPoll=null}
 if(stopExpiry!==null){clearTimeout(stopExpiry);stopExpiry=null}
 if(stopControl){stopControl.remove();stopControl=null}
 if(stopGrid){stopGrid.classList.remove('is-listening-all');stopGrid=null}
}
function stopReading(){
 try{window.YanSpeech?.cancel?.()}catch(_e){}
 clearStop();
}
function offerStop(grid){
 clearStop();
 stopGrid=grid;
 const button=document.createElement('button');
 button.type='button';button.className='photo-quiz-stop';button.textContent='⏹ 停止朗讀';
 button.setAttribute('aria-label','停止朗讀全部照片');
 button.addEventListener('pointerdown',event=>event.stopPropagation());
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();stopReading()});
 grid.appendChild(button);stopControl=button;
 grid.classList.add('is-listening-all');
 const started=Date.now();
 stopPoll=setInterval(()=>{
  if(!stopControl||!stopGrid?.isConnected){clearStop();return}
  const synth=window.YanSpeech;
  if(Date.now()-started>1300&&synth&&!synth.speaking&&!synth.pending)clearStop();
 },350);
 stopExpiry=setTimeout(clearStop,30000);
}
function sharedAudio(){
 const shared=window.YanClassicShared;
 if(!shared||typeof shared.say!=='function')return null;
 window.YanClassicAudio?.unlock?.();
 return shared;
}
function photoName(id){
 const photo=(window.YanFamilyPhotos||[]).find(p=>p.id===id);
 return names[id]||photo?.name||'親子照片';
}
function speakOne(button,index,id){
 clearStop();
 const shared=sharedAudio();if(!shared)return;
 shared.say('第'+(index+1)+'張，'+photoName(id));
 shared.vib?.(8);
 button.classList.add('is-speaking');
 setTimeout(()=>button.classList.remove('is-speaking'),750);
}
function availableCards(grid){
 return Array.from(grid.querySelectorAll('.photo-quiz-item .photo-quiz-card')).filter(card=>!card.disabled&&!card.classList.contains('is-eliminated'));
}
function speakAll(grid){
 const shared=sharedAudio();if(!shared)return;
 const cards=availableCards(grid);
 if(!cards.length)return;
 const phrase=cards.length===2?'一起比較剩下兩張照片。':'一起聽還能選的照片。';
 const spoke=shared.say(phrase+cards.map(card=>{const all=Array.from(grid.querySelectorAll('.photo-quiz-item .photo-quiz-card'));return '第'+(all.indexOf(card)+1)+'張，'+photoName(card.dataset.photo)}).join('。'));
 if(!spoke)return;
 shared.vib?.(16);
 offerStop(grid);
}
function clearHold(){
 if(!active)return null;
 const hold=active;active=null;
 clearTimeout(hold.timer);
 hold.button.classList.remove('is-holding');
 try{if(hold.button.hasPointerCapture?.(hold.pointerId))hold.button.releasePointerCapture(hold.pointerId)}catch(_e){}
 return hold;
}
function syncCompare(grid){
 const wrap=app.querySelector('.photo-quiz-hint-wrap');
 if(compareControl&&!compareControl.isConnected){compareControl=null;compareWrap=null}
 const two=wrap&&availableCards(grid).length===2;
 if(!two){
  if(compareControl){compareControl.remove();compareControl=null}
  if(compareWrap){compareWrap.classList.remove('has-compare');compareWrap=null}
  return;
 }
 if(compareControl&&compareWrap===wrap)return;
 if(compareControl)compareControl.remove();
 if(compareWrap)compareWrap.classList.remove('has-compare');
 const button=document.createElement('button');
 button.type='button';button.className='photo-quiz-compare';
 button.textContent='🔊 聽兩張比較';
 button.setAttribute('aria-label','聽剩下兩張可選照片的名稱，不會作答');
 button.addEventListener('pointerdown',event=>event.stopPropagation());
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();speakAll(grid)});
 wrap.appendChild(button);wrap.classList.add('has-compare');
 compareControl=button;compareWrap=wrap;
}

/* v407: One large, non-scoring button cycles through still-available photo choices.
   This is deliberately separate from answer clicks and skips eliminated cards. */
let turnGrid=null,turnControl=null,turnPrev=null,turnChoose=null,turnWrap=null,turnSelected=null,turnNumber=0;
function clearTurn(){
 if(turnSelected){turnSelected.classList.remove('is-listening-turn');turnSelected=null}
 if(turnControl){turnControl.remove();turnControl=null}
 if(turnPrev){turnPrev.remove();turnPrev=null}
 if(turnChoose){turnChoose.remove();turnChoose=null}
 if(turnWrap){turnWrap.classList.remove('has-listen-turn');turnWrap=null}
 turnGrid=null;turnNumber=0;
}
function speakTurn(grid,delta=1){
 const cards=availableCards(grid);
 if(cards.length<2)return;
 const shared=sharedAudio();if(!shared)return;
 let next=cards.indexOf(turnSelected)+delta;
 if(next>=cards.length)next=0;
 if(next<0)next=cards.length-1;
 if(turnSelected)turnSelected.classList.remove('is-listening-turn');
 turnSelected=cards[next];turnNumber=next+1;
 turnSelected.classList.add('is-listening-turn');
 const all=Array.from(grid.querySelectorAll('.photo-quiz-item .photo-quiz-card'));
 shared.say('第'+(all.indexOf(turnSelected)+1)+'張，'+photoName(turnSelected.dataset.photo));
 shared.vib?.(8);
 if(turnControl)turnControl.textContent='👂 下一張（'+turnNumber+'/'+cards.length+'）';
 if(turnPrev)turnPrev.textContent='👂 上一張（'+turnNumber+'/'+cards.length+'）';
 if(turnChoose)turnChoose.disabled=false;
}
function syncTurn(grid){
 const wrap=app.querySelector('.photo-quiz-hint-wrap');
 if(turnControl&&!turnControl.isConnected){clearTurn()}
 const cards=availableCards(grid);
 if(!wrap||cards.length<2){clearTurn();return}
 if(turnGrid!==grid||turnWrap!==wrap){clearTurn()}
 if(!turnControl){
  const previous=document.createElement('button');
  previous.type='button';previous.className='photo-quiz-listen-prev';
  previous.textContent='👂 上一張';
  previous.setAttribute('aria-label','聽上一張仍可選的照片，不會作答');
  previous.addEventListener('pointerdown',event=>event.stopPropagation());
  previous.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();speakTurn(grid,-1)});
  wrap.appendChild(previous);
  const button=document.createElement('button');
  button.type='button';button.className='photo-quiz-listen-turn';
  button.textContent='👂 一張一張聽';
  button.setAttribute('aria-label','依序聽還能選的照片，不會作答');
  button.addEventListener('pointerdown',event=>event.stopPropagation());
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();speakTurn(grid)});
  wrap.appendChild(button);
  const choose=document.createElement('button');
  choose.type='button';choose.className='photo-quiz-choose-turn';
  choose.textContent='👆 選這張';choose.disabled=true;
  choose.setAttribute('aria-label','選擇剛剛聽過且亮橘框的照片，這次會正式作答');
  choose.addEventListener('pointerdown',event=>event.stopPropagation());
  choose.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   const selected=turnSelected;
   if(!selected||turnGrid!==grid||!availableCards(grid).includes(selected))return;
   selected.classList.remove('is-listening-turn');
   turnSelected=null;turnNumber=0;choose.disabled=true;
   button.textContent='👂 一張一張聽';
   previous.textContent='👂 上一張';
   selected.click();
  });
  wrap.appendChild(choose);wrap.classList.add('has-listen-turn');
  turnControl=button;turnPrev=previous;turnChoose=choose;turnWrap=wrap;turnGrid=grid;
 }
 if(turnSelected&&!cards.includes(turnSelected)){
  turnSelected.classList.remove('is-listening-turn');
  turnSelected=null;turnNumber=0;
  turnControl.textContent='👂 一張一張聽';
  if(turnPrev)turnPrev.textContent='👂 上一張';
  if(turnChoose)turnChoose.disabled=true;
 }
}

function enhance(){
 const grid=app.querySelector('#photo-quiz-grid');
 if(stopGrid&&stopGrid!==grid)clearStop();
 if(!grid){clearTurn();if(compareControl){compareControl.remove();compareControl=null}if(compareWrap){compareWrap.classList.remove('has-compare');compareWrap=null}return}
 grid.querySelectorAll('.photo-quiz-item').forEach((item,index)=>{
  if(item.querySelector('.photo-quiz-listen'))return;
  const card=item.querySelector('.photo-quiz-card');if(!card)return;
  const id=card.dataset.photo;
  const button=document.createElement('button');
  button.type='button';button.className='photo-quiz-listen';button.textContent='🔊';
  button.setAttribute('aria-label','點一下聽第'+(index+1)+'張照片，按住聽全部照片，不會作答');
  button.title='點一下聽這張；按住聽全部（不算作答）';
  let suppressClick=false;
  button.addEventListener('pointerdown',event=>{
   if(active||event.isPrimary===false||event.button>0)return;
   // A new intentional tap must not inherit the prior long-press click guard.
   suppressClick=false;
   const pointerId=event.pointerId;
   active={button,pointerId,long:false,timer:null,startX:event.clientX||0,startY:event.clientY||0};
   button.classList.add('is-holding');
   try{button.setPointerCapture?.(pointerId)}catch(_e){}
   active.timer=setTimeout(()=>{
    if(!active||active.button!==button||active.pointerId!==pointerId)return;
    active.long=true;
    suppressClick=true;
    setTimeout(()=>{suppressClick=false},900);
    speakAll(grid);
   },HOLD_MS);
  });
  button.addEventListener('pointermove',event=>{
   if(!active||active.button!==button||active.pointerId!==event.pointerId||active.long)return;
   if(Math.hypot((event.clientX||0)-active.startX,(event.clientY||0)-active.startY)>14)clearHold();
  });
  button.addEventListener('pointerup',event=>{
   if(!active||active.button!==button||active.pointerId!==event.pointerId)return;
   const long=active.long;
   clearHold();
   if(long){event.preventDefault();event.stopPropagation()}
  });
  const cancel=event=>{
   if(active&&active.button===button&&active.pointerId===event.pointerId)clearHold();
  };
  button.addEventListener('pointercancel',cancel);
  button.addEventListener('lostpointercapture',cancel);
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(suppressClick){suppressClick=false;return}
   speakOne(button,index,id);
  });
  item.appendChild(button);
 });
 syncCompare(grid);
 syncTurn(grid);
}
const observer=new MutationObserver(enhance);
observer.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
enhance();
})();