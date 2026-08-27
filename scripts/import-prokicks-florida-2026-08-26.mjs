import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const url = app.match(/const SB_URL = '([^']+)'/)?.[1];
const key = app.match(/const SB_KEY = '([^']+)'/)?.[1];
if (!url || !key) throw new Error('No se encontró la configuración de Supabase.');

const source = JSON.parse(fs.readFileSync(new URL('../data/prokicks-florida-indoor-2026-08-26.json', import.meta.url), 'utf8'));
const apply = process.argv.includes('--apply');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const projects = await request('proyectos?select=id,nombre,owner_id&nombre=ilike.%25prokicks%25');
const project = projects.find((row) => String(row.nombre || '').toLowerCase() === 'prokicks') || projects[0];
if (!project) throw new Error('No existe el proyecto ProKicks.');

const existing = await request(`prokicks_records?select=id,data&proyecto_id=eq.${project.id}&tipo=eq.prospecto`);
const existingKeys = new Set(existing.map((row) => {
  const data = row.data || {};
  return data.source_key || `${normalize(data.cliente)}|${normalize(data.direccion)}`;
}));

const mapped = source.map((row) => ({
  proyecto_id: project.id,
  owner_id: project.owner_id,
  tipo: 'prospecto',
  data: {
    cliente: row.facility,
    contacto: row.contact,
    cargo: row.role,
    ciudad: row.city,
    telefono: row.phone,
    email: row.email,
    rep: 'Darío Sala',
    fuente: 'Lista indoor Florida · Darío Sala',
    mercado: 'Florida',
    region: row.region,
    tipo_instalacion: row.facility_type,
    direccion: row.full_address,
    actividad_liga: row.league_activity,
    fuente_liga: row.league_source,
    visitado: row.visited || 'Pendiente',
    potencial: row.lead_potential || '',
    etapa: 'por_contactar',
    siguiente_accion: 'Completar visita y potencial con Darío',
    proximo_seguimiento: '',
    probabilidad: 0,
    monto_estimado: 0,
    devices_estimados: 0,
    notas: '',
    import_batch: 'florida-indoor-2026-08-26',
    source_file: 'Lista indoor Florida .xlsx',
    source_sheet: 'Indoor Facilities',
    source_row: row.source_row,
    source_key: `florida-indoor-2026-08-26:${row.source_row}`
  },
  updated_at: new Date().toISOString()
}));

const pending = mapped.filter((row) => {
  const data = row.data;
  const sourceKey = data.source_key;
  const businessKey = `${normalize(data.cliente)}|${normalize(data.direccion)}`;
  return !existingKeys.has(sourceKey) && !existingKeys.has(businessKey);
});

if (apply) {
  for (let i = 0; i < pending.length; i += 20) {
    await request('prokicks_records', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(pending.slice(i, i + 20))
    });
  }
}

const report = {
  mode: apply ? 'apply' : 'dry-run',
  project: project.nombre,
  source: source.length,
  existingProspects: existing.length,
  floridaAlreadyPresent: mapped.length - pending.length,
  toInsert: pending.length,
  regions: Object.fromEntries([...source.reduce((map, row) => map.set(row.region, (map.get(row.region) || 0) + 1), new Map())]),
  validation: {
    missingFacility: source.filter((row) => !row.facility).length,
    missingAddress: source.filter((row) => !row.full_address).length,
    pendingVisit: source.filter((row) => row.visited === 'Pendiente').length,
    pendingPotential: source.filter((row) => row.lead_potential === '').length
  }
};

if (apply) {
  const after = await request(`prokicks_records?select=id,data&proyecto_id=eq.${project.id}&tipo=eq.prospecto`);
  report.floridaInSupabase = after.filter((row) => row.data?.import_batch === 'florida-indoor-2026-08-26').length;
}

console.log(JSON.stringify(report, null, 2));
