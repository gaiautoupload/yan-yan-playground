(()=>{
'use strict';
// v303: one-use emergency shield gift, checkpoint-safe and touch accessible.
// v211: auto-pause and save when app goes to background; resume only on an explicit tap.
// v210: double-tap the sky to jump, alongside upward swipe and the jump button.
// v185: upward field swipe jumps with the original cooldown and checkpoint rules.
// v135: single active pointer for field/steering; prevents multi-touch teleport and stuck direction; retains v94 radar, v93 jump and checkpoints.
const {app,state,persist,say,vib,bg}=window.YanClassicShared;
const audio=window.YanClassicAudio;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let raf=0,token=0,playing=false,over=false,paused=false,hits=0,dodged=0,position=50,direction=0,invulnerable=0,spawnIn=.5,lastFrame=0,shield=0,streak=0,wave=1,nextShieldAt=14;
let rocks=[],pickups=[],field,kid,hearts,score,record,waveText,shieldText,comboText,pauseButton,speedButton,checkpointClock=0,jumpTime=0,jumpCooldown=0,jumpButton,radarButton;
let dragPointerId=null,steerPointerId=null,swipeStart=null,fieldTapStart=null,lastFieldTap=null,assistButton=null,healButton=null,healUsed=false,shieldGiftButton=null,shieldGiftUsed=false;
const best=()=>Math.max(0,Number(state.meteorBest)||0);
function saveRecord(){if(dodged>best()){state.meteorBest=dodged;persist()}}
const practice=()=>state.meteorPractice===true;
const radarEnabled=()=>state.meteorRadar!==false;
function forecastLanding(r,targetY,pace){
 const seconds=(targetY-r.y)/(r.speed*pace);
 return {seconds,x:clamp(r.x+r.drift*pace*seconds,5,95)};
}
function radarLabel(){
 if(!radarButton)return;
 radarButton.textContent=radarEnabled()?'🔮 預警開':'🔮 預警關';
 radarButton.setAttribute('aria-pressed',String(radarEnabled()));
 field.classList.toggle('meteor-radar-off',!radarEnabled());
}

/* v250: one-tap parental dodge aid, with persistent 12-second cooldown. */
function assistLabel(){
 if(!assistButton)return;
 const until=Math.max(0,Number(state.meteorAssistReadyAt)||0);
 const seconds=Math.max(0,Math.ceil((until-Date.now())/1000));
 const label=seconds?'⏳ '+seconds+'秒':'👩 幫我躲';
 if(assistButton.textContent!==label)assistButton.textContent=label;
 assistButton.disabled=!playing||paused||over||seconds>0;
 assistButton.setAttribute('aria-label',seconds?'媽媽幫躲還要等'+seconds+'秒':'媽媽幫彥彥躲開隕石');
}
function assistDodge(){
 if(!playing||paused||over||Date.now()<Math.max(0,Number(state.meteorAssistReadyAt)||0))return false;
 const box=field.getBoundingClientRect(),child=kid.getBoundingClientRect();
 if(!box.width||!box.height)return false;
 const targetY=(child.top+child.height/2-box.top)/box.height*100;
 const pace=practice()?.64:1;
 const threats=rocks.map(r=>({...forecastLanding(r,targetY,pace),radius:r.size*.27})).filter(t=>t.seconds>=0&&t.seconds<=2.7);
 if(!threats.length||!threats.some(t=>Math.abs(t.x-position)<17+t.radius/3)){
  audio.play('tap');say('現在很安全！等隕石靠近再請媽媽幫忙。');return false;
 }
 const lanes=[8,20,32,44,56,68,80,92];
 let dest=position,best=-Infinity;
 for(const x of lanes){
  const clearance=Math.min(...threats.map(t=>Math.abs(x-t.x)-t.radius/3));
  const rating=clearance-Math.abs(x-position)*.12;
  if(rating>best){best=rating;dest=x}
 }
 if(Math.abs(dest-position)<3){say('現在的位置最安全，繼續躲喔！');return false}
 position=dest;updateKid();
 state.meteorAssistReadyAt=Date.now()+12000;persist();saveCheckpoint();assistLabel();
 audio.play('yay');vib([15,20,15]);pop('👩✨',position,70);say('媽媽幫彥彥躲開了！');
 return true;
}
/* v251: a once-per-run mom hug restores one heart, saved in the meteor checkpoint. */
function healLabel(){
 if(!healButton)return;
 healButton.textContent=healUsed?'💗 已抱抱':hits===0?'💗 滿血':'💗 媽媽抱抱';
 healButton.disabled=!playing||paused||over||healUsed||hits===0;
 healButton.setAttribute('aria-label',healUsed?'這一局已經抱抱過':hits===0?'愛心已滿':'媽媽抱抱，恢復一顆愛心（每局一次）');
}
function shieldGiftLabel(){
 if(!shieldGiftButton)return;
 shieldGiftButton.textContent=shieldGiftUsed?"🛡️ 已送盾牌":shield>=2?"🛡️ 盾牌已滿":"🛡️ 媽媽護盾";
 shieldGiftButton.disabled=!playing||paused||over||shieldGiftUsed||shield>=2;
 shieldGiftButton.setAttribute("aria-label",shieldGiftUsed?"這一局已經送過盾牌":shield>=2?"盾牌已滿":"媽媽送一個護盾，每局一次");
}
function shieldGift(){
 if(!playing||paused||over||shieldGiftUsed||shield>=2)return false;
 shield++;shieldGiftUsed=true;stats();saveCheckpoint();audio.play("yay");vib([12,18,12]);pop("🛡️ +1",position,65);
 say("媽媽送彥彥一個護盾！這一局只能領一次喔！");return true;
}
function heal(){
 if(!playing||paused||over||healUsed||hits<=0)return false;
 hits--;healUsed=true;invulnerable=Math.max(invulnerable,1.2);
 stats();saveCheckpoint();audio.play('yay');vib([18,30,18]);pop('💗 +1',position,68);
 say('媽媽抱抱！恢復一顆愛心，這一局只能使用一次喔！');return true;
}
function validCheckpoint(s){
 const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 const int=(v,min,max)=>num(v,min,max)&&Number.isInteger(v);
 if(!s||(s.v!==1&&s.v!==2&&s.v!==3&&s.v!==4)||!int(s.hits,0,4)||!int(s.dodged,0,100000)||!num(s.position,8,92)||!int(s.shield,0,2)||!int(s.streak,0,s.dodged)||!int(s.wave,1,6)||!num(s.spawnIn,-.5,2)||!int(s.nextShieldAt,14,100014)||!num(s.invulnerable,0,1)||!Array.isArray(s.rocks)||s.rocks.length>6||!Array.isArray(s.pickups)||s.pickups.length>1)return null;
 if(s.v>=2&&(!num(s.jumpTime,0,.85)||!num(s.jumpCooldown,0,9)))return null;
 if(s.v>=3&&typeof s.healUsed!=='boolean')return null;
 if(s.v===4&&typeof s.shieldGiftUsed!=='boolean')return null;
 if(s.wave!==1+Math.min(5,Math.floor(s.dodged/12)))return null;
 if(s.rocks.some(r=>!r||!num(r.x,5,95)||!num(r.y,-15,200)||!num(r.size,25,70)||!num(r.speed,15,100)||!num(r.drift,-3,3)))return null;
 if(s.pickups.some(p=>!p||!num(p.x,8,92)||!num(p.y,-15,200)||!num(p.speed,10,40)))return null;
 return {...s,jumpTime:s.v>=2?s.jumpTime:0,jumpCooldown:s.v>=2?s.jumpCooldown:0,healUsed:s.v>=3?s.healUsed:false,shieldGiftUsed:s.v===4?s.shieldGiftUsed:false};
}
function saveCheckpoint(){
 if(!playing||over)return;
 state.meteorSession={v:4,hits,dodged,position,shield,streak,wave,spawnIn,nextShieldAt,invulnerable,jumpTime,jumpCooldown,healUsed,shieldGiftUsed,
  rocks:rocks.map(({x,y,size,speed,drift})=>({x,y,size,speed,drift})),
  pickups:pickups.map(({x,y,speed})=>({x,y,speed}))};
 persist();
}
function clearCheckpoint(){if(state.meteorSession){state.meteorSession=null;persist()}}
function practiceLabel(){
 if(!speedButton)return;
 speedButton.textContent=practice()?'🐇 正常':'🐢 慢速';
 speedButton.setAttribute('aria-pressed',String(practice()));
}
function stop(){
 token++;playing=false;paused=false;direction=0;dragPointerId=null;steerPointerId=null;swipeStart=null;fieldTapStart=null;lastFieldTap=null;
 if(raf)cancelAnimationFrame(raf);raf=0;
 rocks.forEach(r=>{r.el.remove();r.warning?.remove()});rocks=[];
 pickups.forEach(p=>p.el.remove());pickups=[];
}
function collision(ax,ay,ar,bx,by,br){return (ax-bx)**2+(ay-by)**2<=(ar+br)**2}
function stats(){
 if(!hearts)return;
 hearts.textContent='❤️'.repeat(Math.max(0,5-hits))+'🖤'.repeat(hits);
 score.textContent='⭐ '+dodged;record.textContent='🏆 '+best();
 waveText.textContent='🌠 第'+wave+'波';
 shieldText.textContent='🛡️ '+shield;
 comboText.textContent='✨ '+streak;healLabel();shieldGiftLabel();
}
function updateKid(){kid.style.left=position+'%'}
function updateJump(){
 if(!jumpButton)return;
 const ready=jumpCooldown<=0;
 jumpButton.disabled=!playing||paused||over||!ready;
 jumpButton.textContent=ready?'🦘 跳一下':'⏳ '+Math.ceil(jumpCooldown)+'秒';
 jumpButton.setAttribute('aria-label',ready?'跳一下閃開隕石':'跳躍冷卻中');
 if(kid)kid.classList.toggle('meteor-jump',jumpTime>0);
}
function jump(){
 if(!playing||paused||over||jumpCooldown>0)return false;
 jumpTime=.85;jumpCooldown=9;
 updateJump();audio.play('yay');vib([15,15,15]);pop('🦘 跳！',position,72);
 saveCheckpoint();return true;
}
function moveTo(clientX){
 const b=field.getBoundingClientRect();if(!b.width)return;
 position=clamp((clientX-b.left)/b.width*100,8,92);updateKid();
}
function pop(text,x,y){
 const el=document.createElement('span');el.className='meteor-fx';el.textContent=text;
 el.style.left=x+'%';el.style.top=y+'%';field.appendChild(el);
 setTimeout(()=>el.remove(),850);
}
function createRock(rock){
 const {x,y,size}=rock,el=document.createElement('span');rock.el=el;
 el.className='meteor-falling '+(size>55?'meteor-large':size<37?'meteor-small':'meteor-medium');
 el.innerHTML='<span class="meteor-trail"></span><span class="meteor-core">'+(size>55?'🔥':size<37?'🪨':'☄️')+'</span>';
 el.style.fontSize=size+'px';el.style.left=x+'%';el.style.top=y+'%';
 const warning=document.createElement('span');warning.className='meteor-impact';warning.setAttribute('aria-hidden','true');
 rock.warning=warning;field.appendChild(warning);field.appendChild(el);rocks.push(rock);
}
function createPickup(p){
 const el=document.createElement('span');p.el=el;
 el.className='meteor-pickup';el.textContent='🛡️';
 el.style.left=p.x+'%';el.style.top=p.y+'%';field.appendChild(el);pickups.push(p);
}
function spawn(){
 if(rocks.length>=Math.min(6,3+Math.floor(wave/2)))return;
 let x=8+Math.random()*84;
 for(let i=0;i<6;i++){
  if(!rocks.some(r=>r.y<23&&Math.abs(r.x-x)<17))break;
  x=8+Math.random()*84;
 }
 const kind=Math.random(),size=kind<.23?58+Math.random()*8:kind<.68?39+Math.random()*11:27+Math.random()*8;
 createRock({x,y:-11,size,speed:19+wave*2.8+Math.random()*10,drift:(Math.random()-.5)*3.8});
}
function spawnShield(){
 const x=clamp(position+(Math.random()-.5)*35,13,87);
 createPickup({x,y:-8,speed:25});
}
function lose(){
 if(over)return;
 over=true;playing=false;healLabel();shieldGiftLabel();clearCheckpoint();saveRecord();audio.play('lose');vib([50,25,60]);
 say('哎呀！彥彥被隕石打到五次了！這次閃開了'+dodged+'顆隕石，再來挑戰！');
 const panel=document.createElement('div');panel.className='overlay meteor-over';
 panel.innerHTML='<div class="popup"><div class="faces"><img src="./assets/mom.webp" alt="媽媽"><img src="./assets/kid.webp" alt="彥彥"></div><div class="stars">☄️ ⭐ ☄️</div><h2>❤️ × 0　挑戰結束</h2><p>⭐ 躲開 '+dodged+' 顆｜🌠 第'+wave+'波</p><p>🏆 最佳 '+best()+'</p><button class="primary" id="meteor-again">🔄 再玩一次</button><button class="classic-secondary" id="meteor-return">🎲 返回經典遊戲</button></div>';
 app.querySelector('.screen').appendChild(panel);
 panel.querySelector('#meteor-again').onclick=()=>start(true);
 panel.querySelector('#meteor-return').onclick=goBack;
}
function tick(time,current){
 if(current!==token||!playing||over)return;
 if(!lastFrame)lastFrame=time;
 const dt=clamp((time-lastFrame)/1000,0,.05);lastFrame=time;assistLabel();
 if(!document.hidden&&!paused){
  jumpTime=Math.max(0,jumpTime-dt);jumpCooldown=Math.max(0,jumpCooldown-dt);updateJump();
  if(direction){position=clamp(position+direction*dt*90,8,92);updateKid()}
  const pace=practice()?.64:1;
  spawnIn-=dt*pace;
  if(spawnIn<=0){spawn();spawnIn=Math.max(.58,1.3-(wave-1)*.075)*(.88+Math.random()*.25)}
  invulnerable=Math.max(0,invulnerable-dt);
  const box=field.getBoundingClientRect(),w=Math.max(1,box.width),h=Math.max(1,box.height);
  const child=kid.getBoundingClientRect(),cx=child.left+child.width/2-box.left,cy=child.top+child.height/2-box.top;
  const childRadius=Math.min(child.width,child.height)*.32;
  for(const r of [...rocks]){
   r.y+=r.speed*dt*pace;r.x=clamp(r.x+r.drift*dt*pace,5,95);
   r.el.style.top=r.y+'%';r.el.style.left=r.x+'%';
   const landing=forecastLanding(r,cy/h*100,pace);
   const show=radarEnabled()&&landing.seconds>=0&&landing.seconds<=2.8;
   r.warning.classList.toggle('meteor-impact-active',show);
   r.warning.classList.toggle('meteor-impact-urgent',show&&landing.seconds<1);
   if(show){r.warning.style.left=landing.x+'%';r.warning.style.top=cy+'px';r.warning.style.width=Math.round(r.size*.55+childRadius*2)+'px'}
   const rx=r.x/100*w,ry=r.y/100*h;
   if(invulnerable===0&&jumpTime===0&&collision(rx,ry,r.size*.27,cx,cy,childRadius)){
    rocks.splice(rocks.indexOf(r),1);r.el.remove();r.warning.remove();invulnerable=.9;
    if(shield>0){shield--;audio.play('hit');vib(15);pop('🛡️✨',r.x,r.y)}
    else{
     hits++;streak=0;vib([40,30,40]);audio.play('wrong');pop('💥',r.x,r.y);
     kid.classList.remove('meteor-hit');void kid.offsetWidth;kid.classList.add('meteor-hit');
    }
    stats();if(hits>=5){lose();break}
   }else if(ry>h+r.size){
    rocks.splice(rocks.indexOf(r),1);r.el.remove();r.warning.remove();dodged++;streak++;saveRecord();
    const nextWave=1+Math.min(5,Math.floor(dodged/12));
    if(nextWave!==wave){wave=nextWave;pop('🌟 第'+wave+'波！',50,24);audio.play('yay');say('彥彥太厲害了！進入第'+wave+'波！')}
    if(dodged>=nextShieldAt){nextShieldAt+=14;if(shield<2&&pickups.length===0)spawnShield()}
    stats();if(dodged%10===0){audio.play('hit');vib(12)}
   }
  }
  for(const p of [...pickups]){
   p.y+=p.speed*dt;p.el.style.top=p.y+'%';
   const px=p.x/100*w,py=p.y/100*h;
   if(collision(px,py,20,cx,cy,childRadius)){
    pickups.splice(pickups.indexOf(p),1);p.el.remove();shield=Math.min(2,shield+1);
    audio.play('yay');vib([18,30,18]);pop('🛡️ +1',p.x,p.y);stats();
   }else if(py>h+40){pickups.splice(pickups.indexOf(p),1);p.el.remove()}
  }
  checkpointClock+=dt;
  if(checkpointClock>=1){checkpointClock=0;saveCheckpoint()}
 }
 if(current===token&&playing&&!over)raf=requestAnimationFrame(t=>tick(t,current));
}
function goBack(){saveCheckpoint();stop();window.YanClassics.menu()}
function begin(){
 if(playing||over)return;
 app.querySelector('#meteor-intro')?.remove();
 playing=true;lastFrame=0;updateJump();assistLabel();healLabel();shieldGiftLabel();audio.unlock();audio.play('go');
 say('隕石來了！左右移動彥彥躲開隕石，在天空向上滑或輕點兩下都能跳一下！跳完要等九秒。');
 const current=token;raf=requestAnimationFrame(t=>tick(t,current));
}
function togglePause(reason='manual'){
 if(!playing||over)return;
 paused=!paused;direction=0;dragPointerId=null;steerPointerId=null;swipeStart=null;fieldTapStart=null;lastFieldTap=null;lastFrame=0;if(paused)saveCheckpoint();updateJump();assistLabel();healLabel();shieldGiftLabel();
 pauseButton.textContent=paused?'▶️':'⏸️';
 pauseButton.setAttribute('aria-label',paused?'繼續玩躲隕石':'暫停躲隕石');
 const old=app.querySelector('#meteor-pause-layer');if(old)old.remove();
 if(paused){
  const panel=document.createElement('div');panel.id='meteor-pause-layer';panel.className='meteor-pause-layer';
  panel.innerHTML='<strong>⏸️ '+(reason==='background'?'已幫你暫停':'休息一下')+'</strong><span>'+(reason==='background'?'回到遊戲後，按繼續才會動喔！':'媽媽和彥彥等你喔！')+'</span><button class="primary" id="meteor-resume">▶️ 繼續玩</button>';
  field.appendChild(panel);panel.querySelector('#meteor-resume').onclick=()=>togglePause();
 }
}
function start(fresh=false){
 const previous=fresh?null:validCheckpoint(state.meteorSession);
 if(fresh)clearCheckpoint();
 stop();over=false;hits=0;dodged=0;position=50;invulnerable=0;spawnIn=.65;lastFrame=0;shield=0;streak=0;wave=1;nextShieldAt=14;checkpointClock=0;jumpTime=0;jumpCooldown=0;healUsed=false;shieldGiftUsed=false;
 if(previous){
  ({hits,dodged,position,shield,streak,wave,spawnIn,nextShieldAt,invulnerable,jumpTime,jumpCooldown,healUsed,shieldGiftUsed}=previous);
 }
 app.innerHTML='<section class="screen game classic-screen meteor-screen">'+bg('play')+
 '<header class="bar topbar meteor-top"><button class="iconbtn" id="meteor-back" aria-label="返回經典遊戲">⌂</button><span class="chip">☄️ 躲隕石</span><span class="chip" id="meteor-hearts">❤️❤️❤️❤️❤️</span><button class="iconbtn" id="meteor-voice" aria-label="聽玩法">🔊</button></header>'+
 '<main class="meteor-game"><div class="meteor-stats"><strong id="meteor-score">⭐ 0</strong><span id="meteor-wave">🌠 第1波</span><strong id="meteor-best">🏆 '+best()+'</strong></div>'+
 '<div class="meteor-field" id="meteor-field" aria-label="左右拖曳彥彥躲隕石"><div class="meteor-stars"></div><div class="meteor-planet"></div><div class="meteor-ground"></div>'+
 '<div class="meteor-badges"><span id="meteor-shield">🛡️ 0</span><span id="meteor-combo">✨ 0</span></div>'+ 
 '<span class="meteor-swipe-hint" aria-hidden="true">⬆️ 上滑／點兩下跳</span>'+ 
 '<button id="meteor-radar" type="button" aria-label="切換隕石落點預警" aria-pressed="true">🔮 預警開</button>'+
 '<button id="meteor-assist" type="button" aria-label="媽媽幫彥彥躲開隕石">👩 幫我躲</button>'+
  '<button id="meteor-heal" type="button" aria-label="媽媽抱抱，恢復一顆愛心">💗 媽媽抱抱</button>'+
 '<button id="meteor-shield-gift" type="button" aria-label="媽媽送一個護盾，每局一次">🛡️ 媽媽護盾</button>'+
 '<button id="meteor-pause" aria-label="暫停遊戲">⏸️</button>'+
 '<div class="meteor-kid" id="meteor-kid"><img src="./assets/kid.webp" alt="彥彥"></div></div>'+
 '<div class="meteor-controls"><button id="meteor-left" aria-label="向左">⬅️</button><button id="meteor-speed" aria-label="切換慢速練習">🐢 慢速</button><button id="meteor-jump" aria-label="跳一下閃開隕石">🦘 跳一下</button><button id="meteor-right" aria-label="向右">➡️</button></div></main>'+
 '<div class="meteor-intro" id="meteor-intro"><div class="meteor-panel"><div class="meteor-symbols">☄️🛡️🚀</div><h2>'+(previous?'歡迎回來！':'躲開隕石！')+'</h2><p>'+(previous?'⭐ 已躲 '+dodged+' 顆　❤️ 剩 '+(5-hits)+' 顆':'⬅️ 👦 ➡️')+'</p><p>⬆️ 上滑或點天空兩下，就能跳起來！</p><p>🛡️ 擋一下　❤️×5</p><button class="primary" id="meteor-begin">'+(previous?'▶️ 接著玩':'▶️ 開始遊戲')+'</button>'+(previous?'<button class="classic-secondary" id="meteor-new">🔄 重新挑戰</button>':'')+'<button class="classic-secondary" id="meteor-cancel">⌂ 返回</button></div></div></section>';
 field=app.querySelector('#meteor-field');kid=app.querySelector('#meteor-kid');hearts=app.querySelector('#meteor-hearts');score=app.querySelector('#meteor-score');record=app.querySelector('#meteor-best');
 waveText=app.querySelector('#meteor-wave');shieldText=app.querySelector('#meteor-shield');comboText=app.querySelector('#meteor-combo');pauseButton=app.querySelector('#meteor-pause');speedButton=app.querySelector('#meteor-speed');jumpButton=app.querySelector('#meteor-jump');radarButton=app.querySelector('#meteor-radar');assistButton=app.querySelector('#meteor-assist');healButton=app.querySelector('#meteor-heal');shieldGiftButton=app.querySelector('#meteor-shield-gift');
 stats();updateKid();practiceLabel();updateJump();radarLabel();assistLabel();healLabel();
 if(previous){previous.rocks.forEach(r=>createRock({...r}));previous.pickups.forEach(p=>createPickup({...p}))}
 app.querySelector('#meteor-back').onclick=goBack;
 app.querySelector('#meteor-voice').onclick=()=>{audio.unlock();audio.play('test');say('左右移動躲開隕石，在天空向上滑、點兩下，或按跳一下，可以閃避零點八五秒，九秒後再跳！接住盾牌也能保護彥彥，受傷後每局可以按一次媽媽抱抱補回一顆愛心，也能領一次媽媽護盾。')};
 app.querySelector('#meteor-begin').onclick=begin;app.querySelector('#meteor-cancel').onclick=goBack;
 if(previous)app.querySelector('#meteor-new').onclick=()=>start(true);
 speedButton.onclick=()=>{state.meteorPractice=!practice();persist();practiceLabel();audio.play('tap');say(practice()?'慢慢玩，隕石會飛得比較慢。':'恢復正常速度囉！')};
 jumpButton.onclick=jump;
 radarButton.onclick=e=>{e.stopPropagation();state.meteorRadar=!radarEnabled();persist();radarLabel();audio.play('tap');say(radarEnabled()?'預警打開了！看地上的光圈，提早躲開隕石。':'預警關閉了！現在自己觀察隕石。')};
 assistButton.addEventListener('pointerdown',e=>e.stopPropagation());
 assistButton.onclick=e=>{e.stopPropagation();assistDodge()};
 healButton.addEventListener('pointerdown',e=>e.stopPropagation());
  healButton.onclick=e=>{e.stopPropagation();heal()};
 shieldGiftButton.addEventListener('pointerdown',e=>e.stopPropagation());
 shieldGiftButton.onclick=e=>{e.stopPropagation();shieldGift()};
  pauseButton.addEventListener('pointerdown',e=>e.stopPropagation());
 pauseButton.onclick=e=>{e.stopPropagation();togglePause()};
 const drag=e=>{e.preventDefault();moveTo(e.clientX)};
 field.addEventListener('pointerdown',e=>{
  if(!playing||paused||over||e.target.closest('button')||dragPointerId!==null||steerPointerId!==null||e.isPrimary===false)return;
  dragPointerId=e.pointerId;swipeStart={x:e.clientX,y:e.clientY,jumped:false};
  fieldTapStart=e.pointerType==='touch'?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;drag(e);
  try{field.setPointerCapture(e.pointerId)}catch(_){}
 });
 field.addEventListener('pointermove',e=>{
  if(e.pointerId===dragPointerId&&playing&&!paused&&!over){
   if(fieldTapStart&&Math.hypot(e.clientX-fieldTapStart.x,e.clientY-fieldTapStart.y)>18){fieldTapStart=null;lastFieldTap=null}
   const s=swipeStart;
   if(s&&!s.jumped&&s.y-e.clientY>=48&&Math.abs(e.clientX-s.x)<(s.y-e.clientY)*.8){s.jumped=true;fieldTapStart=null;lastFieldTap=null;jump()}
   drag(e);
  }
 });
 field.addEventListener('pointerup',e=>{
  if(e.pointerId!==dragPointerId)return;
  const tap=fieldTapStart;fieldTapStart=null;
  if(!tap||swipeStart?.jumped)return;
  if(Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>18){lastFieldTap=null;return}
  const now=Date.now();
  if(lastFieldTap&&now-lastFieldTap.at<=360&&Math.hypot(e.clientX-lastFieldTap.x,e.clientY-lastFieldTap.y)<=55){
   lastFieldTap=null;jump();
  }else lastFieldTap={at:now,x:e.clientX,y:e.clientY};
 });
 const endDrag=e=>{
  if(e.pointerId!==dragPointerId)return;
  dragPointerId=null;swipeStart=null;fieldTapStart=null;
  if(e.type!=='pointerup')lastFieldTap=null;
  try{if(field.hasPointerCapture?.(e.pointerId))field.releasePointerCapture(e.pointerId)}catch(_){}
 };
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])field.addEventListener(ev,endDrag);
 function controls(id,dir){
  const b=app.querySelector(id);
  b.addEventListener('pointerdown',e=>{
   if(!playing||paused||over||steerPointerId!==null||dragPointerId!==null||e.isPrimary===false)return;
   e.preventDefault();steerPointerId=e.pointerId;direction=dir;audio.play('step');
   try{b.setPointerCapture(e.pointerId)}catch(_){}
  });
  const endSteer=e=>{
   if(e.pointerId!==steerPointerId)return;
   steerPointerId=null;if(direction===dir)direction=0;
   try{if(b.hasPointerCapture?.(e.pointerId))b.releasePointerCapture(e.pointerId)}catch(_){}
  };
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,endSteer);
  b.addEventListener('keydown',e=>{if(playing&&!paused&&!e.repeat&&(e.key===' '||e.key==='Enter')){e.preventDefault();direction=dir}});
  b.addEventListener('keyup',()=>{if(direction===dir)direction=0});
 }
 controls('#meteor-left',-1);controls('#meteor-right',1);
 audio.unlock();audio.play('welcome');
 say(previous?'彥彥，跳躍和隕石進度都幫你記住了！按接著玩就能繼續。':'彥彥，看地上的預警光圈，提早躲開隕石！還可以按跳一下。');
}
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)return;
 if(playing&&!paused&&!over)togglePause('background');
 else saveCheckpoint();
});
window.addEventListener('pagehide',()=>{
 if(playing&&!paused&&!over)togglePause('background');
 else saveCheckpoint();
});
window.YanMeteors={start,stop,collision};
})();