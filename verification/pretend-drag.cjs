const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 let screen,ghost=null;const spoken=[];
 function node(){const attrs={},classes=new Set(),captured=new Set();return {dataset:{},style:{},isConnected:true,textContent:'',hidden:false,offsetWidth:10,
  classList:{add:(...a)=>a.forEach(x=>classes.add(x)),remove:(...a)=>a.forEach(x=>classes.delete(x)),contains:c=>classes.has(c),toggle:(c,v)=>v?classes.add(c):classes.delete(c)},
  setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],click(){this.onclick?.()},
  setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),
  getBoundingClientRect:()=>({left:100,right:200,top:100,bottom:200}),remove(){if(ghost===this)ghost=null}}}
 const baby=node(),effect=node(),status=node();
 const food=['🍌','🍓','🥣'].map(x=>Object.assign(node(),{dataset:{food:x}}));
 const modes=['feed','bath','hug','sleep'].map(x=>Object.assign(node(),{dataset:{activity:x}}));
 const map={'#pretend-baby':baby,'.pretend-effect':effect,'.pretend-status':status,'.pretend-window':node(),'.pretend-hand':node(),'.pretend-face':node(),'.pretend-food':node(),'#pretend-home':node(),'#pretend-voice':node()};
 screen=Object.assign(node(),{querySelector:q=>q==='.pretend-drag-food'?ghost:map[q],querySelectorAll:q=>q==='[data-food]'?food:modes,appendChild:g=>{ghost=g}});
 const listeners={};const document={hidden:false,createElement:node,addEventListener:(name,fn)=>listeners[name]=fn};
 const window={addEventListener:(name,fn)=>listeners[name]=fn,YanSpeech:{cancel(){}},YanClassicAudio:{unlock(){},play(){}},YanClassicShared:{state:{},persist(){},app:{querySelector:()=>screen},say:t=>spoken.push(t),renderHome(){screen.isConnected=false}}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../pretend-play.js'),'utf8'),{window,document,AbortController});
 window.YanPretendPlay.start();modes[0].click();
 const event=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,button:0,preventDefault(){}});
 const begin=()=>{food[1].onpointerdown(event(10,10));food[1].onpointermove(event(140,140))};
 return {food,modes,baby,effect,status,window,document,listeners,event,begin,ghost:()=>ghost,spoken,map};
}
for(const cancel of ['pointercancel','lostpointercapture','blur','visibilitychange','mode','stop']){
 const f=fixture();f.begin();assert(f.ghost(),'drag image appears');
 if(cancel==='mode')f.modes[1].click();else if(cancel==='stop')f.window.YanPretendPlay.stop();
 else if(cancel==='blur')f.listeners.blur();else if(cancel==='visibilitychange'){f.document.hidden=true;f.listeners.visibilitychange()}
 else f.food[1]['on'+cancel](f.event(140,140));
 assert.equal(f.ghost(),null,cancel+' removes drag image');
 f.food[1].onpointerup(f.event(140,140));assert(!f.spoken.some(s=>s.startsWith('啊嗚')),cancel+' cannot feed on late release');
}
const f=fixture();f.begin();f.food[1].onpointerup(f.event(140,140));f.food[1].click();
assert.equal(f.effect.textContent,'😋');assert.equal(f.spoken.filter(s=>s.startsWith('啊嗚')).length,1,'drop feeds once');assert.equal(f.ghost(),null);
const missed=fixture();missed.begin();missed.food[1].onpointerup(missed.event(500,500));assert(!missed.spoken.some(s=>s.startsWith('啊嗚')));assert.equal(missed.ghost(),null);
const tap=fixture();tap.food[2].onpointerdown(tap.event(10,10));tap.food[2].onpointerup(tap.event(10,10));tap.food[2].click();tap.baby.click();assert.equal(tap.effect.textContent,'😋');
console.log('Pretend drag: successful drop once, miss, tap fallback, pointer cancellation, capture loss, blur, hidden page, mode change and late release passed.');

