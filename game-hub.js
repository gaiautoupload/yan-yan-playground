(()=>{'use strict';
const sh=window.YanClassicShared;if(!sh)return;const {app,state,persist}=sh;
const groups=[["look","👀","觀察探索","看一看，找出目標",[["👂","聽聲找照片","聽故事認場景","YanPhotoQuiz"],["🔍","照片猜猜看","看局部找全圖","YanPhotoZoom"],["🧺","親子尋寶袋","找到指定物品","YanFamilyTreasure"],["🫧","泡泡抓抓樂","找目標戳泡泡","YanBubbleCatch"]]],["memory","🧠","記憶音樂","記住位置、順序、音高",[["🃏","親子翻翻樂","記住位置配成對","YanMemoryCards"],["📷","照片順序記憶","照順序點照片","YanPhotoSequence"],["🎵","音樂記憶","聽音高重複節奏","YanRhythmGame"]]],["action","🏃","動作反應","按住、放開、點擊、閃躲",[["🚦","123木頭人","紅燈停、綠燈走","YanClassics","wood"],["🐹","打地鼠","快速點出地鼠","YanClassics","mole"],["☄️","躲隕石","左右移動閃避","YanClassics","meteor"]]],["build","🚜","工程冒險","運貨、挖寶、鋪橋、修管",[["🚚","訂單配送","安排裝車，分趟送貨","YanDeliveryGame"],["💎","挖土機尋寶","挖格子找寶藏","YanDigGame"],["🌉","挖土機造橋","按順序鋪橋板","YanBridgeGame"],["💧","水管大救援","旋轉水管連水流","YanPipeGame"],["📦","推箱子工程","推動木箱到指定位置","YanPushBoxGame"]]],["logic","🧩","動腦益智","分類、數數、還原圖片",[["🎨","顏色分類","放入正確顏色籃","YanClassics","colorSort"],["🐰","動物園餵食","選出指定數量","YanFeedGame"],["🖼️","滑塊拼圖","移動方塊還原照片","YanSlidePuzzle"]]]];let active=null,index=0,relay=false,surprise=false,menuGroup=null;
groups.push(['play','🧸','一起玩','躲貓貓、照顧娃娃，自由玩', [['🙈','躲貓貓','看耳朵，找小動物','YanHideSeek'],['🧸','照顧娃娃','餵飯、洗澡、抱抱、睡覺','YanPretendPlay']]]);
// v356: one-tap favorites and last-played resume in the classic hub; uses existing unified save.
function entryFor(id,i){const g=groups.find(x=>x[0]===id);return g&&Number.isInteger(i)&&i>=0&&i<g[4].length?{id,i,item:g[4][i]}:null}
function favoriteEntries(){
 const raw=Array.isArray(state.yanHubFavorites)?state.yanHubFavorites:[];
 const seen=new Set(),out=[];
 for(const key of raw){if(typeof key!=='string'||seen.has(key))continue;const [id,num]=key.split(':');const entry=entryFor(id,Number(num));if(entry&&key===id+':'+entry.i){out.push(entry);seen.add(key)}if(out.length>=8)break}
 return out;
}
function lastPlayed(){const s=state.yanHubLastPlayed;return s&&entryFor(s.id,s.i)}
function toggleFavorite(id,i){
 const entry=entryFor(id,i);if(!entry)return false;
 const key=id+':'+i,old=favoriteEntries().map(x=>x.id+':'+x.i);
 state.yanHubFavorites=old.includes(key)?old.filter(x=>x!==key):[...old.slice(-7),key];
 persist();return state.yanHubFavorites.includes(key);
}

// v382: skip a hard relay game without scoring or resetting any saved game.
function skipRelay(){
 if(!relay||!active)return false;
 if(surprise)return pickSurprise();
 const g=groups.find(x=>x[0]===active);
 return !!g&&run(active,(index+1)%g[4].length,true,false);
}
function syncSkip(){
 const old=app.querySelector('#hub-relay-skip');
 const showSkip=relay&&active&&!app.querySelector('.classic-menu')&&!app.querySelector('.screen.home')&&!app.querySelector('.overlay .popup');
 if(!showSkip){if(old)old.remove();return;}
 if(old)return;
 const btn=document.createElement('button');
 btn.id='hub-relay-skip';btn.type='button';btn.className='hub-relay-skip';btn.textContent='🔄 換玩法';
 btn.setAttribute('aria-label','略過目前遊戲，保留進度並接力下一款');
 btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();skipRelay()});
 app.appendChild(btn);
}
function run(id,i,mixed,randomMode){
 const g=groups.find(x=>x[0]===id),item=g&&g[4][i],mod=item&&window[item[3]],fn=item&&(item[4]||'start');
 if(!mod||typeof mod[fn]!=='function')return false;
 window.YanSpeech?.cancel();menuGroup=id;active=id;index=i;relay=false;surprise=false;state.yanHubLast=state.yanHubLast||{};state.yanHubLast[id]=i;state.yanHubLastPlayed={id,i};persist();mod[fn]();syncSkip();return true;
}
// v331: cross-world relay has a distinct name from the existing passport surprise game; v330: cross-world surprise relay; skip the four most recently launched games.
// v387: one-tap independent random practice; no forced relay or score reset.
function pickPractice(groupId){
 const available=groups.filter(g=>!groupId||g[0]===groupId)
  .flatMap(g=>g[4].map((item,i)=>({id:g[0],i,key:g[0]+':'+i,item})))
  .filter(x=>{const m=window[x.item[3]];return m&&typeof m[x.item[4]||'start']==='function'});
 if(!available.length)return false;
 const recent=Array.isArray(state.yanHubPracticeRecent)?state.yanHubPracticeRecent.filter(x=>typeof x==='string').slice(-4):[];
 const last=state.yanHubLastPlayed,different=x=>!last||x.id!==last.id||x.i!==last.i;
 const fresh=available.filter(x=>!recent.includes(x.key)&&different(x)),alternate=available.filter(different);
 const pool=fresh.length?fresh:alternate.length?alternate:available;
 const choice=pool[Math.floor(Math.random()*pool.length)];
 if(!run(choice.id,choice.i,false,false))return false;
 state.yanHubPracticeRecent=[...recent,choice.key].slice(-4);persist();return true;
}
function pickSurprise(){
 const available=groups.flatMap(g=>g[4].map((item,i)=>({id:g[0],i,key:g[0]+':'+i,item})))
   .filter(x=>{const m=window[x.item[3]];return m&&typeof m[x.item[4]||'start']==='function'});
 if(!available.length)return false;
 const recent=Array.isArray(state.yanHubSurpriseRecent)?state.yanHubSurpriseRecent.filter(x=>typeof x==='string').slice(-4):[];
 const fresh=available.filter(x=>!recent.includes(x.key));
 const different=available.filter(x=>x.key!==recent[recent.length-1]);
 const pool=fresh.length?fresh:(different.length?different:available);
 const choice=pool[Math.floor(Math.random()*pool.length)];
 if(!run(choice.id,choice.i,true,true))return false;
 state.yanHubSurpriseRecent=[...recent,choice.key].slice(-4);
 persist();return true;
}
function show(id){
 const el=app.querySelector('#yan-hub');if(!el)return;
 const g=groups.find(x=>x[0]===id);menuGroup=g?g[0]:null;
 el.dataset.group=menuGroup||'';
 const menu=el.closest('.classic-menu');if(menu)menu.scrollTop=0;
 if(!g){
  const saved=lastPlayed();
  el.innerHTML='<div class="hub-head">選一款，慢慢玩<small>過關繼續同一款，想換再回來選</small></div>'+(saved?'<button class="hub-continue" data-continue="'+saved.id+':'+saved.i+'">▶ 繼續上次：'+saved.item[1]+'</button>':'')+'<div class="hub-cats">'+groups.map(x=>'<button class="hub-cat" data-g="'+x[0]+'"><span class="hub-category-icon">'+x[1]+'</span><b>'+x[2]+'</b><small>'+x[3]+'</small></button>').join('')+'</div>';return;
 }
 const preferred={play:['YanHideSeek','YanPretendPlay'],look:['YanPhotoQuiz','YanFamilyTreasure'],memory:['YanMemoryCards','YanRhythmGame'],action:['YanClassics'],build:['YanPushBoxGame','YanPipeGame','YanParkingGame','YanRailGame'],logic:['YanSlidePuzzle','YanFeedGame']};
 const card=(x,i)=>'<div class="hub-mode-wrap"><button class="hub-mode" data-p="'+id+':'+i+'"><span>'+x[0]+'</span><b>'+x[1]+'<small>'+x[2]+'</small></b><span class="hub-open" aria-hidden="true">›</span></button></div>';
 const primary=[],extra=[];
 g[4].forEach((x,i)=>{((preferred[id]||[]).includes(x[3])?primary:extra).push(card(x,i))});
 el.innerHTML='<div class="hub-head"><button data-back="1" class="hub-back" aria-label="返回遊戲分類">‹ 分類</button>'+g[1]+' '+g[2]+'</div><div class="hub-hint">'+g[3]+'</div><div class="hub-modes">'+primary.join('')+'</div>'+(extra.length?'<details class="hub-more"><summary>更多練習（'+extra.length+'）</summary><div class="hub-modes">'+extra.join('')+'</div></details>':'');
}
function enhance(){
 const m=app.querySelector('.classic-menu');if(!m||m.querySelector('#yan-hub'))return;
 active=null;relay=false;surprise=false; // Returning to menu ends relay; ordinary game launches stay ordinary.
 m.classList.add('allow-scroll','yan-unified');
 const el=document.createElement('section');el.id='yan-hub';m.insertBefore(el,m.querySelector('.classic-audio-controls'));
 el.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-g'))show(b.dataset.g);
 else if(b.hasAttribute('data-back'))show();
 else if(b.hasAttribute('data-surprise'))pickSurprise();
 else if(b.hasAttribute('data-practice'))pickPractice(b.dataset.practice||undefined);
 else if(b.hasAttribute('data-fav-toggle')){const [g,i]=b.dataset.favToggle.split(':');toggleFavorite(g,Number(i));show(g)}
 else if(b.hasAttribute('data-fav-remove')){const [g,i]=b.dataset.favRemove.split(':');toggleFavorite(g,Number(i));show()}
 else if(b.hasAttribute('data-fav-launch')){const [g,i]=b.dataset.favLaunch.split(':');run(g,Number(i),false)}
 else if(b.hasAttribute('data-continue')){const [g,i]=b.dataset.continue.split(':');run(g,Number(i),false)}
 else if(b.hasAttribute('data-p')){const [g,i]=b.dataset.p.split(':');run(g,Number(i),false)}
 else if(b.hasAttribute('data-r'))run(b.dataset.r,Number(b.dataset.n),true);
 });show(menuGroup);
}
function nextOnWin(){
 if(!relay||!active||app.querySelector('.classic-menu'))return;
 const popup=app.querySelector('.overlay .popup');if(!popup)return;
 const b=[...popup.querySelectorAll('button')].find(x=>/next/i.test(x.id)&&!/retry/i.test(x.id));
 if(surprise){
   if(!b){
     if(active==='action'&&index===2&&!popup.querySelector('#hub-surprise-next')){
       const go=document.createElement('button');go.id='hub-surprise-next';go.className='primary';go.textContent='🔄 接力下一款';
       go.onclick=()=>{if(surprise)pickSurprise()};popup.appendChild(go);
     }
     return;
   }
   if(b.dataset.hubSurprise)return;
   b.dataset.hubSurprise='1';b.textContent='🔄 接力下一款';
   b.addEventListener('click',e=>{if(!surprise)return;e.preventDefault();e.stopImmediatePropagation();pickSurprise()},true);
   return;
 }
 const g=groups.find(x=>x[0]===active);if(!g)return;
 const next=(index+1)%g[4].length;
 if(!b){ // Endless meteor dodge ends at five hits, so offer a relay transition at game over.
   if(active==='action'&&index===2&&!popup.querySelector('#hub-meteor-next')){
     const go=document.createElement('button');go.id='hub-meteor-next';go.className='primary';go.textContent='➡ 第'+(next+1)+'/'+g[4].length+'種：'+g[4][next][1];
     go.onclick=()=>run(active,next,true);popup.appendChild(go);
   }
   return;
 }
 if(b.dataset.hubRelay)return;
 b.dataset.hubRelay='1';b.textContent='➡ 第'+(next+1)+'/'+g[4].length+'種：'+g[4][next][1];
 b.addEventListener('click',e=>{if(!relay)return;e.preventDefault();e.stopImmediatePropagation();run(active,next,true)},true);
}
const observer=new MutationObserver(()=>{if(app.querySelector('.screen.home')){active=null;relay=false;surprise=false;}enhance();nextOnWin();syncSkip()});observer.observe(app,{childList:true,subtree:true});enhance();
window.YanGameHub={groups,run,show,pickSurprise,pickPractice,skipRelay,toggleFavorite,favoriteEntries,lastPlayed,session:()=>({active,index,relay,surprise})};
})();