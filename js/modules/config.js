/* =============================================
   Configurações
   ============================================= */
const Config = (() => {

  function render() {
    const cfg = DB.getConfig();
    document.getElementById('configContent').innerHTML = `
      <div class="card-grid card-grid-2">
        <!-- Dados da empresa -->
        <div class="card">
          <div class="card-title">Dados da Empresa</div>
          <div class="form-grid">
            <div class="form-group"><label>Nome da Empresa</label><input type="text" id="cfgEmpresa" value="${Utils.escapeHtml(cfg.empresa||'')}"></div>
            <div class="form-group"><label>CNPJ</label><input type="text" id="cfgCnpj" value="${cfg.cnpj||''}"></div>
            <div class="form-group"><label>Telefone</label><input type="text" id="cfgTelefone" value="${cfg.telefone||''}"></div>
            <div class="form-group"><label>Email</label><input type="email" id="cfgEmail" value="${cfg.email||''}"></div>
            <div class="form-group"><label>Endereço</label><input type="text" id="cfgEndereco" value="${Utils.escapeHtml(cfg.endereco||'')}"></div>
            <div class="form-group"><label>Cidade</label><input type="text" id="cfgCidade" value="${cfg.cidade||''}"></div>
            <div class="form-group"><label>Estado</label><input type="text" id="cfgEstado" value="${cfg.estado||''}" maxlength="2"></div>
            <div class="form-group"><label>Comissão Padrão (%)</label><input type="number" id="cfgComissao" value="${cfg.comissaoPadrao||30}" min="0" max="100"></div>
          </div>
          <div style="margin-top:14px">
            <button class="btn btn-primary" onclick="Config.saveEmpresa()">Salvar Empresa</button>
          </div>
        </div>

        <!-- Usuário logado -->
        <div class="card">
          <div class="card-title">Usuário / Acesso</div>
          <div class="form-grid">
            <div class="form-group"><label>Nome</label><input type="text" id="cfgNome" value="${Utils.escapeHtml(cfg.usuario?.nome||'')}"></div>
            <div class="form-group"><label>Cargo</label><input type="text" id="cfgCargo" value="${cfg.usuario?.cargo||''}"></div>
          </div>
          <div style="margin-top:14px">
            <button class="btn btn-primary" onclick="Config.saveUsuario()">Salvar Usuário</button>
          </div>
          <div class="divider"></div>
          <div class="card-title" style="margin-bottom:12px">Horários de Funcionamento</div>
          <div class="form-grid form-grid-2">
            <div class="form-group"><label>Abertura</label><input type="time" id="cfgHoraInicio" value="${cfg.horaInicio||'08:00'}"></div>
            <div class="form-group"><label>Fechamento</label><input type="time" id="cfgHoraFim" value="${cfg.horaFim||'20:00'}"></div>
          </div>
          <div style="margin-top:10px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">DIAS DE ATENDIMENTO</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i)=>`
                <label style="display:flex;align-items:center;gap:4px;font-size:13px">
                  <input type="checkbox" ${(cfg.diasSemana||[1,2,3,4,5,6]).includes(i)?'checked':''} data-dia="${i}" class="diasAtend">
                  ${d}
                </label>
              `).join('')}
            </div>
          </div>
          <div style="margin-top:14px">
            <button class="btn btn-primary" onclick="Config.saveHorarios()">Salvar Horários</button>
          </div>
        </div>

        <!-- Backup & Reset -->
        <div class="card">
          <div class="card-title">Dados & Backup</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-outline" onclick="Config.exportarDados()">📥 Exportar todos os dados (JSON)</button>
            <div style="font-size:12px;color:var(--text-muted)">Faça backup dos seus dados periodicamente.</div>
            <div class="divider"></div>
            <button class="btn btn-danger" onclick="Config.resetarDados()">⚠️ Resetar dados de demonstração</button>
            <div style="font-size:12px;color:var(--text-muted)">Apaga todos os dados e recarrega exemplos.</div>
          </div>
        </div>

        <!-- Sobre -->
        <div class="card">
          <div class="card-title">Sobre o Sistema</div>
          <div style="font-size:13px;line-height:2;color:var(--text-muted)">
            <div>💄 <strong>CRM Fedrika</strong> — Estética, Saúde & Beleza</div>
            <div>📌 Versão 1.0</div>
            <div>🗄️ Armazenamento: localStorage do navegador</div>
            <div>🔒 Dados locais — não enviados para servidores</div>
            <div style="margin-top:10px">
              <strong>Módulos:</strong> Dashboard · Agenda · Clientes · Anamnese · Serviços · Financeiro · Estoque · Metas · Atividades · Relatórios
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function saveEmpresa() {
    DB.saveConfig({
      empresa: document.getElementById('cfgEmpresa').value,
      cnpj: document.getElementById('cfgCnpj').value,
      telefone: document.getElementById('cfgTelefone').value,
      email: document.getElementById('cfgEmail').value,
      endereco: document.getElementById('cfgEndereco').value,
      cidade: document.getElementById('cfgCidade').value,
      estado: document.getElementById('cfgEstado').value,
      comissaoPadrao: Number(document.getElementById('cfgComissao').value)||30,
    });
    App.updateBrand();
    Utils.showToast('Dados da empresa salvos!');
  }

  function saveUsuario() {
    const cfg = DB.getConfig();
    DB.saveConfig({ usuario: { ...cfg.usuario, nome: document.getElementById('cfgNome').value, cargo: document.getElementById('cfgCargo').value } });
    App.updateUser();
    Utils.showToast('Usuário salvo!');
  }

  function saveHorarios() {
    const dias = Array.from(document.querySelectorAll('.diasAtend:checked')).map(e=>Number(e.dataset.dia));
    DB.saveConfig({ horaInicio: document.getElementById('cfgHoraInicio').value, horaFim: document.getElementById('cfgHoraFim').value, diasSemana: dias });
    Utils.showToast('Horários salvos!');
  }

  function exportarDados() {
    const data = {};
    ['clientes','agendamentos','anamneses','servicos','produtos','movEstoque','lancamentos','contaspagar','funcionarios','metas','atividades'].forEach(k=>{ data[k]=DB.getAll(k); });
    data.config = DB.getConfig();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fedrika_backup_${Utils.today()}.json`;
    a.click();
    Utils.showToast('Dados exportados!');
  }

  async function resetarDados() {
    if(!confirm('ATENÇÃO: Isto apagará TODOS os dados e recarregará os exemplos. Confirmar?')) return;
    const client = DB.getClient();
    await client.from('crm_data').delete().neq('key','__none__');
    location.reload();
  }

  return { render, saveEmpresa, saveUsuario, saveHorarios, exportarDados, resetarDados };
})();
