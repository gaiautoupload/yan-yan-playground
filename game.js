(()=>{'use strict';
const app=document.querySelector('#app'),STORE='yan-family-unified-v6';
const TYPES=['number','picture','shadow','relation','memory','find','pattern','quiz','add','odd','subtract','classify'];
const MODESETS={ordering:['ordering'],puzzle:['puzzle'],maze:['maze'],differences:['differences'],journey:TYPES,connect:['number','picture','shadow','relation'],numbers:['number','add','subtract'],think:['pattern','odd','classify'],observe:['find','memory','shadow'],life:['quiz','classify','relation']};
/* v68: consolidate duplicate modes to existing journey; old categories retained for saved games. */
const MODES=[['connect','🔗','連連看'],['numbers','🍎','數數王']];
const CARS=['excavator','dump','mixer','bulldozer','wheelbarrow','helmet','cone','shovel','wrench','barrier','toolbox','vest'];
const thingNames={excavator:'挖土機',dump:'砂石車',mixer:'水泥車',bulldozer:'推土機',wheelbarrow:'手推車',helmet:'安全帽',cone:'交通錐',shovel:'鏟子',wrench:'板手',barrier:'路障',toolbox:'工具箱',vest:'安全背心'};
const things=[...CARS.map(id=>({id,name:thingNames[id],src:'assets/'+id+'.webp'})),...['🍎','🍌','🍓','⭐','⚽','🍪','🍉','🚗','🚌','🚲','🐰','🐶','🐱','🐟','🦋','🌼','🧸','🌽','🍇','🐸','🦁','☂️','🚀'].map((v,i)=>({id:'e'+i,name:'小圖案',icon:v}))];
const relations=[['🚜','🪣'],['🔨','🧱'],['☂️','🌧️'],['🪥','🦷'],['🐝','🌻'],['✏️','📓'],['🔑','🚪'],['🧦','👟'],['🐟','🌊'],['☀️','🕶️'],['🍳','🥚'],['🚗','🛞'],['🎂','🎈'],['🧸','🎁'],['🐈','🐟'],['🍼','👶'],['🏠','🛏️'],['⛑️','🚲']];
const daily=[
['🌧️','下雨天出門要帶什麼？','☂️',['🎮','🧸','🍪']],['🚲','騎腳踏車要戴什麼？','⛑️',['👑','🍰','📚']],['🍽️','吃飯前要先做什麼？','🧼',['🎮','🛏️','🍭']],['🦷','刷牙要用什麼？','🪥',['🔧','🍴','🧦']],['🌞','太陽好大要保護眼睛？','🕶️',['🥾','🎮','🐟']],['🌙','晚上該做什麼？','🛏️',['🚲','⚽','🛝']],['🚦','看到紅燈要怎麼做？','🛑',['🏃','🚀','🛴']],['🚗','坐汽車要做好什麼？','🔒',['🎈','⚽','🏃']],['🧸','玩具玩完放哪裡？','🧺',['🚪','🥣','🚲']],['🔥','看到火要做什麼？','🧑‍🚒',['🎮','🧸','🌻']],['🥵','口渴了要喝什麼？','💧',['🎨','🧴','🧂']],['🤧','打噴嚏要遮住哪裡？','💪',['🎮','🍎','🏀']],['🧹','地上有垃圾放哪裡？','🗑️',['🛏️','🍽️','🎒']],['🐶','狗狗肚子餓了給什麼？','🥣',['🧼','🔧','👟']],['🚜','工地需要什麼保護頭部？','⛑️',['🎀','🍎','🕶️']],['🤕','受傷了要找誰幫忙？','👩',['🎮','🍰','🚀']],['🧊','冰冰的東西放在哪裡？','🧊',['🔥','🛏️','☀️']],['🌱','小花長大要澆什麼？','💧',['🧂','🧴','🍰']],['🦷','牙齒健康少吃什麼？','🍬',['🥦','🥕','🍎']],['🏫','上學要帶哪個？','🎒',['🛁','🍳','🚪']],['🍌','香蕉皮丟哪裡？','🗑️',['🎒','🍽️','🛏️']],['🥶','天冷要穿什麼？','🧥',['🩱','🕶️','🧢']],['🚿','洗澡要用什麼？','🧼',['🍬','🖍️','⚽']],['😴','想睡覺時去哪裡？','🛏️',['🚦','🍽️','🏟️']],['🦶','出門走路要穿什麼？','👟',['🍎','🧸','🧼']],['📖','看書要在哪裡？','💡',['🌑','🦇','🌚']]
];
let state={level:1,unlocked:1,stars:0,mode:'journey',music:true,voice:true,haptic:true,complete:0,scene:0,puzzleLevel:1,mazeLevel:1,differenceLevel:1,orderLevel:1,woodLevel:1,moleLevel:1,colorLevel:1};
try{const old=JSON.parse(localStorage.getItem(STORE)||'{}');state={...state,...old};if(!localStorage.getItem(STORE)){const prev=JSON.parse(localStorage.getItem('family-match-v1')||'{}');const classic=JSON.parse(localStorage.getItem('yan-excavator-match-v2.1')||'{}');const advanced=Number(localStorage.getItem('yan-v5-stage')||0);state.level=Math.max(1,Number(prev.level)||1,Number(classic.current)||1,advanced);state.unlocked=Math.max(state.level,Number(classic.unlocked)||1);state.music=prev.sound!==false;state.voice=prev.voice!==false;state.haptic=prev.haptic!==false;}}catch(e){}
state.puzzleLevel=Math.max(1,Math.min(200,Number(state.puzzleLevel)||1));state.mazeLevel=Math.max(1,Math.min(120,Number(state.mazeLevel)||1));state.mazeGuide=state.mazeGuide===true;
if(!state.mazeSession||typeof state.mazeSession!=='object'||Array.isArray(state.mazeSession))state.mazeSession=null;
state.diffRelay=state.diffRelay===true;
if(!state.puzzleSession||typeof state.puzzleSession!=='object'||Array.isArray(state.puzzleSession))state.puzzleSession=null;
if(!state.orderSession||typeof state.orderSession!=='object'||Array.isArray(state.orderSession))state.orderSession=null;
if(!state.diffSession||typeof state.diffSession!=='object'||Array.isArray(state.diffSession))state.diffSession=null;
if(!state.pairSessions||typeof state.pairSessions!=='object'||Array.isArray(state.pairSessions))state.pairSessions={};
state.differenceLevel=Math.max(1,Math.min(120,Number(state.differenceLevel)||1));state.orderLevel=Math.max(1,Math.min(120,Number(state.orderLevel)||1));state.woodLevel=Math.max(1,Math.min(60,Number(state.woodLevel)||1));state.moleLevel=Math.max(1,Math.min(60,Number(state.moleLevel)||1));state.colorLevel=Math.max(1,Math.min(60,Number(state.colorLevel)||1));state.level=Math.max(1,Math.min(2000,Number(state.level)||1));state.unlocked=Math.max(state.level,Number(state.unlocked)||1);if(typeof state.mode!=='string'||!Object.prototype.hasOwnProperty.call(MODESETS,state.mode))state.mode='journey';
const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(state))}catch(e){}};persist();
const rand=(seed)=>{let t=seed+0x6d2b79f5;return()=>{t+=0x6d2b79f5;let r=Math.imul(t^(t>>>15),t|1);r^=r+Math.imul(r^(r>>>7),r|61);return((r^(r>>>14))>>>0)/4294967296}};
const shuffle=(arr,rng)=>{let a=[...arr];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const take=(arr,n,rng)=>shuffle(arr,rng).slice(0,n);const mod=(x,m)=>(x%m+m)%m;
const IMG=(x,klass='')=>x.src?`<img class="asset-icon ${klass}" draggable="false" src="./${x.src}" alt="${x.name||''}">`:`<span class="emoj ${klass}">${x.icon||x}</span>`;
const icon=(x)=>typeof x==='string'?`<span class="emoj">${x}</span>`:IMG(x);
function group(x,n){const cols=n<=2?n:n<=4?2:n<=9?3:4;return `<div class="tinycount count-${Math.min(n,10)}" style="--count-cols:${cols}" data-count="${n}">${Array.from({length:n},()=>`<span class="unit">${icon(x)}</span>`).join('')}</div>`}
let ctx=null,tick=null,beat=0,active=null;
function audioUnlock(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;if(!ctx)ctx=new C();if(ctx.state==='suspended')ctx.resume().catch(()=>{})}catch(e){}}
function tone(f,delay=0,duration=.13,vol=.03){if(!ctx||!state.music)return;try{let t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.014);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.start(t);o.stop(t+duration+.01)}catch(e){}}
function fx(k){const note={tap:[570],yay:[523,659,784],error:[240,195],win:[523,659,784,988],hint:[860,740]}[k]||[440];note.forEach((v,i)=>tone(v,i*.085,.13,k==='tap'?.018:.044))}
function musicStop(){if(tick)clearInterval(tick);tick=null}
function musicStart(){if(!state.music||!ctx||document.hidden||tick)return;const seq=[523,659,784,659,698,880,784,659];tick=setInterval(()=>{tone(seq[beat++%seq.length],0,.23,.008)},600)}
function vib(x=12){try{if(state.haptic)navigator.vibrate?.(x)}catch(e){}}
function say(message){return state.voice!==false&&!!window.YanSpeech?.speak(message)}

document.addEventListener('pointerdown',(e)=>{if(e.target.closest('button')){audioUnlock();musicStart();fx('tap');vib(8)}},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden){musicStop();window.YanSpeech?.cancel()}else musicStart()});document.addEventListener('touchmove',(e)=>{if(!e.target.closest('.allow-scroll,.screen.home,.overlay'))e.preventDefault()},{passive:false});
// Fullscreen can only be requested while handling a user gesture. Some browsers do not allow it.
function requestGameFullscreen(){
 const root=document.documentElement;
 if(document.fullscreenElement || document.webkitFullscreenElement)return;
 const fn=root.requestFullscreen||root.webkitRequestFullscreen;
 if(typeof fn!=='function')return;
 try{const result=fn.call(root,{navigationUI:'hide'});if(result?.catch)result.catch(()=>{});}catch(e){try{fn.call(root)}catch(_){}}
}
function toggleFullscreen(){
 const active=document.fullscreenElement||document.webkitFullscreenElement;
 if(active){try{(document.exitFullscreen||document.webkitExitFullscreen)?.call(document)}catch(e){}}
 else requestGameFullscreen();
}
let game=null,solved=false,errors=0,selected=null,matches=[],flipped=[],busy=false;
const cats=['🚜','🍎','🐶','🚗','⭐','⚽','🧸','🍪'];
function levelKind(n){return TYPES[mod(n-1,TYPES.length)]}
function getKind(){if(state.mode==='journey')return state.level%13===0?'puzzle':state.level%17===0?'maze':state.level%19===0?'differences':state.level%23===0?'ordering':levelKind(state.level);let types=MODESETS[state.mode];return types[mod(state.level-1,types.length)]}

