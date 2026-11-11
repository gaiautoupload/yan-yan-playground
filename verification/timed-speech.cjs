const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(voice=true){
 let now=0,next=0,id=0,active=null,cancelled=[],jobs=new Map();
 const speech={get id(){return id},speak(text,finish,start){active={finish,start,id:++id};return true},cancelIf(token){if(token===id){cancelled.push(token);id++}}};
 const window={YanClassicShared:{state:{voice}},YanSpeech:speech};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../classic-audio.js'),'utf8'),{window,Date:{now:()=>now},setTimeout(fn,delay){const k=++next;jobs.set(k,{fn,at:now+delay});return k},clearTimeout(k){jobs.delete(k)}});
 return {audio:window.YanClassicAudio,speech,get current(){return active},cancelled,advance(ms){const end=now+ms;for(;;){const due=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;jobs.delete(due[0]);due[1].fn()}now=end}};
}
{
 const t=setup();let started=0,done=0;
 t.audio.speakTimed('口令',()=>done++,3900,()=>started++);
 t.advance(3000);assert.equal(started,0,'loading must not start green');
 t.current.start();assert.equal(started,1);
 t.advance(2400);t.current.finish('ended');assert.equal(done,0);
 t.advance(50);assert.equal(done,1,'minimum begins at playback, not request');
 t.advance(30000);assert.equal(done,1);
}
{
 const t=setup();let started=0,done=0;
 t.audio.speakTimed('口令',()=>done++,3900,()=>started++);
 t.current.finish('error');assert.equal(started,1);
 t.advance(3899);assert.equal(done,0);t.advance(1);assert.equal(done,1);
}
{
 const t=setup();let started=0,done=0;
 t.audio.speakTimed('口令',()=>done++,3900,()=>started++);
 t.advance(7999);assert.equal(started,0);t.advance(1);assert.equal(started,1);
 t.advance(3900);assert.equal(done,1,'hung loading has bounded silent fallback');
}
{
 const t=setup();let done=0;
 t.audio.speakTimed('舊口令',()=>done++);const old=t.current;
 t.audio.cancelTimed();t.speech.speak('新遊戲',()=>{});const newer=t.speech.id;
 old.start();old.finish('ended');t.advance(60000);
 assert.equal(done,0);assert.equal(t.speech.id,newer,'old timer cannot cancel new audio');
}
{
 const t=setup(false);let started=0,done=0;
 t.audio.speakTimed('靜音',()=>done++,3900,()=>started++);
 assert.equal(started,1);t.advance(3900);assert.equal(done,1);
}
console.log('Timed speech: delayed loading, playback minimum, error fallback, load timeout, cancellation and mute passed.');
