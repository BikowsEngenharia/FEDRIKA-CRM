/* =============================================
   Fichas de Anamnese
   ============================================= */
const Anamnese = (() => {
  let editId = null;
  let selectedClienteId = null;

  function render() {
    const anamneses = DB.getAll('anamneses');
    const clientes = DB.getAll('clientes');

    document.getElementById('anamneseContent').innerHTML = `
      <div class="toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por cliente..." oninput="Anamnese.search(this.value)" id="anamSearch">
        </div>
        <button class="btn btn-primary" onclick="Anamnese.openForm(null)">+ Nova Ficha</button>
      </div>
      <div class="card">
        <div class="card-title">Fichas de Anamnese <span class="badge badge-purple">${anamneses.length}</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Data</th><th>Fototipo</th><th>Restrições</th><th>Objetivos</th><th>Profissional</th><th></th></tr></thead>
            <tbody>
              ${anamneses.length===0?`<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><h3>Nenhuma ficha cadastrada</h3></div></td></tr>`:
              anamneses.map(a=>{
                const cl=DB.get('clientes',a.clienteId);
                const fn=DB.get('funcionarios',a.funcionarioId);
                const restricoes=[];
                if(a.diabetes)restricoes.push('Diabetes');
                if(a.gestante)restricoes.push('Gestante');
                if(a.cardiopatia)restricoes.push('Cardiopatia');
                if(a.marcapasso)restricoes.push('Marcapasso');
                if(a.alergiasCosmeticos)restricoes.push('Alergia');
                if(a.epilepsia)restricoes.push('Epilepsia');
                return `<tr>
                  <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar avatar-sm">${Utils.initials(cl?.nome||'?')}</div><strong>${cl?.nome||'—'}</strong></div></td>
                  <td>${Utils.fmtDate(a.data)}</td>
                  <td><span class="badge badge-purple">Fototipo ${a.fototipo||'?'}</span></td>
                  <td>${restricoes.length>0?restricoes.map(r=>`<span class="badge badge-red" style="margin-right:2px">${r}</span>`).join(''):'<span class="badge badge-green">Sem restrições</span>'}</td>
                  <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.objetivos||'—'}</td>
                  <td>${fn?.nome||'—'}</td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-ghost btn-sm" onclick="Anamnese.openForm('${a.clienteId}','${a.id}')">✎ Editar</button>
                      <button class="btn btn-ghost btn-sm" onclick="Anamnese.imprimir('${a.id}')">🖨</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Anamnese.confirmDelete('${a.id}')">✕</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div id="modalAnamnese" class="modal-overlay hidden">
        <div class="modal modal-xl">
          <div class="modal-header">
            <h3 id="anamModalTitle">Ficha de Anamnese</h3>
            <button class="modal-close" onclick="Anamnese.closeModal()">×</button>
          </div>
          <div class="modal-body" id="anamModalBody"></div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Anamnese.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Anamnese.save()">Salvar Ficha</button>
          </div>
        </div>
      </div>
    `;
  }

  function openForm(clienteId, anamId=null) {
    selectedClienteId = clienteId;
    editId = anamId;
    const existing = anamId ? DB.get('anamneses',anamId) : (clienteId ? DB.getAll('anamneses').find(a=>a.clienteId===clienteId) : null);
    if(existing && !editId) { editId = existing.id; selectedClienteId = existing.clienteId; }

    const clientes = DB.getAll('clientes').filter(c=>c.ativo).sort((a,b)=>a.nome.localeCompare(b.nome));
    const funcionarios = DB.getAll('funcionarios').filter(f=>f.ativo);
    const d = existing || {};

    const check = (id, val) => (d[id]||false) || val===true ? 'checked' : '';

    document.getElementById('anamModalBody').innerHTML = `
      <div class="anamnese-section">
        <h4>1. Identificação</h4>
        <div class="form-grid form-grid-3">
          <div class="form-group">
            <label>Cliente *</label>
            <select id="anClienteId" ${clienteId?'disabled':''}>
              ${clientes.map(c=>`<option value="${c.id}" ${(clienteId===c.id||d.clienteId===c.id)?'selected':''}>${c.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Data da Avaliação</label>
            <input type="date" id="anData" value="${d.data||Utils.today()}">
          </div>
          <div class="form-group">
            <label>Profissional</label>
            <select id="anFuncionarioId">
              <option value="">— Não informado —</option>
              ${funcionarios.map(f=>`<option value="${f.id}" ${d.funcionarioId===f.id?'selected':''}>${f.nome}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="anamnese-section">
        <h4>2. Histórico de Saúde</h4>
        <div class="check-grid">
          <label class="check-item"><input type="checkbox" id="anDiabetes" ${check('diabetes')}> Diabetes</label>
          <label class="check-item"><input type="checkbox" id="anCardiopatia" ${check('cardiopatia')}> Cardiopatia</label>
          <label class="check-item"><input type="checkbox" id="anGestante" ${check('gestante')}> Gestante</label>
          <label class="check-item"><input type="checkbox" id="anMarcapasso" ${check('marcapasso')}> Marcapasso</label>
          <label class="check-item"><input type="checkbox" id="anEpilepsia" ${check('epilepsia')}> Epilepsia</label>
          <label class="check-item"><input type="checkbox" id="anCancer" ${check('cancer')}> Câncer</label>
          <label class="check-item"><input type="checkbox" id="anAlergiaMed" ${check('alergiaMedicamentos')}> Alergia a Medicamentos</label>
          <label class="check-item"><input type="checkbox" id="anAlergiaCos" ${check('alergiasCosmeticos')}> Alergia a Cosméticos</label>
          <label class="check-item"><input type="checkbox" id="anHipertensao" ${check('hipertensao')}> Hipertensão</label>
          <label class="check-item"><input type="checkbox" id="anTireoide" ${check('tireoide')}> Distúrbio Tireoidiano</label>
          <label class="check-item"><input type="checkbox" id="anCoagulacao" ${check('coagulacao')}> Problema de Coagulação</label>
          <label class="check-item"><input type="checkbox" id="anHerpes" ${check('herpes')}> Herpes Recorrente</label>
        </div>
        <div class="form-grid form-grid-2" style="margin-top:10px">
          <div class="form-group">
            <label>Descrição das Alergias</label>
            <input type="text" id="anDescAlergias" value="${d.descricaoAlergias||''}" placeholder="Descreva as alergias">
          </div>
          <div class="form-group">
            <label>Medicamentos em Uso</label>
            <input type="text" id="anMedicamentos" value="${d.medicamentos||''}" placeholder="Ex: Anticoagulantes, isotretinoína...">
          </div>
          <div class="form-group">
            <label>Cirurgias Recentes</label>
            <input type="text" id="anCirurgias" value="${d.cirurgias||''}" placeholder="Descreva cirurgias recentes">
          </div>
          <div class="form-group">
            <label>Pressão Arterial</label>
            <select id="anPressao">
              <option ${d.pressaoArterial==='Normal'?'selected':''}>Normal</option>
              <option ${d.pressaoArterial==='Hipertensa'?'selected':''}>Hipertensa</option>
              <option ${d.pressaoArterial==='Hipotensa'?'selected':''}>Hipotensa</option>
            </select>
          </div>
        </div>
      </div>

      <div class="anamnese-section">
        <h4>3. Avaliação da Pele — Rosto</h4>
        <div class="form-grid form-grid-3">
          <div class="form-group">
            <label>Fototipo (I a VI)</label>
            <select id="anFototipo">
              ${['I','II','III','IV','V','VI'].map(f=>`<option ${d.fototipo===f?'selected':''}>${f}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-top:10px">
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">TIPO DE PELE</div>
          <div class="check-grid">
            ${['Normal','Seca','Oleosa','Mista','Sensível','Acneica','Madura','Desidratada'].map(t=>`
              <label class="check-item"><input type="checkbox" class="tipopele" value="${t}" ${(d.tiposPele||[]).includes(t)?'checked':''}> ${t}</label>
            `).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">PROBLEMAS DA PELE</div>
          <div class="check-grid">
            ${['Acne','Manchas','Melasma','Rugas','Flacidez','Poros dilatados','Rosácea','Olheiras','Couperose','Cicatrizes'].map(p=>`
              <label class="check-item"><input type="checkbox" class="probpele" value="${p}" ${(d.problemasPele||[]).includes(p)?'checked':''}> ${p}</label>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="anamnese-section">
        <h4>4. Avaliação Corporal</h4>
        <div class="check-grid">
          ${['Celulite','Gordura localizada','Flacidez','Estrias','Retenção hídrica','Varizes','Inchaço'].map(t=>`
            <label class="check-item"><input type="checkbox" class="tipocorpo" value="${t}" ${(d.tiposCorpo||[]).includes(t)?'checked':''}> ${t}</label>
          `).join('')}
        </div>
      </div>

      <div class="anamnese-section">
        <h4>5. Objetivos & Observações</h4>
        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label>Objetivos do Tratamento</label>
            <textarea id="anObjetivos" rows="3">${d.objetivos||''}</textarea>
          </div>
          <div class="form-group">
            <label>Tratamentos Anteriores</label>
            <textarea id="anTratamentosAnt" rows="3">${d.tratamentosAnteriores||''}</textarea>
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label>Observações Gerais</label>
            <textarea id="anObservacoes" rows="2">${d.observacoes||''}</textarea>
          </div>
        </div>
      </div>

      <div class="anamnese-section">
        <h4>6. Autorização</h4>
        <div style="background:var(--bg);border-radius:8px;padding:14px;font-size:12px;line-height:1.7;margin-bottom:10px">
          Declaro que as informações acima são verdadeiras e autorizo a realização dos procedimentos estéticos, ciente de que contraindacações não declaradas são de minha responsabilidade. Autorizo também o uso de imagens para fins de acompanhamento do tratamento.
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label>Assinatura / Nome Completo</label>
            <input type="text" id="anAssinatura" value="${d.assinatura||''}" placeholder="Nome completo como assinatura">
          </div>
          <div class="form-group">
            <label>Data de Assinatura</label>
            <input type="date" id="anDataAssinatura" value="${d.dataAssinatura||Utils.today()}">
          </div>
        </div>
      </div>
    `;

    const modal = document.getElementById('modalAnamnese');
    if(modal) { modal.classList.remove('hidden'); return; }

    // If modal not rendered yet (called from clientes page), navigate first
    App.navigateTo('anamnese');
    setTimeout(()=>{ openForm(clienteId, anamId); }, 200);
  }

  function closeModal() { document.getElementById('modalAnamnese').classList.add('hidden'); }

  function save() {
    const clienteId = selectedClienteId || document.getElementById('anClienteId')?.value;
    if(!clienteId){ Utils.showToast('Selecione a cliente','error'); return; }

    const getChecked = cls => Array.from(document.querySelectorAll(`.${cls}:checked`)).map(e=>e.value);

    const data = {
      clienteId,
      data: document.getElementById('anData').value,
      funcionarioId: document.getElementById('anFuncionarioId').value||null,
      pressaoArterial: document.getElementById('anPressao').value,
      diabetes: document.getElementById('anDiabetes').checked,
      cardiopatia: document.getElementById('anCardiopatia').checked,
      gestante: document.getElementById('anGestante').checked,
      marcapasso: document.getElementById('anMarcapasso').checked,
      epilepsia: document.getElementById('anEpilepsia').checked,
      cancer: document.getElementById('anCancer').checked,
      hipertensao: document.getElementById('anHipertensao').checked,
      tireoide: document.getElementById('anTireoide').checked,
      coagulacao: document.getElementById('anCoagulacao').checked,
      herpes: document.getElementById('anHerpes').checked,
      alergiaMedicamentos: document.getElementById('anAlergiaMed').checked,
      alergiasCosmeticos: document.getElementById('anAlergiaCos').checked,
      descricaoAlergias: document.getElementById('anDescAlergias').value,
      medicamentos: document.getElementById('anMedicamentos').value,
      cirurgias: document.getElementById('anCirurgias').value,
      fototipo: document.getElementById('anFototipo').value,
      tiposPele: getChecked('tipopele'),
      problemasPele: getChecked('probpele'),
      tiposCorpo: getChecked('tipocorpo'),
      objetivos: document.getElementById('anObjetivos').value,
      tratamentosAnteriores: document.getElementById('anTratamentosAnt').value,
      observacoes: document.getElementById('anObservacoes').value,
      assinatura: document.getElementById('anAssinatura').value,
      dataAssinatura: document.getElementById('anDataAssinatura').value,
    };

    if(editId) DB.update('anamneses',editId,data);
    else DB.create('anamneses',data);
    closeModal();
    render();
    Utils.showToast(editId?'Ficha atualizada!':'Ficha de anamnese criada!');
  }

  function confirmDelete(id) {
    if(confirm('Excluir esta ficha de anamnese?')){ DB.remove('anamneses',id); render(); Utils.showToast('Ficha removida','info'); }
  }

  function imprimir(id) {
    const a=DB.get('anamneses',id); if(!a)return;
    const cl=DB.get('clientes',a.clienteId);
    const cfg=DB.getConfig();
    const w=window.open('','_blank');
    w.document.write(`
      <html><head><title>Anamnese - ${cl?.nome||''}</title>
      <style>body{font-family:Arial;padding:20px;font-size:12px}h1{font-size:18px}h2{font-size:14px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:16px}table{width:100%;border-collapse:collapse}td{padding:4px 8px;border:1px solid #ccc}@media print{button{display:none}}</style>
      </head><body>
      <h1>${cfg.empresa} — Ficha de Anamnese</h1>
      <p><strong>Cliente:</strong> ${cl?.nome||'?'} &nbsp;&nbsp; <strong>Data:</strong> ${Utils.fmtDate(a.data)}</p>
      <h2>Histórico de Saúde</h2>
      <table><tr><td>Diabetes: ${a.diabetes?'Sim':'Não'}</td><td>Cardiopatia: ${a.cardiopatia?'Sim':'Não'}</td><td>Gestante: ${a.gestante?'Sim':'Não'}</td></tr>
      <tr><td>Marcapasso: ${a.marcapasso?'Sim':'Não'}</td><td>Epilepsia: ${a.epilepsia?'Sim':'Não'}</td><td>Hipertensão: ${a.hipertensao?'Sim':'Não'}</td></tr>
      <tr><td colspan="3">Alergias: ${a.descricaoAlergias||'Nenhuma'}</td></tr>
      <tr><td colspan="3">Medicamentos: ${a.medicamentos||'Nenhum'}</td></tr></table>
      <h2>Pele</h2>
      <p>Fototipo: ${a.fototipo} | Tipos: ${(a.tiposPele||[]).join(', ')||'—'} | Problemas: ${(a.problemasPele||[]).join(', ')||'—'}</p>
      <h2>Objetivos</h2><p>${a.objetivos||'—'}</p>
      <h2>Autorização</h2>
      <p>Declaro que as informações acima são verdadeiras...</p>
      <br><br>
      <p>Assinatura: _______________________________ &nbsp;&nbsp; Data: _______ / _______ / _______</p>
      <button onclick="window.print()">Imprimir</button>
      </body></html>
    `);
  }

  function search(v) {
    const s=v.toLowerCase();
    document.querySelectorAll('#anamneseContent tbody tr').forEach(tr=>{
      tr.style.display=tr.textContent.toLowerCase().includes(s)?'':'none';
    });
  }

  return { render, openForm, closeModal, save, confirmDelete, imprimir, search };
})();