// v9: a deterministic perfect maze. Every cell is reachable; every puzzle has exactly one path.
// Wall bits: north=1, east=2, south=4, west=8.
function makeMaze(level){
 const size=Math.min(9,4+Math.floor((level-1)/8)),rng=rand(20261026+level*1747);
 const walls=Array(size*size).fill(15),visited=Array(size*size).fill(false),stack=[0];
 visited[0]=true;
 const dirs=[[-1,0,1,4],[0,1,2,8],[1,0,4,1],[0,-1,8,2]];
 while(stack.length){
  const at=stack[stack.length-1],r=Math.floor(at/size),c=at%size;
  const opts=shuffle(dirs,rng).filter(([dr,dc])=>r+dr>=0&&r+dr<size&&c+dc>=0&&c+dc<size&&!visited[(r+dr)*size+c+dc]);
  if(!opts.length){stack.pop();continue}
  const [dr,dc,bit,opposite]=opts[0],next=(r+dr)*size+c+dc;
  walls[at]&=~bit;walls[next]&=~opposite;visited[next]=true;stack.push(next);
 }
 const q={kind:'maze',title:'挖土機尋寶迷宮',prompt:'🚜💎',voice:'先找到迷宮裡所有亮晶晶的寶石，再把挖土機開回小房子！用手指滑動，或按方向鍵。',size,walls,goal:size*size-1,position:0,steps:0,visited:[0],level};
 const route=mazeRoute(q),onRoute=new Set(route);
 const branches=Array.from({length:walls.length-2},(_,i)=>i+1).filter(i=>!onRoute.has(i));
 const deadEnds=branches.filter(i=>mazeNeighbors(q,i).length===1);
 const rest=branches.filter(i=>!deadEnds.includes(i));
 const options=[...shuffle(deadEnds,rand(level*433+2026)),...shuffle(rest,rand(level*773+2026)),...shuffle(route.slice(0,-1),rand(level*907+2026))];
 const count=Math.min(5,2+Math.floor((level-1)/30),options.length);
 q.treasures=options.slice(0,count);
 q.collected=[];
 const saved=validMazeCheckpoint(state.mazeSession,q)?state.mazeSession:null;
 if(saved){q.position=saved.position;q.steps=saved.steps;q.visited=[...saved.visited];q.collected=[...saved.collected];q.resumed=true}else q.resumed=false;
 return q;
}
function mazeNeighbors(q,at){const n=q.size,w=q.walls[at],r=Math.floor(at/n),c=at%n;
 return [[-1,0,1],[0,1,2],[1,0,4],[0,-1,8]].filter(([dr,dc,bit])=>!(w&bit)&&r+dr>=0&&r+dr<n&&c+dc>=0&&c+dc<n).map(([dr,dc])=>(r+dr)*n+c+dc);
}
function mazeRoute(q,from=q.position,target=q.goal){const queue=[from],parent=Array(q.walls.length).fill(-1);parent[from]=from;
 for(let i=0;i<queue.length;i++){const at=queue[i];if(at===target)break;for(const next of mazeNeighbors(q,at))if(parent[next]===-1){parent[next]=at;queue.push(next)}}
 if(parent[target]===-1)return [];
 const path=[];for(let at=target;at!==from;at=parent[at])path.push(at);return path.reverse();
}

// v71: route to nearest remaining gem, then home.
function mazeGuideRoute(q){
 const targets=q.treasures.filter(i=>!q.collected.includes(i));
 if(!targets.length)return mazeRoute(q,q.position,q.goal);
 let best=null;
 for(const target of targets){
  const path=mazeRoute(q,q.position,target);
  if(path.length&&(!best||path.length<best.length))best=path;
 }
 return best||[];
}

// v77: validated maze checkpoints and reversible single-step movement.
function mazeSignature(q){return q.size+':'+q.walls.join(',')+':'+q.treasures.join(',')}
function validMazeCheckpoint(s,q){
 if(!s||s.level!==q.level||s.signature!==mazeSignature(q)||!Number.isInteger(s.position)||!Number.isInteger(s.steps))return false;
 const path=s.visited,found=s.collected,len=q.walls.length;
 if(!Array.isArray(path)||path.length<2||path.length>10001||s.steps!==path.length-1||path[0]!==0||path[path.length-1]!==s.position)return false;
 if(!path.every((v,i)=>Number.isInteger(v)&&v>=0&&v<len&&(i===0||mazeNeighbors(q,path[i-1]).includes(v))))return false;
 if(!Array.isArray(found)||found.length>q.treasures.length||new Set(found).size!==found.length||!found.every(v=>Number.isInteger(v)&&q.treasures.includes(v)))return false;
 const expected=q.treasures.filter(v=>path.includes(v));
 return expected.length===found.length&&expected.every(v=>found.includes(v));
}
function saveMaze(q){
 state.mazeSession=q.steps>0?{level:q.level,signature:mazeSignature(q),position:q.position,steps:q.steps,visited:[...q.visited],collected:[...q.collected]}:null;
 persist();
}

