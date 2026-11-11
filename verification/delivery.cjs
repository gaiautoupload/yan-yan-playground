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
for(let level=1;level<=40;level++){
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
console.log('Delivery: capacity, wrong destination, depot rules, checkpoint recovery, completion lock and 40 solvable levels passed.');