const resume=fixture();resume.modes[3].click();resume.baby.click();
assert.equal(resume.window.YanClassicShared.state.pretendSession.sleeping,true);
resume.window.YanPretendPlay.stop();resume.window.YanPretendPlay.start();
assert.equal(resume.baby.getAttribute('aria-label'),'叫醒娃娃');
resume.map['#pretend-voice'].click();assert(resume.spoken.at(-1).includes('叫他起床'));
resume.baby.click();assert.equal(resume.window.YanClassicShared.state.pretendSession.sleeping,false);
const cp=resume.window.YanPretendPlay.checkpoint;
const valid=resume.window.YanClassicShared.state.pretendSession;
assert.equal(cp({...valid,food:'invalid'}),null);
assert.equal(cp({...valid,activity:'feed',sleeping:true}),null);
assert.equal(cp({...valid,version:2}),null);
assert.notEqual(cp(valid),valid);
console.log('Pretend save: sleeping resume, wake guidance, waking and invalid checkpoints passed.');
const repeat=fixture();repeat.baby.click();repeat.modes[0].click();
assert.equal(repeat.effect.textContent,'😋','reselecting feeding preserves its feedback');
assert(repeat.spoken.at(-1).includes('換一種食物'),'fed guidance acknowledges feeding');
repeat.modes[1].click();repeat.baby.click();repeat.modes[1].click();
assert.equal(repeat.effect.textContent,'✨','reselecting bathing preserves clean feedback');
assert(repeat.spoken.at(-1).includes('洗乾淨了'),'clean guidance acknowledges washing');
repeat.window.YanPretendPlay.stop();repeat.window.YanPretendPlay.start();
assert.equal(repeat.effect.textContent,'✨','clean feedback survives restart');
repeat.modes[0].click();assert.equal(repeat.effect.textContent,'🍌','changing activities starts a new interaction');
console.log('Repeated activity selection preserves feeding and bathing feedback; switching activities still works.');
for(const action of ['up','cancel','blur','hidden','mode','stop']){
 const h=fixture();h.modes[2].click();h.baby.onpointerdown(h.event(150,150,1));assert(h.baby.classList.contains('pretend-hugging'),'pointer press starts hug feedback');
 h.baby.onpointerdown(h.event(150,150,2));h.baby.onpointerup(h.event(150,150,2));assert(h.baby.classList.contains('pretend-hugging'),'second pointer cannot end the first hug');
 if(action==='up')h.baby.onpointerup(h.event(150,150,1));else if(action==='cancel')h.baby.onpointercancel(h.event(150,150,1));else if(action==='blur')h.listeners.blur();else if(action==='hidden'){h.document.hidden=true;h.listeners.visibilitychange()}else if(action==='mode')h.modes[0].click();else h.window.YanPretendPlay.stop();
 assert(!h.baby.classList.contains('pretend-hugging'),action+' clears hug feedback');assert(!h.baby.hasPointerCapture(1),action+' releases hug capture');
}
const wash=fixture();wash.modes[1].click();wash.baby.onpointerdown(wash.event(110,150));wash.baby.onpointermove(wash.event(195,150));wash.baby.onpointerup(wash.event(195,150));wash.baby.click();
assert.equal(wash.effect.textContent,'✨','washing gesture stays clean after synthetic click');
assert.equal(wash.spoken.filter(s=>s.startsWith('搓搓洗洗')).length,1);
const cancelledWash=fixture();cancelledWash.modes[1].click();cancelledWash.baby.onpointerdown(cancelledWash.event(110,150));cancelledWash.baby.onpointercancel(cancelledWash.event(110,150));cancelledWash.baby.onpointermove(cancelledWash.event(195,150));cancelledWash.baby.onpointerup(cancelledWash.event(195,150));cancelledWash.baby.click();assert.equal(cancelledWash.effect.textContent,'🫧');
console.log('Washing gesture: clean feedback once, synthetic-click suppression and cancellation passed.');
for(const action of ['cancel','lostcapture','blur','hidden']){
 const h=fixture();h.modes[2].click();h.baby.onpointerdown(h.event(150,150,1));
 if(action==='cancel')h.baby.onpointercancel(h.event(150,150,1));else if(action==='lostcapture')h.baby.onlostpointercapture(h.event(150,150,1));else if(action==='blur')h.listeners.blur();else {h.document.hidden=true;h.listeners.visibilitychange();h.document.hidden=false;}
 h.baby.onpointerup(h.event(150,150,1));h.baby.click();
 assert(!h.baby.classList.contains('pretend-hugging'),action+' late events keep hug released');assert(!h.baby.hasPointerCapture(1));
 assert(!h.spoken.some(s=>s.startsWith('抱緊緊')),action+' ignores the interrupted click');
 h.baby.onpointerdown(h.event(150,150,3));assert(h.baby.classList.contains('pretend-hugging'),action+' allows a new hug');h.baby.onpointerup(h.event(150,150,3));h.baby.click();
 assert.equal(h.spoken.filter(s=>s.startsWith('抱緊緊')).length,1,action+' new hug responds once');assert(!h.baby.hasPointerCapture(3));
}
console.log('Hug interruption: cancelled late clicks ignored; deliberate new hugs recover once.');
for(const mode of [1,2]){
 const t=fixture();t.modes[mode].click();t.baby.onpointerdown(t.event(110,150,1));
 const before=t.spoken.length;
 t.baby.onpointerdown(t.event(150,150,2));t.baby.onpointerup(t.event(150,150,2));t.baby.click();
 assert.equal(t.spoken.length,before,'secondary click cannot complete an owned baby gesture');
 assert.equal(t.effect.textContent,mode===1?'🫧':'💛');
 t.baby.onpointerup(t.event(110,150,1));t.baby.click();
 assert.equal(t.spoken.length,before+1,'owner release still responds once');
}
const shortWash=fixture();shortWash.modes[1].click();shortWash.baby.onpointerdown(shortWash.event(110,150));shortWash.baby.onpointermove(shortWash.event(140,150));shortWash.baby.onpointerup(shortWash.event(140,150));shortWash.baby.click();assert.equal(shortWash.effect.textContent,'🫧','short rub does not complete or fall through to tap');
const outsideWash=fixture();outsideWash.modes[1].click();outsideWash.baby.onpointerdown(outsideWash.event(110,150));outsideWash.baby.onpointermove(outsideWash.event(400,150));outsideWash.baby.onpointerup(outsideWash.event(400,150));outsideWash.baby.click();assert.equal(outsideWash.effect.textContent,'🫧','outside movement does not wash clean');
const returnWash=fixture();returnWash.modes[1].click();returnWash.baby.onpointerdown(returnWash.event(110,150));returnWash.baby.onpointermove(returnWash.event(400,150));returnWash.baby.onpointermove(returnWash.event(110,150));assert.equal(returnWash.effect.textContent,'🫧','leaving and returning does not count outside travel as rubbing');returnWash.baby.onpointermove(returnWash.event(195,150));assert.equal(returnWash.effect.textContent,'✨','rubbing inside still completes after returning');
const outsideRelease=fixture();outsideRelease.modes[1].click();outsideRelease.baby.onpointerdown(outsideRelease.event(110,150));outsideRelease.baby.onpointermove(outsideRelease.event(400,150));outsideRelease.baby.onpointermove(outsideRelease.event(110,150));outsideRelease.baby.onpointerup(outsideRelease.event(110,150));outsideRelease.baby.click();assert.equal(outsideRelease.effect.textContent,'🫧','return and release cannot fall through to tap');assert.equal(outsideRelease.baby.hasPointerCapture(1),false,'outside-return release frees capture');outsideRelease.baby.onpointerdown(outsideRelease.event(150,150));outsideRelease.baby.onpointerup(outsideRelease.event(150,150));outsideRelease.baby.click();assert.equal(outsideRelease.effect.textContent,'✨','next intentional tap still works');
const interruptedOutside=fixture();interruptedOutside.modes[1].click();interruptedOutside.baby.onpointerdown(interruptedOutside.event(110,150));interruptedOutside.baby.onpointermove(interruptedOutside.event(400,150));interruptedOutside.baby.onpointercancel(interruptedOutside.event(400,150));interruptedOutside.baby.onpointermove(interruptedOutside.event(110,150));interruptedOutside.baby.onpointerup(interruptedOutside.event(110,150));interruptedOutside.baby.click();assert.equal(interruptedOutside.effect.textContent,'🫧','cancelled outside wash ignores late re-entry and click');assert.equal(interruptedOutside.baby.hasPointerCapture(1),false,'cancelled outside wash frees capture');
const tapWash=fixture();tapWash.modes[1].click();tapWash.baby.onpointerdown(tapWash.event(110,150));tapWash.baby.onpointermove(tapWash.event(115,150));tapWash.baby.onpointerup(tapWash.event(115,150));tapWash.baby.click();assert.equal(tapWash.effect.textContent,'✨','small tap jitter retains tap fallback');
for(const action of ['up','cancel','outside','mode','stop','blur','hidden']){
 const t=fixture();t.modes[1].click();t.baby.onpointerdown(t.event(110,150));t.baby.onpointermove(t.event(140,150));assert(t.baby.classList.contains('pretend-scrubbing'),'short valid rub gives feedback before completion');assert.equal(t.effect.textContent,'🫧');
 if(action==='up')t.baby.onpointerup(t.event(140,150));else if(action==='cancel')t.baby.onpointercancel(t.event(140,150));else if(action==='outside')t.baby.onpointermove(t.event(400,150));else if(action==='mode')t.modes[0].click();else if(action==='blur')t.listeners.blur();else if(action==='hidden'){t.document.hidden=true;t.listeners.visibilitychange()}else t.window.YanPretendPlay.stop();
 assert(!t.baby.classList.contains('pretend-scrubbing'),action+' removes scrubbing feedback');
 if(action==='blur'||action==='hidden'){t.baby.onpointermove(t.event(195,150));t.baby.onpointerup(t.event(195,150));t.baby.click();assert.equal(t.effect.textContent,'🫧',action+' cannot finish washing on late events');assert(!t.baby.classList.contains('pretend-scrubbing'),action+' late events cannot restart feedback')}
}
const washToFeed=fixture();washToFeed.modes[1].click();washToFeed.baby.onpointerdown(washToFeed.event(110,150));washToFeed.modes[0].click();washToFeed.baby.onpointerup(washToFeed.event(195,150));washToFeed.baby.click();assert(!washToFeed.spoken.some(s=>s.startsWith('啊嗚')),'cancelled washing release cannot feed');washToFeed.begin();washToFeed.food[1].onpointerup(washToFeed.event(140,140));assert.equal(washToFeed.effect.textContent,'😋','new intentional food drag works after cancelled washing');assert.equal(washToFeed.spoken.filter(s=>s.startsWith('啊嗚')).length,1);
const hugToFeed=fixture();hugToFeed.modes[2].click();hugToFeed.baby.onpointerdown(hugToFeed.event(150,150));hugToFeed.modes[0].click();hugToFeed.baby.onpointerup(hugToFeed.event(150,150));hugToFeed.baby.click();assert(!hugToFeed.spoken.some(s=>s.startsWith('啊嗚')),'cancelled hug release cannot feed after changing activity');assert(!hugToFeed.baby.classList.contains('pretend-hugging'));hugToFeed.begin();hugToFeed.food[1].onpointerup(hugToFeed.event(140,140));assert.equal(hugToFeed.effect.textContent,'😋','new intentional food drag works after cancelled hug');assert.equal(hugToFeed.spoken.filter(s=>s.startsWith('啊嗚')).length,1,'new drag feeds exactly once');
const multiWash=fixture();multiWash.modes[1].click();multiWash.baby.onpointerdown(multiWash.event(110,150,1));multiWash.baby.onpointerdown(multiWash.event(110,150,2));multiWash.baby.onpointermove(multiWash.event(195,150,2));assert.equal(multiWash.effect.textContent,'🫧','second finger cannot replace active wash');multiWash.baby.onpointermove(multiWash.event(195,150,1));assert.equal(multiWash.effect.textContent,'✨','first finger retains ownership');multiWash.baby.onpointerup(multiWash.event(195,150,1));assert.equal(multiWash.baby.hasPointerCapture(1),false);assert.equal(multiWash.baby.hasPointerCapture(2),false);
for(const action of ['mode','blur','visibilitychange','stop']){
 const f=fixture();f.modes[1].click();f.baby.onpointerdown(f.event(110,150));
 if(action==='mode')f.modes[0].click();else if(action==='stop')f.window.YanPretendPlay.stop();else if(action==='visibilitychange'){f.document.hidden=true;f.listeners.visibilitychange()}else f.listeners.blur();
 f.baby.onpointermove(f.event(195,150));f.baby.onpointerup(f.event(195,150));f.baby.click();
 assert(!f.spoken.some(s=>s.startsWith('搓搓洗洗')||s.startsWith('啊嗚')),action+' blocks late washing/click');
}
