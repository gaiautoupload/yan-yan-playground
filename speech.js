(()=>{'use strict';
const audio=new Audio();audio.preload='auto';
audio.id='yan-speech-player';audio.hidden=true;document.body.appendChild(audio);
let generation=0,owner=null,pending=false,playing=false;
function cancel(){generation++;pending=false;playing=false;audio.onended=null;audio.onerror=null;audio.onplaying=null;audio.pause();audio.removeAttribute('src');audio.load()}
function speak(message,onFinish){
 cancel();
 const text=String(message||'').trim();
 if(!text||window.YanClassicShared?.state.voice===false)return false;
 const token=generation;owner=document.querySelector('#app > .screen');pending=true;
 let finished=false;
 const finish=()=>{if(token!==generation||finished)return;finished=true;pending=false;playing=false;if(typeof onFinish==='function')onFinish()};
 audio.onplaying=()=>{if(token===generation){pending=false;playing=true}};
 audio.onended=finish;
 audio.onerror=()=>{finish();showRetry()};
 audio.src='/api/speech?text='+encodeURIComponent(text.slice(0,240));
 audio.play().catch(()=>{if(token===generation){finish();showRetry()}});
 return true;
}
function showRetry(){
 const button=document.querySelector('[id$="-speak"],#speak');
 if(button){button.title='語音暫時無法播放，點一下重試';button.setAttribute('aria-label','重播語音，若無聲請再試一次')}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});
document.addEventListener('click',()=>{if(window.YanClassicShared?.state.voice===false)cancel()});
new MutationObserver(()=>{if(owner&&owner!==document.querySelector('#app > .screen'))cancel()}).observe(document.getElementById('app'),{childList:true});
window.YanSpeech={speak,cancel,get speaking(){return playing},get pending(){return pending},voice:'zh-TW-HsiaoChenNeural'};
})();
