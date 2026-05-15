/* =============================================
   Relatórios
   ============================================= */
const Relatorios = (() => {
  let mesAtual = Utils.thisMonth();

  function render() {
    document.getElementById('relatoriosContent').innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <label style="font-size:13px;font-weight:600">Período:</label>
        <input type="month" value="${mesAtual}" onchange="Relatorios.changeMes(this.value)" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
      </div>
      <div id="relBody"></div>
    `;
    renderAll();
  }

  function renderAll() {
    const ym = mesAtual;
    const lancamentos = DB.getAll('lancamentos');
    const agendamentos = DB.getAll('agendamentos');
    const clientes = DB.getAll('clientes');
    const servicos = DB.getAll('servicos');
    const funcionarios = DB.getAll('funcionarios');

    const lMes = Utils.filterByMonth(lancamentos,'data',ym);
    const agMes = Utils.filterByMonth(agendamentos,'data',ym);
    const agConc = agMes.filter(a=>a.status==='Concluído');
    const agCanc = agMes.filter(a=>a.status==='Cancelado'||a.status==='Faltou');

    const receitas = lMes.filter(l=>l.tipo==='receita').reduce((s,l)=>s+l.valor,0);
    const despesas = lMes.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+l.valor,0);
    const ticketMedio = agConc.length>0 ? agConc.reduce((s,a)=>s+(a.valorPago||0),0)/agConc.length : 0;
    const taxaCancelamento = agMes.length>0 ? Math.round((agCanc.length/agMes.length)*100) : 0;

    // Receita por serviço
    const recByServ = {};
    agConc.forEach(a=>{ recByServ[a.servicoId]=(recByServ[a.servicoId]||0)+(a.valorPago||0); });
    const topServs = Object.entries(recByServ).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,v])=>({nome:servicos.find(s=>s.id===id)?.nome||'?',valor:v}));

    // Por profissional
    const byFunc = {};
    agConc.forEach(a=>{ if(!byFunc[a.funcionarioId])byFunc[a.funcionarioId]={atend:0,receita:0}; byFunc[a.funcionarioId].atend++; byFunc[a.funcionarioId].receita+=(a.valorPago||0); });

    // Por forma de pagamento
    const byPgto = {};
    agConc.forEach(a=>{ const k=a.formaPagamento||'Não informado'; byPgto[k]=(byPgto[k]||0)+(a.valorPago||0); });

    // Novos clientes no mês
    const novosClientes = Utils.filterByMonth(clientes,'createdAt',ym).length;

    // Avaliação média
    const avaliacoes = agConc.filter(a=>a.avaliacao).map(a=>a.avaliacao);
    const avalMedia = avaliacoes.length>0 ? (avaliacoes.reduce((s,v)=>s+v,0)/avaliacoes.length).toFixed(1) : null;

    // Receita por categoria
    const recByCat = {};
    lMes.filter(l=>l.tipo==='receita').forEach(l=>{ recByCat[l.categoria]=(recByCat[l.categoria]||0)+l.valor; });

    document.getElementById('relBody').innerHTML = `
      <!-- KPIs do mês -->
      <div class="card-grid card-grid-4 mb-4">
        <div class="kpi-card"><div class="kpi-icon purple">💜</div><div class="kpi-body"><div class="kpi-label">Faturamento</div><div class="kpi-value">${Utils.fmtBRL(receitas)}</div><div class="kpi-sub">Despesas: ${Utils.fmtBRL(despesas)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon pink">📅</div><div class="kpi-body"><div class="kpi-label">Atendimentos</div><div class="kpi-value">${agConc.length}</div><div class="kpi-sub">${agMes.length} agendados</div></div></div>
        <div class="kpi-card"><div class="kpi-icon teal">💰</div><div class="kpi-body"><div class="kpi-label">Ticket Médio</div><div class="kpi-value">${Utils.fmtBRL(ticketMedio)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon gold">⭐</div><div class="kpi-body"><div class="kpi-label">Avaliação Média</div><div class="kpi-value">${avalMedia||'—'}</div><div class="kpi-sub">${avaliacoes.length} avaliações</div></div></div>
      </div>
      <div class="card-grid card-grid-2 mb-4">
        <!-- Receita por serviço -->
        <div class="card">
          <div class="card-title">Receita por Serviço</div>
          ${topServs.length===0?'<p style="color:var(--text-muted);font-size:13px">Sem dados neste período</p>':
          `<div style="display:flex;flex-direction:column;gap:10px">
            ${topServs.map(s=>{
              const pct=receitas>0?Math.round(s.valor/receitas*100):0;
              return `<div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:500">${s.nome}</span>
                  <span style="font-size:13px;font-weight:700">${Utils.fmtBRL(s.valor)} (${pct}%)</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
              </div>`;
            }).join('')}
          </div>`}
        </div>

        <!-- Por profissional -->
        <div class="card">
          <div class="card-title">Desempenho por Profissional</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Profissional</th><th>Atend.</th><th>Receita</th><th>Comissão</th></tr></thead>
              <tbody>
                ${Object.entries(byFunc).length===0?`<tr><td colspan="4"><p style="color:var(--text-muted);font-size:13px;padding:8px">Sem dados</p></td></tr>`:
                Object.entries(byFunc).sort((a,b)=>b[1].receita-a[1].receita).map(([fid,d])=>{
                  const fn=DB.get('funcionarios',fid);
                  const comissao=fn?d.receita*(fn.comissao/100):0;
                  return `<tr>
                    <td><div style="display:flex;align-items:center;gap:6px"><div class="avatar avatar-sm" style="background:${fn?.cor||'var(--primary)'}1a;color:${fn?.cor||'var(--primary)'}">${Utils.initials(fn?.nome||'?')}</div>${fn?.nome||'—'}</div></td>
                    <td><strong>${d.atend}</strong></td>
                    <td>${Utils.fmtBRL(d.receita)}</td>
                    <td style="color:var(--green)">${Utils.fmtBRL(comissao)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card-grid card-grid-3 mb-4">
        <!-- Formas de pagamento -->
        <div class="card">
          <div class="card-title">Formas de Pagamento</div>
          ${Object.keys(byPgto).length===0?'<p style="color:var(--text-muted);font-size:13px">Sem dados</p>':
          `<div style="display:flex;flex-direction:column;gap:8px">
            ${Object.entries(byPgto).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
              const pct=receitas>0?Math.round(v/receitas*100):0;
              return `<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${k}</span><span>${Utils.fmtBRL(v)} (${pct}%)</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:var(--teal)"></div></div></div>`;
            }).join('')}
          </div>`}
        </div>

        <!-- Índices -->
        <div class="card">
          <div class="card-title">Índices do Período</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
            <div style="display:flex;justify-content:space-between"><span>Margem Bruta</span><strong style="color:${receitas-despesas>=0?'var(--green)':'var(--red)'}">${receitas>0?Math.round(((receitas-despesas)/receitas)*100):0}%</strong></div>
            <div style="display:flex;justify-content:space-between"><span>Taxa Cancelamento</span><strong style="color:${taxaCancelamento>20?'var(--red)':taxaCancelamento>10?'var(--gold)':'var(--green)'}">${taxaCancelamento}%</strong></div>
            <div style="display:flex;justify-content:space-between"><span>Taxa Conclusão</span><strong style="color:var(--green)">${agMes.length>0?Math.round((agConc.length/agMes.length)*100):0}%</strong></div>
            <div style="display:flex;justify-content:space-between"><span>Novos Clientes</span><strong>${novosClientes}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>Total Agendamentos</span><strong>${agMes.length}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>Saldo do Mês</span><strong style="color:${receitas-despesas>=0?'var(--green)':'var(--red)'}">${Utils.fmtBRL(receitas-despesas)}</strong></div>
          </div>
        </div>

        <!-- Categorias de receita -->
        <div class="card">
          <div class="card-title">Receita por Categoria</div>
          ${Object.keys(recByCat).length===0?'<p style="color:var(--text-muted);font-size:13px">Sem dados</p>':
          `<div style="display:flex;flex-direction:column;gap:8px">
            ${Object.entries(recByCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
              const pct=receitas>0?Math.round(v/receitas*100):0;
              return `<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${k}</span><span>${Utils.fmtBRL(v)} (${pct}%)</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:var(--accent)"></div></div></div>`;
            }).join('')}
          </div>`}
        </div>
      </div>

      <!-- Top clientes -->
      <div class="card">
        <div class="card-title">Top 10 Clientes (por Valor Gasto Total)</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Visitas</th><th>Total Gasto</th><th>Ticket Médio</th><th>Tags</th><th>Última Visita</th></tr></thead>
            <tbody>
              ${DB.getAll('clientes').filter(c=>c.ativo).sort((a,b)=>(b.totalGasto||0)-(a.totalGasto||0)).slice(0,10).map((c,i)=>{
                const ticket=c.totalVisitas>0?(c.totalGasto/c.totalVisitas):0;
                const ags=DB.getAll('agendamentos').filter(a=>a.clienteId===c.id&&a.status==='Concluído').sort((a,b)=>b.data.localeCompare(a.data));
                return `<tr>
                  <td><strong>${i+1}</strong></td>
                  <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar avatar-sm">${Utils.initials(c.nome)}</div>${Utils.escapeHtml(c.nome)}</div></td>
                  <td>${c.totalVisitas||0}</td>
                  <td style="font-weight:700">${Utils.fmtBRL(c.totalGasto||0)}</td>
                  <td>${Utils.fmtBRL(ticket)}</td>
                  <td>${(c.tags||[]).map(t=>`<span class="badge badge-purple" style="margin-right:2px">${t}</span>`).join('')}</td>
                  <td>${ags.length>0?Utils.fmtDate(ags[0].data):'—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function changeMes(v) { mesAtual=v; renderAll(); }

  return { render, changeMes };
})();
