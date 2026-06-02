"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, Client, Project, Task, Subtask, Comment, FileRecord } from "@/lib/types";

type View = "dashboard" | "clientes" | "proyectos" | "tareas" | "kanban" | "calendario" | "reportes" | "usuarios";

function daysUntil(date?: string) {
  if (!date) return 999;
  const today = new Date();
  const due = new Date(date + "T00:00:00");
  today.setHours(0,0,0,0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function traffic(task: Task) {
  if (task.status === "terminada") return "green";
  const d = daysUntil(task.due_date);
  if (d < 0) return "gray";
  if (d <= 1) return "red";
  if (d <= 3) return "yellow";
  return "green";
}

function trafficLabel(color: string) {
  if (color === "green") return "En tiempo";
  if (color === "yellow") return "Próxima";
  if (color === "red") return "Crítica";
  return "Vencida";
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [me, setMe] = useState<User | null>(null);
  const [loginUser, setLoginUser] = useState("pako");
  const [loginPin, setLoginPin] = useState("1234");
  const [error, setError] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);

  const [selectedClient, setSelectedClient] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modal, setModal] = useState("");

  async function loadAll() {
    const [u, c, p, t, s, cm, f] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: true }),
      supabase.from("clients").select("*").order("created_at", { ascending: true }),
      supabase.from("projects").select("*").order("created_at", { ascending: true }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("subtasks").select("*").order("created_at", { ascending: true }),
      supabase.from("comments").select("*").order("created_at", { ascending: false }),
      supabase.from("files").select("*").order("created_at", { ascending: false }),
    ]);

    if (u.error || c.error || p.error || t.error) {
      setError("Falta conectar Supabase o ejecutar schema.sql.");
    } else {
      setUsers(u.data || []);
      setClients(c.data || []);
      setProjects(p.data || []);
      setTasks(t.data || []);
      setSubtasks(s.data || []);
      setComments(cm.data || []);
      setFiles(f.data || []);
      setError("");
    }
    setReady(true);
  }

  useEffect(() => { loadAll(); }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", loginUser.trim())
      .eq("pin", loginPin.trim())
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      setError("Usuario o PIN incorrecto, o Supabase no está conectado.");
      return;
    }

    setMe(data);
    setError("");
  }

  const filteredTasks = useMemo(() => {
    if (!selectedClient) return tasks;
    return tasks.filter(t => t.client_id === selectedClient);
  }, [tasks, selectedClient]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "Sin cliente";
  const projectName = (id: string) => projects.find(p => p.id === id)?.name || "Sin proyecto";
  const userName = (id?: string | null) => users.find(u => u.id === id)?.name || "Sin responsable";
  const projectsForClient = (clientId: string) => projects.filter(p => p.client_id === clientId);

  async function addClient(form: FormData) {
    await supabase.from("clients").insert({ name: String(form.get("name")), description: String(form.get("description") || "") });
    setModal(""); await loadAll();
  }

  async function addUser(form: FormData) {
    await supabase.from("users").insert({
      name: String(form.get("name")), username: String(form.get("username")), pin: String(form.get("pin")),
      role: String(form.get("role")), active: true
    });
    setModal(""); await loadAll();
  }

  async function addProject(form: FormData) {
    await supabase.from("projects").insert({
      client_id: String(form.get("client_id")), name: String(form.get("name")),
      description: String(form.get("description") || ""), status: "activo",
      start_date: String(form.get("start_date") || "") || null, due_date: String(form.get("due_date") || "") || null
    });
    setModal(""); await loadAll();
  }

  async function addTask(form: FormData) {
    await supabase.from("tasks").insert({
      client_id: String(form.get("client_id")), project_id: String(form.get("project_id")),
      title: String(form.get("title")), description: String(form.get("description") || ""),
      owner_id: String(form.get("owner_id") || "") || null, priority: String(form.get("priority")),
      status: String(form.get("status")), start_date: String(form.get("start_date") || "") || null,
      due_date: String(form.get("due_date") || "") || null
    });
    setModal(""); await loadAll();
  }

  async function addSubtask(form: FormData) {
    if (!selectedTask) return;
    await supabase.from("subtasks").insert({
      task_id: selectedTask.id, title: String(form.get("title")),
      owner_id: String(form.get("owner_id") || "") || null,
      status: String(form.get("status")), due_date: String(form.get("due_date") || "") || null
    });
    setModal(""); await loadAll();
  }

  async function addComment(form: FormData) {
    if (!selectedTask || !me) return;
    await supabase.from("comments").insert({ task_id: selectedTask.id, user_id: me.id, comment: String(form.get("comment")) });
    setModal(""); await loadAll();
  }

  async function addFile(form: FormData) {
    if (!selectedTask || !me) return;
    await supabase.from("files").insert({
      task_id: selectedTask.id, user_id: me.id, file_name: String(form.get("file_name")),
      file_url: String(form.get("file_url")), file_type: String(form.get("file_type") || ""),
      version: Number(form.get("version") || 1)
    });
    setModal(""); await loadAll();
  }

  async function updateTaskStatus(id: string, status: string) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    await loadAll();
  }

  async function removeRow(table: string, id: string) {
    await supabase.from(table).delete().eq("id", id);
    if (selectedTask?.id === id) setSelectedTask(null);
    await loadAll();
  }

  if (!ready) return <main className="page-shell"><div className="card" style={{padding:32}}>Cargando SM OS...</div></main>;

  if (!me) {
    return (
      <main className="page-shell" style={{display:"grid",placeItems:"center"}}>
        <form onSubmit={login} className="card" style={{width:"100%",maxWidth:440,padding:32}}>
          <div className="small">SM SOLUCIONES</div>
          <h1 style={{fontSize:40,margin:"8px 0 4px"}}>SM OS</h1>
          <p style={{color:"#6b7280",marginTop:0}}>Sistema Operativo de Gestión Interna</p>
          <label className="label">Usuario</label>
          <input className="input" value={loginUser} onChange={e=>setLoginUser(e.target.value)} style={{margin:"8px 0 16px"}} />
          <label className="label">PIN</label>
          <input className="input" value={loginPin} onChange={e=>setLoginPin(e.target.value)} type="password" style={{margin:"8px 0 16px"}} />
          {error && <div style={{color:"#c62828",fontWeight:800,marginBottom:14}}>{error}</div>}
          <button className="btn" style={{width:"100%"}}>Entrar</button>
          <p className="small" style={{marginTop:18}}>Demo inicial: pako / 1234</p>
        </form>
      </main>
    );
  }

  return (
    <main className="page-shell">
      {modal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:18}}>
              <h2 style={{margin:0}}>{modalTitle(modal)}</h2>
              <button className="btn-secondary" onClick={()=>setModal("")}>Cerrar</button>
            </div>
            {modal === "client" && <Form onSubmit={addClient} fields={[["name","Nombre del cliente"],["description","Descripción"]]} />}
            {modal === "user" && <Form onSubmit={addUser} fields={[["name","Nombre"],["username","Usuario"],["pin","PIN"],["role","Rol: admin / responsable / colaborador / consulta"]]} />}
            {modal === "project" && <ProjectForm clients={clients} onSubmit={addProject} />}
            {modal === "task" && <TaskForm clients={clients} projects={projects} users={users} onSubmit={addTask} />}
            {modal === "subtask" && <SubtaskForm users={users} onSubmit={addSubtask} />}
            {modal === "comment" && <Form onSubmit={addComment} fields={[["comment","Comentario"]]} textarea="comment" />}
            {modal === "file" && <Form onSubmit={addFile} fields={[["file_name","Nombre del archivo"],["file_url","Link del archivo"],["file_type","Tipo"],["version","Versión"]]} />}
          </div>
        </div>
      )}

      <header className="card" style={{padding:24,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div className="small">SM OS</div>
          <h1 style={{margin:"4px 0 0"}}>{selectedClient ? clientName(selectedClient) : "Panel General"}</h1>
          <p style={{margin:"6px 0 0",color:"#6b7280"}}>{me.name} · {me.role}</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          {selectedClient && <button className="btn-secondary" onClick={()=>setSelectedClient("")}>Vista general</button>}
          <button className="btn-secondary" onClick={()=>setMe(null)}>Salir</button>
        </div>
      </header>

      <section className="layout">
        <aside className="card" style={{padding:18,alignSelf:"start"}}>
          <div className="nav">
            {(["dashboard","clientes","proyectos","tareas","kanban","calendario","reportes","usuarios"] as View[]).map(v => (
              <button key={v} className={view===v?"active":""} onClick={()=>setView(v)}>{labelView(v)}</button>
            ))}
          </div>
        </aside>

        <section>
          {view === "dashboard" && (
            <div className="grid">
              <div className="grid grid-4">
                <Stat label="Clientes activos" value={clients.length} />
                <Stat label="Proyectos" value={projects.length} />
                <Stat label="Tareas abiertas" value={tasks.filter(t=>t.status!=="terminada").length} />
                <Stat label="Críticas/vencidas" value={tasks.filter(t=>["red","gray"].includes(traffic(t))).length} />
              </div>
              <div className="grid grid-2">
                <Panel title="Clientes" action="Nuevo cliente" onAction={()=>setModal("client")}>
                  <div className="grid">
                    {clients.map(c => <button key={c.id} className="btn-secondary" onClick={()=>{setSelectedClient(c.id); setView("tareas");}} style={{display:"flex",justifyContent:"space-between"}}><span>{c.name}</span><span>Ver</span></button>)}
                  </div>
                </Panel>
                <Panel title="Tareas prioritarias" action="Nueva tarea" onAction={()=>setModal("task")}>
                  <TaskList tasks={filteredTasks.slice(0,6)} clientName={clientName} projectName={projectName} userName={userName} onOpen={setSelectedTask} onStatus={updateTaskStatus} onDelete={(id)=>removeRow("tasks",id)} />
                </Panel>
              </div>
            </div>
          )}

          {view === "clientes" && <Panel title="Clientes" action="Nuevo cliente" onAction={()=>setModal("client")}><ClientTable clients={clients} onOpen={(id)=>{setSelectedClient(id);setView("proyectos")}} onDelete={(id)=>removeRow("clients",id)} /></Panel>}

          {view === "usuarios" && <Panel title="Usuarios" action="Nuevo usuario" onAction={()=>setModal("user")}><UserTable users={users} onDelete={(id)=>removeRow("users",id)} /></Panel>}

          {view === "proyectos" && <Panel title="Proyectos" action="Nuevo proyecto" onAction={()=>setModal("project")}><ProjectTable projects={selectedClient?projects.filter(p=>p.client_id===selectedClient):projects} clientName={clientName} onDelete={(id)=>removeRow("projects",id)} /></Panel>}

          {view === "tareas" && <Panel title="Tareas" action="Nueva tarea" onAction={()=>setModal("task")}><TaskList tasks={filteredTasks} clientName={clientName} projectName={projectName} userName={userName} onOpen={setSelectedTask} onStatus={updateTaskStatus} onDelete={(id)=>removeRow("tasks",id)} /></Panel>}

          {view === "kanban" && <Panel title="Kanban" action="Nueva tarea" onAction={()=>setModal("task")}><Kanban tasks={filteredTasks} clientName={clientName} projectName={projectName} userName={userName} onOpen={setSelectedTask} /></Panel>}

          {view === "calendario" && <Panel title="Calendario de vencimientos" action="Nueva tarea" onAction={()=>setModal("task")}><CalendarView tasks={filteredTasks} clientName={clientName} /></Panel>}

          {view === "reportes" && <Reports tasks={tasks} clients={clients} users={users} clientName={clientName} userName={userName} />}
        </section>
      </section>

      {selectedTask && (
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
              <div>
                <div className="small">{clientName(selectedTask.client_id)} · {projectName(selectedTask.project_id)}</div>
                <h2 style={{margin:"5px 0"}}>{selectedTask.title}</h2>
                <p style={{color:"#6b7280",margin:0}}>{selectedTask.description || "Sin descripción"}</p>
              </div>
              <button className="btn-secondary" onClick={()=>setSelectedTask(null)}>Cerrar</button>
            </div>

            <div className="grid grid-4" style={{marginTop:18}}>
              <Stat label="Responsable" value={userName(selectedTask.owner_id)} />
              <Stat label="Prioridad" value={selectedTask.priority} />
              <Stat label="Estatus" value={selectedTask.status} />
              <Stat label="Vence" value={selectedTask.due_date || "Sin fecha"} />
            </div>

            <div style={{display:"flex",gap:10,marginTop:18,flexWrap:"wrap"}}>
              <button className="btn" onClick={()=>setModal("subtask")}>Agregar subtarea</button>
              <button className="btn-secondary" onClick={()=>setModal("comment")}>Comentar</button>
              <button className="btn-secondary" onClick={()=>setModal("file")}>Agregar entregable</button>
            </div>

            <DetailBlock title="Subtareas">
              {(subtasks.filter(s=>s.task_id===selectedTask.id)).map(s => <div key={s.id} className="card" style={{padding:14,marginBottom:10}}><b>{s.title}</b><div className="small">{userName(s.owner_id)} · {s.status} · {s.due_date || "sin fecha"}</div></div>)}
            </DetailBlock>
            <DetailBlock title="Comentarios">
              {(comments.filter(c=>c.task_id===selectedTask.id)).map(c => <div key={c.id} className="card" style={{padding:14,marginBottom:10}}><b>{userName(c.user_id)}</b><p style={{margin:"6px 0 0"}}>{c.comment}</p><div className="small">{new Date(c.created_at).toLocaleString()}</div></div>)}
            </DetailBlock>
            <DetailBlock title="Archivos / entregables">
              {(files.filter(f=>f.task_id===selectedTask.id)).map(f => <div key={f.id} className="card" style={{padding:14,marginBottom:10}}><b>{f.file_name}</b><div className="small">v{f.version} · {f.file_type}</div><a href={f.file_url} target="_blank">Abrir archivo</a></div>)}
            </DetailBlock>
          </div>
        </div>
      )}
    </main>
  );
}

