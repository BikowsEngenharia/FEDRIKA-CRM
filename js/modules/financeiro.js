/* =============================================
   Financeiro — DRE, Fluxo de Caixa, Contas
   ============================================= */
const Financeiro = (() => {
  let activeTab = 'lancamentos';
  let editId = null;
  let mesAtual = Utils.thisMonth();

  function render() {
    document.getElementById('financeiroContent').innerHTML = `
      <div class="tabs">
        <button class="tab-btn ${activeTab==='lancamentos'?'active':''}" onclick="Financeiro.setTab('lancamentos')">Lançamentos</button>
        <button class="tab-btn ${activeTab==='contaspagar'?'active':''}" onclick="Financeiro.setTab('contaspagar')">Contas a Pagar</button>
        <button class="tab-btn ${activeTab==='dre'?'active':''}" onclick="Financeiro.setTab('dre')">DRE</button>
        <button class="tab-btn ${activeTab==='fluxo'?'active':''}" onclick="Financeiro.setTab('fluxo')">Fluxo de Caixa</button>
      </div>
      <div id="finTabContent"></div>
      ${renderModal()}
      ${renderContaModal()}
    `;
    renderTab();
  }

  function setTab(t) { activeTab=t; render(); }

  function renderTab() {
    if(activeTab==='lancamentos') renderLancamentos();
    else if(activeTab==='contaspagar') renderContasPagar();
    else if(activeTab==='dre') renderDRE();
    else if(activeTab==='fluxo') renderFluxo();
  }

  function renderLancamentos() {
    const all = DB.getAll('lancamentos');
    const filtered = Utils.filterByMonth(all,'data',mesAtual);
    const receitas = filtered.filter(l=>l.tipo==='receita').reduce((s,l)=>s+l.valor,0);
    const despesas = filtered.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+l.valor,0);

    document.getElementById('finTabContent').innerHTML = `
      <div class="fin-summary">
        <div class="fin-card"><div class="fin-card-label">Receitas</div><div class="fin-card-value positive">${Utils.fmtBRL(receitas)}</div></div>
        <div class="fin-card"><div class="fin-card-label">Despesas</div><div class="fin-card-value negative">${Utils.fmtBRL(despesas)}</div></div>
        <div class="fin-card"><div class="fin-card-label">Saldo</div><div class="fin-card-value ${receitas-despesas>=0?'positive':'negative'}">${Utils.fmtBRL(receitas-despesas)}</div></div>
        <div class="fin-card"><div class="fin-card-label">Lançamentos</div><div class="fin-card-value purple">${filtered.length}</div></div>
      </div>
      <div class="card">
        <div class="card-title">
          <span>Lançamentos</span>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="month" id="mesFilter" value="${mesAtual}" onchange="Financeiro.changeMes(this.value)" style="padding:5px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
            <button class="btn btn-primary btn-sm" onclick="Financeiro.openNew('receita')">+ Receita</button>
            <button class="btn btn-outline btn-sm" onclick="Financeiro.openNew('despesa')">+ Despesa</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Forma Pgto</th><th>Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${filtered.length===0?`<tr><td colspan="8"><div class="empty-state"><p>Nenhum lançamento neste mês</p></div></td></tr>`:
              filtered.sort((a,b)=>b.data.localeCompare(a.data)).map(l=>`<tr>
                <td>${Utils.fmtDate(l.data)}</td>
                <td><span class="badge ${l.tipo==='receita'?'badge-green':'badge-red'}">${l.tipo==='receita'?'Receita':'Despesa'}</span></td>
                <td><strong>${Utils.escapeHtml(l.descricao)}</strong></td>
                <td>${l.categoria||'—'}</td>
                <td>${l.formaPagamento||'—'}</td>
                <td style="font-weight:700;color:${l.tipo==='receita'?'var(--green)':'var(--red)'}">${Utils.fmtBRL(l.valor)}</td>
                <td><span class="badge ${l.conciliado?'badge-green':'badge-gold'}">${l.conciliado?'Conciliado':'Pendente'}</span></td>
                <td><div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="Financeiro.openEdit('${l.id}')">✎</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Financeiro.confirmDelete('${l.id}')">✕</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderContasPagar() {
    const contas = DB.getAll('contaspagar').sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
    const hoje = Utils.today();
    const pendentes = contas.filter(c=>c.status!=='Pago');
    const totalPend = pendentes.reduce((s,c)=>s+c.valor,0);
    const vencidas = pendentes.filter(c=>c.vencimento<hoje);
    const totalVenc = vencidas.reduce((s,c)=>s+c.valor,0);

    document.getElementById('finTabContent').innerHTML = `
      <div class="fin-summary">
        <div class="fin-card"><div class="fin-card-label">Total a Pagar</div><div class="fin-card-value negative">${Utils.fmtBRL(totalPend)}</div></div>
        <div class="fin-card"><div class="fin-card-label">Vencidas</div><div class="fin-card-value negative">${Utils.fmtBRL(totalVenc)}</div></div>
        <div class="fin-card"><div class="fin-card-label">Pendentes</div><div class="fin-card-value gold">${pendentes.length}</div></div>
        <div class="fin-card"><div class="fin-card-label">Pagas (mês)</div><div class="fin-card-value positive">${contas.filter(c=>c.status==='Pago').length}</div></div>
      </div>
      <div class="card">
        <div class="card-title">Contas a Pagar <button class="btn btn-primary btn-sm" onclick="Financeiro.openNewConta()">+ Nova Conta</button></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Descrição</th><th>Fornecedor</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Recorrente</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${contas.length===0?`<tr><td colspan="8"><div class="empty-state"><p>Nenhuma conta a pagar</p></div></td></tr>`:
              contas.map(c=>{
                const vencida=c.status!=='Pago'&&c.vencimento<hoje;
                return `<tr style="${vencida?'background:var(--red-light)':''}">
                  <td><strong>${Utils.escapeHtml(c.descricao)}</strong></td>
                  <td>${c.fornecedor||'—'}</td>
                  <td>${c.categoria||'—'}</td>
                  <td style="color:${vencida?'var(--red)':'inherit'};font-weight:${vencida?'700':'400'}">${Utils.fmtDate(c.vencimento)}${vencida?' ⚠':''}</td>
                  <td style="font-weight:700">${Utils.fmtBRL(c.valor)}</td>
                  <td>${c.recorrente?'<span class="badge badge-purple">Sim</span>':'—'}</td>
                  <td><span class="badge ${c.status==='Pago'?'badge-green':vencida?'badge-red':'badge-gold'}">${c.status||'Pendente'}</span></td>
                  <td><div style="display:flex;gap:4px">
                    ${c.status!=='Pago'?`<button class="btn btn-ghost btn-sm" onclick="Financeiro.pagarConta('${c.id}')" title="Marcar como pago" style="color:var(--green)">✓ Pagar</button>`:''}
                    <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Financeiro.confirmDeleteConta('${c.id}')">✕</button>
                  </div></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDRE() {
    const meses = [];
    for(let i=2;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); meses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }

    const rows = [
      {label:'(+) Receita de Serviços', tipo:'receita', cat:'Serviços', cls:'positive'},
      {label:'(+) Venda de Produtos', tipo:'receita', cat:'Produtos', cls:'positive'},
      {label:'(+) Pacotes', tipo:'receita', cat:'Pacotes', cls:'positive'},
      {label:'(=) RECEITA BRUTA', tipo:'total_receita', cls:'font-bold'},
      {label:'(-) Pessoal / Comissões', tipo:'despesa', cat:'Pessoal', cls:'negative'},
      {label:'(-) Aluguel', tipo:'despesa', cat:'Aluguel', cls:'negative'},
      {label:'(-) Estoque / Produtos', tipo:'despesa', cat:'Estoque', cls:'negative'},
      {label:'(-) Equipamentos', tipo:'despesa', cat:'Equipamentos', cls:'negative'},
      {label:'(-) Marketing', tipo:'despesa', cat:'Marketing', cls:'negative'},
      {label:'(-) Utilidades', tipo:'despesa', cat:'Utilidades', cls:'negative'},
      {label:'(-) Outras Despesas', tipo:'despesa', cat:'Outro', cls:'negative'},
      {label:'(=) TOTAL DESPESAS', tipo:'total_despesa', cls:'font-bold'},
      {label:'(=) RESULTADO LÍQUIDO', tipo:'resultado', cls:'font-bold resultado'},
    ];

    const dreData = meses.map(ym=>{
      const l=Utils.filterByMonth(DB.getAll('lancamentos'),'data',ym);
      const rec=(cat)=>l.filter(x=>x.tipo==='receita'&&x.categoria===cat).reduce((s,x)=>s+x.valor,0);
      const dep=(cat)=>l.filter(x=>x.tipo==='despesa'&&(cat==='Outro'?!['Pessoal','Aluguel','Estoque','Equipamentos','Marketing','Utilidades'].includes(x.categoria):x.categoria===cat)).reduce((s,x)=>s+x.valor,0);
      const totalRec=l.filter(x=>x.tipo==='receita').reduce((s,x)=>s+x.valor,0);
      const totalDep=l.filter(x=>x.tipo==='despesa').reduce((s,x)=>s+x.valor,0);
      return {rec,dep,totalRec,totalDep,resultado:totalRec-totalDep};
    });

    document.getElementById('finTabContent').innerHTML = `
      <div class="card">
        <div class="card-title">DRE — Demonstrativo de Resultado</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Conta</th>${meses.map(ym=>`<th style="text-align:right">${new Date(ym+'-15').toLocaleString('pt-BR',{month:'short',year:'numeric'})}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map(row=>`<tr style="${['total_receita','total_despesa','resultado'].includes(row.tipo)?'background:var(--bg)':''}">
                <td style="${['total_receita','total_despesa','resultado'].includes(row.tipo)?'font-weight:700':'padding-left:24px'}">${row.label}</td>
                ${dreData.map(d=>{
                  let val=0;
                  if(row.tipo==='receita') val=d.rec(row.cat);
                  else if(row.tipo==='despesa') val=d.dep(row.cat);
                  else if(row.tipo==='total_receita') val=d.totalRec;
                  else if(row.tipo==='total_despesa') val=d.totalDep;
                  else if(row.tipo==='resultado') val=d.resultado;
                  const color=row.tipo==='resultado'?(val>=0?'var(--green)':'var(--red)'):row.cls==='negative'&&val>0?'var(--red)':'inherit';
                  return `<td style="text-align:right;font-weight:${['total_receita','total_despesa','resultado'].includes(row.tipo)?'700':'400'};color:${color}">${val!==0?Utils.fmtBRL(val):'—'}</td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderFluxo() {
    const all = DB.getAll('lancamentos');
    const contas = DB.getAll('contaspagar').filter(c=>c.status!=='Pago');
    const meses=[];
    for(let i=2;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); meses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }
    const futuro=[]; for(let i=1;i<=2;i++){ const d=new Date(); d.setMonth(d.getMonth()+i); futuro.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }

    const allMeses=[...meses,...futuro];
    let saldoAcumulado=0;
    const rows=allMeses.map(ym=>{
      const l=Utils.filterByMonth(all,'data',ym);
      const rec=l.filter(x=>x.tipo==='receita').reduce((s,x)=>s+x.valor,0);
      const dep=l.filter(x=>x.tipo==='despesa').reduce((s,x)=>s+x.valor,0);
      const cpagar=contas.filter(c=>c.vencimento.startsWith(ym)).reduce((s,c)=>s+c.valor,0);
      const saldo=rec-dep-cpagar;
      saldoAcumulado+=saldo;
      return {ym,rec,dep,cpagar,saldo,saldoAcumulado};
    });

    document.getElementById('finTabContent').innerHTML=`
      <div class="card">
        <div class="card-title">Fluxo de Caixa — Projetado</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Mês</th><th style="text-align:right">Entradas</th><th style="text-align:right">Saídas</th><th style="text-align:right">Contas a Pagar</th><th style="text-align:right">Saldo do Mês</th><th style="text-align:right">Saldo Acumulado</th></tr></thead>
            <tbody>
              ${rows.map(r=>`<tr>
                <td><strong>${new Date(r.ym+'-15').toLocaleString('pt-BR',{month:'long',year:'numeric'})}</strong>${futuro.includes(r.ym)?'<span class="badge badge-gold" style="margin-left:4px">Projeção</span>':''}</td>
                <td style="text-align:right;color:var(--green)">${Utils.fmtBRL(r.rec)}</td>
                <td style="text-align:right;color:var(--red)">${Utils.fmtBRL(r.dep)}</td>
                <td style="text-align:right;color:var(--red)">${r.cpagar>0?Utils.fmtBRL(r.cpagar):'—'}</td>
                <td style="text-align:right;font-weight:700;color:${r.saldo>=0?'var(--green)':'var(--red)'}">${Utils.fmtBRL(r.saldo)}</td>
                <td style="text-align:right;font-weight:700;color:${r.saldoAcumulado>=0?'var(--green)':'var(--red)'}">${Utils.fmtBRL(r.saldoAcumulado)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderModal() {
    const cats=['Serviços','Produtos','Pacotes','Comissão','Outro'];
    const catsDep=['Pessoal','Aluguel','Estoque','Equipamentos','Marketing','Utilidades','Impostos','Outro'];
    return `<div id="modalLancamento" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header"><h3 id="lancTitle">Novo Lançamento</h3><button class="modal-close" onclick="Financeiro.closeModal()">×</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label>Tipo</label>
              <select id="lancTipo" onchange="Financeiro.toggleCats()">
                <option value="receita">Receita</option><option value="despesa">Despesa</option>
              </select>
            </div>
            <div class="form-group"><label>Descrição *</label><input type="text" id="lancDesc" placeholder="Descreva o lançamento"></div>
            <div class="form-group form-grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group"><label>Valor (R$) *</label><input type="number" id="lancValor" step="0.01" min="0" placeholder="0,00"></div>
              <div class="form-group"><label>Data *</label><input type="date" id="lancData" value="${Utils.today()}"></div>
            </div>
            <div class="form-group"><label>Categoria</label>
              <select id="lancCategoria">
                ${cats.map(c=>`<option>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Forma de Pagamento</label>
              <select id="lancFormaPgto">
                <option value="">— Não informado —</option>
                <option>Dinheiro</option><option>Cartão de Crédito</option><option>Cartão de Débito</option><option>PIX</option><option>Transferência</option>
              </select>
            </div>
            <div class="form-group"><label>Conciliado</label>
              <select id="lancConciliado"><option value="1">Sim</option><option value="0">Não</option></select>
            </div>
            <div class="form-group"><label>Observações</label><textarea id="lancObs" rows="2"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Financeiro.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Financeiro.save()">Salvar</button>
        </div>
      </div>
    </div>`;
  }

  function renderContaModal() {
    return `<div id="modalConta" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header"><h3>Nova Conta a Pagar</h3><button class="modal-close" onclick="Financeiro.closeContaModal()">×</button></div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group" style="grid-column:span 2"><label>Descrição *</label><input type="text" id="ctDesc" placeholder="Descrição da conta"></div>
            <div class="form-group"><label>Valor (R$) *</label><input type="number" id="ctValor" step="0.01" min="0"></div>
            <div class="form-group"><label>Vencimento *</label><input type="date" id="ctVenc" value="${Utils.today()}"></div>
            <div class="form-group"><label>Categoria</label>
              <select id="ctCat">
                <option>Pessoal</option><option>Aluguel</option><option>Estoque</option><option>Equipamentos</option><option>Marketing</option><option>Utilidades</option><option>Impostos</option><option>Outro</option>
              </select>
            </div>
            <div class="form-group"><label>Fornecedor</label><input type="text" id="ctFornec" placeholder="Nome do fornecedor"></div>
            <div class="form-group"><label>Recorrente?</label><select id="ctRecor"><option value="0">Não</option><option value="1">Sim (mensal)</option></select></div>
            <div class="form-group"><label>Status</label><select id="ctStatus"><option>Pendente</option><option>Pago</option></select></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Financeiro.closeContaModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Financeiro.saveConta()">Salvar</button>
        </div>
      </div>
    </div>`;
  }

  function openNew(tipo='receita') {
    editId=null;
    document.getElementById('lancTitle').textContent = tipo==='receita'?'Nova Receita':'Nova Despesa';
    document.getElementById('lancTipo').value=tipo;
    document.getElementById('lancDesc').value='';
    document.getElementById('lancValor').value='';
    document.getElementById('lancData').value=Utils.today();
    document.getElementById('lancObs').value='';
    document.getElementById('lancFormaPgto').value='';
    document.getElementById('lancConciliado').value='1';
    document.getElementById('modalLancamento').classList.remove('hidden');
  }

  function openEdit(id) {
    editId=id;
    const l=DB.get('lancamentos',id); if(!l)return;
    document.getElementById('lancTitle').textContent='Editar Lançamento';
    document.getElementById('lancTipo').value=l.tipo;
    document.getElementById('lancDesc').value=l.descricao||'';
    document.getElementById('lancValor').value=l.valor||0;
    document.getElementById('lancData').value=l.data||'';
    document.getElementById('lancCategoria').value=l.categoria||'Serviços';
    document.getElementById('lancFormaPgto').value=l.formaPagamento||'';
    document.getElementById('lancConciliado').value=l.conciliado?'1':'0';
    document.getElementById('lancObs').value=l.observacoes||'';
    document.getElementById('modalLancamento').classList.remove('hidden');
  }

  function openNewConta() { document.getElementById('modalConta').classList.remove('hidden'); }
  function closeModal() { document.getElementById('modalLancamento').classList.add('hidden'); }
  function closeContaModal() { document.getElementById('modalConta').classList.add('hidden'); }

  function save() {
    const desc=document.getElementById('lancDesc').value.trim();
    const valor=Number(document.getElementById('lancValor').value);
    const data=document.getElementById('lancData').value;
    if(!desc||!valor||!data){ Utils.showToast('Preencha os campos obrigatórios','error'); return; }
    const d={tipo:document.getElementById('lancTipo').value,descricao:desc,valor,data,categoria:document.getElementById('lancCategoria').value,formaPagamento:document.getElementById('lancFormaPgto').value,conciliado:document.getElementById('lancConciliado').value==='1',observacoes:document.getElementById('lancObs').value};
    if(editId) DB.update('lancamentos',editId,d);
    else DB.create('lancamentos',d);
    closeModal();
    render();
    Utils.showToast(editId?'Lançamento atualizado!':'Lançamento registrado!');
  }

  function saveConta() {
    const desc=document.getElementById('ctDesc').value.trim();
    const valor=Number(document.getElementById('ctValor').value);
    const venc=document.getElementById('ctVenc').value;
    if(!desc||!valor||!venc){ Utils.showToast('Preencha os campos obrigatórios','error'); return; }
    DB.create('contaspagar',{descricao:desc,valor,vencimento:venc,categoria:document.getElementById('ctCat').value,fornecedor:document.getElementById('ctFornec').value,recorrente:document.getElementById('ctRecor').value==='1',status:document.getElementById('ctStatus').value});
    closeContaModal();
    render();
    Utils.showToast('Conta cadastrada!');
  }

  function pagarConta(id) {
    DB.update('contaspagar',id,{status:'Pago',dataPagamento:Utils.today()});
    render();
    Utils.showToast('Conta marcada como paga!');
  }

  function confirmDelete(id) {
    if(confirm('Excluir este lançamento?')){ DB.remove('lancamentos',id); render(); Utils.showToast('Lançamento removido','info'); }
  }

  function confirmDeleteConta(id) {
    if(confirm('Excluir esta conta a pagar?')){ DB.remove('contaspagar',id); render(); Utils.showToast('Conta removida','info'); }
  }

  function changeMes(v) { mesAtual=v; renderLancamentos(); }
  function toggleCats() {}

  return { render, setTab, openNew, openEdit, openNewConta, closeModal, closeContaModal, save, saveConta, pagarConta, confirmDelete, confirmDeleteConta, changeMes, toggleCats };
})();
