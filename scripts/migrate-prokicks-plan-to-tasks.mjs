import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const url = html.match(/const SB_URL = '([^']+)'/)?.[1];
const key = html.match(/const SB_KEY = '([^']+)'/)?.[1];
if (!url || !key) throw new Error('No se encontró la configuración de Supabase.');

const fronts = ['Indoor Community', 'Comunidad ProKicks', 'Redes sociales'];
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
}

function field(description, name) {
  return String(description || '').match(new RegExp(`^${name}\\s*:\\s*(.+)$`, 'im'))?.[1]?.trim() || '';
}

const [project] = await request('proyectos?select=id,owner_id&nombre=eq.PROKICKS');
if (!project) throw new Error('No existe el proyecto PROKICKS.');

const tasks = await request(`tareas?select=*&proyecto_id=eq.${project.id}`);
let created = 0;

for (const front of fronts) {
  const parent = tasks.find((task) => task.titulo?.trim().toLowerCase() === front.toLowerCase());
  if (!parent) throw new Error(`Falta la tarea madre ${front}.`);
  const subtasks = await request(`subtareas?select=*&tarea_id=eq.${parent.id}&order=created_at.asc`);
  const internalOwner = field(parent.descripcion, 'Responsable interno');
  const collaborators = field(parent.descripcion, 'Colaboradores internos');

  for (const subtask of subtasks) {
    const exists = tasks.some((task) =>
      task.titulo?.trim().toLowerCase() === subtask.titulo?.trim().toLowerCase() &&
      field(task.descripcion, 'Frente').toLowerCase() === front.toLowerCase()
    );
    if (exists) continue;

    const description = [
      `Frente: ${front}`,
      internalOwner ? `Responsable interno: ${internalOwner}` : '',
      collaborators ? `Colaboradores internos: ${collaborators}` : '',
      `Objetivo: Completar ${subtask.titulo}`,
      'Entregable: Resultado documentado y aprobado',
      'KPI: Avance',
      'Meta: 100',
      'Siguiente accion: Definir siguiente acción',
      parent.fecha_proximo_seguimiento ? `Proximo seguimiento: ${parent.fecha_proximo_seguimiento}` : '',
      '',
      'Tarea operativa del plan ProKicks.'
    ].filter((line, index, all) => line || (index > 0 && all[index - 1])).join('\n');

    await request('tareas', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        proyecto_id: project.id,
        owner_id: project.owner_id,
        titulo: subtask.titulo,
        descripcion: description,
        prioridad: parent.prioridad || 'media',
        estado: subtask.estado || 'pendiente',
        fecha_inicio: parent.fecha_inicio,
        fecha_vencimiento: subtask.fecha_vencimiento || parent.fecha_vencimiento,
        horas_estimadas: 0,
        horas_reales: 0,
        etapa_crm: parent.etapa_crm || 'por_contactar',
        siguiente_accion: 'Definir siguiente acción',
        fecha_proximo_seguimiento: parent.fecha_proximo_seguimiento,
        ultima_actividad: new Date().toISOString()
      })
    });
    created += 1;
  }
}

const finalTasks = await request(`tareas?select=id,titulo,descripcion&proyecto_id=eq.${project.id}`);
const operational = finalTasks.filter((task) => fronts.includes(field(task.descripcion, 'Frente')) && !fronts.includes(task.titulo));
const counts = Object.fromEntries(fronts.map((front) => [front, operational.filter((task) => field(task.descripcion, 'Frente') === front).length]));
console.log(JSON.stringify({ created, totalOperationalTasks: operational.length, counts }));
