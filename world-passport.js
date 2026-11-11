(()=>{'use strict';
// v312: One-tap next unplayed challenge after winning. Tap-to-play stamps preserve recognizable icons and completion badges. Five-world adventure passport. No changes to old game progress or photos.
const sh=window.YanClassicShared,hub=window.YanGameHub;if(!sh||!hub)return;
const {app,state,persist}=sh,groups=hub.groups;
const validGroup=id=>groups.find(g=>g[0]===id);
function clean(id){
 const g=validGroup(id);if(!g)return [];
 const raw=state.yanWorldPassport&&state.yanWorldPassport[id];
 return [...new Set((Array.isArray(raw)?raw:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<g[4].length))].sort((a,b)=>a-b);
}
function progress(id){const g=validGroup(id);return g?{done:clean(id).length,total:g[4].length,medal:clean(id).length===g[4].length}:{done:0,total:0,medal:false}}
function summary(){const counts=groups.map(g=>progress(g[0]));return{done:counts.reduce((n,p)=>n+p.done,0),total:counts.reduce((n,p)=>n+p.total,0),medals:counts.filter(p=>p.medal).length}}
function nextUnplayed(id,from=-1){
 const g=validGroup(id);if(!g)return -1;
 const got=clean(id),len=g[4].length;
 for(let k=1;k<=len;k++){const i=(from+k+len)%len;if(!got.includes(i))return i}
 return (from+1+len)%len;
}
// v315: observer-safe one-tap surprise from the five-world hub, preferring uncollected passport games.
function pickSurprise(rng=Math.random){
 const missing=[],all=[];
 for(const g of groups){
  const done=new Set(clean(g[0]));
  g[4].forEach((item,index)=>{const entry={id:g[0],index,name:item[1]};all.push(entry);if(!done.has(index))missing.push(entry)});
 }
 const pool=missing.length?missing:all;
 if(!pool.length)return null;
 const n=Number(rng());
 return pool[Math.min(pool.length-1,Math.max(0,Math.floor((Number.isFinite(n)?n:0)*pool.length)))];
}
function record(id,i){
 const g=validGroup(id);if(!g||!Number.isInteger(i)||i<0||i>=g[4].length)return false;
 const old=clean(id);if(old.includes(i))return false;
 state.yanWorldPassport=state.yanWorldPassport&&typeof state.yanWorldPassport==='object'&&!Array.isArray(state.yanWorldPassport)?state.yanWorldPassport:{};
 state.yanWorldPassport[id]=[...old,i].sort((a,b)=>a-b);persist();return true;
}
function isVictory(overlay,group,index){
 if(!overlay||!validGroup(group))return false;
 if(overlay.querySelector('[id$="-next"], #classic-next'))return true;
 // Meteor dodge is survival, not a conventional victory. Ten dodges earns the stamp.
 if(group==='action'&&index===2&&overlay.classList.contains('meteor-over')){
  const m=(overlay.textContent||'').match(/躲開\s*(\d+)\s*顆/);return !!m&&Number(m[1])>=10;
 }
 return false;
}
function decorateWin(){
 const s=hub.session();if(!s||!s.active||app.querySelector('.classic-menu'))return;
 const overlay=app.querySelector('.overlay');if(!overlay||!overlay.querySelector('.popup')||overlay.dataset.passportChecked)return;
 if(!isVictory(overlay,s.active,s.index))return;
 overlay.dataset.passportChecked='1';
 const fresh=record(s.active,s.index),p=progress(s.active);
 const popup=overlay.querySelector('.popup');if(!popup||popup.querySelector('.passport-win'))return;
 const stamp=document.createElement('div');stamp.className='passport-win';stamp.setAttribute('role','status');
 stamp.textContent=p.medal?'🏅 世界護照集滿！ '+p.done+'/'+p.total:(fresh?'📒 收到新印章！ ':'📒 已收集的印章 ')+p.done+'/'+p.total;
 const heading=popup.querySelector('h2');if(heading)heading.insertAdjacentElement('afterend',stamp);else popup.prepend(stamp);
 // v312: one tap from a completed challenge to the next uncollected game in the same world.
 const next=nextUnplayed(s.active,s.index),g=validGroup(s.active),item=g&&g[4][next];
 if(item){
  const go=document.createElement('button');go.type='button';go.className='passport-next-play';
  go.textContent=(p.medal?'🎉 再玩：':'🎯 下一個新遊戲：')+item[1];
  go.setAttribute('aria-label','開始'+item[1]);
  go.addEventListener('click',()=>{go.disabled=true;if(!hub.run(s.active,next,true)){go.disabled=false;go.textContent='🔄 請再試一次';}});
  popup.appendChild(go);
 }
}
function decorateHub(){
 const el=app.querySelector('#yan-hub');if(!el)return;
 const cards=el.querySelectorAll('.hub-cat');
 if(cards.length){
  const s=summary(),head=el.querySelector('.hub-head');
  if(head&&!head.querySelector('.passport-total')){const info=document.createElement('small');info.className='passport-total';info.textContent='📒 冒險護照 '+s.done+'/'+s.total+'　🏅 '+s.medals+'/5';head.appendChild(info)}
  cards.forEach(card=>{
   const id=card.dataset.g,p=progress(id);
   if(!p.total||card.querySelector('.passport-count'))return;
   const badge=document.createElement('span');badge.className='passport-count';badge.textContent=(p.medal?'🏅 ':'📒 ')+p.done+'/'+p.total;card.appendChild(badge);
  });
  // Visible above the five world cards; no new save keys or replacement of existing entries.
  let go=el.querySelector('.passport-surprise');
  if(!go){
   go=document.createElement('button');go.type='button';go.className='passport-surprise';
   go.addEventListener('click',()=>{
    const choice=pickSurprise();if(!choice)return;
    go.disabled=true;
    if(!hub.run(choice.id,choice.index,false)){go.disabled=false;go.textContent='🔄 請再試一次'}
   });
   if(head)head.insertAdjacentElement('afterend',go);else el.prepend(go);
  }
  // Recompute after stamps change without forcing a menu reload.
  if(!go.disabled){
   const label=s.done===s.total?'🎉 全收集！再玩驚喜關':'🎲 驚喜闖關｜'+(s.total-s.done)+' 種新玩法';
   const aria='隨機開始一個'+(s.done===s.total?'已完成':'尚未集章')+'的遊戲';
   // MutationObserver watches childList; assigning unchanged textContent loops forever.
   if(go.textContent!==label)go.textContent=label;
   if(go.getAttribute('aria-label')!==aria)go.setAttribute('aria-label',aria);
  }
  return;
 }
 const relay=el.querySelector('.hub-relay');if(!relay||el.querySelector('.passport-progress'))return;
 const id=relay.dataset.r,p=progress(id),g=validGroup(id);if(!g)return;
 const panel=document.createElement('section');panel.className='passport-progress';panel.setAttribute('aria-label','世界護照進度');
 panel.innerHTML='<div class="passport-title">'+(p.medal?'🏅 世界全收集！':'📒 收集不同玩法的印章')+'　'+p.done+'/'+p.total+'<small class="passport-tap-hint">👆 點印章直接玩</small></div><div class="passport-stamps">'+g[4].map((item,i)=>'<button type="button" class="passport-stamp '+(clean(id).includes(i)?'earned':'')+'" data-p="'+id+':'+i+'" aria-label="開始'+item[1]+'，'+(clean(id).includes(i)?'已完成':'未完成')+'">'+item[0]+'</button>').join('')+'</div>';
 const btn=document.createElement('button');btn.className='passport-challenge';btn.type='button';btn.textContent=p.medal?'🎉 再玩一種不同挑戰':'🎯 挑戰還沒收集的玩法';
 btn.addEventListener('click',()=>{const s=hub.session(),from=s&&s.active===id?s.index:(Number(state.yanHubLast&&state.yanHubLast[id])||-1);hub.run(id,nextUnplayed(id,from),true)});
 panel.appendChild(btn);relay.insertAdjacentElement('afterend',panel);
 el.querySelectorAll('.hub-mode').forEach(b=>{const a=(b.dataset.p||'').split(':');if(a[0]===id&&clean(id).includes(Number(a[1]))){b.classList.add('passport-earned');const mark=document.createElement('span');mark.className='passport-mark';mark.textContent='✓';b.appendChild(mark)}});
}
const observer=new MutationObserver(()=>{decorateWin();decorateHub()});observer.observe(app,{childList:true,subtree:true});decorateHub();
window.YanWorldPassport={progress,summary,nextUnplayed,pickSurprise,record,isVictory,decorateWin,decorateHub};
})();