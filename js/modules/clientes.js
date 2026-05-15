/* =============================================
   Clientes / Carteira de Clientes
   ============================================= */
const Clientes = (() => {
  let editId = null;
  let searchTerm = '';
  let filterTag = '';

  function render() {
    const clientes = getFiltered();
    document.getElementById('clientesContent').innerHTML = `
      <div class="toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por nome, telefone, CPF..." id="clienteSearch" value="${searchTerm}" oninput="Clientes.search(this.value)">
        </div>
        <select class="filter-select" id="tagFilter" onchange="Clientes.filterByTag(this.value)">
          <option value="">Todas as tags</option>
          <option value="VIP">VIP</option>
          <option value="Assídua">Assídua</option>
          <option value="Nova">Nova</option>
          <option value="Atenção">Atenção</option>
          <option value="Inativa">Inativa</option>
        </select>
        <select class="filter-select" onchange="Clientes.filterActive(this.value)" id="clienteAtivo">
          <option value="">Todos</option>
          <option value="1">Ativos</option>
          <option value="0">Inativos</option>
        </select>
        <button class="btn btn-primary" onclick="Clientes.openNew()">+ Nova Cliente</button>
      </div>
      <div class="card">
        <div class="card-title">Clientes <span class="badge badge-purple">${clientes.length}</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Contato</th><th>Tags</th><th>Última Visita</th><th>Total Gasto</th><th>Visitas</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${clientes.length===0?`<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👥</div><h3>Nenhuma cliente encontrada</h3></div></td></tr>`:
              clientes.map(c=>`<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="avatar">${Utils.initials(c.nome)}</div>
                    <div>
                      <div style="font-weight:600">${Utils.escapeHtml(c.nome)}</div>
                      <div style="font-size:11px;color:var(--text-muted)">${c.cpf||'—'} · ${Utils.age(c.nascimento)||'?'} anos</div>
                    </div>
                  </div>
                </td>
                <td><div>${Utils.escapeHtml(c.telefone||'—')}</div><div style="font-size:11px;color:var(--text-muted)">${Utils.escapeHtml(c.email||'')}</div></td>
                <td>${(c.tags||[]).map(t=>`<span class="badge ${getTagBadge(t)}">${t}</span>`).join(' ')}</td>
                <td>${getUltimaVisita(c.id)}</td>
                <td>${Utils.fmtBRL(c.totalGasto||0)}</td>
                <td><strong>${c.totalVisitas||0}</strong></td>
                <td><span class="badge ${c.ativo?'badge-green':'badge-gray'}">${c.ativo?'Ativa':'Inativa'}</span></td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm" onclick="Clientes.openProfile('${c.id}')" title="Ver perfil">👤</button>
                    <button class="btn btn-ghost btn-sm" onclick="Clientes.openEdit('${c.id}')" title="Editar">✎</button>
                    <button class="btn btn-ghost btn-sm" onclick="Clientes.openAnamnese('${c.id}')" title="Anamnese">📋</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Clientes.confirmDelete('${c.id}')" title="Excluir">✕</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ${renderModal()}
      ${renderProfileModal()}
    `;
  }

  function getFiltered() {
    let list = DB.getAll('clientes');
    if(searchTerm) list=list.filter(c=>[c.nome,c.cpf,c.telefone,c.email].some(f=>f&&f.toLowerCase().includes(searchTerm.toLowerCase())));
    if(filterTag) list=list.filter(c=>(c.tags||[]).includes(filterTag));
    return list.sort((a,b)=>a.nome.localeCompare(b.nome));
  }

  function getUltimaVisita(clienteId) {
    const ags=DB.getAll('agendamentos').filter(a=>a.clienteId===clienteId&&a.status==='Concluído').sort((a,b)=>b.data.localeCompare(a.data));
    return ags.length>0?Utils.fmtDate(ags[0].data):'—';
  }

  function getTagBadge(t) {
    return {VIP:'badge-gold',Assídua:'badge-purple',Nova:'badge-teal',Atenção:'badge-red',Inativa:'badge-gray'}[t]||'badge-gray';
  }

  function renderModal() {
    return `
    <div id="modalCliente" class="modal-overlay hidden">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="modalClienteTitle">Nova Cliente</h3>
          <button class="modal-close" onclick="Clientes.closeModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="tabs">
            <button class="tab-btn active" onclick="Clientes.showTab(event,'tabDados')">Dados Pessoais</button>
            <button class="tab-btn" onclick="Clientes.showTab(event,'tabContato')">Contato</button>
            <button class="tab-btn" onclick="Clientes.showTab(event,'tabObs')">Observações</button>
          </div>
          <div id="tabDados" class="tab-pane active">
            <div class="form-grid form-grid-2">
              <div class="form-group" style="grid-column:span 2">
                <label>Nome Completo *</label>
                <input type="text" id="clNome" placeholder="Nome da cliente">
              </div>
              <div class="form-group">
                <label>CPF</label>
                <input type="text" id="clCpf" placeholder="000.000.000-00">
              </div>
              <div class="form-group">
                <label>Data de Nascimento</label>
                <input type="date" id="clNascimento">
              </div>
              <div class="form-group">
                <label>Sexo</label>
                <select id="clSexo"><option value="F">Feminino</option><option value="M">Masculino</option><option value="O">Outro</option></select>
              </div>
              <div class="form-group">
                <label>Como nos conheceu?</label>
                <select id="clIndicacao">
                  <option value="">Não informado</option>
                  <option>Instagram</option><option>Facebook</option><option>Google</option><option>Indicação</option><option>Passando na rua</option><option>WhatsApp</option><option>Outro</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tags</label>
                <select id="clTags" multiple style="height:80px">
                  <option value="VIP">VIP</option>
                  <option value="Assídua">Assídua</option>
                  <option value="Nova">Nova</option>
                  <option value="Atenção">Atenção</option>
                  <option value="Inativa">Inativa</option>
                </select>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select id="clAtivo"><option value="1">Ativa</option><option value="0">Inativa</option></select>
              </div>
            </div>
          </div>
          <div id="tabContato" class="tab-pane">
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label>Telefone / WhatsApp *</label>
                <input type="text" id="clTelefone" placeholder="(00) 00000-0000">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="clEmail" placeholder="email@exemplo.com">
              </div>
              <div class="form-group" style="grid-column:span 2">
                <label>Endereço</label>
                <input type="text" id="clEndereco" placeholder="Rua, número, complemento">
              </div>
              <div class="form-group">
                <label>Cidade</label>
                <input type="text" id="clCidade">
              </div>
              <div class="form-group">
                <label>Estado</label>
                <input type="text" id="clEstado" maxlength="2" placeholder="SP">
              </div>
            </div>
          </div>
          <div id="tabObs" class="tab-pane">
            <div class="form-group">
              <label>Observações Gerais</label>
              <textarea id="clObs" rows="5" placeholder="Alergias, preferências, histórico relevante..."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Clientes.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Clientes.save()">Salvar Cliente</button>
        </div>
      </div>
    </div>`;
  }

  function renderProfileModal() {
    return `<div id="modalProfile" class="modal-overlay hidden">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3 id="profileTitle">Perfil da Cliente</h3>
          <button class="modal-close" onclick="Clientes.closeProfile()">×</button>
        </div>
        <div class="modal-body" id="profileBody"></div>
      </div>
    </div>`;
  }

  function openNew() {
    editId=null;
    document.getElementById('modalClienteTitle').textContent='Nova Cliente';
    resetForm();
    document.getElementById('modalCliente').classList.remove('hidden');
  }

  function openEdit(id) {
    editId=id;
    const c=DB.get('clientes',id); if(!c)return;
    document.getElementById('modalClienteTitle').textContent='Editar Cliente';
    document.getElementById('clNome').value=c.nome||'';
    document.getElementById('clCpf').value=c.cpf||'';
    document.getElementById('clNascimento').value=c.nascimento||'';
    document.getElementById('clSexo').value=c.sexo||'F';
    document.getElementById('clIndicacao').value=c.indicacao||'';
    document.getElementById('clTelefone').value=c.telefone||'';
    document.getElementById('clEmail').value=c.email||'';
    document.getElementById('clEndereco').value=c.endereco||'';
    document.getElementById('clCidade').value=c.cidade||'';
    document.getElementById('clEstado').value=c.estado||'';
    document.getElementById('clObs').value=c.observacoes||'';
    document.getElementById('clAtivo').value=c.ativo?'1':'0';
    const tags=document.getElementById('clTags');
    Array.from(tags.options).forEach(o=>{ o.selected=(c.tags||[]).includes(o.value); });
    document.getElementById('modalCliente').classList.remove('hidden');
  }

  function openProfile(id) {
    const c=DB.get('clientes',id); if(!c)return;
    const ags=DB.getAll('agendamentos').filter(a=>a.clienteId===id).sort((a,b)=>b.data.localeCompare(a.data));
    const concluidos=ags.filter(a=>a.status==='Concluído');
    const anamnese=DB.getAll('anamneses').find(a=>a.clienteId===id);

    document.getElementById('profileTitle').textContent=`Perfil — ${c.nome}`;
    document.getElementById('profileBody').innerHTML=`
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div style="flex:0 0 200px">
          <div class="avatar avatar-lg" style="margin:0 auto 12px">${Utils.initials(c.nome)}</div>
          <div style="text-align:center">
            <div style="font-size:16px;font-weight:700">${Utils.escapeHtml(c.nome)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${Utils.age(c.nascimento)||'?'} anos</div>
            <div style="margin-top:8px">${(c.tags||[]).map(t=>`<span class="badge ${getTagBadge(t)}">${t}</span>`).join(' ')}</div>
          </div>
          <div class="divider"></div>
          <div style="font-size:12px;line-height:1.8">
            <div>📱 ${c.telefone||'—'}</div>
            <div>✉ ${c.email||'—'}</div>
            <div>📍 ${[c.cidade,c.estado].filter(Boolean).join('/')}</div>
            <div>🎂 ${c.nascimento?Utils.fmtDate(c.nascimento):'—'}</div>
            <div>📣 ${c.indicacao||'—'}</div>
          </div>
          ${c.observacoes?`<div class="divider"></div><div style="font-size:12px;color:var(--text-muted)">${Utils.escapeHtml(c.observacoes)}</div>`:''}
        </div>
        <div style="flex:1;min-width:300px">
          <div style="display:flex;gap:12px;margin-bottom:16px">
            <div class="fin-card" style="flex:1"><div class="fin-card-label">Total Gasto</div><div class="fin-card-value purple">${Utils.fmtBRL(c.totalGasto||0)}</div></div>
            <div class="fin-card" style="flex:1"><div class="fin-card-label">Visitas</div><div class="fin-card-value purple">${c.totalVisitas||0}</div></div>
            <div class="fin-card" style="flex:1"><div class="fin-card-label">Ticket Médio</div><div class="fin-card-value purple">${concluidos.length>0?Utils.fmtBRL(concluidos.reduce((s,a)=>s+(a.valorPago||0),0)/concluidos.length):'R$ 0,00'}</div></div>
          </div>
          <div style="font-size:14px;font-weight:700;margin-bottom:10px">Histórico de Atendimentos</div>
          ${ags.length===0?'<p style="font-size:13px;color:var(--text-muted)">Nenhum atendimento registrado</p>':
          `<div class="table-wrap"><table>
            <thead><tr><th>Data</th><th>Serviço</th><th>Profissional</th><th>Status</th><th>Valor</th><th>Aval.</th></tr></thead>
            <tbody>
              ${ags.slice(0,10).map(a=>{
                const sv=DB.get('servicos',a.servicoId);
                const fn=DB.get('funcionarios',a.funcionarioId);
                return `<tr>
                  <td>${Utils.fmtDate(a.data)}</td>
                  <td>${sv?.nome||'—'}</td>
                  <td>${fn?.nome||'—'}</td>
                  <td><span class="badge ${({Agendado:'badge-blue',Confirmado:'badge-green',Concluído:'badge-teal',Cancelado:'badge-red',Faltou:'badge-gold'}[a.status]||'badge-gray')}">${a.status}</span></td>
                  <td>${Utils.fmtBRL(a.valorPago||0)}</td>
                  <td>${a.avaliacao?'⭐'.repeat(a.avaliacao):'—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>`}
          ${anamnese?`<div class="divider"></div>
          <div style="font-size:14px;font-weight:700;margin-bottom:8px">Ficha de Anamnese <span style="font-size:11px;color:var(--text-muted);font-weight:400">${Utils.fmtDate(anamnese.data)}</span></div>
          <div style="font-size:12px;line-height:2;display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
            <span>Fototipo: <strong>${anamnese.fototipo||'—'}</strong></span>
            <span>Gestante: <strong>${anamnese.gestante?'Sim':'Não'}</strong></span>
            <span>Diabetes: <strong>${anamnese.diabetes?'Sim':'Não'}</strong></span>
            <span>Alergia: <strong>${anamnese.alergiasCosmeticos?'Sim':'Não'}</strong></span>
            ${anamnese.descricaoAlergias?`<span style="grid-column:span 2">Alergias: <strong>${Utils.escapeHtml(anamnese.descricaoAlergias)}</strong></span>`:''}
            ${anamnese.objetivos?`<span style="grid-column:span 2">Objetivos: <strong>${Utils.escapeHtml(anamnese.objetivos)}</strong></span>`:''}
          </div>`:''}
          <div class="divider"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="Agenda.openNew();document.getElementById('agClienteId').value='${id}';Clientes.closeProfile()">+ Agendar</button>
            <button class="btn btn-outline btn-sm" onclick="Clientes.openEdit('${id}');Clientes.closeProfile()">✎ Editar</button>
            <button class="btn btn-outline btn-sm" onclick="Clientes.openAnamnese('${id}');Clientes.closeProfile()">📋 Anamnese</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalProfile').classList.remove('hidden');
  }

  function openAnamnese(clienteId) {
    document.getElementById('modalProfile').classList.add('hidden');
    App.navigateTo('anamnese');
    setTimeout(()=>Anamnese.openForm(clienteId), 100);
  }

  function closeModal() { document.getElementById('modalCliente').classList.add('hidden'); }
  function closeProfile() { document.getElementById('modalProfile').classList.add('hidden'); }

  function showTab(e, tabId) {
    document.querySelectorAll('#modalCliente .tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('#modalCliente .tab-pane').forEach(p=>p.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  }

  function resetForm() {
    ['clNome','clCpf','clNascimento','clTelefone','clEmail','clEndereco','clCidade','clEstado','clObs'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
    document.getElementById('clSexo').value='F';
    document.getElementById('clAtivo').value='1';
    document.getElementById('clIndicacao').value='';
    Array.from(document.getElementById('clTags').options).forEach(o=>o.selected=false);
  }

  function save() {
    const nome=document.getElementById('clNome').value.trim();
    if(!nome){ Utils.showToast('Informe o nome da cliente','error'); return; }
    const tags=Array.from(document.getElementById('clTags').options).filter(o=>o.selected).map(o=>o.value);
    const data={
      nome, cpf:document.getElementById('clCpf').value, nascimento:document.getElementById('clNascimento').value,
      sexo:document.getElementById('clSexo').value, indicacao:document.getElementById('clIndicacao').value,
      telefone:document.getElementById('clTelefone').value, email:document.getElementById('clEmail').value,
      endereco:document.getElementById('clEndereco').value, cidade:document.getElementById('clCidade').value,
      estado:document.getElementById('clEstado').value, observacoes:document.getElementById('clObs').value,
      ativo:document.getElementById('clAtivo').value==='1', tags,
    };
    if(editId) DB.update('clientes',editId,data);
    else { data.totalGasto=0; data.totalVisitas=0; DB.create('clientes',data); }
    closeModal();
    render();
    Utils.showToast(editId?'Cliente atualizada!':'Cliente cadastrada!');
  }

  function confirmDelete(id) {
    if(confirm('Excluir esta cliente? Esta ação não pode ser desfeita.')){ DB.remove('clientes',id); render(); Utils.showToast('Cliente removida','info'); }
  }

  function search(v) { searchTerm=v; render(); }
  function filterByTag(v) { filterTag=v; render(); }
  function filterActive() { render(); }

  return { render, openNew, openEdit, openProfile, openAnamnese, closeModal, closeProfile, save, confirmDelete, search, filterByTag, filterActive, showTab };
})();
