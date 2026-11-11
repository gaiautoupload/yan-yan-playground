(function(root){'use strict';
const goods=[{id:'brick',icon:'🧱',name:'磚塊'},{id:'seed',icon:'🌱',name:'樹苗'},{id:'carrot',icon:'🥕',name:'紅蘿蔔'}];
const stations=[{id:'site',icon:'🏗️',name:'工地'},{id:'garden',icon:'🌷',name:'花園'},{id:'zoo',icon:'🦁',name:'動物園'}];
const courses=[
 {title:'分兩趟送到',capacity:2,quantities:[2,1,0]},
 {title:'順路一起送',capacity:2,quantities:[1,1,0]},
 {title:'三站接力',capacity:3,quantities:[1,1,1]},
 {title:'大訂單分車送',capacity:2,quantities:[3,0,1]},
 {title:'混裝省一趟',capacity:3,quantities:[1,1,2]},
 {title:'配送總挑戰',capacity:3,quantities:[2,2,2]}
];
function plan(value){
 const level=Math.max(1,Math.min(courses.length,Math.floor(Number(value)||1)));
 const {title,capacity,quantities}=courses[level-1];
 const orders=quantities.map((quantity,i)=>({station:stations[i],good:goods[i],quantity})).filter(o=>o.quantity);
 return {level,title,capacity,orders,goods,minimumTrips:Math.ceil(orders.reduce((n,o)=>n+o.quantity,0)/capacity)};
}
function fresh(level){const p=plan(level);return {version:2,level:p.level,location:'depot',load:[],delivered:p.orders.map(()=>0),trips:0}}
function restore(saved,level){
 const p=plan(level),fallback=fresh(level);
 if(!saved||(saved.version!==2&&!(saved.version===1&&p.level===1))||saved.level!==p.level||!['depot',...stations.map(s=>s.id)].includes(saved.location))return fallback;
 if(!Array.isArray(saved.load)||saved.load.length>p.capacity||saved.load.some(id=>!goods.some(g=>g.id===id)))return fallback;
 if(!Array.isArray(saved.delivered)||saved.delivered.length!==p.orders.length||saved.delivered.some((n,i)=>!Number.isInteger(n)||n<0||n>p.orders[i].quantity))return fallback;
 if(!Number.isSafeInteger(saved.trips)||saved.trips<0)return fallback;
 return {...saved,version:2,load:[...saved.load],delivered:[...saved.delivered]};
}
function complete(s){return plan(s.level).orders.every((o,i)=>s.delivered[i]===o.quantity)}
function act(state,action){
 const s=restore(state,state.level),p=plan(s.level);let delivered=0;
 if(complete(s))return {state:s,error:'done'};
 if(action.type==='load'){
  if(s.location!=='depot')return {state:s,error:'depot'};
  if(s.load.length>=p.capacity)return {state:s,error:'full'};
  if(!goods.some(g=>g.id===action.good))return {state:s,error:'good'};
  s.load.push(action.good);
 }else if(action.type==='remove'){
  if(s.location!=='depot')return {state:s,error:'depot'};
  if(!Number.isInteger(action.index)||action.index<0||action.index>=s.load.length)return {state:s,error:'index'};
  s.load.splice(action.index,1);
 }else if(action.type==='travel'){
  if(action.to!=='depot'&&!stations.some(x=>x.id===action.to))return {state:s,error:'station'};
  if(action.to===s.location)return {state:s,error:'same'};
  if(action.to!=='depot'&&!s.load.length)return {state:s,error:'empty'};
  if(s.location==='depot')s.trips++;
  s.location=action.to;
  const i=p.orders.findIndex(o=>o.station.id===action.to);
  if(i>=0){const order=p.orders[i];s.load=s.load.filter(id=>{if(id===order.good.id&&s.delivered[i]<order.quantity){s.delivered[i]++;delivered++;return false}return true})}
 }else return {state:s,error:'action'};
 return {state:s,delivered,complete:complete(s)};
}
const api={goods,stations,levelCount:courses.length,plan,fresh,restore,complete,act};
if(typeof module==='object'&&module.exports)module.exports=api;else root.YanDeliveryRules=api;
})(typeof window==='object'?window:globalThis);
