/* ── SUPABASE ── */
const SB_URL = 'https://diqbmyqvuyollvlvjniz.supabase.co';
const SB_KEY = 'sb_publishable_R_XGqN5PlehELFz7u3fgeg_ekGPb38Z';
function restClient(url,key){
  function enc(v){ return encodeURIComponent(v==null?'':v); }
  function builder(tbl){
    var st={tbl:tbl,method:'GET',params:new URLSearchParams(),body:null,headers:{apikey:key,Authorization:'Bearer '+key},single:false,returning:false};
    var api={
      select:function(cols){ st.params.set('select',cols||'*'); st.returning=true; return api; },
      order:function(col,opt){ st.params.set('order',col+'.'+((opt&&opt.ascending===false)?'desc':'asc')); return api; },
      eq:function(col,val){ st.params.set(col,'eq.'+enc(val)); return api; },
      insert:function(data){ st.method='POST'; st.body=data; st.returning=true; return api; },
      update:function(data){ st.method='PATCH'; st.body=data; st.returning=true; return api; },
      delete:function(){ st.method='DELETE'; return api; },
      upsert:function(data,opt){ st.method='POST'; st.body=data; st.returning=true; st.headers.Prefer='resolution=merge-duplicates,return=representation'; if(opt&&opt.onConflict) st.params.set('on_conflict',opt.onConflict); return api; },
      single:function(){ st.single=true; return api; },
      then:function(res,rej){ return api.exec().then(res,rej); },
      catch:function(rej){ return api.exec().catch(rej); },
      exec:async function(){
        var qs=st.params.toString();
        var headers=Object.assign({},st.headers);
        if(st.body!==null) headers['Content-Type']='application/json';
        if(st.returning && !headers.Prefer) headers.Prefer='return=representation';
        if(st.single) headers.Accept='application/vnd.pgrst.object+json';
        var ctrl=new AbortController();
        var timer=setTimeout(function(){ctrl.abort();},12000);
        try{
          var r=await fetch(url+'/rest/v1/'+st.tbl+(qs?'?'+qs:''),{method:st.method,headers:headers,body:st.body!==null?JSON.stringify(st.body):undefined,signal:ctrl.signal});
          clearTimeout(timer);
          var txt=await r.text();
          var data=txt?JSON.parse(txt):null;
          if(!r.ok) return {data:null,error:data||{message:r.statusText}};
          if(st.single && Array.isArray(data)) data=data[0]||null;
          return {data:data,error:null};
        }catch(e){ clearTimeout(timer); return {data:null,error:e}; }
      }
    };
    return api;
  }
  return {from:builder,channel:function(){return {on:function(){return this;},subscribe:function(){return this;}};}};
}
const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : restClient(SB_URL, SB_KEY);
const SM_CONFIG = window.SM_CONFIG || {sentryDsn:'',mixpanelToken:''};
function scrubTelemetry(event){
  var blocked=/email|phone|telefono|pin|password|token|authorization|texto|descripcion/i;
  function clean(value,depth){
    if(depth>5) return '[truncated]';
    if(Array.isArray(value)) return value.slice(0,20).map(function(v){return clean(v,depth+1);});
    if(value && typeof value==='object'){
      var out={}; Object.keys(value).forEach(function(k){out[k]=blocked.test(k)?'[filtered]':clean(value[k],depth+1);}); return out;
    }
    return typeof value==='string' && value.length>300 ? value.slice(0,300) : value;
  }
  return clean(event,0);
}
try{
  var sentryDsn=SM_CONFIG.sentryDsn||localStorage.getItem('sm_sentry_dsn')||'';
  if(sentryDsn && window.Sentry) Sentry.init({dsn:sentryDsn,sendDefaultPii:false,tracesSampleRate:.05,beforeSend:scrubTelemetry});
}catch(e){}

/* ── STATE ── */
var DB = {usuarios:[],clientes:[],proyectos:[],tareas:[],subtareas:[],comentarios:[],entregables:[],pagos:[],reuniones:[],prokicks_records:[],prokicks_settings:[],notification_preferences:[],usage_events:[],proyecto_usuarios:[]};
var SES = null;  // {userId}
var VIEW = 'dashboard';
var FPID = '';   // filter project id
var PTAB = 'tareas'; // project workspace tab
var SELUID = ''; // selected user on login
var PKTAB = 'dashboard';
var PKWORKTAB = 'todos';
var PK_FLORIDA_FILTERS = {region:'',tipo:'',etapa:'',busqueda:''};
var PK_INIT_BUSY = false;
var PK_NEW_FRONT = '';
var SESSION_KEY = 'sm_os_session_v1';
var PROJECT_QUERY = '';
var PROJECT_DESC_EXPANDED = false;
var BOARD_FILTERS = {estado:'',accion:'',seguimiento:'',responsable:''};
var CONTROL_FILTERS = {estado:'',responsable:'',area:'',foco:''};
var CLIENT_PROJECT_FOCUS = true; // Privacidad cliente: al estar dentro de un proyecto, la navegación lateral solo muestra ese proyecto.

/* ── UTILS ── */
function dateObj(s){
  if(!s) return null;
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]),Number(m[2])-1,Number(m[3])) : new Date(s);
}
function dateKey(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function startToday(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function dayDiff(s){ return Math.ceil((dateObj(s)-startToday())/864e5); }
function today(){ return dateKey(new Date()); }
function pd(n){ var d=new Date(); d.setDate(d.getDate()+n); return dateKey(d); }
function fmt(s){ return s ? dateObj(s).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—'; }
function fmtdt(s){ return s ? new Date(s).toLocaleString('es-MX') : '—'; }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function xid(arr,id){ for(var i=0;i<arr.length;i++) if(arr[i].id===id) return arr[i]; return null; }
function uNm(id){ var u=xid(DB.usuarios,id); return u?u.nombre:'?'; }
function cNm(id){ var c=xid(DB.clientes,id); return c?c.nombre:'?'; }
function pNm(id){ var p=xid(DB.proyectos,id); return p?p.nombre:'?'; }
function ini(s){ var parts=(s||'?').split(' ').filter(function(w){return w.length>0;}); return (parts.length>=2?parts[0][0]+parts[1][0]:parts[0].slice(0,2)).toUpperCase(); }
function me(){ return SES ? xid(DB.usuarios,SES.userId) : null; }
function adm(){ var u=me(); return u && u.rol==='admin'; }
function canEditTask(t){
  // Hotfix 2.0.2: operación ejecutiva.
  // Cualquier usuario autenticado que ya ve una tarea/proyecto puede gestionar sus tareas.
  // Evita bloquear a coordinación cuando el responsable visible es distinto al usuario técnico.
  return !!(t && SES);
}
function iconHtml(name){ return '<i data-lucide="'+esc(name||'folder')+'"></i>'; }
function hydrateIcons(){ try{ if(window.lucide) window.lucide.createIcons(); }catch(e){} }
function projectMetaLine(desc,key){ var m=String(desc||'').match(new RegExp('^\\s*'+key+'\\s*:\\s*(.+)$','im')); return m?m[1].trim():''; }
function stripProjectMeta(desc){ return String(desc||'').split(/\r?\n/).filter(function(line){return !/^\s*(Categoria|Categoría|Icono|Color|Frentes)\s*:/i.test(line);}).join('\n').trim(); }
function suggestProjectVisual(name,desc){
  var s=(String(name||'')+' '+String(desc||'')).toLowerCase();
  if(/wings|restaurante|parrilla|comida/.test(s)) return {category:'Restaurante',icon:'utensils',color:'#D97706'};
  if(/zafir|clinica|clínica|hospital|salud/.test(s)) return {category:'Salud',icon:'hospital',color:'#DC2626'};
  if(/menlun|quimic|químic|limpieza/.test(s)) return {category:'Químicos y limpieza',icon:'flask-conical',color:'#059669'};
  if(/pink|moda|textil|ropa|confecci/.test(s)) return {category:'Moda y confección',icon:'shirt',color:'#DB2777'};
  if(/cime|power|energ|eléctric|electric/.test(s)) return {category:'Energía',icon:'zap',color:'#CA8A04'};
  if(/ofunam|música|musica|orquesta/.test(s)) return {category:'Cultura y música',icon:'music-2',color:'#7C3AED'};
  if(/prokicks|futbol|fútbol|deport/.test(s)) return {category:'Deporte',icon:'trophy',color:'#0284C7'};
  return {category:'Servicios profesionales',icon:'briefcase-business',color:'#2563EB'};
}
function projectVisual(p){
  var suggestion=suggestProjectVisual(p&&p.nombre,p&&p.descripcion);
  return {category:projectMetaLine(p&&p.descripcion,'Categor(?:ia|ía)')||suggestion.category,icon:projectMetaLine(p&&p.descripcion,'Icono')||suggestion.icon,color:projectMetaLine(p&&p.descripcion,'Color')||suggestion.color};
}
function buildProjectDescription(desc,category,icon,color){
  var clean=stripProjectMeta(desc);
  return ['Categoria: '+category,'Icono: '+icon,'Color: '+color,clean].filter(Boolean).join('\n');
}

function smTemplateCatalog(){
  return {
    vacio:{label:'Proyecto vacío',fronts:[],tasks:[]},
    consultoria:{label:'Consultoría general',fronts:['Diagnóstico','Estrategia','Ejecución','Seguimiento','Reporte ejecutivo'],tasks:[
      ['Diagnóstico','Levantar información inicial','Solicitar información base y contexto del cliente',3],
      ['Estrategia','Definir objetivo y alcance','Alinear entregables, responsables y fechas',5],
      ['Ejecución','Ejecutar plan de trabajo','Iniciar actividades prioritarias',10],
      ['Seguimiento','Revisar avances semanales','Actualizar riesgos, pendientes y próximos pasos',7],
      ['Reporte ejecutivo','Preparar reporte de avance','Generar reporte ejecutivo para revisión',14]
    ]},
    campana:{label:'Campaña digital',fronts:['Estrategia','Contenido','Diseño','Publicación','Reporte'],tasks:[
      ['Estrategia','Definir objetivo de campaña','Confirmar audiencia, oferta y CTA principal',3],
      ['Contenido','Desarrollar mensajes clave','Preparar copies y lineamientos de comunicación',5],
      ['Diseño','Producir piezas creativas','Diseñar materiales prioritarios de campaña',7],
      ['Publicación','Programar publicaciones y pauta','Definir calendario, canales y presupuesto',9],
      ['Reporte','Medir resultados de campaña','Preparar reporte de desempeño y aprendizajes',14]
    ]},
    crm:{label:'CRM / implementación',fronts:['Diagnóstico','Base de datos','Pipeline','Automatización','Capacitación'],tasks:[
      ['Diagnóstico','Mapear proceso comercial','Documentar etapas, responsables y puntos de control',3],
      ['Base de datos','Depurar base inicial','Ordenar clientes, prospectos y campos críticos',5],
      ['Pipeline','Configurar pipeline comercial','Definir estados, probabilidades y reglas de seguimiento',7],
      ['Automatización','Definir alertas y reportes','Configurar recordatorios y próximos pasos',10],
      ['Capacitación','Capacitar usuarios clave','Explicar uso operativo, reportes e historial',14]
    ]},
    evento:{label:'Evento / activación',fronts:['Concepto','Producción','Convocatoria','Operación','Post-evento'],tasks:[
      ['Concepto','Definir formato del evento','Alinear objetivo, público, sede y narrativa',3],
      ['Producción','Preparar logística y materiales','Confirmar recursos, responsables y tiempos',7],
      ['Convocatoria','Activar invitaciones y comunicación','Lanzar convocatoria y seguimiento de asistentes',10],
      ['Operación','Ejecutar evento / activación','Coordinar operación y registro de incidencias',14],
      ['Post-evento','Cerrar reporte y aprendizajes','Documentar resultados, contenido y próximos pasos',16]
    ]},
    alianza:{label:'Alianza / patrocinio',fronts:['Prospecto','Propuesta','Negociación','Formalización','Activación'],tasks:[
      ['Prospecto','Identificar aliado o patrocinador','Validar interés, contacto y oportunidad',3],
      ['Propuesta','Preparar propuesta comercial','Definir beneficios, entregables y contraprestaciones',5],
      ['Negociación','Dar seguimiento a negociación','Resolver dudas y ajustar condiciones',10],
      ['Formalización','Preparar convenio o acuerdo','Documentar compromisos y responsables',14],
      ['Activación','Ejecutar plan de alianza','Coordinar implementación, evidencias y reporte',21]
    ]},
    diagnostico:{label:'Diagnóstico operativo',fronts:['Levantamiento','Hallazgos','Procesos','Indicadores','Plan de acción'],tasks:[
      ['Levantamiento','Agendar entrevistas iniciales','Confirmar participantes y calendario de diagnóstico',3],
      ['Hallazgos','Consolidar hallazgos críticos','Ordenar problemas, causas y riesgos',7],
      ['Procesos','Mapear procesos actuales','Documentar flujo, responsables y cuellos de botella',10],
      ['Indicadores','Definir KPIs de control','Proponer métricas, semáforos y responsables',12],
      ['Plan de acción','Presentar plan de trabajo','Preparar acciones, prioridades y próximos pasos',15]
    ]},
    comercial:{label:'Seguimiento comercial',fronts:['Prospección','Contacto','Reunión','Propuesta','Cierre'],tasks:[
      ['Prospección','Definir lista de prospectos','Priorizar oportunidades y contactos clave',3],
      ['Contacto','Realizar primer acercamiento','Enviar mensaje inicial y registrar respuesta',5],
      ['Reunión','Agendar reunión comercial','Preparar objetivo y agenda de conversación',7],
      ['Propuesta','Enviar propuesta de valor','Documentar monto, alcance y siguiente paso',10],
      ['Cierre','Dar seguimiento a cierre','Confirmar decisión, objeciones y fecha de respuesta',14]
    ]}
  };
}
function smTemplateByKey(key){ return smTemplateCatalog()[key] || smTemplateCatalog().vacio; }
function smGuidedOptions(){
  return [
    ['estrategia','Estrategia'],['ventas','Ventas'],['marketing','Marketing'],['crm','CRM'],['operacion','Operación'],['eventos','Eventos'],['reportes','Reportes'],['contenido','Contenido'],['patrocinios','Patrocinios'],['documentacion','Documentación'],['seguimiento','Seguimiento comercial']
  ];
}
function smGuidedBuild(selected){
  selected = selected || [];
  var map={
    estrategia:{fronts:['Diagnóstico','Estrategia'],tasks:[['Diagnóstico','Levantar contexto del cliente','Solicitar información inicial y prioridades',3],['Estrategia','Definir objetivo y plan de trabajo','Alinear alcance, entregables y responsables',5]]},
    ventas:{fronts:['Estrategia comercial','Prospección','Pipeline'],tasks:[['Estrategia comercial','Definir oferta y oportunidad comercial','Alinear propuesta de valor y segmento objetivo',4],['Prospección','Identificar prospectos prioritarios','Preparar lista de contactos y oportunidades',7],['Pipeline','Dar seguimiento a oportunidades','Actualizar etapa, probabilidad y próximo paso',10]]},
    marketing:{fronts:['Estrategia de marketing','Campaña','Reporte'],tasks:[['Estrategia de marketing','Definir mensaje y campaña','Alinear audiencia, canales y CTA',5],['Campaña','Activar piezas y publicaciones','Programar materiales y responsables',8],['Reporte','Medir desempeño de marketing','Preparar indicadores y aprendizajes',14]]},
    crm:{fronts:['CRM','Automatización'],tasks:[['CRM','Configurar estructura de seguimiento','Definir etapas, responsables y campos críticos',7],['Automatización','Definir alertas operativas','Crear reglas de seguimiento y vencimiento',10]]},
    operacion:{fronts:['Operación','Procesos'],tasks:[['Operación','Mapear operación actual','Identificar cuellos de botella y responsables',5],['Procesos','Estandarizar flujo de trabajo','Documentar proceso y SLA básico',10]]},
    eventos:{fronts:['Evento / activación','Logística'],tasks:[['Evento / activación','Definir concepto de activación','Alinear objetivo, sede y convocatoria',5],['Logística','Preparar producción y materiales','Confirmar recursos, tiempos y responsables',10]]},
    reportes:{fronts:['Reporte ejecutivo','Indicadores'],tasks:[['Indicadores','Definir KPIs del proyecto','Alinear métricas, semáforos y frecuencia',5],['Reporte ejecutivo','Generar primer reporte ejecutivo','Preparar resumen, riesgos y próximos pasos',7]]},
    contenido:{fronts:['Contenido','Diseño'],tasks:[['Contenido','Definir línea de contenido','Preparar temas, formatos y calendario',5],['Diseño','Producir piezas prioritarias','Diseñar materiales base para validación',8]]},
    patrocinios:{fronts:['Alianzas / patrocinios','Propuesta'],tasks:[['Alianzas / patrocinios','Mapear posibles aliados','Identificar marcas, contactos y beneficios',5],['Propuesta','Preparar propuesta de patrocinio','Definir paquetes, entregables y contraprestaciones',8]]},
    documentacion:{fronts:['Documentación','Entregables'],tasks:[['Documentación','Organizar carpeta del proyecto','Centralizar documentos, minutas y acuerdos',3],['Entregables','Definir entregables iniciales','Confirmar formato, responsable y fecha',6]]},
    seguimiento:{fronts:['Seguimiento comercial','Reuniones'],tasks:[['Seguimiento comercial','Definir rutina de seguimiento','Configurar responsables y fechas de revisión',5],['Reuniones','Agendar primera reunión de control','Confirmar agenda, participantes y acuerdos esperados',7]]}
  };
  var fronts=[], tasks=[];
  selected.forEach(function(k){ var b=map[k]; if(!b)return; b.fronts.forEach(function(f){if(fronts.indexOf(f)<0)fronts.push(f);}); b.tasks.forEach(function(t){tasks.push(t);}); });
  if(!fronts.length){ fronts=['Diagnóstico','Estrategia','Seguimiento','Reporte ejecutivo']; tasks=[['Diagnóstico','Levantar contexto inicial','Solicitar información y confirmar prioridades',3],['Estrategia','Definir alcance del proyecto','Alinear objetivo, responsables y próximos pasos',5],['Seguimiento','Revisar avances semanales','Actualizar pendientes y riesgos',7],['Reporte ejecutivo','Preparar reporte inicial','Generar lectura ejecutiva del proyecto',14]]; }
  return {label:'Creación guiada',fronts:fronts,tasks:tasks};
}
function smCreationPlan(){
  var mode = (document.getElementById('f_create_mode')||{}).value || 'vacio';
  if(mode==='template') return smTemplateByKey((document.getElementById('f_template')||{}).value||'consultoria');
  if(mode==='guided'){
    var selected=Array.prototype.map.call(document.querySelectorAll('[data-guide-option]:checked'),function(el){return el.value;});
    return smGuidedBuild(selected);
  }
  return smTemplateByKey('vacio');
}

function projectDescription(p){ return stripProjectMeta(p&&p.descripcion)||cNm(p&&p.cliente_id); }
function projectAlertCount(pid){ return getAlerts().filter(function(a){return a.projectId===pid;}).length; }
function userPrefs(id){ return DB.notification_preferences.find(function(p){return p.user_id===id;})||{email:'',email_enabled:true,browser_enabled:true,daily_digest:true,digest_hour:8,timezone:'America/Mexico_City'}; }
function trackEvent(name,props){
  if(!SES) return;
  var clean={}; Object.keys(props||{}).forEach(function(k){if(/^(project_id|task_id|view|source|tab)$/.test(k)) clean[k]=props[k];});
  sb.from('usage_events').insert({user_id:SES.userId,event_name:name,properties:clean}).then(function(){}).catch(function(){});
  try{ if(window.mixpanel && SM_CONFIG.mixpanelToken) window.mixpanel.track(name,clean); }catch(e){}
}

function toast(msg, col){
  var el=document.getElementById('toast');
  el.textContent=msg;
  el.style.borderLeftColor = col==='r'?'var(--red)':col==='g'?'var(--green)':'var(--navy)';
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.classList.remove('show'); }, 2800);
}

/* ── SEMAFORO ── */
function sem(t){
  if(t.estado==='terminada') return '<span class="sem"><span class="dot dg"></span>Completa</span>';
  if(!t.fecha_vencimiento) return '<span class="sem"><span class="dot dg"></span>—</span>';
  var d = dayDiff(t.fecha_vencimiento);
  if(d<0) return '<span class="sem"><span class="dot dr"></span>Vencida</span>';
  if(d<=1) return '<span class="sem"><span class="dot dr"></span>'+d+'d</span>';
  if(d<=3) return '<span class="sem"><span class="dot dy"></span>'+d+'d</span>';
  return '<span class="sem"><span class="dot dg"></span>'+d+'d</span>';
}

/* ── BADGES ── */
function bSt(s){
  var m = {
    pendiente:'<span class="badge bx_">Pendiente</span>',
    en_proceso:'<span class="badge bb_">En proceso</span>',
    en_revision:'<span class="badge by_">En revisión</span>',
    aprobada:'<span class="badge bc_">Aprobada</span>',
    terminada:'<span class="badge bg_">Terminada</span>',
    activo:'<span class="badge bg_">Activo</span>',
    pausado:'<span class="badge by_">Pausado</span>',
    cerrado:'<span class="badge bx_">Cerrado</span>',
    pagado:'<span class="badge bg_">Pagado</span>',
    inactivo:'<span class="badge bx_">Inactivo</span>'
  };
  return m[s] || '<span class="badge bx_">'+esc(s)+'</span>';
}
function bPr(p){
  var m = {baja:'<span class="badge bx_">Baja</span>',media:'<span class="badge bb_">Media</span>',alta:'<span class="badge by_">Alta</span>',critica:'<span class="badge br_">Crítica</span>'};
  return m[p] || '<span class="badge bx_">'+esc(p)+'</span>';
}
function bPi(p){
  var m = {prospecto:'<span class="badge bx_">Prospecto</span>',propuesta:'<span class="badge by_">Propuesta</span>',negociacion:'<span class="badge bb_">Negociación</span>',ejecucion:'<span class="badge bc_">Ejecución</span>',cerrado_ganado:'<span class="badge bg_">Ganado</span>',cerrado_perdido:'<span class="badge br_">Perdido</span>'};
  return m[p] || '<span class="badge bx_">'+esc(p)+'</span>';
}
function bCrm(s){
  var m = {por_contactar:'<span class="badge bx_">Por contactar</span>',contactado:'<span class="badge bb_">Contactado</span>',respondio:'<span class="badge bc_">Respondió</span>',reunion_agendada:'<span class="badge by_">Reunión agendada</span>',propuesta_enviada:'<span class="badge bb_">Propuesta enviada</span>',negociacion:'<span class="badge by_">Negociación</span>',aprobado:'<span class="badge bg_">Aprobado</span>',rechazado:'<span class="badge br_">Rechazado</span>',dormido:'<span class="badge bx_">Dormido</span>'};
  return m[s] || (s?'<span class="badge bx_">'+esc(s)+'</span>':'<span class="badge bx_">Sin etapa</span>');
}
function crmEnabled(){
  return DB.tareas.some(function(t){ return Object.prototype.hasOwnProperty.call(t,'siguiente_accion'); });
}
function descVal(t,key){
  var re = new RegExp('^'+key+'\\s*:\\s*(.+)$','im');
  var m = String(t.descripcion||'').match(re);
  return m ? m[1].trim() : '';
}
var GROUPS = ['Embajadas','Fundaciones','Empresas','General'];
var PROKICKS_INTERNAL_PEOPLE = ['Billi','Juan','Pako','Jorge','Linda','Dary','Erika','Fernando','Sean','Jonathan'];
var PROKICKS_WORK_FRONTS = ['Indoor Community','Comunidad ProKicks','Redes sociales'];
var PROKICKS_PLAN = [
  {title:'Indoor Community',front:'Indoor Community',subtasks:[
    'Revisión y análisis del evento de Indoor Community',
    'Planeación y organización de futuros torneos ProKicks',
    'Artículos promocionales y premios para futuros torneos',
    'Desarrollo de mercancía ProKicks: playeras, stickers y otros productos',
    'Promocionales para activaciones, escuelas, negocios y eventos',
    'Registros para torneos'
  ]},
  {title:'Comunidad ProKicks',front:'Comunidad ProKicks',subtasks:[
    'SPOT Sur CDMX',
    'SPOT Tlatelolco',
    'Registros para torneos'
  ]},
  {title:'Redes sociales',front:'Redes sociales',subtasks:[
    'Incrementar el reconocimiento de la marca ProKicks',
    'Aumentar seguidores en redes sociales',
    'Generar tráfico hacia el sitio web y la tienda en línea',
    'Aumentar ventas e interacción con clientes',
    'Definir objetivo y llamada a la acción de cada contenido'
  ]}
];
function isOfunamProject(p){ return !!p && /ofunam/i.test(String(p.nombre||'')); }
function isProkicksProject(p){ return !!p && /prokicks/i.test(String(p.nombre||'')); }
function taskProject(t){ return t ? xid(DB.proyectos,t.proyecto_id) : null; }
function configuredProjectGroups(p){
  var m = String(p&&p.descripcion||'').match(/(?:^|\n)\s*Frentes\s*:\s*([^\n]+)/i);
  if(!m) return [];
  return m[1].split('|').map(function(g){return g.trim();}).filter(Boolean);
}
function groupsForProject(p){
  if(isOfunamProject(p)) return ['Embajadas','Fundaciones','Empresas','General'];
  if(isProkicksProject(p)){
    return PROKICKS_WORK_FRONTS.concat(configuredProjectGroups(p)).filter(function(g,i,a){return a.findIndex(function(x){return x.toLowerCase()===g.toLowerCase();})===i;});
  }
  var configured = configuredProjectGroups(p);
  return configured.length ? configured : ['General'];
}
function cleanGroupName(v,p){
  var s = String(v||'').trim();
  var list = p ? groupsForProject(p) : GROUPS;
  var hit = list.find(function(g){return g.toLowerCase()===s.toLowerCase();});
  return hit || 'General';
}
function isGroupHeader(t){
  var p=taskProject(t);
  var title = String(t&&t.titulo||'').trim();
  if(isProkicksProject(p)) return PROKICKS_WORK_FRONTS.some(function(g){return g.toLowerCase()===title.toLowerCase();}) || /^CRM Prokicks$/i.test(title);
  if(!isOfunamProject(p)) return false;
  return /^(empresas|fundaciones)$/i.test(title) || (/^embajadas/i.test(title) && !/—/.test(title));
}
function groupFromHeader(t){
  var title = String(t&&t.titulo||'').trim();
  if(/^empresas$/i.test(title)) return 'Empresas';
  if(/^fundaciones$/i.test(title)) return 'Fundaciones';
  if(/^embajadas/i.test(title)) return 'Embajadas';
  return '';
}
function taskGroup(t){
  var p = taskProject(t);
  if(isProkicksProject(p)) return cleanGroupName(descVal(t,'Frente'),p);
  return cleanGroupName(descVal(t,'Grupo') || groupFromHeader(t) || (isOfunamProject(p)&&/—/.test(t&&t.titulo||'')?'Embajadas':'General'), p);
}
function stripDescFields(desc){
  var keys = ['Grupo','Email','Telefono','Teléfono','Direccion','Dirección','Gancho','Instrumento','Siguiente accion','Siguiente acción','Proximo seguimiento','Próximo seguimiento','Etapa','Probabilidad','Monto estimado','Frente','Responsable interno','Colaboradores internos','Objetivo','Entregable','KPI','Meta','CTA'];
  var lines = String(desc||'').split(/\r?\n/);
  return lines.filter(function(line){
    return !keys.some(function(k){ return new RegExp('^'+k+'\\s*:','i').test(line); });
  }).join('\n').trim();
}
function buildDesc(base,fields){
  fields = fields || {};
  var original = {descripcion:String(base||'')};
  function val(prop,label,aliases){
    if(Object.prototype.hasOwnProperty.call(fields,prop)) return fields[prop];
    var v=descVal(original,label);
    if(!v && aliases) for(var i=0;i<aliases.length;i++){v=descVal(original,aliases[i]);if(v)break;}
    return v;
  }
  var lines = [];
  var specs=[
    ['grupo','Grupo'],['frente','Frente'],['responsableInterno','Responsable interno'],['colaboradoresInternos','Colaboradores internos'],
    ['objetivo','Objetivo'],['entregable','Entregable'],['kpi','KPI'],['meta','Meta'],['cta','CTA'],
    ['email','Email'],['tel','Telefono',['Teléfono']],['dir','Direccion',['Dirección']],['gancho','Gancho'],['instrumento','Instrumento'],
    ['accion','Siguiente accion',['Siguiente acción']],['seguimiento','Proximo seguimiento',['Próximo seguimiento']],
    ['etapa','Etapa'],['probabilidad','Probabilidad'],['monto','Monto estimado']
  ];
  specs.forEach(function(s){var v=val(s[0],s[1],s[2]);if(v!==undefined&&v!==null&&String(v).trim())lines.push(s[1]+': '+String(v).trim());});
  var rest = stripDescFields(base);
  return lines.concat(rest?['',rest]:[]).join('\n');
}
function pkTaskFront(t){ return descVal(t,'Frente') || (PROKICKS_WORK_FRONTS.indexOf(String(t&&t.titulo||''))>=0?t.titulo:'Otros'); }
function pkInternalOwner(t){ return descVal(t,'Responsable interno') || 'Por asignar'; }
function pkCollaborators(t){ return String(descVal(t,'Colaboradores internos')||'').split('|').map(function(v){return v.trim();}).filter(Boolean); }
function pkTaskProgress(t){
  var subs=DB.subtareas.filter(function(s){return s.tarea_id===t.id;});
  var done=subs.filter(function(s){return s.estado==='terminada';}).length;
  return {subs:subs,done:done,pct:subs.length?Math.round(done/subs.length*100):(t.estado==='terminada'?100:0)};
}
function lastActivity(t){
  var dates = [];
  if(t.created_at) dates.push(t.created_at);
  DB.comentarios.filter(function(c){return c.tarea_id===t.id;}).forEach(function(c){ if(c.created_at) dates.push(c.created_at); });
  return dates.length ? dates.sort().pop() : '';
}
function daysSince(s){
  if(!s) return null;
  return Math.floor((new Date()-dateObj(s))/864e5);
}
function nextAction(t){
  return t.siguiente_accion || descVal(t,'Siguiente accion') || descVal(t,'Siguiente acción') || '';
}
function followDate(t){
  return t.fecha_proximo_seguimiento || descVal(t,'Proximo seguimiento') || descVal(t,'Próximo seguimiento') || '';
}
function crmHealth(t){
  if(t.estado==='terminada') return {cl:'dg',txt:'Cerrada'};
  var dDue = t.fecha_vencimiento ? dayDiff(t.fecha_vencimiento) : 999;
  var dFollow = followDate(t) ? dayDiff(followDate(t)) : null;
  var dAct = daysSince(lastActivity(t));
  if(!t.owner_id) return {cl:'dr',txt:'Sin responsable'};
  if(dDue<0) return {cl:'dr',txt:'Vencida'};
  if(dFollow!==null && dFollow<0) return {cl:'dr',txt:'Seguimiento vencido'};
  if(!nextAction(t)) return {cl:'dr',txt:'Sin siguiente acción'};
  if(t.estado==='en_revision' && dAct!==null && dAct>=5) return {cl:'dr',txt:'Revisión bloqueada'};
  if(dAct!==null && dAct>=14) return {cl:'dr',txt:'Sin movimiento '+dAct+'d'};
  if(dDue<=7) return {cl:'dy',txt:dDue<=1?'Vence hoy/mañana':'Vence en '+dDue+'d'};
  if(dFollow!==null && dFollow<=1) return {cl:'dy',txt:'Seguimiento inmediato'};
  if(dAct!==null && dAct>=7) return {cl:'dy',txt:'Seguimiento frío'};
  return {cl:'dg',txt:'En control'};
}
function automationReason(t){
  if(t.estado==='terminada') return 'Cerrada';
  var h=crmHealth(t);
  var d=t.fecha_vencimiento?dayDiff(t.fecha_vencimiento):null;
  var fs=followDate(t), df=fs?dayDiff(fs):null;
  if(!t.owner_id) return 'Asignar responsable';
  if(d!==null && d<0) return 'Resolver vencimiento';
  if(df!==null && df<0) return 'Actualizar seguimiento vencido';
  if(!nextAction(t)) return 'Definir siguiente acción';
  if(t.estado==='en_revision') return 'Desbloquear revisión';
  return h.txt;
}
function automationBucket(t){
  if(t.estado==='terminada') return 'cerrada';
  var d=t.fecha_vencimiento?dayDiff(t.fecha_vencimiento):999;
  var fs=followDate(t), df=fs?dayDiff(fs):999;
  if(d<0) return 'vencidas';
  if(df<0) return 'seguimiento_vencido';
  if(!t.owner_id) return 'sin_dueno';
  if(!nextAction(t)) return 'sin_accion';
  if(t.estado==='en_revision') return 'revision';
  if(d>=0&&d<=7) return 'proximos_7';
  return 'control';
}
function crmPanel(t){
  var h = crmHealth(t), la = lastActivity(t), ds = daysSince(la);
  var etapa = t.etapa_crm || descVal(t,'Etapa') || '';
  var proba = t.probabilidad ? t.probabilidad+'%' : '—';
  var monto = t.monto_estimado ? '$'+Number(t.monto_estimado).toLocaleString() : '—';
  return '<div style="border-top:1px solid var(--line);padding-top:12px">'
    +'<div class="hbar '+(h.cl==='dr'?'crmrisk':h.cl==='dy'?'crmwarn':'')+'"><span class="dot '+h.cl+'" style="width:12px;height:12px"></span>Control CRM · '+esc(h.txt)+'</div>'
    +'<div class="crmgrid" style="margin-top:10px">'
    +'<div class="crmcell"><div class="dl">Etapa</div><div class="dv">'+bCrm(etapa)+'</div></div>'
    +'<div class="crmcell"><div class="dl">Siguiente acción</div><div class="dv">'+esc(nextAction(t)||'Por definir')+'</div></div>'
    +'<div class="crmcell"><div class="dl">Próximo seguimiento</div><div class="dv">'+fmt(followDate(t))+'</div></div>'
    +'<div class="crmcell"><div class="dl">Última actividad</div><div class="dv">'+(la?fmtdt(la)+' · '+ds+'d':'Sin actividad')+'</div></div>'
    +'<div class="crmcell"><div class="dl">Email</div><div class="dv">'+esc(descVal(t,'Email')||'Por nutrir')+'</div></div>'
    +'<div class="crmcell"><div class="dl">Teléfono</div><div class="dv">'+esc(descVal(t,'Telefono')||descVal(t,'Teléfono')||'Por nutrir')+'</div></div>'
    +'<div class="crmcell"><div class="dl">Gancho</div><div class="dv">'+esc(descVal(t,'Gancho')||'Por definir')+'</div></div>'
    +'<div class="crmcell"><div class="dl">Probabilidad / monto</div><div class="dv">'+proba+' · '+monto+'</div></div>'
    +'</div></div>';
}
function taskAlertsHtml(t){
  var items = [];
  var h = crmHealth(t);
  var d = t.fecha_vencimiento ? dayDiff(t.fecha_vencimiento) : null;
  if(t.estado!=='terminada' && d!==null && d<0) items.push({cl:'ar',ic:'🚨',ti:'Vencida',su:'Fecha término: '+fmt(t.fecha_vencimiento)});
  else if(t.estado!=='terminada' && d!==null && d<=3) items.push({cl:d<=1?'ar':'',ic:'⚠️',ti:d<=1?'Vence hoy/mañana':'Vence pronto',su:'Fecha término: '+fmt(t.fecha_vencimiento)});
  if(t.estado!=='terminada' && !nextAction(t)) items.push({cl:'ar',ic:'🎯',ti:'Sin siguiente acción',su:'Define el próximo paso en Editar fechas y datos'});
  var fs = followDate(t);
  if(t.estado!=='terminada' && fs){
    var df = dayDiff(fs);
    if(df<0) items.push({cl:'ar',ic:'📌',ti:'Seguimiento vencido',su:'Programado para '+fmt(fs)});
    else if(df<=1) items.push({cl:'',ic:'📌',ti:'Seguimiento hoy/mañana',su:'Programado para '+fmt(fs)});
  }
  var ds = daysSince(lastActivity(t));
  if(t.estado!=='terminada' && ds!==null && ds>=14) items.push({cl:'ar',ic:'⏳',ti:'Sin movimiento '+ds+'d',su:'Agrega comentario o actualiza la siguiente acción'});
  else if(t.estado!=='terminada' && ds!==null && ds>=7) items.push({cl:'',ic:'⏳',ti:'Seguimiento frío '+ds+'d',su:'Conviene registrar avance'});
  if(!items.length && h.cl==='dg') items.push({cl:'',ic:'✅',ti:'Sin alertas críticas',su:h.txt});
  return '<div class="card" style="padding:14px"><div class="ch"><h3>Alertas y control</h3></div>'
    +items.map(function(a){return '<div class="alitem '+a.cl+'" style="margin-bottom:7px"><div class="alicon">'+a.ic+'</div><div><div class="altit">'+esc(a.ti)+'</div><div class="alsub">'+esc(a.su)+'</div></div></div>';}).join('')
    +'</div>';
}

/* ── ALERTS ── */
function getAlerts(){
  var a = [];
  var uid = SES ? SES.userId : '';
  function add(t,kind,severity,icon,title,subtitle){ a.push({key:kind+':'+t.id,kind:kind,severity:severity,cl:severity==='critical'?'ar':'',ic:icon,ti:title,su:subtitle,taskId:t.id,projectId:t.proyecto_id,userId:t.owner_id}); }
  DB.tareas.forEach(function(t){
    if(isGroupHeader(t)) return;
    if(!adm() && t.owner_id!==uid) return;
    if(t.estado==='terminada') return;
    var d = t.fecha_vencimiento ? dayDiff(t.fecha_vencimiento) : null;
    if(d!==null && d<0) add(t,'overdue','critical','🚨','Tarea vencida: '+t.titulo,pNm(t.proyecto_id)+' · '+uNm(t.owner_id));
    else if(d!==null && d<=1) add(t,'due_soon','critical','⚠️','Vence hoy/mañana: '+t.titulo,pNm(t.proyecto_id)+' · '+uNm(t.owner_id));
    else if(d!==null && d<=3) add(t,'due_soon','warning','⚠️','Vence en '+d+'d: '+t.titulo,pNm(t.proyecto_id)+' · '+uNm(t.owner_id));
    if(!nextAction(t)) add(t,'missing_action','critical','🎯','Sin siguiente acción: '+t.titulo,pNm(t.proyecto_id)+' · define el próximo paso');
    var dAct = daysSince(lastActivity(t));
    if(dAct!==null && dAct>=14) add(t,'inactive','critical','⏳','Sin movimiento '+dAct+'d: '+t.titulo,pNm(t.proyecto_id)+' · requiere seguimiento');
    else if(dAct!==null && dAct>=7) add(t,'inactive','warning','⏳','Seguimiento frío '+dAct+'d: '+t.titulo,pNm(t.proyecto_id));
    var fs = followDate(t);
    if(fs){
      var df = dayDiff(fs);
      if(df<0) add(t,'followup_overdue','critical','📌','Seguimiento vencido: '+t.titulo,'Programado para '+fmt(fs));
      else if(df<=1) add(t,'followup_due','warning','📌','Seguimiento hoy/mañana: '+t.titulo,pNm(t.proyecto_id));
    }
  });
  if(adm()){
    DB.pagos.forEach(function(pay){
      if(pay.estado==='pagado' || !pay.fecha_vencimiento) return;
      var d = dayDiff(pay.fecha_vencimiento);
      if(d<0) a.push({cl:'ar',ic:'💸',ti:'Pago vencido: '+pay.concepto,su:cNm(pay.cliente_id)+' · $'+Number(pay.monto).toLocaleString()});
      else if(d<=5) a.push({cl:'',ic:'💰',ti:'Pago próximo ('+d+'d): '+pay.concepto,su:cNm(pay.cliente_id)+' · $'+Number(pay.monto).toLocaleString()});
    });
  }
  return a.sort(function(x,y){return (x.severity==='critical'?0:1)-(y.severity==='critical'?0:1);});
}

/* ── DB CRUD ── */
async function loadUsersForLogin(){
  try{
    var u = await sb.from('usuarios').select('*').order('nombre');
    if(u.error) throw u.error;
    DB.usuarios = u.data || [];
    return DB.usuarios.length > 0;
  }catch(e){
    console.error('login users failed', e);
    return false;
  }
}
async function loadAll(){
  try {
    var [u,c,p,t,st,cm,en,pa,re] = await Promise.all([
      sb.from('usuarios').select('*').order('nombre'),
      sb.from('clientes').select('*').order('nombre'),
      sb.from('proyectos').select('*').order('created_at',{ascending:false}),
      sb.from('tareas').select('*').order('created_at',{ascending:false}),
      sb.from('subtareas').select('*').order('created_at'),
      sb.from('comentarios').select('*').order('created_at'),
      sb.from('entregables').select('*').order('created_at'),
      sb.from('pagos').select('*').order('created_at',{ascending:false}),
      sb.from('reuniones').select('*').order('fecha',{ascending:false})
    ]);
    DB.usuarios=u.data||[]; DB.clientes=c.data||[]; DB.proyectos=p.data||[];
    DB.tareas=t.data||[]; DB.subtareas=st.data||[]; DB.comentarios=cm.data||[];
    DB.entregables=en.data||[]; DB.pagos=pa.data||[]; DB.reuniones=re.data||[];
    var pk = await sb.from('prokicks_records').select('*').order('created_at',{ascending:false});
    var pkset = await sb.from('prokicks_settings').select('*');
    DB.prokicks_records = pk.error ? [] : (pk.data||[]);
    DB.prokicks_settings = pkset.error ? [] : (pkset.data||[]);
    var prefs = await sb.from('notification_preferences').select('*');
    DB.notification_preferences = prefs.error ? [] : (prefs.data||[]);
    var pu = await sb.from('proyecto_usuarios').select('*');
    DB.proyecto_usuarios = pu.error ? [] : (pu.data||[]);
    if(await normalizeProjectGroups()){
      var [t2,st2] = await Promise.all([
        sb.from('tareas').select('*').order('created_at',{ascending:false}),
        sb.from('subtareas').select('*').order('created_at')
      ]);
      DB.tareas=t2.data||DB.tareas; DB.subtareas=st2.data||DB.subtareas;
    }
    return true;
  } catch(e){ console.error(e); return false; }
}
async function normalizeProjectGroups(){
  if(!DB.tareas.length) return false;
  var changed = false;
  var headers = DB.tareas.filter(function(t){return isGroupHeader(t) && isOfunamProject(taskProject(t));});
  for(var i=0;i<headers.length;i++){
    var h = headers[i], g = groupFromHeader(h);
    var subs = DB.subtareas.filter(function(s){return s.tarea_id===h.id;});
    for(var j=0;j<subs.length;j++){
      var s = subs[j];
      var exists = DB.tareas.some(function(t){
        return t.proyecto_id===h.proyecto_id && !isGroupHeader(t) && String(t.titulo||'').trim().toLowerCase()===String(s.titulo||'').trim().toLowerCase() && taskGroup(t)===g;
      });
      if(exists) continue;
      var data = {
        proyecto_id:h.proyecto_id, owner_id:s.owner_id||h.owner_id, titulo:s.titulo,
        descripcion:buildDesc('',{grupo:g,accion:'Definir siguiente acción'}),
        prioridad:h.prioridad||'media', estado:s.estado||'pendiente',
        fecha_inicio:h.fecha_inicio||today(), fecha_vencimiento:s.fecha_vencimiento||h.fecha_vencimiento||pd(30),
        horas_estimadas:8, horas_reales:0
      };
      if(crmEnabled()){
        data.etapa_crm='por_contactar';
        data.siguiente_accion='Definir siguiente acción';
        data.fecha_proximo_seguimiento=null;
        data.ultima_actividad=new Date().toISOString();
      }
      var r = await sb.from('tareas').insert(data).select().single();
      if(!r.error) changed = true;
    }
  }
  for(var k=0;k<DB.tareas.length;k++){
    var t = DB.tareas[k];
    if(!isOfunamProject(taskProject(t)) || isGroupHeader(t) || descVal(t,'Grupo')) continue;
    var inferred = /—/.test(t.titulo||'') ? 'Embajadas' : '';
    if(!inferred) continue;
    var up = {descripcion:buildDesc(stripDescFields(t.descripcion),{grupo:inferred,email:descVal(t,'Email'),tel:descVal(t,'Telefono')||descVal(t,'Teléfono'),dir:descVal(t,'Direccion')||descVal(t,'Dirección'),gancho:descVal(t,'Gancho'),instrumento:descVal(t,'Instrumento'),accion:nextAction(t),seguimiento:followDate(t),etapa:t.etapa_crm||descVal(t,'Etapa'),probabilidad:t.probabilidad||descVal(t,'Probabilidad'),monto:t.monto_estimado||descVal(t,'Monto estimado')})};
    var ur = await sb.from('tareas').update(up).eq('id',t.id);
    if(!ur.error) changed = true;
  }
  return changed;
}
async function ins(tbl,data){
  var r = await sb.from(tbl).insert(data).select().single();
  if(r.error){ toast('Error: '+r.error.message,'r'); return null; }
  return r.data;
}
async function upd(tbl,id,data){
  var r = await sb.from(tbl).update(data).eq('id',id).select().single();
  if(r.error){ toast('Error al actualizar','r'); return null; }
  return r.data;
}
async function del(tbl,id){
  var r = await sb.from(tbl).delete().eq('id',id);
  if(r.error){ toast('Error al eliminar','r'); return false; }
  return true;
}
async function refresh(){
  await loadAll();
  buildProjectNav();
  render();
  updBadge();
}
async function manualRefresh(){
  toast('Actualizando datos…','g');
  await refresh();
  toast('Datos actualizados ✓','g');
}
function hardReloadApp(){
  var url = new URL(window.location.href);
  url.searchParams.set('v', Date.now());
  window.location.href = url.toString();
}
function requestBrowserNotifications(){
  if(!('Notification' in window)){toast('Este navegador no admite notificaciones','r');return;}
  Notification.requestPermission().then(function(p){toast(p==='granted'?'Notificaciones activadas ✓':'Permiso no concedido',p==='granted'?'g':'r');render();});
}
function maybeNotifyBrowser(){
  if(!SES || !('Notification' in window) || Notification.permission!=='granted') return;
  var critical=getAlerts().filter(function(a){return a.severity==='critical';}).slice(0,5);
  var seenKey='sm_alert_seen_'+SES.userId, seen=[];
  try{seen=JSON.parse(localStorage.getItem(seenKey)||'[]');}catch(e){}
  critical.forEach(function(a){if(seen.indexOf(a.key)<0){try{new Notification('SM OS · '+a.ti,{body:a.su,icon:'assets/sm-logo.png'});}catch(e){} seen.push(a.key);}});
  try{localStorage.setItem(seenKey,JSON.stringify(seen.slice(-100)));}catch(e){}
}
function addTaskToCalendar(id){
  var t=xid(DB.tareas,id); if(!t) return;
  var start=(t.fecha_proximo_seguimiento||t.fecha_inicio||today()).replace(/-/g,'');
  var end=(t.fecha_vencimiento||t.fecha_proximo_seguimiento||t.fecha_inicio||today()).replace(/-/g,'');
  var url='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(t.titulo)+'&dates='+start+'/'+end+'&details='+encodeURIComponent((nextAction(t)||'')+'\nProyecto: '+pNm(t.proyecto_id));
  window.open(url,'_blank','noopener'); trackEvent('calendar_opened',{task_id:id,project_id:t.proyecto_id});
}

/* ── MODAL ── */
function mOpen(tit,html,wide){
  document.getElementById('mtit').textContent = tit;
  document.getElementById('mbody').innerHTML = html;
  document.getElementById('mbox').className = 'mbox'+(wide?' wide':'');
  document.getElementById('mbg').classList.add('open');
  hydrateIcons();
}
function mClose(){ document.getElementById('mbg').classList.remove('open'); }
document.getElementById('mcls').onclick = mClose;
document.getElementById('mbg').addEventListener('click',function(e){ if(e.target.id==='mbg') mClose(); });

/* ── FORM HELPERS ── */
function fv(id){ var el=document.getElementById('f_'+id); return el?el.value:''; }
function FLD(id,lbl,typ,val){
  var v = val===undefined||val===null ? '' : val;
  return '<div class="fld"><label>'+esc(lbl)+'</label><input type="'+(typ||'text')+'" id="f_'+id+'" value="'+esc(v)+'"></div>';
}
function FTA(id,lbl,val){
  var v = val===undefined||val===null ? '' : val;
  return '<div class="fld"><label>'+esc(lbl)+'</label><textarea id="f_'+id+'">'+esc(v)+'</textarea></div>';
}
function FSL(id,lbl,opts,sel){
  var ops = opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(sel)?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('');
  return '<div class="fld"><label>'+esc(lbl)+'</label><select id="f_'+id+'">'+ops+'</select></div>';
}
function projectVisualFields(v){
  var icons=[['briefcase-business','Servicios'],['utensils','Restaurante'],['hospital','Salud'],['flask-conical','Químicos'],['shirt','Moda'],['zap','Energía'],['music-2','Música'],['trophy','Deporte'],['building-2','Empresa'],['graduation-cap','Educación']];
  var colors=['#2563EB','#7C3AED','#DB2777','#DC2626','#D97706','#CA8A04','#059669','#0284C7','#475569'];
  return '<div class="fld"><label>Categoría</label><input id="f_cat" value="'+esc(v.category)+'"></div>'
    +'<div class="fld"><label>Icono del proyecto</label><input type="hidden" id="f_ico" value="'+esc(v.icon)+'"><div class="icon-picker">'+icons.map(function(i){return '<button type="button" class="icon-choice '+(i[0]===v.icon?'selected':'')+'" title="'+i[1]+'" onclick="A.pickIcon(this,\''+i[0]+'\')">'+iconHtml(i[0])+'</button>';}).join('')+'</div></div>'
    +'<div class="fld"><label>Color del proyecto</label><input type="hidden" id="f_clr" value="'+esc(v.color)+'"><div class="icon-picker">'+colors.map(function(c){return '<button type="button" class="color-choice '+(c===v.color?'selected':'')+'" style="--swatch:'+c+'" aria-label="'+c+'" onclick="A.pickColor(this,\''+c+'\')"></button>';}).join('')+'</div></div>';
}

/* ── MY PROJECTS / TASKS ── */
function myProjs(){
  if(adm()) return DB.proyectos;
  var uid = SES.userId;
  return DB.proyectos.filter(function(p){
    return p.owner_id===uid
      || DB.tareas.some(function(t){ return t.proyecto_id===p.id && t.owner_id===uid; })
      || DB.proyecto_usuarios.some(function(pu){ return pu.proyecto_id===p.id && pu.usuario_id===uid; });
  });
}
function myTasks(){
  if(adm()) return DB.tareas.filter(function(t){return !isGroupHeader(t);});
  var uid = SES.userId;
  return DB.tareas.filter(function(t){ return !isGroupHeader(t) && t.owner_id===uid; });
}
function activeClientProjectId(){
  if(!CLIENT_PROJECT_FOCUS) return '';
  // Modo cliente reforzado: si hay proyecto activo, solo se muestra ese proyecto,
  // sin importar la vista o pestaña donde esté parado el usuario.
  if(FPID) return FPID;
  if(VIEW==='prokicks'){ var p=pkProject && pkProject(); return p&&p.id ? p.id : ''; }
  return '';
}
function buildProjectNav(){
  var box=document.getElementById('project-nav');
  if(!box) return;
  var search=document.querySelector('.project-search');
  var lbl=box.parentElement?box.parentElement.querySelector('.nav-lbl'):null;
  if(!SES){ box.innerHTML=''; return; }
  var focusId=activeClientProjectId();
  var q=PROJECT_QUERY.toLowerCase().trim();
  var base=myProjs().filter(function(p){return p.estado!=='cerrado';});
  var projs=(focusId ? base.filter(function(p){return p.id===focusId;}) : base.filter(function(p){return !q || String(p.nombre||'').toLowerCase().indexOf(q)>=0;}))
    .sort(function(a,b){return String(a.nombre||'').localeCompare(String(b.nombre||''),'es');});
  if(search) search.style.display=focusId?'none':'';
  if(lbl) lbl.textContent=focusId?'Proyecto visible':'Proyectos';
  box.innerHTML = (focusId?'<div class="client-privacy-pill"><span class="dot dg"></span>Modo cliente: solo se muestra el proyecto activo</div>':'') + projs.map(function(p){
    var v=projectVisual(p), count=projectAlertCount(p.id);
    return '<button class="nbtn pnavbtn '+((FPID===p.id || (VIEW==='prokicks'&&focusId===p.id))?'active':'')+'" style="--project-color:'+esc(v.color)+'" type="button" onclick="A.openProject(\''+p.id+'\')" title="'+esc(v.category)+'"><span class="project-mark">'+iconHtml(v.icon)+'</span><span class="nav-project-name">'+esc(p.nombre)+'</span>'+(count?'<span class="nav-count">'+count+'</span>':'')+'</button>';
  }).join('');
  hydrateIcons();
}
function filterProjectNav(value){ PROJECT_QUERY=value||''; buildProjectNav(); }
function toggleMobileNav(force){ document.body.classList.toggle('mobile-nav-open',typeof force==='boolean'?force:!document.body.classList.contains('mobile-nav-open')); }
function updateProjectNavActive(){
  var box=document.getElementById('project-nav'); if(!box) return;
  box.querySelectorAll('.pnavbtn').forEach(function(b){ b.classList.remove('active'); });
  var active = FPID ? box.querySelector('[onclick*="'+FPID+'"]') : null;
  if(VIEW==='proyectos' && active) active.classList.add('active');
}

/* ── RENDER ENGINE ── */
function render(){
  var vc = document.getElementById('vc');
  var map = {dashboard:vDB,alertas:vAL,ayuda:vAY,proyectos:vPR,tareas:vTA,kanban:vKA,gantt:vGA,calendario:vCA,pipeline:vPI,prokicks:vPK,florida:vFlorida,clientes:vCL,usuarios:vUS,reportes:vRE};
  vc.innerHTML = (map[VIEW]||vDB)();
  // Privacidad cliente 2.2.3: reconstruir el sidebar después de cualquier cambio de proyecto activo.
  // Antes solo se marcaba el activo; por eso podían quedar visibles proyectos cargados previamente.
  buildProjectNav();
  updTopbar();
  updateProjectNavActive();
  saveSession();
  hydrateIcons();
  setTimeout(maybeNotifyBrowser,50);
}
function updTopbar(){
  var nm = {dashboard:'Mis proyectos',alertas:'Alertas',ayuda:'Ayuda / Manual',proyectos:'Proyectos',tareas:'Mis Tareas',kanban:'Kanban',gantt:'Gantt',calendario:'Calendario',pipeline:'Pipeline',prokicks:'ProKicks',florida:'Florida · Darío',clientes:'Clientes',usuarios:'Usuarios',reportes:'Reportes'};
  var ar = {dashboard:'Centro de Trabajo',alertas:'Notificaciones',ayuda:'Centro de Soporte',proyectos:'Gestión de Proyectos',tareas:'Seguimiento',kanban:'Tablero Visual',gantt:'Cronograma',calendario:'Agenda',pipeline:'CRM Comercial',prokicks:'Operación Comercial',florida:'Expansión Florida',clientes:'Administración',usuarios:'Administración',reportes:'Por Proyecto'};
  document.getElementById('tb-ey').textContent = ar[VIEW]||'SM OS';
  document.getElementById('tb-ti').textContent = nm[VIEW]||'—';
  updClock();
  document.getElementById('tb-user').textContent = me()?me().nombre:'—';
}
function fmtNow(){
  var d = new Date();
  var fecha = d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  var hora = d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:false});
  return fecha+' · '+hora;
}
function updClock(){
  document.getElementById('tb-date').textContent = fmtNow();
}
function updBadge(){
  var n = getAlerts().length;
  var el = document.getElementById('abadge');
  if(n>0){el.textContent=n;el.style.display='block';}
  else el.style.display='none';
}
function saveSession(){
  if(!SES) return;
  try{
    localStorage.setItem(SESSION_KEY, JSON.stringify({userId:SES.userId,view:VIEW,fpid:FPID,ptab:PTAB,pktab:PKTAB}));
  }catch(e){}
}
function clearSession(){
  try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
}
function storedSession(){
  try{ return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); }catch(e){ return null; }
}
function nav(v){
  if(['proyectos','tareas','kanban','gantt','calendario','pipeline','reportes'].indexOf(v)<0) FPID='';
  VIEW = v;
  document.querySelectorAll('.nbtn').forEach(function(b){ b.classList.toggle('active', b.dataset.v===v); });
  render();
  saveSession();
  window.scrollTo(0,0);
  toggleMobileNav(false);
  trackEvent('view_opened',{view:v,project_id:FPID||null});
}
window.openProkicks = function(tab){
  PKTAB = tab || 'dashboard';
  mClose();
  nav('prokicks');
};
document.querySelectorAll('.nbtn').forEach(function(b){ b.addEventListener('click',function(){ nav(b.dataset.v); }); });
document.getElementById('project-search-input').addEventListener('input',function(){filterProjectNav(this.value);});
document.querySelector('.main').addEventListener('click',function(){if(document.body.classList.contains('mobile-nav-open')) toggleMobileNav(false);});

