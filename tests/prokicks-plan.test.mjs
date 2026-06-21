import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter(Boolean);

scripts.forEach((script) => new Function(script));

function readArray(name) {
  const match = html.match(new RegExp(`var ${name} = (\\[[\\s\\S]*?\\n\\]);`));
  assert.ok(match, `${name} debe existir`);
  return new Function(`return ${match[1]}`)();
}

const people = readArray('PROKICKS_INTERNAL_PEOPLE');
assert.deepEqual(people, ['Billi', 'Juan', 'Pako', 'Jorge', 'Linda', 'Dary', 'Erika', 'Fernando', 'Sean', 'Jonathan']);

const plan = readArray('PROKICKS_PLAN');
assert.deepEqual(plan.map((item) => item.title), ['Indoor Community', 'Comunidad ProKicks', 'Redes sociales']);
assert.equal(plan[0].subtasks.length, 6);
assert.equal(plan[1].subtasks.length, 3);
assert.equal(plan[2].subtasks.length, 5);
assert.ok(plan[0].subtasks.includes('Registros para torneos'));
assert.ok(plan[1].subtasks.includes('Registros para torneos'));
assert.ok(!plan[2].subtasks.includes('Registros para torneos'));
assert.ok(plan[1].subtasks.includes('SPOT Sur CDMX'));
assert.ok(plan[1].subtasks.includes('SPOT Tlatelolco'));

['pkWorkPlanHtml', 'pkTaskProgress', 'pkInitPlan', 'pkToggleSub', 'pkAdvance', 'pkSaveAdvance'].forEach((name) => {
  assert.ok(html.includes(name), `${name} debe estar integrado`);
});

assert.ok(html.includes('Asignación operativa · no otorga acceso al CRM'));
assert.ok(html.includes('Seguimiento CRM ProKicks'));
assert.ok(html.includes('Registrar avance'));
assert.ok(!html.includes('Billñi'));
assert.ok(!html.includes('Jorege'));

const mainScript = scripts.at(-1).split('/* ── INIT ── */')[0];
const element = new Proxy({
  value: '', textContent: '', innerHTML: '', style: {}, dataset: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {}, focus() {}, querySelector() { return element; }, querySelectorAll() { return []; }
}, { get(target, key) { return key in target ? target[key] : (() => {}); } });
const context = vm.createContext({
  console, URLSearchParams, AbortController, Date, Math, JSON, Promise,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  navigator: {}, location: { href: '', reload() {} }, confirm: () => true,
  document: { body: element, getElementById: () => element, querySelector: () => element, querySelectorAll: () => [], createElement: () => element },
  window: { SM_CONFIG: {}, addEventListener() {}, lucide: null }
});
context.window.window = context.window;
context.window.document = context.document;
vm.runInContext(mainScript, context);

const rendered = vm.runInContext(`(() => {
  SES={userId:'u1'};
  DB.usuarios=[{id:'u1',nombre:'Pako',rol:'admin'}];
  DB.proyectos=[{id:'p1',nombre:'ProKicks',owner_id:'u1'}];
  DB.tareas=[{id:'t1',proyecto_id:'p1',owner_id:'u1',titulo:'Indoor Community',descripcion:'Frente: Indoor Community\\nResponsable interno: Billi\\nObjetivo: Analizar resultados',prioridad:'alta',estado:'en_proceso',fecha_inicio:'2026-06-21',fecha_vencimiento:'2026-06-30',created_at:'2026-06-21T10:00:00Z'}];
  DB.subtareas=[{id:'s1',tarea_id:'t1',owner_id:'u1',titulo:'Revisión del evento',estado:'terminada',fecha_vencimiento:'2026-06-25'},{id:'s2',tarea_id:'t1',owner_id:'u1',titulo:'Registros para torneos',estado:'pendiente',fecha_vencimiento:'2026-06-30'}];
  DB.comentarios=[];
  return pkWorkPlanHtml(DB.proyectos[0]);
})()`, context);
assert.match(rendered, /Indoor Community/);
assert.match(rendered, /Billi/);
assert.match(rendered, /50%/);
assert.match(rendered, /1 de 2 microtareas/);
assert.match(rendered, /Registrar avance/);

console.log('ProKicks plan tests: OK');
