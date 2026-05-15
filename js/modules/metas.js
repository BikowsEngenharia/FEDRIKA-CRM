/* =============================================
   Metas & KPIs
   ============================================= */
const Metas = (() => {
  let editId = null;

  function render() {
    const metas = DB.getAll('metas');
    const atividades = DB.getAll('atividades').filter(a=>a.status==='Pendente');

    document.getElementById('metasContent').innerHTML = `
      <div class="section-header mb-4">
        <div><div class="section-title">Metas & KPIs</div><div class="section-sub">Acompanhe os objetivos da empresa</div></div>
        <button class="btn btn-primary" onclick="Metas.openNew()">+ Nova Meta</button>
      </div>

      <!-- Metas cards -->
      <div class="card-grid card-grid-3 mb-4">
        ${metas.length===0?`<div class="empty-state" style="grid-column:span 3"><div class="empty-icon">🎯</div><h3>Nenhuma meta cadastrada</h3></div>`:
        metas.map(m=>{
          const pct=Math.min(Math.round((m.atual/m.valor)*100),100);
          const corPct=Utils.getPctColor(pct);
          const badgeCls=Utils.getPctClass(pct);
          return `<div class="meta-card">
            <div class="meta-header">
              <div>
                <div class="meta-title">${Utils.escapeHtml(m.titulo)}</div>
                <div class="meta-period">${m.periodo||'—'}</div>
              </div>
              <div style="display:flex;gap:4px;align-items:center">
                <span class="meta-pct ${badgeCls}">${pct}%</span>
                <button class="btn btn-ghost btn-sm" onclick="Metas.openEdit('${m.id}')">✎</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Metas.confirmDelete('${m.id}')">✕</button>
              </div>
            </div>
            <div class="meta-value-row">
              <span class="meta-current">${m.unidade==='R$'?Utils.fmtBRL(m.atual):m.atual}</span>
              <span class="meta-target">/ ${m.unidade==='R$'?Utils.fmtBRL(m.valor):m.valor} ${m.unidade}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${corPct}" style="width:${pct}%;background:var(--${corPct==='green'?'green':corPct==='gold'?'gold':'red'})"></div>
            </div>
            ${m.descricao?`<div style="font-size:11px;color:var(--text-muted);margin-top:8px">${Utils.escapeHtml(m.descricao)}</div>`:''}
            <div style="margin-top:10px">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted)">
                <span>Falta: ${m.unidade==='R$'?Utils.fmtBRL(Math.max(0,m.valor-m.atual)):Math.max(0,m.valor-m.atual)} ${m.unidade==='R$'?'':''+m.unidade}</span>
                ${pct>=100?'<span style="color:var(--green);font-weight:700">✓ Atingida!</span>':''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Atualizar progresso -->
      <div class="card mb-4">
        <div class="card-title">Atualizar Progresso das Metas</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Meta</th><th>Período</th><th>Atual</th><th>Target</th><th>%</th><th>Atualizar</th></tr></thead>
            <tbody>
              ${metas.map(m=>{
                const pct=Math.min(Math.round((m.atual/m.valor)*100),100);
                return `<tr>
                  <td><strong>${Utils.escapeHtml(m.titulo)}</strong></td>
                  <td>${m.periodo||'—'}</td>
                  <td>${m.unidade==='R$'?Utils.fmtBRL(m.atual):m.atual} ${m.unidade}</td>
                  <td>${m.unidade==='R$'?Utils.fmtBRL(m.valor):m.valor} ${m.unidade}</td>
                  <td><span class="badge ${Utils.getPctClass(pct)}">${pct}%</span></td>
                  <td>
                    <div style="display:flex;gap:6px;align-items:center">
                      <input type="number" id="updMeta_${m.id}" value="${m.atual}" step="${m.unidade==='R$'?'0.01':'1'}" style="width:100px;padding:5px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px">
                      <button class="btn btn-primary btn-sm" onclick="Metas.updateProgress('${m.id}')">Salvar</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${renderModal()}
    `;
  }

  function renderModal() {
    return `<div id="modalMeta" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header"><h3 id="metaModalTitle">Nova Meta</h3><button class="modal-close" onclick="Metas.closeModal()">×</button></div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group" style="grid-column:span 2"><label>Título *</label><input type="text" id="mTitulo" placeholder="Ex: Faturamento Mensal"></div>
            <div class="form-group"><label>Tipo</label>
              <select id="mTipo">
                <option value="financeiro">Financeiro</option>
                <option value="clientes">Clientes</option>
                <option value="atendimentos">Atendimentos</option>
                <option value="ticket">Ticket Médio</option>
                <option value="produtos">Produtos</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div class="form-group"><label>Unidade</label>
              <select id="mUnidade"><option value="R$">R$ (reais)</option><option value="clientes">clientes</option><option value="atend.">atend.</option><option value="%">%</option><option value="un">unidades</option></select>
            </div>
            <div class="form-group"><label>Valor Target *</label><input type="number" id="mValor" step="0.01" min="0" placeholder="Ex: 15000"></div>
            <div class="form-group"><label>Valor Atual</label><input type="number" id="mAtual" step="0.01" min="0" value="0"></div>
            <div class="form-group" style="grid-column:span 2"><label>Período</label><input type="text" id="mPeriodo" placeholder="Ex: Maio 2026"></div>
            <div class="form-group" style="grid-column:span 2"><label>Descrição</label><textarea id="mDesc" rows="2" placeholder="Descrição ou objetivo da meta"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Metas.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Metas.save()">Salvar</button>
        </div>
      </div>
    </div>`;
  }

  function openNew() {
    editId=null;
    document.getElementById('metaModalTitle').textContent='Nova Meta';
    ['mTitulo','mDesc','mPeriodo'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('mValor').value=0;
    document.getElementById('mAtual').value=0;
    document.getElementById('mTipo').value='financeiro';
    document.getElementById('mUnidade').value='R$';
    document.getElementById('modalMeta').classList.remove('hidden');
  }

  function openEdit(id) {
    editId=id;
    const m=DB.get('metas',id); if(!m)return;
    document.getElementById('metaModalTitle').textContent='Editar Meta';
    document.getElementById('mTitulo').value=m.titulo||'';
    document.getElementById('mTipo').value=m.tipo||'financeiro';
    document.getElementById('mUnidade').value=m.unidade||'R$';
    document.getElementById('mValor').value=m.valor||0;
    document.getElementById('mAtual').value=m.atual||0;
    document.getElementById('mPeriodo').value=m.periodo||'';
    document.getElementById('mDesc').value=m.descricao||'';
    document.getElementById('modalMeta').classList.remove('hidden');
  }

  function closeModal() { document.getElementById('modalMeta').classList.add('hidden'); }

  function save() {
    const titulo=document.getElementById('mTitulo').value.trim();
    if(!titulo){ Utils.showToast('Informe o título da meta','error'); return; }
    const data={titulo,tipo:document.getElementById('mTipo').value,unidade:document.getElementById('mUnidade').value,valor:Number(document.getElementById('mValor').value)||0,atual:Number(document.getElementById('mAtual').value)||0,periodo:document.getElementById('mPeriodo').value,descricao:document.getElementById('mDesc').value};
    if(editId)DB.update('metas',editId,data); else DB.create('metas',data);
    closeModal(); render(); Utils.showToast(editId?'Meta atualizada!':'Meta criada!');
  }

  function updateProgress(id) {
    const inp=document.getElementById(`updMeta_${id}`);
    if(!inp)return;
    const val=Number(inp.value)||0;
    DB.update('metas',id,{atual:val});
    render();
    Utils.showToast('Progresso atualizado!');
  }

  function confirmDelete(id) {
    if(confirm('Excluir esta meta?')){ DB.remove('metas',id); render(); Utils.showToast('Meta removida','info'); }
  }

  return { render, openNew, openEdit, closeModal, save, updateProgress, confirmDelete };
})();
