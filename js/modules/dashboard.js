/* =============================================
   Dashboard
   ============================================= */
const Dashboard = (() => {

  function render() {
    const cfg = DB.getConfig();
    const hoje = Utils.today();
    const ym = Utils.thisMonth();

    const agendamentos = DB.getAll('agendamentos');
    const clientes = DB.getAll('clientes');
    const lancamentos = DB.getAll('lancamentos');
    const metas = DB.getAll('metas');
    const atividades = DB.getAll('atividades');
    const servicos = DB.getAll('servicos');
    const funcionarios = DB.getAll('funcionarios');

    const agHoje = agendamentos.filter(a=>a.data===hoje && a.status!=='Cancelado');
    const agMes = Utils.filterByMonth(agendamentos,'data',ym).filter(a=>a.status==='Concluído');
    const lancMes = Utils.filterByMonth(lancamentos,'data',ym);
    const recMes = lancMes.filter(l=>l.tipo==='receita').reduce((s,l)=>s+l.valor,0);
    const despMes = lancMes.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+l.valor,0);
    const saldoMes = recMes - despMes;
    const clientesAtivos = clientes.filter(c=>c.ativo).length;
    const novosClientesMes = Utils.filterByMonth(clientes,'createdAt',ym).length;
    const ticketMedio = agMes.length > 0 ? agMes.reduce((s,a)=>s+(a.valorPago||0),0)/agMes.length : 0;
    const atendsMes = agMes.length;
    const pendentes = atividades.filter(a=>a.status==='Pendente').length;

    // Próximos agendamentos hoje
    const proxAg = agendamentos.filter(a=>a.data===hoje&&a.status!=='Cancelado'&&a.status!=='Concluído').sort((a,b)=>a.hora.localeCompare(b.hora)).slice(0,5);

    // Top serviços do mês
    const servCount = {};
    agMes.forEach(a=>{ servCount[a.servicoId]=(servCount[a.servicoId]||0)+1; });
    const topServs = Object.entries(servCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,cnt])=>{
      const s=servicos.find(s=>s.id===id); return {nome:s?s.nome:'?',cnt,receita:agMes.filter(a=>a.servicoId===id).reduce((s,a)=>s+(a.valorPago||0),0)};
    });

    // Chart receita últimos 6 meses
    const chartData = getUltimos6Meses(lancamentos);

    // Aniversariantes do mês
    const mesAtual = new Date().getMonth()+1;
    const aniversariantes = clientes.filter(c=>c.nascimento && new Date(c.nascimento).getMonth()+1===mesAtual);

    document.getElementById('dashContent').innerHTML = `
      <!-- KPIs -->
      <div class="card-grid card-grid-4 mb-4">
        <div class="kpi-card">
          <div class="kpi-icon purple">💜</div>
          <div class="kpi-body">
            <div class="kpi-label">Faturamento do Mês</div>
            <div class="kpi-value">${Utils.fmtBRL(recMes)}</div>
            <div class="kpi-sub">Despesas: ${Utils.fmtBRL(despMes)} · Saldo: <span style="color:${saldoMes>=0?'var(--green)':'var(--red)'}">${Utils.fmtBRL(saldoMes)}</span></div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon pink">📅</div>
          <div class="kpi-body">
            <div class="kpi-label">Agendamentos Hoje</div>
            <div class="kpi-value">${agHoje.length}</div>
            <div class="kpi-sub">${atendsMes} concluídos no mês</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon teal">👥</div>
          <div class="kpi-body">
            <div class="kpi-label">Clientes Ativos</div>
            <div class="kpi-value">${clientesAtivos}</div>
            <div class="kpi-sub">+${novosClientesMes} novos este mês</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon gold">🎯</div>
          <div class="kpi-body">
            <div class="kpi-label">Ticket Médio</div>
            <div class="kpi-value">${Utils.fmtBRL(ticketMedio)}</div>
            <div class="kpi-sub">${pendentes} atividades pendentes</div>
          </div>
        </div>
      </div>

      <div class="card-grid card-grid-3 mb-4">
        <!-- Chart faturamento -->
        <div class="card" style="grid-column:span 2">
          <div class="card-title">Faturamento — Últimos 6 Meses</div>
          <div class="chart-area" id="dashChart"></div>
          <div style="display:flex;gap:16px;margin-top:8px;font-size:12px">
            <span><span class="dot dot-purple" style="display:inline-block;margin-right:4px"></span>Receita</span>
            <span><span class="dot dot-red" style="display:inline-block;margin-right:4px"></span>Despesa</span>
          </div>
        </div>
        <!-- Metas resumo -->
        <div class="card">
          <div class="card-title">Metas do Mês</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${metas.slice(0,4).map(m=>{
              const pct=Math.min(Math.round((m.atual/m.valor)*100),100);
              return `<div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:12px;font-weight:600">${m.titulo}</span>
                  <span style="font-size:12px;color:var(--text-muted)">${pct}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill ${Utils.getPctColor(pct)}" style="width:${pct}%"></div></div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${m.atual}${m.unidade==='R$'?' (R$)':''} / ${m.valor} ${m.unidade}</div>
              </div>`;
            }).join('')}
            <button class="btn btn-outline btn-sm" onclick="App.navigateTo('metas')">Ver todas as metas</button>
          </div>
        </div>
      </div>

      <div class="card-grid card-grid-3">
        <!-- Agenda hoje -->
        <div class="card">
          <div class="card-title">Agenda de Hoje <button class="btn btn-primary btn-sm" onclick="App.navigateTo('agenda')">Ver agenda</button></div>
          ${proxAg.length===0?'<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhum agendamento hoje</p></div>':
          `<div style="display:flex;flex-direction:column;gap:8px">
            ${proxAg.map(a=>{
              const cl=DB.get('clientes',a.clienteId);
              const sv=DB.get('servicos',a.servicoId);
              const fn=DB.get('funcionarios',a.funcionarioId);
              return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:var(--bg)">
                <div style="font-size:13px;font-weight:700;color:var(--primary);min-width:40px">${a.hora}</div>
                <div class="avatar avatar-sm">${Utils.initials(cl?.nome||'?')}</div>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600">${cl?.nome||'—'}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${sv?.nome||'—'} · ${fn?.nome||'—'}</div>
                </div>
                <span class="badge ${getStatusBadge(a.status)}">${a.status}</span>
              </div>`;
            }).join('')}
          </div>`}
        </div>

        <!-- Top serviços -->
        <div class="card">
          <div class="card-title">Top Serviços do Mês</div>
          ${topServs.length===0?'<div class="empty-state"><p>Nenhum serviço concluído</p></div>':
          `<div style="display:flex;flex-direction:column;gap:10px">
            ${topServs.map((s,i)=>`<div style="display:flex;align-items:center;gap:10px">
              <div style="width:20px;height:20px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600">${s.nome}</div>
                <div style="font-size:11px;color:var(--text-muted)">${s.cnt} atendimento(s) · ${Utils.fmtBRL(s.receita)}</div>
              </div>
            </div>`).join('')}
          </div>`}
        </div>

        <!-- Aniversariantes + Atividades -->
        <div class="card">
          <div class="card-title">Aniversariantes do Mês 🎂</div>
          ${aniversariantes.length===0?'<p style="font-size:12px;color:var(--text-muted)">Nenhum aniversariante este mês</p>':
          `<div style="display:flex;flex-direction:column;gap:8px">
            ${aniversariantes.slice(0,4).map(c=>{
              const dia=c.nascimento.slice(8);
              return `<div style="display:flex;align-items:center;gap:8px">
                <div class="avatar avatar-sm">${Utils.initials(c.nome)}</div>
                <div style="flex:1"><div style="font-size:13px;font-weight:600">${c.nome}</div><div style="font-size:11px;color:var(--text-muted)">Dia ${dia}</div></div>
                <span style="font-size:18px">🎂</span>
              </div>`;
            }).join('')}
          </div>`}
          <div class="divider"></div>
          <div style="font-size:13px;font-weight:700;margin-bottom:8px">Atividades Pendentes (${pendentes})</div>
          ${atividades.filter(a=>a.status==='Pendente').slice(0,3).map(a=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span class="badge ${a.prioridade==='Alta'?'badge-red':a.prioridade==='Média'?'badge-gold':'badge-gray'}">${a.prioridade}</span>
              <span style="font-size:12px;flex:1">${a.titulo}</span>
            </div>
          `).join('')}
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('atividades')" style="margin-top:4px">Ver atividades</button>
        </div>
      </div>
    `;

    // Render chart
    renderChart(chartData);
  }

  function getStatusBadge(s){
    return {Agendado:'badge-blue',Confirmado:'badge-green',Concluído:'badge-teal',Cancelado:'badge-red',Faltou:'badge-gold'}[s]||'badge-gray';
  }

  function getUltimos6Meses(lancamentos){
    const data=[];
    for(let i=5;i>=0;i--){
      const d=new Date(); d.setMonth(d.getMonth()-i);
      const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const lm=Utils.filterByMonth(lancamentos,'data',ym);
      data.push({
        label:d.toLocaleString('pt-BR',{month:'short'}),
        receita:lm.filter(l=>l.tipo==='receita').reduce((s,l)=>s+l.valor,0),
        despesa:lm.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+l.valor,0),
      });
    }
    return data;
  }

  function renderChart(data){
    const el=document.getElementById('dashChart');
    if(!el)return;
    const max=Math.max(...data.map(d=>Math.max(d.receita,d.despesa)),1);
    el.innerHTML=data.map(d=>`
      <div class="chart-bar-wrap">
        <div style="display:flex;gap:2px;align-items:flex-end;height:160px">
          <div class="chart-bar" style="background:var(--primary);opacity:.85;height:${Math.round(d.receita/max*100)}%;flex:1" title="Receita: ${Utils.fmtBRL(d.receita)}"></div>
          <div class="chart-bar" style="background:var(--red);opacity:.7;height:${Math.round(d.despesa/max*100)}%;flex:1" title="Despesa: ${Utils.fmtBRL(d.despesa)}"></div>
        </div>
        <div class="chart-bar-label">${d.label}</div>
      </div>
    `).join('');
  }

  return { render };
})();