/* ══ VIEWS ══════════════════════════════════════════════════ */

function projectTasks(pid){
  return DB.tareas.filter(function(t){ return t.proyecto_id===pid && !isGroupHeader(t) && (adm() || t.owner_id===SES.userId || myProjs().some(function(p){return p.id===pid;})); });
}
function projectStats(p){
  var tasks = projectTasks(p.id);
  var done = tasks.filter(function(t){return t.estado==='terminada';}).length;
  var progress = tasks.length ? Math.round(done/tasks.length*100) : 0;
  var overdue = tasks.filter(function(t){return t.estado!=='terminada'&&t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;}).length;
  var noNext = tasks.filter(function(t){return crmEnabled() && t.estado!=='terminada' && !nextAction(t);}).length;
  var next = tasks.filter(function(t){return t.estado!=='terminada';}).sort(function(a,b){
    return dayDiff(a.fecha_vencimiento||pd(999))-dayDiff(b.fecha_vencimiento||pd(999));
  })[0];
  return {tasks:tasks,done:done,progress:progress,overdue:overdue,noNext:noNext,next:next};
}
function projectTree(p,limit){
  var tasks = projectTasks(p.id).sort(function(a,b){
    return dayDiff(a.fecha_vencimiento||pd(999))-dayDiff(b.fecha_vencimiento||pd(999));
  });
  if(!tasks.length) return '<div class="empty"><p>Sin registros en este proyecto</p></div>';

  function microTasks(t){
    var subs = DB.subtareas.filter(function(s){return s.tarea_id===t.id;});
    if(!subs.length) return '<div style="padding:7px 0 0 18px;color:var(--muted);font-size:12px">Sin microtareas</div>';
    return subs.map(function(s){
      return '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:7px 0 7px 18px;border-top:1px solid var(--line);font-size:12px;background:var(--surface2)">'
        +'<div><span style="color:var(--muted)">↳</span> <strong>'+esc(s.titulo)+'</strong><span style="color:var(--muted);margin-left:10px">'+esc(uNm(s.owner_id))+' · Término: '+fmt(s.fecha_vencimiento)+'</span></div>'
        +'<div style="display:flex;gap:5px;align-items:center">'+bSt(s.estado)+'<button class="btn btns btng" onclick="A.esub(\''+s.id+'\')">Editar microtarea</button></div>'
        +'</div>';
    }).join('');
  }
  function taskLine(t){
    return '<div style="border:1px solid var(--line);border-radius:var(--rs);padding:12px;background:var(--surface);margin-bottom:10px">'
      +'<div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:flex-start">'
      +'<div><div style="font-size:15px;font-weight:900;color:var(--ink);cursor:pointer" onclick="A.td(\''+t.id+'\')">'+esc(t.titulo)+'</div>'
      +'<span style="display:inline-flex;gap:5px;flex-wrap:wrap;margin-left:8px">'+bPr(t.prioridad)+' '+bSt(t.estado)+' '+sem(t)+'<span class="sem"><span class="dot '+crmHealth(t).cl+'"></span>'+esc(crmHealth(t).txt)+'</span></span>'
      +'<div style="color:var(--muted);font-size:12px;margin-top:6px">Inicio: '+fmt(t.fecha_inicio)+' · Término: '+fmt(t.fecha_vencimiento)+' · '+esc(nextAction(t)||'Sin siguiente acción')+'</div></div>'
      +'<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><button class="btn btns btnc" onclick="A.td(\''+t.id+'\')">Abrir ficha</button>'
      +(canEditTask(t)?'<button class="btn btns btng" onclick="A._tm(\''+t.id+'\')">Editar fechas/datos</button>':'')
      +'<button class="btn btns btng" onclick="A.nsub(\''+t.id+'\')">+ Microtarea</button><button class="btn btns btng" onclick="A.ncom(\''+t.id+'\')">Comentar</button></div>'
      +'</div>'+microTasks(t)+'</div>';
  }

  var shown = 0;
  var html = groupsForProject(p).map(function(g){
    var items = tasks.filter(function(t){return taskGroup(t)===g;});
    if(limit) items = items.slice(0, Math.max(0,limit-shown));
    shown += items.length;
    if(!items.length && (limit || g==='General')) return '';
    return '<div class="hbar" style="margin:12px 0 10px;justify-content:space-between"><span><span class="dot dg"></span>'+g+'</span><span class="badge bx_">'+items.length+'</span></div>'
      +(items.length?items.map(taskLine).join(''):'<div style="color:var(--muted);font-size:13px;margin:0 0 12px 14px">Sin registros</div>');
  }).join('');
  return html || '<div class="empty"><p>Sin registros en este proyecto</p></div>';
}
function lastComment(t){
  return DB.comentarios.filter(function(c){return c.tarea_id===t.id;}).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})[0] || null;
}
function taskActivityItems(t){
  if(!t) return [];
  var items=[];
  if(t.created_at) items.push({ts:t.created_at,type:'creada',title:'Tarea creada',body:t.titulo,user:t.owner_id,icon:'plus-circle'});
  DB.comentarios.filter(function(c){return c.tarea_id===t.id;}).forEach(function(c){items.push({ts:c.created_at,type:'comentario',title:/^SM OS ·/.test(c.texto||'')?'Actualización del sistema':'Comentario / avance',body:c.texto,user:c.usuario_id,icon:'message-square'});});
  DB.subtareas.filter(function(st){return st.tarea_id===t.id;}).forEach(function(st){items.push({ts:st.created_at,type:'microtarea',title:'Microtarea: '+st.titulo,body:'Estado: '+(st.estado||'pendiente')+' · Responsable: '+uNm(st.owner_id),user:st.owner_id,icon:'list-checks'});});
  DB.entregables.filter(function(f){return f.tarea_id===t.id;}).forEach(function(f){items.push({ts:f.created_at,type:'entregable',title:'Entregable agregado',body:f.nombre+(f.version?' · v'+f.version:''),user:f.usuario_id,icon:'paperclip'});});
  return items.sort(function(a,b){return String(b.ts||'').localeCompare(String(a.ts||''));});
}
function renderActivityTimeline(items,emptyText){
  if(!items.length) return '<div class="hbar">'+esc(emptyText||'Todavía no hay historial registrado.')+'</div>';
  return '<div class="activity-timeline">'+items.map(function(it){return '<div class="activity-item"><div class="activity-ico">'+iconHtml(it.icon||'circle')+'</div><div class="activity-body"><div class="activity-head"><strong>'+esc(it.title||'Actividad')+'</strong><span>'+fmtdt(it.ts)+'</span></div><div class="activity-meta">'+esc(uNm(it.user))+' · '+esc(it.type||'actividad')+'</div><div class="activity-copy">'+esc(String(it.body||'').replace(/^SM OS ·\s*/,''))+'</div></div></div>';}).join('')+'</div>';
}
function taskDiffText(oldT,data){
  var changes=[];
  function add(label,oldVal,newVal,fmtFn){
    var a=oldVal||'', b=newVal||'';
    if(String(a)!==String(b)) changes.push(label+': '+(fmtFn?fmtFn(a):a||'—')+' → '+(fmtFn?fmtFn(b):b||'—'));
  }
  add('Estado',oldT.estado,data.estado,function(v){return String(v).replace('_',' ');});
  add('Responsable',oldT.owner_id,data.owner_id,uNm);
  add('Prioridad',oldT.prioridad,data.prioridad);
  add('Inicio',oldT.fecha_inicio,data.fecha_inicio,fmt);
  add('Término',oldT.fecha_vencimiento,data.fecha_vencimiento,fmt);
  add('Siguiente acción',nextAction(oldT),data.siguiente_accion||descVal({descripcion:data.descripcion||''},'Siguiente accion'));
  add('Próximo seguimiento',followDate(oldT),data.fecha_proximo_seguimiento||descVal({descripcion:data.descripcion||''},'Proximo seguimiento'),fmt);
  return changes.join(' | ');
}
async function logTaskActivity(tid,text){
  if(!SES || !tid || !text) return null;
  try{ return await ins('comentarios',{tarea_id:tid,usuario_id:SES.userId,texto:'SM OS · '+text}); }catch(e){ return null; }
}
function projectActivityItems(pid){
  var items=[];
  projectTasks(pid).forEach(function(t){ taskActivityItems(t).forEach(function(it){ it.taskId=t.id; it.taskTitle=t.titulo; it.projectId=pid; items.push(it); }); });
  return items.sort(function(a,b){return String(b.ts||'').localeCompare(String(a.ts||''));});
}
function boardOwnerName(t,p){
  return isProkicksProject(p)?pkInternalOwner(t):uNm(t.owner_id);
}
function boardActionKind(t){
  var a = String(nextAction(t)||'').toLowerCase();
  if(!a) return 'sin_accion';
  if(/recordatorio|recordar/.test(a)) return 'recordatorio';
  if(/dalia/.test(a)) return 'dalia';
  if(/espera|respuesta/.test(a)) return 'espera';
  if(/propuesta|vobo|whatsapp/.test(a)) return 'propuesta';
  return 'otra';
}
function boardFollowKind(t){
  var f = followDate(t)||t.fecha_proximo_seguimiento||t.fecha_vencimiento;
  if(!f) return 'sin_fecha';
  var d = dayDiff(f);
  if(d<0) return 'vencido';
  if(d===0) return 'hoy';
  if(d<=7) return 'semana';
  return 'futuro';
}
function boardFilterTasks(tasks,p){
  var f = BOARD_FILTERS;
  return tasks.filter(function(t){
    if(f.estado && t.estado!==f.estado) return false;
    if(f.accion && boardActionKind(t)!==f.accion) return false;
    if(f.seguimiento && boardFollowKind(t)!==f.seguimiento) return false;
    if(f.responsable && boardOwnerName(t,p)!==f.responsable) return false;
    return true;
  });
}
function boardFilterSelect(label,key,options,value){
  return '<div class="board-filter"><label>'+esc(label)+'</label><select onchange="A.setBoardFilter(\''+key+'\',this.value)">'
    +options.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(value)?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')
    +'</select></div>';
}
function boardFiltersHtml(tasks,filtered,p){
  var owners = [];
  tasks.forEach(function(t){var o=boardOwnerName(t,p); if(o && owners.indexOf(o)<0) owners.push(o);});
  owners.sort(function(a,b){return a.localeCompare(b,'es');});
  var ownerOpts = [['','Todos']].concat(owners.map(function(o){return [o,o];}));
  var active=Object.keys(BOARD_FILTERS).filter(function(k){return BOARD_FILTERS[k];}).length;
  return '<details class="board-filter-panel" '+(active?'open':'')+'><summary><span>'+iconHtml('sliders-horizontal')+' <strong>Filtros</strong><small>'+(active?active+' activo(s)':'Opcionales · abre solo cuando los necesites')+'</small></span><b>'+filtered.length+' de '+tasks.length+' '+iconHtml('chevron-down')+'</b></summary><div class="board-filters">'
    +boardFilterSelect('Status','estado',[['','Todos'],['pendiente','Pendiente'],['en_proceso','En proceso'],['en_revision','En revisión'],['aprobada','Aprobada'],['terminada','Terminada']],BOARD_FILTERS.estado)
    +boardFilterSelect('Última acción','accion',[['','Todas'],['sin_accion','Sin acción'],['recordatorio','Recordatorio'],['dalia','Dalia'],['espera','En espera'],['propuesta','Propuesta / VoBo'],['otra','Otra']],BOARD_FILTERS.accion)
    +boardFilterSelect('Seguimiento','seguimiento',[['','Todos'],['vencido','Vencido'],['hoy','Hoy'],['semana','Próximos 7 días'],['sin_fecha','Sin fecha'],['futuro','Más adelante']],BOARD_FILTERS.seguimiento)
    +boardFilterSelect('Responsable','responsable',ownerOpts,BOARD_FILTERS.responsable)
    +'<div><div class="board-filter-count">'+filtered.length+' de '+tasks.length+'</div><button class="btn btns btng" onclick="A.clearBoardFilters()">Limpiar</button></div>'
    +'</div></details>';
}
function operationalBoard(p,limit){
  var ofunamBoard = isOfunamProject(p);
  var showCommentCol = false; // SM OS 2.4.4: ocultar Último comentario en tableros operativos para evitar desborde
  var tasks = projectTasks(p.id).sort(function(a,b){
    var ga = taskGroup(a), gb = taskGroup(b);
    if(ga!==gb) return groupsForProject(p).indexOf(ga)-groupsForProject(p).indexOf(gb);
    return dayDiff(a.fecha_proximo_seguimiento||a.fecha_vencimiento||pd(999))-dayDiff(b.fecha_proximo_seguimiento||b.fecha_vencimiento||pd(999));
  });
  var allTasks = tasks.slice();
  tasks = boardFilterTasks(tasks,p);
  if(limit) tasks = tasks.slice(0,limit);
  var filterBar = boardFiltersHtml(allTasks,tasks,p);
  if(!tasks.length) return filterBar+'<div class="empty"><p>Sin registros con esos filtros</p></div>';
  var rows = tasks.map(function(t){
    var h=crmHealth(t), lc=lastComment(t), cCount=DB.comentarios.filter(function(c){return c.tarea_id===t.id;}).length;
    var pk=isProkicksProject(p);
    var alert = '<span class="sem"><span class="dot '+h.cl+'"></span>'+esc(h.txt)+'</span>';
    return '<tr>'
      +(ofunamBoard?'':'<td><span class="badge bx_">'+esc(taskGroup(t))+'</span></td>')
      +'<td><button style="background:transparent;border:0;padding:0;color:var(--navy);font-weight:900;cursor:pointer;text-align:left" onclick="A.td(\''+t.id+'\')">'+esc(t.titulo)+'</button><div style="font-size:11px;color:var(--muted);margin-top:3px">Inicio '+fmt(t.fecha_inicio)+' · Término '+fmt(t.fecha_vencimiento)+'</div></td>'
      +'<td>'+bSt(t.estado)+'</td>'
      +'<td>'+esc(nextAction(t)||'Sin siguiente acción')+'</td>'
      +'<td>'+fmt(followDate(t)||t.fecha_proximo_seguimiento)+'</td>'
      +'<td>'+esc(boardOwnerName(t,p))+'</td>'
      +'<td>'+alert+'</td>'
      +(showCommentCol?'<td style="min-width:190px">'+(lc?'<div style="font-size:12px;color:var(--ink)">'+esc(String(lc.texto||'').slice(0,70))+'</div><div style="font-size:11px;color:var(--muted)">'+cCount+' comentario(s)</div>':'<span style="color:var(--muted)">Sin comentarios</span>')+'</td>':'')
      +'<td><div class="operational-actions"><button class="btn btns btnc" onclick="A.quickEdit(\''+t.id+'\')">Editar rápido</button><button class="btn btns btng" onclick="A.manageTask(\''+t.id+'\')">Gestionar</button></div></td>'
      +'</tr>';
  }).join('');
  var fronts=groupsForProject(p);
  var frontStrip=isProkicksProject(p)?'<details class="front-panel"><summary><span>'+iconHtml('layers-3')+'<strong>Frentes de trabajo</strong><small>'+fronts.length+' frentes · '+tasks.length+' tareas visibles</small></span><b>Administrar '+iconHtml('chevron-down')+'</b></summary><div class="front-strip">'+fronts.map(function(g,i){var count=tasks.filter(function(t){return taskGroup(t)===g;}).length;return '<div class="front-summary"><strong>'+esc(g)+'</strong><span class="badge bx_">'+count+'</span><button class="btn btng" onclick="A.pkTaskForFront(\''+p.id+'\','+i+')">+ Tarea</button></div>';}).join('')+'</div></details>':'';
  var tableClass = 'operational-table' + (ofunamBoard ? ' ofunam-table' : '');
  var commentHead = showCommentCol ? '<th>Último comentario</th>' : '';
  var groupHead = ofunamBoard ? '' : '<th>'+(isProkicksProject(p)?'Frente':'Grupo')+'</th>';
  return filterBar+frontStrip+'<div class="card sticky-board" style="padding:0"><div class="tw"><table class="'+tableClass+'"><thead><tr>'+groupHead+'<th>'+(isProkicksProject(p)?'Tarea':'Registro')+'</th><th>Estado</th><th>Siguiente acción</th><th>Seguimiento</th><th>Resp.</th><th>Alerta</th>'+commentHead+'<th>Acciones</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

function controlProgress(t){
  if(t.estado==='terminada') return 100;
  var n=Number(t.control_avance);
  return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0;
}
function controlStateLabel(t){
  if(t.control_bloqueado) return '<span class="badge br_">Bloqueada</span>';
  if(t.estado==='terminada') return '<span class="badge bg_">Completada</span>';
  if(t.estado==='en_proceso'||t.estado==='en_revision'||t.estado==='aprobada') return '<span class="badge bb_">En curso</span>';
  return '<span class="badge bx_">No iniciada</span>';
}
function controlArea(t){ return taskGroup(t)||'General'; }
function controlFilteredTasks(tasks,p){
  return tasks.filter(function(t){
    var state=t.control_bloqueado?'bloqueada':(t.estado==='terminada'?'completada':((t.estado==='en_proceso'||t.estado==='en_revision'||t.estado==='aprobada')?'en_curso':'no_iniciada'));
    if(CONTROL_FILTERS.estado&&state!==CONTROL_FILTERS.estado)return false;
    if(CONTROL_FILTERS.responsable&&boardOwnerName(t,p)!==CONTROL_FILTERS.responsable)return false;
    if(CONTROL_FILTERS.area&&controlArea(t)!==CONTROL_FILTERS.area)return false;
    if(CONTROL_FILTERS.foco==='bloqueos'&&!t.control_bloqueado)return false;
    if(CONTROL_FILTERS.foco==='decisiones'&&!t.control_decision_requerida)return false;
    if(CONTROL_FILTERS.foco==='cliente'&&t.control_visible_cliente===false)return false;
    return true;
  });
}
function controlSelect(label,key,options,value){
  return '<label class="control-filter"><span>'+esc(label)+'</span><select onchange="A.setControlFilter(\''+key+'\',this.value)">'+options.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(value)?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select></label>';
}
function projectExecutionBoardHtml(p){
  var tasks=projectTasks(p.id).slice().sort(function(a,b){return Number(a.control_orden||0)-Number(b.control_orden||0)||String(a.fecha_vencimiento||'9999').localeCompare(String(b.fecha_vencimiento||'9999'));});
  var completed=tasks.filter(function(t){return t.estado==='terminada';}).length;
  var blocked=tasks.filter(function(t){return !!t.control_bloqueado;}).length;
  var decisions=tasks.filter(function(t){return !!t.control_decision_requerida;}).length;
  var progress=tasks.length?Math.round(tasks.reduce(function(sum,t){return sum+controlProgress(t);},0)/tasks.length):0;
  var owners=[],areas=[];
  tasks.forEach(function(t){var o=boardOwnerName(t,p),a=controlArea(t);if(o&&owners.indexOf(o)<0)owners.push(o);if(a&&areas.indexOf(a)<0)areas.push(a);});
  owners.sort();areas.sort();
  var filtered=controlFilteredTasks(tasks,p);
  var filters='<div class="control-toolbar">'
    +controlSelect('Estado','estado',[['','Todos'],['no_iniciada','No iniciada'],['en_curso','En curso'],['bloqueada','Bloqueada'],['completada','Completada']],CONTROL_FILTERS.estado)
    +controlSelect('Responsable','responsable',[['','Todos']].concat(owners.map(function(x){return[x,x];})),CONTROL_FILTERS.responsable)
    +controlSelect('Área / frente','area',[['','Todas']].concat(areas.map(function(x){return[x,x];})),CONTROL_FILTERS.area)
    +controlSelect('Foco','foco',[['','Todo'],['bloqueos','Con bloqueo'],['decisiones','Decisión requerida'],['cliente','Visible al cliente']],CONTROL_FILTERS.foco)
    +'<div class="control-filter-result"><strong>'+filtered.length+'</strong><span>de '+tasks.length+'</span><button class="btn btns btng" onclick="A.clearControlFilters()">Limpiar</button></div></div>';
  var summary='<div class="control-summary">'
    +'<div class="control-stat"><span>Avance global</span><strong>'+progress+'%</strong><div class="control-progress"><i style="width:'+progress+'%"></i></div></div>'
    +'<div class="control-stat"><span>Acciones</span><strong>'+tasks.length+'</strong><small>'+completed+' completadas</small></div>'
    +'<div class="control-stat '+(blocked?'danger':'')+'"><span>Bloqueos</span><strong>'+blocked+'</strong><small>'+(blocked?'requieren atención':'sin bloqueos')+'</small></div>'
    +'<div class="control-stat '+(decisions?'warning':'')+'"><span>Decisiones</span><strong>'+decisions+'</strong><small>'+(decisions?'pendientes':'sin pendientes')+'</small></div></div>';
  var empty='<div class="control-empty"><div class="control-empty-icon">'+iconHtml('list-checks')+'</div><h3>El plan de ejecución está listo</h3><p>Agrega la primera acción o entregable de '+esc(p.nombre)+'.</p><button class="btn btnc" onclick="A.nt(\''+p.id+'\')">+ Primera acción</button></div>';
  var noResults='<div class="control-empty compact"><h3>Sin resultados</h3><p>Ajusta o limpia los filtros visibles.</p></div>';
  var rows=filtered.map(function(t){
    var pct=controlProgress(t), blocker=t.control_bloqueado?(t.control_bloqueo_resumen||'Bloqueo sin detalle'):'Sin bloqueo';
    var decision=t.control_decision_requerida?(t.control_decision_resumen||'Decisión pendiente'):'Sin decisión';
    return '<article class="control-row '+(t.control_bloqueado?'is-blocked':'')+'">'
      +'<div class="control-action"><button class="control-title" onclick="A.td(\''+t.id+'\')">'+esc(t.titulo)+'</button><div class="control-meta"><span>'+esc(controlArea(t))+'</span><span>'+fmt(t.fecha_inicio)+' → '+fmt(t.fecha_vencimiento)+'</span>'+(t.control_visible_cliente===false?'<span class="control-private">Interna</span>':'<span class="control-client">Cliente</span>')+'</div></div>'
      +'<div class="control-owner"><span class="control-mobile-label">Responsable</span><strong>'+esc(boardOwnerName(t,p))+'</strong></div>'
      +'<div class="control-date"><span class="control-mobile-label">Fecha</span><strong>'+fmt(t.fecha_vencimiento)+'</strong></div>'
      +'<div class="control-progress-cell"><div><span class="control-mobile-label">Avance</span><strong>'+pct+'%</strong></div><div class="control-progress"><i style="width:'+pct+'%"></i></div></div>'
      +'<div class="control-state"><span class="control-mobile-label">Estado</span>'+controlStateLabel(t)+'</div>'
      +'<div class="control-signal '+(t.control_bloqueado?'danger':'muted')+'"><span class="control-mobile-label">Bloqueo</span><strong>'+esc(blocker)+'</strong></div>'
      +'<div class="control-signal '+(t.control_decision_requerida?'warning':'muted')+'"><span class="control-mobile-label">Decisión</span><strong>'+esc(decision)+'</strong></div>'
      +'<div class="control-row-action"><button class="btn btns btnc" onclick="A.controlEdit(\''+t.id+'\')">Actualizar</button></div></article>';
  }).join('');
  return '<section class="control-board"><div class="control-board-head"><div><span class="sl">Centro de Control del Proyecto</span><h2>Tablero de ejecución</h2><p>Avance, responsables, bloqueos y decisiones en una sola vista.</p></div><button class="btn btnc" onclick="A.nt(\''+p.id+'\')">+ Acción</button></div>'+summary+filters+(tasks.length?(rows||noResults):empty)+'</section>';
}
function projectReportHtml(pid){
  var p=xid(DB.proyectos,pid); if(!p) return '<div class="card"><div class="empty"><p>Selecciona un proyecto</p></div></div>';
  var tasks=projectTasks(pid), done=tasks.filter(function(t){return t.estado==='terminada';}).length;
  var inP=tasks.filter(function(t){return t.estado==='en_proceso';}).length;
  var over=tasks.filter(function(t){return t.estado!=='terminada'&&t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;}).length;
  var noNext=tasks.filter(function(t){return crmEnabled() && t.estado!=='terminada' && !nextAction(t);}).length;
  var pct=tasks.length?Math.round(done/tasks.length*100):0;
  var pays=DB.pagos.filter(function(pay){return pay.proyecto_id===pid;});
  var paid=pays.filter(function(pay){return pay.estado==='pagado';}).reduce(function(s,pay){return s+Number(pay.monto||0);},0);
  var pending=pays.filter(function(pay){return pay.estado!=='pagado';}).reduce(function(s,pay){return s+Number(pay.monto||0);},0);
  return '<div class="sg"><div class="sc"><div class="sl">Avance</div><div class="sn">'+pct+'%</div><div class="ss">'+done+'/'+tasks.length+' tareas</div></div><div class="sc y"><div class="sl">En proceso</div><div class="sn">'+inP+'</div></div><div class="sc r"><div class="sl">Riesgos</div><div class="sn">'+(over+noNext)+'</div><div class="ss">'+over+' vencidas · '+noNext+' sin acción</div></div><div class="sc g"><div class="sl">Cobrado / pendiente</div><div class="sn" style="font-size:22px">$'+paid.toLocaleString('es-MX')+'</div><div class="ss">$'+pending.toLocaleString('es-MX')+' por cobrar</div></div></div>'
    +'<div class="card"><div class="ch"><h3>'+(isProkicksProject(p)?'Frentes, tareas y seguimiento':'Grupos, registros y seguimiento')+'</h3></div>'+projectTree(p)+'</div>';
}
function projectHistoryHtml(p){
  var items=projectActivityItems(p.id).slice(0,80);
  var latest=items.slice(0,5).map(function(it){return '<tr><td>'+fmtdt(it.ts)+'</td><td><button style="background:transparent;border:0;padding:0;color:var(--navy);font-weight:900;text-align:left;cursor:pointer" onclick="A.td(\''+it.taskId+'\')">'+esc(it.taskTitle||'Tarea')+'</button></td><td>'+esc(it.title||'Actividad')+'</td><td>'+esc(uNm(it.user))+'</td><td>'+esc(String(it.body||'').replace(/^SM OS ·\s*/,''))+'</td></tr>';}).join('');
  var byUser={};
  items.forEach(function(it){var k=it.user||'na'; if(!byUser[k]) byUser[k]=0; byUser[k]++;});
  var userRows=Object.keys(byUser).map(function(uid){return '<tr><td>'+esc(uNm(uid))+'</td><td>'+byUser[uid]+'</td></tr>';}).join('')||'<tr><td colspan="2">Sin actividad</td></tr>';
  return '<div class="sg"><div class="sc"><div class="sl">Eventos</div><div class="sn">'+items.length+'</div></div><div class="sc g"><div class="sl">Comentarios</div><div class="sn">'+items.filter(function(i){return i.type==='comentario';}).length+'</div></div><div class="sc y"><div class="sl">Microtareas</div><div class="sn">'+items.filter(function(i){return i.type==='microtarea';}).length+'</div></div><div class="sc"><div class="sl">Entregables</div><div class="sn">'+items.filter(function(i){return i.type==='entregable';}).length+'</div></div></div>'
    +'<div class="history-grid"><div class="card history-main"><div class="ch"><h3>Bitácora del proyecto</h3><span class="chip">últimos 80 eventos</span></div>'+renderActivityTimeline(items,'Sin historial del proyecto.')+'</div><div class="history-side"><div class="card"><div class="ch"><h3>Últimos movimientos</h3></div><div class="tw history-tw"><table class="history-table"><thead><tr><th>Fecha</th><th>Tarea</th><th>Evento</th><th>Resp.</th><th>Detalle</th></tr></thead><tbody>'+(latest||'<tr><td colspan="5">Sin actividad reciente</td></tr>')+'</tbody></table></div></div><div class="card"><div class="ch"><h3>Actividad por usuario</h3></div><div class="tw history-tw"><table class="history-table compact"><thead><tr><th>Usuario</th><th>Eventos</th></tr></thead><tbody>'+userRows+'</tbody></table></div></div></div></div>';
}

function objectiveName(t){
  var explicit=descVal(t,'Objetivo');
  if(explicit)return explicit;
  var area=controlArea(t);
  return area&&area!=='General'?area:'Objetivo por definir';
}
function objectiveSignal(tasks){
  if(tasks.some(function(t){return t.control_bloqueado;}))return {key:'danger',label:'Bloqueado'};
  if(tasks.some(function(t){return t.control_decision_requerida;}))return {key:'warning',label:'Decisión requerida'};
  if(tasks.some(function(t){return t.estado!=='terminada'&&t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;}))return {key:'danger',label:'Atrasado'};
  if(tasks.length&&tasks.every(function(t){return t.estado==='terminada';}))return {key:'success',label:'Cumplido'};
  return {key:'control',label:'En curso'};
}
function projectObjectivesHtml(p){
  var tasks=projectTasks(p.id).slice().sort(function(a,b){return Number(a.control_orden||0)-Number(b.control_orden||0)||String(a.fecha_vencimiento||'9999').localeCompare(String(b.fecha_vencimiento||'9999'));});
  var explicit=tasks.filter(function(t){return !!descVal(t,'Objetivo');});
  var missing=tasks.filter(function(t){return objectiveName(t)==='Objetivo por definir';});
  var groups={};
  tasks.forEach(function(t){var name=objectiveName(t);if(!groups[name])groups[name]=[];groups[name].push(t);});
  var names=Object.keys(groups).sort(function(a,b){if(a==='Objetivo por definir')return 1;if(b==='Objetivo por definir')return -1;return Number(groups[a][0].control_orden||0)-Number(groups[b][0].control_orden||0)||a.localeCompare(b);});
  var coverage=tasks.length?Math.round((tasks.length-missing.length)/tasks.length*100):0;
  var kpis=[];tasks.forEach(function(t){var k=descVal(t,'KPI');if(k&&kpis.indexOf(k)<0)kpis.push(k);});
  var objectiveCards=names.map(function(name,index){
    var arr=groups[name],pct=Math.round(arr.reduce(function(sum,t){return sum+controlProgress(t);},0)/Math.max(1,arr.length));
    var sig=objectiveSignal(arr),owners=[],taskKpis=[],evidence=0;
    arr.forEach(function(t){var owner=boardOwnerName(t,p),k=descVal(t,'KPI'),meta=descVal(t,'Meta');if(owner&&owners.indexOf(owner)<0)owners.push(owner);if(k){var label=k+(meta?' · Meta '+meta:'');if(taskKpis.indexOf(label)<0)taskKpis.push(label);}evidence+=DB.entregables.filter(function(e){return e.tarea_id===t.id;}).length;});
    var taskRows=arr.map(function(t){var ev=DB.entregables.filter(function(e){return e.tarea_id===t.id;}).length;return '<button class="objective-task" onclick="A.td(\''+t.id+'\')"><span><strong>'+esc(t.titulo)+'</strong><small>'+esc(controlArea(t))+' · '+esc(boardOwnerName(t,p))+' · '+fmt(t.fecha_vencimiento)+'</small></span><span class="objective-task-progress"><i style="width:'+controlProgress(t)+'%"></i></span><b>'+controlProgress(t)+'%</b><em>'+ev+' evidencia(s)</em></button>';}).join('');
    return '<article class="objective-card '+(name==='Objetivo por definir'?'is-gap':'')+'"><div class="objective-card-head"><div><span class="objective-code">OBJ-'+String(index+1).padStart(2,'0')+'</span><h3>'+esc(name)+'</h3></div><span class="objective-status '+sig.key+'">'+sig.label+'</span></div><div class="objective-card-kpis"><div><span>Avance</span><strong>'+pct+'%</strong></div><div><span>Acciones</span><strong>'+arr.length+'</strong></div><div><span>Responsables</span><strong>'+owners.length+'</strong></div><div><span>Evidencias</span><strong>'+evidence+'</strong></div></div><div class="objective-progress"><i style="width:'+pct+'%"></i></div><div class="objective-links"><span><b>KPI / Meta</b>'+esc(taskKpis.join(' · ')||'Por definir')+'</span><span><b>Responsables</b>'+esc(owners.join(', ')||'Por asignar')+'</span></div><details class="objective-actions"><summary>Ver trazabilidad de '+arr.length+' acción(es)</summary><div>'+taskRows+'</div></details></article>';
  }).join('');
  var matrix=tasks.map(function(t){var sig=objectiveSignal([t]),evidence=DB.entregables.filter(function(e){return e.tarea_id===t.id;}).length,kpi=descVal(t,'KPI'),meta=descVal(t,'Meta');return '<tr><td><button class="linkbtn" onclick="A.td(\''+t.id+'\')">'+esc(t.titulo)+'</button><small>'+esc(controlArea(t))+'</small></td><td>'+esc(objectiveName(t))+'</td><td>'+esc(kpi?(kpi+(meta?' · '+meta:'')):'Por definir')+'</td><td>'+esc(boardOwnerName(t,p))+'</td><td><div class="objective-matrix-progress"><i style="width:'+controlProgress(t)+'%"></i></div><b>'+controlProgress(t)+'%</b></td><td><span class="objective-status '+sig.key+'">'+sig.label+'</span></td><td>'+evidence+'</td></tr>';}).join('');
  var empty='<div class="control-empty"><div class="control-empty-icon">'+iconHtml('target')+'</div><h3>Sin acciones para mapear</h3><p>Agrega acciones al proyecto y vincula su objetivo, KPI y meta.</p><button class="btn btnc" onclick="A.nt(\''+p.id+'\')">+ Primera acción</button></div>';
  return '<section class="objectives-map"><div class="objectives-head"><div><span class="sl">Centro de Control del Proyecto</span><h2>Mapa de Objetivos</h2><p>Objetivo → KPI y meta → fase → acción → responsable → evidencia → resultado.</p></div><button class="btn btnc" onclick="A.nt(\''+p.id+'\')">+ Acción vinculada</button></div>'
    +'<div class="objective-summary"><div><span>Objetivos</span><strong>'+names.filter(function(n){return n!=='Objetivo por definir';}).length+'</strong><small>rutas activas</small></div><div class="'+(coverage<100?'warning':'success')+'"><span>Cobertura</span><strong>'+coverage+'%</strong><small>'+explicit.length+' explícita(s) · '+(tasks.length-explicit.length)+' por fase</small></div><div class="'+(missing.length?'danger':'')+'"><span>Brechas</span><strong>'+missing.length+'</strong><small>acciones sin objetivo</small></div><div><span>KPIs</span><strong>'+kpis.length+'</strong><small>indicadores vinculados</small></div></div>'
    +(tasks.length?'<div class="objective-route"><span>Objetivo</span><i>→</i><span>KPI / Meta</span><i>→</i><span>Fase</span><i>→</i><span>Acción</span><i>→</i><span>Responsable</span><i>→</i><span>Evidencia</span><i>→</i><span>Resultado</span></div><div class="objective-grid">'+objectiveCards+'</div><div class="card objective-matrix"><div class="ch"><div><h3>Matriz de trazabilidad</h3><p>Lectura completa de cómo cada acción contribuye al objetivo.</p></div><span class="chip">'+tasks.length+' acciones</span></div><div class="tw"><table><thead><tr><th>Acción / fase</th><th>Objetivo</th><th>KPI / Meta</th><th>Responsable</th><th>Avance</th><th>Señal</th><th>Evid.</th></tr></thead><tbody>'+matrix+'</tbody></table></div></div>':empty)+'</section>';
}

function controlStateKey(t){
  if(t.control_bloqueado)return 'bloqueada';
  if(t.estado==='terminada')return 'completada';
  if(t.estado==='en_proceso'||t.estado==='en_revision'||t.estado==='aprobada')return 'en_curso';
  return 'no_iniciada';
}
function projectPlannedProgress(p,tasks){
  var starts=tasks.map(function(t){return t.fecha_inicio;}).filter(Boolean).sort();
  var ends=tasks.map(function(t){return t.fecha_vencimiento;}).filter(Boolean).sort();
  var start=dateObj(p.fecha_inicio||starts[0]);
  var end=dateObj(p.fecha_vencimiento||ends[ends.length-1]);
  if(!start||!end||end<=start)return 0;
  var total=Math.max(1,Math.round((end-start)/864e5));
  var elapsed=Math.round((startToday()-start)/864e5);
  return Math.max(0,Math.min(100,Math.round(elapsed/total*100)));
}
function projectControlVisualDashboard(p,tasks){
  var actual=tasks.length?Math.round(tasks.reduce(function(sum,t){return sum+controlProgress(t);},0)/tasks.length):0;
  var planned=projectPlannedProgress(p,tasks),delta=actual-planned;
  var counts={no_iniciada:0,en_curso:0,bloqueada:0,completada:0};
  tasks.forEach(function(t){counts[controlStateKey(t)]++;});
  var blocked=tasks.filter(function(t){return t.control_bloqueado;});
  var decisions=tasks.filter(function(t){return t.control_decision_requerida;});
  var overdue=tasks.filter(function(t){return t.estado!=='terminada'&&t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;});
  var total=Math.max(1,tasks.length),a1=counts.no_iniciada/total*360,a2=a1+counts.en_curso/total*360,a3=a2+counts.bloqueada/total*360;
  var donut='conic-gradient(#94a3b8 0deg '+a1+'deg,#38bdf8 '+a1+'deg '+a2+'deg,#ef4444 '+a2+'deg '+a3+'deg,#22c55e '+a3+'deg 360deg)';
  var ownerMap={};
  tasks.filter(function(t){return t.estado!=='terminada';}).forEach(function(t){var n=boardOwnerName(t,p);ownerMap[n]=(ownerMap[n]||0)+1;});
  var owners=Object.keys(ownerMap).sort(function(a,b){return ownerMap[b]-ownerMap[a];});
  var maxOwner=Math.max.apply(Math,owners.map(function(n){return ownerMap[n];}).concat([1]));
  var ownerBars=owners.slice(0,7).map(function(n){var pct=Math.round(ownerMap[n]/maxOwner*100);return '<div class="control-bar-row"><div><strong>'+esc(n)+'</strong><span>'+ownerMap[n]+' activa(s)</span></div><div class="control-chart-bar"><i style="width:'+pct+'%"></i></div></div>';}).join('')||'<div class="control-chart-empty">Sin carga activa</div>';
  var areaMap={};
  tasks.forEach(function(t){var a=controlArea(t);if(!areaMap[a])areaMap[a]=[];areaMap[a].push(t);});
  var areaBars=Object.keys(areaMap).sort(function(a,b){return Number(areaMap[a][0].control_orden||0)-Number(areaMap[b][0].control_orden||0);}).slice(0,8).map(function(a){var arr=areaMap[a],pct=Math.round(arr.reduce(function(s,t){return s+controlProgress(t);},0)/arr.length);return '<button class="control-phase-row" onclick="A.openProject(\''+p.id+'\',\'ejecucion\')"><span><strong>'+esc(a)+'</strong><small>'+arr.length+' acción(es)</small></span><div class="control-chart-bar"><i style="width:'+pct+'%"></i></div><b>'+pct+'%</b></button>';}).join('')||'<div class="control-chart-empty">Sin fases o áreas</div>';
  var milestones=tasks.filter(function(t){return t.fecha_vencimiento;}).sort(function(a,b){return String(a.fecha_vencimiento).localeCompare(String(b.fecha_vencimiento));}).slice(0,6).map(function(t){return '<button class="control-milestone" onclick="A.td(\''+t.id+'\')"><span class="control-milestone-dot '+controlStateKey(t)+'"></span><span><strong>'+esc(t.titulo)+'</strong><small>'+fmt(t.fecha_vencimiento)+' · '+controlProgress(t)+'%</small></span>'+controlStateLabel(t)+'</button>';}).join('')||'<div class="control-chart-empty">Sin hitos con fecha</div>';
  var focusItems=blocked.map(function(t){return {t:t,type:'Bloqueo',copy:t.control_bloqueo_resumen||'Sin detalle',cl:'danger'};}).concat(decisions.map(function(t){return {t:t,type:'Decisión',copy:t.control_decision_resumen||'Sin detalle',cl:'warning'};})).slice(0,6);
  var focus=focusItems.map(function(x){return '<button class="control-focus-item '+x.cl+'" onclick="A.controlEdit(\''+x.t.id+'\')"><span>'+x.type+'</span><strong>'+esc(x.t.titulo)+'</strong><small>'+esc(x.copy)+'</small></button>';}).join('')||'<div class="control-focus-ok">'+iconHtml('circle-check-big')+'<div><strong>Sin bloqueos ni decisiones pendientes</strong><span>El equipo puede continuar con el plan registrado.</span></div></div>';
  var status=blocked.length||overdue.length?'atencion':(decisions.length?'vigilancia':'control');
  var statusLabel=status==='atencion'?'Atención requerida':status==='vigilancia'?'Decisiones pendientes':'En control';
  return '<section class="control-dashboard">'
    +'<div class="control-dashboard-head"><div><span class="sl">Centro de Control del Proyecto</span><h2>'+esc(p.nombre)+'</h2><p>Lectura ejecutiva del avance, carga, fases y puntos que requieren acción.</p></div><div class="control-dashboard-actions"><span class="control-health '+status+'"><i></i>'+statusLabel+'</span><button class="btn btnc" onclick="A.execReport(\''+p.id+'\')">Generar reporte</button></div></div>'
    +'<div class="control-kpi-strip"><div><span>Avance real</span><strong>'+actual+'%</strong><small>'+tasks.length+' acciones</small></div><div><span>Avance planeado</span><strong>'+planned+'%</strong><small>'+fmt(p.fecha_inicio)+' → '+fmt(p.fecha_vencimiento)+'</small></div><div class="'+(delta<0?'danger':delta>0?'success':'')+'"><span>Desviación</span><strong>'+(delta>0?'+':'')+delta+' pts</strong><small>'+(delta<0?'debajo del plan':delta>0?'arriba del plan':'alineado al plan')+'</small></div><div class="'+(blocked.length?'danger':'')+'"><span>Bloqueos</span><strong>'+blocked.length+'</strong><small>'+overdue.length+' vencida(s)</small></div><div class="'+(decisions.length?'warning':'')+'"><span>Decisiones</span><strong>'+decisions.length+'</strong><small>requieren definición</small></div></div>'
    +'<div class="control-visual-grid"><div class="control-chart-card control-route"><div class="control-chart-head"><div><span>01</span><h3>Avance real vs. planeado</h3></div><small>Al día de hoy</small></div><div class="control-compare"><div><span>Real</span><div class="control-track"><i class="actual" style="width:'+actual+'%"></i></div><strong>'+actual+'%</strong></div><div><span>Planeado</span><div class="control-track"><i class="planned" style="width:'+planned+'%"></i></div><strong>'+planned+'%</strong></div></div><div class="control-compare-note '+(delta<0?'danger':delta>=0?'success':'')+'">'+(delta<0?'Brecha por recuperar: '+Math.abs(delta)+' puntos':'Ritmo alineado o superior al plan')+'</div></div>'
    +'<div class="control-chart-card"><div class="control-chart-head"><div><span>02</span><h3>Tareas por estado</h3></div></div><div class="control-donut-wrap"><div class="control-donut" style="background:'+donut+'"><div><strong>'+tasks.length+'</strong><span>acciones</span></div></div><div class="control-legend"><span><i class="not-started"></i>No iniciada <b>'+counts.no_iniciada+'</b></span><span><i class="in-progress"></i>En curso <b>'+counts.en_curso+'</b></span><span><i class="blocked"></i>Bloqueada <b>'+counts.bloqueada+'</b></span><span><i class="done"></i>Completada <b>'+counts.completada+'</b></span></div></div></div>'
    +'<div class="control-chart-card"><div class="control-chart-head"><div><span>03</span><h3>Carga por responsable</h3></div></div><div class="control-bars">'+ownerBars+'</div></div>'
    +'<div class="control-chart-card control-phases"><div class="control-chart-head"><div><span>04</span><h3>Avance por fase o área</h3></div><button class="linkbtn" onclick="A.openProject(\''+p.id+'\',\'ejecucion\')">Ver ejecución</button></div><div class="control-phase-list">'+areaBars+'</div></div>'
    +'<div class="control-chart-card"><div class="control-chart-head"><div><span>05</span><h3>Hitos principales</h3></div></div><div class="control-milestones">'+milestones+'</div></div>'
    +'<div class="control-chart-card"><div class="control-chart-head"><div><span>06</span><h3>Bloqueos y decisiones</h3></div><strong class="control-focus-count">'+(blocked.length+decisions.length)+'</strong></div><div class="control-focus-list">'+focus+'</div></div></div></section>';
}

function projectCommandCenterHtml(p){
  var tasks=projectTasks(p.id);
  var open=tasks.filter(function(t){return t.estado!=='terminada';});
  var done=tasks.length-open.length;
  var overdue=open.filter(function(t){return t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;});
  var due7=open.filter(function(t){var d=t.fecha_vencimiento?dayDiff(t.fecha_vencimiento):999; return d>=0&&d<=7;});
  var noAction=open.filter(function(t){return !nextAction(t);});
  var noOwner=open.filter(function(t){return !t.owner_id;});
  var review=open.filter(function(t){return t.estado==='en_revision';});
  var blocked=open.filter(function(t){return crmHealth(t).cl==='dr';});
  var nextRows = due7.slice(0,8).map(function(t){return '<tr><td><button class="linkbtn" onclick="A.td(\''+t.id+'\')">'+esc(t.titulo)+'</button><div class="muted-mini">'+esc(taskGroup(t))+'</div></td><td>'+esc(uNm(t.owner_id))+'</td><td>'+fmt(t.fecha_vencimiento)+'</td><td>'+sem(t)+'</td></tr>';}).join('') || '<tr><td colspan="4">Sin vencimientos en los próximos 7 días</td></tr>';
  var riskRows = blocked.slice(0,8).map(function(t){return '<tr><td><button class="linkbtn" onclick="A.td(\''+t.id+'\')">'+esc(t.titulo)+'</button><div class="muted-mini">'+esc(taskGroup(t))+'</div></td><td>'+esc(uNm(t.owner_id))+'</td><td>'+esc(crmHealth(t).txt)+'</td><td>'+fmt(followDate(t)||t.fecha_vencimiento)+'</td></tr>';}).join('') || '<tr><td colspan="4">Sin riesgos críticos</td></tr>';
  var noActionRows = noAction.slice(0,8).map(function(t){return '<tr><td><button class="linkbtn" onclick="A.quickEdit(\''+t.id+'\')">'+esc(t.titulo)+'</button></td><td>'+esc(taskGroup(t))+'</td><td>'+esc(uNm(t.owner_id))+'</td><td><button class="btn btns btnc" onclick="A.quickEdit(\''+t.id+'\')">Definir acción</button></td></tr>';}).join('') || '<tr><td colspan="4">Todas las tareas activas tienen siguiente acción</td></tr>';
  var byOwner=DB.usuarios.map(function(u){var a=open.filter(function(t){return t.owner_id===u.id;}); return {u:u,n:a.length,late:a.filter(function(t){return t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;}).length,soon:a.filter(function(t){var d=t.fecha_vencimiento?dayDiff(t.fecha_vencimiento):999;return d>=0&&d<=7;}).length};}).filter(function(x){return x.n>0;}).sort(function(a,b){return b.n-a.n;});
  var ownerRows=byOwner.map(function(x){var load=x.n>=8?'Alta':(x.n>=4?'Media':'Ligera'); return '<tr><td>'+esc(x.u.nombre)+'</td><td>'+x.n+'</td><td>'+x.soon+'</td><td>'+x.late+'</td><td><span class="badge '+(x.n>=8?'br':x.n>=4?'by_':'bg_')+'">'+load+'</span></td></tr>';}).join('') || '<tr><td colspan="5">Sin carga activa</td></tr>';
  var groups=groupsForProject(p).map(function(g){var arr=tasks.filter(function(t){return taskGroup(t)===g;}); var fin=arr.filter(function(t){return t.estado==='terminada';}).length; var pct=arr.length?Math.round(fin/arr.length*100):0; var risks=arr.filter(function(t){return t.estado!=='terminada'&&crmHealth(t).cl==='dr';}).length; return '<div class="front-card"><div class="front-card-head"><strong>'+esc(g)+'</strong><span class="badge '+(risks?'br':'bg_')+'">'+(risks?risks+' riesgo(s)':'OK')+'</span></div><div class="pb"><div class="pf" style="width:'+pct+'%"></div></div><div class="front-card-meta">'+fin+'/'+arr.length+' cerradas · '+pct+'%</div></div>';}).join('');
  var filterCards=[['vencidas','Vencidas',overdue.length,'Riesgo rojo'],['proximos_7','Próx. 7 días',due7.length,'Seguimiento'],['sin_accion','Sin acción',noAction.length,'Definir paso'],['sin_dueno','Sin dueño',noOwner.length,'Asignar resp.'],['revision','En revisión',review.length,'Desbloquear'],['riesgos','Riesgos',blocked.length,'Atención'],['mis_criticos','Mis críticos',open.filter(function(t){return t.owner_id===SES.userId && (crmHealth(t).cl==='dr' || (t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<=7) || !nextAction(t));}).length,'Mi foco']].map(function(f){return '<button class="filter-card" onclick="A.commandFilter(\''+p.id+'\',\''+f[0]+'\')"><span>'+esc(f[1])+'</span><strong>'+f[2]+'</strong><small>'+esc(f[3])+'</small></button>';}).join('');
  var automationRows=blocked.concat(due7).filter(function(t,i,arr){return arr.findIndex(function(x){return x.id===t.id;})===i;}).slice(0,7).map(function(t){return '<tr><td><button class="linkbtn" onclick="A.quickEdit(\''+t.id+'\')">'+esc(t.titulo)+'</button><div class="muted-mini">'+esc(taskGroup(t))+'</div></td><td>'+esc(automationReason(t))+'</td><td>'+esc(uNm(t.owner_id))+'</td><td>'+fmt(followDate(t)||t.fecha_vencimiento)+'</td></tr>';}).join('') || '<tr><td colspan="4">Sin reglas activas de alerta</td></tr>';
  return projectControlVisualDashboard(p,tasks)
    +'<details class="control-operations-detail"><summary><span><strong>Detalle operativo y automatizaciones</strong><small>Riesgos, alertas, carga y próximos vencimientos</small></span><b>Ver detalle</b></summary><div class="control-operations-body">'
    +'<div class="automation-strip"><div><div class="sl">Filtros ejecutivos</div><h3>Automatizaciones operativas</h3></div><div class="filter-grid">'+filterCards+'</div></div>'
    +'<div class="command-layout"><div class="command-left"><div class="card"><div class="ch"><h3>Riesgos críticos</h3><button class="btn btns btng" onclick="nav(\'alertas\')">Alertas</button></div><div class="tw"><table><thead><tr><th>Tarea</th><th>Resp.</th><th>Riesgo</th><th>Fecha</th></tr></thead><tbody>'+riskRows+'</tbody></table></div></div><div class="card"><div class="ch"><h3>Reglas activas</h3><span class="chip">SM OS 2.3</span></div><div class="tw"><table><thead><tr><th>Tarea</th><th>Acción sugerida</th><th>Resp.</th><th>Fecha</th></tr></thead><tbody>'+automationRows+'</tbody></table></div></div><div class="card"><div class="ch"><h3>Sin siguiente acción</h3></div><div class="tw"><table><thead><tr><th>Tarea</th><th>Frente</th><th>Resp.</th><th>Acción</th></tr></thead><tbody>'+noActionRows+'</tbody></table></div></div><div class="card"><div class="ch"><h3>Próximos vencimientos</h3></div><div class="tw"><table><thead><tr><th>Tarea</th><th>Resp.</th><th>Vence</th><th>Control</th></tr></thead><tbody>'+nextRows+'</tbody></table></div></div></div><div class="command-right"><div class="card"><div class="ch"><h3>Carga por responsable</h3></div><div class="tw"><table><thead><tr><th>Usuario</th><th>Activas</th><th>7 días</th><th>Venc.</th><th>Carga</th></tr></thead><tbody>'+ownerRows+'</tbody></table></div></div><div class="card"><div class="ch"><h3>Avance por frente</h3></div><div class="front-cards">'+groups+'</div></div></div></div>'
    +'</div></details>';
}

function executiveReportText(pid){
  var p=xid(DB.proyectos,pid); if(!p) return 'Proyecto no encontrado.';
  var tasks=projectTasks(pid), open=tasks.filter(function(t){return t.estado!=='terminada';}), done=tasks.length-open.length;
  var progress=tasks.length?Math.round(done/tasks.length*100):0;
  var blocked=open.filter(function(t){return crmHealth(t).cl==='dr';});
  var due7=open.filter(function(t){var d=t.fecha_vencimiento?dayDiff(t.fecha_vencimiento):999;return d>=0&&d<=7;});
  var noAction=open.filter(function(t){return !nextAction(t);});
  var noOwner=open.filter(function(t){return !t.owner_id;});
  var recent=projectActivityItems(pid).slice(0,5);
  var next=open.sort(function(a,b){return dayDiff((followDate(a)||a.fecha_vencimiento||pd(999)))-dayDiff((followDate(b)||b.fecha_vencimiento||pd(999)));}).slice(0,5);
  var status = blocked.length ? 'Atención requerida' : (due7.length||noAction.length||noOwner.length ? 'Vigilancia' : 'En control');
  var lines=[];
  lines.push('REPORTE EJECUTIVO — '+p.nombre);
  lines.push('Fecha: '+fmtNow());
  lines.push('');
  lines.push('1. Lectura ejecutiva');
  lines.push('Estado general: '+status+'. El proyecto registra '+tasks.length+' tareas, '+done+' cerradas y '+open.length+' activas. Avance global: '+progress+'%.');
  if(blocked.length){var first=blocked[0];lines.push('La prioridad inmediata es atender "'+first.titulo+'", asignada a '+uNm(first.owner_id)+', por '+crmHealth(first).txt.toLowerCase()+'.');}
  else if(due7.length){lines.push('La prioridad de la semana es dar seguimiento a '+due7.length+' tarea(s) con vencimiento próximo.');}
  else {lines.push('No se detectan riesgos críticos en este momento.');}
  lines.push('');
  lines.push('2. Indicadores clave');
  lines.push('- Avance: '+progress+'% ('+done+' de '+tasks.length+' tareas cerradas).');
  lines.push('- Riesgos críticos: '+blocked.length+'.');
  lines.push('- Próximos vencimientos a 7 días: '+due7.length+'.');
  lines.push('- Tareas sin siguiente acción: '+noAction.length+'.');
  lines.push('- Tareas sin responsable: '+noOwner.length+'.');
  lines.push('');
  lines.push('3. Riesgos principales');
  if(blocked.length) blocked.slice(0,5).forEach(function(t){lines.push('- '+t.titulo+' | Riesgo: '+crmHealth(t).txt+' | Responsable: '+uNm(t.owner_id)+' | Fecha: '+fmt(followDate(t)||t.fecha_vencimiento));}); else lines.push('- Sin riesgos críticos detectados.');
  lines.push('');
  lines.push('4. Próximos pasos recomendados');
  if(next.length) next.forEach(function(t){lines.push('- '+t.titulo+' | Acción sugerida: '+automationReason(t)+' | Siguiente acción: '+(nextAction(t)||'Definir siguiente acción')+' | Responsable: '+uNm(t.owner_id)+' | Seguimiento: '+fmt(followDate(t)||t.fecha_vencimiento));}); else lines.push('- Sin pendientes abiertos.');
  lines.push('');
  lines.push('5. Decisiones requeridas');
  if(noOwner.length) noOwner.slice(0,3).forEach(function(t){lines.push('- Asignar responsable para: '+t.titulo);});
  if(noAction.length) noAction.slice(0,5).forEach(function(t){lines.push('- Definir siguiente acción para: '+t.titulo+' | Responsable actual: '+uNm(t.owner_id));});
  if(!noOwner.length && !noAction.length) lines.push('- Sin decisiones urgentes registradas.');
  lines.push('');
  lines.push('6. Últimos movimientos');
  if(recent.length) recent.forEach(function(it){lines.push('- '+fmtdt(it.ts)+' | '+(it.taskTitle||'Tarea')+' | '+String(it.body||'').replace(/^SM OS ·\s*/,''));}); else lines.push('- Sin actividad reciente.');
  return lines.join('\n');
}

function projectTabs(p){
  var mainLabel = isProkicksProject(p) ? 'Plan de trabajo' : (isOfunamProject(p) ? 'Grupos y registros' : 'Tablero operativo');
  var tabs=[['mando','Centro de Control','gauge'],['objetivos','Objetivos','target'],['ejecucion','Ejecución','activity'],['tareas',mainLabel,'list-checks'],['reporte','Reporte','file-chart-column'],['historial','Historial','history'],['kanban','Kanban','columns-3'],['calendario','Calendario','calendar-days'],['gantt','Gantt','chart-no-axes-gantt'],['pipeline','Pipeline','git-branch']];
  return '<nav class="project-tabs" aria-label="Módulos del proyecto">'+tabs.map(function(t,i){return (i===4?'<span class="project-tab-divider" aria-hidden="true"></span>':'')+'<button class="project-tab '+(PTAB===t[0]?'active':'')+'" onclick="A.openProject(\''+p.id+'\',\''+t[0]+'\')" title="'+esc(t[1])+'">'+iconHtml(t[2])+'<span>'+esc(t[1])+'</span></button>';}).join('')+'</nav>';
}
function projectKanbanHtml(p){
  var tasks=projectTasks(p.id);
  var cols=[['pendiente','📋 Pendiente'],['en_proceso','⚙️ En proceso'],['en_revision','🔍 En revisión'],['aprobada','✅ Aprobada'],['terminada','🏁 Terminada']];
  return '<div class="kanban">'+cols.map(function(col){
    var ct=tasks.filter(function(t){return t.estado===col[0];});
    var cards=ct.map(function(t){var owner=isProkicksProject(p)?pkInternalOwner(t):uNm(t.owner_id);return '<div class="kcard" onclick="A.td(\''+t.id+'\')"><div class="kct2">'+esc(t.titulo)+'</div><div style="display:flex;gap:5px;flex-wrap:wrap;margin:7px 0">'+bPr(t.prioridad)+' '+sem(t)+'</div><div style="font-size:11px;color:var(--muted)">'+esc(nextAction(t)||'Sin siguiente acción')+'</div><div class="kmeta"><span class="kdue">'+fmt(t.fecha_vencimiento)+'</span><span class="kown">'+ini(owner)+'</span></div></div>';}).join('') || '<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px 0">Sin tareas</div>';
    return '<div class="kcol"><div class="kch"><span class="kct">'+col[1]+'</span><span class="kcc">'+ct.length+'</span></div>'+cards+'</div>';
  }).join('')+'</div>';
}
function projectGanttHtml(p){
  var yr=new Date().getFullYear(), start=new Date(yr,0,1), total=((yr%4===0&&yr%100!==0)||yr%400===0)?366:365;
  var months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var todayPct=(Math.round((new Date()-start)/864e5)/total*100).toFixed(1);
  var rows=projectTasks(p.id).filter(function(t){return t.fecha_inicio&&t.fecha_vencimiento;}).map(function(t){
    var s=dateObj(t.fecha_inicio), e=dateObj(t.fecha_vencimiento), off=Math.max(0,Math.round((s-start)/864e5)), dur=Math.max(1,Math.round((e-s)/864e5));
    return '<tr><td style="font-size:13px;font-weight:700;white-space:nowrap;color:var(--ink)">'+esc(t.titulo)+'</td><td colspan="12" class="gbc"><div class="gbar" style="left:'+(off/total*100).toFixed(1)+'%;width:'+(dur/total*100).toFixed(1)+'%">'+(dur>20?esc(t.titulo):'')+'</div><div class="gtoday" style="left:'+todayPct+'%"></div></td></tr>';
  }).join('') || '<tr><td colspan="13"><div class="empty"><p>Sin tareas con fechas</p></div></td></tr>';
  return '<div class="card"><div class="gwrap"><table class="gtable" style="width:100%"><thead><tr><th style="text-align:left;min-width:220px;padding:8px 13px">Tarea</th>'+months.map(function(m){return '<th>'+m+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
function projectCalendarHtml(p){
  var tasks=projectTasks(p.id), next=tasks.filter(function(t){return t.fecha_vencimiento&&t.estado!=='terminada';}).sort(function(a,b){return dayDiff(a.fecha_vencimiento)-dayDiff(b.fecha_vencimiento);})[0];
  var base=next?dateObj(next.fecha_vencimiento):new Date(); base=new Date(base.getFullYear(),base.getMonth()+CAL_OFF,1);
  var yr=base.getFullYear(), mo=base.getMonth(), fd=new Date(yr,mo,1).getDay(), dim=new Date(yr,mo+1,0).getDate(), mn=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'], dn=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], byD={};
  tasks.forEach(function(t){ if(!t.fecha_vencimiento) return; var d=dateObj(t.fecha_vencimiento); if(d.getMonth()===mo&&d.getFullYear()===yr){var k=d.getDate(); if(!byD[k]) byD[k]=[]; byD[k].push({l:t.titulo,c:t.estado==='terminada'?'':'er'});} });
  var cells=[]; for(var i=0;i<fd;i++) cells.push(null); for(var d=1;d<=dim;d++) cells.push(d);
  var cH=cells.map(function(day){ if(!day) return '<div style="min-height:84px"></div>'; var evs=(byD[day]||[]).slice(0,4).map(function(ev){return '<div class="cev '+ev.c+'" title="'+esc(ev.l)+'">'+esc(ev.l.slice(0,18))+'</div>';}).join(''); return '<div class="calday"><div class="caldn">'+day+'</div>'+evs+'</div>'; }).join('');
  return '<div class="sh" style="margin-bottom:14px"><h2>'+esc(p.nombre)+' · Calendario — '+mn[mo]+' '+yr+'</h2><div style="display:flex;gap:8px"><button class="btn btns btng" onclick="CAL_OFF--;render()">← Anterior</button><button class="btn btns btng" onclick="CAL_OFF=0;render()">Mes clave</button><button class="btn btns btng" onclick="CAL_OFF++;render()">Siguiente →</button></div></div><div class="card"><div class="calh">'+dn.map(function(x){return '<span>'+x+'</span>';}).join('')+'</div><div class="calg">'+cH+'</div></div>';
}
function projectPipelineHtml(p){
  var stages=/prokicks/i.test(p.nombre)?[['prospecto','Prospectos'],['venta_incompleta','Venta incompleta'],['venta_cerrada','Venta cerrada'],['comodato','Comodatos'],['cobranza','Cobranza']]:[['por_contactar','Por contactar'],['contactado','Contactado'],['respondio','Respondió'],['reunion_agendada','Reunión'],['propuesta_enviada','Propuesta'],['negociacion','Negociación'],['aprobado','Aprobado']];
  if(/prokicks/i.test(p.nombre)){
    var recs={prospecto:pkRows('prospecto'),venta_incompleta:pkRows('venta').filter(function(r){return pkVal(r,'estadoVenta')==='VENTA INCOMPLETA';}),venta_cerrada:pkRows('venta').filter(function(r){return pkVal(r,'estadoVenta')==='VENTA CERRADA';}),comodato:pkRows('comodato'),cobranza:pkRows('cobranza')};
    return '<div class="pipeline">'+stages.map(function(st){var items=recs[st[0]]||[]; return '<div class="pstage"><div class="psh"><span class="psn">'+st[1]+'</span><span class="badge bx_">'+items.length+'</span></div>'+items.slice(0,20).map(function(r){return '<div class="pcard"><div class="pcn">'+esc(pkVal(r,'cliente')||pkVal(r,'nombre')||'Registro')+'</div><div class="pcc">'+esc(pkVal(r,'siguiente_accion')||pkVal(r,'accion')||pkVal(r,'estadoVenta')||'—')+'</div></div>';}).join('')+'</div>';}).join('')+'</div>';
  }
  var tasks=projectTasks(p.id);
  return '<div class="pipeline">'+stages.map(function(st){var items=tasks.filter(function(t){return (t.etapa_crm||descVal(t,'Etapa')||'por_contactar')===st[0];}); return '<div class="pstage"><div class="psh"><span class="psn">'+st[1]+'</span><span class="badge bx_">'+items.length+'</span></div>'+items.map(function(t){return '<div class="pcard" onclick="A.td(\''+t.id+'\')"><div class="pcn">'+esc(t.titulo)+'</div><div class="pcc">'+esc(nextAction(t)||'Sin siguiente acción')+'</div><div style="font-size:11px;color:var(--muted);margin-top:5px">'+fmt(t.fecha_vencimiento)+'</div></div>';}).join('')+'</div>';}).join('')+'</div>';
}
function projectCard(p,compact){
  var s=projectStats(p);
  var h=s.overdue>0?'dr':s.noNext>0?'dy':'dg';
  var next=s.next?esc(s.next.titulo)+' · '+fmt(s.next.fecha_vencimiento):'Sin pendientes';
  return '<div class="card" style="border-left:3px solid var(--cyan)">'
    +'<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">'
    +'<div><div style="font-size:18px;font-weight:900;color:var(--ink);cursor:pointer" onclick="A.openProject(\''+p.id+'\')">'+esc(p.nombre)+'</div><div style="font-size:13px;color:var(--muted);margin-top:2px">'+esc(projectDescription(p))+'</div></div>'
    +'<div class="project-card-actions">'+bPi(p.pipeline)+' '+bSt(p.estado)+'<button class="btn btns btnc" onclick="A.openProject(\''+p.id+'\',\'mando\')">'+iconHtml('arrow-right')+' Entrar</button>'+(adm()?'<button class="btn btns btng" onclick="A.ep(\''+p.id+'\')">'+iconHtml('pencil')+' Editar</button>'+(p.estado==='cerrado'?'<button class="btn btns btng" onclick="A.restoreProject(\''+p.id+'\')">'+iconHtml('archive-restore')+' Reactivar</button>':'<button class="btn btns project-archive" onclick="A.baja(\''+p.id+'\')">'+iconHtml('archive')+' Dar de baja</button>'):'')+'</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0 10px"><div class="di"><div class="dl">Avance</div><div class="dv">'+s.progress+'%</div></div><div class="di"><div class="dl">Tareas</div><div class="dv">'+s.tasks.length+'</div></div><div class="di"><div class="dl">Riesgos</div><div class="dv">'+(s.overdue+s.noNext)+'</div></div><div class="di"><div class="dl">Próximo</div><div class="dv" style="font-size:13px">'+next+'</div></div></div>'
    +'<div style="display:flex;align-items:center;gap:9px"><div class="pb" style="flex:1"><div class="pf" style="width:'+s.progress+'%"></div></div><span class="dot '+h+'" style="width:10px;height:10px"></span></div>'
    +(compact?'':'<div style="margin-top:12px">'+projectTree(p,3)+'</div>')
    +'</div>';
}
function projectWorkspace(p){
  var s=projectStats(p);
  var tab = PTAB || 'tareas';
  var mainTitle = isProkicksProject(p) ? 'Plan de trabajo ProKicks' : (isOfunamProject(p) ? 'Grupos y registros' : 'Registros');
  var floridaCount=isProkicksProject(p)?pkFloridaRows().length:0;
  var mainButton = isProkicksProject(p) ? '<div class="prokicks-work-actions"><button class="btn florida-direct" onclick="nav(\'florida\')">'+iconHtml('map-pinned')+' Florida · Darío <span>'+floridaCount+'</span></button><button class="btn btnc" onclick="PKTAB=\'dashboard\';nav(\'prokicks\')">'+iconHtml('boxes')+' Operación</button></div>' : '<button class="btn btnc" onclick="A.nt(\''+p.id+'\')">+ Registro</button>';
  var pkUtilityBar = isProkicksProject(p) ? '<div class="prokicks-utility-bar"><button class="btn btng" onclick="A.pkManageFronts(\''+p.id+'\')">'+iconHtml('layers-3')+' Frentes</button><button class="btn btng" onclick="A.nt(\''+p.id+'\')">'+iconHtml('plus')+' Tarea</button></div>' : '';
  var compactOfunamHead = '<div class="compact-board-summary"><div><h2>'+mainTitle+'</h2><div class="compact-board-metrics"><span class="metric">Registros <strong>'+s.tasks.length+'</strong></span><span class="metric">Sin acción <strong>'+s.noNext+'</strong></span><span class="metric">Riesgos <strong>'+(s.overdue+s.noNext)+'</strong></span><span class="metric">Resp. <strong>'+esc(uNm(p.owner_id))+'</strong></span></div></div>'+mainButton+'</div>';
  var regularHead = '<div class="sg project-kpis"><div class="sc"><div class="sl">Registros</div><div class="sn">'+s.tasks.length+'</div></div><div class="sc y"><div class="sl">Sin acción</div><div class="sn">'+s.noNext+'</div></div><div class="sc r"><div class="sl">Riesgos</div><div class="sn">'+(s.overdue+s.noNext)+'</div></div><div class="sc"><div class="sl">Responsable</div><div class="sn compact-name">'+esc(uNm(p.owner_id))+'</div></div></div>'
    +'<div class="sh board-title"><h2>'+mainTitle+'</h2>'+mainButton+'</div>';
  var prokicksHead='<div class="prokicks-work-head"><div><h2>'+mainTitle+'</h2><small>'+s.tasks.length+' tareas · '+(s.overdue+s.noNext)+' requieren atención</small></div>'+mainButton+'</div>';
  var board = (isProkicksProject(p) ? prokicksHead : (isOfunamProject(p) ? compactOfunamHead : regularHead)) + pkUtilityBar + operationalBoard(p);
  var body = tab==='mando'?projectCommandCenterHtml(p)
    : tab==='objetivos'?projectObjectivesHtml(p)
    : tab==='ejecucion'?projectExecutionBoardHtml(p)
    : tab==='tareas'?board
    : tab==='reporte'?projectReportHtml(p.id)
    : tab==='historial'?projectHistoryHtml(p)
    : tab==='kanban'?projectKanbanHtml(p)
    : tab==='calendario'?projectCalendarHtml(p)
    : tab==='gantt'?projectGanttHtml(p)
    : tab==='pipeline'?projectPipelineHtml(p)
    : board;
  return '<div class="project-shell"><div class="project-head"><div class="project-titlebar"><button class="project-back" onclick="A.openProject(\''+p.id+'\',\'tareas\')" title="Volver a Plan de trabajo" aria-label="Volver a Plan de trabajo">'+iconHtml('home')+' <span>Inicio</span></button><span class="project-mark" style="--project-color:'+esc(projectVisual(p).color)+'">'+iconHtml(projectVisual(p).icon)+'</span><h2>'+esc(p.nombre)+'</h2>'+(adm()?'<button class="btn btng" onclick="A.ep(\''+p.id+'\')">'+iconHtml('settings-2')+' Editar proyecto</button>':'')+'</div>'
    +'<div style="display:flex;align-items:center;gap:6px"><div class="pdesc '+(PROJECT_DESC_EXPANDED?'expanded':'')+'">'+esc(projectDescription(p))+'</div><button class="desc-toggle" onclick="PROJECT_DESC_EXPANDED=!PROJECT_DESC_EXPANDED;render()">'+(PROJECT_DESC_EXPANDED?'Ver menos':'Ver más')+'</button></div></div>'
    +projectTabs(p)
    +body+'</div>';
}

/* DASHBOARD */

function helpFaqs(){
  return [
    {cat:'Primeros pasos',q:'¿Cómo entro a un proyecto?',a:'Desde Mis proyectos selecciona el proyecto. Cuando estés dentro, SM OS activa el modo cliente y solo muestra el proyecto activo en el sidebar.'},
    {cat:'Primeros pasos',q:'¿Qué es el modo cliente?',a:'Es una vista de privacidad para reuniones o Zoom. Al entrar a un proyecto, el sidebar oculta otros clientes y solo muestra el proyecto activo.'},
    {cat:'Centro de mando',q:'¿Qué significa En control, Vigilancia o Atención requerida?',a:'En control indica operación sin alertas críticas. Vigilancia indica pendientes próximos o puntos que requieren seguimiento. Atención requerida indica riesgos, tareas vencidas o tareas sin acción/dueño.'},
    {cat:'Centro de mando',q:'¿Cómo veo tareas vencidas o sin acción?',a:'Entra a Centro de mando y usa los filtros ejecutivos: Vencidas, Próx. 7 días, Sin acción, Sin dueño, En revisión, Riesgos o Mis críticos.'},
    {cat:'Centro de mando',q:'¿Cómo genero un reporte ejecutivo?',a:'Dentro del proyecto entra a Centro de mando y presiona Generar reporte ejecutivo. Puedes copiarlo para enviarlo por correo, WhatsApp o minuta.'},
    {cat:'Plan de trabajo',q:'¿Cómo cambio responsable, fecha o siguiente acción?',a:'En Plan de trabajo presiona Editar rápido en la tarea, actualiza el campo necesario y guarda. El cambio queda registrado en Historial.'},
    {cat:'Plan de trabajo',q:'¿Qué debo llenar siempre en una tarea?',a:'Responsable, estado, fecha de seguimiento y siguiente acción. Eso evita que el sistema la marque como riesgo o sin acción.'},
    {cat:'Acciones masivas',q:'¿Cómo actualizo varias tareas al mismo tiempo?',a:'Desde un filtro del Centro de mando selecciona una o varias tareas, llena responsable, estado, fecha, siguiente acción o comentario, y presiona Aplicar cambios.'},
    {cat:'Historial',q:'¿Dónde veo quién cambió algo?',a:'Dentro del proyecto entra a Historial. Ahí se muestra la bitácora del proyecto, últimos movimientos y actividad por usuario.'},
    {cat:'Reportes',q:'¿El reporte considera los filtros activos?',a:'Sí. Desde una vista filtrada puedes generar un reporte enfocado en ese filtro, por ejemplo solo riesgos o solo tareas sin acción.'},
    {cat:'Buenas prácticas',q:'¿Qué hago antes de presentar en Zoom?',a:'Abre primero el proyecto del cliente y confirma que el sidebar muestre solo ese proyecto. Así evitas exponer otros clientes.'},
    {cat:'Buenas prácticas',q:'¿Qué hago si algo no se actualiza?',a:'Presiona Recargar app o usa Cmd + Shift + R para forzar la última versión publicada.'}
  ];
}
function vAY(){
  var qs=helpFaqs();
  var groups={}; qs.forEach(function(x){(groups[x.cat]=groups[x.cat]||[]).push(x);});
  var chips=Object.keys(groups).map(function(k){return '<button class="help-chip" onclick="A.helpCat(this.textContent)">'+esc(k)+'</button>';}).join('');
  var items=qs.map(function(x,i){return '<details class="faq-item" data-cat="'+esc(x.cat)+'" data-q="'+esc((x.q+' '+x.a+' '+x.cat).toLowerCase())+'"><summary><span>'+esc(x.q)+'</span><small>'+esc(x.cat)+'</small></summary><p>'+esc(x.a)+'</p></details>';}).join('');
  return '<div class="sh"><div><h2>Centro de Soporte SM OS</h2><div style="font-size:13px;color:var(--muted);margin-top:3px">FAQ operativo, buenas prácticas y manual descargable. Sin IA, sin costo y sin respuestas improvisadas.</div></div><a class="btn btnc" href="docs/Manual_SM_OS.pdf" download>Descargar manual PDF</a></div>'
    +'<div class="help-hero card"><div><div class="help-eyebrow">Guía rápida</div><h3>Resuelve dudas de operación sin depender de soporte.</h3><p>Usa el buscador para encontrar instrucciones sobre Centro de mando, tareas, historial, reportes, acciones masivas y modo cliente.</p></div><div class="help-kpis"><span>FAQ interno</span><strong>'+qs.length+'</strong><small>respuestas listas</small></div></div>'
    +'<div class="card help-card"><div class="help-search"><i data-lucide="search"></i><input id="help-search" type="search" placeholder="¿Qué necesitas hacer? Ej. cambiar responsable, reporte, modo cliente" oninput="A.helpSearch(this.value)"></div><div class="help-chips"><button class="help-chip active" onclick="A.helpCat(\'\')">Todo</button>'+chips+'</div><div id="help-empty" class="empty" style="display:none">No encontré una respuesta con ese término. Prueba con: reporte, responsable, historial, vencidas, modo cliente.</div><div class="faq-list" id="faq-list">'+items+'</div></div>'
    +'<div class="card help-card"><div class="ch"><h3>Manual descargable</h3><span class="chip">PDF</span></div><p class="muted-copy">El manual incluye primeros pasos, Centro de mando, plan de trabajo, historial, reportes, acciones masivas, modo cliente y buenas prácticas para reuniones.</p><a class="btn btng" href="docs/Manual_SM_OS.pdf" download>Descargar Manual_SM_OS.pdf</a></div>';
}

function vDB(){
  var projs = myProjs().filter(function(p){return p.estado!=='cerrado';});
  var tasks = myTasks();
  var alerts = getAlerts().slice(0,3);
  var done = tasks.filter(function(t){return t.estado==='terminada';}).length;
  var over = tasks.filter(function(t){return t.estado!=='terminada'&&t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;}).length;
  var noNext = tasks.filter(function(t){return crmEnabled() && t.estado!=='terminada' && !nextAction(t);}).length;
  var alH = alerts.length ? alerts.map(function(a){return '<div class="alitem '+a.cl+'"><div class="alicon">'+a.ic+'</div><div><div class="altit">'+esc(a.ti)+'</div><div class="alsub">'+esc(a.su)+'</div></div></div>';}).join('') : '<div style="color:var(--muted);font-size:13px">✓ Sin alertas</div>';
  var cards = projs.map(function(p){return projectCard(p,true);}).join('') || '<div class="card"><div class="empty"><div class="ei">📁</div><p>Sin proyectos asignados</p></div></div>';
  var critical = tasks.filter(function(t){return t.estado!=='terminada' && (crmHealth(t).cl==='dr');}).slice(0,8);
  var nextDue = tasks.filter(function(t){return t.estado!=='terminada' && t.fecha_vencimiento;}).sort(function(a,b){return dayDiff(a.fecha_vencimiento)-dayDiff(b.fecha_vencimiento);}).slice(0,6);
  var workload = DB.usuarios.map(function(u){var assigned=DB.tareas.filter(function(t){return !isGroupHeader(t)&&t.owner_id===u.id&&t.estado!=='terminada';});return {u:u,n:assigned.length,late:assigned.filter(function(t){return t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;}).length};}).filter(function(x){return x.n>0;}).sort(function(a,b){return b.n-a.n;}).slice(0,6);
  var criticalRows = critical.map(function(t){return '<tr><td><button style="background:transparent;border:0;padding:0;color:var(--navy);font-weight:900;text-align:left;cursor:pointer" onclick="A.td(\''+t.id+'\')">'+esc(t.titulo)+'</button><div style="font-size:11px;color:var(--muted)">'+esc(pNm(t.proyecto_id))+'</div></td><td>'+esc(uNm(t.owner_id))+'</td><td>'+esc(crmHealth(t).txt)+'</td><td>'+fmt(t.fecha_vencimiento)+'</td></tr>';}).join('')||'<tr><td colspan="4">Sin riesgos críticos</td></tr>';
  var dueRows = nextDue.map(function(t){return '<tr><td>'+esc(t.titulo)+'</td><td>'+esc(pNm(t.proyecto_id))+'</td><td>'+sem(t)+'</td><td>'+fmt(t.fecha_vencimiento)+'</td></tr>';}).join('')||'<tr><td colspan="4">Sin próximos vencimientos</td></tr>';
  var workloadRows = workload.map(function(x){return '<tr><td>'+esc(x.u.nombre)+'</td><td>'+x.n+'</td><td>'+x.late+'</td></tr>';}).join('')||'<tr><td colspan="3">Sin carga activa</td></tr>';
  var command = '<div class="command-grid"><div class="card"><div class="ch"><h3>Riesgos críticos</h3><button class="btn btns btng" onclick="nav(\'alertas\')">Alertas</button></div><div class="tw"><table><thead><tr><th>Tarea</th><th>Resp.</th><th>Riesgo</th><th>Vence</th></tr></thead><tbody>'+criticalRows+'</tbody></table></div></div><div class="card"><div class="ch"><h3>Próximos vencimientos</h3></div><div class="tw"><table><thead><tr><th>Tarea</th><th>Proyecto</th><th>Control</th><th>Fecha</th></tr></thead><tbody>'+dueRows+'</tbody></table></div></div><div class="card"><div class="ch"><h3>Carga por responsable</h3></div><div class="tw"><table><thead><tr><th>Responsable</th><th>Activas</th><th>Vencidas</th></tr></thead><tbody>'+workloadRows+'</tbody></table></div></div></div>';
  return '<div class="sh"><div><h2>Centro de mando ejecutivo</h2><div style="font-size:13px;color:var(--muted);margin-top:3px">Control de proyectos, riesgos, vencimientos y carga operativa en una sola vista.</div></div>'+(adm()?'<div class="admin-quick-actions"><button class="btn btng" onclick="FPID=\'\';nav(\'proyectos\')">'+iconHtml('folder-cog')+' Administrar proyectos</button><button class="btn btng" onclick="nav(\'usuarios\')">'+iconHtml('shield-check')+' Usuarios y permisos</button><button class="btn btnc" onclick="A.np()">'+iconHtml('plus')+' Nuevo proyecto</button></div>':'')+'</div>'
    +'<div class="sg"><div class="sc"><div class="sl">Proyectos activos</div><div class="sn">'+projs.length+'</div></div><div class="sc g"><div class="sl">Terminadas</div><div class="sn">'+done+'</div></div><div class="sc y"><div class="sl">Sin siguiente acción</div><div class="sn">'+noNext+'</div></div><div class="sc r"><div class="sl">Vencidas</div><div class="sn">'+over+'</div></div></div>'
    +command
    +'<div style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr);gap:14px;margin-top:14px"><div style="display:grid;gap:14px">'+cards+'</div><div class="card"><div class="ch"><h3>Alertas recientes</h3><button class="btn btns btng" onclick="nav(\'alertas\')">Ver todas</button></div>'+alH+'</div></div>';
}
/* ALERTAS */
function vAL(){
  var al = getAlerts();
  var permission=('Notification' in window)?Notification.permission:'unsupported';
  return '<div class="alert-toolbar"><div><h2>Centro de alertas</h2><div class="alsub">Vencimientos, seguimientos e inactividad de tus proyectos.</div></div><div class="alert-actions"><button class="btn btns btng" onclick="requestBrowserNotifications()">'+iconHtml('bell-ring')+' '+(permission==='granted'?'Notificaciones activas':'Activar navegador')+'</button></div></div>'
    +(al.length ? al.map(function(a){return '<div class="alitem '+a.cl+'" '+(a.taskId?'style="cursor:pointer" onclick="A.td(\''+a.taskId+'\')"':'')+'><div class="alicon">'+a.ic+'</div><div style="flex:1"><div class="altit">'+esc(a.ti)+'</div><div class="alsub">'+esc(a.su)+'</div></div>'+(a.taskId?'<button class="btn btns btng" onclick="event.stopPropagation();addTaskToCalendar(\''+a.taskId+'\')">'+iconHtml('calendar-plus')+' Calendario</button>':'')+'</div>';}).join('')
    : '<div class="card"><div class="empty"><div class="ei">✓</div><p>Sin alertas. Todo en orden.</p></div></div>');
}

/* PROYECTOS */
function vPR(){
  if(FPID){
    var selected=xid(DB.proyectos,FPID);
    if(selected) return projectWorkspace(selected);
  }
  var projs = myProjs().slice().sort(function(a,b){return (a.estado==='cerrado')-(b.estado==='cerrado')||String(a.nombre||'').localeCompare(String(b.nombre||''),'es');});
  var html = projs.map(function(p){ return projectCard(p,false); }).join('') || '<div class="card"><div class="empty"><div class="ei">📁</div><p>Sin proyectos asignados</p></div></div>';
  return '<div class="sh"><div><h2>Administrar proyectos</h2><div style="font-size:13px;color:var(--muted);margin-top:3px">Entra, edita o da de baja proyectos desde una sola pantalla.</div></div>'+(adm()?'<button class="btn btnc" onclick="A.np()">'+iconHtml('plus')+' Nuevo proyecto</button>':'')+'</div>'+html;
}

/* TAREAS */
function vTA(){
  var tasks = myTasks();
  var shown = FPID ? tasks.filter(function(t){return t.proyecto_id===FPID;}) : tasks;
  var sel = DB.proyectos.map(function(p){return '<option value="'+esc(p.id)+'"'+(FPID===p.id?' selected':'')+'>'+esc(p.nombre)+'</option>';}).join('');
  var rows = shown.map(function(t){
    return '<tr>'
      +'<td><span style="font-weight:700;cursor:pointer;color:var(--navy)" onclick="A.td(\''+t.id+'\')">'+esc(t.titulo)+'</span></td>'
      +'<td style="font-size:12px;color:var(--muted)">'+esc(pNm(t.proyecto_id))+'</td>'
      +'<td>'+esc(uNm(t.owner_id))+'</td>'
      +'<td>'+bPr(t.prioridad)+'</td>'
      +'<td>'+bSt(t.estado)+'</td>'
      +'<td>'+sem(t)+'<br><span style="display:inline-flex;align-items:center;gap:5px;margin-top:4px;font-size:11px;color:var(--muted)"><span class="dot '+crmHealth(t).cl+'"></span>'+esc(crmHealth(t).txt)+'</span></td>'
      +'<td style="font-size:12px;color:var(--muted);max-width:180px">'+esc(nextAction(t)||'—')+'</td>'
      +'<td style="font-size:12px;color:var(--muted)">'+t.horas_reales+'/'+t.horas_estimadas+'h</td>'
      +'<td style="font-size:12px;color:var(--muted)">'+fmt(t.fecha_vencimiento)+'</td>'
      +'<td><div style="display:flex;gap:5px"><button class="btn btns btnc" onclick="A.quickEdit(\''+t.id+'\')">Editar</button><button class="btn btns btng" onclick="A.td(\''+t.id+'\')">Ver</button>'
      +(adm()?'<button class="btn btns btnd" onclick="A.dt(\''+t.id+'\')">✕</button>':'')
      +'</div></td></tr>';
  }).join('') || '<tr><td colspan="10"><div class="empty"><p>Sin tareas</p></div></td></tr>';
  return '<div class="sh"><h2>Registros</h2>'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    +'<select onchange="FPID=this.value;render()" style="background:var(--surface);border:1px solid var(--line2);border-radius:var(--rs);padding:7px 12px;color:var(--ink);font-size:13px;outline:none"><option value="">Todos los proyectos</option>'+sel+'</select>'
    +'<button class="btn btnc" onclick="A.nt(FPID)">+ Registro</button>'
    +'</div></div>'
    +'<div class="card"><div class="tw"><table><thead><tr><th>Registro</th><th>Proyecto</th><th>Responsable</th><th>Prioridad</th><th>Estado</th><th>Control</th><th>Siguiente acción</th><th>H Est/Real</th><th>Vence</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

/* KANBAN */
function vKA(){
  var tasks = myTasks();
  var shown = FPID ? tasks.filter(function(t){return t.proyecto_id===FPID;}) : tasks;
  var ctx = FPID ? xid(DB.proyectos,FPID) : null;
  var cols = [
    {k:'pendiente',l:'📋 Pendiente'},
    {k:'en_proceso',l:'⚙️ En proceso'},
    {k:'en_revision',l:'🔍 En revisión'},
    {k:'aprobada',l:'✅ Aprobada'},
    {k:'terminada',l:'🏁 Terminada'}
  ];
  var sel = DB.proyectos.map(function(p){return '<option value="'+esc(p.id)+'"'+(FPID===p.id?' selected':'')+'>'+esc(p.nombre)+'</option>';}).join('');
  var colH = cols.map(function(col){
    var ct = shown.filter(function(t){return t.estado===col.k;});
    var cards = ct.map(function(t){
      return '<div class="kcard" onclick="A.td(\''+t.id+'\')">'
        +'<div class="kct2">'+esc(t.titulo)+'</div>'
        +'<div style="font-size:11px;color:var(--muted);margin-bottom:6px">'+esc(pNm(t.proyecto_id))+'</div>'
        +'<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">'+bPr(t.prioridad)+' '+sem(t)+'</div>'
        +'<div class="kmeta"><span class="kdue">'+fmt(t.fecha_vencimiento)+'</span><span class="kown">'+ini(uNm(t.owner_id))+'</span></div>'
        +'</div>';
    }).join('') || '<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px 0">Sin tareas</div>';
    return '<div class="kcol"><div class="kch"><span class="kct">'+col.l+'</span><span class="kcc">'+ct.length+'</span></div>'+cards+'</div>';
  }).join('');
  return '<div class="sh" style="margin-bottom:14px"><h2>Kanban'+(ctx?' · '+esc(ctx.nombre):'')+'</h2>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'+(ctx?'<button class="btn btns btng" onclick="A.openProject(\''+ctx.id+'\')">Volver al proyecto</button>':'')+'<select onchange="FPID=this.value;render()" style="background:var(--surface);border:1px solid var(--line2);border-radius:var(--rs);padding:7px 12px;color:var(--ink);font-size:13px;outline:none"><option value="">Todos los proyectos</option>'+sel+'</select>'
    +'<button class="btn btnc" onclick="A.nt(FPID)">+ Tarea</button></div></div>'
    +'<div class="kanban">'+colH+'</div>';
}

/* GANTT */
function vGA(){
  var ctx = FPID ? xid(DB.proyectos,FPID) : null;
  var projs = ctx ? [ctx] : myProjs();
  var yr = new Date().getFullYear();
  var start = new Date(yr,0,1);
  var months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var total = ((yr%4===0&&yr%100!==0)||yr%400===0)?366:365;
  var todayOff = Math.round((new Date()-start)/864e5);
  var todayPct = (todayOff/total*100).toFixed(1);
  var rows = [];
  projs.forEach(function(p){
    DB.tareas.filter(function(t){return t.proyecto_id===p.id && !isGroupHeader(t);}).forEach(function(t){
      if(!t.fecha_inicio||!t.fecha_vencimiento) return;
      var s = dateObj(t.fecha_inicio), e = dateObj(t.fecha_vencimiento);
      var off = Math.max(0,Math.round((s-start)/864e5));
      var dur = Math.max(1,Math.round((e-s)/864e5));
      var l = (off/total*100).toFixed(1);
      var w = (dur/total*100).toFixed(1);
      var col = t.prioridad==='critica'?'background:linear-gradient(90deg,var(--red),var(--yellow))':t.prioridad==='alta'?'background:linear-gradient(90deg,var(--yellow),var(--cyan))':'';
      rows.push('<tr>'
        +'<td style="font-size:13px;font-weight:700;white-space:nowrap;color:var(--ink)">'+esc(t.titulo)+'</td>'
        +'<td style="font-size:11px;color:var(--muted)">'+esc(p.nombre)+'</td>'
        +'<td colspan="12" class="gbc"><div class="gbar" style="left:'+l+'%;width:'+w+'%;'+col+'">'+(dur>20?esc(t.titulo):'')+'</div><div class="gtoday" style="left:'+todayPct+'%"></div></td>'
        +'</tr>');
    });
  });
  return '<div class="sh" style="margin-bottom:14px"><h2>Gantt'+(ctx?' · '+esc(ctx.nombre):'')+' — '+yr+'</h2><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+(ctx?'<button class="btn btns btng" onclick="A.openProject(\''+ctx.id+'\')">Volver al proyecto</button>':'')+'<span style="font-size:12px;color:var(--muted)"><span style="display:inline-block;width:8px;height:8px;background:var(--red);border-radius:50%;margin-right:4px;opacity:.6"></span>Hoy</span></div></div>'
    +'<div class="card"><div class="gwrap"><table class="gtable" style="width:100%"><thead><tr>'
    +'<th style="text-align:left;min-width:200px;padding:8px 13px">Tarea</th>'
    +'<th style="min-width:90px;text-align:left;padding:8px 13px;color:var(--muted);font-size:11px">Proyecto</th>'
    +months.map(function(m){return '<th>'+m+'</th>';}).join('')
    +'</tr></thead><tbody>'
    +(rows.length?rows.join(''):'<tr><td colspan="14"><div class="empty"><p>Sin tareas con fechas</p></div></td></tr>')
    +'</tbody></table></div></div>';
}

/* CALENDARIO */
var CAL_OFF = 0; // offset de meses desde hoy
function vCA(){
  var ctx = FPID ? xid(DB.proyectos,FPID) : null;
  var base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth()+CAL_OFF);
  var yr = base.getFullYear(), mo = base.getMonth();
  var now2 = new Date();
  var fd = new Date(yr,mo,1).getDay();
  var dim = new Date(yr,mo+1,0).getDate();
  var dn = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  var mn = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var byD = {};
  (ctx ? myTasks().filter(function(t){return t.proyecto_id===ctx.id;}) : myTasks()).forEach(function(t){
    if(!t.fecha_vencimiento) return;
    var d = dateObj(t.fecha_vencimiento);
    if(d.getMonth()===mo&&d.getFullYear()===yr){
      var k = d.getDate(); if(!byD[k]) byD[k]=[];
      byD[k].push({l:t.titulo,c:t.estado==='terminada'?'':'er'});
    }
  });
  if(adm() && !ctx) DB.pagos.forEach(function(pay){
    if(!pay.fecha_vencimiento||pay.estado==='pagado') return;
    var d = dateObj(pay.fecha_vencimiento);
    if(d.getMonth()===mo&&d.getFullYear()===yr){
      var k = d.getDate(); if(!byD[k]) byD[k]=[];
      byD[k].push({l:'💰 '+pay.concepto,c:'ey'});
    }
  });
  DB.reuniones.filter(function(r){return !ctx || r.proyecto_id===ctx.id;}).forEach(function(r){
    if(!r.fecha) return;
    var d = dateObj(String(r.fecha).slice(0,10));
    if(d.getMonth()===mo&&d.getFullYear()===yr){
      var k = d.getDate(); if(!byD[k]) byD[k]=[];
      byD[k].push({l:'📋 '+r.titulo,c:''});
    }
  });
  var cells = [];
  for(var i=0;i<fd;i++) cells.push(null);
  for(var i=1;i<=dim;i++) cells.push(i);
  var cH = cells.map(function(day){
    if(!day) return '<div style="min-height:84px"></div>';
    var isToday = day===now2.getDate()&&mo===now2.getMonth()&&yr===now2.getFullYear();
    var evs = (byD[day]||[]).slice(0,3).map(function(ev){return '<div class="cev '+ev.c+'" title="'+esc(ev.l)+'">'+esc(ev.l.slice(0,16))+'</div>';}).join('');
    return '<div class="calday'+(isToday?' today':'')+'"><div class="caldn">'+day+'</div>'+evs+'</div>';
  }).join('');
  return '<div class="sh" style="margin-bottom:14px"><h2>Calendario'+(ctx?' · '+esc(ctx.nombre):'')+' — '+mn[mo]+' '+yr+'</h2>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'+(ctx?'<button class="btn btns btng" onclick="A.openProject(\''+ctx.id+'\')">Volver al proyecto</button>':'')+'<button class="btn btns btng" onclick="CAL_OFF--;render()">← Anterior</button>'
    +(CAL_OFF!==0?'<button class="btn btns btng" onclick="CAL_OFF=0;render()">Hoy</button>':'')
    +'<button class="btn btns btng" onclick="CAL_OFF++;render()">Siguiente →</button></div></div>'
    +'<div class="card"><div class="calh">'+dn.map(function(d){return '<span>'+d+'</span>';}).join('')+'</div><div class="calg">'+cH+'</div></div>';
}

/* PIPELINE */
function vPI(){
  if(FPID && xid(DB.proyectos,FPID)){
    var ctx = xid(DB.proyectos,FPID);
    return '<div class="sh" style="margin-bottom:14px"><h2>Pipeline · '+esc(ctx.nombre)+'</h2><button class="btn btns btng" onclick="A.openProject(\''+ctx.id+'\')">Volver al proyecto</button></div>'+projectPipelineHtml(ctx);
  }
  var projs = myProjs();
  var stages = [{k:'prospecto',l:'Prospecto'},{k:'propuesta',l:'Propuesta'},{k:'negociacion',l:'Negociación'},{k:'ejecucion',l:'Ejecución'},{k:'cerrado_ganado',l:'✓ Ganado'},{k:'cerrado_perdido',l:'✗ Perdido'}];
  var cols = stages.map(function(st){
    var items = projs.filter(function(p){return p.pipeline===st.k;});
    var tot = items.reduce(function(s,p){return s+(Number(p.presupuesto)||0);},0);
    var cards = items.map(function(p){
      return '<div class="pcard" onclick="A.pd(\''+p.id+'\')"><div class="pcn">'+esc(p.nombre)+'</div>'
        +(adm()?'<div class="pcv">$'+Number(p.presupuesto||0).toLocaleString()+'</div>':'')
        +'<div class="pcc">'+esc(cNm(p.cliente_id))+'</div>'
        +'<div style="margin-top:5px;font-size:11px;color:var(--muted)">'+fmt(p.fecha_vencimiento)+'</div></div>';
    }).join('') || '<div style="font-size:12px;color:var(--muted);text-align:center;padding:12px 0">Sin proyectos</div>';
    return '<div class="pstage"><div class="psh"><span class="psn">'+st.l+'</span><span class="badge bx_">'+items.length+'</span></div>'
      +(adm()?'<div style="font-size:13px;font-weight:800;color:var(--navy);margin-bottom:9px">$'+tot.toLocaleString()+'</div>':'')
      +cards+'</div>';
  }).join('');
  return '<div class="sh" style="margin-bottom:14px"><h2>Pipeline comercial</h2>'+(adm()?'<button class="btn btnc" onclick="A.np()">+ Nuevo proyecto</button>':'')+'</div>'
    +'<div class="pipeline">'+cols+'</div>';
}

/* PROKICKS */
var PKTABS = [['dashboard','Dashboard inventario'],['prospecto','Prospectos'],['cliente','Clientes ProKicks'],['venta','Ventas'],['comodato','Comodatos'],['cobranza','Cobranza']];
var PKTAB_SINGLE = {florida:'prospecto',prospecto:'prospecto',cliente:'cliente',venta:'venta',comodato:'comodato',cobranza:'cobranza'};
var PKSCHEMAS = {
  prospecto:[['cliente','Club / empresa','text',true],['contacto','Contacto','text'],['cargo','Cargo','text'],['ciudad','Ciudad','text'],['telefono','Teléfono','text'],['email','Email','email'],['rep','Rep','text'],['fuente','Fuente','text'],['mercado','Mercado','text'],['region','Región','text'],['tipo_instalacion','Tipo de instalación','text'],['direccion','Dirección completa','text'],['actividad_liga','Actividad / liga','textarea'],['fuente_liga','Fuente web','url'],['visitado','Visitado','select',false,['Pendiente','Sí','No']],['potencial','Potencial 1–10','number'],['etapa','Etapa','select',true,['por_contactar','contactado','demo_agendada','propuesta_enviada','negociacion','cerrado','perdido']],['siguiente_accion','Siguiente acción','text'],['proximo_seguimiento','Próximo seguimiento','date'],['probabilidad','Probabilidad %','number'],['monto_estimado','Monto estimado','number'],['devices_estimados','Devices estimados','number'],['notas','Notas','textarea']],
  cliente:[['nombre','Nombre','text',true],['empresa','Club / Empresa','text'],['contacto','Contacto','text'],['ciudad','Ciudad','text'],['telefono','Teléfono','text'],['email','Email','email'],['fuente','Fuente','text'],['notas','Notas','textarea']],
  venta:[['cliente','Cliente','text',true],['contacto','Contacto','text'],['rep','Rep','text'],['devices','Devices','number',true],['monto','Monto total','number',true],['saldo','Saldo pendiente','number'],['estadoVenta','Estado venta','select',true,['EN PROSPECCIÓN','VENTA INCOMPLETA','VENTA CERRADA']],['estadoPago','Estado pago','select',false,['PENDIENTE','PARCIAL','PAGADO']],['formaPago','Forma de pago','text'],['entrega','Entrega','select',false,['NO ENVIADO','ENVIADO','ENTREGADO','POR DEFINIR']],['fechaEntrega','Fecha entrega','text'],['ciudad','Ciudad','text'],['factura','Factura','select',false,['NO','SI']],['notas','Notas','textarea']],
  comodato:[['cliente','Cliente','text',true],['contacto','Contacto','text'],['rep','Rep','text'],['devices','Devices','number',true],['estado','Estado','select',true,['EN USO','DEVUELTO','POR DEVOLVER']],['fechaEntrega','Fecha entrega','text'],['fechaDevolucion','Fecha devolución','text'],['ciudad','Ciudad','text'],['notas','Notas','textarea']],
  cobranza:[['cliente','Cliente','text',true],['rep','Rep','text'],['monto','Monto total','number'],['saldo','Saldo pendiente','number',true],['estadoVenta','Estado','text'],['accion','Acción sugerida','text']]
};
function pkProject(){
  return DB.proyectos.find(function(p){ return String(p.nombre||'').toLowerCase()==='prokicks'; }) ||
         DB.proyectos.find(function(p){ return String(p.nombre||'').toLowerCase().indexOf('prokicks')>=0; });
}
function canUseProkicks(){
  var p = pkProject(); if(!p || !SES) return false;
  if(adm() || p.owner_id===SES.userId) return true;
  return DB.tareas.some(function(t){ return t.proyecto_id===p.id && t.owner_id===SES.userId; });
}
function pkRows(tipo){ var p=pkProject(); return p ? DB.prokicks_records.filter(function(r){return r.proyecto_id===p.id && r.tipo===tipo;}) : []; }
function pkSetting(){ var p=pkProject(); var s=p&&DB.prokicks_settings.find(function(x){return x.proyecto_id===p.id;}); return s ? (s.data||{}) : {}; }
function pkVal(r,k){ return (r.data||{})[k]; }
function pkMoney(v){ return '$'+Number(v||0).toLocaleString('es-MX'); }
function pkNum(v,fb){ return v===undefined||v===null||v==='' ? (fb||0) : Number(v); }
function pkStatus(v){
  var s=String(v||'POR DEFINIR');
  var cl=/PAGADO|CERRADA|ENTREGADO|EN USO|cerrado/i.test(s)?'bg_':(/INCOMPLETA|NO ENVIADO|perdido/i.test(s)?'br_':'by_');
  return '<span class="badge '+cl+'">'+esc(s)+'</span>';
}
function pkWorkPlanHtml(p){
  var all=projectTasks(p.id);
  var hasOthers=all.some(function(t){return PROKICKS_WORK_FRONTS.indexOf(pkTaskFront(t))<0;});
  var fronts=['todos'].concat(PROKICKS_WORK_FRONTS).concat(hasOthers?['Otros']:[]);
  var baseMissing=PROKICKS_PLAN.some(function(def){return !all.some(function(t){return String(t.titulo||'').trim().toLowerCase()===def.title.toLowerCase();});});
  var tabs=fronts.map(function(f){
    var label=f==='todos'?'Todos':f;
    var count=f==='todos'?all.length:all.filter(function(t){return pkTaskFront(t)===f;}).length;
    return '<button class="pkw-tab '+(PKWORKTAB===f?'active':'')+'" onclick="PKWORKTAB=\''+f+'\';render()">'+esc(label)+' <span style="opacity:.72">'+count+'</span></button>';
  }).join('');
  var shown=all.filter(function(t){return PKWORKTAB==='todos'||pkTaskFront(t)===PKWORKTAB;}).sort(function(a,b){var ai=PROKICKS_WORK_FRONTS.indexOf(pkTaskFront(a)),bi=PROKICKS_WORK_FRONTS.indexOf(pkTaskFront(b));return (ai<0?99:ai)-(bi<0?99:bi);});
  var cards=shown.map(function(t){
    var pg=pkTaskProgress(t), h=crmHealth(t), owner=pkInternalOwner(t), collabs=pkCollaborators(t);
    var cls=h.cl==='dr'?'risk':h.cl==='dy'?'warn':'ok';
    var people='<span class="pkw-person">'+esc(owner)+'</span>'+collabs.map(function(n){return '<span class="pkw-person">'+esc(n)+'</span>';}).join('');
    var subs=pg.subs.map(function(s){
      return '<div class="pkw-sub"><input class="pkw-check" type="checkbox" '+(s.estado==='terminada'?'checked':'')+' onchange="A.pkToggleSub(\''+s.id+'\')" aria-label="Marcar microtarea">'
        +'<div><div class="pkw-sub-title">'+esc(s.titulo)+'</div><div class="pkw-sub-meta">'+(s.estado==='terminada'?'Terminada':'Pendiente')+' · Vence '+fmt(s.fecha_vencimiento)+'</div></div>'
        +'<div>'+esc(uNm(s.owner_id))+'</div><div>'+bSt(s.estado)+'</div>'
        +'<button class="btn btns btng" onclick="A.esub(\''+s.id+'\')">Editar</button></div>';
    }).join('')||'<div class="pkw-empty">Todavía no hay microtareas.</div>';
    var logs=DB.comentarios.filter(function(c){return c.tarea_id===t.id;}).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));}).slice(0,3);
    var logHtml=logs.length?'<div class="pkw-log">'+logs.map(function(c){return '<div class="pkw-log-item"><div class="pkw-log-meta">'+fmtdt(c.created_at)+'</div>'+esc(c.texto)+'</div>';}).join('')+'</div>':'';
    return '<section class="pkw-card '+cls+'"><div class="pkw-head">'
      +'<div><div class="pkw-title">'+esc(t.titulo)+'</div><div class="pkw-meta">'+esc(descVal(t,'Objetivo')||nextAction(t)||'Objetivo por definir')+'</div><div class="pkw-people">'+people+'</div></div>'
      +'<div class="pkw-progress"><div class="pkw-progress-line"><span>Avance</span><span>'+pg.pct+'%</span></div><div class="pb" style="height:8px"><div class="pf" style="width:'+pg.pct+'%"></div></div><div class="pkw-meta">'+pg.done+' de '+pg.subs.length+' microtareas</div></div>'
      +'<div><div style="margin-bottom:6px">'+bSt(t.estado)+' '+sem(t)+'</div><div class="pkw-meta">Inicio '+fmt(t.fecha_inicio)+'<br>Vence '+fmt(t.fecha_vencimiento)+'<br>Seguimiento '+fmt(followDate(t))+'</div></div>'
      +'<div class="pkw-actions"><button class="btn btns btnc" onclick="A.pkAdvance(\''+t.id+'\')">Registrar avance</button><button class="btn btns btng" onclick="A.td(\''+t.id+'\')">Abrir ficha</button><button class="btn btns btng" onclick="A._tm(\''+t.id+'\')">Editar</button></div>'
      +'</div><div class="pkw-body">'+subs+logHtml+'</div></section>';
  }).join('');
  var empty=all.length?'<div class="pkw-empty">No hay tareas en este frente.</div>':'<div class="pkw-empty"><strong>Plan listo para instalar.</strong><br>Se crearán Indoor Community, Comunidad ProKicks y Redes sociales con sus microtareas acordadas.<div style="margin-top:12px"><button class="btn btnc" onclick="A.pkInitPlan()">Crear plan de trabajo ProKicks</button></div></div>';
  return '<div class="card"><div class="pkw-toolbar"><div><h3 style="margin:0">Seguimiento CRM ProKicks</h3><div class="pkw-meta">Tareas, responsables internos, avances, alertas y evidencia en un solo lugar.</div></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn btns btng" onclick="A.nt(\''+p.id+'\')">+ Nueva tarea</button>'+(baseMissing?'<button class="btn btns btnc" onclick="A.pkInitPlan()">Completar plan base</button>':'')+'</div></div><div class="pkw-tabs" style="margin:14px 0">'+tabs+'</div><div class="pkw-shell">'+(cards||empty)+'</div></div>';
}
function prokicksProjectOverview(){
  var st=pkSetting(), ventas=pkRows('venta'), comodatos=pkRows('comodato'), prospectos=pkRows('prospecto'), clientes=pkRows('cliente'), cobranza=pkRows('cobranza');
  var vendidos=ventas.reduce(function(s,r){return s+Number(pkVal(r,'devices')||0);},0);
  var comodato=comodatos.reduce(function(s,r){return s+Number(pkVal(r,'devices')||0);},0);
  var saldo=ventas.reduce(function(s,r){return s+Number(pkVal(r,'saldo')||0);},0);
  var total=pkNum(st.totalProducidos,300);
  var invAuto=Math.max(total-vendidos-comodato,0);
  var inventario=pkNum(st.inventarioRedwood,invAuto);
  var cells=[
    ['Inventario',inventario,'dashboard'],
    ['Prospectos',prospectos.length,'prospecto'],
    ['Clientes',clientes.length,'cliente'],
    ['Ventas',ventas.length,'venta'],
    ['Comodatos',comodatos.length,'comodato'],
    ['Cobranza',cobranza.length,'cobranza'],
    ['Por cobrar',pkMoney(saldo),'cobranza']
  ];
  var cards=cells.map(function(c){return '<button class="di" style="text-align:left;cursor:pointer;border:1px solid var(--line)" onclick="PKTAB=\''+c[2]+'\';nav(\'prokicks\')"><div class="dl">'+esc(c[0])+'</div><div class="dv">'+esc(String(c[1]))+'</div></button>';}).join('');
  var p=pkProject();
  return '<div class="sg">'+cards+'</div><div class="card"><div class="ch"><h3>Operación ProKicks</h3><button class="btn btnc" onclick="PKTAB=\'dashboard\';nav(\'prokicks\')">Abrir operación completa</button></div><p style="font-size:13px;color:var(--muted);margin:0">La información de ProKicks está en su módulo operativo: inventario, prospectos, clientes, ventas, comodatos y cobranza.</p></div>'
    +(p?pkWorkPlanHtml(p):'');
}
function vPK(){
  var p=pkProject();
  if(!p) return '<div class="card"><div class="empty"><div class="ei">⚽</div><p>No existe el proyecto ProKicks.</p></div></div>';
  if(!canUseProkicks()) return '<div class="card"><div class="empty"><div class="ei">🔒</div><p>Este módulo solo está disponible para admin o responsables de ProKicks.</p></div></div>';
  var tabs=PKTABS.map(function(t){return '<button class="tab '+(PKTAB===t[0]?'active':'')+'" onclick="PKTAB=\''+t[0]+'\';render()">'+t[1]+'</button>';}).join('');
  var body=PKTAB==='dashboard'?pkDashboard():pkTable(PKTAB);
  var addBtn = PKTAB!=='dashboard' ? '<button class="btn btnc" onclick="A.pkNew()">+ Nuevo '+esc(PKTAB_SINGLE[PKTAB]||'registro')+'</button>' : '';
  return '<div class="sh"><div style="display:flex;align-items:center;gap:10px"><button class="project-back" onclick="A.openProject(\''+p.id+'\',\'tareas\')" title="Volver a Plan de trabajo" aria-label="Volver a Plan de trabajo">'+iconHtml('home')+' <span>Inicio</span></button><h2>Operación ProKicks</h2></div>'+addBtn+'</div><div class="tabs">'+tabs+'</div>'+body;
}
function vFlorida(){
  var p=pkProject();
  if(!p) return '<div class="card"><div class="empty"><div class="ei">⚽</div><p>No existe el proyecto ProKicks.</p></div></div>';
  if(!canUseProkicks()) return '<div class="card"><div class="empty"><div class="ei">🔒</div><p>Este módulo solo está disponible para admin o responsables de ProKicks.</p></div></div>';
  return '<div class="sh"><div style="display:flex;align-items:center;gap:10px"><button class="project-back" onclick="A.openProject(\''+p.id+'\',\'tareas\')" title="Volver a Plan de trabajo" aria-label="Volver a Plan de trabajo">'+iconHtml('home')+' <span>Inicio</span></button><h2>Florida · Darío</h2></div><button class="btn btnc" onclick="A.pkNewFlorida()">+ Prospecto Florida</button></div>'+pkFloridaBoard();
}
function pkDashboard(){
  var st=pkSetting(), ventas=pkRows('venta'), comodatos=pkRows('comodato'), prospectos=pkRows('prospecto');
  var cerradas=ventas.filter(function(r){return pkVal(r,'estadoVenta')==='VENTA CERRADA';});
  var incompletas=ventas.filter(function(r){return pkVal(r,'estadoVenta')==='VENTA INCOMPLETA';});
  var vendidos=ventas.reduce(function(s,r){return s+Number(pkVal(r,'devices')||0);},0);
  var comodato=comodatos.reduce(function(s,r){return s+Number(pkVal(r,'devices')||0);},0);
  var saldo=ventas.reduce(function(s,r){return s+Number(pkVal(r,'saldo')||0);},0);
  var total=pkNum(st.totalProducidos,300);
  var invAuto=Math.max(total-vendidos-comodato,0);
  var inventario=pkNum(st.inventarioRedwood,invAuto);
  var metrics=[['Total producción',total],['Inventario',inventario],['Vendidos',vendidos],['En comodato',comodato],['Prospectos',prospectos.length],['Ventas cerradas',cerradas.length],['Ventas incompletas',incompletas.length],['Por cobrar',pkMoney(saldo)]];
  var note = st.inventarioRedwood===undefined||st.inventarioRedwood===null||st.inventarioRedwood==='' ? 'Inventario calculado automáticamente.' : 'Inventario capturado manualmente.';
  var quick = '<div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn btns btnc" onclick="PKTAB=\'prospecto\';A.pkNew()">+ Prospecto</button><button class="btn btns btnc" onclick="PKTAB=\'cliente\';A.pkNew()">+ Cliente</button><button class="btn btns btnc" onclick="PKTAB=\'venta\';A.pkNew()">+ Venta</button><button class="btn btns btnc" onclick="PKTAB=\'comodato\';A.pkNew()">+ Comodato</button><button class="btn btns btnc" onclick="PKTAB=\'cobranza\';A.pkNew()">+ Cobranza</button><button class="btn btns btng" onclick="A.pkSettings()">Editar inventario</button></div>';
  return '<div class="sh"><h2>Dashboard inventario</h2>'+quick+'</div>'
    +'<div class="sg">'+metrics.map(function(m){return '<div class="sc"><div class="sl">'+esc(m[0])+'</div><div class="sn" style="font-size:24px">'+esc(String(m[1]))+'</div></div>';}).join('')+'</div>'
    +'<div class="card" style="padding:14px 16px"><div style="font-size:13px;color:var(--muted)">'+esc(note)+' Inventario teórico: '+invAuto+' · Última actualización: '+(st.actualizadoEn?fmtdt(st.actualizadoEn):'—')+'</div></div>';
}
function pkTable(tipo){
  var rows=pkRows(tipo);
  var cols={prospecto:[['cliente','Prospecto'],['contacto','Contacto'],['rep','Rep'],['etapa','Etapa'],['siguiente_accion','Siguiente acción'],['proximo_seguimiento','Seguimiento'],['probabilidad','Prob.'],['monto_estimado','Monto']],cliente:[['nombre','Nombre'],['empresa','Club / Empresa'],['contacto','Contacto'],['ciudad','Ciudad'],['telefono','Teléfono'],['fuente','Fuente']],venta:[['cliente','Cliente'],['rep','Rep'],['devices','Devices'],['monto','Monto'],['saldo','Saldo'],['estadoVenta','Venta'],['estadoPago','Pago'],['entrega','Entrega']],comodato:[['cliente','Cliente'],['rep','Rep'],['devices','Devices'],['estado','Estado'],['fechaEntrega','Entrega'],['fechaDevolucion','Devolución'],['ciudad','Ciudad']],cobranza:[['cliente','Cliente'],['rep','Rep'],['monto','Monto'],['saldo','Saldo'],['estadoVenta','Estado'],['accion','Acción']]}[tipo]||[];
  var head=cols.map(function(c){return '<th>'+esc(c[1])+'</th>';}).join('')+'<th>Acciones</th>';
  var body=rows.map(function(r){return '<tr>'+cols.map(function(c){var v=pkVal(r,c[0]); if(['monto','saldo','monto_estimado'].indexOf(c[0])>=0)v=pkMoney(v); else if(['estadoVenta','estadoPago','entrega','estado','etapa'].indexOf(c[0])>=0)v=pkStatus(v); else v=esc(v||''); return '<td>'+v+'</td>';}).join('')+'<td><div style="display:flex;gap:5px"><button class="btn btns btng" onclick="A.pkEdit(\''+r.id+'\')">Editar</button><button class="btn btns btnd" onclick="A.pkDel(\''+r.id+'\')">Eliminar</button></div></td></tr>';}).join('') || '<tr><td colspan="'+(cols.length+1)+'"><div class="empty"><p>Sin registros</p></div></td></tr>';
  return '<div class="card"><div class="ch"><h3>'+esc((PKTABS.find(function(t){return t[0]===tipo;})||[])[1]||tipo)+'</h3><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="chip">'+rows.length+' registro(s)</span><button class="btn btns btnc" onclick="A.pkNew()">+ Nuevo '+esc(PKTAB_SINGLE[tipo]||'registro')+'</button></div></div><div class="tw"><table><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div></div>';
}