// v10: Spot-the-difference uses the same family artwork in both frames.
// All differences are explicit, deterministic decals added ONLY to the lower frame.
// Non-overlapping positions remain within the frame even on a 320px-wide phone.
// v21 varied scene and randomized answer positions; replay redraws a new puzzle.
const DIFF_SCENES=[
 ['family-play','👩‍👦 家庭遊戲','./assets/family-play-puzzle.webp'],
 ['family-home','🏡 親子時光','./assets/family-home-puzzle.webp'],
 ['park','🛝 公園','./assets/diff-park.svg'],
 ['beach','🏖️ 海邊','./assets/diff-beach.svg'],
 ['construction','🚜 工地','./assets/diff-construction.svg'],
 ['camp','⛺ 露營','./assets/diff-camp.svg'],
 ['snow','⛄ 雪地','./assets/diff-snow.svg'],
 ['garden','🌷 花園','./assets/diff-garden.svg']
].concat((window.YanFamilyPhotos||[]).map(p=>[p.id,p.name,p.scene]));
const DIFF_ICONS=['🐸','🚲','🦋','🎈','🐶','🌼','⚽','🧸','🍌','🐱','🚀','🐟','🍪','🧢','🌈','🐞','🌻','🍓','🚜','🛴'];
// 4x2 non-overlapping slots (large enough for 320-pixel screens).
const DIFF_SLOTS=[[15,29],[38,29],[61,29],[85,29],[15,72],[38,72],[61,72],[85,72]];
let lastDiffScene=-1;
// v73: normalize the synchronized magnifier's saved camera without touching legacy progress.
function diffView(v){
 const zoom=v&&Number(v.zoom)===1.9?1.9:1;
 const edge=50/zoom;
 const limit=n=>Number.isFinite(Number(n))?Math.round(Math.max(edge,Math.min(100-edge,Number(n)))*100)/100:50;
 return {zoom,panX:zoom===1?50:limit(v.panX),panY:zoom===1?50:limit(v.panY)};
}
function makeDifferences(level){
 const count=Math.min(5,3+Math.floor((level-1)/8));
 const saved=state.diffSession;
 const oldScene=saved&&saved.level===level?DIFF_SCENES.find(x=>x[0]===saved.scene):null;
 const valid=oldScene&&Array.isArray(saved.spots)&&saved.spots.length===count
  &&saved.spots.every((s,i)=>s&&s.id===i&&Number.isFinite(s.x)&&s.x>=10&&s.x<=90&&Number.isFinite(s.y)&&s.y>=20&&s.y<=80&&DIFF_ICONS.includes(s.icon))
  &&Array.isArray(saved.found)&&saved.found.length<=count&&saved.found.every((id,i)=>Number.isInteger(id)&&id>=0&&id<count&&saved.found.indexOf(id)===i);
 if(valid){
  const finders=Array.isArray(saved.finders)&&saved.finders.length===saved.found.length&&saved.finders.every(x=>x==='kid'||x==='mom')
   ?saved.finders.slice():saved.found.map(()=>'kid');
  return {kind:'differences',title:'親子找不同',prompt:'🔎',voice:'看看上下兩張圖片，找出下面多出來的'+count+'個小東西，點一下！',
   scene:oldScene[0],sceneName:oldScene[1],sceneUrl:oldScene[2],spots:saved.spots.map(s=>({...s})),found:saved.found.slice(),finders,
   relayTurn:saved.relayTurn==='mom'?'mom':'kid',level,view:diffView(saved.view)};
 }
 const rng=rand((Date.now()^Math.floor(Math.random()*4294967296)^(level*2387))>>>0);
 const candidates=DIFF_SCENES.map((_,i)=>i).filter(i=>i!==lastDiffScene);
 const ix=candidates[Math.floor(rng()*candidates.length)];lastDiffScene=ix;
 const scene=DIFF_SCENES[ix],icons=take(DIFF_ICONS,count,rng);
 const spots=shuffle(DIFF_SLOTS,rng).slice(0,count).map(([baseX,baseY],i)=>({
  id:i,x:Math.min(87,Math.max(13,+(baseX+(rng()-.5)*3).toFixed(1))),
  y:Math.min(74,Math.max(27,+(baseY+(rng()-.5)*3).toFixed(1))),
  icon:icons[i]
 }));
 return {kind:'differences',title:'親子找不同',prompt:'🔎',voice:'看看上下兩張圖片，找出下面多出來的'+count+'個小東西，點一下！',scene:scene[0],sceneName:scene[1],sceneUrl:scene[2],spots,found:[],finders:[],relayTurn:'kid',level,view:diffView(null)};
}
function saveDifferences(q){
 if(!q||q.kind!=='differences')return;
 state.diffSession={level:q.level,scene:q.scene,spots:q.spots.map(s=>({id:s.id,x:s.x,y:s.y,icon:s.icon})),
  found:q.found.slice(),finders:q.finders.slice(),relayTurn:q.relayTurn,view:diffView(q.view)};
 persist();
}
// v11: picture-only sequencing stories. Each row is an unambiguous visual progression.
const ORDER_STORIES=[
 {name:'蘋果樹長大',icon:'🍎',items:['🌰','🌱','🌿','🌳','🍎']},
 {name:'小花長大',icon:'🌷',items:['🫘','🌱','🌿','🌷','🦋']},
 {name:'挖土機蓋房子',icon:'🚜',items:['🚧','🚜','🧱','🏠','🎨']},
 {name:'早上出門',icon:'🎒',items:['🌙','⏰','🪥','🥣','🎒']},
 {name:'小雞長大',icon:'🐥',items:['🥚','🐣','🐥','🐔','🐓']},
 {name:'蝴蝶的故事',icon:'🦋',items:['🥚','🐛','🍃','🦋','🌸']}
];
const ORDER_NARRATIVES=[["蘋果樹長大","🍎",["🌰","🌱","🌿","🌳","🍎"],["蘋果種子","冒出小芽","長出葉子","長成大樹","結出蘋果"],"彥彥，今天跟媽媽種蘋果樹！先有一顆小種子，慢慢長成大樹，最後結出紅蘋果。把故事從頭排到尾吧！","哇！彥彥種出一棵大蘋果樹！"],["小花長大","🌷",["🫘","🌱","🌿","🌷","🦋"],["花種子","小芽芽","長出葉子","開出花朵","蝴蝶來了"],"彥彥，媽媽帶你種花花！先種下種子，再長出小芽，開出花朵，最後蝴蝶也飛來了。","好漂亮！彥彥的小花開了！"],["挖土機蓋房子","🚜",["🚧","🚜","🧱","🏠","🎨"],["準備工地","挖土機開工","砌好磚塊","蓋出房子","幫房子上色"],"小小工程師彥彥出動！先準備工地，再開挖土機，接著砌磚蓋房子，最後把房子漆得漂漂亮亮！","工程完成！彥彥蓋的房子好棒！"],["早上出門","🎒",["🌙","⏰","🪥","🥣","🎒"],["晚上睡覺","鬧鐘響了","刷牙牙","吃早餐","背書包出門"],"彥彥，早安！晚上好好睡，早上鬧鐘響了，就刷牙、吃早餐，再背上書包出門囉！","準備好了！媽媽牽著彥彥出門！"],["小雞長大","🐥",["🥚","🐣","🐥","🐔","🐓"],["小雞蛋","破殼了","小小雞","慢慢長大","大公雞"],"彥彥，小雞是怎麼長大的？先從雞蛋開始，啄開蛋殼，變成小雞，慢慢長大。","小雞長大了！彥彥真會觀察！"],["蝴蝶的故事","🦋",["🥚","🐛","🍃","🦋","🌸"],["小小的卵","毛毛蟲","吃葉子","變成蝴蝶","飛到花朵上"],"彥彥，跟媽媽看蝴蝶的故事！先有小小的卵，變成毛毛蟲，吃葉子長大，最後變成漂亮的蝴蝶！","蝴蝶飛起來了！彥彥真棒！"],["草莓長大","🍓",["🌰","🌱","🌿","🌼","🍓"],["草莓種子","長出新芽","長出葉子","開出小花","長出草莓"],"彥彥，我們來種甜甜的草莓！先放種子，長出葉子，再開小花，最後就有紅紅的草莓了！","太棒了！彥彥收成甜草莓！"],["下雨後的彩虹","🌈",["☁️","🌧️","☂️","☀️","🌈"],["烏雲來了","開始下雨","撐起雨傘","太陽出來","看見彩虹"],"彥彥，天空的彩虹怎麼來的？烏雲帶來雨，撐起小雨傘，太陽再出來，彩虹就出現囉！","找到彩虹了！好漂亮！"],["做生日蛋糕","🎂",["🥚","🥣","🧁","🎂","🎉"],["準備雞蛋","攪拌材料","烤出蛋糕","裝飾生日蛋糕","生日派對"],"彥彥，今天幫媽媽做生日蛋糕！先準備材料、攪拌、烤蛋糕，再裝飾，最後一起慶祝！","生日蛋糕完成！祝彥彥天天開心！"],["堆雪人","⛄",["☁️","❄️","⛄","🧣","🌞"],["天氣變冷","雪花飄下來","堆出雪人","幫雪人戴圍巾","太陽出來"],"彥彥，冬天來了！雪花飄下來，我們一起堆雪人，再幫雪人戴上暖暖的圍巾！","雪人完成！彥彥好厲害！"],["挖土機造花園","🏗️",["🪨","🚜","🕳️","🌱","🌻"],["搬走石頭","挖土機出動","挖好小洞","種下花苗","向日葵開了"],"彥彥，開挖土機幫媽媽造花園！先搬開石頭，挖一個小洞，種下花苗，最後開出向日葵！","花園完成了！挖土機隊長彥彥真棒！"],["搭橋讓車過河","🌉",["🪨","🚜","🧱","🌉","🚗"],["準備石頭","工程車開工","搬來磚塊","大橋蓋好了","小汽車過橋"],"彥彥，河上還沒有橋！先準備材料，工程車開始蓋橋，等橋蓋好了，小汽車就能安全過河！","大橋蓋好了！汽車安全過河！"]];
// v75: a saved story must match the exact level and all card keys, including undo history.
function validOrderCheckpoint(s,level,correct){
 const keys=correct.map(c=>c.key),valid=a=>Array.isArray(a)&&a.length===keys.length&&a.every(v=>Number.isInteger(v)&&keys.includes(v))&&new Set(a).size===keys.length;
 return !!(s&&s.level===level&&valid(s.cards)&&Array.isArray(s.history)&&s.history.length<=12&&s.history.every(valid)&&s.cards.some((v,i)=>v!==keys[i]));
}
function makeOrdering(level){
 const narrative=ORDER_NARRATIVES[(level-1)%ORDER_NARRATIVES.length],story={name:narrative[0],icon:narrative[1],items:narrative[2]},size=level<=8?3:level<=24?4:5;
 const picks=size===3?[0,2,4]:size===4?[0,1,3,4]:[0,1,2,3,4];
 const cards=picks.map(i=>({key:i,icon:story.items[i]}));
 const rng=rand(20261026+level*3479),scrambled=shuffle(cards,rng);
 if(scrambled.every((x,i)=>x.key===cards[i].key)) [scrambled[0],scrambled[1]]=[scrambled[1],scrambled[0]];
 const saved=validOrderCheckpoint(state.orderSession,level,cards)?state.orderSession:null;
 const fromKeys=keys=>keys.map(key=>cards.find(c=>c.key===key));
 return {kind:'ordering',level,title:'圖片排排隊',prompt:story.icon,voice:narrative[4],story,stepVoices:narrative[3],successVoice:narrative[5],correct:cards,cards:saved?fromKeys(saved.cards):scrambled,history:saved?saved.history.map(keys=>[...keys]):[],resumed:!!saved};
}
// v74: only restore the same level, scene and valid permutation.
function validPuzzleCheckpoint(s,level,scene,cols){
 const count=cols*cols;
 return !!(s&&s.level===level&&s.scene===scene&&s.cols===cols&&Array.isArray(s.pieces)&&s.pieces.length===count&&s.pieces.every(v=>Number.isInteger(v)&&v>=0&&v<count)&&new Set(s.pieces).size===count&&Number.isInteger(s.assistsLeft)&&s.assistsLeft>=0&&s.assistsLeft<=2&&s.pieces.some((v,i)=>v!==i));
}
function createQuestion(n,kind){if(kind==='ordering')return makeOrdering(state.orderLevel);if(kind==='differences')return makeDifferences(state.differenceLevel);if(kind==='maze')return makeMaze(state.mazeLevel);if(kind==='puzzle'){
 const k=state.puzzleLevel,cols=k<=3?2:k<=12?3:4,photos=window.YanFamilyPhotos||[],photoIdx=(k-1)%(photos.length+2),photo=photoIdx<photos.length?photos[photoIdx]:null,scene=photo?.id||(photoIdx===photos.length?'family-play':'family-home'),sceneUrl=photo?.puzzle||('./assets/'+scene+'-puzzle.webp'),sceneName=photo?.name||'親子相片',rng=rand(k*173+778),saved=validPuzzleCheckpoint(state.puzzleSession,k,scene,cols)?state.puzzleSession:null;
 const pieces=saved?[...saved.pieces]:shuffle(Array.from({length:cols*cols},(_,i)=>i),rng);
 if(pieces.every((v,i)=>v===i)){[pieces[0],pieces[1]]=[pieces[1],pieces[0]]}
 return {kind,title:'親子拼圖',prompt:'🧩',voice:'先看圖片，再點兩塊交換位置，把媽媽和彥彥的照片拼好。',level:k,cols,scene,sceneUrl,sceneName,pieces,assistsLeft:saved?saved.assistsLeft:2};
}const rng=rand(n*911+TYPES.indexOf(kind)*173),tier=Math.floor((n-1)/160),rows=tier<2?3:tier<5?4:tier<8?5:6;
 const max=Math.min(10,Math.max(rows,n<160?5:n<500?7:10));
 if(kind==='number'){const vals=take(Array.from({length:max},(_,i)=>i+1),rows,rng).sort((a,b)=>a-b),items=take(things,rows,rng),right=shuffle(vals.map((v,i)=>({key:v,content:group(items[i],v),speak:v+'個'})),rng);return {kind,voice:'把數字連到一樣多的圖案',left:vals.map(v=>({key:v,content:`<b>${v}</b>`,speak:String(v)})),right,title:'數字配數量',prompt:'🔢'};}
 if(kind==='picture'||kind==='shadow'){const items=take(kind==='shadow'?things.filter(x=>x.src):things,rows,rng),left=items.map(o=>({key:o.id,content:icon(o),speak:o.name||o.icon})),right=shuffle(items.map(o=>({key:o.id,content:kind==='shadow'?IMG(o,'shadow'):icon(o),speak:o.name||o.icon})),rng);return {kind,voice:kind==='shadow'?'把工程車連到它的影子':'把一樣的圖案連起來',left,right,title:kind==='shadow'?'影子配對':'圖片連連看',prompt:kind==='shadow'?'🌗':'🖼️'};}
 if(kind==='relation'){const pairs=take(relations,rows,rng),left=pairs.map((x,i)=>({key:i,content:icon(x[0]),speak:'找和它有關的東西'})),right=shuffle(pairs.map((x,i)=>({key:i,content:icon(x[1]),speak:x[1]})),rng);return {kind,voice:'把有關係的兩張圖案連起來',left,right,title:'生活關聯配對',prompt:'💡'};}
 if(kind==='pattern'){const k=tier<3?2:tier<7?3:4,base=take(['🍎','🐱','🚜','⭐','⚽','🌼','🐶','🚗'],k+3,rng),length=k===2?5:k===3?5:6,seq=Array.from({length},(_,i)=>base[i%k]),answer=base[length%k],options=shuffle([answer,...take(['🌟','🐻','⚽','🍌','🍓','🚗'].filter(x=>x!==answer),3,rng)],rng);return{kind,voice:'找出下一個圖案',seq,answer,options:options.map(x=>({id:x,content:icon(x)})),title:'找規律',prompt:'🧩'};}
 if(kind==='quiz'||kind==='classify'){const d=daily[mod(n*3+(kind==='classify'?9:0),daily.length)],options=shuffle([d[2],...d[3]],rng);return {kind,voice:d[1],subject:d[0],answer:d[2],options:options.map(x=>({id:x,content:icon(x)})),title:kind==='quiz'?'生活小知識':'生活分類',prompt:'🏡'};}
 if(kind==='find'){const items=take(things,6,rng),target=items[Math.floor(rng()*items.length)],options=shuffle(items,rng);return {kind,voice:'在下面找出一樣的圖案',subject:target,answer:target.id,options:options.map(x=>({id:x.id,content:icon(x)})),title:'找找看',prompt:'🔎'};}
 if(kind==='memory'){const items=take(things,4,rng),cards=shuffle([...items,...items],rng);return{kind,voice:'翻開卡片，找出一樣的兩張',cards,title:'記憶翻牌',prompt:'🃏'};}
 if(kind==='odd'){const theme=n%3===0?['🐶','🐱','🐰','🐻','🐸','🦋','🍎']:n%3===1?['🍎','🍌','🍇','🍓','🍉','🍊','⚽']:['🚗','🚲','🚌','🚜','🚒','🚓','🍪'];let foreign=theme[6],options=shuffle([...theme.slice(0,5),foreign],rng);return{kind,voice:'哪一個跟其他的不一樣？',answer:foreign,options:options.map(x=>({id:x,content:icon(x)})),title:'找出不一樣',prompt:'🔍'};}

 if(kind==='add'||kind==='subtract'){
  // v19: Every equation is a picture-to-picture matching task, never a written quiz.
  const plus=kind==='add',min=plus?2:1;
  const maxAnswer=plus?Math.min(10,Math.max(rows+2,5+Math.floor(n/200))):Math.min(9,Math.max(rows+1,4+Math.floor(n/200)));
  const answers=take(Array.from({length:maxAnswer-min+1},(_,i)=>i+min),rows,rng).sort((a,b)=>a-b);
  const emojiThings=things.filter(x=>!x.src),leftThings=take(emojiThings,rows,rng);
  const rightThings=take(emojiThings.filter(x=>!leftThings.some(y=>y.id===x.id)),rows,rng);
  const left=answers.map((answer,i)=>{
   const b=plus?1+Math.floor(rng()*(answer-1)):1+Math.floor(rng()*Math.min(10-answer,4+Math.floor(n/250)));
   const a=plus?answer-b:answer+b,object=leftThings[i];
   return {key:answer,a,b,speak:a+(plus?'加':'減')+b+'，是幾個？',
    content:`<span class="math-match-expression"><span class="math-match-pile">${group(object,a)}</span><span class="math-match-op">${plus?'＋':'−'}</span><span class="math-match-pile ${plus?'':'math-match-removed'}">${group(object,b)}</span></span>`};
  });
  const right=shuffle(answers.map((v,i)=>({key:v,content:group(rightThings[i],v),speak:v+'個'})),rng);
  return {kind,left,right,voice:plus?'聽一聽，數一數，兩邊加起來有幾個？把圖片連到一樣多的圖案。':'聽一聽，數一數，拿走畫叉叉的圖案，還剩幾個？把圖片連到一樣多的圖案。',title:plus?'加法圖片連連看':'減法圖片連連看',prompt:plus?'🍎＋🍎':'🍎−🍎'};
 }
 return createQuestion(n,'number');
}
function bg(which){return `<div class="art ${which}"></div><div class="art-shade"></div>`}
function renderHome(){musicStart();game=null;solved=false;const pct=Math.min(100,Math.round(state.unlocked/2000*100));app.innerHTML=`<section class="screen home">${bg(state.scene%2===0?'home':'alt')}<header class="bar"><button class="iconbtn" id="scene" aria-label="切換背景">🖼️</button><button class="iconbtn" id="fullscreen-home" aria-label="切換全螢幕">⛶</button><button class="iconbtn" id="settings" aria-label="設定">⚙️</button></header><div class="brand">🚜 彥彥配對樂園 <small>媽媽陪我玩・我也會自己玩</small></div><div class="spotlight"><div class="mascot-tag"><img src="./assets/mom.webp" alt="媽媽"><img src="./assets/kid.webp" alt="彥彥"> 我們一起出發！ ✨</div></div><div class="home-bottom"><div class="progress"><span>🏆 第 ${state.level} / 2000 關</span><div class="track"><div class="fill" style="width:${pct}%"></div></div><span>⭐ ${state.stars}</span></div><div class="game-launch-grid" role="group" aria-label="選擇想玩的遊戲">
<button class="game-launch featured wood-home-game" id="wood-home-go" aria-label="直接開始123木頭人"><span class="game-launch-icon">🚦</span><span class="game-launch-label">123木頭人</span></button>
<button class="game-launch featured" id="seek-home-go" aria-label="開始躲貓貓"><span class="game-launch-icon">🙈</span><span class="game-launch-label">躲貓貓</span></button>
<button class="game-launch featured journey-game" id="go" aria-label="綜合冒險：整合觀察力、生活家、動動腦、冒險旅程與冒險"><span class="game-launch-icon">🌈</span><span class="game-launch-label">綜合冒險</span></button>
<button class="game-launch featured puzzle-game" id="puzzle-go" aria-label="開始親子拼圖"><span class="game-launch-icon">🧩</span><span class="game-launch-label">拼圖</span></button>
<button class="game-launch featured maze-game" id="maze-go" aria-label="開始挖土機迷宮"><span class="game-launch-icon">🌀</span><span class="game-launch-label">迷宮</span></button>
<button class="game-launch featured differences-game" id="differences-go" aria-label="開始親子找不同"><span class="game-launch-icon">🔎</span><span class="game-launch-label">找不同</span></button>
<button class="game-launch featured ordering-game" id="ordering-go" aria-label="開始圖片排排隊"><span class="game-launch-icon">🪄</span><span class="game-launch-label">排排隊</span></button>
<button class="game-launch featured classic-game" id="classic-go" aria-label="瀏覽全部遊戲"><span class="game-launch-icon">🎲</span><span class="game-launch-label">全部遊戲</span></button>
${MODES.map((m,i)=>`<button class="game-launch legacy-game legacy-${i} ${state.mode===m[0]?'selected':''}" data-mode="${m[0]}" aria-label="開始${m[2]}"><span class="game-launch-icon">${m[1]}</span><span class="game-launch-label">${m[2]}</span></button>`).join('')}
</div><div class="tiny-actions"><button class="smallbtn" id="voice">${state.voice?'🔊 語音':'🔇 語音'}</button><button class="smallbtn" id="music">${state.music?'🎵 音樂':'🔕 音樂'}</button><button class="smallbtn" id="vibration">${state.haptic?'📳 震動':'📴 震動'}</button></div></div></section>`;
 const homeGrid=app.querySelector('.game-launch-grid'),more=document.createElement('details');more.className='kid-more allow-scroll';more.innerHTML='<summary>👨‍👩‍👧 其他遊戲</summary><div class="game-launch-grid"></div>';homeGrid.after(more);homeGrid.classList.add('kid-favorites');[...homeGrid.children].forEach(b=>{if(!['wood-home-go','seek-home-go','classic-go'].includes(b.id))more.lastElementChild.appendChild(b)});
 app.querySelector('#seek-home-go').onclick=()=>window.YanHideSeek?.start();
 app.querySelector('#wood-home-go').onclick=()=>{if(!window.YanGameHub?.run('action',0,false))window.YanClassics.wood()};
 app.querySelector('#go').onclick=()=>{state.mode='journey';persist();start()};app.querySelector('#puzzle-go').onclick=()=>{state.mode='puzzle';persist();start()};app.querySelector('#maze-go').onclick=()=>{state.mode='maze';persist();start()};app.querySelector('#differences-go').onclick=()=>{state.mode='differences';persist();start()};app.querySelector('#ordering-go').onclick=()=>{state.mode='ordering';persist();start()};app.querySelector('#classic-go').onclick=()=>{window.YanClassics.menu()};app.querySelector('#fullscreen-home').onclick=toggleFullscreen;app.querySelector('#scene').onclick=()=>{state.scene++;persist();renderHome()};app.querySelector('#settings').onclick=renderSettings;
 app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{const mode=b.dataset.mode;if(!Object.prototype.hasOwnProperty.call(MODESETS,mode))return;state.mode=mode;persist();start()});
 for(const [id,key] of [['voice','voice'],['music','music'],['vibration','haptic']])app.querySelector('#'+id).onclick=()=>{state[key]=!state[key];persist();if(key==='music'){if(state.music)musicStart();else musicStop()}renderHome()};
}
function renderSettings(){app.innerHTML=`<section class="screen home">${bg('alt')}<header class="bar"><button class="iconbtn" id="back">⌂</button><span class="chip">⚙️ 親子設定</span></header><div class="spotlight"></div><div class="glass" style="padding:18px;flex:none"><div style="display:flex;gap:8px;justify-content:center"><img style="height:85px;width:85px;border-radius:50%" src="./assets/mom.webp"><img style="height:85px;width:85px;border-radius:50%" src="./assets/kid.webp"></div><div class="setting-grid"><button data-toggle="voice">${state.voice?'🔊':'🔇'} 語音</button><button data-toggle="music">${state.music?'🎵':'🔕'} 音樂</button><button data-toggle="haptic">${state.haptic?'📳':'📴'} 震動</button><button id="replay">🔁 重玩當前關</button></div><p class="subtle">📱 固定手機畫面，不需上下滑動；用圖片與語音幫助學習。語音使用 Edge TTS 台灣中文，需要網路連線。</p></div><div class="spotlight"></div></section>`;app.querySelector('#back').onclick=renderHome;app.querySelector('#replay').onclick=()=>start();app.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const k=b.dataset.toggle;state[k]=!state[k];persist();if(k==='music'){if(state.music)musicStart();else musicStop()}renderSettings()})}
function start(){solved=false;errors=0;selected=null;matches=[];flipped=[];busy=false;const kind=getKind();game=createQuestion(state.level,kind);const q=game;if(kind==='differences')saveDifferences(q);const headLevel=kind==='ordering'?`🪄 ${state.orderLevel} / 120`:kind==='maze'?`🌀 ${state.mazeLevel} / 120`:kind==='puzzle'?`🧩 ${state.puzzleLevel} / 200`:kind==='differences'?`🔎 ${state.differenceLevel} / 120`:`${state.level} / 2000 ⭐`;
 app.innerHTML=`<section class="screen game play">${bg(state.level%2?'play':'home')}<header class="bar topbar"><button class="iconbtn" id="home" aria-label="回首頁">⌂</button><span class="chip">${q.title}</span><span class="chip">${headLevel}</span><button class="iconbtn fullscreen-toggle" id="fullscreen" aria-label="切換全螢幕" title="切換全螢幕">⛶</button></header><div class="buddy-strip"><img src="./assets/mom.webp" alt="媽媽"><div class="line"><span class="question-icon">${q.prompt}</span><span class="caption">${kind==='ordering'?q.story.name:kind==='maze'?'先尋寶，再開回家':kind==='puzzle'?'一起拼圖片':kind==='differences'?'找出小驚喜':kind==='quiz'||kind==='classify'?'看圖、聽一聽':'看圖連一連'}</span></div><img src="./assets/kid.webp" alt="彥彥"><button id="speak" aria-label="再聽一次">🔊</button></div><main class="stage"><div class="stage-title">${kind==='ordering'?q.story.icon+' '+q.story.name+'｜🔊 聽故事':q.voice.length>18?'🎧 按喇叭聽題目':q.voice}</div><div id="board" class="stage"></div></main><footer class="bottombar"><button class="footbtn blue" id="back">⌂ 首頁</button><button class="footbtn pink" id="hint">💡 提示</button><button class="footbtn yellow" id="again">🔄 重玩</button></footer></section>`;
 app.querySelector('#home').onclick=renderHome;app.querySelector('#back').onclick=renderHome;app.querySelector('#fullscreen').onclick=toggleFullscreen;app.querySelector('#again').onclick=()=>{if(kind==='differences')state.diffSession=null;if(kind==='puzzle')state.puzzleSession=null;if(kind==='ordering')state.orderSession=null;if(kind==='maze')state.mazeSession=null;if(q.left)delete state.pairSessions[state.mode];persist();start()};app.querySelector('#speak').onclick=()=>say(q.voice);app.querySelector('#hint').onclick=hint;const board=app.querySelector('#board');
 if(kind==='ordering'){renderOrdering(board,q)}
 else if(kind==='maze'){renderMaze(board,q)}
  else if(kind==='puzzle'){renderPuzzle(board,q)}
  else if(kind==='differences'){renderDifferences(board,q)}
 else if(q.left){const rows=q.left.length;board.innerHTML=`<div class="match-board" id="match" style="--rows:${rows}"><div class="match-col">${q.left.map((item,i)=>`<button class="match-node" data-side="l" data-i="${i}" aria-label="左側 ${item.speak}">${item.content}</button>`).join('')}</div><svg class="line-layer" id="lines" aria-hidden="true"></svg><div class="match-col">${q.right.map((item,i)=>`<button class="match-node" data-side="r" data-i="${i}" aria-label="右側 ${item.speak}">${item.content}</button>`).join('')}</div></div>`;if(kind==='add'||kind==='subtract')board.querySelector('#match').classList.add('math-match-board');wirePairs()}
 else if(kind==='memory'){board.innerHTML=`<div class="memory-grid">${q.cards.map((item,i)=>`<button class="memory-card" data-card="${i}" aria-label="翻開第${i+1}張">❓</button>`).join('')}</div>`;app.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>flip(+b.dataset.card))}
 else {let head='';if(kind==='quiz'||kind==='classify')head=`<div class="quiz-prompt stage-card"><span class="scene-emoji">${q.subject}</span><span style="font-size:40px">➡️ ❔</span></div>`;
 else if(kind==='find')head=`<div class="target-display stage-card"><strong>🎯</strong><span class="target">${icon(q.subject)}</span><strong>❔</strong></div>`;
 else if(kind==='pattern')head=`<div class="pattern-line">${q.seq.map(x=>`<span>${x}</span>`).join('')}<span>❔</span></div>`;
 else if(kind==='add'||kind==='subtract')head=`<div class="math-scene stage-card"><div class="math-bunch">${group(q.object,q.a)}</div><span class="op">${kind==='add'?'＋':'−'}</span><div class="math-bunch ${kind==='subtract'?'crossed':''}">${group(q.object,q.b)}</div><span class="op">＝ ❔</span></div>`;
 else if(kind==='odd')head=`<div class="quiz-prompt stage-card"><span class="scene-emoji">🔍</span><span class="scene-emoji">❔</span></div>`;
 board.innerHTML=head+`<div class="choice-grid ${q.options.length>4?'six':''}">${q.options.map((o,i)=>`<button class="choice" data-choice="${i}" aria-label="選項 ${i+1}">${o.content}</button>`).join('')}</div>`;app.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>choose(el,+el.dataset.choice));
 }
 if(state.voice){if(kind==='ordering')say(q.voice);else setTimeout(()=>{if(game===q&&!solved)say(q.voice)},250);}
}