function modalTitle(m: string) {
  return ({client:"Nuevo cliente", user:"Nuevo usuario", project:"Nuevo proyecto", task:"Nueva tarea", subtask:"Nueva subtarea", comment:"Nuevo comentario", file:"Nuevo entregable"} as any)[m] || "";
}

function labelView(v: View) {
  return ({dashboard:"Dashboard",clientes:"Clientes",proyectos:"Proyectos",tareas:"Tareas",kanban:"Kanban",calendario:"Calendario",reportes:"Reportes",usuarios:"Usuarios"} as any)[v];
}

function Stat({label,value}:{label:string;value:any}) {
  return <div className="card" style={{padding:20}}><div className="small">{label}</div><div style={{fontSize:28,fontWeight:900,marginTop:8}}>{value}</div></div>
}

function Panel({title,action,onAction,children}:{title:string;action?:string;onAction?:()=>void;children:any}) {
  return <div className="card" style={{padding:24}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:16}}><h2 style={{margin:0}}>{title}</h2>{action&&<button className="btn" onClick={onAction}>{action}</button>}</div>{children}</div>
}

function Form({onSubmit,fields,textarea}:{onSubmit:(f:FormData)=>void;fields:string[][];textarea?:string}) {
  return <form action={onSubmit} className="grid">{fields.map(([name,label])=><div key={name}><label className="label">{label}</label>{textarea===name?<textarea className="input" name={name} rows={5} required/>:<input className="input" name={name} required />}</div>)}<button className="btn">Guardar</button></form>
}

