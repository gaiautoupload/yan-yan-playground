const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function restore(opened){
 const said=[],effects=[],nodes=new Map();
 const node=key=>{if(!nodes.has(key))nodes.set(key,{isConnected:true,hidden:false,dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},querySelector:k=>node(key+k)});return nodes.get(key)};
 const spots=Array.from({length:4},(_,i)=>Object.assign(node('spot'+i),{dataset:{spot:String(i)}}));
 const friends=Array.from({length:3},(_,i)=>Object.assign(node('friend'+i),{dataset:{friend:String(i)}}));
 const screen=node('screen');screen.querySelector=k=>{const spot=k.match(/^\[data-spot="(\d)"\]$/),friend=k.match(/^\[data-friend="(\d)"\]$/);return spot?spots[+spot[1]]:friend?friends[+friend[1]]:node(k)};screen.querySelectorAll=k=>k==='[data-friend]'?friends:spots;
 const window={YanSpeech:{cancel(){}},YanClassicAudio:{unlock(){},play:x=>effects.push(x)},YanClassicShared:{state:{hideSeekSession:{version:1,deck:[2,-1,0,1],opened}},persist(){},say:x=>said.push(x),app:{querySelector:()=>screen},renderHome(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../hide-seek.js'),'utf8'),{window});window.YanHideSeek.start();
 return {said,effects,node};
}
const complete=restore([0,2,3]);
assert.equal(complete.said.length,1,'restoration speaks once, not every old discovery');
assert(complete.said[0].includes('猴子和轉圈圈'),'completed resume identifies the picture replay control');
assert.deepEqual(complete.effects,[],'restoring completion does not replay celebration sounds');
assert.equal(complete.node('#seek-again').hidden,false);
const partial=restore([2]);assert.equal(partial.said.length,1);assert(partial.said[0].includes('小貓咪')&&partial.said[0].includes('尖耳朵'),'partial resume points to the next animal and matching ears');
console.log('Hide-and-seek resume voice: picture replay guidance, single prompt, silent restore and next-animal clue passed.');