function pkFloridaStageLabel(v){
  return ({por_contactar:'Por contactar',contactado:'Contactado',demo_agendada:'Visita / demo',propuesta_enviada:'Propuesta',negociacion:'Negociación',cerrado:'Ganado',perdido:'Descartado'})[v]||'Por contactar';
}
function pkFloridaRows(){
  return pkRows('prospecto').filter(function(r){
    var d=r.data||{};
    return String(d.mercado||'').toLowerCase()==='florida' || /indoor florida/i.test(String(d.fuente||'')) || /florida/i.test(String(d.import_batch||''));
  });
}
function pkFloridaBoard(){
  var all=pkFloridaRows(), f=PK_FLORIDA_FILTERS;
  var rows=all.filter(function(r){
    var d=r.data||{}, hay=(String(d.cliente||'')+' '+String(d.contacto||'')+' '+String(d.ciudad||'')+' '+String(d.email||'')).toLowerCase();
    return (!f.region||d.region===f.region)&&(!f.tipo||d.tipo_instalacion===f.tipo)&&(!f.etapa||d.etapa===f.etapa)&&(!f.busqueda||hay.indexOf(f.busqueda.toLowerCase())>=0);
  }).sort(function(a,b){return Number(pkVal(b,'potencial')||0)-Number(pkVal(a,'potencial')||0)||String(pkVal(a,'cliente')||'').localeCompare(String(pkVal(b,'cliente')||''));});
  var regions=['South Florida','Central Florida','West Florida','North Florida'];
  var types=['Indoor Soccer/Futsal','Ice Rink','Field House/Multi-Sport','Other Indoor Sports Venue'];
  var stages=['por_contactar','contactado','demo_agendada','propuesta_enviada','negociacion','cerrado','perdido'];
  var visited=all.filter(function(r){return pkVal(r,'visitado')==='Sí';}).length;
  var qualified=all.filter(function(r){return Number(pkVal(r,'potencial')||0)>=8;}).length;
  var contacted=all.filter(function(r){return pkVal(r,'etapa')&&pkVal(r,'etapa')!=='por_contactar';}).length;
  var missing=all.filter(function(r){return !pkVal(r,'email')&&!pkVal(r,'telefono');}).length;
  var stageCards=stages.map(function(s){
    var n=all.filter(function(r){return (pkVal(r,'etapa')||'por_contactar')===s;}).length;
    return '<button class="pkf-stage '+(f.etapa===s?'active':'')+'" onclick="PK_FLORIDA_FILTERS.etapa='+(f.etapa===s?"''":"'"+s+"'")+';render()"><span>'+esc(pkFloridaStageLabel(s))+'</span><strong>'+n+'</strong></button>';
  }).join('');
  var regionBars=regions.map(function(region){
    var n=all.filter(function(r){return pkVal(r,'region')===region;}).length;
    return '<button class="pkf-region" onclick="PK_FLORIDA_FILTERS.region=\''+region+'\';render()"><span>'+esc(region.replace(' Florida',''))+'</span><div><i style="width:'+Math.round(n/Math.max(all.length,1)*100)+'%"></i></div><strong>'+n+'</strong></button>';
  }).join('');
  var regionOptions='<option value="">Todas las regiones</option>'+regions.map(function(x){return '<option '+(f.region===x?'selected':'')+'>'+esc(x)+'</option>';}).join('');
  var typeOptions='<option value="">Todos los tipos</option>'+types.map(function(x){return '<option '+(f.tipo===x?'selected':'')+'>'+esc(x)+'</option>';}).join('');
  var stageOptions='<option value="">Todas las etapas</option>'+stages.map(function(x){return '<option value="'+x+'" '+(f.etapa===x?'selected':'')+'>'+esc(pkFloridaStageLabel(x))+'</option>';}).join('');
  var table=rows.map(function(r){
    var d=r.data||{}, potential=Number(d.potencial||0), contact=[d.contacto,d.cargo].filter(Boolean).join(' · ');
    return '<tr><td><strong>'+esc(d.cliente||'')+'</strong><small>'+esc(d.ciudad||d.direccion||'')+'</small></td>'
      +'<td><span class="pkf-pill">'+esc(d.region||'—')+'</span><small>'+esc(d.tipo_instalacion||'')+'</small></td>'
      +'<td><strong>'+esc(contact||'Por investigar')+'</strong><small>'+esc(d.email||d.telefono||'Sin contacto público')+'</small></td>'
      +'<td>'+pkStatus(d.etapa||'por_contactar')+'</td>'
      +'<td><div class="pkf-score '+(potential>=8?'hot':potential>=5?'warm':'')+'"><strong>'+(potential||'—')+'</strong><span>/10</span></div><small>'+esc(d.visitado||'Pendiente')+'</small></td>'
      +'<td><strong>'+esc(d.siguiente_accion||'Calificar con Darío')+'</strong><small>'+fmt(d.proximo_seguimiento)+'</small></td>'
      +'<td><button class="btn btns btnc" onclick="A.pkFloridaEdit(\''+r.id+'\')">Gestionar</button></td></tr>';
  }).join('')||'<tr><td colspan="7"><div class="empty"><p>No hay prospectos con estos filtros.</p></div></td></tr>';
  return '<section class="pkf-board">'
    +'<div class="pkf-hero"><div><span class="pkf-eyebrow">EXPANSIÓN FLORIDA · PARTNER DARÍO SALA</span><h2>Indoor Facilities Pipeline</h2><p>Una sola vista para calificar, visitar y convertir oportunidades en Florida.</p></div><div class="pkf-owner"><span>Responsable operativo</span><strong>Darío Sala</strong><small>Asignación sin acceso automático al CRM</small></div></div>'
    +'<div class="pkf-kpis"><div><span>Prospectos</span><strong>'+all.length+'</strong><small>Base importada</small></div><div><span>Contactados</span><strong>'+contacted+'</strong><small>'+Math.round(contacted/Math.max(all.length,1)*100)+'% del universo</small></div><div><span>Visitados</span><strong>'+visited+'</strong><small>Pendientes '+(all.length-visited)+'</small></div><div class="success"><span>Potencial 8–10</span><strong>'+qualified+'</strong><small>Prioridad comercial</small></div><div class="warning"><span>Sin email/teléfono</span><strong>'+missing+'</strong><small>Requieren investigación</small></div></div>'
    +'<div class="pkf-grid"><div class="pkf-card"><div class="pkf-card-head"><h3>Embudo comercial</h3><span>'+all.length+' instalaciones</span></div><div class="pkf-funnel">'+stageCards+'</div></div><div class="pkf-card"><div class="pkf-card-head"><h3>Cobertura regional</h3><span>Florida</span></div><div class="pkf-regions">'+regionBars+'</div></div></div>'
    +'<div class="pkf-toolbar"><input id="pkf_q" type="search" value="'+esc(f.busqueda)+'" placeholder="Buscar instalación, ciudad o contacto"><select id="pkf_region">'+regionOptions+'</select><select id="pkf_tipo">'+typeOptions+'</select><select id="pkf_etapa">'+stageOptions+'</select><button class="btn btnc" onclick="A.pkFloridaApply()">Aplicar</button><button class="btn btng" onclick="A.pkFloridaClear()">Limpiar</button><span>'+rows.length+' de '+all.length+'</span></div>'
    +'<div class="card pkf-table"><div class="tw"><table><thead><tr><th>Instalación</th><th>Región / tipo</th><th>Contacto</th><th>Etapa</th><th>Potencial</th><th>Siguiente acción</th><th></th></tr></thead><tbody>'+table+'</tbody></table></div></div>'
    +'</section>';
}