function ProjectForm({clients,onSubmit}:{clients:Client[];onSubmit:(f:FormData)=>void}) {
  return <form action={onSubmit} className="grid"><Select name="client_id" label="Cliente" options={clients.map(c=>[c.id,c.name])}/><Input name="name" label="Nombre"/><Input name="description" label="Descripción"/><Input name="start_date" label="Fecha inicio" type="date"/><Input name="due_date" label="Fecha término" type="date"/><button className="btn">Guardar</button></form>
}

function TaskForm({clients,projects,users,onSubmit}:{clients:Client[];projects:Project[];users:User[];onSubmit:(f:FormData)=>void}) {
  return <form action={onSubmit} className="grid"><Select name="client_id" label="Cliente" options={clients.map(c=>[c.id,c.name])}/><Select name="project_id" label="Proyecto" options={projects.map(p=>[p.id,p.name])}/><Input name="title" label="Tarea"/><Input name="description" label="Descripción"/><Select name="owner_id" label="Responsable" options={users.map(u=>[u.id,u.name])}/><Select name="priority" label="Prioridad" options={[["critica","Crítica"],["alta","Alta"],["media","Media"],["baja","Baja"]]}/><Select name="status" label="Estatus" options={[["pendiente","Pendiente"],["en_proceso","En proceso"],["en_revision","En revisión"],["terminada","Terminada"]]}/><Input name="start_date" label="Fecha inicio" type="date"/><Input name="due_date" label="Fecha término" type="date"/><button className="btn">Guardar</button></form>
}

