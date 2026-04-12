import { supabase } from '@/integrations/supabase/untyped';

const DEMO_PREFIX = '[DEMO]';

function demoId() {
  return crypto.randomUUID();
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function checkedInsert(table: string, data: any[]) {
  const { error } = await (supabase.from as any)(table).insert(data);
  if (error) {
    console.error(`Demo seed: ${table} insert failed:`, error.message, error.details, error.hint);
    throw new Error(`${table}: ${error.message}`);
  }
}

export async function seedDemoData(userId: string, companyId: string) {
  // === 1. OBRAS (3 cenários distintos) ===
  const obra1Id = demoId();
  const obra2Id = demoId();
  const obra3Id = demoId();

  const obras = [
    {
      id: obra1Id, nome: `${DEMO_PREFIX} Residencial Vila Nova`, codigo: 'DEMO-2026-001',
      cliente: 'João Silva', endereco: 'Rua das Palmeiras, 120 - Centro, São Paulo/SP',
      status: 'em_andamento', data_inicio: daysAgo(90), data_previsao_termino: daysFromNow(120),
      responsavel: 'Carlos Engenheiro', percentual_andamento: 42,
      descricao: 'Construção residencial unifamiliar de 2 pavimentos, 280m², com piscina e área gourmet.',
      company_id: companyId,
      tipo_implantacao: 'nova' as const, origem_dados: 'real' as const,
    },
    {
      id: obra2Id, nome: `${DEMO_PREFIX} Reforma Comercial Centro`, codigo: 'DEMO-2026-002',
      cliente: 'Maria Souza', endereco: 'Av. Brasil, 500 - Centro Comercial, Campinas/SP',
      status: 'em_andamento', data_inicio: daysAgo(45), data_previsao_termino: daysFromNow(30),
      responsavel: 'Ana Arquiteta', percentual_andamento: 68,
      descricao: 'Reforma completa de loja comercial 200m² com novo layout, elétrica e hidráulica.',
      company_id: companyId,
      tipo_implantacao: 'em_andamento' as const, percentual_inicial: 20, valor_gasto_anterior: 45000,
      origem_dados: 'estimado' as const, observacao_interna: 'Cliente exigente com prazos',
    },
    {
      id: obra3Id, nome: `${DEMO_PREFIX} Galpão Industrial Fase 1`, codigo: 'DEMO-2026-003',
      cliente: 'Indústrias ABC Ltda', endereco: 'Rod. BR-101, Km 45 - Distrito Industrial, Jundiaí/SP',
      status: 'planejamento', data_inicio: daysFromNow(15), data_previsao_termino: daysFromNow(240),
      responsavel: 'Roberto Mestre', percentual_andamento: 0,
      descricao: 'Construção de galpão industrial pré-moldado 1500m² com área administrativa 200m².',
      company_id: companyId,
      tipo_implantacao: 'nova' as const, origem_dados: 'verbal' as const,
      observacoes_implantacao: 'Aguardando licenciamento ambiental e aprovação do projeto estrutural',
    },
  ];

  await checkedInsert('obras', obras);

  // === 2. OBRA MEMBERSHIPS (upsert to avoid conflict with trigger) ===
  for (const obraId of [obra1Id, obra2Id, obra3Id]) {
    await (supabase.from as any)('obra_memberships').upsert(
      { obra_id: obraId, user_id: userId, role: 'gestor' as const },
      { onConflict: 'obra_id,user_id' }
    );
  }

  // === 3. ORCAMENTO CATEGORIAS + COMPOSIÇÕES ===
  const c1_1 = demoId(), c1_2 = demoId(), c1_3 = demoId(), c1_4 = demoId(), c1_5 = demoId(), c1_6 = demoId();
  const c2_1 = demoId(), c2_2 = demoId(), c2_3 = demoId(), c2_4 = demoId();
  const c3_1 = demoId(), c3_2 = demoId(), c3_3 = demoId(), c3_4 = demoId(), c3_5 = demoId();

  const categorias = [
    { id: c1_1, obra_id: obra1Id, codigo: '01', nome: 'Serviços Preliminares', preco_total: 32000, usa_composicoes: true, data_inicio_prevista: daysAgo(88), data_fim_prevista: daysAgo(75), data_inicio_real: daysAgo(90), data_fim_real: daysAgo(73), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c1_2, obra_id: obra1Id, codigo: '02', nome: 'Fundação', preco_total: 95000, usa_composicoes: true, data_inicio_prevista: daysAgo(75), data_fim_prevista: daysAgo(40), data_inicio_real: daysAgo(73), data_fim_real: daysAgo(38), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c1_3, obra_id: obra1Id, codigo: '03', nome: 'Estrutura', preco_total: 145000, usa_composicoes: true, data_inicio_prevista: daysAgo(40), data_fim_prevista: daysFromNow(15), data_inicio_real: daysAgo(38), status_cronograma: 'em_andamento' as const, percentual_cronograma: 55 },
    { id: c1_4, obra_id: obra1Id, codigo: '04', nome: 'Alvenaria e Vedação', preco_total: 68000, usa_composicoes: false, data_inicio_prevista: daysFromNow(5), data_fim_prevista: daysFromNow(50), status_cronograma: 'nao_iniciada' as const },
    { id: c1_5, obra_id: obra1Id, codigo: '05', nome: 'Instalações Elétricas', preco_total: 52000, usa_composicoes: false, data_inicio_prevista: daysFromNow(30), data_fim_prevista: daysFromNow(80), status_cronograma: 'nao_iniciada' as const },
    { id: c1_6, obra_id: obra1Id, codigo: '06', nome: 'Instalações Hidráulicas', preco_total: 44000, usa_composicoes: false, data_inicio_prevista: daysFromNow(30), data_fim_prevista: daysFromNow(80), status_cronograma: 'nao_iniciada' as const },
    { id: c2_1, obra_id: obra2Id, codigo: '01', nome: 'Demolição e Remoção', preco_total: 22000, usa_composicoes: true, data_inicio_prevista: daysAgo(43), data_fim_prevista: daysAgo(28), data_inicio_real: daysAgo(43), data_fim_real: daysAgo(30), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c2_2, obra_id: obra2Id, codigo: '02', nome: 'Estrutura e Reforço', preco_total: 38000, usa_composicoes: true, data_inicio_prevista: daysAgo(28), data_fim_prevista: daysAgo(10), data_inicio_real: daysAgo(30), data_fim_real: daysAgo(12), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c2_3, obra_id: obra2Id, codigo: '03', nome: 'Acabamento e Pisos', preco_total: 55000, usa_composicoes: true, data_inicio_prevista: daysAgo(12), data_fim_prevista: daysFromNow(10), data_inicio_real: daysAgo(12), status_cronograma: 'em_andamento' as const, percentual_cronograma: 60, responsavel: 'Ana Arquiteta' },
    { id: c2_4, obra_id: obra2Id, codigo: '04', nome: 'Pintura e Limpeza', preco_total: 18000, usa_composicoes: false, data_inicio_prevista: daysFromNow(8), data_fim_prevista: daysFromNow(25), status_cronograma: 'nao_iniciada' as const },
    { id: c3_1, obra_id: obra3Id, codigo: '01', nome: 'Terraplenagem', preco_total: 120000, usa_composicoes: true, data_inicio_prevista: daysFromNow(15), data_fim_prevista: daysFromNow(45), status_cronograma: 'nao_iniciada' as const },
    { id: c3_2, obra_id: obra3Id, codigo: '02', nome: 'Fundação Profunda', preco_total: 280000, usa_composicoes: true, data_inicio_prevista: daysFromNow(40), data_fim_prevista: daysFromNow(90), status_cronograma: 'nao_iniciada' as const },
    { id: c3_3, obra_id: obra3Id, codigo: '03', nome: 'Estrutura Pré-Moldada', preco_total: 450000, usa_composicoes: false, data_inicio_prevista: daysFromNow(80), data_fim_prevista: daysFromNow(150), status_cronograma: 'nao_iniciada' as const },
    { id: c3_4, obra_id: obra3Id, codigo: '04', nome: 'Cobertura Metálica', preco_total: 180000, usa_composicoes: false, data_inicio_prevista: daysFromNow(130), data_fim_prevista: daysFromNow(180), status_cronograma: 'nao_iniciada' as const },
    { id: c3_5, obra_id: obra3Id, codigo: '05', nome: 'Instalações Industriais', preco_total: 220000, usa_composicoes: false, data_inicio_prevista: daysFromNow(150), data_fim_prevista: daysFromNow(220), status_cronograma: 'nao_iniciada' as const },
  ];
  await checkedInsert('orcamento_categorias', categorias);

  const composicoes = [
    { categoria_id: c1_1, codigo: '01.01', descricao: 'Limpeza e preparo do terreno', preco_total: 8000, preco_unitario: 16, quantidade: 500, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c1_1, codigo: '01.02', descricao: 'Tapume e barracão de obra', preco_total: 12000, preco_unitario: 120, quantidade: 100, unidade: 'm', usa_subitens: false, concluida: true },
    { categoria_id: c1_1, codigo: '01.03', descricao: 'Instalações provisórias (água/luz)', preco_total: 12000, preco_unitario: 12000, quantidade: 1, unidade: 'vb', usa_subitens: false, concluida: true },
    { categoria_id: c1_2, codigo: '02.01', descricao: 'Escavação mecânica', preco_total: 25000, preco_unitario: 50, quantidade: 500, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: c1_2, codigo: '02.02', descricao: 'Concreto armado sapatas', preco_total: 45000, preco_unitario: 450, quantidade: 100, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: c1_2, codigo: '02.03', descricao: 'Impermeabilização fundação', preco_total: 15000, preco_unitario: 75, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c1_2, codigo: '02.04', descricao: 'Aterro compactado', preco_total: 10000, preco_unitario: 40, quantidade: 250, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: c1_3, codigo: '03.01', descricao: 'Pilares de concreto armado', preco_total: 55000, preco_unitario: 500, quantidade: 110, unidade: 'un', usa_subitens: false, concluida: true, peso_cronograma: 35 },
    { categoria_id: c1_3, codigo: '03.02', descricao: 'Vigas e lajes 1º pavimento', preco_total: 50000, preco_unitario: 250, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true, peso_cronograma: 30 },
    { categoria_id: c1_3, codigo: '03.03', descricao: 'Vigas e lajes 2º pavimento', preco_total: 40000, preco_unitario: 250, quantidade: 160, unidade: 'm²', usa_subitens: false, concluida: false, peso_cronograma: 35 },
    { categoria_id: c2_1, codigo: '01.01', descricao: 'Demolição paredes internas', preco_total: 8000, preco_unitario: 40, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c2_1, codigo: '01.02', descricao: 'Remoção piso antigo', preco_total: 6000, preco_unitario: 30, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c2_1, codigo: '01.03', descricao: 'Remoção de entulho', preco_total: 8000, preco_unitario: 80, quantidade: 100, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: c2_2, codigo: '02.01', descricao: 'Reforço estrutural pilares', preco_total: 22000, preco_unitario: 1100, quantidade: 20, unidade: 'un', usa_subitens: false, concluida: true },
    { categoria_id: c2_2, codigo: '02.02', descricao: 'Nova laje mezzanino', preco_total: 16000, preco_unitario: 320, quantidade: 50, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c2_3, codigo: '03.01', descricao: 'Piso porcelanato 60x60', preco_total: 30000, preco_unitario: 150, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true, peso_cronograma: 45 },
    { categoria_id: c2_3, codigo: '03.02', descricao: 'Forro de gesso', preco_total: 12000, preco_unitario: 80, quantidade: 150, unidade: 'm²', usa_subitens: false, concluida: false, peso_cronograma: 25 },
    { categoria_id: c2_3, codigo: '03.03', descricao: 'Revestimento cerâmico banheiros', preco_total: 13000, preco_unitario: 130, quantidade: 100, unidade: 'm²', usa_subitens: false, concluida: false, peso_cronograma: 30 },
    { categoria_id: c3_1, codigo: '01.01', descricao: 'Corte e aterro terreno', preco_total: 80000, preco_unitario: 32, quantidade: 2500, unidade: 'm³', usa_subitens: false, concluida: false },
    { categoria_id: c3_1, codigo: '01.02', descricao: 'Compactação e nivelamento', preco_total: 40000, preco_unitario: 16, quantidade: 2500, unidade: 'm²', usa_subitens: false, concluida: false },
    { categoria_id: c3_2, codigo: '02.01', descricao: 'Estacas hélice contínua', preco_total: 200000, preco_unitario: 250, quantidade: 800, unidade: 'm', usa_subitens: false, concluida: false },
    { categoria_id: c3_2, codigo: '02.02', descricao: 'Blocos de coroamento', preco_total: 80000, preco_unitario: 2000, quantidade: 40, unidade: 'un', usa_subitens: false, concluida: false },
  ];
  await checkedInsert('orcamento_composicoes', composicoes);

  // === 4. CUSTO REAL ===
  const custoItens = [
    { obra_id: obra1Id, company_id: companyId, categoria: 'Serviços Preliminares', descricao: `${DEMO_PREFIX} Limpeza terreno + tapume`, fornecedor: 'Construtora Início', valor: 21000, data: daysAgo(85) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Serviços Preliminares', descricao: `${DEMO_PREFIX} Instalações provisórias`, fornecedor: 'Eletricista MEI', valor: 13500, data: daysAgo(82) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Escavação mecânica`, fornecedor: 'Terraplanagem Silva', valor: 27500, data: daysAgo(70) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Concreto usinado fundação`, fornecedor: 'Concreteira ABC', valor: 48000, data: daysAgo(60) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Impermeabilização`, fornecedor: 'Impermeabiliza SP', valor: 16200, data: daysAgo(50) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Aterro compactado`, fornecedor: 'Terraplanagem Silva', valor: 9800, data: daysAgo(48) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Aço CA-50 pilares`, fornecedor: 'Siderúrgica Nacional', valor: 38000, data: daysAgo(35) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Fôrmas madeira pilares`, fornecedor: 'Madeireira Pinheiro', valor: 12000, data: daysAgo(33) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Concreto pilares`, fornecedor: 'Concreteira ABC', valor: 22000, data: daysAgo(25) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Concreto lajes 1º pav`, fornecedor: 'Concreteira ABC', valor: 35000, data: daysAgo(10) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Demolição e Remoção', descricao: `${DEMO_PREFIX} Demolição geral`, fornecedor: 'Demolidora Express', valor: 9500, data: daysAgo(40) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Demolição e Remoção', descricao: `${DEMO_PREFIX} Remoção entulho (3 caçambas)`, fornecedor: 'Caçambas Rápidas', valor: 4200, data: daysAgo(38) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Estrutura e Reforço', descricao: `${DEMO_PREFIX} Reforço estrutural`, fornecedor: 'Eng. Estrutural Ltda', valor: 24000, data: daysAgo(25) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Estrutura e Reforço', descricao: `${DEMO_PREFIX} Laje mezzanino`, fornecedor: 'Concreteira ABC', valor: 17500, data: daysAgo(20) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Acabamento e Pisos', descricao: `${DEMO_PREFIX} Porcelanato 60x60`, fornecedor: 'Cerâmica Luxo', valor: 28000, data: daysAgo(10) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Acabamento e Pisos', descricao: `${DEMO_PREFIX} Mão de obra piso`, fornecedor: 'Azulejista Marcos', valor: 8000, data: daysAgo(8) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Projetos', descricao: `${DEMO_PREFIX} Projeto arquitetônico`, fornecedor: 'Arq. & Design', valor: 35000, data: daysAgo(15) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Projetos', descricao: `${DEMO_PREFIX} Sondagem SPT`, fornecedor: 'GeoSondagens', valor: 12000, data: daysAgo(12) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Projetos', descricao: `${DEMO_PREFIX} Projeto estrutural`, fornecedor: 'Calc Estruturas', valor: 28000, data: daysAgo(8) },
  ];
  await checkedInsert('custo_real_itens', custoItens);

  // === 5. MATERIAIS (ESTOQUE) ===
  const mat = Array.from({ length: 14 }, () => demoId());
  const materiais = [
    { id: mat[0], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, unidade: 'saco', categoria: 'Cimento', estoque_atual: 35, estoque_minimo: 50, localizacao: 'Almoxarifado A' },
    { id: mat[1], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, unidade: 'barra', categoria: 'Aço', estoque_atual: 180, estoque_minimo: 100, localizacao: 'Pátio coberto' },
    { id: mat[2], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Areia média`, unidade: 'm³', categoria: 'Agregados', estoque_atual: 4, estoque_minimo: 10, localizacao: 'Pátio' },
    { id: mat[3], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Brita 1`, unidade: 'm³', categoria: 'Agregados', estoque_atual: 3, estoque_minimo: 8, localizacao: 'Pátio' },
    { id: mat[4], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Tijolo cerâmico 9x19x19`, unidade: 'un', categoria: 'Alvenaria', estoque_atual: 2000, estoque_minimo: 500, localizacao: 'Pátio' },
    { id: mat[5], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Madeira para fôrma`, unidade: 'm²', categoria: 'Madeira', estoque_atual: 45, estoque_minimo: 30, localizacao: 'Galpão' },
    { id: mat[6], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Arame recozido`, unidade: 'kg', categoria: 'Aço', estoque_atual: 8, estoque_minimo: 15, localizacao: 'Almoxarifado A' },
    { id: mat[7], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Prego 18x27`, unidade: 'kg', categoria: 'Ferragens', estoque_atual: 12, estoque_minimo: 5, localizacao: 'Almoxarifado A' },
    { id: mat[8], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Porcelanato 60x60 cinza`, unidade: 'm²', categoria: 'Acabamento', estoque_atual: 25, estoque_minimo: 10, localizacao: 'Depósito' },
    { id: mat[9], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Tinta Acrílica branca 18L`, unidade: 'lata', categoria: 'Pintura', estoque_atual: 3, estoque_minimo: 8, localizacao: 'Depósito' },
    { id: mat[10], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Massa corrida PVA`, unidade: 'lata', categoria: 'Pintura', estoque_atual: 2, estoque_minimo: 6, localizacao: 'Depósito' },
    { id: mat[11], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Argamassa colante ACIII`, unidade: 'saco', categoria: 'Cimento', estoque_atual: 15, estoque_minimo: 10, localizacao: 'Depósito' },
    { id: mat[12], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Rejunte cinza 5kg`, unidade: 'saco', categoria: 'Acabamento', estoque_atual: 8, estoque_minimo: 5, localizacao: 'Depósito' },
    { id: mat[13], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Estacas pré-moldadas`, unidade: 'un', categoria: 'Estrutura', estoque_atual: 0, estoque_minimo: 0, localizacao: 'Não entregue' },
  ];
  await checkedInsert('materiais', materiais);

  // Movimentações variadas
  const movimentacoes = [
    { obra_id: obra1Id, company_id: companyId, material_id: mat[0], material_nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, quantidade: 100, tipo: 'entrada' as const, data: daysAgo(30), responsavel: 'Carlos', origem_destino: 'Fornecedor DepMat' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[0], material_nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, quantidade: 40, tipo: 'saida' as const, data: daysAgo(25), responsavel: 'Pedro', origem_destino: 'Fundação - sapatas' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[0], material_nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, quantidade: 25, tipo: 'saida' as const, data: daysAgo(15), responsavel: 'Pedro', origem_destino: 'Estrutura - pilares' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[1], material_nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, quantidade: 300, tipo: 'entrada' as const, data: daysAgo(40), responsavel: 'Carlos', origem_destino: 'Siderúrgica Nacional' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[1], material_nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, quantidade: 120, tipo: 'saida' as const, data: daysAgo(30), responsavel: 'José', origem_destino: 'Armação pilares' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[2], material_nome: `${DEMO_PREFIX} Areia média`, quantidade: 20, tipo: 'entrada' as const, data: daysAgo(25), responsavel: 'Carlos', origem_destino: 'Mineradora XYZ' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[2], material_nome: `${DEMO_PREFIX} Areia média`, quantidade: 16, tipo: 'saida' as const, data: daysAgo(10), responsavel: 'Pedro', origem_destino: 'Concreto virado' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[3], material_nome: `${DEMO_PREFIX} Brita 1`, quantidade: 15, tipo: 'entrada' as const, data: daysAgo(25), responsavel: 'Carlos', origem_destino: 'Mineradora XYZ' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[3], material_nome: `${DEMO_PREFIX} Brita 1`, quantidade: 12, tipo: 'saida' as const, data: daysAgo(10), responsavel: 'Pedro', origem_destino: 'Concreto virado' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[5], material_nome: `${DEMO_PREFIX} Madeira para fôrma`, quantidade: 60, tipo: 'entrada' as const, data: daysAgo(35), responsavel: 'Carlos', origem_destino: 'Madeireira Pinheiro' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[5], material_nome: `${DEMO_PREFIX} Madeira para fôrma`, quantidade: 15, tipo: 'saida' as const, data: daysAgo(20), responsavel: 'José', origem_destino: 'Fôrma pilares' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[6], material_nome: `${DEMO_PREFIX} Arame recozido`, quantidade: 20, tipo: 'entrada' as const, data: daysAgo(40), responsavel: 'Carlos', origem_destino: 'Siderúrgica Nacional' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[6], material_nome: `${DEMO_PREFIX} Arame recozido`, quantidade: 12, tipo: 'saida' as const, data: daysAgo(20), responsavel: 'José', origem_destino: 'Amarração armadura' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[8], material_nome: `${DEMO_PREFIX} Porcelanato 60x60 cinza`, quantidade: 220, tipo: 'entrada' as const, data: daysAgo(12), responsavel: 'Ana', origem_destino: 'Cerâmica Luxo' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[8], material_nome: `${DEMO_PREFIX} Porcelanato 60x60 cinza`, quantidade: 195, tipo: 'saida' as const, data: daysAgo(5), responsavel: 'Marcos', origem_destino: 'Assentamento área principal' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[11], material_nome: `${DEMO_PREFIX} Argamassa colante ACIII`, quantidade: 30, tipo: 'entrada' as const, data: daysAgo(12), responsavel: 'Ana', origem_destino: 'DepMat Centro' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[11], material_nome: `${DEMO_PREFIX} Argamassa colante ACIII`, quantidade: 15, tipo: 'saida' as const, data: daysAgo(5), responsavel: 'Marcos', origem_destino: 'Assentamento piso' },
  ];
  await checkedInsert('movimentacoes', movimentacoes);

  // === 6. DIARIO REGISTROS ===
  const diarios = [
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(7), clima: 'sol' as const, trabalhadores: 14, servicos_executados: `${DEMO_PREFIX} Concretagem de pilares P9 a P16. Montagem de escoramentos para laje.`, problemas: null, observacoes: 'Excelente produtividade. Concreto entregue no horário.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(6), clima: 'sol' as const, trabalhadores: 12, servicos_executados: `${DEMO_PREFIX} Desforma pilares P1-P8. Armação de vigas V5 a V12.`, problemas: null, observacoes: 'Vigas com ferragem conforme projeto.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(5), clima: 'nublado' as const, trabalhadores: 11, servicos_executados: `${DEMO_PREFIX} Montagem de fôrmas para laje do 1º pav. Passagem de eletrodutos.`, problemas: 'Falta de espaçadores - improvisado com pedaços de aço', observacoes: null, status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(4), clima: 'chuva' as const, trabalhadores: 6, servicos_executados: `${DEMO_PREFIX} Serviços internos no barracão. Organização de materiais no almoxarifado.`, problemas: 'Chuva forte impediu concretagem prevista para hoje', observacoes: 'Concretagem reagendada para amanhã', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(3), clima: 'sol' as const, trabalhadores: 15, servicos_executados: `${DEMO_PREFIX} Concretagem laje 1º pavimento - 120m². Vibração e acabamento.`, problemas: null, observacoes: 'Concretagem realizada com sucesso. Bomba chegou 7h.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(2), clima: 'sol' as const, trabalhadores: 10, servicos_executados: `${DEMO_PREFIX} Cura da laje com água. Início da armação de pilares do 2º pav.`, problemas: null, observacoes: null, status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(1), clima: 'nublado' as const, trabalhadores: 10, servicos_executados: `${DEMO_PREFIX} Continuação armação pilares 2º pav. Recebimento de madeira para fôrmas.`, problemas: 'Arame recozido no limite - solicitar compra urgente', observacoes: 'Previsão de chuva para amanhã', status: 'pendente' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(0), clima: 'chuvoso_forte' as const, trabalhadores: 4, servicos_executados: `${DEMO_PREFIX} Apenas serviços cobertos. Corte e dobra de aço no galpão.`, problemas: 'Chuva forte o dia todo - sem condições de trabalho externo', observacoes: 'Equipe dispensada às 14h', status: 'pendente' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(5), clima: 'sol' as const, trabalhadores: 8, servicos_executados: `${DEMO_PREFIX} Assentamento de porcelanato área principal - 60m² executados.`, problemas: null, observacoes: 'Piso ficando excelente, cliente aprovou padrão.', status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(4), clima: 'sol' as const, trabalhadores: 8, servicos_executados: `${DEMO_PREFIX} Continuação piso porcelanato - mais 55m². Início instalação elétrica.`, problemas: null, observacoes: null, status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(3), clima: 'nublado' as const, trabalhadores: 9, servicos_executados: `${DEMO_PREFIX} Finalização piso área principal. Início assentamento banheiros.`, problemas: 'Porcelanato banheiro com tonalidade diferente do piso - cliente notificado', observacoes: 'Solicitar troca do lote de cerâmica banheiro', status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(2), clima: 'sol' as const, trabalhadores: 7, servicos_executados: `${DEMO_PREFIX} Rejuntamento área 1. Preparação paredes para gesso.`, problemas: 'Falta massa corrida no estoque', observacoes: 'Compra urgente solicitada', status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(1), clima: 'sol' as const, trabalhadores: 6, servicos_executados: `${DEMO_PREFIX} Instalação forro de gesso - 40m². Passagem de eletrodutos no forro.`, problemas: null, observacoes: 'Gesseiro trabalhando rápido, previsão de concluir em 3 dias', status: 'pendente' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(0), clima: 'sol' as const, trabalhadores: 7, servicos_executados: `${DEMO_PREFIX} Continuação forro de gesso. Início acabamento elétrico (tomadas/interruptores).`, problemas: null, observacoes: null, status: 'pendente' as const },
    { obra_id: obra3Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(10), clima: 'sol' as const, trabalhadores: 3, servicos_executados: `${DEMO_PREFIX} Visita técnica ao terreno. Marcação de pontos de sondagem.`, problemas: null, observacoes: 'Terreno com boa condição de acesso. Solo aparentemente argiloso.', status: 'aprovado' as const },
    { obra_id: obra3Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(8), clima: 'nublado' as const, trabalhadores: 4, servicos_executados: `${DEMO_PREFIX} Sondagem SPT - 6 furos executados. Coleta de amostras.`, problemas: 'Nível d\'água encontrado a 3m - necessário rebaixamento', observacoes: 'Resultado de sondagem previsto para 5 dias úteis', status: 'aprovado' as const },
  ];
  await checkedInsert('diario_registros', diarios);

  // === 7. PAGAMENTOS ===
  const pagamentos = [
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Terraplanagem fase 1`, tipo_pagamento: 'servico' as const, valor_previsto: 27500, data_vencimento: daysAgo(60), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Terraplanagem Silva' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Concreto usinado - NF 4521`, tipo_pagamento: 'material' as const, valor_previsto: 48000, data_vencimento: daysAgo(45), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Concreteira ABC' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Aço CA-50 - Lote 1`, tipo_pagamento: 'material' as const, valor_previsto: 38000, data_vencimento: daysAgo(20), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Siderúrgica Nacional' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Mão de obra - Quinzena 1/Abr`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 22000, data_vencimento: daysAgo(5), status: 'atrasado' as const, forma_pagamento: 'transferencia' as const, fornecedor: null, observacoes: 'Aguardando medição aprovada' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Impermeabilização - NF 892`, tipo_pagamento: 'material' as const, valor_previsto: 16200, data_vencimento: daysAgo(3), status: 'atrasado' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Impermeabiliza SP' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Mão de obra - Quinzena 2/Abr`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 22000, data_vencimento: daysFromNow(5), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: null },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Madeira para fôrmas 2º pav`, tipo_pagamento: 'material' as const, valor_previsto: 15000, data_vencimento: daysFromNow(10), status: 'previsto' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Madeireira Pinheiro' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Concreto lajes 2º pav`, tipo_pagamento: 'material' as const, valor_previsto: 42000, data_vencimento: daysFromNow(25), status: 'previsto' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Concreteira ABC' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Aluguel betoneira`, tipo_pagamento: 'aluguel' as const, valor_previsto: 2500, data_vencimento: daysFromNow(2), status: 'previsto' as const, forma_pagamento: 'pix' as const, fornecedor: 'LocaMaq' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Engenheiro residente - Abril`, tipo_pagamento: 'servico' as const, valor_previsto: 8500, data_vencimento: daysFromNow(15), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: null },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Demolição completa`, tipo_pagamento: 'servico' as const, valor_previsto: 9500, data_vencimento: daysAgo(30), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Demolidora Express' },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Reforço estrutural`, tipo_pagamento: 'servico' as const, valor_previsto: 24000, data_vencimento: daysAgo(15), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Eng. Estrutural Ltda' },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Porcelanato - Parcela 1/3`, tipo_pagamento: 'material' as const, valor_previsto: 9500, data_vencimento: daysAgo(8), status: 'pago' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Cerâmica Luxo', numero_parcela: 1, total_parcelas: 3 },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Porcelanato - Parcela 2/3`, tipo_pagamento: 'material' as const, valor_previsto: 9500, data_vencimento: daysFromNow(22), status: 'previsto' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Cerâmica Luxo', numero_parcela: 2, total_parcelas: 3 },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Porcelanato - Parcela 3/3`, tipo_pagamento: 'material' as const, valor_previsto: 9000, data_vencimento: daysFromNow(52), status: 'previsto' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Cerâmica Luxo', numero_parcela: 3, total_parcelas: 3 },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Mão de obra assentamento`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 8000, data_vencimento: daysAgo(2), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Azulejista Marcos' },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Gesseiro - Forro completo`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 12000, data_vencimento: daysFromNow(12), status: 'previsto' as const, forma_pagamento: 'pix' as const, fornecedor: 'Gesso & Cia' },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Tinta e massa corrida`, tipo_pagamento: 'material' as const, valor_previsto: 6500, data_vencimento: daysFromNow(8), status: 'previsto' as const, forma_pagamento: 'dinheiro' as const, fornecedor: 'Tintas Premium' },
    { obra_id: obra3Id, descricao: `${DEMO_PREFIX} Projeto arquitetônico`, tipo_pagamento: 'servico' as const, valor_previsto: 35000, data_vencimento: daysAgo(10), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Arq. & Design' },
    { obra_id: obra3Id, descricao: `${DEMO_PREFIX} Sondagem SPT`, tipo_pagamento: 'servico' as const, valor_previsto: 12000, data_vencimento: daysAgo(5), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'GeoSondagens' },
    { obra_id: obra3Id, descricao: `${DEMO_PREFIX} Projeto estrutural`, tipo_pagamento: 'servico' as const, valor_previsto: 28000, data_vencimento: daysFromNow(5), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Calc Estruturas' },
    { obra_id: obra3Id, descricao: `${DEMO_PREFIX} Licenciamento ambiental`, tipo_pagamento: 'servico' as const, valor_previsto: 15000, data_vencimento: daysFromNow(20), status: 'previsto' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Ambiental Consultoria' },
    { obra_id: obra3Id, descricao: `${DEMO_PREFIX} Projeto instalações elétricas`, tipo_pagamento: 'servico' as const, valor_previsto: 18000, data_vencimento: daysFromNow(30), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Elétrica Projetos' },
  ];
  await checkedInsert('pagamentos', pagamentos);

  // === 8. PENDÊNCIAS ===
  const pendencias = [
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Alvará de construção pendente`, descricao: 'Documentação enviada à prefeitura há 20 dias, sem retorno. Protocolo #45678.', tipo: 'documento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(5), observacao_interna: 'Ligar na prefeitura toda segunda-feira' },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Cotação instalações hidráulicas`, descricao: 'Solicitar 3 cotações para instalações hidráulicas completas (água fria, quente e esgoto)', tipo: 'orcamento' as const, prioridade: 'media' as const, status: 'em_andamento' as const, data_limite: daysFromNow(15), observacao_interna: '2 cotações recebidas, falta 1' },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Conferir NF Concreteira ABC`, descricao: 'Valor da NF 4521 diverge do pedido em R$ 2.300', tipo: 'pagamento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysAgo(2), observacao_interna: 'Valor divergente - confirmar com financeiro' },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Aprovar diários pendentes`, tipo: 'diario' as const, prioridade: 'baixa' as const, status: 'aberta' as const, data_limite: daysFromNow(1) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Comprar arame recozido urgente`, descricao: 'Estoque abaixo do mínimo, armação de pilares parada', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(0) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} ART de execução estrutural`, descricao: 'Registrar ART no CREA para execução de estrutura', tipo: 'documento' as const, prioridade: 'media' as const, status: 'resolvida' as const, data_limite: daysAgo(10) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Contratar guincho para laje`, tipo: 'custo' as const, prioridade: 'media' as const, status: 'em_andamento' as const, data_limite: daysFromNow(20), observacao_interna: 'Orçamento com LocaMaq: R$ 3.500/dia' },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Solicitar areia e brita`, descricao: 'Estoque abaixo do mínimo para ambos', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(2) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Comprar massa corrida urgente`, descricao: 'Falta de estoque identificada no diário. Pintura começa em breve.', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(1) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Trocar lote porcelanato banheiro`, descricao: 'Tonalidade diferente da área principal. Cliente insatisfeito.', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'em_andamento' as const, data_limite: daysFromNow(5), observacao_interna: 'Cerâmica Luxo confirmou troca para quarta' },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Vistoria elétrica concessionária`, descricao: 'Agendar vistoria para aprovação da nova instalação elétrica', tipo: 'documento' as const, prioridade: 'media' as const, status: 'resolvida' as const, data_limite: daysAgo(5) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Habite-se reforma`, descricao: 'Solicitar habite-se após conclusão', tipo: 'documento' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(30) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Escolha de cores com cliente`, descricao: 'Agendar reunião para definir cores de pintura', tipo: 'orcamento' as const, prioridade: 'baixa' as const, status: 'aberta' as const, data_limite: daysFromNow(7) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Pagar gesseiro adiantamento`, tipo: 'pagamento' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(3), observacao_interna: '50% do valor: R$ 6.000' },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Licenciamento ambiental`, descricao: 'Estudo de impacto ambiental em andamento com consultoria', tipo: 'documento' as const, prioridade: 'alta' as const, status: 'em_andamento' as const, data_limite: daysFromNow(30), observacao_interna: 'Prazo estimado: 25 dias úteis' },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Contratação de topógrafo`, descricao: 'Levantamento planialtimétrico necessário antes da terraplenagem', tipo: 'custo' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(10) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Aprovar projeto estrutural`, descricao: 'Projeto em fase de revisão final com calculista', tipo: 'documento' as const, prioridade: 'alta' as const, status: 'em_andamento' as const, data_limite: daysFromNow(12) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Cotação estacas pré-moldadas`, descricao: 'Solicitar cotação para 800m de estacas hélice contínua', tipo: 'orcamento' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(15) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Seguro da obra`, descricao: 'Contratar seguro de responsabilidade civil e all risks', tipo: 'documento' as const, prioridade: 'baixa' as const, status: 'aberta' as const, data_limite: daysFromNow(20) },
  ];
  await checkedInsert('pendencias', pendencias);

  // === 9. FORNECEDORES ===
  const forn = Array.from({ length: 10 }, () => demoId());
  const fornecedores = [
    { id: forn[0], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Concreteira ABC`, cnpj: '12.345.678/0001-90', email: 'vendas@concreteira.com', telefone: '(11) 3456-7890', cidade: 'São Paulo', observacoes: 'Entrega em 24h. Melhor preço para fck 25.' },
    { id: forn[1], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Siderúrgica Nacional`, cnpj: '98.765.432/0001-10', email: 'comercial@siderurgica.com', telefone: '(11) 2345-6789', cidade: 'Guarulhos', observacoes: 'Entrega semanal. Pagamento 30/60 dias.' },
    { id: forn[2], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Terraplanagem Silva`, telefone: '(11) 99888-7766', cidade: 'Cotia', observacoes: 'Parceiro antigo. Equipamento próprio.' },
    { id: forn[3], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Madeireira Pinheiro`, cnpj: '33.444.555/0001-66', email: 'vendas@pinheiro.com', telefone: '(11) 4567-8901', cidade: 'Mogi das Cruzes' },
    { id: forn[4], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Impermeabiliza SP`, cnpj: '55.666.777/0001-88', email: 'orcamento@impermeabiliza.com', telefone: '(11) 3322-1100', cidade: 'São Paulo', observacoes: 'Garantia de 5 anos. Trabalha com Vedacit e Denver.' },
    { id: forn[5], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Cerâmica Luxo`, cnpj: '11.222.333/0001-44', email: 'contato@ceramicaluxo.com', telefone: '(19) 9876-5432', cidade: 'Campinas', observacoes: 'Parcela em até 3x no cartão. Troca garantida.' },
    { id: forn[6], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Gesso & Cia`, telefone: '(19) 98765-1234', cidade: 'Campinas', observacoes: 'Trabalha com forro e drywall. R$ 80/m².' },
    { id: forn[7], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Tintas Premium`, cnpj: '44.555.666/0001-22', email: 'loja@tintaspremium.com', telefone: '(19) 3344-5566', cidade: 'Campinas' },
    { id: forn[8], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} GeoSondagens`, cnpj: '77.888.999/0001-11', email: 'contato@geosondagens.com', telefone: '(11) 5566-7788', cidade: 'Jundiaí', observacoes: 'Especializada em SPT e ensaios de campo.' },
    { id: forn[9], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Calc Estruturas`, cnpj: '88.999.000/0001-33', email: 'projetos@calcestruturas.com', telefone: '(11) 6677-8899', cidade: 'São Paulo', observacoes: 'Referência em pré-moldados industriais.' },
  ];
  await checkedInsert('fornecedores', fornecedores);

  // === 10. PREÇOS FORNECEDORES ===
  const precos = [
    { fornecedor_id: forn[0], obra_id: obra1Id, descricao_item_snapshot: 'Concreto fck 25 MPa', preco_unitario: 380, unidade: 'm³', data_referencia: daysAgo(90), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn[0], obra_id: obra1Id, descricao_item_snapshot: 'Concreto fck 25 MPa', preco_unitario: 395, unidade: 'm³', data_referencia: daysAgo(60), origem_preco: 'compra_real' as const, observacoes: 'Reajuste de 4% - inflação de cimento' },
    { fornecedor_id: forn[0], obra_id: obra1Id, descricao_item_snapshot: 'Concreto fck 25 MPa', preco_unitario: 410, unidade: 'm³', data_referencia: daysAgo(15), origem_preco: 'compra_real' as const, observacoes: 'Novo reajuste' },
    { fornecedor_id: forn[0], obra_id: obra1Id, descricao_item_snapshot: 'Concreto fck 30 MPa', preco_unitario: 440, unidade: 'm³', data_referencia: daysAgo(60), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn[0], obra_id: obra1Id, descricao_item_snapshot: 'Bomba lança 32m', preco_unitario: 1800, unidade: 'diária', data_referencia: daysAgo(15), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn[1], obra_id: obra1Id, descricao_item_snapshot: 'Vergalhão CA-50 10mm', preco_unitario: 39.90, unidade: 'barra 12m', data_referencia: daysAgo(90), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn[1], obra_id: obra1Id, descricao_item_snapshot: 'Vergalhão CA-50 10mm', preco_unitario: 42.50, unidade: 'barra 12m', data_referencia: daysAgo(35), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn[1], obra_id: obra1Id, descricao_item_snapshot: 'Vergalhão CA-50 8mm', preco_unitario: 28.00, unidade: 'barra 12m', data_referencia: daysAgo(35), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn[1], obra_id: obra1Id, descricao_item_snapshot: 'Arame recozido', preco_unitario: 12.50, unidade: 'kg', data_referencia: daysAgo(35), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn[3], obra_id: obra1Id, descricao_item_snapshot: 'Tábua pinus 30cm', preco_unitario: 35, unidade: 'm', data_referencia: daysAgo(40), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn[3], obra_id: obra1Id, descricao_item_snapshot: 'Compensado plastificado 18mm', preco_unitario: 180, unidade: 'chapa', data_referencia: daysAgo(40), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn[5], obra_id: obra2Id, descricao_item_snapshot: 'Porcelanato 60x60 cinza', preco_unitario: 89.90, unidade: 'm²', data_referencia: daysAgo(20), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn[5], obra_id: obra2Id, descricao_item_snapshot: 'Porcelanato 60x60 branco', preco_unitario: 95.00, unidade: 'm²', data_referencia: daysAgo(20), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn[5], obra_id: obra2Id, descricao_item_snapshot: 'Cerâmica parede banheiro', preco_unitario: 65.00, unidade: 'm²', data_referencia: daysAgo(20), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn[7], obra_id: obra2Id, descricao_item_snapshot: 'Tinta acrílica premium 18L', preco_unitario: 320, unidade: 'lata', data_referencia: daysAgo(5), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn[7], obra_id: obra2Id, descricao_item_snapshot: 'Massa corrida PVA 25kg', preco_unitario: 45, unidade: 'lata', data_referencia: daysAgo(5), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn[8], obra_id: obra3Id, descricao_item_snapshot: 'Sondagem SPT por furo', preco_unitario: 2000, unidade: 'furo', data_referencia: daysAgo(15), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn[9], obra_id: obra3Id, descricao_item_snapshot: 'Projeto estrutural galpão', preco_unitario: 28000, unidade: 'vb', data_referencia: daysAgo(10), origem_preco: 'cotacao' as const },
  ];
  await checkedInsert('precos_fornecedores', precos);

  return { obra1Id, obra2Id, obra3Id };
}

