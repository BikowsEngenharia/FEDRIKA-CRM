/* =============================================
   App — Controlador principal
   ============================================= */

/* ---------- Auth ---------- */
const Auth = (() => {
  function showLogin()  { document.getElementById('loginForm').classList.remove('hidden'); document.getElementById('signupForm').classList.add('hidden'); clearError(); }
  function showSignup() { document.getElementById('signupForm').classList.remove('hidden'); document.getElementById('loginForm').classList.add('hidden'); clearError(); }
  function clearError() { document.getElementById('loginError').textContent = ''; }
  function setError(msg) { document.getElementById('loginError').textContent = msg; }

  async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    if (!email || !pass) { setError('Preencha email e senha.'); return; }
    const { error } = await DB.getClient().auth.signInWithPassword({ email, password: pass });
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message);
  }

  async function signup() {
    const email = document.getElementById('signupEmail').value.trim();
    const pass  = document.getElementById('signupPassword').value;
    if (!email || !pass) { setError('Preencha email e senha.'); return; }
    if (pass.length < 6)  { setError('Senha deve ter pelo menos 6 caracteres.'); return; }
    const { error } = await DB.getClient().auth.signUp({ email, password: pass });
    if (error) { setError(error.message); return; }
    setError('');
    document.getElementById('loginError').style.color = 'var(--green)';
    document.getElementById('loginError').textContent = 'Conta criada! Verifique seu email para confirmar.';
  }

  async function logout() {
    await DB.getClient().auth.signOut();
  }

  return { showLogin, showSignup, login, signup, logout };
})();

/* ---------- App ---------- */
const App = (() => {
  const pages = {
    dashboard:  { label: 'Dashboard',          module: Dashboard,  content: 'dashContent' },
    agenda:     { label: 'Agenda',             module: Agenda,     content: 'agendaContent' },
    clientes:   { label: 'Clientes',           module: Clientes,   content: 'clientesContent' },
    anamnese:   { label: 'Fichas de Anamnese', module: Anamnese,   content: 'anamneseContent' },
    servicos:   { label: 'Serviços',           module: Servicos,   content: 'servicosContent' },
    financeiro: { label: 'Financeiro',         module: Financeiro, content: 'financeiroContent' },
    estoque:    { label: 'Estoque',            module: Estoque,    content: 'estoqueContent' },
    metas:      { label: 'Metas & KPIs',       module: Metas,      content: 'metasContent' },
    atividades: { label: 'Atividades',         module: Atividades, content: 'atividadesContent' },
    relatorios: { label: 'Relatórios',         module: Relatorios, content: 'relatoriosContent' },
    config:     { label: 'Configurações',      module: Config,     content: 'configContent' },
  };

  let currentPage = 'dashboard';
  let _initialized = false;

  async function init() {
    DB.initClient();

    // Observa mudanças de autenticação
    DB.getClient().auth.onAuthStateChange(async (event, session) => {
      if (session && !_initialized) {
        _initialized = true;
        await _onLogin();
      } else if (event === 'SIGNED_OUT') {
        _initialized = false;
        location.reload();
      }
    });
  }

  async function _onLogin() {
    const overlay = document.getElementById('loginOverlay');
    overlay.classList.remove('hidden');
    overlay.querySelector('.login-card').innerHTML = `
      <div class="login-brand"><div style="font-size:52px">🌸</div><h1>Fedrika</h1></div>
      <div class="login-loading"><div class="login-spinner"></div>Carregando dados...</div>
    `;

    try {
      await DB.loadAll();
      await DB.initSampleData();
    } catch(e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      overlay.classList.add('hidden');
    }

    updateBrand();
    updateUser();
    updateDate();
    navigateTo('dashboard');
    setupNavigation();
  }

  function _onLogout() {
    // Recarrega a página para mostrar o login limpo
    location.reload();
  }

  function navigateTo(page) {
    if (!pages[page]) return;
    currentPage = page;

    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById('page_' + page);
    if (pageEl) pageEl.classList.add('active');

    const pg = pages[page];
    document.getElementById('topbarTitle').textContent = pg.label;
    document.getElementById('topbarSub').textContent = getSubtitle(page);

    pg.module.render();
  }

  function getSubtitle(page) {
    const map = {
      dashboard: 'Visão geral do negócio',
      agenda: 'Agendamentos e horários',
      clientes: 'Carteira de clientes',
      anamnese: 'Fichas e histórico de saúde',
      servicos: 'Serviços, tratamentos e profissionais',
      financeiro: 'Receitas, despesas e fluxo de caixa',
      estoque: 'Produtos e movimentações',
      metas: 'Objetivos e indicadores',
      atividades: 'Tarefas e follow-ups',
      relatorios: 'Análises e relatórios',
      config: 'Configurações do sistema',
    };
    return map[page] || '';
  }

  function setupNavigation() {
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(link.dataset.page);
      });
    });
  }

  function updateBrand() {
    const cfg = DB.getConfig();
    document.getElementById('brandName').textContent = 'Fedrika';
    document.title = cfg.empresa || 'CRM Fedrika';
  }

  function updateUser() {
    const cfg = DB.getConfig();
    const nome = cfg.usuario?.nome || 'Admin';
    document.getElementById('sidebarName').textContent = nome;
    document.getElementById('sidebarRole').textContent = cfg.usuario?.cargo || 'Administrador';
    document.getElementById('sidebarAvatar').textContent = Utils.initials(nome);
  }

  function updateDate() {
    const now = new Date();
    document.getElementById('topbarDate').textContent = now.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  return { init, navigateTo, updateBrand, updateUser };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
