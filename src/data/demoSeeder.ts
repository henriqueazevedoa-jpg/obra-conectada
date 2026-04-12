import { supabase } from '@/integrations/supabase/client';

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

export async function seedDemoData(userId: string, companyId: string) {
  // === 1. OBRAS ===
  const obra1Id = demoId();
  const obra2Id = demoId();
  const obra3Id = demoId();

  const obras = [
    {
      id: obra1Id, nome: `${DEMO_PREFIX} Residencial Vila Nova`, codigo: 'DEMO-2026-001',
      cliente: 'João Silva', endereco: 'Rua das Palmeiras, 120 - Centro',
      status: 'em_andamento', data_inicio: daysAgo(60), data_previsao_termino: daysFromNow(90),
      responsavel: 'Carlos Engenheiro', percentual_andamento: 35,
      descricao: 'Construção residencial de 2 pavimentos', company_id: companyId,
      tipo_implantacao: 'nova' as const, origem_dados: 'real' as const,
    },
    {
      id: obra2Id, nome: `${DEMO_PREFIX} Reforma Comercial Centro`, codigo: 'DEMO-2026-002',
      cliente: 'Maria Souza', endereco: 'Av. Brasil, 500 - Comercial',
      status: 'em_andamento', data_inicio: daysAgo(30), data_previsao_termino: daysFromNow(45),
      responsavel: 'Ana Arquiteta', percentual_andamento: 60,
      descricao: 'Reforma de loja comercial 200m²', company_id: companyId,
      tipo_implantacao: 'em_andamento' as const, percentual_inicial: 20, valor_gasto_anterior: 45000,
      origem_dados: 'estimado' as const, observacao_interna: 'Cliente exigente com prazos',
    },
    {
      id: obra3Id, nome: `${DEMO_PREFIX} Galpão Industrial Fase 1`, codigo: 'DEMO-2026-003',
      cliente: 'Indústrias ABC Ltda', endereco: 'Rod. BR-101, Km 45 - Distrito Industrial',
      status: 'planejamento', data_inicio: daysFromNow(15), data_previsao_termino: daysFromNow(180),
      responsavel: 'Roberto Mestre', percentual_andamento: 0,
      descricao: 'Construção de galpão industrial 1500m²', company_id: companyId,
      tipo_implantacao: 'nova' as const, origem_dados: 'verbal' as const,
      observacoes_implantacao: 'Aguardando licenciamento ambiental',
    },
  ];

  const { error: obrasErr } = await supabase.from('obras').insert(obras as any);
  if (obrasErr) throw new Error(`Obras: ${obrasErr.message}`);

  // === 2. OBRA MEMBERSHIPS ===
  const memberships = [obra1Id, obra2Id, obra3Id].map(obraId => ({
    obra_id: obraId, user_id: userId, role: 'gestor' as const,
  }));
  await supabase.from('obra_memberships').insert(memberships as any);

  // === 3. ORCAMENTO CATEGORIAS + COMPOSIÇÕES ===
  const cat1Id = demoId(), cat2Id = demoId(), cat3Id = demoId(), cat4Id = demoId();
  const cat5Id = demoId(), cat6Id = demoId();

  const categorias = [
    // Obra 1
    { id: cat1Id, obra_id: obra1Id, codigo: '01', nome: 'Fundação', preco_total: 85000, usa_composicoes: true, data_inicio_prevista: daysAgo(55), data_fim_prevista: daysAgo(20), data_inicio_real: daysAgo(58), data_fim_real: daysAgo(18), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: cat2Id, obra_id: obra1Id, codigo: '02', nome: 'Estrutura', preco_total: 120000, usa_composicoes: true, data_inicio_prevista: daysAgo(20), data_fim_prevista: daysFromNow(30), data_inicio_real: daysAgo(18), status_cronograma: 'em_andamento' as const, percentual_cronograma: 40 },
    { id: cat3Id, obra_id: obra1Id, codigo: '03', nome: 'Alvenaria', preco_total: 65000, usa_composicoes: false, data_inicio_prevista: daysFromNow(15), data_fim_prevista: daysFromNow(60), status_cronograma: 'nao_iniciada' as const },
    { id: cat4Id, obra_id: obra1Id, codigo: '04', nome: 'Instalações Elétricas', preco_total: 42000, usa_composicoes: false, data_inicio_prevista: daysFromNow(40), data_fim_prevista: daysFromNow(75), status_cronograma: 'nao_iniciada' as const },
    // Obra 2
    { id: cat5Id, obra_id: obra2Id, codigo: '01', nome: 'Demolição e Remoção', preco_total: 18000, usa_composicoes: true, data_inicio_prevista: daysAgo(28), data_fim_prevista: daysAgo(14), data_inicio_real: daysAgo(28), data_fim_real: daysAgo(15), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: cat6Id, obra_id: obra2Id, codigo: '02', nome: 'Acabamento', preco_total: 55000, usa_composicoes: true, data_inicio_prevista: daysAgo(14), data_fim_prevista: daysFromNow(20), data_inicio_real: daysAgo(12), status_cronograma: 'em_andamento' as const, percentual_cronograma: 55, responsavel: 'Ana Arquiteta' },
  ];
  await supabase.from('orcamento_categorias').insert(categorias as any);

  const composicoes = [
    { categoria_id: cat1Id, codigo: '01.01', descricao: 'Escavação mecânica', preco_total: 25000, preco_unitario: 50, quantidade: 500, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: cat1Id, codigo: '01.02', descricao: 'Concreto armado fundação', preco_total: 60000, preco_unitario: 400, quantidade: 150, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: cat2Id, codigo: '02.01', descricao: 'Pilares de concreto', preco_total: 55000, preco_unitario: 500, quantidade: 110, unidade: 'un', usa_subitens: false, concluida: true, peso_cronograma: 40 },
    { categoria_id: cat2Id, codigo: '02.02', descricao: 'Vigas e lajes', preco_total: 65000, preco_unitario: 300, quantidade: 216, unidade: 'm²', usa_subitens: false, concluida: false, peso_cronograma: 60 },
    { categoria_id: cat5Id, codigo: '01.01', descricao: 'Demolição paredes internas', preco_total: 8000, preco_unitario: 40, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: cat5Id, codigo: '01.02', descricao: 'Remoção de entulho', preco_total: 10000, preco_unitario: 100, quantidade: 100, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: cat6Id, codigo: '02.01', descricao: 'Piso porcelanato', preco_total: 30000, preco_unitario: 150, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true, peso_cronograma: 50 },
    { categoria_id: cat6Id, codigo: '02.02', descricao: 'Pintura e acabamento', preco_total: 25000, preco_unitario: 35, quantidade: 714, unidade: 'm²', usa_subitens: false, concluida: false, peso_cronograma: 50 },
  ];
  await supabase.from('orcamento_composicoes').insert(composicoes as any);

  // === 4. CUSTO REAL ===
  const custoItens = [
    { obra_id: obra1Id, company_id: companyId, descricao: `${DEMO_PREFIX} Escavação mecânica`, valor: 27500, categoria: 'Fundação', data: daysAgo(50), fornecedor: 'Terraplanagem Silva' },
    { obra_id: obra1Id, company_id: companyId, descricao: `${DEMO_PREFIX} Concreto usinado`, valor: 58000, categoria: 'Fundação', data: daysAgo(35), fornecedor: 'Concreteira ABC' },
    { obra_id: obra1Id, company_id: companyId, descricao: `${DEMO_PREFIX} Aço CA-50`, valor: 32000, categoria: 'Estrutura', data: daysAgo(15), fornecedor: 'Siderúrgica Nacional' },
    { obra_id: obra2Id, company_id: companyId, descricao: `${DEMO_PREFIX} Demolição`, valor: 9500, categoria: 'Demolição', data: daysAgo(25), fornecedor: 'Demolidora Express' },
    { obra_id: obra2Id, company_id: companyId, descricao: `${DEMO_PREFIX} Porcelanato 60x60`, valor: 28000, categoria: 'Acabamento', data: daysAgo(8), fornecedor: 'Cerâmica Luxo' },
  ];
  await supabase.from('custo_real_itens').insert(custoItens as any);

  // === 5. MATERIAIS (ESTOQUE) ===
  const mat1Id = demoId(), mat2Id = demoId(), mat3Id = demoId(), mat4Id = demoId(), mat5Id = demoId();
  const materiais = [
    { id: mat1Id, obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Cimento CP-II`, unidade: 'saco', categoria: 'Materiais Básicos', estoque_atual: 45, estoque_minimo: 50, localizacao: 'Almoxarifado A' },
    { id: mat2Id, obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Vergalhão 10mm`, unidade: 'barra', categoria: 'Aço', estoque_atual: 200, estoque_minimo: 100, localizacao: 'Pátio' },
    { id: mat3Id, obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Areia média`, unidade: 'm³', categoria: 'Materiais Básicos', estoque_atual: 8, estoque_minimo: 15, localizacao: 'Pátio' },
    { id: mat4Id, obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Porcelanato 60x60`, unidade: 'm²', categoria: 'Acabamento', estoque_atual: 80, estoque_minimo: 30, localizacao: 'Depósito' },
    { id: mat5Id, obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Tinta Acrílica`, unidade: 'lata', categoria: 'Pintura', estoque_atual: 5, estoque_minimo: 10, localizacao: 'Depósito' },
  ];
  await supabase.from('materiais').insert(materiais as any);

  // Movimentações
  const movimentacoes = [
    { obra_id: obra1Id, company_id: companyId, material_id: mat1Id, material_nome: `${DEMO_PREFIX} Cimento CP-II`, quantidade: 100, tipo: 'entrada', data: daysAgo(20), responsavel: 'Carlos', origem_destino: 'Fornecedor ABC' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat1Id, material_nome: `${DEMO_PREFIX} Cimento CP-II`, quantidade: 55, tipo: 'saida', data: daysAgo(10), responsavel: 'Pedro', origem_destino: 'Obra - Fundação' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat3Id, material_nome: `${DEMO_PREFIX} Areia média`, quantidade: 20, tipo: 'entrada', data: daysAgo(15), responsavel: 'Carlos', origem_destino: 'Mineradora XYZ' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat3Id, material_nome: `${DEMO_PREFIX} Areia média`, quantidade: 12, tipo: 'saida', data: daysAgo(5), responsavel: 'Pedro', origem_destino: 'Obra - Estrutura' },
  ];
  await supabase.from('movimentacoes').insert(movimentacoes as any);

  // === 6. DIARIO REGISTROS ===
  const diarios = [
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(3), clima: 'sol' as const, trabalhadores: 12, servicos_executados: `${DEMO_PREFIX} Concretagem de pilares P3 a P8. Montagem de formas para vigas V1-V4.`, problemas: null, observacoes: 'Produtividade acima do esperado', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(2), clima: 'nublado' as const, trabalhadores: 10, servicos_executados: `${DEMO_PREFIX} Desforma de pilares. Início da armação de vigas.`, problemas: 'Atraso na entrega de aço', observacoes: null, status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(1), clima: 'chuva' as const, trabalhadores: 6, servicos_executados: `${DEMO_PREFIX} Serviços internos e organização do canteiro.`, problemas: 'Chuva forte impediu trabalhos externos', observacoes: 'Previsão de melhora para amanhã', status: 'pendente' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(2), clima: 'sol' as const, trabalhadores: 8, servicos_executados: `${DEMO_PREFIX} Assentamento de porcelanato área principal. 60m² executados.`, problemas: null, observacoes: null, status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(1), clima: 'sol' as const, trabalhadores: 8, servicos_executados: `${DEMO_PREFIX} Rejuntamento área 1. Início preparação paredes para pintura.`, problemas: 'Falta de massa corrida no estoque', observacoes: 'Solicitada compra urgente', status: 'pendente' as const },
  ];
  await supabase.from('diario_registros').insert(diarios as any);

  // === 7. PAGAMENTOS ===
  const pagamentos = [
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Concreto usinado - NF 4521`, tipo_pagamento: 'material' as const, valor_previsto: 58000, data_vencimento: daysAgo(5), status: 'atrasado' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Concreteira ABC', observacoes: 'Nota fiscal pendente de conferência' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Equipe estrutura - Quinzena 1`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 18000, data_vencimento: daysFromNow(3), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: null },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Aço CA-50 - Lote 2`, tipo_pagamento: 'material' as const, valor_previsto: 32000, data_vencimento: daysFromNow(10), status: 'previsto' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Siderúrgica Nacional' },
    { obra_id: obra1Id, descricao: `${DEMO_PREFIX} Terraplanagem fase 1`, tipo_pagamento: 'servico' as const, valor_previsto: 27500, data_vencimento: daysAgo(30), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Terraplanagem Silva' },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Porcelanato importado`, tipo_pagamento: 'material' as const, valor_previsto: 28000, data_vencimento: daysAgo(2), status: 'pago' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Cerâmica Luxo', numero_parcela: 1, total_parcelas: 3 },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Porcelanato parcela 2`, tipo_pagamento: 'material' as const, valor_previsto: 28000, data_vencimento: daysFromNow(28), status: 'previsto' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Cerâmica Luxo', numero_parcela: 2, total_parcelas: 3 },
    { obra_id: obra2Id, descricao: `${DEMO_PREFIX} Mão de obra pintura`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 12000, data_vencimento: daysFromNow(5), status: 'previsto' as const, forma_pagamento: 'pix' as const, fornecedor: 'Pinturas Express' },
    { obra_id: obra3Id, descricao: `${DEMO_PREFIX} Projeto arquitetônico`, tipo_pagamento: 'servico' as const, valor_previsto: 35000, data_vencimento: daysFromNow(20), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Arq. & Design' },
  ];
  await supabase.from('pagamentos').insert(pagamentos as any);

  // === 8. PENDÊNCIAS ===
  const pendencias = [
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Alvará de construção pendente`, descricao: 'Documentação enviada à prefeitura, aguardando retorno', tipo: 'documento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(5), observacao_interna: 'Protocolo #45678' },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Orçamento de instalações hidráulicas`, descricao: 'Solicitar 3 cotações para instalações hidráulicas', tipo: 'orcamento' as const, prioridade: 'media' as const, status: 'em_andamento' as const, data_limite: daysFromNow(15) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Conferir NF da concreteira`, tipo: 'pagamento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysAgo(2), observacao_interna: 'Valor divergente do pedido' },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Aprovar diário de ontem`, tipo: 'diario' as const, prioridade: 'baixa' as const, status: 'aberta' as const, data_limite: daysFromNow(1) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Comprar massa corrida urgente`, descricao: 'Falta de estoque identificada no diário', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(1) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Vistoria elétrica`, descricao: 'Agendar vistoria com concessionária', tipo: 'documento' as const, prioridade: 'media' as const, status: 'resolvida' as const, data_limite: daysAgo(5) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Licenciamento ambiental`, descricao: 'Estudo de impacto ambiental em andamento', tipo: 'documento' as const, prioridade: 'alta' as const, status: 'em_andamento' as const, data_limite: daysFromNow(30) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Contratação de topógrafo`, tipo: 'custo' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(10) },
  ];
  await supabase.from('pendencias').insert(pendencias as any);

  // === 9. FORNECEDORES ===
  const forn1Id = demoId(), forn2Id = demoId(), forn3Id = demoId(), forn4Id = demoId();
  const fornecedores = [
    { id: forn1Id, obra_id: obra1Id, nome: `${DEMO_PREFIX} Concreteira ABC`, cnpj: '12.345.678/0001-90', email: 'vendas@concreteira.com', telefone: '(11) 3456-7890', cidade: 'São Paulo', observacoes: 'Entrega em 24h' },
    { id: forn2Id, obra_id: obra1Id, nome: `${DEMO_PREFIX} Siderúrgica Nacional`, cnpj: '98.765.432/0001-10', email: 'comercial@siderurgica.com', telefone: '(11) 2345-6789', cidade: 'Guarulhos' },
    { id: forn3Id, obra_id: obra2Id, nome: `${DEMO_PREFIX} Cerâmica Luxo`, cnpj: '11.222.333/0001-44', email: 'contato@ceramicaluxo.com', telefone: '(21) 9876-5432', cidade: 'Rio de Janeiro', observacoes: 'Parcela em até 3x' },
    { id: forn4Id, obra_id: obra1Id, nome: `${DEMO_PREFIX} Terraplanagem Silva`, telefone: '(11) 99888-7766', cidade: 'Cotia' },
  ];
  await supabase.from('fornecedores').insert(fornecedores as any);

  // === 10. PREÇOS FORNECEDORES ===
  const precos = [
    { fornecedor_id: forn1Id, obra_id: obra1Id, descricao_item_snapshot: 'Concreto fck 25 MPa', preco_unitario: 380, unidade: 'm³', data_referencia: daysAgo(40), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn1Id, obra_id: obra1Id, descricao_item_snapshot: 'Concreto fck 25 MPa', preco_unitario: 395, unidade: 'm³', data_referencia: daysAgo(10), origem_preco: 'compra_real' as const, observacoes: 'Reajuste de 4%' },
    { fornecedor_id: forn1Id, obra_id: obra1Id, descricao_item_snapshot: 'Concreto fck 30 MPa', preco_unitario: 420, unidade: 'm³', data_referencia: daysAgo(10), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn2Id, obra_id: obra1Id, descricao_item_snapshot: 'Vergalhão CA-50 10mm', preco_unitario: 42.5, unidade: 'barra 12m', data_referencia: daysAgo(20), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn2Id, obra_id: obra1Id, descricao_item_snapshot: 'Vergalhão CA-50 10mm', preco_unitario: 39.9, unidade: 'barra 12m', data_referencia: daysAgo(45), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn3Id, obra_id: obra2Id, descricao_item_snapshot: 'Porcelanato 60x60 cinza', preco_unitario: 89.9, unidade: 'm²', data_referencia: daysAgo(15), origem_preco: 'compra_real' as const },
    { fornecedor_id: forn3Id, obra_id: obra2Id, descricao_item_snapshot: 'Porcelanato 60x60 branco', preco_unitario: 95.0, unidade: 'm²', data_referencia: daysAgo(15), origem_preco: 'cotacao' as const },
    { fornecedor_id: forn4Id, obra_id: obra1Id, descricao_item_snapshot: 'Escavação mecânica', preco_unitario: 55, unidade: 'm³', data_referencia: daysAgo(60), origem_preco: 'compra_real' as const },
  ];
  await supabase.from('precos_fornecedores').insert(precos as any);

  return { obra1Id, obra2Id, obra3Id };
}

export async function clearDemoData(companyId: string) {
  // Get demo obra IDs
  const { data: demoObras } = await supabase
    .from('obras')
    .select('id')
    .eq('company_id', companyId)
    .like('nome', `${DEMO_PREFIX}%`);

  const obraIds = (demoObras || []).map(o => o.id);
  if (obraIds.length === 0) return;

  // Delete in dependency order
  for (const obraId of obraIds) {
    await supabase.from('precos_fornecedores').delete().eq('obra_id', obraId);
    await supabase.from('fornecedores').delete().eq('obra_id', obraId);
    await supabase.from('pendencias').delete().eq('obra_id', obraId);
    await supabase.from('pagamentos').delete().eq('obra_id', obraId);
    await supabase.from('diario_registros').delete().eq('obra_id', obraId);
    await supabase.from('movimentacoes').delete().eq('obra_id', obraId);
    await supabase.from('materiais').delete().eq('obra_id', obraId);

    // Orcamento: composições depend on categorias
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

  // Finally delete obras
  for (const obraId of obraIds) {
    await supabase.from('obras').delete().eq('id', obraId);
  }
}
