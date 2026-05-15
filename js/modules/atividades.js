/* =============================================
   Atividades & Tarefas
   ============================================= */
const Atividades = (() => {
  let editId = null;

  function render() {
    const all = DB.getAll('atividades').sort((a,b)=>a.data.localeCompare(b.data));
    const pendentes = all.filter(a=>a.status==='Pendente');
    const concluidas = all.filter(a=>a.status==='Concluída');
    const hoje = Utils.today();
    const atrasadas = pendentes.filter(a=>a.data<hoje);

    document.getElementById('atividadesContent').innerHTML = `
      <div class="card-grid card-grid-4 mb-4">
        <div class="kpi-card"><div class="kpi-icon purple">📋</div><div class="kpi-body"><div class="kpi-label">Pendentes</div><div class="kpi-value">${pendentes.length}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon pink">⚠️</div><div class="kpi-body"><div class="kpi-label">Atrasadas</div><div class="kpi-value" style="color:var(--red)">${atrasadas.length}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon green">✓</div><div class="kpi-body"><div class="kpi-label">Concluídas</div><div class="kpi-value">${concluidas.length}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon gold">📅</div><div class="kpi-body"><div class="kpi-label">Hoje</div><div class="kpi-value">${pendentes.filter(a=>a.data===hoje).length}</div></div></div>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary" onclick="Atividades.openNew()">+ Nova Atividade</button>
        <select class="filter-select" onchange="Atividades.filterStatus(this.value)">
          <option value="">Todas</option><option value="Pendente">Pendente</option><option value="Concluída">Concluída</option><option value="Cancelada">Cancelada</option>
        </select>
        <select class="filter-select" onchange="Atividades.filterPrioridade(this.value)">
          <option value="">Todas as prioridades</option><option value="Alta">Alta</option><option value="Média">Média</option><option value="Baixa">Baixa</option>
        </select>
      </div>
      <div class="card">
        <div class="card-title">Atividades</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Título</th><th>Tipo</th><th>Prioridade</th><th>Data</th><th>Cliente</th><th>Responsável</th><th>Status</th><th></th></tr></thead>
            <tbody id="atividadesBody">
              ${renderRows(all)}
            </tbody>
          </table>
        </div>
      </div>
      ${renderModal()}
    `;
  }

  function renderRows(list) {
    const hoje = Utils.today();
    if(list.length===0) return `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><h3>Nenhuma atividade</h3></div></td></tr>`;
    return list.map(a=>{
      const cl=DB.get('clientes',a.clienteId);
      const fn=DB.get('funcionarios',a.funcionarioId);
      const atrasada=a.status==='Pendente'&&a.data<hoje;
      return `<tr style="${atrasada?'background:var(--red-light)':''}">
        <td>
          <div style="font-weight:600">${Utils.escapeHtml(a.titulo)}</div>
          ${a.observacoes?`<div style="font-size:11px;color:var(--text-muted)">${Utils.escapeHtml(a.observacoes.slice(0,60))}${a.observacoes.length>60?'...':''}</div>`:''}
        </td>
        <td><span class="badge badge-purple">${a.tipo||'Tarefa'}</span></td>
        <td><span class="badge ${a.prioridade==='Alta'?'badge-red':a.prioridade==='Média'?'badge-gold':'badge-gray'}">${a.prioridade||'Baixa'}</span></td>
        <td style="color:${atrasada?'var(--red)':'inherit'};font-weight:${atrasada?'700':'400'}">${Utils.fmtDate(a.data)}${atrasada?' ⚠':''}</td>
        <td>${cl?`<span style="font-size:12px">${cl.nome}</span>`:'—'}</td>
        <td>${fn?`<span style="font-size:12px">${fn.nome}</span>`:'—'}</td>
        <td><span class="badge ${a.status==='Concluída'?'badge-green':a.status==='Cancelada'?'badge-gray':'badge-blue'}">${a.status||'Pendente'}</span></td>
        <td><div style="display:flex;gap:4px">
          ${a.status==='Pendente'?`<button class="btn btn-ghost btn-sm" style="color:var(--green)" onclick="Atividades.concluir('${a.id}')" title="Concluir">✓</button>`:''}
          <button class="btn btn-ghost btn-sm" onclick="Atividades.openEdit('${a.id}')">✎</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Atividades.confirmDelete('${a.id}')">✕</button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function renderModal() {
    const clientes = DB.getAll('clientes').filter(c=>c.ativo).sort((a,b)=>a.nome.localeCompare(b.nome));
    const funcs = DB.getAll('funcionarios').filter(f=>f.ativo);
    return `<div id="modalAtividade" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header"><h3 id="atividadeTitle">Nova Atividade</h3><button class="modal-close" onclick="Atividades.closeModal()">×</button></div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group" style="grid-column:span 2"><label>Título *</label><input type="text" id="atTitulo" placeholder="Descreva a atividade"></div>
            <div class="form-group"><label>Tipo</label>
              <select id="atTipo"><option>Tarefa</option><option>Ligação</option><option>Email</option><option>WhatsApp</option><option>Reunião</option><option>Outro</option></select>
            </div>
            <div class="form-group"><label>Prioridade</label>
              <select id="atPrioridade"><option>Alta</option><option>Média</option><option>Baixa</option></select>
            </div>
            <div class="form-group"><label>Data *</label><input type="date" id="atData" value="${Utils.today()}"></div>
            <div class="form-group"><label>Status</label>
              <select id="atStatus"><option>Pendente</option><option>Concluída</option><option>Cancelada</option></select>
            </div>
            <div class="form-group"><label>Cliente (opcional)</label>
              <select id="atClienteId"><option value="">— Nenhum —</option>${clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Responsável</label>
              <select id="atFuncionarioId"><option value="">— Nenhum —</option>${funcs.map(f=>`<option value="${f.id}">${f.nome}</option>`).join('')}</select>
            </div>
            <div class="form-group" style="grid-column:span 2"><label>Observações</label><textarea id="atObs" rows="2"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Atividades.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Atividades.save()">Salvar</button>
        </div>
      </div>
    </div>`;
  }

  function openNew() {
    editId=null;
    document.getElementById('atividadeTitle').textContent='Nova Atividade';
    document.getElementById('atTitulo').value='';
    document.getElementById('atTipo').value='Tarefa';
    document.getElementById('atPrioridade').value='Alta';
    document.getElementById('atData').value=Utils.today();
    document.getElementById('atStatus').value='Pendente';
    document.getElementById('atClienteId').value='';
    document.getElementById('atFuncionarioId').value='';
    document.getElementById('atObs').value='';
    document.getElementById('modalAtividade').classList.remove('hidden');
  }

  function openEdit(id) {
    editId=id;
    const a=DB.get('atividades',id); if(!a)return;
    document.getElementById('atividadeTitle').textContent='Editar Atividade';
    document.getElementById('atTitulo').value=a.titulo||'';
    document.getElementById('atTipo').value=a.tipo||'Tarefa';
    document.getElementById('atPrioridade').value=a.prioridade||'Alta';
    document.getElementById('atData').value=a.data||'';
    document.getElementById('atStatus').value=a.status||'Pendente';
    document.getElementById('atClienteId').value=a.clienteId||'';
    document.getElementById('atFuncionarioId').value=a.funcionarioId||'';
    document.getElementById('atObs').value=a.observacoes||'';
    document.getElementById('modalAtividade').classList.remove('hidden');
  }

  function closeModal() { document.getElementById('modalAtividade').classList.add('hidden'); }

  function save() {
    const titulo=document.getElementById('atTitulo').value.trim();
    if(!titulo){ Utils.showToast('Informe o título','error'); return; }
    const data={titulo,tipo:document.getElementById('atTipo').value,prioridade:document.getElementById('atPrioridade').value,data:document.getElementById('atData').value,status:document.getElementById('atStatus').value,clienteId:document.getElementById('atClienteId').value||null,funcionarioId:document.getElementById('atFuncionarioId').value||null,observacoes:document.getElementById('atObs').value};
    if(editId)DB.update('atividades',editId,data); else DB.create('atividades',data);
    closeModal(); render(); Utils.showToast(editId?'Atividade atualizada!':'Atividade criada!');
  }

  function concluir(id) { DB.update('atividades',id,{status:'Concluída',dataConclusao:Utils.today()}); render(); Utils.showToast('Atividade concluída! ✓','success'); }
  function confirmDelete(id) { if(confirm('Excluir esta atividade?')){ DB.remove('atividades',id); render(); Utils.showToast('Atividade removida','info'); } }
  function filterStatus(v) { const rows=document.querySelectorAll('#atividadesBody tr'); rows.forEach(r=>r.style.display=!v||r.textContent.includes(v)?'':'none'); }
  function filterPrioridade(v) { const rows=document.querySelectorAll('#atividadesBody tr'); rows.forEach(r=>r.style.display=!v||r.textContent.includes(v)?'':'none'); }

  return { render, openNew, openEdit, closeModal, save, concluir, confirmDelete, filterStatus, filterPrioridade };
})();
