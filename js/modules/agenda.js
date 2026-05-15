/* =============================================
   Agenda
   ============================================= */
const Agenda = (() => {
  let currentDate = new Date();
  let viewMode = 'month'; // month | day | list
  let editId = null;

  const statusBadge = s => ({Agendado:'badge-blue',Confirmado:'badge-green',Concluído:'badge-teal',Cancelado:'badge-red',Faltou:'badge-gold'}[s]||'badge-gray');

  function render() {
    document.getElementById('agendaContent').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="Agenda.prevMonth()">‹</button>
          <span id="calMonthLabel" style="font-size:15px;font-weight:700;min-width:160px;text-align:center"></span>
          <button class="btn btn-outline btn-sm" onclick="Agenda.nextMonth()">›</button>
          <button class="btn btn-ghost btn-sm" onclick="Agenda.goToday()">Hoje</button>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn ${viewMode==='month'?'btn-primary':'btn-outline'} btn-sm" onclick="Agenda.setView('month')">Mês</button>
          <button class="btn ${viewMode==='list'?'btn-primary':'btn-outline'} btn-sm" onclick="Agenda.setView('list')">Lista</button>
          <button class="btn btn-primary btn-sm" onclick="Agenda.openNew()">+ Agendar</button>
        </div>
      </div>
      <div id="calBody"></div>
      <div id="modalAgendamento" class="modal-overlay hidden">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3 id="modalAgTitle">Novo Agendamento</h3>
            <button class="modal-close" onclick="Agenda.closeModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label>Cliente *</label>
                <select id="agClienteId" required></select>
              </div>
              <div class="form-group">
                <label>Serviço *</label>
                <select id="agServicoId" required onchange="Agenda.onServicoChange()"></select>
              </div>
              <div class="form-group">
                <label>Profissional</label>
                <select id="agFuncionarioId"></select>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select id="agStatus">
                  <option>Agendado</option><option>Confirmado</option><option>Concluído</option><option>Cancelado</option><option>Faltou</option>
                </select>
              </div>
              <div class="form-group">
                <label>Data *</label>
                <input type="date" id="agData" value="${Utils.today()}">
              </div>
              <div class="form-group">
                <label>Hora *</label>
                <input type="time" id="agHora" value="09:00">
              </div>
              <div class="form-group">
                <label>Duração (min)</label>
                <input type="number" id="agDuracao" value="60" min="15" step="15">
              </div>
              <div class="form-group">
                <label>Valor do Serviço (R$)</label>
                <input type="number" id="agValorServico" step="0.01" min="0">
              </div>
              <div class="form-group">
                <label>Desconto (R$)</label>
                <input type="number" id="agDesconto" step="0.01" min="0" value="0">
              </div>
              <div class="form-group">
                <label>Valor Pago (R$)</label>
                <input type="number" id="agValorPago" step="0.01" min="0">
              </div>
              <div class="form-group">
                <label>Forma de Pagamento</label>
                <select id="agFormaPagamento">
                  <option value="">— Não informado —</option>
                  <option>Dinheiro</option><option>Cartão de Crédito</option><option>Cartão de Débito</option><option>PIX</option><option>Transferência</option>
                </select>
              </div>
              <div class="form-group">
                <label>Avaliação (1-5)</label>
                <input type="number" id="agAvaliacao" min="1" max="5" placeholder="Ex: 5">
              </div>
            </div>
            <div class="form-group mt-2">
              <label>Observações</label>
              <textarea id="agObs" rows="2"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Agenda.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Agenda.save()">Salvar</button>
          </div>
        </div>
      </div>
    `;
    renderView();
  }

  function renderView() {
    const label = currentDate.toLocaleString('pt-BR', {month:'long', year:'numeric'});
    document.getElementById('calMonthLabel').textContent = label.charAt(0).toUpperCase()+label.slice(1);
    if (viewMode==='month') renderMonth();
    else renderList();
  }

  function renderMonth() {
    const ag = DB.getAll('agendamentos');
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const todayStr = Utils.today();

    let html = `<div class="cal-grid">`;
    ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d=>{ html+=`<div class="cal-dow">${d}</div>`; });

    // empty before
    for(let i=0;i<firstDay;i++) html+=`<div class="cal-day other-month"></div>`;

    for(let d=1;d<=daysInMonth;d++){
      const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayAg=ag.filter(a=>a.data===dateStr&&a.status!=='Cancelado').sort((a,b)=>a.hora.localeCompare(b.hora));
      const isToday=dateStr===todayStr;
      html+=`<div class="cal-day${isToday?' today':''}" onclick="Agenda.selectDay('${dateStr}')">
        <div class="cal-day-num">${d}</div>
        ${dayAg.slice(0,3).map(a=>{
          const cl=DB.get('clientes',a.clienteId);
          return `<div class="cal-event ${a.status.toLowerCase().replace('í','i').replace('ó','o')}" title="${cl?.nome||'?'} — ${a.hora}">${a.hora} ${cl?.nome?.split(' ')[0]||'?'}</div>`;
        }).join('')}
        ${dayAg.length>3?`<div style="font-size:10px;color:var(--primary)">+${dayAg.length-3} mais</div>`:''}
      </div>`;
    }
    html+=`</div>`;
    document.getElementById('calBody').innerHTML=html;
  }

  function renderList() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const ym = `${year}-${String(month+1).padStart(2,'0')}`;
    const ag = Utils.filterByMonth(DB.getAll('agendamentos'),'data',ym).sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));

    if(ag.length===0){
      document.getElementById('calBody').innerHTML=`<div class="empty-state"><div class="empty-icon">📅</div><h3>Nenhum agendamento neste mês</h3></div>`;
      return;
    }

    const grouped = {};
    ag.forEach(a=>{ if(!grouped[a.data])grouped[a.data]=[]; grouped[a.data].push(a); });

    let html='<div style="display:flex;flex-direction:column;gap:16px">';
    Object.entries(grouped).forEach(([date,list])=>{
      html+=`<div>
        <div style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">${Utils.fmtDate(date)}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Hora</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Status</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            ${list.map(a=>{
              const cl=DB.get('clientes',a.clienteId);
              const sv=DB.get('servicos',a.servicoId);
              const fn=DB.get('funcionarios',a.funcionarioId);
              return `<tr>
                <td><strong>${a.hora}</strong></td>
                <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar avatar-sm">${Utils.initials(cl?.nome||'?')}</div>${cl?.nome||'—'}</div></td>
                <td>${sv?.nome||'—'}</td>
                <td>${fn?.nome||'—'}</td>
                <td><span class="badge ${statusBadge(a.status)}">${a.status}</span></td>
                <td>${Utils.fmtBRL(a.valorPago||a.valorServico||0)}</td>
                <td style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="Agenda.openEdit('${a.id}')">✎</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Agenda.confirmDelete('${a.id}')">✕</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>`;
    });
    html+='</div>';
    document.getElementById('calBody').innerHTML=html;
  }

  function selectDay(dateStr) {
    // Switch to list and filter
    currentDate = new Date(dateStr+'T12:00:00');
    viewMode = 'list';
    renderView();
  }

  function prevMonth() { currentDate.setMonth(currentDate.getMonth()-1); renderView(); }
  function nextMonth() { currentDate.setMonth(currentDate.getMonth()+1); renderView(); }
  function goToday() { currentDate = new Date(); renderView(); }
  function setView(v) { viewMode=v; render(); }

  function openNew(dateStr='') {
    editId=null;
    document.getElementById('modalAgTitle').textContent='Novo Agendamento';
    fillSelects();
    resetForm();
    if(dateStr) document.getElementById('agData').value=dateStr;
    document.getElementById('modalAgendamento').classList.remove('hidden');
  }

  function openEdit(id) {
    editId=id;
    const a=DB.get('agendamentos',id); if(!a)return;
    fillSelects();
    document.getElementById('modalAgTitle').textContent='Editar Agendamento';
    document.getElementById('agClienteId').value=a.clienteId||'';
    document.getElementById('agServicoId').value=a.servicoId||'';
    document.getElementById('agFuncionarioId').value=a.funcionarioId||'';
    document.getElementById('agStatus').value=a.status||'Agendado';
    document.getElementById('agData').value=a.data||'';
    document.getElementById('agHora').value=a.hora||'09:00';
    document.getElementById('agDuracao').value=a.duracao||60;
    document.getElementById('agValorServico').value=a.valorServico||0;
    document.getElementById('agDesconto').value=a.desconto||0;
    document.getElementById('agValorPago').value=a.valorPago||0;
    document.getElementById('agFormaPagamento').value=a.formaPagamento||'';
    document.getElementById('agAvaliacao').value=a.avaliacao||'';
    document.getElementById('agObs').value=a.observacoes||'';
    document.getElementById('modalAgendamento').classList.remove('hidden');
  }

  function fillSelects() {
    const clientes = DB.getAll('clientes').filter(c=>c.ativo).sort((a,b)=>a.nome.localeCompare(b.nome));
    const servicos = DB.getAll('servicos').filter(s=>s.ativo).sort((a,b)=>a.nome.localeCompare(b.nome));
    const funcs = DB.getAll('funcionarios').filter(f=>f.ativo).sort((a,b)=>a.nome.localeCompare(b.nome));
    Utils.buildSelect(document.getElementById('agClienteId'), clientes,'id','nome','','Selecione cliente...');
    Utils.buildSelect(document.getElementById('agServicoId'), servicos,'id','nome','','Selecione serviço...');
    Utils.buildSelect(document.getElementById('agFuncionarioId'), funcs,'id','nome','','— Qualquer profissional —');
  }

  function onServicoChange() {
    const id=document.getElementById('agServicoId').value;
    if(!id)return;
    const s=DB.get('servicos',id);
    if(s){ document.getElementById('agValorServico').value=s.preco||0; document.getElementById('agDuracao').value=s.duracao||60; document.getElementById('agValorPago').value=s.preco||0; }
  }

  function resetForm() {
    ['agClienteId','agServicoId','agFuncionarioId','agFormaPagamento'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
    document.getElementById('agStatus').value='Agendado';
    document.getElementById('agData').value=Utils.today();
    document.getElementById('agHora').value='09:00';
    document.getElementById('agDuracao').value=60;
    document.getElementById('agValorServico').value=0;
    document.getElementById('agDesconto').value=0;
    document.getElementById('agValorPago').value=0;
    document.getElementById('agAvaliacao').value='';
    document.getElementById('agObs').value='';
  }

  function closeModal() { document.getElementById('modalAgendamento').classList.add('hidden'); }

  function save() {
    const data = {
      clienteId: document.getElementById('agClienteId').value,
      servicoId: document.getElementById('agServicoId').value,
      funcionarioId: document.getElementById('agFuncionarioId').value||null,
      status: document.getElementById('agStatus').value,
      data: document.getElementById('agData').value,
      hora: document.getElementById('agHora').value,
      duracao: Number(document.getElementById('agDuracao').value)||60,
      valorServico: Number(document.getElementById('agValorServico').value)||0,
      desconto: Number(document.getElementById('agDesconto').value)||0,
      valorPago: Number(document.getElementById('agValorPago').value)||0,
      formaPagamento: document.getElementById('agFormaPagamento').value||'',
      avaliacao: document.getElementById('agAvaliacao').value ? Number(document.getElementById('agAvaliacao').value) : null,
      observacoes: document.getElementById('agObs').value,
    };
    if(!data.clienteId||!data.servicoId||!data.data||!data.hora){ Utils.showToast('Preencha os campos obrigatórios','error'); return; }
    if(editId) DB.update('agendamentos',editId,data);
    else DB.create('agendamentos',data);
    // Auto-lançamento financeiro se Concluído
    if(data.status==='Concluído'&&data.valorPago>0&&!editId){
      const sv=DB.get('servicos',data.servicoId);
      const cl=DB.get('clientes',data.clienteId);
      DB.create('lancamentos',{tipo:'receita',descricao:`${sv?.nome||'Serviço'} - ${cl?.nome||'Cliente'}`,valor:data.valorPago,data:data.data,categoria:'Serviços',formaPagamento:data.formaPagamento||'',clienteId:data.clienteId,conciliado:true,observacoes:''});
      // Update totais cliente
      if(cl){ DB.update('clientes',cl.id,{totalGasto:(cl.totalGasto||0)+data.valorPago,totalVisitas:(cl.totalVisitas||0)+1}); }
    }
    closeModal();
    renderView();
    Utils.showToast(editId?'Agendamento atualizado!':'Agendamento criado!');
  }

  function confirmDelete(id) {
    if(confirm('Excluir este agendamento?')){ DB.remove('agendamentos',id); renderView(); Utils.showToast('Agendamento removido','info'); }
  }

  return { render, prevMonth, nextMonth, goToday, setView, openNew, openEdit, closeModal, save, onServicoChange, selectDay, confirmDelete };
})();