function projectAccessField(p){
  var users = DB.usuarios.filter(function(u){ return u.activo && u.rol!=='admin'; });
  var current = p ? DB.proyecto_usuarios.filter(function(pu){ return pu.proyecto_id===p.id; }).map(function(pu){ return pu.usuario_id; }) : [];
  var boxes = users.map(function(u){
    return '<label class="access-check"><input type="checkbox" data-access-user value="'+u.id+'" '+(current.indexOf(u.id)>=0?'checked':'')+'> <span class="usav" style="width:22px;height:22px;font-size:10px;display:inline-flex">'+ini(u.nombre)+'</span> '+esc(u.nombre)+'</label>';
  }).join('');
  return '<div class="fld"><label>¿Quién puede ver este proyecto?</label><div class="access-check-list">'+(boxes||'<p style="color:var(--muted);font-size:12px">No hay usuarios activos para asignar.</p>')+'</div><p style="color:var(--muted);font-size:11px;margin-top:4px">Además de quien ya tenga tareas asignadas aquí. Los administradores siempre ven todos los proyectos.</p></div>';
}

/* CLIENTES */
function vCL(){
  if(!adm()) return '<div class="card"><div class="empty"><p>Solo administradores</p></div></div>';
  var rows = DB.clientes.map(function(c){
    var np = DB.proyectos.filter(function(p){return p.cliente_id===c.id;}).length;
    return '<tr>'
      +'<td><span style="font-weight:700">'+esc(c.nombre)+'</span></td>'
      +'<td>'+esc(c.contacto||'—')+'</td>'
      +'<td style="font-size:12px;color:var(--muted)">'+esc(c.telefono||'')+(c.email?'<br>'+esc(c.email):'')+'</td>'
      +'<td style="text-align:center">'+(c.dia_pago||'—')+'</td>'
      +'<td style="text-align:center">'+(c.dia_factura||'—')+'</td>'
      +'<td style="text-align:center">'+np+'</td>'
      +'<td>'+(c.drive_url?'<a href="'+esc(c.drive_url)+'" target="_blank" class="btn btns btng">📁 Drive</a>':'—')+'</td>'
      +'<td>'+bSt(c.estado)+'</td>'
      +'<td><div style="display:flex;gap:5px"><button class="btn btns btng" onclick="A.ec(\''+c.id+'\')">Editar</button><button class="btn btns" onclick="A.pagos(\''+c.id+'\')">Pagos</button>'+(c.estado==='inactivo'?'<button class="btn btns btng" onclick="A.rc(\''+c.id+'\')">Reactivar</button>':'<button class="btn btns btnd" onclick="A.dc(\''+c.id+'\')">Eliminar</button>')+'</div></td>'
      +'</tr>';
  }).join('') || '<tr><td colspan="9"><div class="empty"><p>Sin clientes</p></div></td></tr>';
  return '<div class="sh"><h2>Clientes</h2><button class="btn btnc" onclick="A.nc()">+ Nuevo cliente</button></div>'
    +'<div class="card"><div class="tw"><table><thead><tr><th>Cliente</th><th>Contacto</th><th>Tel/Email</th><th>Día pago</th><th>Día factura</th><th>Proyectos</th><th>Drive</th><th>Estado</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

/* USUARIOS */
function vUS(){
  if(!adm()) return '<div class="card"><div class="empty"><p>Solo administradores</p></div></div>';
  var activeUsers=DB.usuarios.filter(function(u){return u.activo;}).length, admins=DB.usuarios.filter(function(u){return u.activo&&u.rol==='admin';}).length;
  var rows = DB.usuarios.map(function(u){
    var projectIds=[];
    DB.proyectos.forEach(function(p){if(p.owner_id===u.id&&projectIds.indexOf(p.id)<0)projectIds.push(p.id);});
    DB.tareas.forEach(function(t){if(t.owner_id===u.id&&projectIds.indexOf(t.proyecto_id)<0)projectIds.push(t.proyecto_id);});
    var openTasks=DB.tareas.filter(function(t){return t.owner_id===u.id&&t.estado!=='terminada';}).length;
    return '<tr>'
      +'<td><div style="display:flex;align-items:center;gap:9px"><div class="av">'+ini(u.nombre)+'</div><span style="font-weight:700">'+esc(u.nombre)+'</span></div></td>'
      +'<td style="color:var(--muted)">'+esc(u.username)+'</td>'
      +'<td><span class="badge '+(u.rol==='admin'?'bc_':'bb_')+'">'+( u.rol==='admin'?'Administrador':'Usuario')+'</span></td>'
      +'<td>'+(u.activo?'<span class="badge bg_">Activo</span>':'<span class="badge bx_">Inactivo</span>')+'</td>'
      +'<td><strong>'+projectIds.length+'</strong><small style="display:block;color:var(--muted)">'+openTasks+' tarea(s) abiertas</small></td>'
      +'<td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="btn btns btng" onclick="A.eu(\''+u.id+'\')">'+iconHtml('user-cog')+' Editar acceso</button>'
      +(u.id!==SES.userId?'<button class="btn btns btnd" onclick="A.tu(\''+u.id+'\')">'+( u.activo?'Desactivar':'Activar')+'</button>':'')
      +'</div></td></tr>';
  }).join('');
  return '<div class="sh"><div><h2>Usuarios y permisos</h2><div style="font-size:13px;color:var(--muted);margin-top:3px">Altas, bajas y roles desde un solo lugar.</div></div><button class="btn btnc" onclick="A.nu()">'+iconHtml('user-plus')+' Nuevo usuario</button></div>'
    +'<div class="user-access-note">'+iconHtml('shield-check')+'<div><strong>Modelo de acceso actual</strong><span>Administrador: ve y gestiona todo. Usuario: ve proyectos o tareas que tiene asignados. Cambiar un responsable interno de ProKicks no crea acceso.</span></div></div>'
    +'<div class="sg user-kpis"><div class="sc"><div class="sl">Usuarios</div><div class="sn">'+DB.usuarios.length+'</div></div><div class="sc g"><div class="sl">Activos</div><div class="sn">'+activeUsers+'</div></div><div class="sc"><div class="sl">Administradores</div><div class="sn">'+admins+'</div></div><div class="sc y"><div class="sl">Inactivos</div><div class="sn">'+(DB.usuarios.length-activeUsers)+'</div></div></div>'
    +'<div class="card user-admin-table"><div class="tw"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Proyectos</th><th>Administración</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

/* REPORTES */
function vRE(){
  if(FPID && xid(DB.proyectos,FPID)) return projectReportHtml(FPID);
  var projs = myProjs().filter(function(p){return p.estado!=='cerrado';});
  var cards = projs.map(function(p){
    var s=projectStats(p);
    return '<div class="card" style="border-left:3px solid var(--cyan)"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><div style="font-size:17px;font-weight:900;color:var(--ink)">'+esc(p.nombre)+'</div><div style="font-size:13px;color:var(--muted);margin-top:2px">'+s.progress+'% avance · '+s.tasks.length+' tareas · '+(s.overdue+s.noNext)+' riesgos</div></div><button class="btn btnc" onclick="FPID=\''+p.id+'\';render()">Ver reporte</button></div></div>';
  }).join('') || '<div class="card"><div class="empty"><p>Sin proyectos para reportar</p></div></div>';
  return '<div class="sh"><div><h2>Reportes por proyecto</h2><div style="font-size:13px;color:var(--muted);margin-top:3px">Selecciona un proyecto para evitar mezclar métricas.</div></div></div>'+cards;
  // Usuario normal: solo ve su propio rendimiento
  if(!adm()){
    var u = me();
    var ut = DB.tareas.filter(function(t){return t.owner_id===u.id;});
    var done = ut.filter(function(t){return t.estado==='terminada';}).length;
    var inP = ut.filter(function(t){return t.estado==='en_proceso';}).length;
    var inR = ut.filter(function(t){return t.estado==='en_revision';}).length;
    var ov = ut.filter(function(t){return t.estado!=='terminada'&&t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;}).length;
    var eff = ut.length ? Math.round(done/ut.length*100) : 0;
    var heTotal = ut.reduce(function(s,t){return s+(Number(t.horas_estimadas)||0);},0);
    var hrTotal = ut.reduce(function(s,t){return s+(Number(t.horas_reales)||0);},0);
    return '<div class="sh"><h2>Mi rendimiento</h2></div>'
      +'<div class="sg">'
      +'<div class="sc"><div class="sl">Tareas asignadas</div><div class="sn">'+ut.length+'</div></div>'
      +'<div class="sc g"><div class="sl">Terminadas</div><div class="sn">'+done+'</div><div class="ss">'+eff+'% eficiencia</div></div>'
      +'<div class="sc y"><div class="sl">En proceso</div><div class="sn">'+inP+'</div></div>'
      +'<div class="sc r"><div class="sl">Vencidas</div><div class="sn">'+ov+'</div></div>'
      +'</div>'
      +'<div class="card"><div class="ch"><h3>Mis tareas</h3></div>'
      +'<div class="dg3" style="margin-bottom:16px">'
      +'<div class="di"><div class="dl">Horas estimadas</div><div class="dv">'+heTotal+'h</div></div>'
      +'<div class="di"><div class="dl">Horas reales</div><div class="dv">'+hrTotal+'h</div></div>'
      +'<div class="di"><div class="dl">Eficiencia horas</div><div class="dv">'+(heTotal?Math.round(hrTotal/heTotal*100):0)+'%</div></div>'
      +'</div>'
      +'<div class="tw"><table><thead><tr><th>Tarea</th><th>Proyecto</th><th>Estado</th><th>Semáforo</th><th>Vence</th><th>H Est/Real</th></tr></thead><tbody>'
      +ut.map(function(t){
        var tid = t.id;
        return '<tr>'
          +'<td><span style="font-weight:700;cursor:pointer;color:var(--navy)" onclick="A.td(\''+tid+'\')">'+esc(t.titulo)+'</span></td>'
          +'<td style="font-size:12px;color:var(--muted)">'+esc(pNm(t.proyecto_id))+'</td>'
          +'<td>'+bSt(t.estado)+'</td>'
          +'<td>'+sem(t)+'</td>'
          +'<td style="font-size:12px;color:var(--muted)">'+fmt(t.fecha_vencimiento)+'</td>'
          +'<td style="font-size:12px;color:var(--muted)">'+t.horas_reales+'/'+t.horas_estimadas+'h</td>'
          +'</tr>';
      }).join('')||'<tr><td colspan="6"><div class="empty"><p>Sin tareas asignadas</p></div></td></tr>'
      +'</tbody></table></div></div>';
  }
  var tB = DB.proyectos.filter(function(p){return p.estado!=='cerrado';}).reduce(function(s,p){return s+(Number(p.presupuesto)||0);},0);
  var tP = DB.pagos.filter(function(p){return p.estado==='pagado';}).reduce(function(s,p){return s+(Number(p.monto)||0);},0);
  var tPe = DB.pagos.filter(function(p){return p.estado!=='pagado';}).reduce(function(s,p){return s+(Number(p.monto)||0);},0);
  var realTasks = DB.tareas.filter(function(t){return !isGroupHeader(t);});
  var eff = realTasks.length ? Math.round(realTasks.filter(function(t){return t.estado==='terminada';}).length/realTasks.length*100) : 0;
  var urows = DB.usuarios.filter(function(u){return u.rol!=='admin';}).map(function(u){
    var ut = realTasks.filter(function(t){return t.owner_id===u.id;});
    var d2 = ut.filter(function(t){return t.estado==='terminada';}).length;
    var ip = ut.filter(function(t){return t.estado==='en_proceso';}).length;
    var ov = ut.filter(function(t){return t.estado!=='terminada'&&t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<0;}).length;
    var ef = ut.length ? Math.round(d2/ut.length*100) : 0;
    return '<tr>'
      +'<td><div style="display:flex;align-items:center;gap:8px"><div class="av" style="width:28px;height:28px;font-size:11px">'+ini(u.nombre)+'</div><strong>'+esc(u.nombre)+'</strong></div></td>'
      +'<td>'+ut.length+'</td><td><span class="badge bg_">'+d2+'</span></td><td><span class="badge bb_">'+ip+'</span></td><td><span class="badge '+(ov>0?'br_':'bx_')+'">'+ov+'</span></td>'
      +'<td><div style="display:flex;align-items:center;gap:7px"><div class="pb" style="width:80px"><div class="pf" style="width:'+ef+'%"></div></div><span style="font-size:12px;color:var(--muted)">'+ef+'%</span></div></td>'
      +'</tr>';
  }).join('');
  var prows = DB.pagos.map(function(pay){
    return '<tr>'
      +'<td style="font-weight:700">'+esc(pay.concepto)+'</td>'
      +'<td style="font-size:12px;color:var(--muted)">'+esc(cNm(pay.cliente_id))+'</td>'
      +'<td style="font-weight:800;color:var(--navy)">$'+Number(pay.monto).toLocaleString()+'</td>'
      +'<td style="font-size:12px;color:var(--muted)">'+fmt(pay.fecha_factura)+'</td>'
      +'<td style="font-size:12px;color:var(--muted)">'+fmt(pay.fecha_vencimiento)+'</td>'
      +'<td>'+bSt(pay.estado)+'</td>'
      +'<td>'+(pay.estado!=='pagado'?'<button class="btn btns btng" onclick="A.mp(\''+pay.id+'\')">✓ Cobrado</button>':'—')+'</td>'
      +'</tr>';
  }).join('') || '<tr><td colspan="7"><div class="empty"><p>Sin pagos</p></div></td></tr>';
  return '<div class="sh"><h2>Reportes ejecutivos</h2></div>'
    +'<div class="sg"><div class="sc"><div class="sl">Valor total proyectos</div><div class="sn" style="font-size:24px">$'+tB.toLocaleString()+'</div></div><div class="sc g"><div class="sl">Cobrado</div><div class="sn" style="font-size:24px">$'+tP.toLocaleString()+'</div></div><div class="sc y"><div class="sl">Por cobrar</div><div class="sn" style="font-size:24px">$'+tPe.toLocaleString()+'</div></div><div class="sc"><div class="sl">Eficiencia global</div><div class="sn">'+eff+'%</div></div></div>'
    +'<div class="card"><div class="ch"><h3>Rendimiento por usuario</h3></div><div class="tw"><table><thead><tr><th>Usuario</th><th>Asignadas</th><th>Terminadas</th><th>En proceso</th><th>Vencidas</th><th>Eficiencia</th></tr></thead><tbody>'+urows+'</tbody></table></div></div>'
    +'<div class="card"><div class="ch"><h3>Control de pagos</h3><button class="btn btns btng" onclick="A.np2()">+ Registrar pago</button></div><div class="tw"><table><thead><tr><th>Concepto</th><th>Cliente</th><th>Monto</th><th>Factura</th><th>Vence</th><th>Estado</th><th></th></tr></thead><tbody>'+prows+'</tbody></table></div></div>';
}

/* ══ ACTIONS ════════════════════════════════════════════════ */
var A = {
  execReport: function(pid){
    var p=xid(DB.proyectos,pid); if(!p) return;
    var txt=executiveReportText(pid);
    mOpen('Reporte ejecutivo · '+p.nombre, '<div class="report-box"><textarea id="exec-report-text" readonly>'+esc(txt)+'</textarea></div><div class="fa"><button class="btn btng" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById(\'exec-report-text\').value);toast(\'Reporte copiado ✓\',\'g\')">Copiar reporte</button><button class="btn btnc" onclick="mClose()">Cerrar</button></div>', true);
  },

  commandFilterRows: function(pid,type){
    var open=projectTasks(pid).filter(function(t){return t.estado!=='terminada';});
    return open.filter(function(t){
      var d=t.fecha_vencimiento?dayDiff(t.fecha_vencimiento):999;
      if(type==='vencidas') return d<0;
      if(type==='proximos_7') return d>=0&&d<=7;
      if(type==='sin_accion') return !nextAction(t);
      if(type==='sin_dueno') return !t.owner_id;
      if(type==='revision') return t.estado==='en_revision';
      if(type==='riesgos') return crmHealth(t).cl==='dr';
      if(type==='mis_criticos') return t.owner_id===SES.userId && (crmHealth(t).cl==='dr' || (t.fecha_vencimiento&&dayDiff(t.fecha_vencimiento)<=7) || !nextAction(t));
      return false;
    }).sort(function(a,b){return dayDiff((followDate(a)||a.fecha_vencimiento||pd(999)))-dayDiff((followDate(b)||b.fecha_vencimiento||pd(999)));});
  },
  commandFilter: function(pid,type){
    var p=xid(DB.proyectos,pid); if(!p)return;
    var labels={vencidas:'Tareas vencidas',proximos_7:'Vencimientos próximos 7 días',sin_accion:'Sin siguiente acción',sin_dueno:'Sin responsable',revision:'En revisión',riesgos:'Riesgos críticos',mis_criticos:'Mis pendientes críticos'};
    var rows=A.commandFilterRows(pid,type);
    var users=DB.usuarios.map(function(u){return '<option value="'+esc(u.id)+'">'+esc(u.nombre)+'</option>';}).join('');
    var body=rows.map(function(t){return '<tr>'
      +'<td><input class="bulk-check" type="checkbox" value="'+esc(t.id)+'"></td>'
      +'<td><button class="linkbtn" onclick="mClose();A.quickEdit(\''+t.id+'\')">'+esc(t.titulo)+'</button><div class="muted-mini">'+esc(taskGroup(t))+'</div></td>'
      +'<td>'+esc(uNm(t.owner_id))+'</td><td>'+esc(automationReason(t))+'</td><td>'+fmt(followDate(t)||t.fecha_vencimiento)+'</td>'
      +'<td><button class="btn btns btnc" onclick="mClose();A.quickEdit(\''+t.id+'\')">Editar</button></td>'
      +'</tr>';}).join('') || '<tr><td colspan="6">Sin registros para este filtro.</td></tr>';
    var controls = rows.length ? '<div class="bulk-panel"><div class="bulk-head"><strong>Acciones masivas</strong><span class="muted-mini">Selecciona tareas y aplica cambios en lote.</span></div>'
      +'<div class="bulk-grid"><label><span>Responsable</span><select id="bulk_owner"><option value="">Sin cambio</option>'+users+'</select></label>'
      +'<label><span>Estado</span><select id="bulk_status"><option value="">Sin cambio</option><option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="en_revision">En revisión</option><option value="aprobada">Aprobada</option><option value="terminada">Terminada</option></select></label>'
      +'<label><span>Seguimiento</span><input id="bulk_follow" type="date"></label>'
      +'<label><span>Siguiente acción</span><input id="bulk_action" type="text" placeholder="Escribe el próximo paso"></label></div>'
      +'<textarea id="bulk_note" placeholder="Comentario masivo / avance ejecutivo"></textarea>'
      +'<div class="bulk-actions"><button class="btn btng" onclick="A.toggleBulkChecks(true)">Seleccionar todo</button><button class="btn btng" onclick="A.toggleBulkChecks(false)">Limpiar selección</button><button class="btn btnc" onclick="A.applyBulkFilter(\''+pid+'\',\''+type+'\')">Aplicar cambios</button><button class="btn btnc" onclick="A.filteredReport(\''+pid+'\',\''+type+'\')">Reporte filtrado</button></div></div>' : '';
    mOpen((labels[type]||'Filtro ejecutivo')+' · '+p.nombre, controls+'<div class="tw bulk-table-wrap"><table class="bulk-table"><thead><tr><th><input type="checkbox" onchange="A.toggleBulkChecks(this.checked)"></th><th>Tarea</th><th>Resp.</th><th>Acción sugerida</th><th>Fecha</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div><div class="fa"><button class="btn btng" onclick="mClose()">Cerrar</button></div>',true);
  },
  toggleBulkChecks: function(flag){
    document.querySelectorAll('.bulk-check').forEach(function(ch){ch.checked=!!flag;});
  },
  selectedBulkIds: function(){
    return Array.prototype.slice.call(document.querySelectorAll('.bulk-check:checked')).map(function(ch){return ch.value;});
  },
  applyBulkFilter: async function(pid,type){
    var ids=A.selectedBulkIds();
    if(!ids.length){toast('Selecciona al menos una tarea','r');return;}
    var owner=fv('bulk_owner'), status=fv('bulk_status'), follow=fv('bulk_follow'), action=fv('bulk_action').trim(), note=fv('bulk_note').trim();
    // UX hotfix 2.3.1: cuando el usuario está en el filtro 'Sin acción',
    // si escribe un avance pero no llena el campo Siguiente acción, usamos ese avance
    // como siguiente acción para que la tarea salga del filtro y no quede duplicada.
    if(type==='sin_accion' && !action && note) action=note;
    if(!owner&&!status&&!follow&&!action&&!note){toast('No hay cambios por aplicar','r');return;}
    for(var i=0;i<ids.length;i++){
      var t=xid(DB.tareas,ids[i]); if(!t||!canEditTask(t)) continue;
      var data={};
      if(owner) data.owner_id=owner;
      if(status) data.estado=status;
      if(follow||action){
        data.descripcion=buildDesc(t.descripcion,{accion:action||nextAction(t),seguimiento:follow||followDate(t)});
        if(crmEnabled()){ data.siguiente_accion=action||nextAction(t)||null; data.fecha_proximo_seguimiento=follow||followDate(t)||null; data.ultima_actividad=new Date().toISOString(); }
      }
      var diff=Object.keys(data).length?taskDiffText(t,Object.assign({},t,data)):'';
      if(Object.keys(data).length) await upd('tareas',ids[i],data);
      if(diff) await logTaskActivity(ids[i],'Acción masiva: '+diff);
      if(note) await ins('comentarios',{tarea_id:ids[i],usuario_id:SES.userId,texto:note});
    }
    await refresh();
    A.commandFilter(pid,type);
    toast('Acción masiva aplicada ✓','g');
  },
  filteredReport: function(pid,type){
    var p=xid(DB.proyectos,pid); if(!p)return;
    var labels={vencidas:'tareas vencidas',proximos_7:'próximos 7 días',sin_accion:'tareas sin acción',sin_dueno:'tareas sin dueño',revision:'tareas en revisión',riesgos:'riesgos críticos',mis_criticos:'mis pendientes críticos'};
    var rows=A.commandFilterRows(pid,type);
    var lines=['REPORTE FILTRADO — '+p.nombre,'Filtro: '+(labels[type]||'filtro ejecutivo'),'Fecha: '+fmtNow(),'','Total de registros: '+rows.length,''];
    rows.slice(0,25).forEach(function(t,i){lines.push((i+1)+'. '+t.titulo+' | Resp: '+uNm(t.owner_id)+' | Acción: '+(nextAction(t)||automationReason(t))+' | Fecha: '+fmt(followDate(t)||t.fecha_vencimiento));});
    if(rows.length>25) lines.push('... '+(rows.length-25)+' registros adicionales.');
    mOpen('Reporte filtrado · '+p.nombre,'<div class="report-box"><textarea id="filtered-report-text" readonly>'+esc(lines.join('\n'))+'</textarea></div><div class="fa"><button class="btn btng" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById(\'filtered-report-text\').value);toast(\'Reporte filtrado copiado ✓\',\'g\')">Copiar reporte</button><button class="btn btnc" onclick="mClose()">Cerrar</button></div>',true);
  },


  /* PROYECTO */
  setBoardFilter: function(key,value){
    BOARD_FILTERS[key]=value||'';
    render();
  },
  clearBoardFilters: function(){
    BOARD_FILTERS={estado:'',accion:'',seguimiento:'',responsable:''};
    render();
  },
  pkManageFronts: function(pid){
    var p=xid(DB.proyectos,pid); if(!p||!isProkicksProject(p))return;
    var custom=configuredProjectGroups(p);
    var base=PROKICKS_WORK_FRONTS.map(function(n){return '<div class="hbar" style="justify-content:space-between"><strong>'+esc(n)+'</strong><span class="badge bx_">Base</span></div>';}).join('');
    var extra=custom.map(function(n,i){return '<div class="hbar" style="justify-content:space-between"><strong>'+esc(n)+'</strong><button class="btn btns btnd" onclick="A.pkRemoveFront(\''+pid+'\','+i+')">Eliminar</button></div>';}).join('');
    mOpen('Administrar frentes ProKicks','<div class="fg">'
      +'<div class="fr2">'+FLD('nf','Nuevo frente','text','')+'<div class="fld"><label>&nbsp;</label><button class="btn btnc" style="width:100%;min-height:42px" onclick="A.pkAddFront(\''+pid+'\')">Agregar frente</button></div></div>'
      +'<div style="display:grid;gap:7px"><strong>Frentes actuales</strong>'+base+extra+'</div>'
      +'<div class="hbar"><span class="dot dg"></span>Los nuevos frentes aparecerán en tareas, reporte, Kanban, calendario y Gantt.</div>'
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cerrar</button></div></div>');
  },
  pkAddFront: async function(pid){
    var p=xid(DB.proyectos,pid); if(!p)return;
    var name=fv('nf').replace(/\s+/g,' ').trim();
    if(!name){toast('Escribe el nombre del frente','r');return;}
    if(name.length>60||/[|\r\n]/.test(name)){toast('Usa un nombre de máximo 60 caracteres','r');return;}
    if(groupsForProject(p).some(function(g){return g.toLowerCase()===name.toLowerCase();})){toast('Ese frente ya existe','r');return;}
    var custom=configuredProjectGroups(p).concat(name);
    var lines=String(p.descripcion||'').split(/\r?\n/).filter(function(line){return !/^\s*Frentes\s*:/i.test(line);});
    lines.push('Frentes: '+custom.join(' | '));
    var saved=await upd('proyectos',pid,{descripcion:lines.join('\n').trim()});
    if(saved){await refresh();mClose();PK_NEW_FRONT=name;A.nt(pid);toast('Frente agregado · crea su primera tarea ✓','g');}
  },
  pkRemoveFront: async function(pid,index){
    var p=xid(DB.proyectos,pid); if(!p)return;
    var custom=configuredProjectGroups(p), name=custom[index]; if(!name)return;
    var used=DB.tareas.some(function(t){return t.proyecto_id===pid&&!isGroupHeader(t)&&taskGroup(t).toLowerCase()===name.toLowerCase();});
    if(used){toast('No se puede eliminar: el frente tiene tareas','r');return;}
    custom.splice(index,1);
    var lines=String(p.descripcion||'').split(/\r?\n/).filter(function(line){return !/^\s*Frentes\s*:/i.test(line);});
    if(custom.length)lines.push('Frentes: '+custom.join(' | '));
    var saved=await upd('proyectos',pid,{descripcion:lines.join('\n').trim()});
    if(saved){await refresh();A.pkManageFronts(pid);toast('Frente eliminado','g');}
  },
  pkTaskForFront: function(pid,index){
    var p=xid(DB.proyectos,pid); if(!p)return;
    PK_NEW_FRONT=groupsForProject(p)[index]||'';
    A.nt(pid);
  },
  helpSearch: function(q){
    q=String(q||'').toLowerCase().trim();
    var any=false;
    document.querySelectorAll('.faq-item').forEach(function(el){
      var ok=!q || (el.getAttribute('data-q')||'').indexOf(q)>=0;
      el.style.display=ok?'block':'none'; if(ok) any=true;
    });
    var empty=document.getElementById('help-empty'); if(empty) empty.style.display=any?'none':'block';
  },
  helpCat: function(cat){
    document.querySelectorAll('.help-chip').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('.help-chip').forEach(function(b){ if(b.textContent===cat || (!cat && b.textContent==='Todo')) b.classList.add('active'); });
    var any=false;
    document.querySelectorAll('.faq-item').forEach(function(el){
      var ok=!cat || el.getAttribute('data-cat')===cat;
      el.style.display=ok?'block':'none'; if(ok) any=true;
    });
    var inp=document.getElementById('help-search'); if(inp) inp.value='';
    var empty=document.getElementById('help-empty'); if(empty) empty.style.display=any?'none':'block';
  },
  openProject: function(id,tab){
    var was = FPID;
    FPID = id;
    PTAB = tab || 'tareas';
    if(was!==id || PTAB!=='calendario') CAL_OFF = 0;
    nav('proyectos');
    trackEvent('project_opened',{project_id:id,tab:PTAB});
  },
  setControlFilter: function(key,value){
    if(Object.prototype.hasOwnProperty.call(CONTROL_FILTERS,key)) CONTROL_FILTERS[key]=value||'';
    render();
  },
  clearControlFilters: function(){
    CONTROL_FILTERS={estado:'',responsable:'',area:'',foco:''};
    render();
  },
  np: function(){ A._pm(null); },
  ep: function(id){ A._pm(id); },
  _pm: function(id){
    var p = id ? xid(DB.proyectos,id) : null;
    var visual = p ? projectVisual(p) : suggestProjectVisual('','');
    var cO = DB.clientes.map(function(c){return [c.id,c.nombre];});
    var uO = DB.usuarios.map(function(u){return [u.id,u.nombre];});
    mOpen(p?'Editar proyecto':'Nuevo proyecto',
      '<div class="fg">'
      +'<div class="fr2">'+FSL('ci','Cliente',cO,p&&p.cliente_id)+FSL('oi','Responsable',uO,p&&p.owner_id||SES.userId)+'</div>'
      +(p?'':'<div class="guided-create"><div class="fld"><label>Tipo de creación</label><select id="f_create_mode" onchange="A.previewProjectCreation()"><option value="vacio">Proyecto vacío</option><option value="template">Usar plantilla</option><option value="guided">Creación guiada</option></select></div><div id="guided-create-options"></div><div id="guided-create-preview" class="guided-preview"></div></div>')
      +FLD('nm','Nombre del proyecto','text',p&&p.nombre)
      +FTA('dc','Descripción',p&&projectDescription(p))
      +projectVisualFields(visual)
      +'<div class="fr3">'+FLD('fi','Inicio','date',p&&p.fecha_inicio||today())+FLD('fv','Vencimiento','date',p&&p.fecha_vencimiento||pd(90))+FLD('bud','Presupuesto','number',p&&p.presupuesto||'')+'</div>'
      +'<div class="fr2">'+FSL('pi','Etapa',[['prospecto','Prospecto'],['propuesta','Propuesta'],['negociacion','Negociación'],['ejecucion','Ejecución'],['cerrado_ganado','Ganado'],['cerrado_perdido','Perdido']],p&&p.pipeline||'propuesta')+FSL('es','Estado',[['activo','Activo'],['pausado','Pausado'],['cerrado','Cerrado']],p&&p.estado||'activo')+'</div>'
      +FLD('dr','Link Google Drive (carpeta del proyecto)','url',p&&p.drive_url)
      +projectAccessField(p)
      +'<div class="fa">'+(p?'<button class="btn project-archive" onclick="mClose();A.baja(\''+p.id+'\')">'+iconHtml('archive')+' Dar de baja</button>':'')+'<span style="flex:1"></span><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A._sp(\''+( id||'')+'\')">Guardar proyecto</button></div>'
      +'</div>');
    if(!p) A.previewProjectCreation();
  },
  previewProjectCreation: function(){
    var mode=(document.getElementById('f_create_mode')||{}).value||'vacio';
    var opt=document.getElementById('guided-create-options');
    if(opt){
      if(mode==='template'){
        var cats=smTemplateCatalog();
        opt.innerHTML='<div class="fld"><label>Plantilla</label><select id="f_template" onchange="A.previewProjectCreation()">'+Object.keys(cats).filter(function(k){return k!=='vacio';}).map(function(k){return '<option value="'+k+'">'+esc(cats[k].label)+'</option>';}).join('')+'</select></div>';
      }else if(mode==='guided'){
        var selectedNow=Array.prototype.map.call(document.querySelectorAll('[data-guide-option]:checked'),function(el){return el.value;});
        opt.innerHTML='<div class="fld"><label>¿Qué necesita este cliente?</label><div class="guided-checks">'+smGuidedOptions().map(function(o){return '<label><input type="checkbox" data-guide-option value="'+o[0]+'" '+(selectedNow.indexOf(o[0])>=0?'checked':'')+' onchange="A.previewProjectCreation()"> '+esc(o[1])+'</label>';}).join('')+'</div></div>';
      }else opt.innerHTML='<div class="hbar"><span class="dot dg"></span>Se creará solo la ficha del proyecto. Las tareas se cargarán después.</div>';
    }
    var plan=smCreationPlan();
    var prev=document.getElementById('guided-create-preview');
    if(prev){
      prev.innerHTML='<strong>Vista previa operativa</strong><div class="guided-meta">Frentes: '+(plan.fronts.length?plan.fronts.join(' · '):'Sin frentes automáticos')+'</div><div class="guided-meta">Tareas base: '+plan.tasks.length+'</div>'+(plan.tasks.length?'<ul>'+plan.tasks.slice(0,6).map(function(t){return '<li><b>'+esc(t[0])+'</b> · '+esc(t[1])+'</li>';}).join('')+'</ul>':'');
    }
  },
  _sp: async function(id){
    var nm = fv('nm'); if(!nm){toast('Nombre requerido','r');return;}
    var visual={category:fv('cat')||'Servicios profesionales',icon:fv('ico')||'briefcase-business',color:fv('clr')||'#2563EB'};
    if(!id && visual.category==='Servicios profesionales' && visual.icon==='briefcase-business') visual=suggestProjectVisual(nm,fv('dc'));
    var creationPlan=!id?smCreationPlan():smTemplateByKey('vacio');
    var projectDesc=buildProjectDescription(fv('dc'),visual.category,visual.icon,visual.color);
    var savedFronts=id?configuredProjectGroups(xid(DB.proyectos,id)):(creationPlan.fronts||[]);
    if(savedFronts.length)projectDesc+='\nFrentes: '+savedFronts.join(' | ');
    var data = {cliente_id:fv('ci'),owner_id:fv('oi'),nombre:nm,descripcion:projectDesc,fecha_inicio:fv('fi')||null,fecha_vencimiento:fv('fv')||null,presupuesto:Number(fv('bud'))||0,pipeline:fv('pi'),estado:fv('es'),drive_url:fv('dr')||null};
    var r = id ? await upd('proyectos',id,data) : await ins('proyectos',data);
    if(r && !id && creationPlan.tasks && creationPlan.tasks.length){
      await A.seedProjectFromPlan(r,creationPlan);
    }
    if(r){
      await A.saveProjectAccess(r.id);
      mClose();await refresh();trackEvent(id?'project_updated':'project_created',{project_id:r.id});toast(id?'Proyecto actualizado':'Proyecto creado ✓','g'); if(!id) A.openProject(r.id,'tareas');
    }
  },
  saveProjectAccess: async function(pid){
    var checked = Array.prototype.map.call(document.querySelectorAll('[data-access-user]:checked'),function(el){return el.value;});
    await sb.from('proyecto_usuarios').delete().eq('proyecto_id',pid);
    if(checked.length){
      await sb.from('proyecto_usuarios').insert(checked.map(function(uid){return {proyecto_id:pid,usuario_id:uid};}));
    }
  },
  seedProjectFromPlan: async function(project,plan){
    var owner=fv('oi')||SES.userId;
    var start=fv('fi')||today();
    function addDays(base,n){ var d=dateObj(base)||new Date(); d.setDate(d.getDate()+Number(n||7)); return dateKey(d); }
    for(var i=0;i<plan.tasks.length;i++){
      var item=plan.tasks[i];
      var desc=buildDesc('',{grupo:item[0],accion:item[2],seguimiento:addDays(start,Math.max(1,(item[3]||7)-1))});
      var data={proyecto_id:project.id,owner_id:owner,titulo:item[1],descripcion:desc,prioridad:i<2?'alta':'media',estado:'pendiente',fecha_inicio:start,fecha_vencimiento:addDays(start,item[3]||7),horas_estimadas:8,horas_reales:0};
      if(crmEnabled()){
        data.etapa_crm='por_contactar';
        data.siguiente_accion=item[2]||'Definir siguiente acción';
        data.fecha_proximo_seguimiento=addDays(start,Math.max(1,(item[3]||7)-1));
        data.ultima_actividad=new Date().toISOString();
      }
      await sb.from('tareas').insert(data);
    }
    trackEvent('project_template_seeded',{project_id:project.id,source:'creation_guide'});
  },
  pickIcon: function(el,name){ document.getElementById('f_ico').value=name; el.parentNode.querySelectorAll('.icon-choice').forEach(function(x){x.classList.remove('selected');}); el.classList.add('selected'); hydrateIcons(); },
  pickColor: function(el,color){ document.getElementById('f_clr').value=color; el.parentNode.querySelectorAll('.color-choice').forEach(function(x){x.classList.remove('selected');}); el.classList.add('selected'); },
  baja: async function(id){
    var p=xid(DB.proyectos,id); if(!p)return;
    if(!confirm('¿Dar de baja '+p.nombre+'? Se conservarán sus tareas, historial y datos; podrás reactivarlo después.')) return;
    var ok = await upd('proyectos',id,{estado:'cerrado'});
    if(ok){FPID='';await refresh();nav('proyectos');toast('Proyecto dado de baja y archivado ✓','g');}
  },
  restoreProject: async function(id){
    var p=xid(DB.proyectos,id); if(!p)return;
    var ok=await upd('proyectos',id,{estado:'activo'});
    if(ok){await refresh();toast('Proyecto reactivado ✓','g');}
  },
  pd: function(id){
    var p = xid(DB.proyectos,id); if(!p) return;
    var tasks = DB.tareas.filter(function(t){return t.proyecto_id===id;});
    var done = tasks.filter(function(t){return t.estado==='terminada';}).length;
    var pct = tasks.length ? Math.round(done/tasks.length*100) : 0;
    var fi = p.fecha_inicio?dateObj(p.fecha_inicio):null;
    var fv2 = p.fecha_vencimiento?dateObj(p.fecha_vencimiento):null;
    var tu = fi?Math.ceil((new Date()-fi)/864e5):0;
    var td2 = fi&&fv2?Math.ceil((fv2-fi)/864e5):100;
    var tp = td2>0?Math.round(tu/td2*100):0;
    var hcl = pct>=tp-10?'dg':pct>=tp-25?'dy':'dr';
    var hTxt = hcl==='dg'?'Saludable':hcl==='dy'?'En riesgo':'Atrasado';
    var tH = tasks.map(function(t){
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">'
        +'<span style="font-size:13px;font-weight:700;cursor:pointer;color:var(--navy)" onclick="mClose();A.td(\''+t.id+'\')">'+esc(t.titulo)+'</span>'
        +'<div style="display:flex;gap:7px;align-items:center">'+sem(t)+' '+bSt(t.estado)+'</div></div>';
    }).join('') || '<div style="color:var(--muted);font-size:13px">Sin tareas</div>';
    var drBtn = p.drive_url ? '<a href="'+esc(p.drive_url)+'" target="_blank" class="btn btnc">📁 Abrir carpeta Drive</a>' : '<span style="color:var(--muted);font-size:13px">Sin carpeta Drive configurada</span>';
    mOpen('📁 '+p.nombre,
      '<div style="display:grid;gap:16px">'
      +'<div class="hbar"><span class="dot '+hcl+'" style="width:12px;height:12px"></span>'+hTxt+' · Avance: '+pct+'% vs Tiempo: '+tp+'%</div>'
      +'<div class="dg3"><div class="di"><div class="dl">Cliente</div><div class="dv">'+esc(cNm(p.cliente_id))+'</div></div><div class="di"><div class="dl">Responsable</div><div class="dv">'+esc(uNm(p.owner_id))+'</div></div><div class="di"><div class="dl">Etapa</div><div class="dv">'+bPi(p.pipeline)+'</div></div><div class="di"><div class="dl">Inicio</div><div class="dv">'+fmt(p.fecha_inicio)+'</div></div><div class="di"><div class="dl">Vencimiento</div><div class="dv">'+fmt(p.fecha_vencimiento)+'</div></div><div class="di"><div class="dl">Estado</div><div class="dv">'+bSt(p.estado)+'</div></div></div>'
      +'<div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:13px;font-weight:700">Avance '+pct+'%</span><span style="font-size:12px;color:var(--muted)">'+done+'/'+tasks.length+'</span></div><div class="pb" style="height:7px"><div class="pf" style="width:'+pct+'%"></div></div></div>'
      +'<div>'+drBtn+'</div>'
      +'<div><div style="display:flex;justify-content:space-between;margin-bottom:10px"><strong>Tareas ('+tasks.length+')</strong><button class="btn btns btnc" onclick="mClose();A.nt(\''+id+'\')">+ Tarea</button></div>'+tH+'</div>'
      +(adm()?'<div class="fa"><button class="btn btng" onclick="mClose();A.ep(\''+id+'\')">✏️ Editar</button></div>':'')
      +'</div>',true);
  },

  /* TAREA */
  nt: function(pid){ if(!DB.proyectos.length){toast('Primero crea un proyecto','r');return;} A._tm(null,pid||''); },
  _tm: function(id,pid){
    var t = id ? xid(DB.tareas,id) : null;
    if(id && !canEditTask(t)){ toast('No tienes permisos para editar esta tarea','r'); return; }
    var p2 = pid || (t&&t.proyecto_id) || (DB.proyectos[0]&&DB.proyectos[0].id) || '';
    var pO = DB.proyectos.map(function(p){return [p.id,p.nombre];});
    var uO = DB.usuarios.map(function(u){return [u.id,u.nombre];});
    var selectedProject=xid(DB.proyectos,p2);
    var isPk=isProkicksProject(selectedProject);
    var gO = groupsForProject(selectedProject).map(function(g){return [g,g];});
    var crm = crmEnabled();
    var crmH = '<div style="border-top:1px solid var(--line);padding-top:13px"><h3 style="margin-bottom:10px">Contacto y control</h3>'
      +'<div class="fr2">'+FLD('emx','Email','email',t&&descVal(t,'Email')||'')+FLD('tel','Teléfono','text',t&&(descVal(t,'Telefono')||descVal(t,'Teléfono'))||'')+'</div>'
      +FLD('dir','Dirección','text',t&&(descVal(t,'Direccion')||descVal(t,'Dirección'))||'')
      +'<div class="fr2">'+FLD('ga','Gancho','text',t&&descVal(t,'Gancho')||'')+FLD('ins','Instrumento','text',t&&descVal(t,'Instrumento')||'')+'</div>'
      +'<div class="fr2">'+FSL('ec','Etapa',[['por_contactar','Por contactar'],['contactado','Contactado'],['respondio','Respondió'],['reunion_agendada','Reunión agendada'],['propuesta_enviada','Propuesta enviada'],['negociacion','Negociación'],['aprobado','Aprobado'],['rechazado','Rechazado'],['dormido','Dormido']],t&&(t.etapa_crm||descVal(t,'Etapa'))||'por_contactar')+FLD('ps','Próximo seguimiento','date',t&&(t.fecha_proximo_seguimiento||followDate(t))||'')+'</div>'
      +FLD('sa','Siguiente acción','text',t&&(t.siguiente_accion||nextAction(t))||'')
      +'<div class="fr2">'+FLD('pb','Probabilidad %','number',t&&(t.probabilidad||descVal(t,'Probabilidad'))||'')+FLD('me','Monto estimado','number',t&&(t.monto_estimado||descVal(t,'Monto estimado'))||'')+'</div>'
      +(crm?'':'<div class="hbar"><span class="dot dy"></span>Modo compatible: estos datos se guardarán en la descripción hasta ejecutar la migración CRM.</div>')
      +'</div>';
    var selectedCollabs=t?pkCollaborators(t):[];
    var traceH='<div style="border-top:1px solid var(--line);padding-top:14px"><h3 style="margin-bottom:5px">Trazabilidad del objetivo</h3><div style="font-size:12px;color:var(--muted);margin-bottom:12px">Conecta esta acción con el objetivo, entregable y resultado que debe producir.</div><div class="fr2">'+FLD('ob','Objetivo','text',t&&descVal(t,'Objetivo')||'')+FLD('en','Entregable / resultado','text',t&&descVal(t,'Entregable')||'')+'</div><div class="fr2">'+FLD('kp','KPI principal','text',t&&descVal(t,'KPI')||'')+FLD('mt','Meta','text',t&&descVal(t,'Meta')||'')+'</div></div>';
    var pkH=isPk?'<div style="border-top:1px solid var(--line);padding-top:14px"><h3 style="margin-bottom:5px">Asignación y control ProKicks</h3><div style="font-size:12px;color:var(--muted);margin-bottom:12px">Los responsables son etiquetas operativas y no obtienen acceso al CRM.</div>'
      +'<div class="fr2">'+FSL('fr','Frente',groupsForProject(selectedProject).map(function(n){return[n,n];}),t?pkTaskFront(t):(PK_NEW_FRONT||PROKICKS_WORK_FRONTS[0]))+FSL('ri','Responsable interno',[['','Por asignar']].concat(PROKICKS_INTERNAL_PEOPLE.map(function(n){return[n,n];})),t&&pkInternalOwner(t)!=='Por asignar'?pkInternalOwner(t):'')+'</div>'
      +'<div class="fld"><label>Colaboradores internos</label><div class="pkw-checks">'+PROKICKS_INTERNAL_PEOPLE.map(function(n,i){return '<label class="pkw-check-label"><input type="checkbox" data-pk-collab value="'+esc(n)+'" '+(selectedCollabs.indexOf(n)>=0?'checked':'')+'> '+esc(n)+'</label>';}).join('')+'</div></div>'
      +'<div class="fr2">'+FLD('sa','Siguiente acción','text',t&&(t.siguiente_accion||nextAction(t))||'')+FLD('ps','Próximo seguimiento','date',t&&(t.fecha_proximo_seguimiento||followDate(t))||'')+'</div>'
      +FLD('ct','Llamada a la acción','text',t&&descVal(t,'CTA')||'')
      +'</div>':'';
    var mainFields=isPk
      ?'<input type="hidden" id="f_pi" value="'+esc(p2)+'"><input type="hidden" id="f_oi" value="'+esc(t&&t.owner_id||SES.userId)+'">'
        +FLD('ti','Nombre de la tarea','text',t&&t.titulo)
        +FTA('dc','Notas / descripción',t&&stripDescFields(t.descripcion))
        +'<div class="fr2">'+FSL('pr','Prioridad',[['baja','Baja'],['media','Media'],['alta','Alta'],['critica','Crítica']],t&&t.prioridad||'media')+FSL('es','Estado',[['pendiente','Pendiente'],['en_proceso','En proceso'],['en_revision','En revisión'],['aprobada','Aprobada'],['terminada','Terminada']],t&&t.estado||'pendiente')+'</div>'
        +'<div class="fr2">'+FLD('fi','Inicio','date',t&&t.fecha_inicio||today())+FLD('fv','Vencimiento','date',t&&t.fecha_vencimiento||pd(7))+'</div>'
      :'<div class="fr2">'+FSL('pi','Proyecto',pO,p2)+FSL('oi','Responsable',uO,t&&t.owner_id||SES.userId)+'</div>'
        +'<div class="fr2">'+FLD('ti','Registro / prospecto','text',t&&t.titulo)+FSL('gr','Grupo',gO,t?taskGroup(t):'General')+'</div>'
        +FTA('dc','Notas / descripción libre',t&&stripDescFields(t.descripcion))
        +'<div class="fr2">'+FSL('pr','Prioridad',[['baja','Baja'],['media','Media'],['alta','Alta'],['critica','Crítica']],t&&t.prioridad||'media')+FSL('es','Estado',[['pendiente','Pendiente'],['en_proceso','En proceso'],['en_revision','En revisión'],['aprobada','Aprobada'],['terminada','Terminada']],t&&t.estado||'pendiente')+'</div>'
        +'<div class="fr3">'+FLD('fi','Inicio','date',t&&t.fecha_inicio||today())+FLD('fv','Vencimiento','date',t&&t.fecha_vencimiento||pd(7))+FLD('he','Horas estimadas','number',t&&t.horas_estimadas||'8')+'</div>'
        +(t?FLD('hr','Horas reales','number',t&&t.horas_reales||'0'):'');
    mOpen(t?'Editar tarea':'Nueva tarea',
      '<div class="fg">'
      +mainFields
      +traceH
      +pkH
      +(isPk?'':crmH)
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A._st(\''+( id||'')+'\')">Guardar tarea</button></div>'
      +'</div>');
    PK_NEW_FRONT='';
  },
  _st: async function(id){
    var ti = fv('ti'); if(!ti){toast('Título requerido','r');return;}
    var old = id ? xid(DB.tareas,id) : null;
    if(id && !canEditTask(old)){ toast('No tienes permisos para editar esta tarea','r'); return; }
    var selectedProject=xid(DB.proyectos,fv('pi'));
    var isPk=isProkicksProject(selectedProject);
    var collabs=isPk?Array.prototype.map.call(document.querySelectorAll('[data-pk-collab]:checked'),function(el){return el.value;}):[];
    var desc = buildDesc(fv('dc'),{grupo:isPk?'':fv('gr'),frente:isPk?fv('fr'):'',responsableInterno:isPk?fv('ri'):'',colaboradoresInternos:isPk?collabs.join(' | '):'',objetivo:fv('ob'),entregable:fv('en'),kpi:fv('kp'),meta:fv('mt'),cta:isPk?fv('ct'):'',email:fv('emx'),tel:fv('tel'),dir:fv('dir'),gancho:fv('ga'),instrumento:fv('ins'),accion:fv('sa'),seguimiento:fv('ps'),etapa:fv('ec'),probabilidad:fv('pb'),monto:fv('me')});
    var data = {proyecto_id:fv('pi'),owner_id:fv('oi'),titulo:ti,descripcion:desc,prioridad:fv('pr'),estado:fv('es'),fecha_inicio:fv('fi')||null,fecha_vencimiento:fv('fv')||null,horas_estimadas:Number(fv('he'))||0,horas_reales:Number(fv('hr'))||0};
    if(id && old && !adm()){
      data.proyecto_id = old.proyecto_id;
      data.owner_id = old.owner_id;
    }
    if(crmEnabled()){
      data.etapa_crm = fv('ec') || null;
      data.siguiente_accion = fv('sa') || null;
      data.fecha_proximo_seguimiento = fv('ps') || null;
      data.probabilidad = fv('pb') ? Number(fv('pb')) : null;
      data.monto_estimado = fv('me') ? Number(fv('me')) : null;
      data.ultima_actividad = new Date().toISOString();
    }
    var r = id ? await upd('tareas',id,data) : await ins('tareas',data);
    if(r){mClose();await refresh();toast(id?'Tarea actualizada':'Tarea creada ✓','g');}
  },
  qe: function(id){
    var t=xid(DB.tareas,id); if(!t) return;
    if(!canEditTask(t)){toast('No tienes permisos para actualizar este registro','r');return;}
    mOpen('Actualizar · '+t.titulo,
      '<div class="fg">'
      +FSL('es','Estado',[['pendiente','Pendiente'],['en_proceso','En proceso'],['en_revision','En revisión'],['aprobada','Aprobada'],['terminada','Terminada']],t.estado||'pendiente')
      +FLD('sa','Siguiente acción','text',nextAction(t)||'')
      +FLD('ps','Próximo seguimiento','date',followDate(t)||'')
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A._sqe(\''+id+'\')">Guardar actualización</button></div>'
      +'</div>');
  },
  _sqe: async function(id){
    var t=xid(DB.tareas,id); if(!t) return;
    if(!canEditTask(t)){toast('No tienes permisos para actualizar este registro','r');return;}
    var desc=buildDesc(t.descripcion,{grupo:taskGroup(t),email:descVal(t,'Email'),tel:descVal(t,'Telefono')||descVal(t,'Teléfono'),dir:descVal(t,'Direccion')||descVal(t,'Dirección'),gancho:descVal(t,'Gancho'),instrumento:descVal(t,'Instrumento'),accion:fv('sa'),seguimiento:fv('ps'),etapa:t.etapa_crm||descVal(t,'Etapa'),probabilidad:t.probabilidad||descVal(t,'Probabilidad'),monto:t.monto_estimado||descVal(t,'Monto estimado')});
    var data={estado:fv('es'),descripcion:desc};
    if(crmEnabled()){
      data.siguiente_accion=fv('sa')||null;
      data.fecha_proximo_seguimiento=fv('ps')||null;
      data.ultima_actividad=new Date().toISOString();
    }
    var r=await upd('tareas',id,data);
    if(r){mClose();await refresh();toast('Registro actualizado ✓','g');}
  },
  quickEdit: function(id){
    var t=xid(DB.tareas,id); if(!t)return;
    if(!canEditTask(t)){toast('No tienes permisos para editar esta tarea','r');return;}
    var uO=DB.usuarios.map(function(u){return [u.id,u.nombre];});
    mOpen('Edición rápida · '+t.titulo,
      '<div class="fg">'
      +'<div class="fr3">'+FSL('qe_es','Estado',[['pendiente','Pendiente'],['en_proceso','En proceso'],['en_revision','En revisión'],['aprobada','Aprobada'],['terminada','Terminada']],t.estado||'pendiente')+FSL('qe_pr','Prioridad',[['baja','Baja'],['media','Media'],['alta','Alta'],['critica','Crítica']],t.prioridad||'media')+FSL('qe_oi','Responsable',uO,t.owner_id)+'</div>'
      +'<div class="fr2">'+FLD('qe_fv','Fecha término','date',t.fecha_vencimiento||'')+FLD('qe_ps','Próximo seguimiento','date',followDate(t)||'')+'</div>'
      +FLD('qe_sa','Siguiente acción','text',nextAction(t)||'')
      +FTA('qe_note','Comentario ejecutivo / avance','')
      +'<div class="fa">'+(adm()?'<button class="btn btnd" onclick="A.dt(\''+id+'\')">Eliminar tarea</button>':'')+'<button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A.saveQuickEdit(\''+id+'\')">Guardar</button></div>'
      +'</div>',true);
  },
  saveQuickEdit: async function(id){
    var t=xid(DB.tareas,id); if(!t)return;
    if(!canEditTask(t)){toast('No tienes permisos para editar esta tarea','r');return;}
    var action=fv('qe_sa'), follow=fv('qe_ps');
    var data={estado:fv('qe_es'),prioridad:fv('qe_pr'),owner_id:fv('qe_oi'),fecha_vencimiento:fv('qe_fv')||null,descripcion:buildDesc(t.descripcion,{accion:action,seguimiento:follow})};
    if(crmEnabled()){data.siguiente_accion=action||null;data.fecha_proximo_seguimiento=follow||null;data.ultima_actividad=new Date().toISOString();}
    var diff=taskDiffText(t,data);
    var saved=await upd('tareas',id,data); if(!saved)return;
    if(diff) await logTaskActivity(id,'Edición rápida: '+diff);
    var note=fv('qe_note').trim();
    if(note) await ins('comentarios',{tarea_id:id,usuario_id:SES.userId,texto:note});
    mClose(); await refresh(); toast('Edición rápida guardada ✓','g');
  },
  controlEdit: function(id){
    var t=xid(DB.tareas,id); if(!t)return;
    if(!canEditTask(t)){toast('No tienes permisos para actualizar esta acción','r');return;}
    var uO=DB.usuarios.map(function(u){return[u.id,u.nombre];});
    var blocked=!!t.control_bloqueado,decision=!!t.control_decision_requerida;
    mOpen('Actualizar ejecución · '+t.titulo,
      '<div class="fg control-edit-form">'
      +'<div class="control-edit-intro"><strong>Actualización ejecutiva</strong><span>Estos cambios alimentan el tablero y el futuro portal del cliente.</span></div>'
      +'<div class="fr3">'+FSL('ce_es','Estado',[['pendiente','No iniciada'],['en_proceso','En curso'],['terminada','Completada']],t.estado==='en_revision'||t.estado==='aprobada'?'en_proceso':t.estado)+FSL('ce_oi','Responsable',uO,t.owner_id)+FLD('ce_fv','Fecha compromiso','date',t.fecha_vencimiento||'')+'</div>'
      +'<div class="fld"><label>Avance <strong id="ce-progress-value">'+controlProgress(t)+'%</strong></label><input type="range" min="0" max="100" step="5" id="f_ce_av" value="'+controlProgress(t)+'" oninput="document.getElementById(\'ce-progress-value\').textContent=this.value+\'%\'"></div>'
      +'<label class="control-check"><input type="checkbox" id="f_ce_bl" '+(blocked?'checked':'')+' onchange="document.getElementById(\'ce-blocker-wrap\').hidden=!this.checked"><span><strong>Existe un bloqueo</strong><small>Hazlo visible para poder resolverlo.</small></span></label>'
      +'<div id="ce-blocker-wrap" '+(blocked?'':'hidden')+'>'+FTA('ce_br','Descripción del bloqueo',t.control_bloqueo_resumen||'')+'</div>'
      +'<label class="control-check"><input type="checkbox" id="f_ce_dr" '+(decision?'checked':'')+' onchange="document.getElementById(\'ce-decision-wrap\').hidden=!this.checked"><span><strong>Se requiere una decisión</strong><small>Indica exactamente qué debe aprobarse o definirse.</small></span></label>'
      +'<div id="ce-decision-wrap" '+(decision?'':'hidden')+'><div class="fr2">'+FLD('ce_ds','Decisión requerida','text',t.control_decision_resumen||'')+FLD('ce_df','Fecha límite','date',t.control_fecha_decision||'')+'</div></div>'
      +'<label class="control-check"><input type="checkbox" id="f_ce_vc" '+(t.control_visible_cliente===false?'':'checked')+'><span><strong>Visible para el cliente</strong><small>Preparado para el portal del proyecto.</small></span></label>'
      +FTA('ce_note','Comentario de avance','')
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A.saveControlEdit(\''+id+'\')">Guardar actualización</button></div></div>',true);
  },
  saveControlEdit: async function(id){
    var t=xid(DB.tareas,id); if(!t)return;
    var blocked=document.getElementById('f_ce_bl').checked;
    var decision=document.getElementById('f_ce_dr').checked;
    var data={estado:fv('ce_es'),owner_id:fv('ce_oi'),fecha_vencimiento:fv('ce_fv')||null,control_avance:Number(fv('ce_av'))||0,control_bloqueado:blocked,control_bloqueo_resumen:blocked?(fv('ce_br').trim()||null):null,control_decision_requerida:decision,control_decision_resumen:decision?(fv('ce_ds').trim()||null):null,control_fecha_decision:decision?(fv('ce_df')||null):null,control_visible_cliente:document.getElementById('f_ce_vc').checked};
    if(data.estado==='terminada') data.control_avance=100;
    if(data.control_avance>0&&data.estado==='pendiente') data.estado='en_proceso';
    if(crmEnabled())data.ultima_actividad=new Date().toISOString();
    var saved=await upd('tareas',id,data);if(!saved)return;
    var note=fv('ce_note').trim();
    if(note)await ins('comentarios',{tarea_id:id,usuario_id:SES.userId,texto:'Centro de Control · '+note});
    await logTaskActivity(id,'Centro de Control: avance '+data.control_avance+'%'+(blocked?' · bloqueo activo':'')+(decision?' · decisión requerida':''));
    mClose();await refresh();toast('Ejecución actualizada ✓','g');
  },
  manageTask: function(id){
    var t=xid(DB.tareas,id); if(!t)return;
    var p=taskProject(t), comments=DB.comentarios.filter(function(c){return c.tarea_id===id;}).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));});
    var contactFields=[
      ['Responsable',descVal(t,'Responsable contacto')],['Cargo',descVal(t,'Cargo')||descVal(t,'Cargo institucional')],
      ['Email',descVal(t,'Email')],['Teléfono',descVal(t,'Telefono')||descVal(t,'Teléfono')],
      ['Correos de respaldo',descVal(t,'Correos de respaldo')||descVal(t,'Correo de respaldo')||descVal(t,'Correo de respaldo Embajada')],
      ['Correo institucional',descVal(t,'Correo institucional')],['Correo OFUNAM',descVal(t,'Correo OFUNAM en copia')],
      ['Uso recomendado',descVal(t,'Uso recomendado')]
    ].filter(function(x){return x[1];});
    var contacts=contactFields.length?'<div class="crmgrid">'+contactFields.map(function(x){return '<div class="crmcell"><div class="dl">'+esc(x[0])+'</div><div class="dv">'+esc(x[1])+'</div></div>';}).join('')+'</div>':'<div class="hbar">Sin datos de contacto adicionales.</div>';
    var timeline=comments.length?comments.map(function(c){return '<div class="pkw-log-item"><div class="pkw-log-meta">'+fmtdt(c.created_at)+' · '+esc(uNm(c.usuario_id))+'</div>'+esc(c.texto)+'</div>';}).join(''):'<div class="hbar">Todavía no hay actividades registradas.</div>';
    var owner=isProkicksProject(p)?pkInternalOwner(t):uNm(t.owner_id);
    mOpen('Gestionar · '+t.titulo,
      '<div class="fg">'
      +'<div class="hbar" style="justify-content:space-between;flex-wrap:wrap"><span>'+bSt(t.estado)+' '+sem(t)+'</span><span>'+esc(pNm(t.proyecto_id))+' · '+esc(owner)+'</span></div>'
      +'<div class="fr2">'+FSL('mg_es','Estado',[['pendiente','Pendiente'],['en_proceso','En proceso'],['en_revision','En revisión'],['aprobada','Aprobada'],['terminada','Terminada']],t.estado||'pendiente')+FLD('mg_ps','Próximo seguimiento','date',followDate(t)||'')+'</div>'
      +'<div class="fr2">'+FLD('mg_fi','Fecha de inicio','date',t.fecha_inicio||'')+FLD('mg_fv','Fecha de término','date',t.fecha_vencimiento||'')+'</div>'
      +FLD('mg_sa','Siguiente acción','text',nextAction(t)||'')
      +'<div style="border-top:1px solid var(--line);padding-top:14px"><h3 style="margin-bottom:10px">Contacto</h3>'+contacts+'</div>'
      +'<div style="border-top:1px solid var(--line);padding-top:14px"><h3 style="margin-bottom:10px">Registrar actividad</h3>'+FTA('mg_note','Comentario / avance','')+'</div>'
      +'<div style="border-top:1px solid var(--line);padding-top:14px"><h3 style="margin-bottom:10px">Historial ('+comments.length+')</h3><div class="pkw-log">'+timeline+'</div></div>'
      +'<div class="fa">'+(adm()?'<button class="btn btnd" onclick="A.dt(\''+id+'\')">Eliminar tarea</button>':'')+'<button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A.saveManagedTask(\''+id+'\')">Guardar actualización</button></div>'
      +'</div>',true);
  },
  saveManagedTask: async function(id){
    var t=xid(DB.tareas,id); if(!t)return;
    var action=fv('mg_sa'), follow=fv('mg_ps'), note=fv('mg_note').trim();
    var description=buildDesc(t.descripcion,{accion:action,seguimiento:follow});
    var data={estado:fv('mg_es'),fecha_inicio:fv('mg_fi')||null,fecha_vencimiento:fv('mg_fv')||null,descripcion:description};
    if(crmEnabled()){data.siguiente_accion=action||null;data.fecha_proximo_seguimiento=follow||null;data.ultima_actividad=new Date().toISOString();}
    var diff=taskDiffText(t,data);
    var saved=await upd('tareas',id,data); if(!saved)return;
    if(diff) await logTaskActivity(id,'Gestión actualizada: '+diff);
    if(note){
      var comment=await ins('comentarios',{tarea_id:id,usuario_id:SES.userId,texto:note});
      if(!comment)return;
    }
    mClose();await refresh();toast('Tarea actualizada ✓','g');
  },
  td: function(id){
    var t = xid(DB.tareas,id); if(!t) return;
    var subs = DB.subtareas.filter(function(s){return s.tarea_id===id;});
    var coms = DB.comentarios.filter(function(c){return c.tarea_id===id;});
    var fils = DB.entregables.filter(function(f){return f.tarea_id===id;});
    var stBtns = ['pendiente','en_proceso','en_revision','aprobada','terminada'].map(function(s){
      var ic = {pendiente:'📋',en_proceso:'⚙️',en_revision:'🔍',aprobada:'✅',terminada:'🏁'};
      return '<button class="btn btns '+(t.estado===s?'btnc':'btng')+'" onclick="A.ss(\''+id+'\',\''+s+'\');mClose()">'+ic[s]+' '+s.replace('_',' ')+'</button>';
    }).join('');
    var subH = subs.map(function(s){
      return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;gap:10px;align-items:center"><div style="display:flex;gap:9px;align-items:flex-start"><input class="pkw-check" type="checkbox" '+(s.estado==='terminada'?'checked':'')+' onchange="A.pkToggleSub(\''+s.id+'\')"><div><strong>'+esc(s.titulo)+'</strong><div style="color:var(--muted);font-size:12px;margin-top:3px">'+esc(uNm(s.owner_id))+' · Término: '+fmt(s.fecha_vencimiento)+'</div></div></div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">'+bSt(s.estado)+'<button class="btn btns btng" onclick="A.esub(\''+s.id+'\')">Editar fecha/estado</button></div></div>';
    }).join('') || '<div style="color:var(--muted);font-size:13px">Sin subtareas</div>';
    var comH = coms.map(function(c){
      return '<div style="padding:9px;background:var(--surface2);border-radius:var(--rs);margin-bottom:7px;border:1px solid var(--line)"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><strong style="font-size:13px">'+esc(uNm(c.usuario_id))+'</strong><span style="font-size:11px;color:var(--muted)">'+fmtdt(c.created_at)+'</span></div><p style="font-size:13px;margin:0">'+esc(c.texto)+'</p></div>';
    }).join('') || '<div style="color:var(--muted);font-size:13px">Sin comentarios</div>';
    var filH = fils.map(function(f){
      return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px;align-items:center"><div><strong>'+esc(f.nombre)+'</strong><span style="color:var(--muted);margin-left:7px">v'+esc(f.version)+'</span></div><a href="'+esc(f.url)+'" target="_blank" class="btn btns btng">🔗 Abrir</a></div>';
    }).join('') || '<div style="color:var(--muted);font-size:13px">Sin entregables</div>';
    var ef = t.horas_estimadas ? Math.round(t.horas_reales/t.horas_estimadas*100) : 0;
    var pkTask=isProkicksProject(taskProject(t)), pkPg=pkTask?pkTaskProgress(t):null;
    var pkDetail=pkTask?'<div class="card" style="margin:0;padding:14px"><div class="ch"><h3>Control ProKicks</h3><button class="btn btns btnc" onclick="mClose();A.pkAdvance(\''+id+'\')">Registrar avance</button></div><div class="crmgrid">'
      +'<div class="crmcell"><div class="dl">Frente</div><div class="dv">'+esc(pkTaskFront(t))+'</div></div>'
      +'<div class="crmcell"><div class="dl">Responsable interno</div><div class="dv">'+esc(pkInternalOwner(t))+'</div></div>'
      +'<div class="crmcell"><div class="dl">Colaboradores</div><div class="dv">'+esc(pkCollaborators(t).join(', ')||'—')+'</div></div>'
      +'<div class="crmcell"><div class="dl">Avance</div><div class="dv">'+pkPg.pct+'% · '+pkPg.done+'/'+pkPg.subs.length+'</div><div class="pb" style="height:7px;margin-top:7px"><div class="pf" style="width:'+pkPg.pct+'%"></div></div></div>'
      +'<div class="crmcell"><div class="dl">Objetivo</div><div class="dv">'+esc(descVal(t,'Objetivo')||'Por definir')+'</div></div>'
      +'<div class="crmcell"><div class="dl">Entregable</div><div class="dv">'+esc(descVal(t,'Entregable')||'Por definir')+'</div></div>'
      +'<div class="crmcell"><div class="dl">KPI / Meta</div><div class="dv">'+esc(descVal(t,'KPI')||'—')+' · '+esc(descVal(t,'Meta')||'—')+'</div></div>'
      +'<div class="crmcell"><div class="dl">CTA</div><div class="dv">'+esc(descVal(t,'CTA')||'—')+'</div></div>'
      +'</div></div>':'';
    var editActions = canEditTask(t) ? '<button class="btn btns btnc" onclick="mClose();A._tm(\''+id+'\')">Editar información</button>'+(adm()?'<button class="btn btns btnd" onclick="A.dt(\''+id+'\')">Eliminar</button>':'') : '';
    var quickActions = '<div class="task-actions-sticky"><div class="task-actions-title">Acciones de esta ficha</div><div class="task-actions-row">'
      +editActions
      +'<button class="btn btns btng" onclick="A.ncom(\''+id+'\')">Comentar avance</button>'
      +'<button class="btn btns btng" onclick="A.nfil(\''+id+'\')">Agregar entregable</button>'
      +'<button class="btn btns btng" onclick="addTaskToCalendar(\''+id+'\')">'+iconHtml('calendar-plus')+' Agregar al calendario</button>'
      +'<button class="btn btns btng" onclick="mClose();A.openProject(\''+t.proyecto_id+'\',\'reporte\')">Ver reporte</button>'
      +'<button class="btn btns btng" onclick="mClose();A.openProject(\''+t.proyecto_id+'\',\'tareas\')">Volver a tareas</button>'
      +'</div></div>';
    var pkAccess = /prokicks/i.test(pNm(t.proyecto_id)+' '+t.titulo) ? '<div class="hbar" style="justify-content:space-between;gap:12px;flex-wrap:wrap"><span><span class="dot dg"></span>Operación ProKicks centralizada</span><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btns btnc" onclick="openProkicks(\'dashboard\')">Dashboard inventario</button><button class="btn btns btng" onclick="openProkicks(\'prospecto\')">Prospectos</button><button class="btn btns btng" onclick="openProkicks(\'venta\')">Ventas</button><button class="btn btns btng" onclick="openProkicks(\'comodato\')">Comodatos</button><button class="btn btns btng" onclick="openProkicks(\'cobranza\')">Cobranza</button></div></div>' : '';
    mOpen('✓ '+t.titulo,
      '<div style="display:grid;gap:15px">'
      +'<div style="display:flex;gap:7px;flex-wrap:wrap">'+bPr(t.prioridad)+' '+bSt(t.estado)+' '+sem(t)+'</div>'
      +quickActions
      +taskAlertsHtml(t)
      +pkDetail
      +'<div class="dg3"><div class="di"><div class="dl">Proyecto</div><div class="dv">'+esc(pNm(t.proyecto_id))+'</div></div><div class="di"><div class="dl">Responsable</div><div class="dv">'+esc(uNm(t.owner_id))+'</div></div><div class="di"><div class="dl">Inicio</div><div class="dv">'+fmt(t.fecha_inicio)+'</div></div><div class="di"><div class="dl">Término</div><div class="dv">'+fmt(t.fecha_vencimiento)+'</div></div><div class="di"><div class="dl">Horas Est.</div><div class="dv">'+t.horas_estimadas+'h</div></div><div class="di"><div class="dl">Horas Reales</div><div class="dv">'+t.horas_reales+'h</div></div><div class="di"><div class="dl">Eficiencia</div><div class="dv">'+ef+'%</div></div></div>'
      +'<p style="color:var(--muted);font-size:14px;margin:0;white-space:pre-line">'+esc(stripDescFields(t.descripcion)||'Sin descripción.')+'</p>'
      +pkAccess
      +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+stBtns+'</div>'
      +crmPanel(t)
      +'<div style="border-top:1px solid var(--line);padding-top:12px"><div style="display:flex;justify-content:space-between;margin-bottom:9px"><strong>Microtareas ('+subs.length+')</strong><button class="btn btns" onclick="A.nsub(\''+id+'\')">+ Microtarea</button></div>'+subH+'</div>'
      +'<div style="border-top:1px solid var(--line);padding-top:12px"><div style="display:flex;justify-content:space-between;margin-bottom:9px"><strong>Comentarios ('+coms.length+')</strong><button class="btn btns btng" onclick="A.ncom(\''+id+'\')">💬 Comentar</button></div>'+comH+'</div>'
      +'<div style="border-top:1px solid var(--line);padding-top:12px"><div style="display:flex;justify-content:space-between;margin-bottom:9px"><strong>Entregables ('+fils.length+')</strong><button class="btn btns btng" onclick="A.nfil(\''+id+'\')">📎 Agregar</button></div>'+filH+'</div>'
      +'</div>',true);
  },
  ss: async function(id,st){
    var t=xid(DB.tareas,id);
    var data = {estado:st};
    if(crmEnabled()) data.ultima_actividad = new Date().toISOString();
    await upd('tareas',id,data);
    if(t && t.estado!==st) await logTaskActivity(id,'Cambio de estado: '+String(t.estado||'—').replace('_',' ')+' → '+String(st||'—').replace('_',' '));
    await refresh(); toast('Estado actualizado ✓','g');
  },
  dt: async function(id){
    if(!adm()){toast('Solo administrador puede eliminar tareas','r');return;}
    if(!confirm('¿Eliminar definitivamente esta tarea? Se eliminarán también comentarios, microtareas y entregables. Esta acción no se puede deshacer.')) return;
    await sb.from('comentarios').delete().eq('tarea_id',id);
    await sb.from('subtareas').delete().eq('tarea_id',id);
    await sb.from('entregables').delete().eq('tarea_id',id);
    await del('tareas',id); mClose(); await refresh(); toast('Tarea eliminada','g');
  },

  /* SUBTAREA */
  nsub: function(tid){
    mClose();
    var uO = DB.usuarios.map(function(u){return [u.id,u.nombre];});
    mOpen('Nueva microtarea',
      '<div class="fg">'
      +FLD('ti','Título')
      +'<div class="fr2">'+FSL('oi','Responsable',uO,SES.userId)+FSL('es','Estado',[['pendiente','Pendiente'],['en_proceso','En proceso'],['terminada','Terminada']],'pendiente')+'</div>'
      +FLD('fv','Fecha término','date',pd(5))
      +'<div class="fa"><button class="btn btng" onclick="mClose();A.td(\''+tid+'\')">Cancelar</button><button class="btn btnc" onclick="A._ssub(\''+tid+'\')">Guardar</button></div>'
      +'</div>');
  },
  _ssub: async function(tid){
    var ti = fv('ti'); if(!ti){toast('Título requerido','r');return;}
    var r = await ins('subtareas',{tarea_id:tid,owner_id:fv('oi'),titulo:ti,estado:fv('es'),fecha_vencimiento:fv('fv')||null});
    if(r){ if(crmEnabled()) await upd('tareas',tid,{ultima_actividad:new Date().toISOString()}); await loadAll();mClose();A.td(tid);toast('Microtarea creada ✓','g');}
  },
  esub: function(id){
    var s=xid(DB.subtareas,id); if(!s) return;
    var t=xid(DB.tareas,s.tarea_id);
    if(t && !canEditTask(t)){ toast('No tienes permisos para editar esta subtarea','r'); return; }
    var uO = DB.usuarios.map(function(u){return [u.id,u.nombre];});
    mOpen('Editar microtarea',
      '<div class="fg">'
      +FLD('ti','Título', 'text', s.titulo)
      +'<div class="fr2">'+FSL('oi','Responsable',uO,s.owner_id)+FSL('es','Estado',[['pendiente','Pendiente'],['en_proceso','En proceso'],['terminada','Terminada']],s.estado)+'</div>'
      +FLD('fv','Fecha término','date',s.fecha_vencimiento)
      +'<div class="fa"><button class="btn btng" onclick="mClose();'+(t?'A.td(\''+t.id+'\')':'render()')+'">Cancelar</button><button class="btn btnc" onclick="A._usub(\''+id+'\')">Guardar</button></div>'
      +'</div>');
  },
  _usub: async function(id){
    var s=xid(DB.subtareas,id); if(!s) return;
    var t=xid(DB.tareas,s.tarea_id);
    if(t && !canEditTask(t)){ toast('No tienes permisos para editar esta subtarea','r'); return; }
    var ti=fv('ti'); if(!ti){toast('Título requerido','r');return;}
    var r=await upd('subtareas',id,{titulo:ti,owner_id:fv('oi'),estado:fv('es'),fecha_vencimiento:fv('fv')||null});
    if(r){
      if(t && crmEnabled()) await upd('tareas',t.id,{ultima_actividad:new Date().toISOString()});
      await loadAll(); mClose();
      if(t) A.td(t.id); else render();
      toast('Microtarea actualizada ✓','g');
    }
  },

  /* COMENTARIO */
  ncom: function(tid){
    mClose();
    mOpen('Nuevo comentario',
      '<div class="fg">'+FTA('tx','Comentario')
      +'<div class="fa"><button class="btn btng" onclick="mClose();A.td(\''+tid+'\')">Cancelar</button><button class="btn btnc" onclick="A._scom(\''+tid+'\')">Guardar</button></div></div>');
  },
  _scom: async function(tid){
    var tx = fv('tx'); if(!tx){toast('Escribe algo','r');return;}
    var r = await ins('comentarios',{tarea_id:tid,usuario_id:SES.userId,texto:tx});
    if(r){ if(crmEnabled()) await upd('tareas',tid,{ultima_actividad:new Date().toISOString()}); await loadAll();mClose();A.td(tid);toast('Comentario agregado ✓','g');}
  },

  /* ENTREGABLE */
  nfil: function(tid){
    mClose();
    mOpen('Agregar entregable',
      '<div class="fg">'
      +'<div class="fr2">'+FLD('nm','Nombre del archivo')+FLD('ti','Tipo (Plano, PDF…)')+'</div>'
      +FLD('ur','URL o Link Google Drive')
      +FLD('ve','Versión','text','1.0')
      +'<div class="fa"><button class="btn btng" onclick="mClose();A.td(\''+tid+'\')">Cancelar</button><button class="btn btnc" onclick="A._sfil(\''+tid+'\')">Guardar</button></div>'
      +'</div>');
  },
  _sfil: async function(tid){
    var nm = fv('nm'), ur = fv('ur');
    if(!nm||!ur){toast('Nombre y URL requeridos','r');return;}
    var r = await ins('entregables',{tarea_id:tid,usuario_id:SES.userId,nombre:nm,url:ur,tipo:fv('ti'),version:fv('ve')||'1'});
    if(r){ if(crmEnabled()) await upd('tareas',tid,{ultima_actividad:new Date().toISOString()}); await loadAll();mClose();A.td(tid);toast('Entregable guardado ✓','g');}
  },

  /* PROKICKS */
  pkInitPlan: async function(){
    var p=pkProject();
    if(!p||!canUseProkicks()){toast('Sin permiso para preparar el plan ProKicks','r');return;}
    if(PK_INIT_BUSY){toast('El plan se está preparando…');return;}
    PK_INIT_BUSY=true;
    var created=0, added=0;
    for(var i=0;i<PROKICKS_PLAN.length;i++){
      var def=PROKICKS_PLAN[i];
      var parent=DB.tareas.find(function(t){return t.proyecto_id===p.id&&String(t.titulo||'').trim().toLowerCase()===def.title.toLowerCase();});
      if(!parent){
        var desc=buildDesc('Plan de trabajo operativo ProKicks.',{frente:def.front,objetivo:'Definir, ejecutar y documentar resultados',entregable:'Resultado documentado y aprobado',accion:'Asignar responsable interno y calendarizar microtareas',kpi:'Avance',meta:'100'});
        var data={proyecto_id:p.id,owner_id:SES.userId,titulo:def.title,descripcion:desc,prioridad:'alta',estado:'pendiente',fecha_inicio:today(),fecha_vencimiento:pd(30),horas_estimadas:8,horas_reales:0};
        if(crmEnabled()){data.etapa_crm='por_contactar';data.siguiente_accion='Asignar responsable interno y calendarizar microtareas';data.fecha_proximo_seguimiento=pd(7);data.ultima_actividad=new Date().toISOString();}
        parent=await ins('tareas',data);
        if(!parent) continue;
        created++;
      }
      var known=DB.subtareas.filter(function(s){return s.tarea_id===parent.id;}).map(function(s){return String(s.titulo||'').trim().toLowerCase();});
      for(var j=0;j<def.subtasks.length;j++){
        if(known.indexOf(def.subtasks[j].toLowerCase())>=0) continue;
        var sub=await ins('subtareas',{tarea_id:parent.id,owner_id:SES.userId,titulo:def.subtasks[j],estado:'pendiente',fecha_vencimiento:parent.fecha_vencimiento||pd(30)});
        if(sub) added++;
      }
    }
    await refresh();
    PKWORKTAB='todos';
    PK_INIT_BUSY=false;
    toast('Plan ProKicks listo: '+created+' tareas y '+added+' microtareas creadas ✓','g');
  },
  pkToggleSub: async function(id){
    var s=xid(DB.subtareas,id); if(!s)return;
    var t=xid(DB.tareas,s.tarea_id); if(!t||!canEditTask(t)){toast('No tienes permisos para actualizar esta microtarea','r');return;}
    var next=s.estado==='terminada'?'pendiente':'terminada';
    var saved=await upd('subtareas',id,{estado:next}); if(!saved)return;
    var siblings=DB.subtareas.filter(function(x){return x.tarea_id===t.id;}).map(function(x){return x.id===id?Object.assign({},x,{estado:next}):x;});
    var done=siblings.filter(function(x){return x.estado==='terminada';}).length;
    var parentState=siblings.length&&done===siblings.length?'terminada':done>0?'en_proceso':(t.estado==='terminada'?'pendiente':t.estado);
    var up={estado:parentState}; if(crmEnabled())up.ultima_actividad=new Date().toISOString();
    await upd('tareas',t.id,up); await refresh();
    toast(next==='terminada'?'Microtarea completada ✓':'Microtarea reabierta','g');
  },
  pkAdvance: function(id){
    var t=xid(DB.tareas,id); if(!t||!canEditTask(t)){toast('No tienes permisos para registrar avances','r');return;}
    var pg=pkTaskProgress(t);
    mOpen('Registrar avance · '+t.titulo,
      '<div class="fg"><div class="hbar"><span class="dot dg"></span>Avance actual: <strong>'+pg.pct+'%</strong> · '+pg.done+' de '+pg.subs.length+' microtareas</div>'
      +FSL('ar','Avance reportado por',[['Pako','Pako']].concat(PROKICKS_INTERNAL_PEOPLE.filter(function(n){return n!=='Pako';}).map(function(n){return[n,n];})),pkInternalOwner(t)==='Por asignar'?'Pako':pkInternalOwner(t))
      +FTA('av','Comentario de avance','')
      +'<div class="fr2">'+FSL('es','Estado',[['pendiente','Pendiente'],['en_proceso','En proceso'],['en_revision','En revisión'],['aprobada','Aprobada'],['terminada','Terminada']],t.estado||'pendiente')+FLD('ps','Próximo seguimiento','date',followDate(t)||pd(7))+'</div>'
      +FLD('sa','Siguiente acción','text',nextAction(t)||'')
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A.pkSaveAdvance(\''+id+'\')">Guardar avance</button></div></div>');
  },
  pkSaveAdvance: async function(id){
    var t=xid(DB.tareas,id); if(!t||!canEditTask(t))return;
    var note=fv('av').trim(), reporter=fv('ar')||'Pako';
    if(!note){toast('Escribe el avance realizado','r');return;}
    var comment=await ins('comentarios',{tarea_id:id,usuario_id:SES.userId,texto:'Avance reportado por '+reporter+': '+note});
    if(!comment)return;
    var data={estado:fv('es'),descripcion:buildDesc(t.descripcion,{accion:fv('sa'),seguimiento:fv('ps')})};
    if(crmEnabled()){data.siguiente_accion=fv('sa')||null;data.fecha_proximo_seguimiento=fv('ps')||null;data.ultima_actividad=new Date().toISOString();}
    await upd('tareas',id,data);mClose();await refresh();toast('Avance registrado ✓','g');
  },
  pkNew: function(){ A.pkForm(null, PKTAB); },
  pkNewFlorida: function(){
    A.pkForm(null,'prospecto',{mercado:'Florida',rep:'Darío Sala',fuente:'Lista indoor Florida',visitado:'Pendiente',etapa:'por_contactar',siguiente_accion:'Calificar con Darío'});
  },
  pkFloridaApply: function(){
    PK_FLORIDA_FILTERS={region:fv('pkf_region'),tipo:fv('pkf_tipo'),etapa:fv('pkf_etapa'),busqueda:fv('pkf_q').trim()}; render();
  },
  pkFloridaClear: function(){ PK_FLORIDA_FILTERS={region:'',tipo:'',etapa:'',busqueda:''}; render(); },
  pkFloridaEdit: function(id){
    var row=DB.prokicks_records.find(function(x){return x.id===id;}); if(!row)return;
    var d=row.data||{};
    mOpen('Gestionar prospecto Florida','<div class="fg pkf-manage">'
      +'<div class="control-edit-intro"><strong>'+esc(d.cliente||'Prospecto')+'</strong><span>'+esc(d.region||'Florida')+' · '+esc(d.tipo_instalacion||'Instalación deportiva')+' · Responsable: Darío Sala</span></div>'
      +'<div class="fr2">'+FSL('pkf_es','Etapa',[['por_contactar','Por contactar'],['contactado','Contactado'],['demo_agendada','Visita / demo'],['propuesta_enviada','Propuesta'],['negociacion','Negociación'],['cerrado','Ganado'],['perdido','Descartado']],d.etapa||'por_contactar')+FSL('pkf_vi','Visitado',[['Pendiente','Pendiente'],['Sí','Sí'],['No','No']],d.visitado||'Pendiente')+'</div>'
      +'<div class="fr2">'+FLD('pkf_po','Potencial 1–10','number',d.potencial||'')+FLD('pkf_ps','Próximo seguimiento','date',d.proximo_seguimiento||'')+'</div>'
      +FLD('pkf_sa','Siguiente acción','text',d.siguiente_accion||'Calificar con Darío')
      +'<div class="fr2">'+FLD('pkf_ct','Contacto','text',d.contacto||'')+FLD('pkf_cg','Cargo','text',d.cargo||'')+'</div>'
      +'<div class="fr2">'+FLD('pkf_em','Email','email',d.email||'')+FLD('pkf_te','Teléfono','text',d.telefono||'')+'</div>'
      +FTA('pkf_no','Notas de seguimiento',d.notas||'')
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A.pkFloridaSave(\''+id+'\')">Guardar avance</button></div></div>',true);
  },
  pkFloridaSave: async function(id){
    var row=DB.prokicks_records.find(function(x){return x.id===id;}); if(!row)return;
    var potential=fv('pkf_po');
    if(potential!==''&&(Number(potential)<1||Number(potential)>10)){toast('El potencial debe estar entre 1 y 10','r');return;}
    var data=Object.assign({},row.data||{}, {etapa:fv('pkf_es'),visitado:fv('pkf_vi'),potencial:potential===''?'':Number(potential),proximo_seguimiento:fv('pkf_ps'),siguiente_accion:fv('pkf_sa'),contacto:fv('pkf_ct'),cargo:fv('pkf_cg'),email:fv('pkf_em'),telefono:fv('pkf_te'),notas:fv('pkf_no'),ultima_actividad:new Date().toISOString()});
    var saved=await upd('prokicks_records',id,{data:data,updated_at:new Date().toISOString()});
    if(saved){mClose();await refresh();toast('Prospecto actualizado ✓','g');nav('florida');}
  },
  pkSettings: function(){
    if(!canUseProkicks()){ toast('Sin permiso para ProKicks','r'); return; }
    var st=pkSetting(), ventas=pkRows('venta'), comodatos=pkRows('comodato');
    var vendidos=ventas.reduce(function(s,r){return s+Number(pkVal(r,'devices')||0);},0);
    var comodato=comodatos.reduce(function(s,r){return s+Number(pkVal(r,'devices')||0);},0);
    var total=pkNum(st.totalProducidos,300);
    var invAuto=Math.max(total-vendidos-comodato,0);
    mOpen('Editar inventario ProKicks',
      '<div class="fg">'
      +'<div class="fr2">'+FLD('tp','Total producción','number',total)+FLD('ir','Inventario actual','number',st.inventarioRedwood===undefined||st.inventarioRedwood===null?'':st.inventarioRedwood)+'</div>'
      +'<div class="hbar"><span class="dot dg"></span>Vendidos: '+vendidos+' · En comodato: '+comodato+' · Inventario teórico: '+invAuto+'</div>'
      +FTA('nt','Notas internas',st.notas||'')
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A.pkSaveSettings()">Guardar inventario</button></div>'
      +'</div>');
  },
  pkSaveSettings: async function(){
    if(!canUseProkicks()){ toast('Sin permiso para ProKicks','r'); return; }
    var p=pkProject(); if(!p){ toast('No existe proyecto ProKicks','r'); return; }
    var total=Number(fv('tp')||0), inv=fv('ir');
    if(total<0 || (inv!=='' && Number(inv)<0)){ toast('Los números no pueden ser negativos','r'); return; }
    var current=pkSetting();
    var data=Object.assign({},current,{totalProducidos:total,inventarioRedwood:inv===''?null:Number(inv),notas:fv('nt')||'',actualizadoEn:new Date().toISOString(),actualizadoPor:SES.userId});
    var r=await sb.from('prokicks_settings').upsert({proyecto_id:p.id,owner_id:SES.userId,data:data,updated_at:new Date().toISOString()},{onConflict:'proyecto_id'}).select().single();
    if(r.error){ toast('Error al guardar inventario: '+r.error.message,'r'); return; }
    mClose(); await refresh(); toast('Inventario actualizado ✓','g');
  },
  pkEdit: function(id){ var r=DB.prokicks_records.find(function(x){return x.id===id;}); if(r) A.pkForm(r, r.tipo); },
  pkForm: function(row,tipo,defaults){
    if(!canUseProkicks()){ toast('Sin permiso para ProKicks','r'); return; }
    var schema = PKSCHEMAS[tipo]; if(!schema){ toast('Tipo no disponible','r'); return; }
    var data = Object.assign({},defaults||{},row ? (row.data||{}) : {});
    var fields = schema.map(function(f){
      var key=f[0], lbl=f[1], typ=f[2]||'text', req=f[3]?' required':'', val=data[key]||'', opts=f[4]||[];
      if(typ==='textarea') return '<div class="fld"><label>'+esc(lbl)+'</label><textarea id="f_'+key+'"'+req+'>'+esc(val)+'</textarea></div>';
      if(typ==='select') return FSL(key,lbl,opts.map(function(o){return [o,o];}),val);
      return FLD(key,lbl,typ,val);
    }).join('');
    var title = (row?'Editar ':'Nuevo ')+((PKTABS.find(function(t){return t[0]===tipo;})||[])[1]||tipo);
    var deleteBtn = row ? '<button class="btn btnd" onclick="mClose();A.pkDel(\''+row.id+'\')">Eliminar</button>' : '';
    mOpen(title,'<div class="fg">'+fields+'<div class="fa">'+deleteBtn+'<button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A.pkSave(\''+(row?row.id:'')+'\',\''+tipo+'\')">Guardar</button></div></div>',true);
  },
  pkSave: async function(id,tipo){
    var schema = PKSCHEMAS[tipo]; if(!schema) return;
    var p = pkProject(); if(!p){ toast('No existe proyecto ProKicks','r'); return; }
    var data = {};
    for(var i=0;i<schema.length;i++){
      var f=schema[i], key=f[0], typ=f[2]||'text';
      if(f[3] && !fv(key)){ toast(f[1]+' requerido','r'); return; }
      data[key] = typ==='number' ? Number(fv(key)||0) : fv(key);
    }
    var payload = {proyecto_id:p.id, owner_id:SES.userId, tipo:tipo, data:data, updated_at:new Date().toISOString()};
    var r = id ? await upd('prokicks_records',id,payload) : await ins('prokicks_records',payload);
    if(r){
      mClose(); await refresh();
      var toFlorida = tipo==='prospecto' && data.mercado==='Florida';
      PKTAB = toFlorida ? 'prospecto' : tipo;
      toast(id?'Registro actualizado':'Registro creado ✓','g');
      if(toFlorida) nav('florida');
    }
  },
  pkDel: async function(id){
    if(!confirm('¿Eliminar este registro de ProKicks?')) return;
    var ok = await del('prokicks_records',id);
    if(ok){ await refresh(); toast('Registro eliminado','g'); }
  },

  /* CLIENTE */
  nc: function(){ A._cm(null); },
  ec: function(id){ A._cm(id); },
  _cm: function(id){
    var c = id ? xid(DB.clientes,id) : null;
    mOpen(c?'Editar cliente':'Nuevo cliente',
      '<div class="fg">'
      +'<div class="fr2">'+FLD('nm','Nombre de la empresa','text',c&&c.nombre)+FLD('ct','Persona de contacto','text',c&&c.contacto)+'</div>'
      +'<div class="fr2">'+FLD('em','Email','email',c&&c.email)+FLD('te','Teléfono','text',c&&c.telefono)+'</div>'
      +FLD('dr','Link Google Drive (contratos / cotizaciones)','url',c&&c.drive_url)
      +'<div class="fr3">'+FLD('dp','Día de pago','number',c&&c.dia_pago||'15')+FLD('df','Día de facturación','number',c&&c.dia_factura||'10')+FSL('es','Estado',[['activo','Activo'],['inactivo','Inactivo']],c&&c.estado||'activo')+'</div>'
      +FTA('nt','Notas',c&&c.notas)
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A._sc(\''+( id||'')+'\')">Guardar</button></div>'
      +'</div>');
  },
  _sc: async function(id){
    var nm = fv('nm'); if(!nm){toast('Nombre requerido','r');return;}
    var data = {nombre:nm,contacto:fv('ct'),email:fv('em'),telefono:fv('te'),drive_url:fv('dr')||null,dia_pago:Number(fv('dp'))||0,dia_factura:Number(fv('df'))||0,estado:fv('es'),notas:fv('nt')};
    var r = id ? await upd('clientes',id,data) : await ins('clientes',data);
    if(r){mClose();await refresh();toast(id?'Cliente actualizado':'Cliente registrado ✓','g');}
  },
  dc: async function(id){
    var c = xid(DB.clientes,id); if(!c) return;
    if(!confirm('¿Eliminar '+c.nombre+'? Se marcará como inactivo; sus proyectos y pagos se conservan y puedes reactivarlo después.')) return;
    var ok = await upd('clientes',id,{estado:'inactivo'});
    if(ok){await refresh();toast('Cliente eliminado','g');}
  },
  rc: async function(id){
    var c = xid(DB.clientes,id); if(!c) return;
    var ok = await upd('clientes',id,{estado:'activo'});
    if(ok){await refresh();toast('Cliente reactivado ✓','g');}
  },
  pagos: function(cid){
    var pays = DB.pagos.filter(function(p){return p.cliente_id===cid;});
    var c = xid(DB.clientes,cid);
    var rows = pays.map(function(pay){
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">'
        +'<div><div style="font-weight:700;font-size:14px">'+esc(pay.concepto)+'</div><div style="font-size:12px;color:var(--muted)">Factura: '+fmt(pay.fecha_factura)+' · Vence: '+fmt(pay.fecha_vencimiento)+'</div></div>'
        +'<div style="text-align:right"><div style="font-size:16px;font-weight:900;color:var(--navy)">$'+Number(pay.monto).toLocaleString()+'</div>'+bSt(pay.estado)
        +(pay.estado!=='pagado'?'<br><button class="btn btns btng" style="margin-top:5px" onclick="A.mp(\''+pay.id+'\')">✓ Cobrado</button>':'')
        +'</div></div>';
    }).join('') || '<div class="empty"><p>Sin pagos registrados</p></div>';
    mOpen('💰 Pagos — '+c.nombre,
      '<div style="margin-bottom:13px;display:flex;justify-content:flex-end"><button class="btn btnc" onclick="mClose();A.np2(\''+cid+'\')">+ Registrar pago</button></div>'+rows,true);
  },

  /* PAGO */
  np2: function(cid){
    mClose();
    var cO = DB.clientes.map(function(c){return [c.id,c.nombre];});
    var pO = DB.proyectos.map(function(p){return [p.id,p.nombre];});
    mOpen('Registrar pago',
      '<div class="fg">'
      +FSL('ci','Cliente',cO,cid||'')
      +FSL('pi','Proyecto',pO,'')
      +FLD('co','Concepto del pago')
      +FLD('mo','Monto','number')
      +'<div class="fr2">'+FLD('fi','Fecha emisión factura','date',today())+FLD('fv','Fecha límite de pago','date',pd(15))+'</div>'
      +FSL('es','Estado',[['pendiente','Pendiente'],['pagado','Pagado']],'pendiente')
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A._sp2()">Guardar</button></div>'
      +'</div>');
  },
  _sp2: async function(){
    var co = fv('co'), mo = fv('mo');
    if(!co||!mo){toast('Concepto y monto requeridos','r');return;}
    var r = await ins('pagos',{cliente_id:fv('ci'),proyecto_id:fv('pi')||null,concepto:co,monto:Number(mo),estado:fv('es'),fecha_factura:fv('fi')||null,fecha_vencimiento:fv('fv')||null,fecha_pago:null});
    if(r){mClose();await refresh();toast('Pago registrado ✓','g');}
  },
  mp: async function(id){
    await upd('pagos',id,{estado:'pagado',fecha_pago:today()});
    mClose(); await refresh(); toast('Pago cobrado ✓','g');
  },

  /* USUARIO */
  nu: function(){ A._um(null); },
  eu: function(id){ A._um(id); },
  _um: function(id){
    var u = id ? xid(DB.usuarios,id) : null;
    var pref = userPrefs(id||'');
    mOpen(u?'Editar usuario':'Nuevo usuario',
      '<div class="fg">'
      +'<div class="fr2">'+FLD('nm','Nombre completo','text',u&&u.nombre)+FLD('us','Usuario (login)','text',u&&u.username)+'</div>'
      +'<div class="fr3">'+FLD('pi','PIN','text',u&&u.pin)+FSL('ro','Rol',[['admin','Administrador'],['user','Usuario']],u&&u.rol||'user')+FSL('ac','Estado de acceso',[['true','Activo'],['false','Inactivo']],String(u?u.activo:true))+'</div>'
      +'<div class="user-role-help"><strong>Administrador</strong> puede ver y modificar todos los proyectos. <strong>Usuario</strong> solo accede a proyectos o tareas asignadas.</div>'
      +'<div class="fr2">'+FLD('em','Correo para alertas','email',pref.email)+FLD('dh','Hora del resumen diario','number',pref.digest_hour)+'</div>'
      +'<div class="fr2">'+FSL('ne','Alertas por correo',[['true','Activadas'],['false','Desactivadas']],String(pref.email_enabled))+FSL('nd','Resumen diario',[['true','Activado'],['false','Desactivado']],String(pref.daily_digest))+'</div>'
      +'<div class="fa"><button class="btn btng" onclick="mClose()">Cancelar</button><button class="btn btnc" onclick="A._su(\''+( id||'')+'\')">Guardar</button></div>'
      +'</div>');
  },
  _su: async function(id){
    var nm=fv('nm'),us=fv('us'),pi=fv('pi');
    if(!nm||!us||!pi){toast('Todos los campos son requeridos','r');return;}
    if(!id && DB.usuarios.some(function(u){return u.username===us;})){toast('Ese usuario ya existe','r');return;}
    var data = {nombre:nm,username:us,pin:pi,rol:fv('ro'),activo:fv('ac')==='true'};
    var r = id ? await upd('usuarios',id,data) : await ins('usuarios',Object.assign({activo:true},data));
    if(r){
      await sb.from('notification_preferences').upsert({user_id:r.id,email:fv('em')||null,email_enabled:fv('ne')==='true',browser_enabled:true,daily_digest:fv('nd')==='true',digest_hour:Math.max(0,Math.min(23,Number(fv('dh'))||8)),timezone:'America/Mexico_City',updated_at:new Date().toISOString()},{onConflict:'user_id'});
      mClose();await refresh();buildSelector();toast(id?'Usuario actualizado':'Usuario creado ✓','g');
    }
  },
  tu: async function(id){
    var u = xid(DB.usuarios,id); if(!u) return;
    await upd('usuarios',id,{activo:!u.activo});
    await refresh(); toast(u.activo?'Usuario desactivado':'Usuario activado','g');
  }
};

/* ── LOGIN ── */
function normName(s){ return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function buildSelector(){
  var container = document.getElementById('user-sel');
  if(!container) return;
  container.innerHTML = '<input id="user-select" class="user-select" type="text" autocomplete="off" autocapitalize="words" placeholder="Escribe tu nombre">';
  var input = document.getElementById('user-select');
  input.addEventListener('input', function(){
    var users = DB.usuarios.filter(function(u){return u.activo;});
    var match = users.find(function(u){ return normName(u.nombre)===normName(input.value); });
    if(!match){
      SELUID = '';
      document.getElementById('pin-wrap').style.display = 'none';
      document.getElementById('btn-login').style.display = 'none';
      document.getElementById('lerr').textContent = '';
      return;
    }
    SELUID = match.id;
    document.getElementById('pin-lbl').textContent = 'Ingresa tu PIN';
    document.getElementById('pin-wrap').style.display = 'block';
    document.getElementById('btn-login').style.display = 'block';
    document.getElementById('lerr').textContent = '';
    resetOtpBoxes(true);
  });
  input.addEventListener('keydown', function(e){
    if(e.key==='Enter' && SELUID){ var b=otpBoxes()[0]; if(b) b.focus(); }
  });
}

function otpBoxes(){ return Array.prototype.slice.call(document.querySelectorAll('.otp-box')); }
function syncOtpToPin(){
  var v = otpBoxes().map(function(b){ return b.value; }).join('');
  document.getElementById('f-pin').value = v;
}
function resetOtpBoxes(focusFirst){
  var boxes = otpBoxes();
  boxes.forEach(function(b){ b.value=''; b.classList.remove('filled'); });
  syncOtpToPin();
  if(focusFirst && boxes[0]) setTimeout(function(){ boxes[0].focus(); }, 80);
}
function shakeOtpBoxes(){
  otpBoxes().forEach(function(b){
    b.classList.add('shake');
    setTimeout(function(){ b.classList.remove('shake'); }, 420);
  });
}
function initOtpBoxes(){
  var boxes = otpBoxes();
  boxes.forEach(function(box, i){
    box.addEventListener('input', function(){
      box.value = box.value.replace(/[^0-9]/g,'').slice(0,1);
      box.classList.toggle('filled', !!box.value);
      syncOtpToPin();
      if(box.value && boxes[i+1]) boxes[i+1].focus();
      if(i===boxes.length-1 && box.value && boxes.every(function(b){return b.value;})) doLogin();
    });
    box.addEventListener('keydown', function(e){
      if(e.key==='Backspace' && !box.value && boxes[i-1]){ boxes[i-1].focus(); }
      if(e.key==='Enter') doLogin();
    });
    box.addEventListener('paste', function(e){
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g,'');
      if(!text) return;
      boxes.forEach(function(b, idx){
        b.value = text[idx] || '';
        b.classList.toggle('filled', !!b.value);
      });
      syncOtpToPin();
      var next = boxes[Math.min(text.length,boxes.length-1)];
      if(next) next.focus();
      if(text.length>=boxes.length) doLogin();
    });
  });
}
function showPreloader(){
  var pl = document.getElementById('preloader');
  if(!pl) return;
  pl.classList.add('show');
  requestAnimationFrame(function(){ pl.classList.add('visible'); });
}
function hidePreloader(){
  var pl = document.getElementById('preloader');
  if(!pl) return;
  pl.classList.remove('visible');
  setTimeout(function(){ pl.classList.remove('show'); }, 350);
}

async function doLogin(){
  if(!SELUID){ document.getElementById('lerr').textContent='Selecciona tu nombre.'; return; }
  var pin = document.getElementById('f-pin').value.trim();
  if(!pin){ document.getElementById('lerr').textContent='Ingresa tu PIN.'; return; }
  var r = await sb.rpc('sm_verify_pin', {p_user_id: SELUID, p_pin: pin});
  var found = (r && r.data && r.data[0]) ? r.data[0] : null;
  if(!found){
    document.getElementById('lerr').textContent = 'PIN incorrecto.';
    shakeOtpBoxes();
    resetOtpBoxes(true);
    return;
  }
  activateSession(found,{view:'dashboard',fpid:'',ptab:'tareas',pktab:'dashboard'});
}

function activateSession(found,state){
  showPreloader();
  var plStart = Date.now();
  setTimeout(function(){
    SES = {userId: found.id};
    document.getElementById('lerr').textContent = '';
    document.body.classList.add('logged');
    document.getElementById('sb-av').textContent = ini(found.nombre);
    document.getElementById('sb-n').textContent = found.nombre;
    document.getElementById('sb-r').textContent = found.rol==='admin' ? 'Administrador' : 'Usuario';
    if(found.rol==='admin') document.getElementById('nav-admin').style.display = 'block';
    else document.getElementById('nav-admin').style.display = 'none';
    document.getElementById('tb-live').style.display = 'block';
    buildProjectNav();
    VIEW = state&&state.view || 'dashboard';
    FPID = state&&state.fpid || '';
    PTAB = state&&state.ptab || 'tareas';
    PKTAB = state&&state.pktab || 'dashboard';
    document.querySelectorAll('.nbtn').forEach(function(b){ b.classList.toggle('active', b.dataset.v===VIEW); });
    render();
    saveSession();
    var elapsed = Date.now() - plStart;
    var minShow = 900;
    setTimeout(hidePreloader, Math.max(0, minShow - elapsed));
  }, 60);
}

function restoreSession(){
  var s = storedSession();
  if(!s || !s.userId) return false;
  var found = DB.usuarios.find(function(u){return u.id===s.userId && u.activo;});
  if(!found){ clearSession(); return false; }
  activateSession(found,s);
  return true;
}

document.getElementById('btn-login').addEventListener('click', doLogin);
initOtpBoxes();
function doLogout(){
  if(!confirm('¿Cerrar sesión?')) return;
  clearSession();
  SES=null; SELUID='';
  document.body.classList.remove('logged');
  document.getElementById('nav-admin').style.display = 'none';
  document.getElementById('tb-live').style.display = 'none';
  buildProjectNav();
  document.getElementById('pin-wrap').style.display = 'none';
  document.getElementById('btn-login').style.display = 'none';
  resetOtpBoxes(false);
  document.getElementById('lerr').textContent = '';
  buildSelector();
}
document.getElementById('btn-out').addEventListener('click', doLogout);
document.getElementById('btn-out-top').addEventListener('click', doLogout);
document.getElementById('btn-refresh-data').addEventListener('click', manualRefresh);
document.getElementById('btn-reload-app').addEventListener('click', hardReloadApp);

/* ── DATE ── */
updClock();
setInterval(updClock, 60000);

/* ── INIT ── */
(async function(){
  document.getElementById('vc').innerHTML = '<div class="loading"><div class="spin"></div><span>Conectando con Supabase…</span></div>';
  var usersOk = await loadUsersForLogin();
  if(!usersOk){
    document.getElementById('lerr').textContent = 'No se pudieron cargar usuarios. Revisa internet/VPN y recarga.';
    document.getElementById('vc').innerHTML = '<div class="loading"><span style="color:var(--red)">Error cargando usuarios. Usa Recargar app.</span></div>';
    return;
  }
  buildSelector();
  document.getElementById('vc').innerHTML = '';
  var ok = await loadAll();
  buildProjectNav();
  if(!ok) document.getElementById('lerr').textContent = 'Login disponible. Algunos datos siguen cargando; entra y usa Actualizar datos.';
  if(ok){
    if(!SES) restoreSession();
    else render();
  }
})();

/* ── REALTIME ── */
var TABLES = ['proyectos','tareas','subtareas','comentarios','entregables','pagos','clientes','usuarios','reuniones','prokicks_records','prokicks_settings'];
TABLES.forEach(function(tbl){
  sb.channel('rt:'+tbl)
    .on('postgres_changes',{event:'*',schema:'public',table:tbl},function(){
      if(SES) refresh();
    })
    .subscribe();
});
