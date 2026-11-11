(()=>{'use strict';
const sh=window.YanClassicShared,audio=window.YanClassicAudio,rules=window.YanDeliveryRules;
if(!sh||!audio||!rules)return;
const {app,state,persist,say,bg,renderHome}=sh;
let generation=0;
function stop(){generation++;window.YanSpeech?.cancel()}
function start(requested){
 stop();audio.unlock();const token=generation;
 const level=rules.plan(requested===undefined?state.deliveryLevel:requested).level,plan=rules.plan(level);
 let session=requested===undefined?rules.restore(state.deliveryRouteSession,level):rules.fresh(level);
 let message='看看兩張訂單。車廂有限，要分趟送貨！';
 if(plan.orders.length>2)message='先看訂單，再安排每一趟的貨物！';
 const live=()=>token===generation;
 const save=()=>{state.deliveryRouteSession=session;persist()};
 function menu(){stop();window.YanClassics.menu()}
 function hint(){
  const remaining=plan.orders.map((o,i)=>({...o,left:o.quantity-session.delivered[i]})).filter(o=>o.left>0);
  let text;
  if(session.location!=='depot')text=session.load.length?'看看車上還有什麼，再選需要這些貨物的地點。':'車上空了，先回倉庫裝貨。';
  else if(session.load.length>=plan.capacity)text='車裝滿了！看看哪一張訂單需要車上的貨物。';
  else text=remaining.map(o=>o.station.name+'還需要'+o.left+'份'+o.good.name).join('，')+'。一車只能放'+plan.capacity+'份。';
  message=text;draw();say(text);
 }
 function award(){
  const awards=Array.isArray(state.deliveryRouteAwards)?state.deliveryRouteAwards.filter(n=>Number.isInteger(n)&&n>=1&&n<=40):[];
  if(awards.includes(level))return false;
  state.deliveryRouteAwards=[...awards,level];state.deliveryLevel=Math.max(Number(state.deliveryLevel)||1,Math.min(40,level+1));
  state.deliveryWins=(Number(state.deliveryWins)||0)+1;state.stars=(Number(state.stars)||0)+3;state.complete=(Number(state.complete)||0)+1;persist();return true;
 }
 function dispatch(action){
  if(!live())return;
  const result=rules.act(session,action);
  if(result.error){message={full:'車裝滿了！先出發，或點車上的貨物放回。',empty:'先回倉庫裝貨，再出發吧。',depot:'要回倉庫才能裝貨、放回貨物。',same:'我們已經在這裡了。'}[result.error]||'再試一次吧。';draw();audio.play('wrong');return}
  session=result.state;save();
  if(result.complete){const first=award();draw();audio.play('win');say(first?'訂單都完成了！你會安排送貨了！':'訂單又完成了！真棒！');return}
  message=action.type==='load'?'裝好了！還有 '+(plan.capacity-session.load.length)+' 個空位。':action.type==='remove'?'貨物放回倉庫了。':action.to==='depot'?'回到倉庫，可以重新裝貨。':result.delivered?'送到 '+result.delivered+' 份！看看還有哪張訂單沒完成。':'這裡不需要車上的貨物。貨物還在，換個地方送吧！';
  draw(action.type==='travel');audio.play(result.delivered?'hit':'tap');
  if(action.type==='travel')say(message);
 }
 function draw(resetScroll=false){
  if(!live())return;
  const scroll=resetScroll?0:(app.querySelector('.route-stage')?.scrollTop||0);
  const focused=document.activeElement?.dataset?.load;
  const atDepot=session.location==='depot',place=rules.stations.find(s=>s.id===session.location),done=rules.complete(session);
  app.innerHTML='<section class="screen game classic-screen route-delivery-screen">'+bg('play')+
   '<header class="bar topbar"><button class="iconbtn" id="delivery-back" aria-label="返回工程分類">‹</button><span class="chip">🚚 訂單配送</span><span class="chip">'+level+'/40</span><button class="iconbtn" id="delivery-speak" aria-label="聽送貨提示">🔊</button></header>'+
   '<main class="route-stage allow-scroll"><div class="route-intro"><b>先看訂單，再安排裝車</b><small>一車 '+plan.capacity+' 份 · 已出發 '+session.trips+' 趟</small></div>'+
   '<section class="route-orders" aria-label="送貨訂單">'+plan.orders.map((o,i)=>'<div class="route-order '+(session.delivered[i]===o.quantity?'is-done':'')+'"><strong>'+o.station.icon+' '+o.station.name+'</strong><span>'+o.good.icon+' '+o.good.name+' × '+o.quantity+'</span><small>已送 '+session.delivered[i]+'/'+o.quantity+(session.delivered[i]===o.quantity?' ✓':'')+'</small></div>').join('')+'</section>'+
   '<section class="route-truck"><div class="route-location">'+(atDepot?'🏠 倉庫':place.icon+' '+place.name)+' <small>車上 '+session.load.length+'/'+plan.capacity+'</small></div><div class="route-slots" aria-label="車上貨物">'+Array.from({length:plan.capacity},(_,i)=>{const g=rules.goods.find(g=>g.id===session.load[i]);return g?'<button data-remove="'+i+'" '+(!atDepot?'disabled':'')+' aria-label="放回'+g.name+'">'+g.icon+'<small>'+g.name+'</small></button>':'<span class="route-empty" aria-label="空位">＋</span>'}).join('')+'</div><small>'+(atDepot?'點貨物裝車；點車上的貨物可放回':'貨物會留在車上，回倉庫才能改裝')+'</small></section>'+
   (atDepot?'<section class="route-stock" aria-label="倉庫貨物">'+rules.goods.map(g=>'<button data-load="'+g.id+'" aria-label="裝上一份'+g.name+'">'+g.icon+'<span>'+g.name+'</span><small>＋ 裝車</small></button>').join('')+'</section>':'')+
   '<section class="route-destinations" aria-label="選擇下一站">'+(atDepot?'':'<button data-travel="depot">🏠 回倉庫裝貨</button>')+plan.orders.filter(o=>o.station.id!==session.location).map(o=>'<button data-travel="'+o.station.id+'" '+(!session.load.length?'disabled':'')+'>前往 '+o.station.icon+' '+o.station.name+'</button>').join('')+'</section>'+
   '<p class="route-message" role="status">'+message+'</p><details class="route-help"><summary>玩法與提示</summary><p>看清楚每個地點要的貨物和數量。裝好車後選下一站，到站會自動交付正確的貨物；車空了就回倉庫。</p><button id="delivery-hint">💡 給我一個提示</button></details></main>'+
   '<footer class="bottombar"><button class="footbtn blue" id="delivery-home">⌂ 首頁</button><button class="footbtn yellow" id="delivery-retry">🔄 重新安排</button></footer></section>';
  app.querySelector('#delivery-back').onclick=menu;
  app.querySelector('#delivery-home').onclick=()=>{stop();renderHome()};
  app.querySelector('#delivery-speak').onclick=hint;app.querySelector('#delivery-hint').onclick=hint;
  app.querySelector('#delivery-retry').onclick=()=>{session=rules.fresh(level);save();message='重新安排這一關，看看怎麼裝車。';draw()};
  app.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>dispatch({type:'load',good:b.dataset.load}));
  app.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>dispatch({type:'remove',index:Number(b.dataset.remove)}));
  app.querySelectorAll('[data-travel]').forEach(b=>b.onclick=()=>dispatch({type:'travel',to:b.dataset.travel}));
  app.querySelector('.route-stage').scrollTop=scroll;
  if(focused&&!resetScroll)app.querySelector('[data-load="'+focused+'"]')?.focus({preventScroll:true});
  if(done){
   const overlay=document.createElement('div');overlay.className='overlay';
   overlay.innerHTML='<div class="popup"><div class="stars">⭐⭐⭐</div><h2>🎉 訂單全部送達！</h2><p>你安排了 '+session.trips+' 趟配送。<br>這一關最少可以用 '+plan.minimumTrips+' 趟完成。</p><button class="primary" id="delivery-next">'+(level<40?'▶ 下一關':'🔄 再挑戰這一關')+'</button><button class="classic-secondary" id="delivery-menu">返回工程分類</button></div>';
   app.querySelector('.screen').appendChild(overlay);overlay.querySelector('#delivery-next').onclick=()=>start(Math.min(40,level+1));overlay.querySelector('#delivery-menu').onclick=menu;
  }
 }
 save();draw();if(!rules.complete(session))say('看看訂單。一車只能放'+plan.capacity+'份貨物，你想先送哪裡？');
}
window.YanDeliveryGame={start,stop};
})();