function SubtaskForm({users,onSubmit}:{users:User[];onSubmit:(f:FormData)=>void}) {
  return <form action={onSubmit} className="grid"><Input name="title" label="Subtarea"/><Select name="owner_id" label="Responsable" options={users.map(u=>[u.id,u.name])}/><Select name="status" label="Estatus" options={[["pendiente","Pendiente"],["en_proceso","En proceso"],["en_revision","En revisión"],["terminada","Terminada"]]}/><Input name="due_date" label="Fecha término" type="date"/><button className="btn">Guardar</button></form>
}

function Input({name,label,type="text"}:{name:string;label:string;type?:string}) {
  return <div><label className="label">{label}</label><input className="input" name={name} type={type} /></div>
}

function Select({name,label,options}:{name:string;label:string;options:string[][]}) {
  return <div><label className="label">{label}</label><select className="input" name={name}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
}

function ClientTable({clients,onOpen,onDelete}:{clients:Client[];onOpen:(id:string)=>void;onDelete:(id:string)=>void}) {
  return <table className="table"><thead><tr><th>Cliente</th><th>Descripción</th><th>Acciones</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.description}</td><td><button className="btn-secondary" onClick={()=>onOpen(c.id)}>Abrir</button> <button className="btn-danger" onClick={()=>onDelete(c.id)}>Borrar</button></td></tr>)}</tbody></table>
}

