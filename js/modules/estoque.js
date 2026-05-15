/* =============================================
   Estoque
   ============================================= */
const Estoque = (() => {
  let editId = null;
  let searchTerm = '';

  function render() {
    const produtos = getFiltered();
    const alertas = DB.getAll('produtos').filter(p=>p.ativo&&p.estoqueAtual<=p.estoqueMin);

    document.getElementById('estoqueContent').innerHTML = `
      ${alertas.length>0?`<div style="background:var(--red-light);border:1px solid var(--red);border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">⚠️</span>
        <div><strong>${alertas.length} produto(s) com estoque crítico:</strong> ${alertas.map(p=>p.nome).join(', ')}</div>
      </div>`:''}
      <div class="card-grid card-grid-4 mb-4">
        <div class="kpi-card"><div class="kpi-icon purple">📦</div><div class="kpi-body"><div class="kpi-label">Total Produtos</div><div class="kpi-value">${DB.getAll('produtos').filter(p=>p.ativo).length}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon pink">⚠️</div><div class="kpi-body"><div class="kpi-label">Estoque Crítico</div><div class="kpi-value" style="color:var(--red)">${alertas.length}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon gold">💰</div><div class="kpi-body"><div class="kpi-label">Valor em Estoque</div><div class="kpi-value">${Utils.fmtBRL(DB.getAll('produtos').filter(p=>p.ativo).reduce((s,p)=>s+(p.estoqueAtual*p.precoCompra),0))}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon teal">🔄</div><div class="kpi-body"><div class="kpi-label">Movimentações</div><div class="kpi-value">${DB.getAll('movEstoque').length}</div></div></div>
      </div>
      <div class="toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar produto..." value="${searchTerm}" oninput="Estoque.search(this.value)">
        </div>
        <button class="btn btn-primary" onclick="Estoque.openNew()">+ Novo Produto</button>
        <button class="btn btn-outline" onclick="Estoque.openMovimentacao()">+ Movimentação</button>
      </div>
      <div class="card">
        <div class="card-title">Produtos em Estoque</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Produto</th><th>Categoria</th><th>Marca</th><th>Estoque Atual</th><th>Estoque Mín.</th><th>Preço Compra</th><th>Preço Venda</th><th>Valor Total</th><th></th></tr></thead>
            <tbody>
              ${produtos.length===0?`<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📦</div><h3>Nenhum produto encontrado</h3></div></td></tr>`:
              produtos.map(p=>{
                const critico=p.estoqueAtual<=p.estoqueMin;
                const pct=p.estoqueMin>0?Math.min(Math.round(p.estoqueAtual/p.estoqueMin*50),100):100;
                return `<tr>
                  <td>
                    <div style="font-weight:600">${Utils.escapeHtml(p.nome)}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${p.unidade||'un'}</div>
                  </td>
                  <td><span class="badge badge-purple">${p.categoria||'—'}</span></td>
                  <td>${p.marca||'—'}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <strong style="color:${critico?'var(--red)':p.estoqueAtual<=p.estoqueMin*1.5?'var(--gold)':'var(--green)'}">${p.estoqueAtual}</strong>
                      <div class="progress-bar" style="width:60px"><div class="progress-fill ${critico?'':'green'}" style="width:${pct}%;background:${critico?'var(--red)':p.estoqueAtual<=p.estoqueMin*1.5?'var(--gold)':'var(--green)'}"></div></div>
                    </div>
                    ${critico?'<span class="badge badge-red">Crítico</span>':''}
                  </td>
                  <td>${p.estoqueMin}</td>
                  <td>${Utils.fmtBRL(p.precoCompra||0)}</td>
                  <td>${p.precoVenda>0?Utils.fmtBRL(p.precoVenda):'—'}</td>
                  <td>${Utils.fmtBRL((p.estoqueAtual||0)*(p.precoCompra||0))}</td>
                  <td><div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm" onclick="Estoque.openEdit('${p.id}')">✎</button>
                    <button class="btn btn-ghost btn-sm" onclick="Estoque.openMovimentacao('${p.id}')" title="Movimentar estoque">📦</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Estoque.confirmDelete('${p.id}')">✕</button>
                  </div></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ${renderModal()}
      ${renderMovModal()}
    `;
  }

  function getFiltered() {
    let list = DB.getAll('produtos').filter(p=>p.ativo);
    if(searchTerm) list=list.filter(p=>[p.nome,p.categoria,p.marca].some(f=>f&&f.toLowerCase().includes(searchTerm.toLowerCase())));
    return list.sort((a,b)=>a.nome.localeCompare(b.nome));
  }

  function renderModal() {
    const cats=['Cosméticos','Equipamentos','Higiene','Insumos','Revenda','Outros'];
    return `<div id="modalProduto" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header"><h3 id="prodTitle">Novo Produto</h3><button class="modal-close" onclick="Estoque.closeModal()">×</button></div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group" style="grid-column:span 2"><label>Nome *</label><input type="text" id="pNome" placeholder="Nome do produto"></div>
            <div class="form-group"><label>Categoria</label>
              <select id="pCategoria">${cats.map(c=>`<option>${c}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Marca</label><input type="text" id="pMarca" placeholder="Marca"></div>
            <div class="form-group"><label>Unidade</label>
              <select id="pUnidade"><option>un</option><option>cx</option><option>kg</option><option>L</option><option>ml</option><option>pct</option></select>
            </div>
            <div class="form-group"><label>Estoque Atual</label><input type="number" id="pEstAtual" min="0" value="0"></div>
            <div class="form-group"><label>Estoque Mínimo</label><input type="number" id="pEstMin" min="0" value="5"></div>
            <div class="form-group"><label>Preço de Compra (R$)</label><input type="number" id="pPrecoCompra" step="0.01" min="0" value="0"></div>
            <div class="form-group"><label>Preço de Venda (R$)</label><input type="number" id="pPrecoVenda" step="0.01" min="0" value="0" placeholder="0 = sem venda"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Estoque.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Estoque.save()">Salvar</button>
        </div>
      </div>
    </div>`;
  }

  function renderMovModal() {
    return `<div id="modalMovEstoque" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header"><h3>Movimentação de Estoque</h3><button class="modal-close" onclick="Estoque.closeMovModal()">×</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label>Produto *</label>
              <select id="movProduto">
                <option value="">Selecione o produto...</option>
                ${DB.getAll('produtos').filter(p=>p.ativo).sort((a,b)=>a.nome.localeCompare(b.nome)).map(p=>`<option value="${p.id}">${p.nome} (Estoque: ${p.estoqueAtual})</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Tipo</label>
              <select id="movTipo"><option value="entrada">Entrada (Compra/Recebimento)</option><option value="saida">Saída (Uso/Venda)</option><option value="ajuste">Ajuste de Inventário</option></select>
            </div>
            <div class="form-group"><label>Quantidade *</label><input type="number" id="movQtd" min="1" value="1"></div>
            <div class="form-group"><label>Data</label><input type="date" id="movData" value="${Utils.today()}"></div>
            <div class="form-group"><label>Motivo / Observação</label><input type="text" id="movObs" placeholder="Ex: Compra fornecedor, consumo tratamento..."></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Estoque.closeMovModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Estoque.saveMovimentacao()">Registrar</button>
        </div>
      </div>
    </div>`;
  }

  function openNew() {
    editId=null;
    document.getElementById('prodTitle').textContent='Novo Produto';
    ['pNome','pMarca'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('pCategoria').value='Cosméticos';
    document.getElementById('pUnidade').value='un';
    document.getElementById('pEstAtual').value=0;
    document.getElementById('pEstMin').value=5;
    document.getElementById('pPrecoCompra').value=0;
    document.getElementById('pPrecoVenda').value=0;
    document.getElementById('modalProduto').classList.remove('hidden');
  }

  function openEdit(id) {
    editId=id;
    const p=DB.get('produtos',id); if(!p)return;
    document.getElementById('prodTitle').textContent='Editar Produto';
    document.getElementById('pNome').value=p.nome||'';
    document.getElementById('pMarca').value=p.marca||'';
    document.getElementById('pCategoria').value=p.categoria||'Cosméticos';
    document.getElementById('pUnidade').value=p.unidade||'un';
    document.getElementById('pEstAtual').value=p.estoqueAtual||0;
    document.getElementById('pEstMin').value=p.estoqueMin||5;
    document.getElementById('pPrecoCompra').value=p.precoCompra||0;
    document.getElementById('pPrecoVenda').value=p.precoVenda||0;
    document.getElementById('modalProduto').classList.remove('hidden');
  }

  function openMovimentacao(produtoId='') {
    document.getElementById('movProduto').value=produtoId;
    document.getElementById('movTipo').value='entrada';
    document.getElementById('movQtd').value=1;
    document.getElementById('movData').value=Utils.today();
    document.getElementById('movObs').value='';
    document.getElementById('modalMovEstoque').classList.remove('hidden');
  }

  function closeModal() { document.getElementById('modalProduto').classList.add('hidden'); }
  function closeMovModal() { document.getElementById('modalMovEstoque').classList.add('hidden'); }

  function save() {
    const nome=document.getElementById('pNome').value.trim();
    if(!nome){ Utils.showToast('Informe o nome do produto','error'); return; }
    const data={nome,categoria:document.getElementById('pCategoria').value,marca:document.getElementById('pMarca').value,unidade:document.getElementById('pUnidade').value,estoqueAtual:Number(document.getElementById('pEstAtual').value)||0,estoqueMin:Number(document.getElementById('pEstMin').value)||0,precoCompra:Number(document.getElementById('pPrecoCompra').value)||0,precoVenda:Number(document.getElementById('pPrecoVenda').value)||0,ativo:true};
    if(editId) DB.update('produtos',editId,data);
    else DB.create('produtos',data);
    closeModal(); render(); Utils.showToast(editId?'Produto atualizado!':'Produto cadastrado!');
  }

  function saveMovimentacao() {
    const prodId=document.getElementById('movProduto').value;
    const qtd=Number(document.getElementById('movQtd').value)||0;
    if(!prodId||!qtd){ Utils.showToast('Preencha produto e quantidade','error'); return; }
    const tipo=document.getElementById('movTipo').value;
    const prod=DB.get('produtos',prodId);
    let novoEst=prod.estoqueAtual;
    if(tipo==='entrada') novoEst+=qtd;
    else if(tipo==='saida') novoEst=Math.max(0,novoEst-qtd);
    else novoEst=qtd;
    DB.update('produtos',prodId,{estoqueAtual:novoEst});
    DB.create('movEstoque',{produtoId:prodId,tipo,quantidade:qtd,estoqueAntes:prod.estoqueAtual,estoqueDepois:novoEst,data:document.getElementById('movData').value,observacoes:document.getElementById('movObs').value});
    closeMovModal(); render(); Utils.showToast('Movimentação registrada!');
  }

  function confirmDelete(id) {
    if(confirm('Excluir este produto?')){ DB.update('produtos',id,{ativo:false}); render(); Utils.showToast('Produto removido','info'); }
  }

  function search(v) { searchTerm=v; render(); }

  return { render, openNew, openEdit, openMovimentacao, closeModal, closeMovModal, save, saveMovimentacao, confirmDelete, search };
})();
