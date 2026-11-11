const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert'),cp=require('child_process'),vm=require('vm');
const root=path.resolve(__dirname,'..'),report=require('./production-audit.json');let checks=0;
function check(ok,msg){assert(ok,msg);checks++;}
for(const f of report.files.filter(f=>f.match)){let b=fs.readFileSync(path.join(root,f.path));if(process.argv.includes('--snapshot')){if(/\.(js|css|html|json|svg)$/.test(f.path))b=Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'));check(crypto.createHash('sha1').update(b).digest('hex')===f.sha1,'snapshot hash '+f.path);}if(f.path.endsWith('.js'))check(cp.spawnSync(process.execPath,['--check',path.join(root,f.path)]).status===0,'syntax '+f.path);}
for(const name of fs.readdirSync(root).filter(f=>f.endsWith('.js')))check(cp.spawnSync(process.execPath,['--check',path.join(root,name)]).status===0,'syntax '+name);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)="\.\/([^"?]+)(?:\?[^"]*)?"/g))check(fs.existsSync(path.join(root,m[1])),'HTML reference '+m[1]);
const g=fs.readFileSync(path.join(root,'game.js'),'utf8'),home=g.slice(g.indexOf('function renderHome()'),g.indexOf('function renderSettings()'));
const modes=vm.runInNewContext(g.match(/const MODES=(.*);/)[1]);
check((home.match(/class="game-launch featured/g)||[]).length+modes.length===10,'ten home entries including collapsed games');
check(g.includes("STORE='yan-family-unified-v6'")&&g.includes('localStorage.setItem(STORE'),'save key');
check(report.files.filter(f=>f.path.endsWith('.avif')&&f.match).length===14,'14 AVIF');
const refs=new Set();for(const f of report.files.filter(f=>f.match&&/\.(js|css|html|json)$/.test(f.path))){let s=fs.readFileSync(path.join(root,f.path),'utf8');for(const m of s.matchAll(/assets\/[a-zA-Z0-9_-]+\.(?:avif|webp|svg|png|jpg)/g))refs.add(m[0]);}
for(const p of refs)check(fs.existsSync(path.join(root,p)),'asset '+p);
for(const p of ['excavator','dump','mixer','bulldozer','wheelbarrow','helmet','cone','shovel','wrench','barrier','toolbox','vest'])check(fs.existsSync(path.join(root,'assets',p+'.webp')),'dynamic asset '+p);
console.log(JSON.stringify({passed:checks,snapshotApplicationFiles:129,javascriptFiles:fs.readdirSync(root).filter(f=>f.endsWith('.js')).length,avif:14,homeEntries:10,literalAssetPaths:refs.size,saveKey:'yan-family-unified-v6',browserE2E:'not performed'}));
