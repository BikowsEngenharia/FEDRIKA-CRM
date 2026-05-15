/* =============================================
   DB — Camada de dados via Supabase
   ============================================= */
const DB = (() => {
  const SUPABASE_URL = 'https://asznoftobmwbeesemwrt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VwmbFgBVeNT6z4BphP60RQ_092VaS51';

  let _client = null;
  const _cache = {};

  const ENTITIES = ['clientes','agendamentos','anamneses','servicos','produtos','movEstoque',
                    'lancamentos','contaspagar','funcionarios','metas','atividades'];

  const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2,5);
  const now   = () => new Date().toISOString();

  /* ---------- Supabase client ---------- */
  function initClient() {
    _client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  }
  function getClient() { return _client; }

  const LS_KEY = 'fedrika_cache';

  function _saveLS() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_cache)); } catch(e) {}
  }

  function hasLocalCache() {
    return !!localStorage.getItem(LS_KEY);
  }

  function clearLocalCache() {
    localStorage.removeItem(LS_KEY);
  }

  /* ---------- Carrega tudo no cache ---------- */
  async function loadAll() {
    const ls = localStorage.getItem(LS_KEY);
    if (ls) {
      // Cache local disponível: carrega instantaneamente
      try { Object.assign(_cache, JSON.parse(ls)); } catch(e) {}
      ENTITIES.forEach(e => { if (!_cache[e]) _cache[e] = []; });
      if (!_cache['config']) _cache['config'] = _defaultConfig();
      // Sincroniza com Supabase em background (sem bloquear)
      _syncFromSupabase();
      return;
    }
    // Primeira vez: aguarda Supabase com timeout de 12s
    const fetchData = _client.from('crm_data').select('*');
    const timeout   = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 12000));
    try {
      const { data, error } = await Promise.race([fetchData, timeout]);
      if (!error && data) {
        data.forEach(row => { _cache[row.key] = row.data; });
        _saveLS();
      }
    } catch(e) { console.error('loadAll error', e); }
    ENTITIES.forEach(e => { if (!_cache[e]) _cache[e] = []; });
    if (!_cache['config']) _cache['config'] = _defaultConfig();
  }

  async function _syncFromSupabase() {
    try {
      const { data, error } = await _client.from('crm_data').select('*');
      if (error || !data) return;
      data.forEach(row => { _cache[row.key] = row.data; });
      _saveLS();
    } catch(e) {}
  }

  /* ---------- Sincroniza chave no Supabase ---------- */
  async function _sync(key) {
    const { error } = await _client.from('crm_data').upsert({ key, data: _cache[key] }, { onConflict: 'key' });
    if (error) console.error('sync error', key, error);
    else _saveLS();
  }

  /* ---------- CRUD síncrono (opera no cache) ---------- */
  function getAll(entity) { return (_cache[entity] || []).slice(); }

  function get(entity, id) { return (_cache[entity] || []).find(r => r.id === id) || null; }

  function create(entity, data) {
    const record = { ...data, id: genId(), createdAt: now(), updatedAt: now() };
    if (!_cache[entity]) _cache[entity] = [];
    _cache[entity].push(record);
    _sync(entity);
    return record;
  }

  function update(entity, id, data) {
    if (!_cache[entity]) return null;
    const idx = _cache[entity].findIndex(r => r.id === id);
    if (idx === -1) return null;
    _cache[entity][idx] = { ..._cache[entity][idx], ...data, updatedAt: now() };
    _sync(entity);
    return _cache[entity][idx];
  }

  function remove(entity, id) {
    if (!_cache[entity]) return;
    _cache[entity] = _cache[entity].filter(r => r.id !== id);
    _sync(entity);
  }

  /* ---------- Config ---------- */
  function getConfig() { return _cache['config'] || _defaultConfig(); }

  function saveConfig(partial) {
    _cache['config'] = { ...getConfig(), ...partial };
    _sync('config');
  }

  function _defaultConfig() {
    return {
      empresa: 'Fedrika', cnpj: '', telefone: '', email: '',
      endereco: '', cidade: '', estado: '', comissaoPadrao: 30,
      usuario: { nome: 'Admin', cargo: 'Administrador' },
      horaInicio: '08:00', horaFim: '20:00', diasSemana: [1,2,3,4,5,6],
    };
  }

  /* ---------- Dados de exemplo (só se banco vazio) ---------- */
  async function initSampleData() {
    const total = ENTITIES.reduce((s,e) => s + (_cache[e]?.length||0), 0);
    if (total > 0) return;

    const hoje = Utils.today();
    const ym   = hoje.substr(0,7);
    const d = (offset) => { const dt=new Date(); dt.setDate(dt.getDate()+offset); return dt.toISOString().split('T')[0]; };

    /* Funcionários */
    const f1 = create('funcionarios',{nome:'Ana Paula',cargo:'Esteticista',telefone:'(11)99001-1001',email:'ana@fedrika.com',comissao:35,especialidades:['Limpeza de Pele','Peeling'],cor:'#c06db8',ativo:true,totalAtendimentos:0});
    const f2 = create('funcionarios',{nome:'Beatriz Lima',cargo:'Cosmetóloga',telefone:'(11)99001-1002',email:'bea@fedrika.com',comissao:30,especialidades:['Massagem','Drenagem'],cor:'#4db8b0',ativo:true,totalAtendimentos:0});
    const f3 = create('funcionarios',{nome:'Carla Mendes',cargo:'Manicure',telefone:'(11)99001-1003',email:'carla@fedrika.com',comissao:40,especialidades:['Manicure','Pedicure'],cor:'#e8829a',ativo:true,totalAtendimentos:0});
    const f4 = create('funcionarios',{nome:'Daniela Rocha',cargo:'Depiladora',telefone:'(11)99001-1004',email:'dani@fedrika.com',comissao:35,especialidades:['Depilação a Cera','Linha Árabe'],cor:'#d4a017',ativo:true,totalAtendimentos:0});

    /* Serviços */
    const s1 = create('servicos',{nome:'Limpeza de Pele',categoria:'Facial',duracao:60,preco:150,descricao:'',ativo:true});
    const s2 = create('servicos',{nome:'Peeling Químico',categoria:'Facial',duracao:45,preco:200,descricao:'',ativo:true});
    const s3 = create('servicos',{nome:'Massagem Relaxante',categoria:'Corporal',duracao:60,preco:130,descricao:'',ativo:true});
    const s4 = create('servicos',{nome:'Drenagem Linfática',categoria:'Corporal',duracao:60,preco:150,descricao:'',ativo:true});
    const s5 = create('servicos',{nome:'Manicure',categoria:'Unhas',duracao:45,preco:55,descricao:'',ativo:true});
    const s6 = create('servicos',{nome:'Pedicure',categoria:'Unhas',duracao:50,preco:65,descricao:'',ativo:true});
    const s7 = create('servicos',{nome:'Depilação Pernas',categoria:'Depilação',duracao:40,preco:90,descricao:'',ativo:true});
    const s8 = create('servicos',{nome:'Design de Sobrancelha',categoria:'Sobrancelha',duracao:30,preco:60,descricao:'',ativo:true});
    const s9 = create('servicos',{nome:'Hidratação Facial',categoria:'Facial',duracao:40,preco:120,descricao:'',ativo:true});

    /* Clientes */
    const c1 = create('clientes',{nome:'Amanda Ferreira',telefone:'(11)98001-2001',email:'amanda@email.com',nascimento:'1990-03-15',cpf:'111.111.111-01',profissao:'Professora',indicacao:'Instagram',tags:['VIP'],observacoes:'Pele sensível',ativo:true,totalVisitas:12,totalGasto:1840});
    const c2 = create('clientes',{nome:'Bruna Oliveira',telefone:'(11)98001-2002',email:'bruna@email.com',nascimento:'1985-07-22',cpf:'111.111.111-02',profissao:'Advogada',indicacao:'Indicação',tags:['VIP','Assídua'],observacoes:'',ativo:true,totalVisitas:24,totalGasto:3600});
    const c3 = create('clientes',{nome:'Camila Santos',telefone:'(11)98001-2003',email:'camila@email.com',nascimento:'1995-11-08',cpf:'111.111.111-03',profissao:'Designer',indicacao:'Google',tags:['Nova'],observacoes:'',ativo:true,totalVisitas:3,totalGasto:390});
    const c4 = create('clientes',{nome:'Débora Costa',telefone:'(11)98001-2004',email:'debora@email.com',nascimento:'1978-05-30',cpf:'111.111.111-04',profissao:'Empresária',indicacao:'Amiga',tags:['VIP'],observacoes:'Prefere horário manhã',ativo:true,totalVisitas:18,totalGasto:2700});
    const c5 = create('clientes',{nome:'Elisa Martins',telefone:'(11)98001-2005',email:'elisa@email.com',nascimento:'1992-09-14',cpf:'111.111.111-05',profissao:'Nutricionista',indicacao:'Instagram',tags:['Assídua'],observacoes:'',ativo:true,totalVisitas:8,totalGasto:980});
    const c6 = create('clientes',{nome:'Fernanda Lima',telefone:'(11)98001-2006',email:'fer@email.com',nascimento:'1988-12-01',cpf:'111.111.111-06',profissao:'Médica',indicacao:'Colega',tags:['VIP','Assídua'],observacoes:'',ativo:true,totalVisitas:20,totalGasto:3100});

    /* Produtos */
    create('produtos',{nome:'Creme Hidratante Facial 50ml',categoria:'Facial',marca:'Mesoestetic',unidade:'un',estoqueAtual:8,estoqueMin:5,precoCusto:45,precoVenda:90,ativo:true});
    create('produtos',{nome:'Sérum Vitamina C 30ml',categoria:'Facial',marca:'La Roche-Posay',unidade:'un',estoqueAtual:3,estoqueMin:5,precoCusto:120,precoVenda:220,ativo:true});
    create('produtos',{nome:'Óleo de Massagem Relaxante',categoria:'Corporal',marca:'Phytomer',unidade:'un',estoqueAtual:6,estoqueMin:3,precoCusto:35,precoVenda:70,ativo:true});
    create('produtos',{nome:'Cera Depilatória Roll-on',categoria:'Depilação',marca:'Veet',unidade:'un',estoqueAtual:12,estoqueMin:6,precoCusto:18,precoVenda:35,ativo:true});
    create('produtos',{nome:'Peeling Enzimático',categoria:'Facial',marca:'Dermalogica',unidade:'un',estoqueAtual:2,estoqueMin:4,precoCusto:90,precoVenda:180,ativo:true});
    create('produtos',{nome:'Esmalte Base Fortalecedora',categoria:'Unhas',marca:'OPI',unidade:'un',estoqueAtual:10,estoqueMin:5,precoCusto:12,precoVenda:25,ativo:true});
    create('produtos',{nome:'Colágeno Hidrolisado 300g',categoria:'Suplemento',marca:'Vital Proteins',unidade:'pote',estoqueAtual:4,estoqueMin:3,precoCusto:65,precoVenda:120,ativo:true});
    create('produtos',{nome:'Protetor Solar FPS50',categoria:'Facial',marca:'Episol',unidade:'un',estoqueAtual:9,estoqueMin:6,precoCusto:32,precoVenda:62,ativo:true});

    /* Agendamentos */
    const mkAg = (cId,fId,sId,dt,hr,st,vl,fp,av) => create('agendamentos',{clienteId:cId,funcionarioId:fId,servicoId:sId,data:dt,hora:hr,status:st,valorCobrado:vl,valorPago:st==='Concluído'?vl:0,formaPagamento:fp,avaliacao:av,observacoes:''});
    mkAg(c1.id,f1.id,s1.id,d(-2),'09:00','Concluído',150,'Cartão Crédito',5);
    mkAg(c2.id,f2.id,s3.id,d(-1),'10:00','Concluído',130,'Pix',5);
    mkAg(c3.id,f3.id,s5.id,d(-1),'14:00','Concluído',55,'Dinheiro',4);
    mkAg(c4.id,f1.id,s2.id,d(0), '09:00','Agendado',200,'',null);
    mkAg(c5.id,f2.id,s4.id,d(0), '11:00','Agendado',150,'',null);
    mkAg(c6.id,f4.id,s7.id,d(0), '15:00','Agendado',90,'',null);
    mkAg(c1.id,f3.id,s6.id,d(2), '10:00','Agendado',65,'',null);

    /* Lançamentos financeiros */
    const mkL = (tipo,cat,desc,val,dt) => create('lancamentos',{tipo,categoria:cat,descricao:desc,valor:val,data:dt,formaPagamento:'Pix',observacoes:''});
    for(let i=0;i<5;i++){ mkL('receita','Serviços','Atendimentos',500+i*80,ym+'-'+(String(i*4+1).padStart(2,'0'))); }
    mkL('despesa','Aluguel','Aluguel do espaço',1800,ym+'-05');
    mkL('despesa','Produtos','Reposição de estoque',650,ym+'-08');
    mkL('despesa','Marketing','Instagram Ads',300,ym+'-10');
    mkL('receita','Produtos','Venda produtos',220,ym+'-12');
    mkL('despesa','Água/Luz','Conta de luz',180,ym+'-15');
    mkL('receita','Serviços','Pacotes',800,ym+'-18');
    for(let m=1;m<=5;m++){
      const dt2=new Date(); dt2.setMonth(dt2.getMonth()-m);
      const ym2=dt2.toISOString().substr(0,7);
      mkL('receita','Serviços','Atendimentos',3000+m*200,ym2+'-10');
      mkL('despesa','Aluguel','Aluguel',1800,ym2+'-05');
      mkL('despesa','Produtos','Estoque',500+m*30,ym2+'-08');
    }

    /* Contas a pagar */
    create('contaspagar',{descricao:'Aluguel',categoria:'Aluguel',valor:1800,vencimento:d(10),status:'Aberta',recorrente:true});
    create('contaspagar',{descricao:'Conta de Luz',categoria:'Água/Luz',valor:180,vencimento:d(5),status:'Aberta',recorrente:false});
    create('contaspagar',{descricao:'Fornecedor Dermalogica',categoria:'Produtos',valor:650,vencimento:d(-3),status:'Aberta',recorrente:false});
    create('contaspagar',{descricao:'Software de Gestão',categoria:'Tecnologia',valor:89,vencimento:d(15),status:'Paga',recorrente:true});

    /* Metas */
    create('metas',{titulo:'Faturamento Mensal',descricao:'Meta de receita bruta no mês',tipo:'Financeiro',meta:8000,atual:3470,unidade:'R$',periodo:ym,status:'Ativo'});
    create('metas',{titulo:'Novos Clientes',descricao:'Captação de novos clientes',tipo:'Clientes',meta:10,atual:3,unidade:'clientes',periodo:ym,status:'Ativo'});
    create('metas',{titulo:'Atendimentos',descricao:'Total de atendimentos no mês',tipo:'Operacional',meta:80,atual:53,unidade:'atend.',periodo:ym,status:'Ativo'});
    create('metas',{titulo:'Ticket Médio',descricao:'Valor médio por atendimento',tipo:'Financeiro',meta:150,atual:130,unidade:'R$',periodo:ym,status:'Ativo'});
    create('metas',{titulo:'Satisfação',descricao:'Avaliação média dos clientes',tipo:'Qualidade',meta:4.8,atual:4.7,unidade:'estrelas',periodo:ym,status:'Ativo'});

    /* Atividades */
    create('atividades',{titulo:'Ligar para Amanda — retorno pós-tratamento',tipo:'Ligação',prioridade:'Alta',data:d(1),status:'Pendente',clienteId:c1.id,funcionarioId:f1.id,observacoes:'Verificar resultado da limpeza de pele'});
    create('atividades',{titulo:'Reposição urgente Sérum Vitamina C',tipo:'Tarefa',prioridade:'Alta',data:hoje,status:'Pendente',clienteId:null,funcionarioId:null,observacoes:'Estoque abaixo do mínimo'});
    create('atividades',{titulo:'Publicar stories no Instagram',tipo:'Tarefa',prioridade:'Média',data:d(2),status:'Pendente',clienteId:null,funcionarioId:null,observacoes:''});
    create('atividades',{titulo:'Reunião de equipe mensal',tipo:'Reunião',prioridade:'Média',data:d(5),status:'Pendente',clienteId:null,funcionarioId:null,observacoes:''});

    await Promise.all(ENTITIES.map(e => _sync(e)));
    await _sync('config');
  }

  return {
    initClient, getClient, loadAll, initSampleData, hasLocalCache, clearLocalCache,
    getAll, get, create, update, remove,
    getConfig, saveConfig,
  };
})();
