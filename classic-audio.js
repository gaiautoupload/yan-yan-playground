(()=>{
'use strict';
// v16: WebAudio effects work independently of music and online TTS.
// First physical tap resumes the AudioContext (mobile autoplay policy).
const shared=window.YanClassicShared;
let ctx=null;
function enabled(){return shared.state.classicSound!==false}
function unlock(){
 if(!enabled())return false;
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return false;
  if(!ctx)ctx=new C();
  if(ctx.state==='suspended')ctx.resume()?.catch?.(()=>{});
  return true;
 }catch(e){return false}
}
function tone(f,delay,length=.14,vol=.065,type='sine'){
 if(!enabled()||!unlock())return false;
 try{
  const t=ctx.currentTime+delay;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(f,t);
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.exponentialRampToValueAtTime(vol,t+.015);
  gain.gain.exponentialRampToValueAtTime(.0001,t+length);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start(t);osc.stop(t+length+.03);return true;
 }catch(e){return false}
}
const cues={
 welcome:[[440,0,.11],[554,.13,.11],[659,.27,.2]],
 test:[[523,0,.11],[659,.13,.11],[784,.27,.22]],
 go:[[523,0,.10],[659,.12,.10],[784,.24,.23]],
 stop:[[440,0,.17,'triangle'],[220,.20,.27,'triangle']],
 step:[[170,0,.08,'triangle'],[250,.09,.065]],
 pop:[[460,0,.07],[710,.08,.12]],
 hit:[[650,0,.075],[880,.09,.10],[1050,.20,.15]],
 wrong:[[330,0,.14,'triangle'],[235,.16,.2,'triangle']],
 tick:[[880,0,.065,'square']],
 win:[[523,0,.12],[659,.14,.12],[784,.28,.12],[1046,.43,.33]],
 lose:[[420,0,.18],[330,.20,.18],[240,.42,.25]]
};
function play(kind){
 if(!enabled())return false;
 const notes=cues[kind]||cues.test;
 let success=false;
 for(const [frequency,delay,len,shape] of notes){
  success=tone(frequency,delay,len,kind==='tick'?.022:kind==='step'?.038:.085,shape||'sine')||success;
 }
 return success;
}

function canSpeak(){return !!(window.speechSynthesis&&typeof SpeechSynthesisUtterance==='function')}
// v18: synchronize red light with the actual end of the spoken chant.
// Timed fallback prevents the game freezing on devices without Chinese TTS.
function speakTimed(message,onFinish,fallbackMs=4000){
 const maximum=Math.max(2200,Number(fallbackMs)||4000),minimum=Math.min(2450,maximum-250);
 const began=Date.now();let finished=false,minTimer=null;
 let timeout=null;
 function finish(){
  if(finished)return;
  const wait=minimum-(Date.now()-began);
  if(wait>0){if(minTimer===null)minTimer=setTimeout(()=>{minTimer=null;finish()},wait);return}
  finished=true;clearTimeout(timeout);if(minTimer!==null)clearTimeout(minTimer);
  if(typeof onFinish==='function')onFinish();
 }
 timeout=setTimeout(finish,maximum);
 let spoken=false;
 if(shared.state.voice!==false&&canSpeak()){
  try{
   const synth=window.speechSynthesis;
   synth.cancel();
   const utterance=new SpeechSynthesisUtterance(String(message));
   utterance.lang='zh-TW';utterance.rate=.78;utterance.pitch=1.08;utterance.volume=1;
   const voices=synth.getVoices?.()||[];
   const preferred=voices.find(v=>/^zh[-_]TW$/i.test(v.lang))||voices.find(v=>/^zh[-_]/i.test(v.lang))||voices.find(v=>/^zh$/i.test(v.lang));
   if(preferred)utterance.voice=preferred;
   utterance.onend=finish;
   // Mobile engines may omit onend; fallback clock advances the round.
   utterance.onerror=()=>{};
   synth.speak(utterance);if(synth.paused)synth.resume();
   spoken=true;
  }catch(_){}
 }
 return {spoken,cancel(){finished=true;clearTimeout(timeout);if(minTimer!==null)clearTimeout(minTimer)}};
}
function voice(s){return shared.state.voice===false?false:shared.say(s)}
function test(){return {effect:play('test'),voice:voice('彥彥，聽到了嗎？媽媽陪你一起玩！')}}
window.YanClassicAudio={unlock,play,voice,test,enabled,canSpeak,speakTimed};
})();