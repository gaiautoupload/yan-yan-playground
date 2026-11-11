const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
let audio,screen={},observer;
class AudioMock{constructor(){audio=this}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}removeAttribute(){this.src=''}load(){}}
const document={body:{appendChild(){}},querySelector:()=>screen,getElementById:()=>({}),addEventListener(){}};
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
console.log('Speech: stale response, completion, navigation cancellation, mute passed.');
