import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const jsonHeaders = { 'content-type': 'application/json' }
const day = 86_400_000

function dateOnly(value?: string | null) {
  if (!value) return null
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function diffDays(value?: string | null) {
  const due = dateOnly(value)
  if (!due) return null
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.ceil((due.getTime() - today) / day)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('ALERT_FROM_EMAIL')
  const appUrl = Deno.env.get('APP_URL') || 'https://pakostudio.github.io/smsoluciones-OS/'
  if (!resendKey || !from) return new Response(JSON.stringify({ error: 'Email secrets are not configured' }), { status: 503, headers: jsonHeaders })

  const db = createClient(url, serviceKey)
  const [{ data: tasks }, { data: users }, { data: prefs }] = await Promise.all([
    db.from('tareas').select('id,proyecto_id,owner_id,titulo,estado,fecha_vencimiento,fecha_proximo_seguimiento,siguiente_accion,ultima_actividad'),
    db.from('usuarios').select('id,nombre,activo'),
    db.from('notification_preferences').select('*').eq('email_enabled', true),
  ])

  const activeUsers = new Map((users || []).filter((u) => u.activo).map((u) => [u.id, u]))
  const result: Array<{ userId: string; sent: boolean; alerts: number }> = []

  for (const pref of prefs || []) {
    const user = activeUsers.get(pref.user_id)
    if (!user || !pref.email) continue
    const alerts: Array<{ key: string; title: string }> = []
    for (const task of (tasks || []).filter((t) => t.owner_id === pref.user_id && t.estado !== 'terminada')) {
      const due = diffDays(task.fecha_vencimiento)
      const follow = diffDays(task.fecha_proximo_seguimiento)
      const idle = task.ultima_actividad ? Math.floor((Date.now() - new Date(task.ultima_actividad).getTime()) / day) : null
      if (due !== null && due < 0) alerts.push({ key: `overdue:${task.id}:${task.fecha_vencimiento}`, title: `Vencida: ${task.titulo}` })
      else if (due !== null && due <= 1) alerts.push({ key: `due:${task.id}:${task.fecha_vencimiento}`, title: `Vence hoy o manana: ${task.titulo}` })
      if (follow !== null && follow < 0) alerts.push({ key: `followup:${task.id}:${task.fecha_proximo_seguimiento}`, title: `Seguimiento vencido: ${task.titulo}` })
      if (!task.siguiente_accion) alerts.push({ key: `action:${task.id}`, title: `Sin siguiente accion: ${task.titulo}` })
      if (idle !== null && idle >= 14) alerts.push({ key: `idle:${task.id}:${Math.floor(idle / 7)}`, title: `Sin movimiento ${idle} dias: ${task.titulo}` })
    }
    if (!alerts.length) continue

    const unsent = []
    for (const alert of alerts) {
      const { data } = await db.from('notification_log').select('id').eq('user_id', pref.user_id).eq('alert_key', alert.key).eq('channel', 'email').maybeSingle()
      if (!data) unsent.push(alert)
    }
    if (!unsent.length) continue

    const html = `<h2>SM OS · Alertas</h2><p>Hola ${user.nombre}, tienes ${unsent.length} asuntos que requieren atencion:</p><ul>${unsent.map((a) => `<li>${a.title}</li>`).join('')}</ul><p><a href="${appUrl}">Abrir SM OS</a></p>`
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [pref.email], subject: `SM OS · ${unsent.length} alerta(s)`, html }) })
    if (response.ok) {
      await db.from('notification_log').insert(unsent.map((a) => ({ user_id: pref.user_id, alert_key: a.key, channel: 'email', status: 'sent' })))
    }
    result.push({ userId: pref.user_id, sent: response.ok, alerts: unsent.length })
  }
  return new Response(JSON.stringify({ ok: true, result }), { headers: jsonHeaders })
})