export async function clearDemoData(companyId: string) {
  const { data: demoObras } = await supabase
    .from('obras')
    .select('id')
    .eq('company_id', companyId)
    .like('nome', `${DEMO_PREFIX}%`);

  const obraIds = (demoObras || []).map(o => o.id);
  if (obraIds.length === 0) return;

  for (const obraId of obraIds) {
    await supabase.from('precos_fornecedores').delete().eq('obra_id', obraId);
    await supabase.from('fornecedores').delete().eq('obra_id', obraId);
    await supabase.from('pendencias').delete().eq('obra_id', obraId);
    await supabase.from('pagamentos').delete().eq('obra_id', obraId);
    await supabase.from('diario_registros').delete().eq('obra_id', obraId);
    await supabase.from('movimentacoes').delete().eq('obra_id', obraId);
    await supabase.from('materiais').delete().eq('obra_id', obraId);

    const { data: cats } = await supabase.from('orcamento_categorias').select('id').eq('obra_id', obraId);
    if (cats) {
      for (const cat of cats) {
        await supabase.from('orcamento_composicoes').delete().eq('categoria_id', cat.id);
      }
    }
    await supabase.from('orcamento_categorias').delete().eq('obra_id', obraId);
    await supabase.from('custo_real_itens').delete().eq('obra_id', obraId);
    await supabase.from('obra_memberships').delete().eq('obra_id', obraId);
  }

  for (const obraId of obraIds) {
    await supabase.from('obras').delete().eq('id', obraId);
  }
}
