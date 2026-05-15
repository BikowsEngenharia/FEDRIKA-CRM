/* =============================================
   Serviços / Tratamentos + Funcionários
   ============================================= */
const Servicos = (() => {
  let activeTab = 'servicos';
  let editId = null;
  let editFuncId = null;

  function render() {
    document.getElementById('servicosContent').innerHTML = `
      <div class="tabs">
        <button class="tab-btn ${activeTab==='servicos'?'active':''}" onclick="Servicos.setTab('servicos')">Serviços & Tratamentos</button>
        <button class="tab-btn ${activeTab==='funcionarios'?'active':''}" onclick="Servicos.setTab('funcionarios')">Profissionais</button>
      </div>
      <div id="servicosTabContent"></div>
      ${renderServModal()}
      ${renderFuncModal()}
    `;
    renderTab();
  }

  function setTab(t) { activeTab=t; render(); }

  function renderTab() {
    if(activeTab==='servicos') renderServicos();
    else renderFuncionarios();
  }

  function renderServicos() {
    const servicos = DB.getAll('servicos').sort((a,b)=>a.nome.localeCompare(b.nome));
    const cats = [...new Set(servicos.map(s=>s.categoria))];
    document.getElementById('servicosTabContent').innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary" onclick="Servicos.openNewServico()">+ Novo Serviço</button>
      </div>
      <div class="card">
        <div class="card-title">Catálogo de Serviços <span class="badge badge-purple">${servicos.filter(s=>s.ativo).length} ativos</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Categoria</th><th>Duração</th><th>Preço</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${servicos.length===0?`<tr><td colspan="6"><div class="empty-state"><p>Nenhum serviço cadastrado</p></div></td></tr>`:
              servicos.map(s=>`<tr>
                <td><div style="font-weight:600">${Utils.escapeHtml(s.nome)}</div><div style="font-size:11px;color:var(--text-muted)">${s.descricao||''}</div></td>
                <td><span class="badge badge-purple">${s.categoria||'—'}</span></td>
                <td>${s.duracao||60} min</td>
                <td style="font-weight:700">${Utils.fmtBRL(s.preco||0)}</td>
                <td><span class="badge ${s.ativo?'badge-green':'badge-gray'}">${s.ativo?'Ativo':'Inativo'}</span></td>
                <td><div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="Servicos.openEditServico('${s.id}')">✎</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Servicos.deleteServico('${s.id}')">✕</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderFuncionarios() {
    const funcs = DB.getAll('funcionarios');
    document.getElementById('servicosTabContent').innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary" onclick="Servicos.openNewFunc()">+ Novo Profissional</button>
      </div>
      <div class="card-grid card-grid-3">
        ${funcs.length===0?`<div class="empty-state" style="grid-column:span 3"><div class="empty-icon">👩‍⚕️</div><h3>Nenhum profissional cadastrado</h3></div>`:
        funcs.map(f=>{
          const ags=DB.getAll('agendamentos').filter(a=>a.funcionarioId===f.id&&a.status==='Concluído');
          const receita=ags.reduce((s,a)=>s+(a.valorPago||0),0);
          const comissao=receita*((f.comissao||0)/100);
          return `<div class="card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
              <div class="avatar avatar-lg" style="background:${f.cor||'var(--primary)'}1a;color:${f.cor||'var(--primary)'}">${Utils.initials(f.nome)}</div>
              <div>
                <div style="font-weight:700;font-size:15px">${Utils.escapeHtml(f.nome)}</div>
                <div style="font-size:12px;color:var(--text-muted)">${f.cargo||'Profissional'}</div>
                <span class="badge ${f.ativo?'badge-green':'badge-gray'}">${f.ativo?'Ativo':'Inativo'}</span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
              <div><div class="kpi-label">Atendimentos</div><div style="font-weight:700">${ags.length}</div></div>
              <div><div class="kpi-label">Comissão ${f.comissao}%</div><div style="font-weight:700;color:var(--green)">${Utils.fmtBRL(comissao)}</div></div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Especialidades: ${(f.especialidades||[]).join(', ')||'—'}</div>
            <div class="divider"></div>
            <div style="display:flex;gap:4px">
              <button class="btn btn-outline btn-sm" onclick="Servicos.openEditFunc('${f.id}')">✎ Editar</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function renderServModal() {
    const cats=['Rosto','Corpo','Unhas','Cabelo','Depilação','Massagem','Estética Avançada','Saúde','Outro'];
    return `<div id="modalServico" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header"><h3 id="servTitle">Novo Serviço</h3><button class="modal-close" onclick="Servicos.closeServModal()">×</button></div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group" style="grid-column:span 2"><label>Nome *</label><input type="text" id="sNome" placeholder="Nome do serviço"></div>
            <div class="form-group"><label>Categoria</label>
              <select id="sCategoria">${cats.map(c=>`<option>${c}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Duração (minutos)</label><input type="number" id="sDuracao" value="60" min="15" step="15"></div>
            <div class="form-group"><label>Preço (R$)</label><input type="number" id="sPreco" step="0.01" min="0" value="0"></div>
            <div class="form-group"><label>Status</label><select id="sAtivo"><option value="1">Ativo</option><option value="0">Inativo</option></select></div>
            <div class="form-group" style="grid-column:span 2"><label>Descrição</label><textarea id="sDesc" rows="2" placeholder="Descrição do serviço"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Servicos.closeServModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Servicos.saveServico()">Salvar</button>
        </div>
      </div>
    </div>`;
  }

  function renderFuncModal() {
    const specs=['Rosto','Corpo','Unhas','Cabelo','Depilação','Massagem','Estética Avançada','Saúde'];
    return `<div id="modalFunc" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header"><h3 id="funcTitle">Novo Profissional</h3><button class="modal-close" onclick="Servicos.closeFuncModal()">×</button></div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group" style="grid-column:span 2"><label>Nome Completo *</label><input type="text" id="fNome" placeholder="Nome do profissional"></div>
            <div class="form-group"><label>Cargo</label><input type="text" id="fCargo" placeholder="Ex: Esteticista, Massagista..."></div>
            <div class="form-group"><label>Comissão (%)</label><input type="number" id="fComissao" value="30" min="0" max="100"></div>
            <div class="form-group"><label>Telefone</label><input type="text" id="fTelefone" placeholder="(00) 00000-0000"></div>
            <div class="form-group"><label>Email</label><input type="email" id="fEmail"></div>
            <div class="form-group"><label>Especialidades</label>
              <select id="fEspecialidades" multiple style="height:80px">
                ${specs.map(s=>`<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Cor (identificação)</label><input type="color" id="fCor" value="#c06db8" style="height:38px;padding:4px;cursor:pointer"></div>
            <div class="form-group"><label>Status</label><select id="fAtivo"><option value="1">Ativo</option><option value="0">Inativo</option></select></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Servicos.closeFuncModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Servicos.saveFunc()">Salvar</button>
        </div>
      </div>
    </div>`;
  }

  function openNewServico() { editId=null; document.getElementById('servTitle').textContent='Novo Serviço'; ['sNome','sDesc'].forEach(id=>document.getElementById(id).value=''); document.getElementById('sDuracao').value=60; document.getElementById('sPreco').value=0; document.getElementById('sAtivo').value='1'; document.getElementById('modalServico').classList.remove('hidden'); }
  function openEditServico(id) { editId=id; const s=DB.get('servicos',id); if(!s)return; document.getElementById('servTitle').textContent='Editar Serviço'; document.getElementById('sNome').value=s.nome||''; document.getElementById('sCategoria').value=s.categoria||'Rosto'; document.getElementById('sDuracao').value=s.duracao||60; document.getElementById('sPreco').value=s.preco||0; document.getElementById('sAtivo').value=s.ativo?'1':'0'; document.getElementById('sDesc').value=s.descricao||''; document.getElementById('modalServico').classList.remove('hidden'); }
  function openNewFunc() { editFuncId=null; document.getElementById('funcTitle').textContent='Novo Profissional'; ['fNome','fCargo','fTelefone','fEmail'].forEach(id=>document.getElementById(id).value=''); document.getElementById('fComissao').value=30; document.getElementById('fCor').value='#c06db8'; document.getElementById('fAtivo').value='1'; Array.from(document.getElementById('fEspecialidades').options).forEach(o=>o.selected=false); document.getElementById('modalFunc').classList.remove('hidden'); }
  function openEditFunc(id) { editFuncId=id; const f=DB.get('funcionarios',id); if(!f)return; document.getElementById('funcTitle').textContent='Editar Profissional'; document.getElementById('fNome').value=f.nome||''; document.getElementById('fCargo').value=f.cargo||''; document.getElementById('fComissao').value=f.comissao||30; document.getElementById('fTelefone').value=f.telefone||''; document.getElementById('fEmail').value=f.email||''; document.getElementById('fCor').value=f.cor||'#c06db8'; document.getElementById('fAtivo').value=f.ativo?'1':'0'; Array.from(document.getElementById('fEspecialidades').options).forEach(o=>o.selected=(f.especialidades||[]).includes(o.value)); document.getElementById('modalFunc').classList.remove('hidden'); }
  function closeServModal() { document.getElementById('modalServico').classList.add('hidden'); }
  function closeFuncModal() { document.getElementById('modalFunc').classList.add('hidden'); }

  function saveServico() {
    const nome=document.getElementById('sNome').value.trim(); if(!nome){Utils.showToast('Informe o nome','error');return;}
    const data={nome,categoria:document.getElementById('sCategoria').value,duracao:Number(document.getElementById('sDuracao').value)||60,preco:Number(document.getElementById('sPreco').value)||0,descricao:document.getElementById('sDesc').value,ativo:document.getElementById('sAtivo').value==='1'};
    if(editId)DB.update('servicos',editId,data); else DB.create('servicos',data);
    closeServModal(); render(); Utils.showToast(editId?'Serviço atualizado!':'Serviço cadastrado!');
  }

  function saveFunc() {
    const nome=document.getElementById('fNome').value.trim(); if(!nome){Utils.showToast('Informe o nome','error');return;}
    const specs=Array.from(document.getElementById('fEspecialidades').options).filter(o=>o.selected).map(o=>o.value);
    const data={nome,cargo:document.getElementById('fCargo').value,comissao:Number(document.getElementById('fComissao').value)||30,telefone:document.getElementById('fTelefone').value,email:document.getElementById('fEmail').value,especialidades:specs,cor:document.getElementById('fCor').value,ativo:document.getElementById('fAtivo').value==='1'};
    if(editFuncId)DB.update('funcionarios',editFuncId,data); else DB.create('funcionarios',data);
    closeFuncModal(); render(); Utils.showToast(editFuncId?'Profissional atualizado!':'Profissional cadastrado!');
  }

  function deleteServico(id) { if(confirm('Remover este serviço?')){ DB.update('servicos',id,{ativo:false}); render(); Utils.showToast('Serviço removido','info'); } }

  return { render, setTab, openNewServico, openEditServico, openNewFunc, openEditFunc, closeServModal, closeFuncModal, saveServico, saveFunc, deleteServico };
})();
