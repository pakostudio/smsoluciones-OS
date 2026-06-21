import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const url = html.match(/const SB_URL = '([^']+)'/)?.[1];
const key = html.match(/const SB_KEY = '([^']+)'/)?.[1];
if (!url || !key) throw new Error('No se encontró la configuración de Supabase.');

const projectName = 'PROKICKS';
const plan = [
  {
    title: 'Indoor Community',
    front: 'Indoor Community',
    subtasks: [
      'Revisión y análisis del evento de Indoor Community',
      'Planeación y organización de futuros torneos ProKicks',
      'Artículos promocionales y premios para futuros torneos',
      'Desarrollo de mercancía ProKicks: playeras, stickers y otros productos',
      'Promocionales para activaciones, escuelas, negocios y eventos',
      'Registros para torneos'
    ]
  },
  {
    title: 'Comunidad ProKicks',
    front: 'Comunidad ProKicks',
    subtasks: ['SPOT Sur CDMX', 'SPOT Tlatelolco', 'Registros para torneos']
  },
  {
    title: 'Redes sociales',
    front: 'Redes sociales',
    subtasks: [
      'Incrementar el reconocimiento de la marca ProKicks',
      'Aumentar seguidores en redes sociales',
      'Generar tráfico hacia el sitio web y la tienda en línea',
      'Aumentar ventas e interacción con clientes',
      'Definir objetivo y llamada a la acción de cada contenido'
    ]
  }
];

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json'
};

async function request(path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
}

function datePlus(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const projects = await request(`proyectos?select=id,nombre,owner_id&nombre=eq.${projectName}`);
const project = projects[0];
if (!project) throw new Error(`No existe el proyecto ${projectName}.`);

let tasks = await request(`tareas?select=*&proyecto_id=eq.${project.id}`);
let createdTasks = 0;
let createdSubtasks = 0;

for (const item of plan) {
  let task = tasks.find((row) => row.titulo?.trim().toLowerCase() === item.title.toLowerCase());
  if (!task) {
    const description = [
      `Frente: ${item.front}`,
      'Objetivo: Definir, ejecutar y documentar resultados',
      'Entregable: Resultado documentado y aprobado',
      'KPI: Avance',
      'Meta: 100',
      'Siguiente accion: Asignar responsable interno y calendarizar microtareas',
      `Proximo seguimiento: ${datePlus(7)}`,
      '',
      'Plan de trabajo operativo ProKicks.'
    ].join('\n');
    const inserted = await request('tareas', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        proyecto_id: project.id,
        owner_id: project.owner_id,
        titulo: item.title,
        descripcion: description,
        prioridad: 'alta',
        estado: 'pendiente',
        fecha_inicio: datePlus(0),
        fecha_vencimiento: datePlus(30),
        horas_estimadas: 8,
        horas_reales: 0,
        etapa_crm: 'por_contactar',
        siguiente_accion: 'Asignar responsable interno y calendarizar microtareas',
        fecha_proximo_seguimiento: datePlus(7),
        ultima_actividad: new Date().toISOString()
      })
    });
    task = inserted[0];
    tasks.push(task);
    createdTasks += 1;
  }

  const existing = await request(`subtareas?select=id,titulo&tarea_id=eq.${task.id}`);
  const names = new Set(existing.map((row) => row.titulo?.trim().toLowerCase()));
  for (const title of item.subtasks) {
    if (names.has(title.toLowerCase())) continue;
    await request('subtareas', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        tarea_id: task.id,
        owner_id: project.owner_id,
        titulo: title,
        estado: 'pendiente',
        fecha_vencimiento: task.fecha_vencimiento || datePlus(30)
      })
    });
    createdSubtasks += 1;
  }
}

const finalTasks = await request(`tareas?select=id,titulo&proyecto_id=eq.${project.id}`);
const planTasks = finalTasks.filter((row) => plan.some((item) => item.title === row.titulo));
let finalSubtasks = 0;
for (const task of planTasks) {
  const rows = await request(`subtareas?select=id&tarea_id=eq.${task.id}`);
  finalSubtasks += rows.length;
}

console.log(JSON.stringify({ createdTasks, createdSubtasks, planTasks: planTasks.length, planSubtasks: finalSubtasks }));