// Tap-to-swap and drag-to-swap. No written instructions are required to solve.
function renderOrdering(board,q){
 let picked=null,down=null;
 board.innerHTML=`<div class="order-shell"><div class="order-scene"><img src="./assets/mom.webp" alt="媽媽"><span class="order-story-name">${q.story.icon} ${q.story.name}</span><button type="button" class="order-story-audio" id="story-replay" aria-label="再聽一次故事">🔊 故事</button><img src="./assets/kid.webp" alt="彥彥"></div><div class="order-track" id="order-track" style="--order-n:${q.cards.length}" role="group" aria-label="圖片排序"></div><div class="order-arrows" aria-hidden="true">${Array.from({length:q.cards.length},(_,i)=>i===q.cards.length-1?'🏁':'➜').map(x=>`<span>${x}</span>`).join('')}</div><div class="order-progress" id="order-progress">${'⭐'.repeat(q.cards.length)}　👩‍👦</div><div class="order-checkpoint"><button type="button" id="order-undo" aria-label="撤銷上一步交換">↶ 回上一步</button><span id="order-save-indicator" aria-live="polite">${q.resumed?'💾 接著上次排':'💾 自動存檔'}</span></div></div>`;
 const track=board.querySelector('#order-track'),status=board.querySelector('#order-progress'),undoBtn=board.querySelector('#order-undo'),saveIndicator=board.querySelector('#order-save-indicator');
 const saveOrder=()=>{state.orderSession={level:q.level,cards:q.cards.map(c=>c.key),history:q.history.map(keys=>[...keys])};persist()};
 function openStoryTheatre(){
  if(game!==q||board.querySelector('.order-theatre'))return;
  const cover=document.createElement('div');cover.className='order-theatre';
  cover.innerHTML=`<div class="theatre-panel"><div class="theatre-family"><img src="./assets/mom.webp" alt="媽媽"><div><div class="theatre-title">${q.story.icon} ${q.story.name}</div><div class="theatre-caption">👩‍👦 📖 ✨</div></div><img src="./assets/kid.webp" alt="彥彥"></div><button class="theatre-narrate" id="theatre-narrate" aria-label="聽媽媽說這一關的故事">🔊 👩 媽媽說故事</button><div class="theatre-steps" style="--story-count:${q.correct.length}">${q.correct.map((c,i)=>`<button class="theatre-step" data-story-step="${i}" aria-label="故事第${i+1}步：${q.stepVoices[c.key]}"><span class="theatre-number">${i+1}</span><span class="theatre-icon">${c.icon}</span><span class="theatre-arrow">${i===q.correct.length-1?'🏁':'➜'}</span></button>`).join('')}</div><button class="theatre-start" id="theatre-start" aria-label="開始圖片排序遊戲">▶️ 開始排排隊</button></div>`;
  board.appendChild(cover);
  cover.querySelector('#theatre-narrate').onclick=()=>say(q.voice);
  cover.querySelectorAll('[data-story-step]').forEach(btn=>btn.onclick=()=>{
   cover.querySelectorAll('.theatre-step').forEach(el=>el.classList.toggle('theatre-active',el===btn));
   const c=q.correct[Number(btn.dataset.storyStep)];say(q.stepVoices[c.key]);
  });
  cover.querySelector('#theatre-start').onclick=()=>{cover.remove();say('輪到彥彥排排看囉！')};
 }
 board.querySelector('#story-replay').onclick=()=>{openStoryTheatre();say(q.voice)};
 setTimeout(()=>{if(game===q&&!solved)openStoryTheatre()},30);
 function paint(){
  track.innerHTML=q.cards.map((c,i)=>`<button class="order-card ${picked===i?'picked':''} ${q.correct[i].key===c.key?'placed':''}" data-order="${i}" aria-label="第${i+1}張圖片：${q.stepVoices[c.key]}"><span class="order-num">${i+1}</span><span class="order-emoji">${c.icon}</span></button>`).join('');
  const count=q.cards.filter((c,i)=>c.key===q.correct[i].key).length;
  status.innerHTML=`<span>👩‍👦</span><span>${Array.from({length:q.cards.length},(_,i)=>i<count?'⭐':'☆').join('')}</span><span>🏁</span>`;
  undoBtn.disabled=q.history.length===0;
  saveIndicator.textContent=q.history.length?'💾 已保存 · 可返回':'💾 自動存檔';
 }
 function select(i){if(solved||game!==q)return;
  if(picked===null){picked=i;fx('tap');vib(8);say(q.stepVoices[q.cards[i].key]);paint();return}
  if(picked===i){picked=null;paint();return}
  q.history.push(q.cards.map(c=>c.key));if(q.history.length>12)q.history.shift();
  [q.cards[picked],q.cards[i]]=[q.cards[i],q.cards[picked]];picked=null;saveOrder();fx('yay');vib([12,20,12]);say(q.stepVoices[q.cards[i].key]+'，再看看故事的順序。');paint();
  if(q.cards.every((c,j)=>c.key===q.correct[j].key)){setTimeout(()=>{if(game===q&&!solved)finish()},330)}
 }
 undoBtn.onclick=()=>{if(solved||game!==q||!q.history.length)return;const previous=q.history.pop();q.cards=previous.map(key=>q.correct.find(c=>c.key===key));picked=null;saveOrder();paint();fx('hint');vib(12);say('回到上一步，再排排看！')};
 track.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-order]');if(!b)return;down={index:+b.dataset.order,x:e.clientX,y:e.clientY};});
 track.addEventListener('pointerup',e=>{if(!down)return;const from=down.index;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-order]');const to=el&&track.contains(el)?+el.dataset.order:null;down=null;if(to===null)return;
  if(to!==from){if(picked===null||picked!==from)picked=from;select(to)}else select(from);
 });
 track.addEventListener('pointercancel',()=>{down=null});
 track.addEventListener('click',e=>{if(e.detail!==0)return;const b=e.target.closest('[data-order]');if(b)select(+b.dataset.order)});
 board.orderHint=()=>{const idx=q.cards.findIndex((c,i)=>c.key!==q.correct[i].key);if(idx<0)return;const target=q.cards.findIndex(c=>c.key===q.correct[idx].key);[idx,target].forEach(i=>track.querySelector(`[data-order="${i}"]`)?.classList.add('order-hint'));setTimeout(()=>{if(game===q)track.querySelectorAll('.order-hint').forEach(x=>x.classList.remove('order-hint'))},1500)};
 saveOrder();paint();
}

