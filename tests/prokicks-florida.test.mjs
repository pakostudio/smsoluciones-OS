import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');
const data = JSON.parse(fs.readFileSync(new URL('../data/prokicks-florida-indoor-2026-08-26.json', import.meta.url), 'utf8'));

assert.equal(data.length, 79);
assert.equal(new Set(data.map((row) => `${row.facility}|${row.full_address}`)).size, 79);
assert.equal(data.filter((row) => row.visited === 'Pendiente').length, 79);
assert.equal(data.filter((row) => row.lead_potential === '').length, 79);
assert.deepEqual(Object.fromEntries([...data.reduce((map,row)=>map.set(row.region,(map.get(row.region)||0)+1),new Map())]), {
  'South Florida': 20,
  'Central Florida': 19,
  'West Florida': 19,
  'North Florida': 21
});
assert.match(app, /Florida · Darío/);
assert.match(app, /function pkFloridaBoard\(\)/);
assert.match(app, /pkFloridaSave: async function/);
assert.match(app, /Asignación sin acceso automático al CRM/);
assert.match(css, /\.pkf-board/);
assert.match(css, /@media\(max-width:620px\).*\.pkf-hero/s);

console.log('ProKicks Florida tests: OK');
