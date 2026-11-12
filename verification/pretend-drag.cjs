const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 let screen,ghost=null;const spoken=[];
 function node(){const attrs={},classes=new Set(),captured=new Set();return {dataset:{},style:{},isConnected:true,textContent:'',hidden:false,offsetWidth:10,
  classList:{add:(...a)=>a.forEach(x=>classes.add(x)),remove:(...a)=>a.forEach(x=>classes.delete(x)),toggle:(c,v)=>v?classes.add(c):classes.delete(c)},
  setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],click(){this.onclick?.()},
  setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),
  getBoundingClientRect:()=>({left:100,right:200,top:100,bottom:200}),remove(){if(ghost===this)ghost=null}}}
 const baby=node(),effect=node(),status=node();
 const food=['🍌','🍓','🥣'].map(x=>Object.assign(node(),{dataset:{food:x}}));
 const modes=['feed','bath','hug','sleep'].map(x=>Object.assign(node(),{dataset:{activity:x}}));
 const map={'#pretend-baby':baby,'.pretend-effect':effect,'.pretend-status':status,'.pretend-window':node(),'.pretend-face':node(),'.pretend-food':node(),'#pretend-home':node(),'#pretend-voice':node()};
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
