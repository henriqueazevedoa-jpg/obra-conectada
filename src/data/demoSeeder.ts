import { supabase } from '@/integrations/supabase/untyped';

const DEMO_PREFIX = '[DEMO]';

function demoId() { return crypto.randomUUID(); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

async function checkedInsert(table: string, data: any[], optional = false) {
  if (data.length === 0) return;
  const { error } = await (supabase.from as any)(table).insert(data);
  if (error) {
    if (optional || error.message?.includes('Could not find the table')) {
      console.warn(`Demo seed: ${table} skipped`);
      return;
    }
    throw new Error(`${table}: ${error.message}`);
  }
}

export async function seedDemoData(userId: string, companyId: string) {

  const obra1Id = demoId();
  const obra2Id = demoId();
  const obra3Id = demoId();
  const obra4Id = demoId();

  // ================= OBRAS =================
  const obras = [
    {
      id: obra1Id,
      nome: `${DEMO_PREFIX} Reforma Apto Alto Padrão - Itaim`,
      codigo: 'DEMO-001',
      cliente: 'Fernanda Azevedo',
      endereco: 'Itaim Bibi - SP',
      status: 'em_andamento',
      data_inicio: daysAgo(70),
      data_previsao_termino: daysFromNow(40),
      percentual_andamento: 65,
      company_id: companyId
    },
    {
      id: obra2Id,
      nome: `${DEMO_PREFIX} Residência Família Martins`,
      codigo: 'DEMO-002',
      cliente: 'Henrique Martins',
      endereco: 'Alphaville - SP',
      status: 'em_andamento',
      data_inicio: daysAgo(120),
      data_previsao_termino: daysFromNow(150),
      percentual_andamento: 38,
      company_id: companyId
    },
    {
      id: obra3Id,
      nome: `${DEMO_PREFIX} Galpão Comercial LogTech`,
      codigo: 'DEMO-003',
      cliente: 'LogTech Ltda',
      endereco: 'Jundiaí - SP',
      status: 'em_andamento',
      data_inicio: daysAgo(60),
      data_previsao_termino: daysFromNow(180),
      percentual_andamento: 22,
      company_id: companyId
    },
    {
      id: obra4Id,
      nome: `${DEMO_PREFIX} Casa de Praia - Riviera`,
      codigo: 'DEMO-004',
      cliente: 'Família Nogueira',
      endereco: 'Riviera de São Lourenço',
      status: 'em_andamento',
      data_inicio: daysAgo(240),
      data_previsao_termino: daysFromNow(15),
      percentual_andamento: 94,
      company_id: companyId
    }
  ];

  await checkedInsert('obras', obras);

  // memberships
  await Promise.all(
    obras.map(o =>
      (supabase.from as any)('obra_memberships').upsert({
        obra_id: o.id,
        user_id: userId,
        role: 'gestor'
      })
    )
  );

  // ================= CATEGORIAS =================
  const categorias = [
    {
      id: demoId(),
      obra_id: obra1Id,
      codigo: '01',
      nome: 'Revestimentos',
      preco_total: 65000,
      status_cronograma: 'em_andamento',
      percentual_cronograma: 70
    },
    {
      id: demoId(),
      obra_id: obra1Id,
      codigo: '02',
      nome: 'Marcenaria',
      preco_total: 80000,
      status_cronograma: 'em_andamento',
      percentual_cronograma: 20
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      codigo: '01',
      nome: 'Estrutura',
      preco_total: 160000,
      status_cronograma: 'em_andamento',
      percentual_cronograma: 60
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      codigo: '01',
      nome: 'Fundação',
      preco_total: 280000,
      status_cronograma: 'em_andamento',
      percentual_cronograma: 55
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      codigo: '01',
      nome: 'Finalização',
      preco_total: 45000,
      status_cronograma: 'em_andamento',
      percentual_cronograma: 90
    }
  ];

  await checkedInsert('orcamento_categorias', categorias);

  // ================= COMPOSIÇÕES =================
  const composicoes = categorias.map(cat => ({
    id: demoId(),
    categoria_id: cat.id,
    codigo: `${cat.codigo}.01`,
    descricao: `${DEMO_PREFIX} Execução ${cat.nome}`,
    quantidade: 100,
    unidade: 'm²',
    preco_unitario: 200,
    preco_total: 20000
  }));

  await checkedInsert('orcamento_composicoes', composicoes);

  // ================= SUBITENS =================
  const subitens = composicoes.map(comp => ({
    composicao_id: comp.id,
    descricao: `${DEMO_PREFIX} Material ${comp.descricao}`,
    quantidade: 50,
    unidade: 'un',
    preco_unitario: 20,
    preco_total: 1000
  }));

  await checkedInsert('orcamento_subitens', subitens);

  // ================= PAGAMENTOS =================
  const pagamentos = [
    {
      id: demoId(),
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Porcelanato`,
      valor_previsto: 32000,
      data_vencimento: daysAgo(5),
      status: 'pago',
      fornecedor: 'Portobello',
      etapa_orcamento: 'Revestimentos'
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Concreto`,
      valor_previsto: 48000,
      data_vencimento: daysFromNow(5),
      status: 'previsto',
      fornecedor: 'Engemix'
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Estacas`,
      valor_previsto: 90000,
      data_vencimento: daysAgo(2),
      status: 'atrasado',
      fornecedor: 'Estacas Brasil'
    }
  ];

  await checkedInsert('pagamentos', pagamentos, true);

  // ================= DIÁRIO =================
  const diario = [
    {
      obra_id: obra1Id,
      user_id: userId,
      data: daysAgo(1),
      clima: 'sol',
      trabalhadores: 5,
      servicos_executados: `${DEMO_PREFIX} Assentamento porcelanato`,
      status: 'aprovado'
    },
    {
      obra_id: obra2Id,
      user_id: userId,
      data: daysAgo(1),
      clima: 'nublado',
      trabalhadores: 10,
      servicos_executados: `${DEMO_PREFIX} Execução estrutura`,
      status: 'aprovado'
    }
  ];

  await checkedInsert('diario_registros', diario);

  // ================= AGENDA =================
  const agenda = [
    {
      obra_id: obra1Id,
      titulo: 'Entrega material',
      data: daysFromNow(2)
    },
    {
      obra_id: obra4Id,
      titulo: 'Vistoria final',
      data: daysFromNow(3)
    }
  ];

  await checkedInsert('obra_agenda', agenda, true);

  console.log('🔥 DEMO PREMIUM CRIADO');
}
