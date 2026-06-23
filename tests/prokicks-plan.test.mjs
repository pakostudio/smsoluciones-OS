import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appJs = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter(Boolean);

inlineScripts.forEach((script) => new Function(script));
new Function(appJs);

function readArray(name) {
  const match = appJs.match(new RegExp(`var ${name} = (\\[[\\s\\S]*?\\n\\]);`));
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
  assert.ok(appJs.includes(name), `${name} debe estar integrado`);
});
assert.match(appJs, /Plan de trabajo ProKicks/);
assert.match(appJs, /\['tareas',mainLabel\],\['reporte','Reporte'\],\['kanban','Kanban'\],\['calendario','Calendario'\],\['gantt','Gantt'\],\['pipeline','Pipeline'\]/);
assert.ok(!appJs.includes("if(isProkicksProject(p)) return prokicksProjectOverview();"));

assert.ok(appJs.includes('Asignación y control ProKicks'));
assert.ok(appJs.includes('responsables son etiquetas operativas'));
assert.ok(appJs.includes('Seguimiento CRM ProKicks'));
assert.ok(appJs.includes('Registrar avance'));
assert.ok(!appJs.includes('Billñi'));
assert.ok(!appJs.includes('Jorege'));

const mainScript = appJs.split('/* ── INIT ── */')[0];
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

const boardRendered = vm.runInContext(`(() => {
  SES={userId:'u1'};
  DB.usuarios=[{id:'u1',nombre:'Pako',rol:'admin'}];
  DB.proyectos=[{id:'p1',nombre:'ProKicks',owner_id:'u1'}];
  DB.tareas=[{id:'t2',proyecto_id:'p1',owner_id:'u1',titulo:'SPOT Sur CDMX',descripcion:'Frente: Comunidad ProKicks\\nResponsable interno: Billi\\nSiguiente accion: Confirmar sede',prioridad:'alta',estado:'pendiente',fecha_inicio:'2026-06-21',fecha_vencimiento:'2026-07-21',created_at:'2026-06-21T10:00:00Z'}];
  DB.subtareas=[]; DB.comentarios=[];
  return operationalBoard(DB.proyectos[0]);
})()`, context);
assert.match(boardRendered, /Frente/);
assert.match(boardRendered, /SPOT Sur CDMX/);
assert.match(boardRendered, /Billi/);
assert.match(boardRendered, /Gestionar/);

const workspaceViews = vm.runInContext(`(() => {
  DB.pagos=[]; DB.prokicks_records=[]; DB.prokicks_settings=[];
  const p=DB.proyectos[0];
  return {
    tabs:projectTabs(p), report:projectReportHtml(p.id), kanban:projectKanbanHtml(p),
    calendar:projectCalendarHtml(p), gantt:projectGanttHtml(p), pipeline:projectPipelineHtml(p)
  };
})()`, context);
assert.match(workspaceViews.tabs, /Plan de trabajo/);
for (const label of ['Reporte', 'Kanban', 'Calendario', 'Gantt', 'Pipeline']) assert.match(workspaceViews.tabs, new RegExp(label));
for (const [name, markup] of Object.entries(workspaceViews)) assert.ok(markup.length > 50, `${name} debe renderizar contenido`);

console.log('ProKicks plan tests: OK');
