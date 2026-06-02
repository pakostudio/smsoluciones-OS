export const demoUsers = [
  { id: "1", name: "Pako Ayala", username: "pako", role: "Administrador General", pin: "1234" },
  { id: "2", name: "Alan", username: "alan", role: "Responsable", pin: "2222" },
  { id: "3", name: "Nalleli", username: "nalleli", role: "Colaborador", pin: "3333" },
  { id: "4", name: "Tere", username: "tere", role: "Consulta", pin: "4444" },
];

export const clients = [
  "MENLUN",
  "LEM",
  "OFUNAM",
  "PRO KICKS",
  "GPC",
  "MAVAS",
  "DX RX VET",
];

export const tasks = [
  {
    id: "t1",
    client: "MENLUN",
    project: "Plan de Marketing Anual",
    title: "Diagnóstico digital 2026",
    owner: "Alan",
    status: "En proceso",
    dueDate: "2026-06-07",
    light: "yellow",
  },
  {
    id: "t2",
    client: "LEM",
    project: "Clases abiertas Zoom",
    title: "Calendario editorial de junio",
    owner: "Nalleli",
    status: "Pendiente",
    dueDate: "2026-06-05",
    light: "red",
  },
  {
    id: "t3",
    client: "PRO KICKS",
    project: "Performance Series",
    title: "Reporte de leads y pauta",
    owner: "Pako",
    status: "En revisión",
    dueDate: "2026-06-12",
    light: "green",
  },
];
