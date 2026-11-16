const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
let audio,screen={},observer,retryButton=null;
class AudioMock{constructor(){audio=this}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}removeAttribute(){this.src=''}load(){}}
const listeners={};
const document={hidden:false,body:{appendChild(){}},querySelector:selector=>selector==='#app > .screen'?screen:retryButton&&selector.split(',').includes('#'+retryButton.id)?retryButton:null,getElementById:()=>({}),addEventListener:(name,fn)=>listeners[name]=fn};
const window={YanClassicShared:{state:{voice:true}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../speech.js'),'utf8'),{Audio:AudioMock,document,window,MutationObserver:class{constructor(fn){observer=fn}observe(){}}});
const speech=window.YanSpeech;
let completed=0;
assert.equal(speech.speak('第一句',()=>completed++),true);
const staleEnd=audio.onended;
speech.speak('第二句',()=>completed++);
staleEnd();assert.equal(completed,0,'old response cannot complete new speech');
audio.onplaying();assert.equal(speech.speaking,true);
audio.onended();assert.equal(completed,1);assert.equal(speech.speaking,false);
speech.speak('第三句');screen={};observer();assert.equal(audio.paused,true);assert.equal(speech.pending,false);
window.YanClassicShared.state.voice=false;assert.equal(speech.speak('靜音'),false);
assert.equal(audio.src,'');
window.YanClassicShared.state.voice=true;
for(const id of ['seek-voice','pretend-voice']){
 const attributes={};retryButton={id,setAttribute:(name,value)=>attributes[name]=value};
 let reason=null;speech.speak('失敗的語音',value=>reason=value);audio.onerror();
 assert.equal(reason,'error');assert.equal(speech.pending,false);
 assert(String(attributes['aria-label']||'').includes('重播語音'),id+' receives retry guidance');
 speech.speak('重新播放');audio.onplaying();assert.equal(speech.speaking,true);
 const staleError=audio.onerror;speech.cancel();retryButton.title='new screen';
 staleError();assert.equal(retryButton.title,'new screen','cancelled error cannot modify a new screen');
}
console.log('Speech errors: both preschool retry buttons, retry playback and stale-error cancellation passed.');
for(const playing of [false,true]){
 let finished=0,started=0;
 speech.speak('切換到背景',()=>finished++,()=>started++);
 if(playing)audio.onplaying();
 const stalePlaying=audio.onplaying,staleEnded=audio.onended;
 document.hidden=true;listeners.visibilitychange();
 assert.equal(audio.paused,true);assert.equal(audio.src,'');
 assert.equal(speech.pending,false);assert.equal(speech.speaking,false);
 stalePlaying();staleEnded();assert.equal(finished,0);assert.equal(started,playing?1:0);
 document.hidden=false;listeners.visibilitychange();assert.equal(audio.paused,true,'foreground does not restart cancelled speech');
 speech.speak('重新按喇叭');audio.onplaying();assert.equal(speech.speaking,true,'explicit replay still works');
 speech.cancel();
}
console.log('Speech visibility: pending/playing cancellation, ignored late callbacks, no automatic resume and explicit replay passed.');
console.log('Speech: stale response, completion, navigation cancellation, mute passed.');
