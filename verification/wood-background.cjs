const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(){
 let next=0;const jobs=new Map(),nodes=new Map(),events={};let cue,cancelled=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},classList:{toggle(){}},textContent:'',setAttribute(k,v){this[k]=v},addEventListener(k,fn){this[k]=fn},setPointerCapture(){}});return nodes.get(id)};
 const app={querySelector:node};
 const state={woodLevel:1,voice:true};
 const audio={unlock(){},play(){},canSpeak:()=>true,voice(){},cancelTimed(){cancelled++},speakTimed(text,finish,ms,start){cue={finish,start}}};
 const register=(target)=>(name,fn,options={})=>{(events[target+name]??=[]).push({fn,signal:options.signal})};
 const document={hidden:false,addEventListener:register('document')};
 const window={addEventListener:register('window'),YanClassicShared:{app,state,persist(){},say(){},fx(){},vib(){},bg:()=>'',renderHome(){}},YanClassicAudio:audio,YanSpeech:{cancel(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../classics.js'),'utf8'),{window,document,AbortController,Date,setTimeout(fn){jobs.set(++next,fn);return next},clearTimeout(id){jobs.delete(id)}});
 window.YanClassics.wood();
 return {node,state,document,window,get cue(){return cue},get cancelled(){return cancelled},emit(target,name){for(const x of events[target+name]||[])if(!x.signal?.aborted)x.fn()},run(){const batch=[...jobs];jobs.clear();for(const [,fn]of batch)fn()}};
}
for(const action of ['hidden','blur']){
 const t=fixture();t.cue.finish();t.run();t.cue.start();
 t.node('#wood-hold').pointerdown({preventDefault(){},pointerId:1});
 const progress=parseFloat(t.node('#wood-progress').style.width),old=t.cue;
 if(action==='hidden'){t.document.hidden=true;t.emit('document','visibilitychange')}else t.emit('window','blur');
 assert.equal(t.node('#wood-pause')['aria-label'],'繼續遊戲',action+' pauses automatically');
 old.finish();t.run();assert.equal(t.state.woodCheckpoint.progress,progress,action+' preserves progress');
 assert(!t.node('#wood-status').textContent.includes('再試'),action+' does not penalize');
 t.document.hidden=false;t.emit('document','visibilitychange');assert.equal(t.node('#wood-pause')['aria-label'],'繼續遊戲','return does not auto-resume');
 t.node('#wood-pause').onclick();t.run();t.cue.start();assert.equal(t.node('#wood-signal').className,'wood-signal green','explicit resume starts a new cue');
 t.window.YanClassics.clean();const count=t.cancelled;t.emit('window','blur');t.document.hidden=true;t.emit('document','visibilitychange');assert.equal(t.cancelled,count,'leaving removes background listeners');
}
for(const phase of ['intro','loading','red']){
 const t=fixture();
 if(phase!=='intro'){t.cue.finish();t.run()}
 if(phase==='red'){t.cue.start();t.cue.finish();t.run();assert.equal(t.node('#wood-signal').className,'wood-signal red')}
 const old=t.cue;t.document.hidden=true;t.emit('document','visibilitychange');const count=t.cancelled;
 t.emit('window','blur');t.emit('document','visibilitychange');assert.equal(t.cancelled,count,phase+' repeated background events do not cancel twice');
 old.start?.();old.finish();t.run();
 assert.equal(t.node('#wood-signal').className,'wood-signal paused',phase+' stale cue cannot resume');
 assert.equal(t.state.woodCheckpoint,null,phase+' at zero progress keeps checkpoint empty');
 assert(!t.node('#wood-status').textContent.includes('再試'),phase+' background cannot add a retry');
}
console.log('Woodman background: intro/loading/green/red pause, repeated events, preserved progress, stale cue, explicit resume and listener cleanup passed.');
