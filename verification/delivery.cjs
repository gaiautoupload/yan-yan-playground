const assert=require('node:assert/strict'),r=require('../delivery-rules.js');
const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
assert(html.indexOf('src="./delivery-rules.js')>=0 && html.indexOf('src="./delivery-rules.js')<html.indexOf('src="./delivery-game.js'),'rules load before game');
let s=r.fresh(1);
const step=a=>{const result=r.act(s,a);if(!result.error)s=result.state;return result};
step({type:'load',good:'brick'});step({type:'load',good:'brick'});
assert.equal(step({type:'load',good:'seed'}).error,'full');assert.equal(s.load.length,2);
step({type:'travel',to:'garden'});assert.deepEqual(s.delivered,[0,0]);assert.equal(s.load.length,2,'wrong stop retains cargo');
assert.equal(step({type:'load',good:'seed'}).error,'depot');
step({type:'travel',to:'site'});assert.deepEqual(s.delivered,[2,0]);assert.equal(s.load.length,0);
assert.equal(step({type:'travel',to:'garden'}).error,'empty');
step({type:'travel',to:'depot'});step({type:'load',good:'seed'});
assert.deepEqual(r.restore(JSON.parse(JSON.stringify(s)),1),s,'resume preserves route');
assert.equal(step({type:'travel',to:'garden'}).complete,true);assert.equal(s.trips,2);
assert.equal(step({type:'travel',to:'depot'}).error,'done','completed route cannot mutate');
for(let level=1;level<=r.levelCount;level++){
 let state=r.fresh(level);const p=r.plan(level);
 for(let i=0;i<p.orders.length;i++){
  const o=p.orders[i];
  while(state.delivered[i]<o.quantity){
   if(state.location!=='depot')state=r.act(state,{type:'travel',to:'depot'}).state;
   for(let n=0;n<Math.min(p.capacity,o.quantity-state.delivered[i]);n++)state=r.act(state,{type:'load',good:o.good.id}).state;
   state=r.act(state,{type:'travel',to:o.station.id}).state;
   assert(state.load.length<=p.capacity);
  }
 }
 assert(r.complete(state),`level ${level} solvable`);
}
assert.deepEqual(r.restore({version:1,level:1,location:'depot',load:['bad'],delivered:[0,0],trips:0},1),r.fresh(1));
assert.deepEqual(r.restore({...r.fresh(1),delivered:[99,0]},1),r.fresh(1));
const original=r.fresh(1);r.act(original,{type:'load',good:'brick'});assert.equal(original.load.length,0,'actions are immutable');
console.log('Delivery: capacity, wrong destination, depot rules, checkpoint recovery, completion lock and 6 distinct solvable tasks passed.');

assert.equal(new Set(Array.from({length:r.levelCount},(_,i)=>{const p=r.plan(i+1);return JSON.stringify([p.capacity,p.orders.map(o=>[o.station.id,o.quantity])])})).size,r.levelCount);
assert.equal(r.restore({...r.fresh(1),version:1},1).version,2);
assert.deepEqual(r.restore({...r.fresh(2),version:1},2),r.fresh(2));
// Batch pending orders into full trucks, visiting every loaded destination.
for(let level=1;level<=r.levelCount;level++){
 const p=r.plan(level);let state=r.fresh(level);
 while(!r.complete(state)){
  if(state.location!=='depot')state=r.act(state,{type:'travel',to:'depot'}).state;
  for(let i=0;i<p.orders.length;i++){
   const o=p.orders[i];
   for(let n=0;n<o.quantity-state.delivered[i]&&state.load.length<p.capacity;n++)state=r.act(state,{type:'load',good:o.good.id}).state;
  }
  for(const o of p.orders)if(state.load.includes(o.good.id))state=r.act(state,{type:'travel',to:o.station.id}).state;
 }
 assert.equal(state.trips,p.minimumTrips,`task ${level} optimum reachable`);
}