function renderDifferences(board,q){
 const spots=q.spots;
 board.innerHTML=`<div class="diff-shell"><div class="diff-status"><span>🔎 <b id="diff-count">0</b> / ${spots.length}</span><span class="diff-dots" id="diff-dots">${spots.map(()=>'<span>○</span>').join('')}</span><span class="diff-scene-name">${q.sceneName}</span></div><div class="diff-relay-bar"><button type="button" id="diff-relay-toggle" aria-pressed="${state.diffRelay}">👩‍👦 親子接力</button><span id="diff-turn" aria-live="polite">🚜 彥彥找</span><span id="diff-score">👦 0 · 👩 0</span></div><div class="diff-scenes" id="diff-scenes"><div class="diff-frame diff-original" data-frame="original" aria-label="上方原圖"><div class="diff-art" style="background-image:url('${q.sceneUrl}')"></div><span class="diff-label">① 👀</span></div><div class="diff-frame diff-changed" data-frame="changed" aria-label="下方圖片，找出多出來的物件"><div class="diff-art" style="background-image:url('${q.sceneUrl}')"></div><span class="diff-label">② 🔎</span>${spots.map(s=>`<button class="diff-spot" data-spot="${s.id}" style="left:${s.x}%;top:${s.y}%" aria-label="找不同圖案 ${s.id+1}">${s.icon}</button>`).join('')}</div></div><div class="diff-guide diff-zoom-toolbar"><button type="button" id="diff-zoom-toggle" aria-pressed="false">🔍 放大看</button><span id="diff-zoom-status" aria-live="polite">👀 找出不一樣</span></div></div>`;
 const changed=board.querySelector('.diff-changed'),original=board.querySelector('.diff-original');
 const relayBtn=board.querySelector('#diff-relay-toggle'),turn=board.querySelector('#diff-turn'),score=board.querySelector('#diff-score');

 const zoomBtn=board.querySelector('#diff-zoom-toggle'),zoomStatus=board.querySelector('#diff-zoom-status');
 let view=diffView(q.view),drag=null,suppressClickUntil=0;
 const frames=[original,changed];
 function saveView(){q.view=diffView(view);saveDifferences(q)}
 function paintView(){
  const z=view.zoom,tx=(50-view.panX)*z,ty=(50-view.panY)*z;
  for(const frame of frames){
   frame.classList.toggle('diff-zoomed',z>1);
   const art=frame.querySelector('.diff-art');
   if(art)art.style.transform='translate('+tx+'%,'+ty+'%) scale('+z+')';
   frame.querySelectorAll('[data-ring]').forEach(el=>{
    const s=spots[Number(el.dataset.ring)];if(!s)return;
    el.style.left=(50+(s.x-view.panX)*z)+'%';el.style.top=(50+(s.y-view.panY)*z)+'%';
   });
  }
  changed.querySelectorAll('[data-spot]').forEach(el=>{
   const s=spots[Number(el.dataset.spot)];if(!s)return;
   el.style.left=(50+(s.x-view.panX)*z)+'%';el.style.top=(50+(s.y-view.panY)*z)+'%';
  });
  zoomBtn.textContent=z>1?'🗺️ 看全圖':'🔍 放大看';
  zoomBtn.setAttribute('aria-pressed',String(z>1));
  zoomStatus.textContent=z>1?'👆 拖動圖片看四周':'👀 找出不一樣';
 }
 zoomBtn.onclick=()=>{
  view=diffView({zoom:view.zoom>1?1:1.9,panX:50,panY:50});
  paintView();saveView();
  say(view.zoom>1?'放大了！用手指拖動上下圖片找不同。':'回到完整圖片了！');
 };
 function startPan(e){
  if(view.zoom===1||e.target.closest('.diff-spot')||(e.button!==undefined&&e.button!==0))return;
  const rect=e.currentTarget.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,panX:view.panX,panY:view.panY,width:rect.width,height:rect.height,moved:false};
  try{e.currentTarget.setPointerCapture?.(e.pointerId)}catch(_){}
 }
 function movePan(e){
  if(!drag||e.pointerId!==drag.pointer)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<7)return;
  drag.moved=true;
  view=diffView({zoom:view.zoom,panX:drag.panX-dx/drag.width*100/view.zoom,panY:drag.panY-dy/drag.height*100/view.zoom});
  paintView();
 }
 function endPan(e){
  if(!drag||e.pointerId!==drag.pointer)return;
  if(drag.moved){suppressClickUntil=Date.now()+350;saveView()}
  drag=null;
  try{e.currentTarget.releasePointerCapture?.(e.pointerId)}catch(_){}
 }
 for(const frame of frames){
  frame.addEventListener('pointerdown',startPan);
  frame.addEventListener('pointermove',movePan);
  frame.addEventListener('pointerup',endPan);
  frame.addEventListener('pointercancel',endPan);
 }
 function update(){
  board.querySelector('#diff-count').textContent=q.found.length;
  board.querySelector('#diff-dots').innerHTML=spots.map(s=>`<span class="${q.found.includes(s.id)?'done':''}">${q.found.includes(s.id)?'⭐':'○'}</span>`).join('');
  relayBtn.textContent=state.diffRelay?'👩‍👦 接力：開':'👩‍👦 接力：關';
  relayBtn.setAttribute('aria-pressed',String(state.diffRelay));
  turn.textContent=state.diffRelay?(q.relayTurn==='mom'?'👩 媽媽找':'🚜 彥彥找'):'🚜 彥彥自己找';
  score.textContent=`👦 ${q.finders.filter(x=>x==='kid').length} · 👩 ${q.finders.filter(x=>x==='mom').length}`;
 }
 function paintFound(id){
  const s=spots[id],spot=changed.querySelector(`[data-spot="${id}"]`);
  spot?.classList.add('found');spot?.setAttribute('aria-label','已找到');
  for(const frame of [original,changed]){const ring=document.createElement('span');ring.className='diff-ring';ring.dataset.ring=String(id);ring.textContent='✓';frame.appendChild(ring);paintView()}
 }
 function mark(id){
  if(solved||game!==q||q.found.includes(id))return;
  const actor=state.diffRelay?q.relayTurn:'kid';
  q.found.push(id);q.finders.push(actor);
  if(state.diffRelay)q.relayTurn=actor==='kid'?'mom':'kid';
  saveDifferences(q);fx('yay');vib([10,22,10]);paintFound(id);update();
  if(q.found.length===spots.length)setTimeout(()=>{if(game===q&&!solved)finish()},450);
  else if(state.diffRelay)say(q.relayTurn==='mom'?'輪到媽媽找不一樣的地方！':'輪到彥彥找不一樣的地方！');
 }
 relayBtn.onclick=()=>{state.diffRelay=!state.diffRelay;persist();update();say(state.diffRelay?(q.relayTurn==='mom'?'輪到媽媽找！':'輪到彥彥找！'):'彥彥自己找找看！')};
 changed.querySelectorAll('[data-spot]').forEach(btn=>btn.onclick=()=>mark(Number(btn.dataset.spot)));
 function tapFrame(e){
  if(e.target.closest('.diff-spot')||Date.now()<suppressClickUntil)return;
  const rect=e.currentTarget.getBoundingClientRect(),sx=(e.clientX-rect.left)/rect.width*100,sy=(e.clientY-rect.top)/rect.height*100;
  const x=view.panX+(sx-50)/view.zoom,y=view.panY+(sy-50)/view.zoom;
  const hit=spots.filter(s=>!q.found.includes(s.id)).map(s=>({s,dist:Math.hypot((s.x-x)*rect.width/100*view.zoom,(s.y-y)*rect.height/100*view.zoom)})).sort((a,b)=>a.dist-b.dist)[0];
  if(hit&&hit.dist<=Math.max(24,Math.min(35,rect.width*.1)))mark(hit.s.id);
  else{fx('error');vib(10);e.currentTarget.classList.remove('diff-shake');void e.currentTarget.offsetWidth;e.currentTarget.classList.add('diff-shake')}
 }
 original.addEventListener('click',tapFrame);changed.addEventListener('click',tapFrame);
 board.diffHint=()=>{const s=spots.find(x=>!q.found.includes(x.id));if(!s)return;
  if(view.zoom>1){const sx=50+(s.x-view.panX)*view.zoom,sy=50+(s.y-view.panY)*view.zoom;if(sx<18||sx>82||sy<18||sy>82){view=diffView({zoom:view.zoom,panX:s.x,panY:s.y});paintView();saveView()}}
  const el=changed.querySelector(`[data-spot="${s.id}"]`);el?.classList.add('diff-hint');setTimeout(()=>{if(game===q)el?.classList.remove('diff-hint')},1700)};
 q.found.forEach(paintFound);paintView();update();
 if(q.found.length===spots.length)setTimeout(()=>{if(game===q&&!solved)finish()},300);
}
function renderMaze(board,q){
 const n=q.size;
 board.innerHTML=`<div class="maze-shell"><div class="maze-status"><span>🚜 ${q.level} 關</span><span id="maze-gems" aria-live="polite">💎 0/${q.treasures.length}</span><span id="maze-steps">👣 0</span></div><div class="maze-grid" id="maze-grid" style="--maze-size:${n}" role="group" aria-label="${n}乘${n}格挖土機尋寶迷宮"></div><div class="maze-controls" aria-label="方向控制"><button data-dir="up" aria-label="向上">⬆️</button><button data-dir="left" aria-label="向左">⬅️</button><button data-dir="down" aria-label="向下">⬇️</button><button data-dir="right" aria-label="向右">➡️</button></div><div class="maze-guide-tools" role="group" aria-label="迷宮媽媽帶路"><button type="button" id="maze-guide-toggle" aria-pressed="${state.mazeGuide}">${state.mazeGuide?"🧭 指路開啟":"🧭 指路關閉"}</button><button type="button" id="maze-guide-step">👣 媽媽牽手一步</button><button type="button" id="maze-undo" aria-label="退回上一步">↶ 退一步</button></div><p class="maze-help" id="maze-help">👆 按住🚜沿路拖，收齊💎再回家</p></div>`;
 const grid=board.querySelector('#maze-grid'),steps=board.querySelector('#maze-steps'),gems=board.querySelector('#maze-gems'),help=board.querySelector('#maze-help'),guideToggle=board.querySelector('#maze-guide-toggle'),undoBtn=board.querySelector('#maze-undo');
 function paint(){
  const next=state.mazeGuide?mazeGuideRoute(q)[0]:undefined;
  grid.innerHTML=q.walls.map((w,i)=>{
   const here=i===q.position,goal=i===q.goal,visited=q.visited.includes(i),treasure=q.treasures.includes(i)&&!q.collected.includes(i),locked=goal&&q.collected.length<q.treasures.length;
   return `<button class="maze-cell ${here?'maze-player':''} ${goal?'maze-goal':''} ${locked?'maze-locked':''} ${treasure?'maze-treasure':''} ${visited?'maze-trail':''} ${i===next?'maze-guide-next':''}" data-cell="${i}" aria-label="第${Math.floor(i/n)+1}排第${i%n+1}格${here?'，挖土機':''}${treasure?'，寶石':''}${goal?(locked?'，終點還鎖著，先收集寶石':'，終點小房子'):''}" style="border-top-width:${w&1?4:0}px;border-right-width:${w&2?4:0}px;border-bottom-width:${w&4?4:0}px;border-left-width:${w&8?4:0}px">${here?'<img src="./assets/excavator.webp" alt="挖土機">':treasure?'<span class="maze-gem" aria-hidden="true">💎</span>':goal?'<span class="maze-house">🏠</span>':visited?'<span class="maze-footprint">•</span>':''}</button>`;
  }).join('');
  steps.textContent=`👣 ${q.steps}`;gems.textContent=`💎 ${q.collected.length}/${q.treasures.length}`;
  help.textContent=q.resumed?'💾 已接續上次！繼續找寶石':q.collected.length===q.treasures.length?'🎉 寶石收齊！快回家 🏠':state.mazeGuide?'🧭 跟著發光的格子，先找寶石！':q.steps>0?'💾 已存檔 · 💎 找寶石再回家':'👆 按住🚜沿路拖，收齊💎再回家';
  undoBtn.disabled=q.steps===0;
  guideToggle.textContent=state.mazeGuide?'🧭 指路開啟':'🧭 指路關閉';guideToggle.setAttribute('aria-pressed',String(state.mazeGuide));
 }
 function move(dr,dc){
  if(solved||game!==q)return false;
  const r=Math.floor(q.position/n),c=q.position%n,nr=r+dr,nc=c+dc;
  if(nr<0||nr>=n||nc<0||nc>=n){fx('error');vib(18);return false}
  const next=nr*n+nc;
  if(!mazeNeighbors(q,q.position).includes(next)){fx('error');vib(18);grid.classList.remove('maze-bump');void grid.offsetWidth;grid.classList.add('maze-bump');return false}
  const earlyExit=next===q.goal&&q.collected.length<q.treasures.length;
  q.position=next;q.steps++;q.visited.push(next);
  if(q.treasures.includes(next)&&!q.collected.includes(next)){
   q.collected.push(next);fx('yay');vib([18,25,35]);
   const left=q.treasures.length-q.collected.length;
   say(left?'找到寶石！還有'+left+'顆！':'太棒了！寶石都找到了，快回家！');
  }else if(earlyExit){fx('error');vib(32);say('還有寶石沒找到！先找到所有寶石，再回家。')}
  else{fx('tap');vib(9)}
  q.resumed=false;saveMaze(q);paint();
  if(next===q.goal&&q.collected.length===q.treasures.length)setTimeout(()=>{if(game===q&&!solved&&q.position===q.goal&&q.collected.length===q.treasures.length)finish()},260);
  return true;
 }
 undoBtn.onclick=()=>{
  if(solved||game!==q||q.visited.length<=1)return;
  const last=q.visited.pop();q.position=q.visited[q.visited.length-1];q.steps--;
  if(q.treasures.includes(last)&&!q.visited.includes(last))q.collected=q.collected.filter(v=>v!==last);
  q.resumed=false;saveMaze(q);fx('tap');vib(8);paint();
 };
 guideToggle.onclick=()=>{state.mazeGuide=!state.mazeGuide;persist();paint();say(state.mazeGuide?'媽媽會用亮亮的格子幫你指路！':'現在彥彥自己挑戰迷宮！')};
 board.querySelector('#maze-guide-step').onclick=()=>{if(solved||game!==q)return;const next=mazeGuideRoute(q)[0];if(next===undefined)return;const dr=Math.floor(next/n)-Math.floor(q.position/n),dc=next%n-q.position%n;move(dr,dc)};
 const moveByName={up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]};
 board.querySelectorAll('[data-dir]').forEach(el=>el.onclick=()=>move(...moveByName[el.dataset.dir]));
 let suppressMazeClick=false;
 grid.addEventListener('click',e=>{if(suppressMazeClick)return;const cell=e.target.closest('[data-cell]');if(!cell)return;const target=+cell.dataset.cell;const dr=Math.floor(target/n)-Math.floor(q.position/n),dc=target%n-q.position%n;if(Math.abs(dr)+Math.abs(dc)===1)move(dr,dc)});
 // v86: drag the excavator through a sequence of legal adjacent cells.
 // Reuse move() for walls, gems, steps, checkpoint, win and undo.
 let gesture=null;
 grid.addEventListener('pointerdown',e=>{
  const cell=e.target.closest?.('[data-cell]');
  const follow=!!cell&&Number(cell.dataset.cell)===q.position;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,follow,dragged:false};
  if(follow){grid.classList.add('maze-dragging');try{grid.setPointerCapture(e.pointerId)}catch(_){}}
 },{passive:true});
 grid.addEventListener('pointermove',e=>{
  if(!gesture||!gesture.follow||gesture.id!==e.pointerId||solved||game!==q)return;
  const hit=document.elementFromPoint(e.clientX,e.clientY);
  const cell=hit&&hit.closest?.('[data-cell]');
  if(!cell||!grid.contains(cell))return;
  const target=Number(cell.dataset.cell);
  if(!Number.isInteger(target)||target<0||target>=n*n)return;
  const dr=Math.floor(target/n)-Math.floor(q.position/n),dc=target%n-q.position%n;
  if(dr&&dc)return;
  const count=Math.abs(dr)+Math.abs(dc),stepR=Math.sign(dr),stepC=Math.sign(dc);
  for(let i=0;i<count;i++){if(!move(stepR,stepC))break;gesture.dragged=true}
 });
 grid.addEventListener('pointerup',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  const last=gesture;gesture=null;
  if(last.follow){grid.classList.remove('maze-dragging');try{grid.releasePointerCapture(e.pointerId)}catch(_){}}
  if(last.dragged){suppressMazeClick=true;setTimeout(()=>{suppressMazeClick=false},0);return}
  const dx=e.clientX-last.x,dy=e.clientY-last.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
  if(Math.abs(dx)>Math.abs(dy))move(0,Math.sign(dx));else move(Math.sign(dy),0);
 });
 grid.addEventListener('pointercancel',()=>{gesture=null;grid.classList.remove('maze-dragging')});
 board.mazeHint=()=>{
  const route=mazeGuideRoute(q).slice(0,3);
  grid.querySelectorAll('.maze-hint').forEach(el=>el.classList.remove('maze-hint'));
  route.forEach(i=>grid.querySelector(`[data-cell="${i}"]`)?.classList.add('maze-hint'));
  setTimeout(()=>{if(game===q)grid.querySelectorAll('.maze-hint').forEach(el=>el.classList.remove('maze-hint'))},1800);
 };
 paint();
}