function UserTable({users,onDelete}:{users:User[];onDelete:(id:string)=>void}) {
  return <table className="table"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.name}</b></td><td>{u.username}</td><td>{u.role}</td><td><button className="btn-danger" onClick={()=>onDelete(u.id)}>Borrar</button></td></tr>)}</tbody></table>
}

function ProjectTable({projects,clientName,onDelete}:{projects:Project[];clientName:(id:string)=>string;onDelete:(id:string)=>void}) {
  return <table className="table"><thead><tr><th>Proyecto</th><th>Cliente</th><th>Estatus</th><th>Fechas</th><th></th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td><b>{p.name}</b><div className="small">{p.description}</div></td><td>{clientName(p.client_id)}</td><td>{p.status}</td><td>{p.start_date || "-"} → {p.due_date || "-"}</td><td><button className="btn-danger" onClick={()=>onDelete(p.id)}>Borrar</button></td></tr>)}</tbody></table>
}

function TaskList({tasks,clientName,projectName,userName,onOpen,onStatus,onDelete}:{tasks:Task[];clientName:(id:string)=>string;projectName:(id:string)=>string;userName:(id?:string|null)=>string;onOpen:(t:Task)=>void;onStatus:(id:string,s:string)=>void;onDelete:(id:string)=>void}) {
  return <div className="grid">{tasks.map(t=><div key={t.id} className="card" style={{padding:16,boxShadow:"none"}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><div className="small">{clientName(t.client_id)} · {projectName(t.project_id)}</div><h3 style={{margin:"6px 0"}}>{t.title}</h3><p style={{margin:0,color:"#6b7280"}}>{userName(t.owner_id)} · vence {t.due_date || "sin fecha"} · {t.status}</p></div><span className={`badge badge-${traffic(t)}`}>{trafficLabel(traffic(t))}</span></div><div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><button className="btn-secondary" onClick={()=>onOpen(t)}>Abrir</button><button className="btn-secondary" onClick={()=>onStatus(t.id,"en_proceso")}>En proceso</button><button className="btn-secondary" onClick={()=>onStatus(t.id,"en_revision")}>Revisión</button><button className="btn-secondary" onClick={()=>onStatus(t.id,"terminada")}>Terminar</button><button className="btn-danger" onClick={()=>onDelete(t.id)}>Borrar</button></div></div>)}</div>
}

function Kanban({tasks,clientName,projectName,userName,onOpen}:{tasks:Task[];clientName:(id:string)=>string;projectName:(id:string)=>string;userName:(id?:string|null)=>string;onOpen:(t:Task)=>void}) {
  const cols = [["pendiente","Pendiente"],["en_proceso","En proceso"],["en_revision","En revisión"],["terminada","Terminada"]];
  return <div className="kanban">{cols.map(([key,label])=><div className="kanban-col" key={key}><h3>{label}</h3>{tasks.filter(t=>t.status===key).map(t=><button key={t.id} onClick={()=>onOpen(t)} className="card" style={{padding:14,marginBottom:10,width:"100%",textAlign:"left",cursor:"pointer"}}><div className="small">{clientName(t.client_id)}</div><b>{t.title}</b><div className="small">{userName(t.owner_id)} · {t.due_date || "-"}</div></button>)}</div>)}</div>
}

function CalendarView({tasks,clientName}:{tasks:Task[];clientName:(id:string)=>string}) {
  return <table className="table"><thead><tr><th>Fecha</th><th>Tarea</th><th>Cliente</th><th>Semáforo</th></tr></thead><tbody>{[...tasks].sort((a,b)=>(a.due_date||"").localeCompare(b.due_date||"")).map(t=><tr key={t.id}><td>{t.due_date || "Sin fecha"}</td><td><b>{t.title}</b></td><td>{clientName(t.client_id)}</td><td><span className={`badge badge-${traffic(t)}`}>{trafficLabel(traffic(t))}</span></td></tr>)}</tbody></table>
}

function Reports({tasks,clients,users,clientName,userName}:{tasks:Task[];clients:Client[];users:User[];clientName:(id:string)=>string;userName:(id?:string|null)=>string}) {
  const open = tasks.filter(t=>t.status!=="terminada").length;
  const done = tasks.filter(t=>t.status==="terminada").length;
  const critical = tasks.filter(t=>["red","gray"].includes(traffic(t))).length;
  return <div className="grid"><div className="grid grid-4"><Stat label="Tareas abiertas" value={open}/><Stat label="Tareas terminadas" value={done}/><Stat label="Críticas / vencidas" value={critical}/><Stat label="Usuarios" value={users.length}/></div><Panel title="Reporte por cliente"><table className="table"><thead><tr><th>Cliente</th><th>Tareas</th><th>Abiertas</th><th>Terminadas</th></tr></thead><tbody>{clients.map(c=>{const ct=tasks.filter(t=>t.client_id===c.id);return <tr key={c.id}><td><b>{c.name}</b></td><td>{ct.length}</td><td>{ct.filter(t=>t.status!=="terminada").length}</td><td>{ct.filter(t=>t.status==="terminada").length}</td></tr>})}</tbody></table></Panel><Panel title="Reporte por responsable"><table className="table"><thead><tr><th>Responsable</th><th>Tareas</th><th>Críticas</th></tr></thead><tbody>{users.map(u=>{const ut=tasks.filter(t=>t.owner_id===u.id);return <tr key={u.id}><td><b>{u.name}</b></td><td>{ut.length}</td><td>{ut.filter(t=>["red","gray"].includes(traffic(t))).length}</td></tr>})}</tbody></table></Panel></div>
}

function DetailBlock({title,children}:{title:string;children:any}) {
  return <div style={{marginTop:22}}><h3>{title}</h3>{children}</div>
}
