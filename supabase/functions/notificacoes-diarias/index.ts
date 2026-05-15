import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY   = Deno.env.get('RESEND_API_KEY') ?? ''
const ADMIN_EMAIL  = Deno.env.get('ADMIN_EMAIL') ?? ''
const FROM_EMAIL   = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev'

Deno.serve(async () => {
  if (!RESEND_KEY || !ADMIN_EMAIL) {
    return new Response('Variáveis de ambiente não configuradas', { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Data atual no horário de Brasília
  const hoje  = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const amanhaTmp = new Date(); amanhaTmp.setDate(amanhaTmp.getDate() + 1)
  const amanha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(amanhaTmp)

  const { data: rows, error } = await supabase
    .from('crm_data')
    .select('key, data')
    .in('key', ['agendamentos', 'clientes', 'servicos', 'produtos', 'atividades', 'config'])

  if (error || !rows) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  const db: Record<string, any[]> = {}
  let config: any = {}
  for (const row of rows) {
    if (row.key === 'config') config = row.data ?? {}
    else db[row.key] = Array.isArray(row.data) ? row.data : []
  }

  const get = (entity: string, id: string) =>
    (db[entity] ?? []).find((r: any) => r.id === id)

  const agHoje = (db.agendamentos ?? [])
    .filter((a: any) => a.data === hoje && a.status !== 'Cancelado')
    .sort((a: any, b: any) => a.hora.localeCompare(b.hora))

  const agAmanha = (db.agendamentos ?? [])
    .filter((a: any) => a.data === amanha && a.status !== 'Cancelado')
    .sort((a: any, b: any) => a.hora.localeCompare(b.hora))

  const estoqueAlerta = (db.produtos ?? [])
    .filter((p: any) => p.ativo && p.estoqueAtual <= p.estoqueMin)
    .sort((a: any, b: any) => a.estoqueAtual - b.estoqueAtual)

  const prioOrder = (p: string) => p === 'Alta' ? 0 : p === 'Média' ? 1 : 2

  const atHoje = (db.atividades ?? [])
    .filter((a: any) => a.status === 'Pendente' && a.data === hoje)
    .sort((a: any, b: any) => prioOrder(a.prioridade) - prioOrder(b.prioridade))

  const atAtrasadas = (db.atividades ?? [])
    .filter((a: any) => a.status === 'Pendente' && a.data < hoje)
    .sort((a: any, b: any) => a.data.localeCompare(b.data))

  const empresa   = config.empresa || 'Fedrika'
  const nomeAdmin = config.usuario?.nome || 'Administrador'

  const html = buildEmail({
    empresa, nomeAdmin, hoje, amanha,
    agHoje, agAmanha, estoqueAlerta, atHoje, atAtrasadas, get,
  })

  const totalAtendimentos = agHoje.length
  const subject = totalAtendimentos > 0
    ? `📅 ${formatDateShort(hoje)} — ${totalAtendimentos} atendimento${totalAtendimentos !== 1 ? 's' : ''} hoje | ${empresa}`
    : `📅 ${formatDateShort(hoje)} — Sem atendimentos hoje | ${empresa}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${empresa} CRM <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject,
      html,
    }),
  })

  const result = await res.json()
  return new Response(JSON.stringify({ ok: res.ok, date: hoje, result }), {
    headers: { 'Content-Type': 'application/json' },
    status: res.ok ? 200 : 500,
  })
})

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDateFull(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const days   = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira',
                  'Quinta-feira','Sexta-feira','Sábado']
  const dt = new Date(y, m - 1, day)
  return `${days[dt.getDay()]}, ${day} de ${months[m - 1]} de ${y}`
}

function formatDateShort(d: string) {
  return d.split('-').reverse().join('/')
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─────────────────────────────────────────────
// Email builder
// ─────────────────────────────────────────────

function buildEmail({ empresa, nomeAdmin, hoje, amanha, agHoje, agAmanha,
                      estoqueAlerta, atHoje, atAtrasadas, get }: any): string {

  const totalReceita = agHoje.reduce((s: number, a: any) => s + (a.valorServico || 0), 0)
  const hasAtividades = atHoje.length > 0 || atAtrasadas.length > 0

  // ── Agenda rows ──────────────────────────────
  function agendaRows(list: any[]) {
    if (list.length === 0)
      return `<tr><td colspan="4" style="padding:16px;color:#999;text-align:center;font-size:13px">Nenhum agendamento</td></tr>`
    return list.map((a: any) => {
      const cl = get('clientes', a.clienteId)
      const sv = get('servicos',  a.servicoId)
      const statusColor =
        a.status === 'Confirmado' ? { bg: '#d1fae5', fg: '#065f46' } :
        a.status === 'Concluído'  ? { bg: '#cffafe', fg: '#155e75' } :
                                    { bg: '#e0e7ff', fg: '#3730a3' }
      return `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f3ede0;font-weight:700;color:#C9A020;white-space:nowrap">${a.hora}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3ede0;font-weight:600;color:#1e1a16">${cl?.nome || '—'}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3ede0;color:#555">${sv?.nome || '—'}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3ede0">
          <span style="background:${statusColor.bg};color:${statusColor.fg};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">${a.status}</span>
        </td>
      </tr>`
    }).join('')
  }

  // ── Atividade rows ────────────────────────────
  function atividadeRows(list: any[], atrasadas = false) {
    return list.map((a: any) => {
      const cl = get('clientes', a.clienteId)
      const prioColor = a.prioridade === 'Alta' ? '#dc2626' : a.prioridade === 'Média' ? '#d97706' : '#6b7280'
      return `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid #fce7e7">
          <span style="background:${prioColor};color:#fff;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;margin-right:6px">${a.prioridade}</span>
          ${atrasadas ? `<span style="color:#dc2626;font-size:11px;font-weight:700;margin-right:4px">⚠ ATRASADA — ${formatDateShort(a.data)}</span>` : ''}
          <span style="color:#1e1a16">${a.titulo}</span>
        </td>
        <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;color:#888;font-size:12px;white-space:nowrap">${cl?.nome || '—'}</td>
      </tr>`
    }).join('')
  }

  // ── Estoque rows ──────────────────────────────
  const estoqueRowsHtml = estoqueAlerta.map((p: any) => `
    <tr>
      <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;font-weight:600;color:#1e1a16">${p.nome}</td>
      <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;font-weight:700;color:#dc2626">${p.estoqueAtual} ${p.unidade || 'un'}</td>
      <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;color:#888;font-size:12px">Mínimo: ${p.estoqueMin} ${p.unidade || 'un'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Resumo do Dia — ${empresa}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<div style="max-width:620px;margin:0 auto;padding:20px 12px">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#16141e 0%,#2a2030 100%);border-radius:14px 14px 0 0;padding:30px 32px 22px;text-align:center">
    <div style="color:#C9A020;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;font-weight:600">${empresa}</div>
    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px">Resumo do Dia</h1>
    <p style="margin:6px 0 0;color:#aaa;font-size:13px">${formatDateFull(hoje)}</p>
  </div>

  <!-- Greeting bar -->
  <div style="background:#ffffff;padding:16px 24px;border-left:4px solid #C9A020;border-right:1px solid #ece6da;border-bottom:1px solid #ece6da">
    <p style="margin:0;color:#444;font-size:14px">Bom dia, <strong style="color:#1e1a16">${nomeAdmin}</strong>! Seu resumo de hoje está pronto.</p>
  </div>

  <!-- KPIs -->
  <div style="background:#ffffff;border-left:1px solid #ece6da;border-right:1px solid #ece6da;border-bottom:1px solid #ece6da;padding:20px 24px">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td width="33%" style="padding:0 6px 0 0">
          <div style="background:#fdf8e8;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#C9A020">${agHoje.length}</div>
            <div style="font-size:11px;color:#888;margin-top:3px">Atendimentos hoje</div>
          </div>
        </td>
        <td width="33%" style="padding:0 3px">
          <div style="background:#fdf8e8;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:#C9A020">${fmtBRL(totalReceita)}</div>
            <div style="font-size:11px;color:#888;margin-top:3px">Receita prevista</div>
          </div>
        </td>
        <td width="33%" style="padding:0 0 0 6px">
          <div style="background:${estoqueAlerta.length > 0 ? '#fff5f5' : '#f0fdf4'};border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:${estoqueAlerta.length > 0 ? '#dc2626' : '#16a34a'}">${estoqueAlerta.length}</div>
            <div style="font-size:11px;color:#888;margin-top:3px">Alerta${estoqueAlerta.length !== 1 ? 's' : ''} de estoque</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Agenda hoje -->
  <div style="background:#ffffff;margin-top:10px;border-radius:10px;overflow:hidden;border:1px solid #ece6da">
    <div style="padding:14px 20px;background:#16141e;display:flex;align-items:center">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><span style="color:#fff;font-weight:700;font-size:14px">📅 Agenda de Hoje</span></td>
        <td align="right">
          ${agHoje.length > 0 ? `<span style="background:#C9A020;color:#16141e;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${agHoje.length} agend.</span>` : ''}
        </td>
      </tr></table>
    </div>
    <table width="100%" cellspacing="0" cellpadding="0">
      <thead><tr style="background:#faf6ee">
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #f3ede0">HORA</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #f3ede0">CLIENTE</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #f3ede0">SERVIÇO</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #f3ede0">STATUS</th>
      </tr></thead>
      <tbody>${agendaRows(agHoje)}</tbody>
    </table>
  </div>

  ${agAmanha.length > 0 ? `
  <!-- Agenda amanhã -->
  <div style="background:#ffffff;margin-top:8px;border-radius:10px;overflow:hidden;border:1px solid #ece6da">
    <div style="padding:14px 20px;background:#2a2030">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><span style="color:#ddd;font-weight:700;font-size:14px">🔮 Amanhã — Prévia</span></td>
        <td align="right"><span style="background:#444;color:#ccc;padding:2px 10px;border-radius:20px;font-size:11px">${agAmanha.length} agend.</span></td>
      </tr></table>
    </div>
    <table width="100%" cellspacing="0" cellpadding="0">
      <thead><tr style="background:#faf6ee">
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #f3ede0">HORA</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #f3ede0">CLIENTE</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #f3ede0">SERVIÇO</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #f3ede0">STATUS</th>
      </tr></thead>
      <tbody>${agendaRows(agAmanha)}</tbody>
    </table>
  </div>` : ''}

  ${hasAtividades ? `
  <!-- Atividades -->
  <div style="background:#ffffff;margin-top:8px;border-radius:10px;overflow:hidden;border:1px solid #fecaca">
    <div style="padding:14px 20px;background:${atAtrasadas.length > 0 ? '#7f1d1d' : '#1c1200'}">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><span style="color:#fff;font-weight:700;font-size:14px">📋 Atividades Pendentes</span></td>
        <td align="right">
          ${atAtrasadas.length > 0 ? `<span style="background:#dc2626;color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${atAtrasadas.length} atrasada${atAtrasadas.length !== 1 ? 's' : ''}</span>` : ''}
        </td>
      </tr></table>
    </div>
    <table width="100%" cellspacing="0" cellpadding="0">
      <thead><tr style="background:#fff5f5">
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #fce7e7">ATIVIDADE</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #fce7e7">CLIENTE</th>
      </tr></thead>
      <tbody>
        ${atividadeRows(atAtrasadas, true)}
        ${atividadeRows(atHoje, false)}
      </tbody>
    </table>
  </div>` : ''}

  ${estoqueAlerta.length > 0 ? `
  <!-- Estoque crítico -->
  <div style="background:#ffffff;margin-top:8px;border-radius:10px;overflow:hidden;border:1px solid #fecaca">
    <div style="padding:14px 20px;background:#7f1d1d">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><span style="color:#fff;font-weight:700;font-size:14px">⚠️ Estoque Crítico</span></td>
        <td align="right"><span style="background:#dc2626;color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${estoqueAlerta.length} produto${estoqueAlerta.length !== 1 ? 's' : ''}</span></td>
      </tr></table>
    </div>
    <table width="100%" cellspacing="0" cellpadding="0">
      <thead><tr style="background:#fff5f5">
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #fce7e7">PRODUTO</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #fce7e7">ESTOQUE ATUAL</th>
        <th style="padding:8px 16px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:1px solid #fce7e7">MÍNIMO</th>
      </tr></thead>
      <tbody>${estoqueRowsHtml}</tbody>
    </table>
  </div>` : ''}

  <!-- Footer -->
  <div style="text-align:center;padding:24px 16px 8px;color:#aaa;font-size:12px">
    <p style="margin:0">Email automático enviado pelo CRM ${empresa}</p>
    <p style="margin:10px 0 0">
      <a href="https://bikowsengenharia.github.io/FEDRIKA-CRM/" style="color:#C9A020;text-decoration:none;font-weight:600">Acessar o CRM →</a>
    </p>
  </div>

</div>
</body>
</html>`
}