function renderPuzzle(board,q){
 const n=q.cols;game.pieces=[...q.pieces];selected=null;
 board.innerHTML=`<div class="puzzle-shell"><div class="puzzle-info"><div class="puzzle-preview" style="background-image:url('${q.sceneUrl}')" aria-label="完成拼圖參考圖"></div><div class="puzzle-tips"><strong>👆 交換兩塊拼圖</strong><span>🧩 ${n} × ${n} ・ ${q.sceneName}</span></div><button class="puzzle-peek" id="peekPuzzle" aria-label="放大查看完成圖片">👀</button></div><div class="puzzle-grid" id="puzzle-grid" style="--puzzle-n:${n}" aria-label="親子圖片拼圖"></div><div class="puzzle-tools"><span class="puzzle-below" id="puzzle-progress" aria-live="polite"></span><button class="puzzle-assist" id="puzzle-assist" aria-label="媽媽幫忙拼好一塊"></button></div></div>`;
 const grid=board.querySelector('#puzzle-grid'),status=board.querySelector('#puzzle-progress'),helpBtn=board.querySelector('#puzzle-assist');
 let downIndex=null;
 const save=()=>{state.puzzleSession={level:q.level,scene:q.scene,cols:n,pieces:[...game.pieces],assistsLeft:q.assistsLeft};persist()};
 const draw=()=>{
  grid.innerHTML=game.pieces.map((piece,pos)=>{
   const x=(piece%n)*100/(n-1),y=Math.floor(piece/n)*100/(n-1);
   return `<button class="puzzle-piece ${piece===pos?'in-place':''} ${selected===pos?'chosen':''}" data-pos="${pos}" data-piece="${piece}" aria-label="拼圖第${pos+1}塊" style="background-image:url('${q.sceneUrl}');background-size:${n*100}% ${n*100}%;background-position:${x}% ${y}%"></button>`;
  }).join('');
  grid.querySelectorAll('.puzzle-piece').forEach(el=>{
   el.addEventListener('pointerdown',()=>{downIndex=Number(el.dataset.pos);chooseTile(downIndex)},{passive:true});
   el.addEventListener('click',e=>{if(e.detail===0)chooseTile(Number(el.dataset.pos))});
  });
  status.textContent=`🧩 ${game.pieces.filter((p,i)=>p===i).length} / ${n*n} 塊`;
  helpBtn.disabled=q.assistsLeft===0;
  helpBtn.textContent=q.assistsLeft?`👩 幫我一塊 ×${q.assistsLeft}`:'👩 已用完';
 };
 const checkWin=()=>{if(game.pieces.every((p,i)=>p===i))setTimeout(()=>{if(game===q&&!solved)finish()},240)};
 function chooseTile(pos){
  if(solved||game!==q)return;
  if(selected===null){selected=pos;fx('tap');draw();return}
  if(selected===pos){selected=null;draw();return}
  const prior=selected;selected=null;
  [game.pieces[prior],game.pieces[pos]]=[game.pieces[pos],game.pieces[prior]];
  fx('yay');vib([14,30,14]);save();draw();checkWin();
 }
 helpBtn.onclick=()=>{
  if(solved||game!==q||q.assistsLeft<1)return;
  const target=selected!==null&&game.pieces[selected]!==selected?selected:game.pieces.findIndex((p,i)=>p!==i);
  if(target<0)return;
  const from=game.pieces.indexOf(target);
  if(from<0||from===target)return;
  [game.pieces[target],game.pieces[from]]=[game.pieces[from],game.pieces[target]];
  q.assistsLeft--;selected=null;fx('yay');vib([14,20,14]);save();draw();
  say('媽媽幫你拼好一塊，換彥彥繼續！');checkWin();
 };
 grid.addEventListener('pointerup',e=>{
  if(downIndex===null||solved)return;
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.puzzle-piece');
  if(target&&target.closest('#puzzle-grid')&&Number(target.dataset.pos)!==downIndex&&selected!==null)chooseTile(Number(target.dataset.pos));
  downIndex=null;
 });
 grid.addEventListener('pointercancel',()=>{downIndex=null});
 board.querySelector('#peekPuzzle').onclick=()=>{
  const overlay=document.createElement('div');overlay.className='puzzle-image-overlay';
  overlay.innerHTML=`<img src="${q.sceneUrl}" alt="親子拼圖完整參考圖片"><button aria-label="返回拼圖">✅ 繼續拼圖</button>`;
  overlay.addEventListener('click',()=>overlay.remove());board.closest('.screen').appendChild(overlay);
 };
 save();draw();
}

