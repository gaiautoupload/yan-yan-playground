const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const init = source.slice(source.indexOf("const app="), source.indexOf('const persist='));
function restore(saved) {
  return vm.runInNewContext(init + '\nstate;', {
    document: { querySelector: () => null },
    localStorage: { getItem: key => key === 'yan-family-unified-v6' ? saved : null }
  });
}
for (const mode of ['toString', '__proto__', 'constructor', 'missing', null, 12, []]) {
  assert.equal(restore(JSON.stringify({mode})).mode, 'journey', `invalid mode: ${mode}`);
}
for (const mode of ['journey', 'puzzle', 'maze', 'ordering', 'differences', 'connect', 'numbers']) {
  const saved = restore(JSON.stringify({mode, level: 42, stars: 17}));
  assert.equal(saved.mode, mode);
  assert.equal(saved.level, 42);
  assert.equal(saved.stars, 17);
}
assert.equal(restore('{broken').mode, 'journey');
console.log('Save recovery: 8 invalid modes, 7 valid modes and malformed JSON passed.');
