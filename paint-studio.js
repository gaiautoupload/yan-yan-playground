(()=>{'use strict';
// v405: draw straight lines, circles, and rectangles with one finger; all shapes use the existing saved-stroke schema, undo/redo, mirror, and export.
// v389: switch among five picture-paper colors; save per-page, undo/redo, clear, and PNG export preserve the chosen color.
// v340: 12-page picture chooser with saved-draft/completion indicators, safe modal close and direct navigation.
// v241: rainbow pen cycles through existing palette per stroke; persisted stroke schema, undo/redo, mirror and PNG export remain compatible.
// v237.1: restore the Paint Studio entry on the new hub-cats layout.
// v237: export a finished or in-progress drawing as a real PNG with a long-press preview; no scoring or save-key changes.
// v166: Mirror drawing and stickers across the center in one gesture; undo/redo and saved drafts remain compatible.
const sh=window.YanClassicShared;if(!sh)return;
const {app,state,persist,say,fx,vib,bg,renderHome}=sh;
const PAGES=[['🌼','花園','畫出好多漂亮的小花'],['🚜','工地','幫挖土機畫一條路'],['🐶','小狗','畫一個小狗的家'],['🌈','彩虹','畫出你喜歡的彩虹'],['🐱','貓咪','給貓咪畫玩具'],['🚀','太空','畫星星和太空船'],['🌳','森林','幫小動物畫樹'],['🐠','海洋','畫海底的小魚'],['🏡','家','畫媽媽和彥彥的家'],['🎂','生日','畫一個大蛋糕'],['🦋','蝴蝶','畫蝴蝶的翅膀'],['🎨','自由創作','畫你最喜歡的故事']];
const COLORS=['#e65c71','#ffac40','#f5d94b','#55bf7e','#55a5e9','#9164cc','#493e55'];
const STAMPS=['⭐','🌸','🚜','🐶','🐱','🌈'];
const BACKGROUNDS=[['#fffdf2','白'],['#dff2ff','天空藍'],['#e1f7e7','草地綠'],['#fff0dc','蜜桃橘'],['#f1e8ff','薰衣草']];
const MAX=12,MAX_STROKES=32,MAX_STICKERS=40,MAX_POINTS=180;
const nextLevel=n=>n>=MAX?1:n+1;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const point=p=>[Math.round(clamp(p&&p[0],0,1000)),Math.round(clamp(p&&p[1],0,650))];
function shapePoints(kind,from,to){
 const x1=from[0],y1=from[1];let x2=to[0],y2=to[1];
 if(Math.hypot(x2-x1,y2-y1)<16){x2=clamp(x1+(x1>850?-120:120),0,1000);y2=clamp(y1+(y1>500?-100:100),0,650)}
 if(kind==='line')return [point([x1,y1]),point([x2,y2])];
 if(kind==='square')return [[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]].map(point);
 const cx=(x1+x2)/2,cy=(y1+y2)/2,rx=Math.max(8,Math.abs(x2-x1)/2),ry=Math.max(8,Math.abs(y2-y1)/2);
 const pts=Array.from({length:49},(_,i)=>point([cx+rx*Math.cos(i*Math.PI/24),cy+ry*Math.sin(i*Math.PI/24)]));pts[48]=pts[0].slice();return pts;
}
function normalize(raw){
 const strokes=Array.isArray(raw&&raw.strokes)?raw.strokes.slice(-MAX_STROKES):[];
 const stickers=Array.isArray(raw&&raw.stickers)?raw.stickers.slice(-MAX_STICKERS):[];
 const cleaned={
  background:BACKGROUNDS.some(item=>item[0]===raw?.background)?raw.background:BACKGROUNDS[0][0],
  strokes:strokes.filter(s=>s&&COLORS.includes(s.color)&&[7,14,23].includes(s.size)&&Array.isArray(s.points)&&s.points.length>=2).map(s=>({color:s.color,size:s.size,points:s.points.slice(0,MAX_POINTS).map(point)})),
  stickers:stickers.filter(s=>s&&STAMPS.includes(s.emoji)).map(s=>({emoji:s.emoji,x:Math.round(clamp(s.x,0,1000)),y:Math.round(clamp(s.y,0,650))}))
 };
 const rawHistory=Array.isArray(raw&&raw.history)?raw.history:[...cleaned.strokes.map(()=> 's'),...cleaned.stickers.map(()=> 't')];
 cleaned.history=rawHistory.filter(x=>x==='s'||x==='t').slice(-72);
 return cleaned;
}
// Remove the nearest whole drawn stroke or sticker, preserving chronological undo order.
function eraseOne(d,p){
 let best=null;
 const offer=(kind,index,dist,limit)=>{const score=dist/limit;if(dist<=limit&&(!best||score<best.score))best={kind,index,score}};
 for(let i=0;i<d.strokes.length;i++){
  const s=d.strokes[i];let distance=Infinity;
  for(let j=1;j<s.points.length;j++){
   const a=s.points[j-1],b=s.points[j],dx=b[0]-a[0],dy=b[1]-a[1];
   const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
   distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));
  }
  offer('s',i,distance,Math.max(25,s.size*1.4));
 }
 for(let i=0;i<d.stickers.length;i++){
  const s=d.stickers[i];offer('t',i,Math.hypot(p[0]-s.x,p[1]-s.y),48);
 }
 if(!best)return false;
 let nth=0;
 for(let i=0;i<d.history.length;i++)if(d.history[i]===best.kind){if(nth===best.index){d.history.splice(i,1);break}nth++}
 (best.kind==='s'?d.strokes:d.stickers).splice(best.index,1);
 return true;
}
function valid(raw){const d=normalize(raw);return d.strokes.length>=1&&d.strokes.length+d.stickers.length>=3}
function commit(level,raw){
 if(!Number.isInteger(level)||level<1||level>MAX||!valid(raw))return {ok:false};
 const data=normalize(raw),done=Array.isArray(state.paintStudioCompleted)?state.paintStudioCompleted.filter(n=>Number.isInteger(n)&&n>=1&&n<=MAX):[];
 const first=!done.includes(level);
 state.paintStudioCompleted=first?[...done,level]:done;
 state.paintStudioDrafts=state.paintStudioDrafts&&typeof state.paintStudioDrafts==='object'&&!Array.isArray(state.paintStudioDrafts)?state.paintStudioDrafts:{};
 state.paintStudioDrafts[level]=data;
 if(first){state.stars=(Number(state.stars)||0)+2;state.complete=(Number(state.complete)||0)+1}
 state.paintStudioLevel=nextLevel(level);persist();return {ok:true,first};
}
function stop(){}
function menu(){window.YanClassics.menu()}
function start(requested){
 const level=Math.round(clamp(requested||state.paintStudioLevel||1,1,MAX)),page=PAGES[level-1];
 let drawing=normalize(state.paintStudioDrafts&&state.paintStudioDrafts[level]);
 let color=COLORS[0],size=14,stamp=null,eraser=false,mirror=false,rainbow=false,shape=null,rainbowStep=0,active=null,undoStack=[],redoStack=[];
 app.innerHTML='<section class="screen game classic-screen paint-screen">'+bg('play')+
 '<header class="bar topbar"><button class="iconbtn" id="paint-back" aria-label="返回遊戲世界">⌂</button><span class="chip">🎨 彥彥小小畫家</span><span class="chip">🖼️ '+level+'/'+MAX+'</span></header>'+
 '<main class="paint-stage"><div class="paint-family"><img src="./assets/mom.webp" alt="媽媽"><b>'+page[0]+' '+page[1]+'：'+page[2]+'</b><img src="./assets/kid.webp" alt="彥彥"></div>'+
 '<div class="paint-paper"><svg id="paint-board" viewBox="0 0 1000 650" preserveAspectRatio="none" role="img" aria-label="手指畫畫的畫紙"><rect id="paint-bg" width="1000" height="650" fill="#fffdf2"/><circle cx="875" cy="105" r="58" fill="#fff2b8" opacity=".85"/><text x="500" y="110" font-size="76" text-anchor="middle" opacity=".6">'+page[0]+'</text><g id="paint-art"></g><path id="paint-live" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path id="paint-live-mirror" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/></svg></div>'+
 '<div class="paint-guide" id="paint-guide" aria-live="polite">👆 用手指在白色畫紙上畫畫！</div>'+
 '<div class="paint-palette" id="paint-palette">'+COLORS.map((c,i)=>'<button class="paint-color'+(i===0?' selected':'')+'" data-color="'+c+'" aria-label="選擇顏色'+(i+1)+'" style="--paint-color:'+c+'"></button>').join('')+'</div>'+
 '<div class="paint-tools"><button id="paint-choose" type="button" aria-label="選擇十二張畫紙">🖼️ 選畫紙</button><button id="paint-brush" class="selected">🖍️ 畫筆</button><button id="paint-rainbow" type="button" aria-pressed="false">🌈 彩虹筆</button><button id="paint-shape" type="button" aria-pressed="false">📐 畫形狀</button><button id="paint-background" type="button" aria-label="切換畫紙背景顏色">🖼️ 背景：白</button><button id="paint-size">🖌️ 粗細：中</button><button id="paint-stamp">🌟 貼貼紙</button><button id="paint-erase">🧽 橡皮擦</button><button id="paint-mirror" aria-pressed="false">🪞 對稱畫：關</button><button id="paint-undo">↩️ 撤銷</button><button id="paint-redo" disabled>↪️ 重做</button><button id="paint-clear">🧹 清空</button><button id="paint-export" type="button">📷 存成圖片</button><button id="paint-save">⭐ 完成作品</button></div>'+
 '<div class="paint-stamps" id="paint-stamps" hidden>'+STAMPS.map((s,i)=>'<button data-stamp="'+i+'" aria-label="貼'+s+'">'+s+'</button>').join('')+'</div></main>'+
 '<footer class="bottombar"><button class="footbtn blue" id="paint-home">⌂ 首頁</button><button class="footbtn yellow" id="paint-help">🔊 聽說明</button></footer></section>';
 const svg=app.querySelector('#paint-board'),art=app.querySelector('#paint-art'),live=app.querySelector('#paint-live'),mirrorLive=app.querySelector('#paint-live-mirror'),guide=app.querySelector('#paint-guide'),stampPanel=app.querySelector('#paint-stamps');
 function draft(){state.paintStudioDrafts=state.paintStudioDrafts&&typeof state.paintStudioDrafts==='object'?state.paintStudioDrafts:{};state.paintStudioDrafts[level]=normalize(drawing);persist()}
 function snapshot(){return JSON.stringify(normalize(drawing))}
 function record(before){if(before===snapshot())return false;undoStack.push(before);if(undoStack.length>30)undoStack.shift();redoStack=[];return true}
 function restore(raw){drawing=normalize(JSON.parse(raw));draft();paint()}
 function pathData(points){return points.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ')}
 function mirrorPoints(points){return points.map(p=>[1000-p[0],p[1]])}
 function paint(){
  svg.querySelector('#paint-bg').setAttribute('fill',drawing.background);
  const paperColor=BACKGROUNDS.find(item=>item[0]===drawing.background)||BACKGROUNDS[0];
  app.querySelector('#paint-background').textContent='🖼️ 背景：'+paperColor[1];
  art.replaceChildren();
  for(const s of drawing.strokes){const el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d',pathData(s.points));el.setAttribute('stroke',s.color);el.setAttribute('stroke-width',s.size);el.setAttribute('fill','none');el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');art.appendChild(el)}
  for(const s of drawing.stickers){const el=document.createElementNS('http://www.w3.org/2000/svg','text');el.setAttribute('x',s.x);el.setAttribute('y',s.y);el.setAttribute('text-anchor','middle');el.setAttribute('dominant-baseline','central');el.setAttribute('font-size','75');el.textContent=s.emoji;art.appendChild(el)}
  app.querySelector('#paint-undo').disabled=!undoStack.length;
  app.querySelector('#paint-redo').disabled=!redoStack.length;
  app.querySelector('#paint-clear').disabled=!drawing.strokes.length&&!drawing.stickers.length&&drawing.background===BACKGROUNDS[0][0];
  app.querySelector('#paint-save').disabled=!valid(drawing);
  app.querySelector('#paint-export').disabled=!drawing.strokes.length&&!drawing.stickers.length;
 }
 function coord(e){const r=svg.getBoundingClientRect();return point([(e.clientX-r.left)*1000/Math.max(1,r.width),(e.clientY-r.top)*650/Math.max(1,r.height)])}
 function finish(e){
  if(!active||e.pointerId!==active.id)return;
  if(active.erase){if(active.changed)record(active.before);active=null;paint();return}
  if(active.stamp){active=null;return}
  if(active.shape)active.points=shapePoints(active.shape,active.origin,coord(e));
  else if(active.points.length===1){const p=active.points[0];active.points.push(point([p[0]+1,p[1]+1]))}
  const before=snapshot();drawing.strokes.push({color:active.color,size:active.size,points:active.points});drawing.history.push('s');
  if(active.mirror){const reflected=mirrorPoints(active.points);if(reflected.some((p,i)=>p[0]!==active.points[i][0])){drawing.strokes.push({color:active.color,size:active.size,points:reflected});drawing.history.push('s')}}
  drawing=normalize(drawing);record(before);active=null;live.setAttribute('d','');mirrorLive.setAttribute('d','');draft();paint();vib(8);
 }
 function cancel(e){if(active&&e.pointerId===active.id){if(active.erase&&active.changed)record(active.before);active=null;live.setAttribute('d','');mirrorLive.setAttribute('d','');paint()}}
 function erased(changed){if(!changed)return;if(active&&active.erase)active.changed=true;draft();paint();vib(6);guide.textContent='🧽 擦掉了！按撤銷可還原這次擦除！'}
 svg.addEventListener('pointerdown',e=>{
  if(active||(e.pointerType==='mouse'&&e.button!==0))return;
  e.preventDefault();
  const p=coord(e);
  if(eraser){
   active={id:e.pointerId,erase:true,last:p,before:JSON.stringify(drawing),changed:false};
   try{svg.setPointerCapture(e.pointerId)}catch(_){}
   erased(eraseOne(drawing,p));return;
  }
  if(stamp){
   active={id:e.pointerId,stamp:true};
   try{svg.setPointerCapture(e.pointerId)}catch(_){}
   const before=snapshot();drawing.stickers.push({emoji:stamp,x:p[0],y:p[1]});drawing.history.push('t');if(mirror&&p[0]!==500){drawing.stickers.push({emoji:stamp,x:1000-p[0],y:p[1]});drawing.history.push('t')}drawing=normalize(drawing);record(before);draft();paint();vib(10);guide.textContent='🌟 貼紙貼好了！再加一點畫畫！';return;
  }
  const strokeColor=rainbow?COLORS[(rainbowStep++)%COLORS.length]:color;active={id:e.pointerId,color:strokeColor,size,mirror,shape,origin:p,points:shape?shapePoints(shape,p,p):[p]};live.setAttribute('stroke',strokeColor);live.setAttribute('stroke-width',size);live.setAttribute('d',pathData(active.points));mirrorLive.setAttribute('stroke',strokeColor);mirrorLive.setAttribute('stroke-width',size);mirrorLive.setAttribute('d',mirror?pathData(mirrorPoints(active.points)):'');
  try{svg.setPointerCapture(e.pointerId)}catch(_){}
 });
 svg.addEventListener('pointermove',e=>{
  if(!active||active.id!==e.pointerId)return;
  e.preventDefault();const p=coord(e);
  if(active.stamp)return;
  if(active.erase){
   const last=active.last,dist=Math.hypot(p[0]-last[0],p[1]-last[1]),steps=Math.min(160,Math.max(1,Math.ceil(dist/14)));
   let changed=false;
   for(let i=1;i<=steps;i++)changed=eraseOne(drawing,[last[0]+(p[0]-last[0])*i/steps,last[1]+(p[1]-last[1])*i/steps])||changed;
   active.last=p;erased(changed);return;
  }
  if(active.shape)active.points=shapePoints(active.shape,active.origin,p);
  else{const last=active.points[active.points.length-1];
   if(Math.hypot(p[0]-last[0],p[1]-last[1])<5)return;
   if(active.points.length<MAX_POINTS)active.points.push(p);}
  live.setAttribute('d',pathData(active.points));mirrorLive.setAttribute('d',active.mirror?pathData(mirrorPoints(active.points)):'');
 });
 svg.addEventListener('pointerup',finish);
 svg.addEventListener('pointercancel',cancel);
 svg.addEventListener('lostpointercapture',cancel);
 function selectTool(mode){
  if(active)return;
  if(mode!=='brush')rainbow=false;if(mode!=='shape')shape=null;eraser=mode==='erase';stamp=mode==='stamp'?(stamp||STAMPS[0]):null;
  stampPanel.hidden=mode!=='stamp';
  for(const [id,selected] of [['#paint-brush',mode==='brush'&&!rainbow],['#paint-rainbow',mode==='brush'&&rainbow],['#paint-shape',mode==='shape'],['#paint-stamp',mode==='stamp'],['#paint-erase',mode==='erase']])app.querySelector(id).classList.toggle('selected',selected);
  app.querySelector('#paint-rainbow').setAttribute('aria-pressed',String(mode==='brush'&&rainbow));
  app.querySelector('#paint-shape').setAttribute('aria-pressed',String(mode==='shape'));
 }
 app.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{if(active)return;color=b.dataset.color;rainbow=false;selectTool('brush');app.querySelectorAll('[data-color]').forEach(x=>x.classList.toggle('selected',x===b));guide.textContent='🖍️ 換顏色了！在畫紙上畫一畫'});
 app.querySelector('#paint-background').onclick=()=>{if(active)return;const before=snapshot();const index=BACKGROUNDS.findIndex(item=>item[0]===drawing.background);const next=BACKGROUNDS[(index+1)%BACKGROUNDS.length];drawing.background=next[0];record(before);draft();paint();guide.textContent='🖼️ 畫紙換成'+next[1]+'！按撤銷可以還原。';vib(8)};
 app.querySelector('#paint-brush').onclick=()=>{rainbow=false;selectTool('brush');guide.textContent='🖍️ 用手指畫畫！'};
 app.querySelector('#paint-rainbow').onclick=()=>{if(active)return;rainbow=true;selectTool('brush');guide.textContent='🌈 每畫一筆就自動換一種彩虹顏色！';say('彩虹筆！每畫一筆就換一種顏色！');vib(9)};
 app.querySelector('#paint-shape').onclick=()=>{if(active)return;shape=shape==='line'?'circle':shape==='circle'?'square':'line';selectTool('shape');const labels={line:'直線',circle:'圓圈',square:'方框'};app.querySelector('#paint-shape').textContent='📐 '+labels[shape];guide.textContent='👆 按住畫紙拖曳，就能畫出'+labels[shape]+'！再按按鈕換形狀。';say('按住畫紙拖一拖，畫'+labels[shape]);vib(8)};
 app.querySelector('#paint-stamp').onclick=()=>{selectTool('stamp');guide.textContent='🌟 選貼紙，再點畫紙貼上去！'};
 app.querySelector('#paint-erase').onclick=()=>{selectTool('erase');guide.textContent='🧽 手指滑過畫筆或貼紙，就能擦掉！'};
 app.querySelector('#paint-mirror').onclick=e=>{if(active)return;mirror=!mirror;e.currentTarget.classList.toggle('selected',mirror);e.currentTarget.setAttribute('aria-pressed',String(mirror));e.currentTarget.textContent='🪞 對稱畫：'+(mirror?'開':'關');guide.textContent=mirror?'🪞 左右兩邊一起畫、一起貼貼紙！':'🖍️ 回到一般畫畫模式！';vib(8)};
 app.querySelectorAll('[data-stamp]').forEach(b=>b.onclick=()=>{stamp=STAMPS[Number(b.dataset.stamp)];guide.textContent='👆 點畫紙，貼上'+stamp});
 app.querySelector('#paint-size').onclick=e=>{size=size===7?14:size===14?23:7;e.currentTarget.textContent='🖌️ 粗細：'+(size===7?'細':size===14?'中':'粗')};
 app.querySelector('#paint-undo').onclick=()=>{if(active||!undoStack.length)return;const before=undoStack.pop();redoStack.push(snapshot());restore(before);guide.textContent='↩️ 撤銷成功！可以按重做找回來！'};
 app.querySelector('#paint-redo').onclick=()=>{if(active||!redoStack.length)return;const after=redoStack.pop();undoStack.push(snapshot());restore(after);guide.textContent='↪️ 重做成功！剛剛的作品回來了！'};
 app.querySelector('#paint-clear').onclick=()=>{if(active)return;const before=snapshot();drawing={background:BACKGROUNDS[0][0],strokes:[],stickers:[],history:[]};record(before);draft();paint();guide.textContent='🧹 白紙準備好了！按撤銷可找回作品！'};

 // v237: render the actual SVG artwork to a 1000x650 PNG. The child can long-press
 // the preview on mobile, or use the explicit download link. No state mutation.
 function exportArtwork(){
  if(active||(!drawing.strokes.length&&!drawing.stickers.length))return;
  const screen=app.querySelector('.paint-screen');
  const clone=svg.cloneNode(true);
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  clone.setAttribute('width','1000');clone.setAttribute('height','650');
  clone.querySelector('#paint-live')?.remove();
  clone.querySelector('#paint-live-mirror')?.remove();
  const svgBlob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});
  const svgUrl=URL.createObjectURL(svgBlob),preview=new Image();
  let settled=false;
  function showArtwork(src,format){
   if(settled)return;settled=true;
   if(!screen.isConnected){URL.revokeObjectURL(svgUrl);return}
   const overlay=document.createElement('div');overlay.className='overlay paint-export-overlay';
   overlay.innerHTML='<div class="popup paint-export-panel" role="dialog" aria-modal="true" aria-label="保存畫畫作品"><h2>📷 彥彥的畫畫作品</h2><p>👆 長按圖片可保存到手機相簿</p><img class="paint-export-preview" alt="彥彥完成的畫畫作品"><div class="paint-export-actions"><a id="paint-export-download" class="primary" download>⬇️ 下載圖片</a><button type="button" id="paint-export-close" class="classic-secondary">👍 繼續畫畫</button></div></div>';
   overlay.querySelector('.paint-export-preview').src=src;
   const link=overlay.querySelector('#paint-export-download');
   link.href=src;link.download='yan-yan-paint-'+level+'.'+format;
   if(format==='svg'){link.textContent='⬇️ 下載 SVG 圖片';overlay.querySelector('p').textContent='📷 這台裝置無法轉 PNG，仍可下載 SVG 原圖';}
   const close=()=>{overlay.remove();if(format==='svg')URL.revokeObjectURL(svgUrl)};
   overlay.querySelector('#paint-export-close').onclick=close;
   overlay.onclick=e=>{if(e.target===overlay)close()};
   overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close()}};
   screen.appendChild(overlay);
   overlay.querySelector('#paint-export-close').focus();
   if(format==='png')URL.revokeObjectURL(svgUrl);
   guide.textContent='📷 圖片做好了！長按預覽或點下載保存。';
  }
  preview.onload=()=>{
   try{
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=650;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas unavailable');
    ctx.fillStyle=drawing.background;ctx.fillRect(0,0,1000,650);ctx.drawImage(preview,0,0,1000,650);
    showArtwork(canvas.toDataURL('image/png'),'png');
   }catch(_){showArtwork(svgUrl,'svg')}
  };
  preview.onerror=()=>showArtwork(svgUrl,'svg');
  preview.src=svgUrl;
 }

 // v340: jump between all 12 drawing pages without losing existing drafts or stars.
 function choosePage(){
  if(active||app.querySelector('.paint-gallery-overlay'))return;
  const screen=app.querySelector('.paint-screen');if(!screen)return;
  draft();
  const completed=Array.isArray(state.paintStudioCompleted)?state.paintStudioCompleted:[];
  const drafts=state.paintStudioDrafts&&typeof state.paintStudioDrafts==='object'?state.paintStudioDrafts:{};
  const overlay=document.createElement('div');overlay.className='overlay paint-gallery-overlay';
  overlay.innerHTML='<div class="popup paint-gallery" role="dialog" aria-modal="true" aria-label="選擇畫畫主題"><h2>🖼️ 彥彥想畫哪一張？</h2><div class="paint-gallery-grid">'+
   PAGES.map((p,i)=>{
    const n=i+1,hasDraft=normalize(drafts[n]).strokes.length+normalize(drafts[n]).stickers.length>0;
    const status=completed.includes(n)?'⭐ 已完成':hasDraft?'🖍️ 有草稿':n===level?'👆 現在這張':'🌟 新畫紙';
    return '<button type="button" class="paint-gallery-choice'+(n===level?' paint-gallery-current':'')+'" data-paint-level="'+n+'" aria-label="'+p[1]+'，'+status+'"><span class="paint-gallery-emoji">'+p[0]+'</span><b>'+p[1]+'</b><small>'+status+'</small></button>';
   }).join('')+
   '</div><button type="button" class="classic-secondary" id="paint-gallery-close">↩️ 繼續畫畫</button></div>';
  const close=()=>{document.removeEventListener('keydown',onEscape);overlay.remove();app.querySelector('#paint-choose')?.focus()};
  const onEscape=e=>{if(e.key==='Escape'){e.preventDefault();close()}};
  screen.appendChild(overlay);
  overlay.querySelector('#paint-gallery-close').onclick=close;
  overlay.querySelectorAll('[data-paint-level]').forEach(btn=>btn.onclick=()=>{
   const chosen=Number(btn.dataset.paintLevel);
   close();
   if(!Number.isInteger(chosen)||chosen<1||chosen>MAX)return;
   state.paintStudioLevel=chosen;persist();
   if(chosen!==level)start(chosen);
  });
  overlay.onclick=e=>{if(e.target===overlay)close()};
  document.addEventListener('keydown',onEscape);
  overlay.querySelector('#paint-gallery-close').focus();
 }
 app.querySelector('#paint-choose').onclick=choosePage;
 app.querySelector('#paint-export').onclick=exportArtwork;
 app.querySelector('#paint-save').onclick=()=>{
  const result=commit(level,drawing);if(!result.ok){guide.textContent='🎨 再多畫幾筆，就可以保存作品！';return}
  fx('win');vib([15,20,15]);say('彥彥完成了自己的畫！真棒！');
  const ov=document.createElement('div');ov.className='overlay';ov.innerHTML='<div class="popup"><div class="stars">🎨 ⭐⭐</div><h2>🌈 畫畫完成！</h2><p>媽媽說：彥彥的小畫家作品真漂亮！</p><button class="primary" id="paint-next">▶️ 下一張畫紙</button><button class="classic-secondary" id="paint-menu">🎲 其他遊戲</button></div>';
  app.querySelector('.paint-screen').appendChild(ov);
  ov.querySelector('#paint-next').onclick=()=>start(nextLevel(level));ov.querySelector('#paint-menu').onclick=menu;
 };
 app.querySelector('#paint-back').onclick=menu;app.querySelector('#paint-home').onclick=()=>renderHome();
 app.querySelector('#paint-help').onclick=()=>say('用手指在白色畫紙上畫畫。可以按選畫紙切換十二種主題，草稿會自動保留。用彩虹筆每畫一筆自動換色，按畫形狀可以拖曳畫直線、圓圈、方框，也可以換五種畫紙背景，開啟對稱畫、貼貼紙、撤銷和重做，清空也能撤銷，完成後保存作品，開啟下一張畫紙！');
 paint();say('彥彥，今天當小小畫家！用手指自由畫畫吧！');
}
function enhance(){
 const hub=app.querySelector('#yan-hub');if(!hub||hub.querySelector('#paint-entry'))return;
 const anchor=hub.querySelector('.hub-cats')||hub.querySelector('.hub-relay[data-r="look"]');if(!anchor)return;
 const b=document.createElement('button');b.id='paint-entry';b.className='paint-entry';b.type='button';
 b.innerHTML='<span>🎨</span><b>小小畫家<small>手指畫畫、貼貼紙，保存自己的作品</small></b>';
 b.onclick=()=>start();const modes=hub.querySelector('.hub-modes');(modes||anchor).insertAdjacentElement('afterend',b);
}
const observer=new MutationObserver(enhance);observer.observe(app,{childList:true,subtree:true});enhance();
window.YanPaintStudio={start,stop,nextLevel,normalize,valid,commit,enhance,eraseOne,shapePoints,mirrorPoints:points=>points.map(p=>[1000-p[0],p[1]])};
})();