// v76: two mother-guided pairs per matching level, checkpointed per mode.
function validPairCheckpoint(q,saved){
 if(!saved||typeof saved!=='object'||Array.isArray(saved)||!q?.left||!q?.right)return false;
 if(saved.level!==state.level||saved.mode!==state.mode||saved.kind!==q.kind)return false;
 const signature=JSON.stringify([q.left.map(x=>x.key),q.right.map(x=>x.key)]);
 if(saved.signature!==signature||!Number.isInteger(saved.assistsLeft)||saved.assistsLeft<0||saved.assistsLeft>2)return false;
 if(!Array.isArray(saved.matches)||saved.matches.length>=q.left.length)return false;
 const usedL=new Set(),usedR=new Set();
 return saved.matches.every(m=>{
  if(!m||!Number.isInteger(m.l)||!Number.isInteger(m.r)||m.l<0||m.r<0||m.l>=q.left.length||m.r>=q.right.length||usedL.has(m.l)||usedR.has(m.r)||q.left[m.l].key!==q.right[m.r].key)return false;
  usedL.add(m.l);usedR.add(m.r);return true;
 });
}
function wirePairs(){
 const board=app.querySelector('#match'),q=game,stored=state.pairSessions[state.mode];
 const saved=validPairCheckpoint(q,stored)?stored:null;
 q.assistsLeft=saved?saved.assistsLeft:2;
 if(saved)matches=saved.matches.map(m=>({l:m.l,r:m.r}));
 board.insertAdjacentHTML('afterend','<div class="pair-rescue-tools" role="group" aria-label="連連看媽媽幫忙"><button type="button" id="pair-rescue" aria-label="媽媽幫我連好一對"></button><span id="pair-saved" aria-live="polite"></span></div>');
 const helpBtn=app.querySelector('#pair-rescue'),status=app.querySelector('#pair-saved');
 const save=()=>{
  state.pairSessions[state.mode]={level:state.level,mode:state.mode,kind:q.kind,signature:JSON.stringify([q.left.map(x=>x.key),q.right.map(x=>x.key)]),matches:matches.map(m=>({l:m.l,r:m.r})),assistsLeft:q.assistsLeft};
  persist();
 };
 function paint(){
  board.querySelectorAll('.match-node').forEach(node=>{
   const side=node.dataset.side,i=Number(node.dataset.i);
   node.classList.toggle('solved',matches.some(m=>m[side]===i));
  });
  helpBtn.disabled=solved||q.assistsLeft<1||matches.length===q.left.length;
  helpBtn.textContent=q.assistsLeft?'👩 媽媽幫我一對 ×'+q.assistsLeft:'👩 已幫完';
  status.textContent='🧩 '+matches.length+'/'+q.left.length+' 對 · 💾 '+(saved&&matches.length?'繼續上次':'已保存');
  drawLines();
 }
 function complete(l,r,assisted=false){
  if(solved||game!==q||matches.some(m=>m.l===l||m.r===r)||q.left[l]?.key!==q.right[r]?.key)return false;
  matches.push({l,r});selected=null;
  board.querySelectorAll('.match-node').forEach(n=>n.classList.remove('picked'));
  fx('yay');vib([15,25,15]);save();paint();
  if(assisted)say('媽媽幫你連好一對！換彥彥自己試試看！');
  if(matches.length===q.left.length)finish();
  return true;
 }
 let downAt=null;
 function onSelect(node){
  if(solved||game!==q||!node)return;
  const side=node.dataset.side,i=Number(node.dataset.i);
  if(matches.some(m=>m[side]===i))return;
  if(selected&&selected.side!==side){
   const l=side==='l'?i:selected.i,r=side==='r'?i:selected.i;
   selected=null;board.querySelectorAll('.match-node').forEach(n=>n.classList.remove('picked'));
   if(q.left[l]?.key===q.right[r]?.key)complete(l,r);
   else wrong(node);
  }else{
   selected={side,i};board.querySelectorAll('.match-node').forEach(n=>n.classList.toggle('picked',n===node));
   if(side==='l')say(q.left[i].speak);
  }
 }
 board.querySelectorAll('.match-node').forEach(n=>{
  n.addEventListener('pointerdown',()=>{downAt={side:n.dataset.side,i:Number(n.dataset.i)};onSelect(n)},{passive:true});
  n.addEventListener('click',e=>{if(e.detail===0)onSelect(n)});
 });
 board.addEventListener('pointerup',e=>{
  if(!selected||!downAt)return;
  const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('.match-node');
  if(el&&el.dataset.side!==downAt.side&&el.dataset.side!==undefined)onSelect(el);
  downAt=null;
 });
 board.addEventListener('pointercancel',()=>{downAt=null});
 helpBtn.onclick=()=>{
  if(solved||game!==q||q.assistsLeft<1)return;
  const l=q.left.findIndex((_,i)=>!matches.some(m=>m.l===i));
  if(l<0)return;
  const r=q.right.findIndex((item,i)=>item.key===q.left[l].key&&!matches.some(m=>m.r===i));
  if(r<0)return;
  q.assistsLeft--;
  complete(l,r,true);
 };
 if(!saved)save();
 paint();
}
function drawLines(){const board=app.querySelector('#match'),svg=app.querySelector('#lines');if(!board||!svg)return;const b=board.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${b.width} ${b.height}`);svg.innerHTML=matches.map(({l,r},i)=>{const a=board.querySelector(`[data-side=l][data-i="${l}"]`).getBoundingClientRect(),c=board.querySelector(`[data-side=r][data-i="${r}"]`).getBoundingClientRect();let y1=a.top+a.height/2-b.top,y2=c.top+c.height/2-b.top,x1=a.right-b.left-4,x2=c.left-b.left+4;const color=['#ff8bba','#39a8e9','#60c58f','#ffbb33','#9e86f9','#fc8c55'][i%6];return `<path d="M${x1} ${y1} C${x1+25} ${y1},${x2-25} ${y2},${x2} ${y2}" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/><path d="M${x1} ${y1} C${x1+25} ${y1},${x2-25} ${y2},${x2} ${y2}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`}).join('')}
window.addEventListener('resize',()=>{if(game?.left)drawLines()});
function wrong(el){errors++;fx('error');vib(38);el.classList.add('wrong');setTimeout(()=>el.classList.remove('wrong'),330)}
function choose(el,i){if(solved)return;const choice=game.options[i];if(choice.id===game.answer){el.classList.add('correct');fx('yay');vib([12,20,12]);finish()}else wrong(el)}
function flip(i){if(solved||busy||flipped.includes(i))return;const btn=app.querySelector(`[data-card="${i}"]`),c=game.cards[i];if(btn.classList.contains('done'))return;btn.classList.add('up');btn.innerHTML=icon(c);flipped.push(i);if(flipped.length===2){const [a,b]=flipped;if(game.cards[a].id===game.cards[b].id){for(const ix of flipped)app.querySelector(`[data-card="${ix}"]`).classList.add('done');fx('yay');vib([10,15,10]);flipped=[];if(app.querySelectorAll('.memory-card.done').length===game.cards.length)finish()}else{busy=true;errors++;fx('error');setTimeout(()=>{for(const ix of flipped){let n=app.querySelector(`[data-card="${ix}"]`);if(n){n.classList.remove('up');n.textContent='❓'}}flipped=[];busy=false},620)}}}
function hint(){if(solved)return;fx('hint');say(game.voice);if(game.kind==='ordering'){app.querySelector('#board')?.orderHint?.();say('想想看，'+game.story.name+'的故事，哪一張圖片應該先發生？')}
 else if(game.kind==='differences'){app.querySelector('#board')?.diffHint?.();say('看看閃亮亮的小圖案在哪裡！')}
 else if(game.kind==='maze'){app.querySelector('#board')?.mazeHint?.();say(game.collected.length===game.treasures.length?'寶石都收齊了！沿著亮亮的格子回家。':'跟著發光的格子，先去找亮晶晶的寶石！')}
  else if(game.kind==='puzzle'){const grid=app.querySelector('.puzzle-grid');grid?.classList.add('puzzle-reveal');setTimeout(()=>grid?.classList.remove('puzzle-reveal'),1600);say('看看完整圖片在哪個位置，把拼圖拼好');}
 else if(game.left){let l=game.left.findIndex((_,i)=>!matches.some(m=>m.l===i));let r=game.right.findIndex(x=>x.key===game.left[l].key);[app.querySelector(`[data-side=l][data-i="${l}"]`),app.querySelector(`[data-side=r][data-i="${r}"]`)].forEach(x=>{x?.classList.add('hint');setTimeout(()=>x?.classList.remove('hint'),1250)})}
 else if(game.kind==='memory'){let todo=game.cards.map((x,i)=>({x,i})).filter(({i})=>!app.querySelector(`[data-card="${i}"]`)?.classList.contains('done'));let a=todo[0],b=todo.find(y=>y.i!==a.i&&y.x.id===a.x.id);[a,b].forEach(y=>{const el=app.querySelector(`[data-card="${y.i}"]`);el?.classList.add('hint');setTimeout(()=>el?.classList.remove('hint'),1250)})}
 else{const choice=app.querySelector(`[data-choice="${game.options.findIndex(x=>x.id===game.answer)}"]`);choice?.classList.add('hint');setTimeout(()=>choice?.classList.remove('hint'),1250)} }
function finish(){if(solved)return;solved=true;fx('win');vib([25,50,25,40,70]);const stars=Math.max(1,3-Math.floor(errors/2));state.stars+=stars;state.complete++;if(game?.kind==='differences')state.diffSession=null;if(game?.kind==='puzzle')state.puzzleSession=null;if(game?.kind==='ordering')state.orderSession=null;if(game?.kind==='maze')state.mazeSession=null;if(game?.left)delete state.pairSessions[state.mode];state.unlocked=Math.max(state.unlocked,Math.min(2000,state.level+1));persist();const win=document.createElement('div');win.className='overlay';win.innerHTML=`<div class="popup"><div class="faces"><img src="./assets/mom.webp" alt="媽媽"><img src="./assets/kid.webp" alt="彥彥"></div><div class="stars">${'⭐'.repeat(stars)}</div><h2>${game?.kind==='ordering'?game.story.name+'完成！':'太棒了！🎉'}</h2><p>${game?.kind==='ordering'?game.successVoice:'媽媽和彥彥一起完成挑戰！'}</p><button class="primary" id="next">下一關 ▶</button></div>`;app.querySelector('.screen').appendChild(win);for(let i=0;i<13;i++){let c=document.createElement('span');c.className='flash-confetti';c.style.setProperty('--x',(Math.random()*94+3)+'%');c.style.animationDelay=Math.random()*.35+'s';c.textContent=['⭐','🎈','✨','🌼','💛'][i%5];win.appendChild(c)}say(game?.kind==='ordering'?game.successVoice:'彥彥太棒了！我們一起挑戰下一關吧');win.querySelector('#next').onclick=()=>{if(game?.kind==='ordering'){state.orderLevel=state.orderLevel<120?state.orderLevel+1:1;if(state.mode==='journey')state.level=state.level<2000?state.level+1:1;}else if(game?.kind==='differences'){state.differenceLevel=state.differenceLevel<120?state.differenceLevel+1:1;if(state.mode==='journey')state.level=state.level<2000?state.level+1:1;}else if(game?.kind==='maze'){state.mazeLevel=state.mazeLevel<120?state.mazeLevel+1:1;if(state.mode==='journey')state.level=state.level<2000?state.level+1:1;}else if(game?.kind==='puzzle'){state.puzzleLevel=state.puzzleLevel<200?state.puzzleLevel+1:1;if(state.mode==='journey')state.level=state.level<2000?state.level+1:1;}else{state.level=state.level<2000?state.level+1:1;}persist();start()}}
window.YanClassicShared={app,state,persist,say,fx,vib,bg,musicStart,renderHome};
window.YanFamilyGame={createQuestion,levelKind,types:TYPES,puzzle:()=>{state.mode='puzzle';persist();start()},maze:()=>{state.mode='maze';persist();start()},differences:()=>{state.mode='differences';persist();start()},ordering:()=>{state.mode='ordering';persist();start()},makeOrdering,makeDifferences,makeMaze,mazeRoute,mazeNeighbors,mazeGuideRoute,goTo:(level,mode)=>{state.level=Math.max(1,Math.min(2000,level));if(MODESETS[mode])state.mode=mode;persist();start()}};
renderHome();})();
