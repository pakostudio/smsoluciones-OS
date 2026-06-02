"use client";

import { clients, tasks } from "@/lib/mockData";

type Props = {
  user: { name: string; username: string; role: string };
  onLogout: () => void;
};

function LightBadge({ light }: { light: string }) {
  const label: Record<string, string> = {
    green: "En tiempo",
    yellow: "Próxima",
    red: "Crítica",
    gray: "Vencida",
  };

  return <span className={`badge badge-${light}`}>{label[light] || "Sin estado"}</span>;
}

export default function Dashboard({ user, onLogout }: Props) {
  const stats = [
    { label: "Clientes activos", value: clients.length },
    { label: "Proyectos activos", value: 9 },
    { label: "Tareas abiertas", value: tasks.length },
    { label: "Vencimientos críticos", value: 1 },
  ];

  return (
    <main className="page-shell" style={{ padding: 28 }}>
      <header
        className="card"
        style={{
          padding: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>SM OS</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>Panel General</h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
            {user.name} · {user.role}
          </p>
        </div>
        <button className="btn-secondary" onClick={onLogout}>
          Salir
        </button>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.map((item) => (
          <div className="card" key={item.label} style={{ padding: 22 }}>
            <div style={{ color: "#6b7280", fontSize: 13, fontWeight: 700 }}>{item.label}</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 8 }}>{item.value}</div>
          </div>
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "0.9fr 1.5fr", gap: 18 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Clientes</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {clients.map((client) => (
              <button
                key={client}
                className="btn-secondary"
                style={{ textAlign: "left", display: "flex", justifyContent: "space-between" }}
              >
                <span>{client}</span>
                <span>Ver</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ marginTop: 0 }}>Tareas prioritarias</h2>
            <button className="btn">Nueva tarea</button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                      {task.client} · {task.project}
                    </div>
                    <h3 style={{ margin: "6px 0 6px" }}>{task.title}</h3>
                    <p style={{ margin: 0, color: "#6b7280" }}>
                      Responsable: {task.owner} · Vence: {task.dueDate}
                    </p>
                  </div>
                  <LightBadge light={task.light} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
