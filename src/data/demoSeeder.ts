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

async function checkedInsert(table: string, data: any[], optional = false) {
  if (!data.length) return;

  const { error } = await (supabase.from as any)(table).insert(data);

  if (error) {
    if (optional || error.message?.includes('Could not find the table')) {
      console.warn(`Demo seed: ${table} skipped (table not found)`);
      return;
    }

    console.error(`Demo seed: ${table} insert failed:`, error.message, error.details, error.hint);
    throw new Error(`${table}: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// SEED DEMO DATA — VERSÃO PREMIUM
// ═══════════════════════════════════════════════════════════════

export async function seedDemoData(userId: string, companyId: string) {
  const obra1Id = demoId();
  const obra2Id = demoId();
  const obra3Id = demoId();
  const obra4Id = demoId();

  // ══════════════════════ 1. OBRAS ══════════════════════
  const obras = [
    {
      id: obra1Id,
      nome: `${DEMO_PREFIX} Reforma Apto Alto Padrão - Itaim`,
      codigo: 'DEMO-2026-001',
      cliente: 'Fernanda e Ricardo Azevedo',
      endereco: 'Rua Joaquim Floriano, 820 Apto 142 - Itaim Bibi, São Paulo/SP',
      status: 'em_andamento',
      data_inicio: daysAgo(75),
      data_previsao_termino: daysFromNow(45),
      responsavel: 'Arq. Camila Duarte',
      percentual_andamento: 62,
      descricao:
        'Reforma completa de apartamento de 180m² com demolição total do layout anterior, novo projeto de iluminação, automação, marcenaria sob medida e acabamentos premium.',
      company_id: companyId,
      tipo_implantacao: 'em_andamento' as const,
      percentual_inicial: 10,
      valor_gasto_anterior: 38000,
      origem_dados: 'real' as const,
      observacao_interna:
        'Clientes exigentes. Aprovação de materiais sempre presencial. Obra excelente para demonstrar acabamentos, pagamentos parcelados e pendências.',
    },
    {
      id: obra2Id,
      nome: `${DEMO_PREFIX} Residência Família Martins`,
      codigo: 'DEMO-2026-002',
      cliente: 'Dr. Henrique Martins',
      endereco: 'Rua das Acácias, 340 - Alphaville, Barueri/SP',
      status: 'em_andamento',
      data_inicio: daysAgo(120),
      data_previsao_termino: daysFromNow(150),
      responsavel: 'Eng. Paulo Roberto',
      percentual_andamento: 38,
      descricao:
        'Construção de residência unifamiliar de 2 pavimentos, 320m², com piscina, churrasqueira, área gourmet e edícula.',
      company_id: companyId,
      tipo_implantacao: 'nova' as const,
      origem_dados: 'real' as const,
      observacao_interna:
        'Obra ideal para demonstrar estrutura, alvenaria, estoque, consumo de materiais e pagamentos recorrentes de mão de obra.',
    },
    {
      id: obra3Id,
      nome: `${DEMO_PREFIX} Galpão Comercial LogTech`,
      codigo: 'DEMO-2026-003',
      cliente: 'LogTech Armazéns Ltda',
      endereco: 'Rod. Anhanguera, Km 52 - Distrito Industrial, Jundiaí/SP',
      status: 'em_andamento',
      data_inicio: daysAgo(60),
      data_previsao_termino: daysFromNow(180),
      responsavel: 'Eng. Marcos Teixeira',
      percentual_andamento: 22,
      descricao:
        'Construção de galpão comercial de 2.000m² com mezanino de 400m², docas, piso industrial e área administrativa.',
      company_id: companyId,
      tipo_implantacao: 'nova' as const,
      origem_dados: 'real' as const,
      observacoes_implantacao:
        'Projeto com alta movimentação de fornecedores, contratos e logística. Ideal para demonstrar fluxo financeiro e agenda de obra.',
    },
    {
      id: obra4Id,
      nome: `${DEMO_PREFIX} Casa de Praia - Riviera`,
      codigo: 'DEMO-2026-004',
      cliente: 'Família Nogueira',
      endereco: 'Av. Riviera, Módulo 24, Lote 18 - Riviera de São Lourenço, Bertioga/SP',
      status: 'em_andamento',
      data_inicio: daysAgo(240),
      data_previsao_termino: daysFromNow(15),
      responsavel: 'Eng. Roberto Campos',
      percentual_andamento: 94,
      descricao:
        'Casa de praia de 250m², com 3 suítes, varanda gourmet, piscina com borda infinita e fase final de acabamento, vistoria e entrega.',
      company_id: companyId,
      tipo_implantacao: 'nova' as const,
      origem_dados: 'real' as const,
      observacao_interna:
        'Obra ideal para demonstrar checklist final, pendências de entrega, documentos finais, garantias e pagamentos de encerramento.',
    },
  ];

  await checkedInsert('obras', obras);

  for (const obraId of [obra1Id, obra2Id, obra3Id, obra4Id]) {
    await (supabase.from as any)('obra_memberships').upsert(
      {
        obra_id: obraId,
        user_id: userId,
        role: 'gestor' as const,
      },
      { onConflict: 'obra_id,user_id' }
    );
  }
    // ══════════════════════ 2. ORÇAMENTO / CATEGORIAS ══════════════════════

  const c1 = Array.from({ length: 10 }, () => demoId()); // Reforma apto
  const c2 = Array.from({ length: 12 }, () => demoId()); // Residência
  const c3 = Array.from({ length: 10 }, () => demoId()); // Galpão
  const c4 = Array.from({ length: 10 }, () => demoId()); // Casa de praia

  const categorias = [
    // ───────────────── OBRA 1 — REFORMA APTO ALTO PADRÃO ─────────────────
    {
      id: c1[0],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '01',
      nome: 'Demolição e Remoção',
      preco_total: 22000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(74),
      data_fim_prevista: daysAgo(60),
      data_inicio_real: daysAgo(74),
      data_fim_real: daysAgo(58),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c1[1],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '02',
      nome: 'Infraestrutura Elétrica',
      preco_total: 36000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(59),
      data_fim_prevista: daysAgo(38),
      data_inicio_real: daysAgo(57),
      data_fim_real: daysAgo(36),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c1[2],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '03',
      nome: 'Infraestrutura Hidráulica',
      preco_total: 27000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(58),
      data_fim_prevista: daysAgo(40),
      data_inicio_real: daysAgo(56),
      data_fim_real: daysAgo(39),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c1[3],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '04',
      nome: 'Gesso e Forros',
      preco_total: 24000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(34),
      data_fim_prevista: daysAgo(18),
      data_inicio_real: daysAgo(32),
      data_fim_real: daysAgo(15),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c1[4],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '05',
      nome: 'Revestimentos e Pisos',
      preco_total: 72000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(14),
      data_fim_prevista: daysFromNow(8),
      data_inicio_real: daysAgo(12),
      status_cronograma: 'em_andamento' as const,
      percentual_cronograma: 68,
    },
    {
      id: c1[5],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '06',
      nome: 'Marcenaria Sob Medida',
      preco_total: 98000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(4),
      data_fim_prevista: daysFromNow(26),
      data_inicio_real: daysAgo(2),
      status_cronograma: 'em_andamento' as const,
      percentual_cronograma: 18,
    },
    {
      id: c1[6],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '07',
      nome: 'Pintura',
      preco_total: 21000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(8),
      data_fim_prevista: daysFromNow(28),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c1[7],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '08',
      nome: 'Louças e Metais',
      preco_total: 26000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(18),
      data_fim_prevista: daysFromNow(34),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c1[8],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '09',
      nome: 'Automação e Iluminação Final',
      preco_total: 32000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(20),
      data_fim_prevista: daysFromNow(38),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c1[9],
      obra_id: obra1Id,
      company_id: companyId,
      codigo: '10',
      nome: 'Limpeza e Entrega',
      preco_total: 7000,
      usa_composicoes: false,
      data_inicio_prevista: daysFromNow(36),
      data_fim_prevista: daysFromNow(42),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },

    // ───────────────── OBRA 2 — RESIDÊNCIA FAMÍLIA MARTINS ─────────────────
    {
      id: c2[0],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '01',
      nome: 'Serviços Preliminares',
      preco_total: 38000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(118),
      data_fim_prevista: daysAgo(101),
      data_inicio_real: daysAgo(118),
      data_fim_real: daysAgo(99),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c2[1],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '02',
      nome: 'Fundação',
      preco_total: 110000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(100),
      data_fim_prevista: daysAgo(65),
      data_inicio_real: daysAgo(98),
      data_fim_real: daysAgo(63),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c2[2],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '03',
      nome: 'Estrutura',
      preco_total: 185000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(64),
      data_fim_prevista: daysAgo(5),
      data_inicio_real: daysAgo(61),
      status_cronograma: 'em_andamento' as const,
      percentual_cronograma: 74,
    },
    {
      id: c2[3],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '04',
      nome: 'Alvenaria e Vedação',
      preco_total: 84000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(18),
      data_fim_prevista: daysFromNow(22),
      data_inicio_real: daysAgo(15),
      status_cronograma: 'em_andamento' as const,
      percentual_cronograma: 36,
    },
    {
      id: c2[4],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '05',
      nome: 'Cobertura',
      preco_total: 56000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(14),
      data_fim_prevista: daysFromNow(44),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c2[5],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '06',
      nome: 'Instalações Elétricas',
      preco_total: 62000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(24),
      data_fim_prevista: daysFromNow(72),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c2[6],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '07',
      nome: 'Instalações Hidráulicas',
      preco_total: 47000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(24),
      data_fim_prevista: daysFromNow(72),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c2[7],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '08',
      nome: 'Esquadrias',
      preco_total: 44000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(50),
      data_fim_prevista: daysFromNow(88),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c2[8],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '09',
      nome: 'Revestimentos',
      preco_total: 72000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(62),
      data_fim_prevista: daysFromNow(110),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c2[9],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '10',
      nome: 'Pintura e Acabamentos',
      preco_total: 42000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(96),
      data_fim_prevista: daysFromNow(132),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c2[10],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '11',
      nome: 'Piscina e Área Externa',
      preco_total: 95000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(108),
      data_fim_prevista: daysFromNow(145),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c2[11],
      obra_id: obra2Id,
      company_id: companyId,
      codigo: '12',
      nome: 'Entrega Final',
      preco_total: 9000,
      usa_composicoes: false,
      data_inicio_prevista: daysFromNow(145),
      data_fim_prevista: daysFromNow(150),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },

    // ───────────────── OBRA 3 — GALPÃO COMERCIAL ─────────────────
    {
      id: c3[0],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '01',
      nome: 'Terraplenagem',
      preco_total: 135000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(58),
      data_fim_prevista: daysAgo(30),
      data_inicio_real: daysAgo(58),
      data_fim_real: daysAgo(28),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c3[1],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '02',
      nome: 'Fundação Profunda',
      preco_total: 320000,
      usa_composicoes: true,
      data_inicio_prevista: daysAgo(30),
      data_fim_prevista: daysFromNow(16),
      data_inicio_real: daysAgo(28),
      status_cronograma: 'em_andamento' as const,
      percentual_cronograma: 63,
    },
    {
      id: c3[2],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '03',
      nome: 'Estrutura Metálica',
      preco_total: 560000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(8),
      data_fim_prevista: daysFromNow(74),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c3[3],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '04',
      nome: 'Cobertura Metálica',
      preco_total: 220000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(54),
      data_fim_prevista: daysFromNow(96),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c3[4],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '05',
      nome: 'Piso Industrial',
      preco_total: 210000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(80),
      data_fim_prevista: daysFromNow(112),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c3[5],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '06',
      nome: 'Instalações Elétricas Industriais',
      preco_total: 178000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(72),
      data_fim_prevista: daysFromNow(128),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c3[6],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '07',
      nome: 'Hidrossanitário e Drenagem',
      preco_total: 98000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(80),
      data_fim_prevista: daysFromNow(130),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c3[7],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '08',
      nome: 'Mezanino e Escritórios',
      preco_total: 162000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(94),
      data_fim_prevista: daysFromNow(152),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c3[8],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '09',
      nome: 'Docas e Fechamentos',
      preco_total: 118000,
      usa_composicoes: true,
      data_inicio_prevista: daysFromNow(125),
      data_fim_prevista: daysFromNow(168),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
    {
      id: c3[9],
      obra_id: obra3Id,
      company_id: companyId,
      codigo: '10',
      nome: 'Comissionamento e Entrega',
      preco_total: 18000,
      usa_composicoes: false,
      data_inicio_prevista: daysFromNow(169),
      data_fim_prevista: daysFromNow(180),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },

    // ───────────────── OBRA 4 — CASA DE PRAIA ─────────────────
    {
      id: c4[0],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '01',
      nome: 'Serviços Preliminares',
      preco_total: 32000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(238),
      data_fim_prevista: daysAgo(220),
      data_inicio_real: daysAgo(238),
      data_fim_real: daysAgo(218),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c4[1],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '02',
      nome: 'Fundação',
      preco_total: 84000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(220),
      data_fim_prevista: daysAgo(185),
      data_inicio_real: daysAgo(218),
      data_fim_real: daysAgo(182),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c4[2],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '03',
      nome: 'Estrutura',
      preco_total: 132000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(185),
      data_fim_prevista: daysAgo(130),
      data_inicio_real: daysAgo(182),
      data_fim_real: daysAgo(128),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c4[3],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '04',
      nome: 'Alvenaria e Cobertura',
      preco_total: 98000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(130),
      data_fim_prevista: daysAgo(86),
      data_inicio_real: daysAgo(128),
      data_fim_real: daysAgo(82),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c4[4],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '05',
      nome: 'Instalações',
      preco_total: 71000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(90),
      data_fim_prevista: daysAgo(50),
      data_inicio_real: daysAgo(88),
      data_fim_real: daysAgo(48),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c4[5],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '06',
      nome: 'Revestimentos e Pisos',
      preco_total: 91000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(56),
      data_fim_prevista: daysAgo(20),
      data_inicio_real: daysAgo(52),
      data_fim_real: daysAgo(18),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c4[6],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '07',
      nome: 'Pintura',
      preco_total: 34000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(22),
      data_fim_prevista: daysAgo(6),
      data_inicio_real: daysAgo(20),
      data_fim_real: daysAgo(4),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c4[7],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '08',
      nome: 'Piscina e Área Externa',
      preco_total: 98000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(40),
      data_fim_prevista: daysAgo(4),
      data_inicio_real: daysAgo(38),
      data_fim_real: daysAgo(3),
      status_cronograma: 'concluida' as const,
      percentual_cronograma: 100,
    },
    {
      id: c4[8],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '09',
      nome: 'Limpeza Final e Vistoria',
      preco_total: 12000,
      usa_composicoes: false,
      data_inicio_prevista: daysAgo(5),
      data_fim_prevista: daysFromNow(5),
      data_inicio_real: daysAgo(3),
      status_cronograma: 'em_andamento' as const,
      percentual_cronograma: 60,
    },
    {
      id: c4[9],
      obra_id: obra4Id,
      company_id: companyId,
      codigo: '10',
      nome: 'Entrega e Assistência Inicial',
      preco_total: 10000,
      usa_composicoes: false,
      data_inicio_prevista: daysFromNow(5),
      data_fim_prevista: daysFromNow(15),
      status_cronograma: 'nao_iniciada' as const,
      percentual_cronograma: 0,
    },
  ];

  await checkedInsert('orcamento_categorias', categorias);
  // ══════════════════════ 3. ORÇAMENTO / COMPOSIÇÕES ══════════════════════

  const composicoes = [
    // ───────────────── OBRA 1 — REFORMA APTO ALTO PADRÃO ─────────────────
    { id: demoId(), company_id: companyId, categoria_id: c1[0], codigo: '01.01', descricao: 'Demolição de paredes e forros', preco_total: 7800, preco_unitario: 52, quantidade: 150, unidade: 'm²', usa_subitens: true, concluida: true },
    { id: demoId(), company_id: companyId, categoria_id: c1[0], codigo: '01.02', descricao: 'Remoção de pisos e revestimentos', preco_total: 6200, preco_unitario: 39, quantidade: 159, unidade: 'm²', usa_subitens: true, concluida: true },
    { id: demoId(), company_id: companyId, categoria_id: c1[0], codigo: '01.03', descricao: 'Caçambas e transporte de entulho', preco_total: 8000, preco_unitario: 800, quantidade: 10, unidade: 'un', usa_subitens: true, concluida: true },

    { id: demoId(), company_id: companyId, categoria_id: c1[1], codigo: '02.01', descricao: 'Infraestrutura de eletrodutos e caixas', preco_total: 13500, preco_unitario: 75, quantidade: 180, unidade: 'pt', usa_subitens: true, concluida: true, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c1[1], codigo: '02.02', descricao: 'Cabeamento e quadros elétricos', preco_total: 12800, preco_unitario: 71.11, quantidade: 180, unidade: 'pt', usa_subitens: true, concluida: true, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c1[1], codigo: '02.03', descricao: 'Preparação para automação e sonorização', preco_total: 9700, preco_unitario: 9700, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: true, peso_cronograma: 30 },

    { id: demoId(), company_id: companyId, categoria_id: c1[2], codigo: '03.01', descricao: 'Rede de água fria e quente', preco_total: 15500, preco_unitario: 103.33, quantidade: 150, unidade: 'pt', usa_subitens: true, concluida: true, peso_cronograma: 55 },
    { id: demoId(), company_id: companyId, categoria_id: c1[2], codigo: '03.02', descricao: 'Rede de esgoto e ventilação', preco_total: 11500, preco_unitario: 287.5, quantidade: 40, unidade: 'pt', usa_subitens: true, concluida: true, peso_cronograma: 45 },

    { id: demoId(), company_id: companyId, categoria_id: c1[3], codigo: '04.01', descricao: 'Forro de gesso acartonado', preco_total: 14500, preco_unitario: 87.88, quantidade: 165, unidade: 'm²', usa_subitens: true, concluida: true, peso_cronograma: 65 },
    { id: demoId(), company_id: companyId, categoria_id: c1[3], codigo: '04.02', descricao: 'Sancas, cortineiros e tabicas', preco_total: 9500, preco_unitario: 141.79, quantidade: 67, unidade: 'ml', usa_subitens: true, concluida: true, peso_cronograma: 35 },

    { id: demoId(), company_id: companyId, categoria_id: c1[4], codigo: '05.01', descricao: 'Porcelanato retificado 80x80 salas', preco_total: 29000, preco_unitario: 290, quantidade: 100, unidade: 'm²', usa_subitens: true, concluida: true, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c1[4], codigo: '05.02', descricao: 'Mármore banheiro suíte master', preco_total: 21000, preco_unitario: 700, quantidade: 30, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 25 },
    { id: demoId(), company_id: companyId, categoria_id: c1[4], codigo: '05.03', descricao: 'Revestimento cozinha e lavanderia', preco_total: 14000, preco_unitario: 233.33, quantidade: 60, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 20 },
    { id: demoId(), company_id: companyId, categoria_id: c1[4], codigo: '05.04', descricao: 'Rodapés e acabamentos finais', preco_total: 8000, preco_unitario: 80, quantidade: 100, unidade: 'ml', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    { id: demoId(), company_id: companyId, categoria_id: c1[5], codigo: '06.01', descricao: 'Marcenaria cozinha', preco_total: 38000, preco_unitario: 38000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c1[5], codigo: '06.02', descricao: 'Marcenaria dormitórios', preco_total: 34000, preco_unitario: 34000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c1[5], codigo: '06.03', descricao: 'Painéis, nichos e complementos', preco_total: 26000, preco_unitario: 26000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 25 },

    { id: demoId(), company_id: companyId, categoria_id: c1[6], codigo: '07.01', descricao: 'Massa corrida e preparação', preco_total: 7000, preco_unitario: 35, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c1[6], codigo: '07.02', descricao: 'Pintura interna premium', preco_total: 9000, preco_unitario: 45, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c1[6], codigo: '07.03', descricao: 'Portas e detalhes em esmalte', preco_total: 5000, preco_unitario: 1000, quantidade: 5, unidade: 'un', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    { id: demoId(), company_id: companyId, categoria_id: c1[7], codigo: '08.01', descricao: 'Louças sanitárias premium', preco_total: 12000, preco_unitario: 3000, quantidade: 4, unidade: 'un', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c1[7], codigo: '08.02', descricao: 'Metais sanitários e cozinha', preco_total: 14000, preco_unitario: 2000, quantidade: 7, unidade: 'un', usa_subitens: true, concluida: false, peso_cronograma: 55 },

    { id: demoId(), company_id: companyId, categoria_id: c1[8], codigo: '09.01', descricao: 'Luminárias decorativas', preco_total: 11000, preco_unitario: 11000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c1[8], codigo: '09.02', descricao: 'Configuração da automação', preco_total: 21000, preco_unitario: 21000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 60 },

    // ───────────────── OBRA 2 — RESIDÊNCIA FAMÍLIA MARTINS ─────────────────
    { id: demoId(), company_id: companyId, categoria_id: c2[0], codigo: '01.01', descricao: 'Limpeza e preparo do terreno', preco_total: 13000, preco_unitario: 19.49, quantidade: 667, unidade: 'm²', usa_subitens: true, concluida: true },
    { id: demoId(), company_id: companyId, categoria_id: c2[0], codigo: '01.02', descricao: 'Tapume, barracão e instalações provisórias', preco_total: 19000, preco_unitario: 190, quantidade: 100, unidade: 'm', usa_subitens: true, concluida: true },
    { id: demoId(), company_id: companyId, categoria_id: c2[0], codigo: '01.03', descricao: 'Locação e gabarito da obra', preco_total: 6000, preco_unitario: 6000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: true },

    { id: demoId(), company_id: companyId, categoria_id: c2[1], codigo: '02.01', descricao: 'Escavação mecânica', preco_total: 32000, preco_unitario: 54.89, quantidade: 583, unidade: 'm³', usa_subitens: true, concluida: true, peso_cronograma: 30 },
    { id: demoId(), company_id: companyId, categoria_id: c2[1], codigo: '02.02', descricao: 'Sapatas, blocos e baldrame', preco_total: 61000, preco_unitario: 564.81, quantidade: 108, unidade: 'm³', usa_subitens: true, concluida: true, peso_cronograma: 50 },
    { id: demoId(), company_id: companyId, categoria_id: c2[1], codigo: '02.03', descricao: 'Impermeabilização da fundação', preco_total: 17000, preco_unitario: 85, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: true, peso_cronograma: 20 },

    { id: demoId(), company_id: companyId, categoria_id: c2[2], codigo: '03.01', descricao: 'Pilares em concreto armado', preco_total: 68000, preco_unitario: 571.43, quantidade: 119, unidade: 'un', usa_subitens: true, concluida: true, peso_cronograma: 25 },
    { id: demoId(), company_id: companyId, categoria_id: c2[2], codigo: '03.02', descricao: 'Vigas e laje do térreo', preco_total: 60000, preco_unitario: 300, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: true, peso_cronograma: 25 },
    { id: demoId(), company_id: companyId, categoria_id: c2[2], codigo: '03.03', descricao: 'Vigas e laje do pavimento superior', preco_total: 54000, preco_unitario: 337.5, quantidade: 160, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 25 },
    { id: demoId(), company_id: companyId, categoria_id: c2[2], codigo: '03.04', descricao: 'Escada em concreto armado', preco_total: 3000, preco_unitario: 3000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 10 },

    { id: demoId(), company_id: companyId, categoria_id: c2[3], codigo: '04.01', descricao: 'Alvenaria térreo', preco_total: 28000, preco_unitario: 140, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c2[3], codigo: '04.02', descricao: 'Alvenaria pavimento superior', preco_total: 26000, preco_unitario: 130, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c2[3], codigo: '04.03', descricao: 'Vergas, contravergas e reforços', preco_total: 14000, preco_unitario: 70, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 25 },

    { id: demoId(), company_id: companyId, categoria_id: c2[4], codigo: '05.01', descricao: 'Estrutura do telhado', preco_total: 22000, preco_unitario: 22000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c2[4], codigo: '05.02', descricao: 'Telhas e cumeeiras', preco_total: 18000, preco_unitario: 120, quantidade: 150, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c2[4], codigo: '05.03', descricao: 'Calhas e rufos', preco_total: 8000, preco_unitario: 80, quantidade: 100, unidade: 'ml', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    { id: demoId(), company_id: companyId, categoria_id: c2[5], codigo: '06.01', descricao: 'Infraestrutura elétrica', preco_total: 20000, preco_unitario: 100, quantidade: 200, unidade: 'pt', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c2[5], codigo: '06.02', descricao: 'Cabeamento e quadros', preco_total: 24000, preco_unitario: 120, quantidade: 200, unidade: 'pt', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c2[5], codigo: '06.03', descricao: 'Tomadas, interruptores e luminárias', preco_total: 18000, preco_unitario: 90, quantidade: 200, unidade: 'pt', usa_subitens: true, concluida: false, peso_cronograma: 25 },

    { id: demoId(), company_id: companyId, categoria_id: c2[6], codigo: '07.01', descricao: 'Rede de água fria/quente', preco_total: 19000, preco_unitario: 105.56, quantidade: 180, unidade: 'pt', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c2[6], codigo: '07.02', descricao: 'Rede de esgoto e ventilação', preco_total: 15000, preco_unitario: 125, quantidade: 120, unidade: 'pt', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c2[6], codigo: '07.03', descricao: 'Reservatórios e pressurização', preco_total: 13000, preco_unitario: 13000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    { id: demoId(), company_id: companyId, categoria_id: c2[7], codigo: '08.01', descricao: 'Esquadrias de alumínio', preco_total: 26000, preco_unitario: 26000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 60 },
    { id: demoId(), company_id: companyId, categoria_id: c2[7], codigo: '08.02', descricao: 'Portas internas e ferragens', preco_total: 18000, preco_unitario: 18000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 40 },

    { id: demoId(), company_id: companyId, categoria_id: c2[8], codigo: '09.01', descricao: 'Pisos internos', preco_total: 24000, preco_unitario: 120, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c2[8], codigo: '09.02', descricao: 'Revestimentos banheiros e cozinha', preco_total: 22000, preco_unitario: 110, quantidade: 200, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c2[8], codigo: '09.03', descricao: 'Bancadas e soleiras', preco_total: 26000, preco_unitario: 26000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 25 },

    { id: demoId(), company_id: companyId, categoria_id: c2[9], codigo: '10.01', descricao: 'Preparação e massa corrida', preco_total: 12000, preco_unitario: 40, quantidade: 300, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c2[9], codigo: '10.02', descricao: 'Pintura interna', preco_total: 16000, preco_unitario: 53.33, quantidade: 300, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c2[9], codigo: '10.03', descricao: 'Louças, metais e acessórios', preco_total: 14000, preco_unitario: 14000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 25 },

    { id: demoId(), company_id: companyId, categoria_id: c2[10], codigo: '11.01', descricao: 'Piscina em concreto', preco_total: 50000, preco_unitario: 50000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 55 },
    { id: demoId(), company_id: companyId, categoria_id: c2[10], codigo: '11.02', descricao: 'Área gourmet e churrasqueira', preco_total: 25000, preco_unitario: 25000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 25 },
    { id: demoId(), company_id: companyId, categoria_id: c2[10], codigo: '11.03', descricao: 'Paisagismo e pavimentação externa', preco_total: 20000, preco_unitario: 20000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    // ───────────────── OBRA 3 — GALPÃO COMERCIAL ─────────────────
    { id: demoId(), company_id: companyId, categoria_id: c3[0], codigo: '01.01', descricao: 'Corte e aterro mecanizado', preco_total: 90000, preco_unitario: 31.5, quantidade: 2857, unidade: 'm³', usa_subitens: true, concluida: true, peso_cronograma: 65 },
    { id: demoId(), company_id: companyId, categoria_id: c3[0], codigo: '01.02', descricao: 'Compactação e nivelamento', preco_total: 45000, preco_unitario: 18, quantidade: 2500, unidade: 'm²', usa_subitens: true, concluida: true, peso_cronograma: 35 },

    { id: demoId(), company_id: companyId, categoria_id: c3[1], codigo: '02.01', descricao: 'Estacas hélice contínua', preco_total: 210000, preco_unitario: 252.1, quantidade: 833, unidade: 'm', usa_subitens: true, concluida: false, peso_cronograma: 60 },
    { id: demoId(), company_id: companyId, categoria_id: c3[1], codigo: '02.02', descricao: 'Blocos de coroamento', preco_total: 85000, preco_unitario: 2361.11, quantidade: 36, unidade: 'un', usa_subitens: true, concluida: false, peso_cronograma: 25 },
    { id: demoId(), company_id: companyId, categoria_id: c3[1], codigo: '02.03', descricao: 'Arrasamento e ligações', preco_total: 25000, preco_unitario: 25000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 15 },

    { id: demoId(), company_id: companyId, categoria_id: c3[2], codigo: '03.01', descricao: 'Fabricação estrutura metálica', preco_total: 280000, preco_unitario: 280000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c3[2], codigo: '03.02', descricao: 'Montagem de pilares e vigas metálicas', preco_total: 180000, preco_unitario: 180000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c3[2], codigo: '03.03', descricao: 'Tratamento anticorrosivo e pintura', preco_total: 100000, preco_unitario: 100000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    { id: demoId(), company_id: companyId, categoria_id: c3[3], codigo: '04.01', descricao: 'Telhas termoacústicas', preco_total: 120000, preco_unitario: 120, quantidade: 1000, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 60 },
    { id: demoId(), company_id: companyId, categoria_id: c3[3], codigo: '04.02', descricao: 'Calhas, rufos e lanternins', preco_total: 60000, preco_unitario: 60000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 40 },

    { id: demoId(), company_id: companyId, categoria_id: c3[4], codigo: '05.01', descricao: 'Base e preparação do piso', preco_total: 70000, preco_unitario: 35, quantidade: 2000, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c3[4], codigo: '05.02', descricao: 'Concretagem piso industrial', preco_total: 100000, preco_unitario: 50, quantidade: 2000, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c3[4], codigo: '05.03', descricao: 'Corte, selagem e acabamento', preco_total: 40000, preco_unitario: 20, quantidade: 2000, unidade: 'm²', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    { id: demoId(), company_id: companyId, categoria_id: c3[5], codigo: '06.01', descricao: 'Infraestrutura eletrocalhas', preco_total: 68000, preco_unitario: 68000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c3[5], codigo: '06.02', descricao: 'Painéis, quadros e alimentação', preco_total: 72000, preco_unitario: 72000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c3[5], codigo: '06.03', descricao: 'Iluminação industrial e emergência', preco_total: 38000, preco_unitario: 38000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 25 },

    { id: demoId(), company_id: companyId, categoria_id: c3[6], codigo: '07.01', descricao: 'Rede de drenagem pluvial', preco_total: 42000, preco_unitario: 42000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c3[6], codigo: '07.02', descricao: 'Rede de água e esgoto', preco_total: 36000, preco_unitario: 36000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c3[6], codigo: '07.03', descricao: 'Bombas e reservatórios', preco_total: 20000, preco_unitario: 20000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    { id: demoId(), company_id: companyId, categoria_id: c3[7], codigo: '08.01', descricao: 'Estrutura do mezanino', preco_total: 90000, preco_unitario: 90000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c3[7], codigo: '08.02', descricao: 'Drywall e divisórias escritórios', preco_total: 42000, preco_unitario: 42000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 30 },
    { id: demoId(), company_id: companyId, categoria_id: c3[7], codigo: '08.03', descricao: 'Acabamentos área administrativa', preco_total: 30000, preco_unitario: 30000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 25 },

    { id: demoId(), company_id: companyId, categoria_id: c3[8], codigo: '09.01', descricao: 'Docas niveladoras', preco_total: 55000, preco_unitario: 55000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 45 },
    { id: demoId(), company_id: companyId, categoria_id: c3[8], codigo: '09.02', descricao: 'Fechamentos laterais', preco_total: 38000, preco_unitario: 38000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c3[8], codigo: '09.03', descricao: 'Portões e complementos finais', preco_total: 25000, preco_unitario: 25000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 20 },

    // ───────────────── OBRA 4 — CASA DE PRAIA ─────────────────
    { id: demoId(), company_id: companyId, categoria_id: c4[8], codigo: '09.01', descricao: 'Limpeza fina interna', preco_total: 4000, preco_unitario: 4000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 35 },
    { id: demoId(), company_id: companyId, categoria_id: c4[8], codigo: '09.02', descricao: 'Checklist técnico e vistoria', preco_total: 5000, preco_unitario: 5000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c4[8], codigo: '09.03', descricao: 'Retoques finais e ajustes', preco_total: 3000, preco_unitario: 3000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 25 },

    { id: demoId(), company_id: companyId, categoria_id: c4[9], codigo: '10.01', descricao: 'Entrega técnica ao cliente', preco_total: 4000, preco_unitario: 4000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 40 },
    { id: demoId(), company_id: companyId, categoria_id: c4[9], codigo: '10.02', descricao: 'Manual do proprietário e garantias', preco_total: 3000, preco_unitario: 3000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 30 },
    { id: demoId(), company_id: companyId, categoria_id: c4[9], codigo: '10.03', descricao: 'Assistência inicial pós-entrega', preco_total: 3000, preco_unitario: 3000, quantidade: 1, unidade: 'vb', usa_subitens: true, concluida: false, peso_cronograma: 30 },
  ];

  await checkedInsert('orcamento_composicoes', composicoes);

// ══════════════════════ 4. ORÇAMENTO / SUBITENS ══════════════════════

  const subitens = composicoes.flatMap((comp) => {
    const base = {
      composicao_id: comp.id,
      company_id: companyId,
    };

    const d = comp.descricao.toLowerCase();

    if (d.includes('demolição')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra de demolição`, quantidade: 3, unidade: 'diária', preco_unitario: 950, preco_total: 2850 },
        { ...base, descricao: `${DEMO_PREFIX} Ferramentas e EPIs`, quantidade: 1, unidade: 'vb', preco_unitario: 1200, preco_total: 1200 },
        { ...base, descricao: `${DEMO_PREFIX} Ensacamento e segregação`, quantidade: 150, unidade: 'm²', preco_unitario: 8.5, preco_total: 1275 },
      ];
    }

    if (d.includes('remoção de pisos')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Rompedor e discos`, quantidade: 1, unidade: 'vb', preco_unitario: 900, preco_total: 900 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra remoção`, quantidade: 2, unidade: 'diária', preco_unitario: 850, preco_total: 1700 },
        { ...base, descricao: `${DEMO_PREFIX} Transporte interno`, quantidade: 1, unidade: 'vb', preco_unitario: 750, preco_total: 750 },
      ];
    }

    if (d.includes('caçambas')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Locação de caçamba 5m³`, quantidade: 10, unidade: 'un', preco_unitario: 650, preco_total: 6500 },
        { ...base, descricao: `${DEMO_PREFIX} Taxa de descarte`, quantidade: 10, unidade: 'un', preco_unitario: 120, preco_total: 1200 },
      ];
    }

    if (d.includes('eletrodutos')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Eletroduto corrugado 25mm`, quantidade: 320, unidade: 'm', preco_unitario: 4.8, preco_total: 1536 },
        { ...base, descricao: `${DEMO_PREFIX} Caixas 4x2 e 4x4`, quantidade: 180, unidade: 'un', preco_unitario: 6.5, preco_total: 1170 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra elétrica`, quantidade: 1, unidade: 'vb', preco_unitario: 4800, preco_total: 4800 },
      ];
    }

    if (d.includes('cabeamento') || d.includes('quadros')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Cabo flexível 2,5mm`, quantidade: 900, unidade: 'm', preco_unitario: 3.4, preco_total: 3060 },
        { ...base, descricao: `${DEMO_PREFIX} Cabo flexível 4mm`, quantidade: 420, unidade: 'm', preco_unitario: 5.8, preco_total: 2436 },
        { ...base, descricao: `${DEMO_PREFIX} Quadro de distribuição`, quantidade: 2, unidade: 'un', preco_unitario: 680, preco_total: 1360 },
        { ...base, descricao: `${DEMO_PREFIX} Disjuntores e DPS`, quantidade: 1, unidade: 'vb', preco_unitario: 1800, preco_total: 1800 },
      ];
    }

    if (d.includes('automação')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Central de automação`, quantidade: 1, unidade: 'un', preco_unitario: 5200, preco_total: 5200 },
        { ...base, descricao: `${DEMO_PREFIX} Módulos de iluminação`, quantidade: 8, unidade: 'un', preco_unitario: 420, preco_total: 3360 },
        { ...base, descricao: `${DEMO_PREFIX} Configuração e programação`, quantidade: 1, unidade: 'vb', preco_unitario: 2900, preco_total: 2900 },
      ];
    }

    if (d.includes('água fria') || d.includes('água quente')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Tubo PPR e conexões`, quantidade: 1, unidade: 'vb', preco_unitario: 4200, preco_total: 4200 },
        { ...base, descricao: `${DEMO_PREFIX} Registros e acessórios`, quantidade: 1, unidade: 'vb', preco_unitario: 1800, preco_total: 1800 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra hidráulica`, quantidade: 1, unidade: 'vb', preco_unitario: 3600, preco_total: 3600 },
      ];
    }

    if (d.includes('esgoto')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Tubo esgoto PVC`, quantidade: 1, unidade: 'vb', preco_unitario: 2600, preco_total: 2600 },
        { ...base, descricao: `${DEMO_PREFIX} Ralos e caixas sifonadas`, quantidade: 10, unidade: 'un', preco_unitario: 95, preco_total: 950 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra esgoto`, quantidade: 1, unidade: 'vb', preco_unitario: 2500, preco_total: 2500 },
      ];
    }

    if (d.includes('forro de gesso')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Chapas drywall`, quantidade: 180, unidade: 'm²', preco_unitario: 22, preco_total: 3960 },
        { ...base, descricao: `${DEMO_PREFIX} Perfis metálicos`, quantidade: 1, unidade: 'vb', preco_unitario: 2500, preco_total: 2500 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra instalação`, quantidade: 1, unidade: 'vb', preco_unitario: 4200, preco_total: 4200 },
      ];
    }

    if (d.includes('sancas') || d.includes('tabicas') || d.includes('cortineiros')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Perfis e acessórios gesso`, quantidade: 1, unidade: 'vb', preco_unitario: 2100, preco_total: 2100 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra especializada`, quantidade: 1, unidade: 'vb', preco_unitario: 3500, preco_total: 3500 },
      ];
    }

    if (d.includes('porcelanato')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Porcelanato premium`, quantidade: 100, unidade: 'm²', preco_unitario: 185, preco_total: 18500 },
        { ...base, descricao: `${DEMO_PREFIX} Argamassa ACIII`, quantidade: 80, unidade: 'saco', preco_unitario: 42, preco_total: 3360 },
        { ...base, descricao: `${DEMO_PREFIX} Espaçadores e niveladores`, quantidade: 1, unidade: 'vb', preco_unitario: 900, preco_total: 900 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra assentamento`, quantidade: 100, unidade: 'm²', preco_unitario: 48, preco_total: 4800 },
      ];
    }

    if (d.includes('mármore')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Placa de mármore`, quantidade: 30, unidade: 'm²', preco_unitario: 420, preco_total: 12600 },
        { ...base, descricao: `${DEMO_PREFIX} Corte e acabamento`, quantidade: 30, unidade: 'm²', preco_unitario: 85, preco_total: 2550 },
        { ...base, descricao: `${DEMO_PREFIX} Instalação e colagem`, quantidade: 30, unidade: 'm²', preco_unitario: 70, preco_total: 2100 },
      ];
    }

    if (d.includes('revestimento cozinha') || d.includes('revestimentos banheiros') || d.includes('revestimento')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Revestimento cerâmico`, quantidade: 60, unidade: 'm²', preco_unitario: 95, preco_total: 5700 },
        { ...base, descricao: `${DEMO_PREFIX} Argamassa e rejunte`, quantidade: 1, unidade: 'vb', preco_unitario: 1800, preco_total: 1800 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra assentamento vertical`, quantidade: 60, unidade: 'm²', preco_unitario: 55, preco_total: 3300 },
      ];
    }

    if (d.includes('rodapés')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Rodapé em poliestireno`, quantidade: 100, unidade: 'ml', preco_unitario: 32, preco_total: 3200 },
        { ...base, descricao: `${DEMO_PREFIX} Cola e acabamento`, quantidade: 1, unidade: 'vb', preco_unitario: 700, preco_total: 700 },
      ];
    }

    if (d.includes('marcenaria cozinha')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} MDF ultra premium`, quantidade: 28, unidade: 'chapa', preco_unitario: 520, preco_total: 14560 },
        { ...base, descricao: `${DEMO_PREFIX} Ferragens e corrediças`, quantidade: 1, unidade: 'vb', preco_unitario: 5600, preco_total: 5600 },
        { ...base, descricao: `${DEMO_PREFIX} Fabricação e montagem`, quantidade: 1, unidade: 'vb', preco_unitario: 12800, preco_total: 12800 },
      ];
    }

    if (d.includes('marcenaria dormitórios')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} MDF e acabamento fosco`, quantidade: 24, unidade: 'chapa', preco_unitario: 460, preco_total: 11040 },
        { ...base, descricao: `${DEMO_PREFIX} Ferragens e acessórios`, quantidade: 1, unidade: 'vb', preco_unitario: 4200, preco_total: 4200 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra fabricação`, quantidade: 1, unidade: 'vb', preco_unitario: 9800, preco_total: 9800 },
      ];
    }

    if (d.includes('painéis') || d.includes('nichos')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Painéis decorativos`, quantidade: 1, unidade: 'vb', preco_unitario: 7600, preco_total: 7600 },
        { ...base, descricao: `${DEMO_PREFIX} Montagem final`, quantidade: 1, unidade: 'vb', preco_unitario: 4200, preco_total: 4200 },
      ];
    }

    if (d.includes('massa corrida')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Massa corrida PVA`, quantidade: 20, unidade: 'lata', preco_unitario: 135, preco_total: 2700 },
        { ...base, descricao: `${DEMO_PREFIX} Lixas e acessórios`, quantidade: 1, unidade: 'vb', preco_unitario: 450, preco_total: 450 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra preparação`, quantidade: 1, unidade: 'vb', preco_unitario: 2200, preco_total: 2200 },
      ];
    }

    if (d.includes('pintura interna') || d.includes('pintura')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Tinta premium`, quantidade: 18, unidade: 'lata', preco_unitario: 320, preco_total: 5760 },
        { ...base, descricao: `${DEMO_PREFIX} Selador e fundos`, quantidade: 1, unidade: 'vb', preco_unitario: 900, preco_total: 900 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra pintura`, quantidade: 1, unidade: 'vb', preco_unitario: 4200, preco_total: 4200 },
      ];
    }

    if (d.includes('louças')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Bacias sanitárias premium`, quantidade: 4, unidade: 'un', preco_unitario: 1250, preco_total: 5000 },
        { ...base, descricao: `${DEMO_PREFIX} Cubas e acessórios`, quantidade: 4, unidade: 'un', preco_unitario: 620, preco_total: 2480 },
      ];
    }

    if (d.includes('metais')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Misturadores e duchas`, quantidade: 6, unidade: 'un', preco_unitario: 980, preco_total: 5880 },
        { ...base, descricao: `${DEMO_PREFIX} Torneiras e acabamentos`, quantidade: 5, unidade: 'un', preco_unitario: 720, preco_total: 3600 },
      ];
    }

    if (d.includes('luminárias')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Luminárias decorativas`, quantidade: 1, unidade: 'vb', preco_unitario: 6500, preco_total: 6500 },
        { ...base, descricao: `${DEMO_PREFIX} Instalação e testes`, quantidade: 1, unidade: 'vb', preco_unitario: 1800, preco_total: 1800 },
      ];
    }

    if (d.includes('limpeza')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Limpeza fina pós-obra`, quantidade: 1, unidade: 'vb', preco_unitario: 2800, preco_total: 2800 },
        { ...base, descricao: `${DEMO_PREFIX} Produtos e descartáveis`, quantidade: 1, unidade: 'vb', preco_unitario: 600, preco_total: 600 },
      ];
    }

    if (d.includes('terreno') || d.includes('preparo do terreno')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Patrolamento e limpeza`, quantidade: 1, unidade: 'vb', preco_unitario: 5200, preco_total: 5200 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra apoio`, quantidade: 1, unidade: 'vb', preco_unitario: 2800, preco_total: 2800 },
      ];
    }

    if (d.includes('tapume') || d.includes('barracão')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Chapas e estrutura do tapume`, quantidade: 100, unidade: 'm', preco_unitario: 95, preco_total: 9500 },
        { ...base, descricao: `${DEMO_PREFIX} Barracão e instalações provisórias`, quantidade: 1, unidade: 'vb', preco_unitario: 6500, preco_total: 6500 },
      ];
    }

    if (d.includes('locação') || d.includes('gabarito')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Equipamentos topográficos`, quantidade: 1, unidade: 'vb', preco_unitario: 1800, preco_total: 1800 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra locação`, quantidade: 1, unidade: 'vb', preco_unitario: 2200, preco_total: 2200 },
      ];
    }

    if (d.includes('escavação')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Escavadeira e operador`, quantidade: 3, unidade: 'diária', preco_unitario: 2800, preco_total: 8400 },
        { ...base, descricao: `${DEMO_PREFIX} Transporte interno de solo`, quantidade: 1, unidade: 'vb', preco_unitario: 3800, preco_total: 3800 },
      ];
    }

    if (d.includes('sapatas') || d.includes('baldrame') || d.includes('blocos')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Concreto usinado`, quantidade: 60, unidade: 'm³', preco_unitario: 460, preco_total: 27600 },
        { ...base, descricao: `${DEMO_PREFIX} Aço CA-50`, quantidade: 3200, unidade: 'kg', preco_unitario: 6.9, preco_total: 22080 },
        { ...base, descricao: `${DEMO_PREFIX} Fôrmas e carpintaria`, quantidade: 1, unidade: 'vb', preco_unitario: 6200, preco_total: 6200 },
      ];
    }

    if (d.includes('impermeabilização')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Primer e manta asfáltica`, quantidade: 200, unidade: 'm²', preco_unitario: 38, preco_total: 7600 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra impermeabilização`, quantidade: 1, unidade: 'vb', preco_unitario: 2800, preco_total: 2800 },
      ];
    }

    if (d.includes('pilares')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Aço para pilares`, quantidade: 3800, unidade: 'kg', preco_unitario: 6.8, preco_total: 25840 },
        { ...base, descricao: `${DEMO_PREFIX} Concreto usinado`, quantidade: 32, unidade: 'm³', preco_unitario: 470, preco_total: 15040 },
        { ...base, descricao: `${DEMO_PREFIX} Fôrmas e escoramento`, quantidade: 1, unidade: 'vb', preco_unitario: 6400, preco_total: 6400 },
      ];
    }

    if (d.includes('vigas') || d.includes('laje')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Aço armado`, quantidade: 4200, unidade: 'kg', preco_unitario: 6.9, preco_total: 28980 },
        { ...base, descricao: `${DEMO_PREFIX} Concreto bombeado`, quantidade: 45, unidade: 'm³', preco_unitario: 480, preco_total: 21600 },
        { ...base, descricao: `${DEMO_PREFIX} Escoramento e fôrmas`, quantidade: 1, unidade: 'vb', preco_unitario: 8200, preco_total: 8200 },
      ];
    }

    if (d.includes('alvenaria')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Bloco cerâmico`, quantidade: 4500, unidade: 'un', preco_unitario: 1.9, preco_total: 8550 },
        { ...base, descricao: `${DEMO_PREFIX} Argamassa de assentamento`, quantidade: 80, unidade: 'saco', preco_unitario: 28, preco_total: 2240 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra alvenaria`, quantidade: 1, unidade: 'vb', preco_unitario: 9200, preco_total: 9200 },
      ];
    }

    if (d.includes('cobertura') || d.includes('telhado') || d.includes('telhas')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Estrutura da cobertura`, quantidade: 1, unidade: 'vb', preco_unitario: 12000, preco_total: 12000 },
        { ...base, descricao: `${DEMO_PREFIX} Telhas e acessórios`, quantidade: 150, unidade: 'm²', preco_unitario: 92, preco_total: 13800 },
        { ...base, descricao: `${DEMO_PREFIX} Instalação`, quantidade: 1, unidade: 'vb', preco_unitario: 6800, preco_total: 6800 },
      ];
    }

    if (d.includes('esquadrias') || d.includes('portas')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Esquadrias de alumínio`, quantidade: 1, unidade: 'vb', preco_unitario: 14000, preco_total: 14000 },
        { ...base, descricao: `${DEMO_PREFIX} Ferragens e acessórios`, quantidade: 1, unidade: 'vb', preco_unitario: 3200, preco_total: 3200 },
      ];
    }

    if (d.includes('bancadas') || d.includes('soleiras')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Pedra natural`, quantidade: 1, unidade: 'vb', preco_unitario: 12000, preco_total: 12000 },
        { ...base, descricao: `${DEMO_PREFIX} Corte e instalação`, quantidade: 1, unidade: 'vb', preco_unitario: 4200, preco_total: 4200 },
      ];
    }

    if (d.includes('piscina')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Estrutura da piscina`, quantidade: 1, unidade: 'vb', preco_unitario: 26000, preco_total: 26000 },
        { ...base, descricao: `${DEMO_PREFIX} Revestimento e acabamento`, quantidade: 1, unidade: 'vb', preco_unitario: 14000, preco_total: 14000 },
        { ...base, descricao: `${DEMO_PREFIX} Casa de máquinas e equipamentos`, quantidade: 1, unidade: 'vb', preco_unitario: 8500, preco_total: 8500 },
      ];
    }

    if (d.includes('paisagismo') || d.includes('pavimentação externa')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Grama, plantas e insumos`, quantidade: 1, unidade: 'vb', preco_unitario: 6200, preco_total: 6200 },
        { ...base, descricao: `${DEMO_PREFIX} Piso drenante / intertravado`, quantidade: 1, unidade: 'vb', preco_unitario: 7400, preco_total: 7400 },
        { ...base, descricao: `${DEMO_PREFIX} Mão de obra externa`, quantidade: 1, unidade: 'vb', preco_unitario: 3800, preco_total: 3800 },
      ];
    }

    if (d.includes('corte e aterro')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Escavadeira e caminhões`, quantidade: 1, unidade: 'vb', preco_unitario: 42000, preco_total: 42000 },
        { ...base, descricao: `${DEMO_PREFIX} Operação e combustível`, quantidade: 1, unidade: 'vb', preco_unitario: 18000, preco_total: 18000 },
      ];
    }

    if (d.includes('compactação')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Rolo compactador`, quantidade: 1, unidade: 'vb', preco_unitario: 12000, preco_total: 12000 },
        { ...base, descricao: `${DEMO_PREFIX} Equipe de apoio`, quantidade: 1, unidade: 'vb', preco_unitario: 8000, preco_total: 8000 },
      ];
    }

    if (d.includes('estacas')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Perfuração hélice contínua`, quantidade: 833, unidade: 'm', preco_unitario: 140, preco_total: 116620 },
        { ...base, descricao: `${DEMO_PREFIX} Concreto estacas`, quantidade: 120, unidade: 'm³', preco_unitario: 460, preco_total: 55200 },
        { ...base, descricao: `${DEMO_PREFIX} Aço e arranque`, quantidade: 1, unidade: 'vb', preco_unitario: 18000, preco_total: 18000 },
      ];
    }

    if (d.includes('fabricação estrutura metálica') || d.includes('estrutura metálica')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Aço estrutural`, quantidade: 1, unidade: 'vb', preco_unitario: 180000, preco_total: 180000 },
        { ...base, descricao: `${DEMO_PREFIX} Solda e fabricação`, quantidade: 1, unidade: 'vb', preco_unitario: 52000, preco_total: 52000 },
        { ...base, descricao: `${DEMO_PREFIX} Transporte e mobilização`, quantidade: 1, unidade: 'vb', preco_unitario: 18000, preco_total: 18000 },
      ];
    }

    if (d.includes('montagem de pilares e vigas')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Equipe de montagem`, quantidade: 1, unidade: 'vb', preco_unitario: 68000, preco_total: 68000 },
        { ...base, descricao: `${DEMO_PREFIX} Guindaste e apoio`, quantidade: 1, unidade: 'vb', preco_unitario: 42000, preco_total: 42000 },
      ];
    }

    if (d.includes('tratamento anticorrosivo')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Fundo anticorrosivo`, quantidade: 1, unidade: 'vb', preco_unitario: 18000, preco_total: 18000 },
        { ...base, descricao: `${DEMO_PREFIX} Pintura industrial`, quantidade: 1, unidade: 'vb', preco_unitario: 22000, preco_total: 22000 },
      ];
    }

    if (d.includes('termoacústicas') || d.includes('telhas')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Telha termoacústica`, quantidade: 1000, unidade: 'm²', preco_unitario: 74, preco_total: 74000 },
        { ...base, descricao: `${DEMO_PREFIX} Fixadores e acessórios`, quantidade: 1, unidade: 'vb', preco_unitario: 9000, preco_total: 9000 },
      ];
    }

    if (d.includes('calhas') || d.includes('rufos') || d.includes('lanternins')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Calhas e rufos galvanizados`, quantidade: 1, unidade: 'vb', preco_unitario: 18000, preco_total: 18000 },
        { ...base, descricao: `${DEMO_PREFIX} Lanternins e exaustão`, quantidade: 1, unidade: 'vb', preco_unitario: 12000, preco_total: 12000 },
      ];
    }

    if (d.includes('piso industrial')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Preparação da base`, quantidade: 2000, unidade: 'm²', preco_unitario: 14, preco_total: 28000 },
        { ...base, descricao: `${DEMO_PREFIX} Concreto do piso`, quantidade: 2000, unidade: 'm²', preco_unitario: 26, preco_total: 52000 },
        { ...base, descricao: `${DEMO_PREFIX} Endurecedor e corte`, quantidade: 2000, unidade: 'm²', preco_unitario: 11, preco_total: 22000 },
      ];
    }

    if (d.includes('eletrocalhas') || d.includes('painéis') || d.includes('iluminação industrial')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Eletrocalhas e suportes`, quantidade: 1, unidade: 'vb', preco_unitario: 26000, preco_total: 26000 },
        { ...base, descricao: `${DEMO_PREFIX} Quadros, cabos e disjuntores`, quantidade: 1, unidade: 'vb', preco_unitario: 36000, preco_total: 36000 },
        { ...base, descricao: `${DEMO_PREFIX} Luminárias high-bay`, quantidade: 1, unidade: 'vb', preco_unitario: 18000, preco_total: 18000 },
      ];
    }

    if (d.includes('drenagem') || d.includes('água e esgoto') || d.includes('bombas')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Tubulações e conexões`, quantidade: 1, unidade: 'vb', preco_unitario: 22000, preco_total: 22000 },
        { ...base, descricao: `${DEMO_PREFIX} Bombas e reservatórios`, quantidade: 1, unidade: 'vb', preco_unitario: 16000, preco_total: 16000 },
      ];
    }

    if (d.includes('mezanino')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Estrutura metálica mezanino`, quantidade: 1, unidade: 'vb', preco_unitario: 42000, preco_total: 42000 },
        { ...base, descricao: `${DEMO_PREFIX} Piso steel deck / complementar`, quantidade: 1, unidade: 'vb', preco_unitario: 26000, preco_total: 26000 },
      ];
    }

    if (d.includes('drywall') || d.includes('divisórias')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Chapas drywall`, quantidade: 1, unidade: 'vb', preco_unitario: 18000, preco_total: 18000 },
        { ...base, descricao: `${DEMO_PREFIX} Perfis e acabamento`, quantidade: 1, unidade: 'vb', preco_unitario: 9000, preco_total: 9000 },
      ];
    }

    if (d.includes('docas')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Niveladoras e ferragens`, quantidade: 1, unidade: 'vb', preco_unitario: 32000, preco_total: 32000 },
        { ...base, descricao: `${DEMO_PREFIX} Instalação e testes`, quantidade: 1, unidade: 'vb', preco_unitario: 12000, preco_total: 12000 },
      ];
    }

    if (d.includes('checklist') || d.includes('vistoria')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Checklist técnico`, quantidade: 1, unidade: 'vb', preco_unitario: 1800, preco_total: 1800 },
        { ...base, descricao: `${DEMO_PREFIX} Vistoria final`, quantidade: 1, unidade: 'vb', preco_unitario: 2200, preco_total: 2200 },
      ];
    }

    if (d.includes('manual do proprietário') || d.includes('garantias')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Organização documental`, quantidade: 1, unidade: 'vb', preco_unitario: 1400, preco_total: 1400 },
        { ...base, descricao: `${DEMO_PREFIX} Manual e garantias`, quantidade: 1, unidade: 'vb', preco_unitario: 1600, preco_total: 1600 },
      ];
    }

    if (d.includes('assistência')) {
      return [
        { ...base, descricao: `${DEMO_PREFIX} Reserva técnica pós-entrega`, quantidade: 1, unidade: 'vb', preco_unitario: 1800, preco_total: 1800 },
        { ...base, descricao: `${DEMO_PREFIX} Atendimento inicial`, quantidade: 1, unidade: 'vb', preco_unitario: 1200, preco_total: 1200 },
      ];
    }

    // fallback genérico para qualquer composição sem regra específica
    return [
      {
        ...base,
        descricao: `${DEMO_PREFIX} Insumos gerais - ${comp.descricao}`,
        quantidade: 1,
        unidade: 'vb',
        preco_unitario: Math.round((Number(comp.preco_total || 0) || 1000) * 0.45),
        preco_total: Math.round((Number(comp.preco_total || 0) || 1000) * 0.45),
      },
      {
        ...base,
        descricao: `${DEMO_PREFIX} Mão de obra - ${comp.descricao}`,
        quantidade: 1,
        unidade: 'vb',
        preco_unitario: Math.round((Number(comp.preco_total || 0) || 1000) * 0.35),
        preco_total: Math.round((Number(comp.preco_total || 0) || 1000) * 0.35),
      },
    ];
  });

  await checkedInsert('orcamento_subitens', subitens);

// ══════════════════════ 5. CUSTO REAL / MATERIAIS / MOVIMENTAÇÕES ══════════════════════

  const custoItens = [
    // ───────────────── OBRA 1 — REFORMA APTO ─────────────────
    { obra_id: obra1Id, company_id: companyId, categoria: 'Demolição e Remoção', descricao: `${DEMO_PREFIX} Demolição completa do layout`, fornecedor: 'Demoli Express', valor: 8200, data: daysAgo(70) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Demolição e Remoção', descricao: `${DEMO_PREFIX} Caçambas e descarte`, fornecedor: 'Caçambas SP', valor: 7800, data: daysAgo(64) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Infraestrutura Elétrica', descricao: `${DEMO_PREFIX} Material elétrico completo`, fornecedor: 'Eletro House', valor: 16200, data: daysAgo(50) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Infraestrutura Elétrica', descricao: `${DEMO_PREFIX} Mão de obra elétrica`, fornecedor: 'Eletricista Renato', valor: 12800, data: daysAgo(41) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Infraestrutura Hidráulica', descricao: `${DEMO_PREFIX} Tubos e conexões PPR`, fornecedor: 'Hidro Center', valor: 8900, data: daysAgo(47) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Gesso e Forros', descricao: `${DEMO_PREFIX} Forro e sancas`, fornecedor: 'Gesso Premium', valor: 19800, data: daysAgo(18) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Revestimentos e Pisos', descricao: `${DEMO_PREFIX} Porcelanato premium 80x80`, fornecedor: 'Portobello Shop SP', valor: 32500, data: daysAgo(10) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Revestimentos e Pisos', descricao: `${DEMO_PREFIX} Mão de obra assentamento`, fornecedor: 'Marmorista Antônio', valor: 9200, data: daysAgo(5) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Marcenaria Sob Medida', descricao: `${DEMO_PREFIX} Sinal marcenaria cozinha`, fornecedor: 'Marcenaria Design', valor: 18000, data: daysAgo(3) },

    // ───────────────── OBRA 2 — RESIDÊNCIA ─────────────────
    { obra_id: obra2Id, company_id: companyId, categoria: 'Serviços Preliminares', descricao: `${DEMO_PREFIX} Limpeza e preparo terreno`, fornecedor: 'Terraplanagem Martins', valor: 14800, data: daysAgo(115) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Serviços Preliminares', descricao: `${DEMO_PREFIX} Tapume e barracão`, fornecedor: 'Canteiro Rápido', valor: 19500, data: daysAgo(109) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Escavação mecânica`, fornecedor: 'Terraplanagem Martins', valor: 31000, data: daysAgo(95) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Concreto fundação`, fornecedor: 'Engemix', valor: 56000, data: daysAgo(80) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Impermeabilização baldrame`, fornecedor: 'Vedacit Distribuidor', valor: 17000, data: daysAgo(69) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Aço CA-50`, fornecedor: 'Gerdau Distribuidor', valor: 43000, data: daysAgo(54) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Concreto pilares e vigas`, fornecedor: 'Engemix', valor: 49000, data: daysAgo(39) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Madeira para fôrmas`, fornecedor: 'Madeireira São José', valor: 18200, data: daysAgo(49) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Alvenaria e Vedação', descricao: `${DEMO_PREFIX} Blocos cerâmicos`, fornecedor: 'Cerâmica Barueri', valor: 12500, data: daysAgo(14) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Alvenaria e Vedação', descricao: `${DEMO_PREFIX} Argamassa assentamento`, fornecedor: 'DepMat Barueri', valor: 4200, data: daysAgo(11) },

    // ───────────────── OBRA 3 — GALPÃO ─────────────────
    { obra_id: obra3Id, company_id: companyId, categoria: 'Terraplenagem', descricao: `${DEMO_PREFIX} Corte e aterro mecanizado`, fornecedor: 'MoviTerra Ltda', valor: 86000, data: daysAgo(50) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Terraplenagem', descricao: `${DEMO_PREFIX} Compactação solo`, fornecedor: 'MoviTerra Ltda', valor: 39500, data: daysAgo(34) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Fundação Profunda', descricao: `${DEMO_PREFIX} Mobilização perfuratriz`, fornecedor: 'Estacas Brasil', valor: 46000, data: daysAgo(24) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Fundação Profunda', descricao: `${DEMO_PREFIX} Estacas hélice - etapa 1`, fornecedor: 'Estacas Brasil', valor: 98000, data: daysAgo(15) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Fundação Profunda', descricao: `${DEMO_PREFIX} Arrasamento e blocos iniciais`, fornecedor: 'Estacas Brasil', valor: 32000, data: daysAgo(6) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Estrutura Metálica', descricao: `${DEMO_PREFIX} Projeto executivo estrutura`, fornecedor: 'Calc Steel Eng.', valor: 38000, data: daysAgo(42) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Estrutura Metálica', descricao: `${DEMO_PREFIX} Sinal fabricação estrutura`, fornecedor: 'SteelBuild', valor: 65000, data: daysAgo(3) },

    // ───────────────── OBRA 4 — CASA DE PRAIA ─────────────────
    { obra_id: obra4Id, company_id: companyId, categoria: 'Serviços Preliminares', descricao: `${DEMO_PREFIX} Canteiro e limpeza`, fornecedor: 'Construtora Litoral', valor: 30500, data: daysAgo(235) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Fundação completa`, fornecedor: 'Construtora Litoral', valor: 83500, data: daysAgo(195) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Estrutura concreto armado`, fornecedor: 'Concretal Bertioga', valor: 132000, data: daysAgo(150) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Instalações', descricao: `${DEMO_PREFIX} Elétrica e hidráulica`, fornecedor: 'Multi Instalações', valor: 73000, data: daysAgo(64) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Revestimentos e Pisos', descricao: `${DEMO_PREFIX} Porcelanatos e revestimentos`, fornecedor: 'Cerâmica Riviera', valor: 89500, data: daysAgo(34) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Pintura', descricao: `${DEMO_PREFIX} Pintura interna e externa`, fornecedor: 'Pinturas Costa', valor: 34500, data: daysAgo(12) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Piscina e Área Externa', descricao: `${DEMO_PREFIX} Equipamentos da piscina`, fornecedor: 'Piscinas Premium', valor: 18500, data: daysAgo(18) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Piscina e Área Externa', descricao: `${DEMO_PREFIX} Paisagismo final`, fornecedor: 'Verde Jardins', valor: 12000, data: daysAgo(7) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Limpeza Final e Vistoria', descricao: `${DEMO_PREFIX} Limpeza fina e checklist`, fornecedor: 'Clean Obras', valor: 5200, data: daysAgo(2) },
  ];

  await checkedInsert('custo_real_itens', custoItens);

  // ───────────────── MATERIAIS ─────────────────
  const mat = Array.from({ length: 24 }, () => demoId());

  const materiais = [
    // Obra 1
    { id: mat[0], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Porcelanato premium 80x80`, unidade: 'm²', categoria: 'Acabamento', estoque_atual: 18, estoque_minimo: 10, localizacao: 'Apartamento' },
    { id: mat[1], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Mármore Carrara`, unidade: 'm²', categoria: 'Acabamento', estoque_atual: 4, estoque_minimo: 8, localizacao: 'Depósito condomínio' },
    { id: mat[2], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Argamassa ACIII`, unidade: 'saco', categoria: 'Acabamento', estoque_atual: 6, estoque_minimo: 12, localizacao: 'Apartamento' },
    { id: mat[3], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Tinta premium fosca`, unidade: 'lata 18L', categoria: 'Pintura', estoque_atual: 0, estoque_minimo: 6, localizacao: 'A comprar' },

    // Obra 2
    { id: mat[4], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, unidade: 'saco', categoria: 'Cimento', estoque_atual: 42, estoque_minimo: 60, localizacao: 'Almoxarifado' },
    { id: mat[5], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, unidade: 'barra', categoria: 'Aço', estoque_atual: 90, estoque_minimo: 50, localizacao: 'Pátio coberto' },
    { id: mat[6], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Areia média`, unidade: 'm³', categoria: 'Agregados', estoque_atual: 4, estoque_minimo: 8, localizacao: 'Pátio' },
    { id: mat[7], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Brita 1`, unidade: 'm³', categoria: 'Agregados', estoque_atual: 3, estoque_minimo: 6, localizacao: 'Pátio' },
    { id: mat[8], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Bloco cerâmico 14x19x39`, unidade: 'un', categoria: 'Alvenaria', estoque_atual: 3600, estoque_minimo: 1200, localizacao: 'Pátio' },
    { id: mat[9], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Madeira para fôrma`, unidade: 'm²', categoria: 'Madeira', estoque_atual: 32, estoque_minimo: 20, localizacao: 'Galpão' },
    { id: mat[10], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Arame recozido`, unidade: 'kg', categoria: 'Ferragens', estoque_atual: 6, estoque_minimo: 15, localizacao: 'Almoxarifado' },
    { id: mat[11], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Prego 18x27`, unidade: 'kg', categoria: 'Ferragens', estoque_atual: 8, estoque_minimo: 5, localizacao: 'Almoxarifado' },

    // Obra 3
    { id: mat[12], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Aço estrutural galvanizado`, unidade: 'kg', categoria: 'Estrutura Metálica', estoque_atual: 0, estoque_minimo: 0, localizacao: 'Sob encomenda' },
    { id: mat[13], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Concreto fck 30`, unidade: 'm³', categoria: 'Concreto', estoque_atual: 0, estoque_minimo: 0, localizacao: 'Sob demanda' },
    { id: mat[14], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Aço CA-50 16mm`, unidade: 'barra', categoria: 'Aço', estoque_atual: 130, estoque_minimo: 80, localizacao: 'Pátio' },
    { id: mat[15], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Brita graduada`, unidade: 'm³', categoria: 'Agregados', estoque_atual: 18, estoque_minimo: 30, localizacao: 'Terreno' },
    { id: mat[16], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Eletrocalha galvanizada`, unidade: 'm', categoria: 'Elétrica', estoque_atual: 40, estoque_minimo: 20, localizacao: 'Contêiner' },

    // Obra 4
    { id: mat[17], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Tinta acrílica branca`, unidade: 'lata', categoria: 'Pintura', estoque_atual: 3, estoque_minimo: 0, localizacao: 'Garagem' },
    { id: mat[18], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Rejunte flexível branco`, unidade: 'saco 5kg', categoria: 'Acabamento', estoque_atual: 4, estoque_minimo: 2, localizacao: 'Garagem' },
    { id: mat[19], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Silicone transparente`, unidade: 'tubo', categoria: 'Acabamento', estoque_atual: 6, estoque_minimo: 3, localizacao: 'Garagem' },
    { id: mat[20], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Pedra hijau piscina`, unidade: 'm²', categoria: 'Piscina', estoque_atual: 5, estoque_minimo: 0, localizacao: 'Área externa' },
    { id: mat[21], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Grama esmeralda`, unidade: 'm²', categoria: 'Paisagismo', estoque_atual: 20, estoque_minimo: 0, localizacao: 'Jardim' },
    { id: mat[22], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Kit limpeza pós-obra`, unidade: 'kit', categoria: 'Entrega', estoque_atual: 2, estoque_minimo: 1, localizacao: 'Depósito' },
    { id: mat[23], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Lâmpadas LED decorativas`, unidade: 'un', categoria: 'Elétrica', estoque_atual: 12, estoque_minimo: 0, localizacao: 'Sala técnica' },
  ];

  await checkedInsert('materiais', materiais);
      
  // ───────────────── MOVIMENTAÇÕES ─────────────────
  const movimentacoes = [
    // Obra 1
    { obra_id: obra1Id, company_id: companyId, material_id: mat[0], material_nome: `${DEMO_PREFIX} Porcelanato premium 80x80`, quantidade: 110, tipo: 'entrada' as const, data: daysAgo(12), responsavel: 'Camila Duarte', origem_destino: 'Portobello Shop SP' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[0], material_nome: `${DEMO_PREFIX} Porcelanato premium 80x80`, quantidade: 92, tipo: 'saida' as const, data: daysAgo(5), responsavel: 'Antônio', origem_destino: 'Sala e corredor' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[2], material_nome: `${DEMO_PREFIX} Argamassa ACIII`, quantidade: 80, tipo: 'entrada' as const, data: daysAgo(11), responsavel: 'Camila Duarte', origem_destino: 'DepMat Premium' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[2], material_nome: `${DEMO_PREFIX} Argamassa ACIII`, quantidade: 74, tipo: 'saida' as const, data: daysAgo(4), responsavel: 'Antônio', origem_destino: 'Assentamento pisos' },

    // Obra 2
    { obra_id: obra2Id, company_id: companyId, material_id: mat[4], material_nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, quantidade: 120, tipo: 'entrada' as const, data: daysAgo(30), responsavel: 'Paulo Roberto', origem_destino: 'DepMat Barueri' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[4], material_nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, quantidade: 78, tipo: 'saida' as const, data: daysAgo(14), responsavel: 'Pedro', origem_destino: 'Alvenaria e grauteamento' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[5], material_nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, quantidade: 220, tipo: 'entrada' as const, data: daysAgo(55), responsavel: 'Paulo Roberto', origem_destino: 'Gerdau' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[5], material_nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, quantidade: 128, tipo: 'saida' as const, data: daysAgo(24), responsavel: 'José Armador', origem_destino: 'Pilares e vigas' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[8], material_nome: `${DEMO_PREFIX} Bloco cerâmico 14x19x39`, quantidade: 5000, tipo: 'entrada' as const, data: daysAgo(16), responsavel: 'Paulo Roberto', origem_destino: 'Cerâmica Barueri' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[8], material_nome: `${DEMO_PREFIX} Bloco cerâmico 14x19x39`, quantidade: 1400, tipo: 'saida' as const, data: daysAgo(2), responsavel: 'Equipe de alvenaria', origem_destino: 'Térreo e fachada lateral' },

    // Obra 3
    { obra_id: obra3Id, company_id: companyId, material_id: mat[14], material_nome: `${DEMO_PREFIX} Aço CA-50 16mm`, quantidade: 200, tipo: 'entrada' as const, data: daysAgo(20), responsavel: 'Marcos Teixeira', origem_destino: 'Gerdau Industrial' },
    { obra_id: obra3Id, company_id: companyId, material_id: mat[14], material_nome: `${DEMO_PREFIX} Aço CA-50 16mm`, quantidade: 86, tipo: 'saida' as const, data: daysAgo(9), responsavel: 'Carlos', origem_destino: 'Armação blocos fundação' },
    { obra_id: obra3Id, company_id: companyId, material_id: mat[15], material_nome: `${DEMO_PREFIX} Brita graduada`, quantidade: 40, tipo: 'entrada' as const, data: daysAgo(35), responsavel: 'Marcos Teixeira', origem_destino: 'Pedreira Jundiaí' },
    { obra_id: obra3Id, company_id: companyId, material_id: mat[15], material_nome: `${DEMO_PREFIX} Brita graduada`, quantidade: 22, tipo: 'saida' as const, data: daysAgo(7), responsavel: 'Equipe fundação', origem_destino: 'Base e blocos' },
    { obra_id: obra3Id, company_id: companyId, material_id: mat[16], material_nome: `${DEMO_PREFIX} Eletrocalha galvanizada`, quantidade: 60, tipo: 'entrada' as const, data: daysAgo(4), responsavel: 'Marcos Teixeira', origem_destino: 'Elétrica Industrial BR' },

    // Obra 4
    { obra_id: obra4Id, company_id: companyId, material_id: mat[17], material_nome: `${DEMO_PREFIX} Tinta acrílica branca`, quantidade: 8, tipo: 'entrada' as const, data: daysAgo(15), responsavel: 'Roberto Campos', origem_destino: 'Tintas Costa' },
    { obra_id: obra4Id, company_id: companyId, material_id: mat[17], material_nome: `${DEMO_PREFIX} Tinta acrílica branca`, quantidade: 5, tipo: 'saida' as const, data: daysAgo(10), responsavel: 'Equipe pintura', origem_destino: 'Ambientes internos' },
    { obra_id: obra4Id, company_id: companyId, material_id: mat[21], material_nome: `${DEMO_PREFIX} Grama esmeralda`, quantidade: 80, tipo: 'entrada' as const, data: daysAgo(6), responsavel: 'Roberto Campos', origem_destino: 'Verde Jardins' },
    { obra_id: obra4Id, company_id: companyId, material_id: mat[21], material_nome: `${DEMO_PREFIX} Grama esmeralda`, quantidade: 60, tipo: 'saida' as const, data: daysAgo(3), responsavel: 'Equipe paisagismo', origem_destino: 'Jardim frontal e lateral' },
  ];

  await checkedInsert('movimentacoes', movimentacoes);

// ══════════════════════ 6. DIÁRIO DE OBRA ══════════════════════

  const diarios = [
    // ───────────────── OBRA 1 — REFORMA APTO ─────────────────
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(9),
      clima: 'sol' as const,
      trabalhadores: 6,
      servicos_executados: `${DEMO_PREFIX} Conclusão do forro de gesso na sala e início das sancas iluminadas.`,
      problemas: null,
      observacoes: 'Cliente visitou a obra e aprovou o acabamento do gesso.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(8),
      clima: 'sol' as const,
      trabalhadores: 7,
      servicos_executados: `${DEMO_PREFIX} Finalização das sancas nos dormitórios e testes dos pontos elétricos.`,
      problemas: null,
      observacoes: 'Todos os circuitos testados sem anomalias.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(7),
      clima: 'nublado' as const,
      trabalhadores: 5,
      servicos_executados: `${DEMO_PREFIX} Recebimento de porcelanato e preparação do contrapiso da área social.`,
      problemas: null,
      observacoes: 'Material conferido com pedido e armazenado no local.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(6),
      clima: 'sol' as const,
      trabalhadores: 4,
      servicos_executados: `${DEMO_PREFIX} Início do assentamento do porcelanato da sala de estar.`,
      problemas: null,
      observacoes: 'Equipe reduzida, mas com bom rendimento.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(5),
      clima: 'sol' as const,
      trabalhadores: 4,
      servicos_executados: `${DEMO_PREFIX} Continuação do assentamento na área social e corredor.`,
      problemas: 'Estoque de argamassa abaixo do ideal.',
      observacoes: 'Solicitada reposição com urgência.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(4),
      clima: 'chuva' as const,
      trabalhadores: 4,
      servicos_executados: `${DEMO_PREFIX} Assentamento do porcelanato na cozinha e conclusão do corredor.`,
      problemas: null,
      observacoes: 'Trabalho interno manteve produtividade mesmo com chuva.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(3),
      clima: 'sol' as const,
      trabalhadores: 3,
      servicos_executados: `${DEMO_PREFIX} Medição final da marcenaria da cozinha e dormitórios.`,
      problemas: 'Diferença de 2 cm no nicho do forno embutido.',
      observacoes: 'Marceneiro orientado a ajustar o projeto executivo.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(2),
      clima: 'sol' as const,
      trabalhadores: 2,
      servicos_executados: `${DEMO_PREFIX} Rejuntamento da área social e preparação do banheiro master para mármore.`,
      problemas: null,
      observacoes: null,
      status: 'aprovado' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(1),
      clima: 'nublado' as const,
      trabalhadores: 3,
      servicos_executados: `${DEMO_PREFIX} Início do assentamento do mármore no banheiro suíte master.`,
      problemas: 'Material de mármore insuficiente para finalizar a bancada.',
      observacoes: 'Solicitada reposição à marmoraria.',
      status: 'pendente' as const,
    },
    {
      obra_id: obra1Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(0),
      clima: 'sol' as const,
      trabalhadores: 3,
      servicos_executados: `${DEMO_PREFIX} Continuação da instalação do mármore e conferência de ralos lineares.`,
      problemas: null,
      observacoes: 'Aguardando confirmação do cliente para escolha final dos metais.',
      status: 'pendente' as const,
    },

    // ───────────────── OBRA 2 — RESIDÊNCIA ─────────────────
    {
      obra_id: obra2Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(7),
      clima: 'sol' as const,
      trabalhadores: 12,
      servicos_executados: `${DEMO_PREFIX} Concretagem da laje do térreo com 45m³ de concreto bombeado.`,
      problemas: null,
      observacoes: 'Excelente produtividade. Concreto chegou dentro da janela planejada.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra2Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(6),
      clima: 'sol' as const,
      trabalhadores: 8,
      servicos_executados: `${DEMO_PREFIX} Cura da laje, desforma parcial e conferência de níveis.`,
      problemas: null,
      observacoes: 'Sem patologias visíveis.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra2Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(5),
      clima: 'nublado' as const,
      trabalhadores: 10,
      servicos_executados: `${DEMO_PREFIX} Corte e dobra de aço para vigas do pavimento superior.`,
      problemas: null,
      observacoes: 'Estoque de arame recozido baixo.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra2Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(4),
      clima: 'chuva' as const,
      trabalhadores: 5,
      servicos_executados: `${DEMO_PREFIX} Atividades internas e conferência de projeto estrutural.`,
      problemas: 'Chuva forte interrompeu parte dos serviços externos.',
      observacoes: 'Equipe realocada para corte de aço e organização do canteiro.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra2Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(3),
      clima: 'sol' as const,
      trabalhadores: 11,
      servicos_executados: `${DEMO_PREFIX} Montagem de fôrmas das vigas e início da alvenaria da fachada lateral.`,
      problemas: null,
      observacoes: 'Blocos recebidos e conferidos.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra2Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(2),
      clima: 'sol' as const,
      trabalhadores: 11,
      servicos_executados: `${DEMO_PREFIX} Continuação da alvenaria e passagem de eletrodutos nas paredes térreas.`,
      problemas: null,
      observacoes: 'Equipe elétrica acompanhou a execução.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra2Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(1),
      clima: 'sol' as const,
      trabalhadores: 10,
      servicos_executados: `${DEMO_PREFIX} Alvenaria da fachada frontal e execução de vergas/contravergas.`,
      problemas: 'Estoque de cimento abaixo do mínimo.',
      observacoes: 'Compra solicitada para não comprometer a próxima concretagem.',
      status: 'pendente' as const,
    },
    {
      obra_id: obra2Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(0),
      clima: 'nublado' as const,
      trabalhadores: 9,
      servicos_executados: `${DEMO_PREFIX} Alvenaria interna e conferência de vãos de esquadrias.`,
      problemas: null,
      observacoes: 'Cliente pediu revisão de um vão da suíte master.',
      status: 'pendente' as const,
    },

    // ───────────────── OBRA 3 — GALPÃO ─────────────────
    {
      obra_id: obra3Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(4),
      clima: 'sol' as const,
      trabalhadores: 18,
      servicos_executados: `${DEMO_PREFIX} Perfuração de estacas no setor B. Execução de 12 estacas com profundidade média de 14m.`,
      problemas: null,
      observacoes: 'Produção acima da meta diária.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra3Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(3),
      clima: 'sol' as const,
      trabalhadores: 16,
      servicos_executados: `${DEMO_PREFIX} Perfuração no setor C e arrasamento das estacas do setor A.`,
      problemas: 'Presença de matacão em dois pontos.',
      observacoes: 'Geotécnico consultado para redefinição local.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra3Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(2),
      clima: 'nublado' as const,
      trabalhadores: 15,
      servicos_executados: `${DEMO_PREFIX} Conclusão da perfuração do setor C e início da armação dos blocos.`,
      problemas: null,
      observacoes: 'Logística de concreto já agendada.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra3Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(1),
      clima: 'sol' as const,
      trabalhadores: 14,
      servicos_executados: `${DEMO_PREFIX} Montagem de fôrmas dos blocos do setor A e recebimento do concreto.`,
      problemas: null,
      observacoes: 'Concreto conforme especificação técnica.',
      status: 'pendente' as const,
    },
    {
      obra_id: obra3Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(0),
      clima: 'sol' as const,
      trabalhadores: 16,
      servicos_executados: `${DEMO_PREFIX} Concretagem de 8 blocos do setor A e armação dos blocos do setor B.`,
      problemas: null,
      observacoes: 'Previsão de concluir a fundação profunda em 2 semanas.',
      status: 'pendente' as const,
    },

    // ───────────────── OBRA 4 — CASA DE PRAIA ─────────────────
    {
      obra_id: obra4Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(5),
      clima: 'sol' as const,
      trabalhadores: 6,
      servicos_executados: `${DEMO_PREFIX} Pintura final da fachada lateral e rejuntamento do deck da piscina.`,
      problemas: null,
      observacoes: 'Acabamento aprovado pelo cliente em visita rápida.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra4Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(4),
      clima: 'sol' as const,
      trabalhadores: 5,
      servicos_executados: `${DEMO_PREFIX} Instalação de louças e metais da suíte 3 e teste hidráulico geral.`,
      problemas: 'Pequeno vazamento em registro da suíte 2.',
      observacoes: 'Vazamento corrigido na mesma tarde.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra4Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(3),
      clima: 'nublado' as const,
      trabalhadores: 4,
      servicos_executados: `${DEMO_PREFIX} Limpeza grossa, retirada de entulho residual e vistoria de acabamento.`,
      problemas: 'Necessidade de retoque em três pontos de pintura interna.',
      observacoes: 'Pendências listadas para entrega.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra4Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(2),
      clima: 'sol' as const,
      trabalhadores: 4,
      servicos_executados: `${DEMO_PREFIX} Retoques de pintura, regulagem de esquadrias e teste elétrico final.`,
      problemas: null,
      observacoes: 'Todos os circuitos testados com sucesso.',
      status: 'aprovado' as const,
    },
    {
      obra_id: obra4Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(1),
      clima: 'sol' as const,
      trabalhadores: 3,
      servicos_executados: `${DEMO_PREFIX} Limpeza fina completa e preparação para vistoria do cliente.`,
      problemas: null,
      observacoes: 'Vistoria final agendada para esta semana.',
      status: 'pendente' as const,
    },
    {
      obra_id: obra4Id,
      user_id: userId,
      usuario_nome: 'Demo Gestor',
      data: daysAgo(0),
      clima: 'sol' as const,
      trabalhadores: 2,
      servicos_executados: `${DEMO_PREFIX} Finalização do paisagismo, enchimento da piscina e teste do sistema de filtragem.`,
      problemas: null,
      observacoes: 'Obra praticamente pronta para entrega.',
      status: 'pendente' as const,
    },
  ];

  await checkedInsert('diario_registros', diarios);

// ══════════════════════ 7. PAGAMENTOS ══════════════════════

  const pag = Array.from({ length: 44 }, () => demoId());

  const pagamentos = [
    // ───────────────── OBRA 1 — REFORMA APTO ─────────────────
    {
      id: pag[0],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Demolição e remoção de entulho`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 16000,
      data_vencimento: daysAgo(64),
      status: 'pago' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Demoli Express',
      data_pagamento: daysAgo(64),
      etapa_orcamento: 'Demolição e Remoção',
    },
    {
      id: pag[1],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Material elétrico completo`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 16200,
      data_vencimento: daysAgo(48),
      status: 'pago' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Eletro House',
      data_pagamento: daysAgo(48),
      etapa_orcamento: 'Infraestrutura Elétrica',
    },
    {
      id: pag[2],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Automação residencial - Parcela 1/3`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 30000,
      valor_parcela: 10000,
      data_vencimento: daysAgo(30),
      status: 'pago' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'SmartHome Automação',
      numero_parcela: 1,
      total_parcelas: 3,
      data_pagamento: daysAgo(30),
      etapa_orcamento: 'Automação e Iluminação Final',
    },
    {
      id: pag[3],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Automação residencial - Parcela 2/3`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 30000,
      valor_parcela: 10000,
      data_vencimento: daysAgo(2),
      status: 'atrasado' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'SmartHome Automação',
      numero_parcela: 2,
      total_parcelas: 3,
      etapa_orcamento: 'Automação e Iluminação Final',
    },
    {
      id: pag[4],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Automação residencial - Parcela 3/3`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 30000,
      valor_parcela: 10000,
      data_vencimento: daysFromNow(25),
      status: 'previsto' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'SmartHome Automação',
      numero_parcela: 3,
      total_parcelas: 3,
      etapa_orcamento: 'Automação e Iluminação Final',
    },
    {
      id: pag[5],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Gesso e sancas`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 19800,
      data_vencimento: daysAgo(16),
      status: 'pago' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Gesso Premium',
      data_pagamento: daysAgo(16),
      etapa_orcamento: 'Gesso e Forros',
    },
    {
      id: pag[6],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Porcelanato premium - Parcela 1/3`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 32500,
      valor_parcela: 10833.33,
      data_vencimento: daysAgo(8),
      status: 'pago' as const,
      forma_pagamento: 'cartao' as const,
      fornecedor: 'Portobello Shop SP',
      numero_parcela: 1,
      total_parcelas: 3,
      data_pagamento: daysAgo(8),
      etapa_orcamento: 'Revestimentos e Pisos',
    },
    {
      id: pag[7],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Porcelanato premium - Parcela 2/3`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 32500,
      valor_parcela: 10833.33,
      data_vencimento: daysFromNow(22),
      status: 'previsto' as const,
      forma_pagamento: 'cartao' as const,
      fornecedor: 'Portobello Shop SP',
      numero_parcela: 2,
      total_parcelas: 3,
      etapa_orcamento: 'Revestimentos e Pisos',
    },
    {
      id: pag[8],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Porcelanato premium - Parcela 3/3`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 32500,
      valor_parcela: 10833.34,
      data_vencimento: daysFromNow(52),
      status: 'previsto' as const,
      forma_pagamento: 'cartao' as const,
      fornecedor: 'Portobello Shop SP',
      numero_parcela: 3,
      total_parcelas: 3,
      etapa_orcamento: 'Revestimentos e Pisos',
    },
    {
      id: pag[9],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Mão de obra assentamento revestimentos`,
      tipo_pagamento: 'mao_de_obra' as const,
      valor_previsto: 9200,
      data_vencimento: daysAgo(1),
      status: 'atrasado' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Marmorista Antônio',
      etapa_orcamento: 'Revestimentos e Pisos',
    },
    {
      id: pag[10],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Marcenaria cozinha - sinal`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 18000,
      data_vencimento: daysFromNow(4),
      status: 'previsto' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'Marcenaria Design',
      etapa_orcamento: 'Marcenaria Sob Medida',
    },

    // ───────────────── OBRA 2 — RESIDÊNCIA ─────────────────
    {
      id: pag[11],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Tapume e barracão de obra`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 19500,
      data_vencimento: daysAgo(108),
      status: 'pago' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Canteiro Rápido',
      data_pagamento: daysAgo(108),
      etapa_orcamento: 'Serviços Preliminares',
    },
    {
      id: pag[12],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Escavação mecânica`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 31000,
      data_vencimento: daysAgo(90),
      status: 'pago' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'Terraplanagem Martins',
      data_pagamento: daysAgo(90),
      etapa_orcamento: 'Fundação',
    },
    {
      id: pag[13],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Concreto fundação`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 56000,
      data_vencimento: daysAgo(76),
      status: 'pago' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Engemix',
      data_pagamento: daysAgo(76),
      etapa_orcamento: 'Fundação',
    },
    {
      id: pag[14],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Aço CA-50 - Parcela 1/3`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 43000,
      valor_parcela: 14333.33,
      data_vencimento: daysAgo(45),
      status: 'pago' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Gerdau Distribuidor',
      numero_parcela: 1,
      total_parcelas: 3,
      data_pagamento: daysAgo(45),
      etapa_orcamento: 'Estrutura',
    },
    {
      id: pag[15],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Aço CA-50 - Parcela 2/3`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 43000,
      valor_parcela: 14333.33,
      data_vencimento: daysFromNow(5),
      status: 'previsto' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Gerdau Distribuidor',
      numero_parcela: 2,
      total_parcelas: 3,
      etapa_orcamento: 'Estrutura',
    },
    {
      id: pag[16],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Aço CA-50 - Parcela 3/3`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 43000,
      valor_parcela: 14333.34,
      data_vencimento: daysFromNow(35),
      status: 'previsto' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Gerdau Distribuidor',
      numero_parcela: 3,
      total_parcelas: 3,
      etapa_orcamento: 'Estrutura',
    },
    {
      id: pag[17],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Concreto pilares e vigas`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 49000,
      data_vencimento: daysAgo(36),
      status: 'pago' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Engemix',
      data_pagamento: daysAgo(36),
      etapa_orcamento: 'Estrutura',
    },
    {
      id: pag[18],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Mão de obra estrutura - Quinzena`,
      tipo_pagamento: 'mao_de_obra' as const,
      valor_previsto: 28000,
      data_vencimento: daysAgo(3),
      status: 'atrasado' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: null,
      observacoes: 'Aguardando fechamento de medição',
      etapa_orcamento: 'Estrutura',
    },
    {
      id: pag[19],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Blocos cerâmicos`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 12500,
      data_vencimento: daysAgo(12),
      status: 'pago' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Cerâmica Barueri',
      data_pagamento: daysAgo(12),
      etapa_orcamento: 'Alvenaria e Vedação',
    },
    {
      id: pag[20],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Compra de cimento complementar`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 4200,
      data_vencimento: daysFromNow(1),
      status: 'previsto' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'DepMat Barueri',
      etapa_orcamento: 'Alvenaria e Vedação',
    },
    {
      id: pag[21],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Aluguel de betoneira`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 1200,
      data_vencimento: daysFromNow(2),
      status: 'previsto' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'EquipLoc',
      etapa_orcamento: 'Estrutura',
    },
    {
      id: pag[22],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Mão de obra mensal`,
      tipo_pagamento: 'mao_de_obra' as const,
      valor_previsto: 32000,
      data_vencimento: daysFromNow(7),
      status: 'previsto' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: null,
      etapa_orcamento: 'Estrutura',
    },

    // ───────────────── OBRA 3 — GALPÃO ─────────────────
    {
      id: pag[23],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Corte e aterro mecanizado`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 86000,
      data_vencimento: daysAgo(48),
      status: 'pago' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'MoviTerra Ltda',
      data_pagamento: daysAgo(48),
      etapa_orcamento: 'Terraplenagem',
    },
    {
      id: pag[24],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Compactação e nivelamento`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 39500,
      data_vencimento: daysAgo(32),
      status: 'pago' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'MoviTerra Ltda',
      data_pagamento: daysAgo(32),
      etapa_orcamento: 'Terraplenagem',
    },
    {
      id: pag[25],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Mobilização perfuratriz`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 46000,
      data_vencimento: daysAgo(24),
      status: 'pago' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'Estacas Brasil',
      data_pagamento: daysAgo(24),
      etapa_orcamento: 'Fundação Profunda',
    },
    {
      id: pag[26],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Estacas hélice - medição parcial`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 98000,
      data_vencimento: daysAgo(6),
      status: 'atrasado' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Estacas Brasil',
      etapa_orcamento: 'Fundação Profunda',
    },
    {
      id: pag[27],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Projeto executivo estrutura metálica`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 38000,
      data_vencimento: daysAgo(40),
      status: 'pago' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Calc Steel Eng.',
      data_pagamento: daysAgo(40),
      etapa_orcamento: 'Estrutura Metálica',
    },
    {
      id: pag[28],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Fabricação estrutura metálica - sinal`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 65000,
      data_vencimento: daysAgo(2),
      status: 'pago' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'SteelBuild',
      data_pagamento: daysAgo(2),
      etapa_orcamento: 'Estrutura Metálica',
    },
    {
      id: pag[29],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Fabricação estrutura metálica - Parcela 2/4`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 260000,
      valor_parcela: 65000,
      data_vencimento: daysFromNow(18),
      status: 'previsto' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'SteelBuild',
      numero_parcela: 2,
      total_parcelas: 4,
      etapa_orcamento: 'Estrutura Metálica',
    },
    {
      id: pag[30],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Fabricação estrutura metálica - Parcela 3/4`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 260000,
      valor_parcela: 65000,
      data_vencimento: daysFromNow(48),
      status: 'previsto' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'SteelBuild',
      numero_parcela: 3,
      total_parcelas: 4,
      etapa_orcamento: 'Estrutura Metálica',
    },
    {
      id: pag[31],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Fabricação estrutura metálica - Parcela 4/4`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 260000,
      valor_parcela: 65000,
      data_vencimento: daysFromNow(78),
      status: 'previsto' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'SteelBuild',
      numero_parcela: 4,
      total_parcelas: 4,
      etapa_orcamento: 'Estrutura Metálica',
    },
    {
      id: pag[32],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Locação de guindaste`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 18000,
      data_vencimento: daysFromNow(12),
      status: 'previsto' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'HeavyLift',
      etapa_orcamento: 'Estrutura Metálica',
    },

    // ───────────────── OBRA 4 — CASA DE PRAIA ─────────────────
    {
      id: pag[33],
      obra_id: obra4Id,
      descricao: `${DEMO_PREFIX} Revestimentos e pisos`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 89500,
      data_vencimento: daysAgo(32),
      status: 'pago' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Cerâmica Riviera',
      data_pagamento: daysAgo(32),
      etapa_orcamento: 'Revestimentos e Pisos',
    },
    {
      id: pag[34],
      obra_id: obra4Id,
      descricao: `${DEMO_PREFIX} Pintura interna e externa`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 34500,
      data_vencimento: daysAgo(10),
      status: 'pago' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Pinturas Costa',
      data_pagamento: daysAgo(10),
      etapa_orcamento: 'Pintura',
    },
    {
      id: pag[35],
      obra_id: obra4Id,
      descricao: `${DEMO_PREFIX} Equipamentos da piscina`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 18500,
      data_vencimento: daysAgo(16),
      status: 'pago' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'Piscinas Premium',
      data_pagamento: daysAgo(16),
      etapa_orcamento: 'Piscina e Área Externa',
    },
    {
      id: pag[36],
      obra_id: obra4Id,
      descricao: `${DEMO_PREFIX} Paisagismo final`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 12000,
      data_vencimento: daysAgo(6),
      status: 'pago' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Verde Jardins',
      data_pagamento: daysAgo(6),
      etapa_orcamento: 'Piscina e Área Externa',
    },
    {
      id: pag[37],
      obra_id: obra4Id,
      descricao: `${DEMO_PREFIX} Limpeza fina e checklist`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 5200,
      data_vencimento: daysFromNow(2),
      status: 'previsto' as const,
      forma_pagamento: 'pix' as const,
      fornecedor: 'Clean Obras',
      etapa_orcamento: 'Limpeza Final e Vistoria',
    },
    {
      id: pag[38],
      obra_id: obra4Id,
      descricao: `${DEMO_PREFIX} Taxa vistoria final condomínio`,
      tipo_pagamento: 'taxa' as const,
      valor_previsto: 1800,
      data_vencimento: daysFromNow(4),
      status: 'previsto' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Associação Riviera',
      etapa_orcamento: 'Limpeza Final e Vistoria',
    },
    {
      id: pag[39],
      obra_id: obra4Id,
      descricao: `${DEMO_PREFIX} Entrega técnica e assistência inicial`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 6000,
      data_vencimento: daysFromNow(10),
      status: 'previsto' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: null,
      etapa_orcamento: 'Entrega e Assistência Inicial',
    },

    // ───────────────── PAGAMENTOS GERAIS / RECORRENTES ─────────────────
    {
      id: pag[40],
      obra_id: obra2Id,
      descricao: `${DEMO_PREFIX} Internet provisória da obra`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 280,
      data_vencimento: daysFromNow(6),
      status: 'previsto' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Operadora Link',
      observacoes: 'Pagamento recorrente mensal',
    },
    {
      id: pag[41],
      obra_id: obra3Id,
      descricao: `${DEMO_PREFIX} Segurança patrimonial do canteiro`,
      tipo_pagamento: 'servico' as const,
      valor_previsto: 4200,
      data_vencimento: daysFromNow(8),
      status: 'previsto' as const,
      forma_pagamento: 'transferencia' as const,
      fornecedor: 'SegurPro',
      observacoes: 'Contrato mensal',
    },
    {
      id: pag[42],
      obra_id: obra1Id,
      descricao: `${DEMO_PREFIX} Taxa descarte condomínio`,
      tipo_pagamento: 'taxa' as const,
      valor_previsto: 950,
      data_vencimento: daysAgo(1),
      status: 'atrasado' as const,
      forma_pagamento: 'boleto' as const,
      fornecedor: 'Condomínio Itaim Prime',
    },
    {
      id: pag[43],
      obra_id: obra4Id,
      descricao: `${DEMO_PREFIX} Compra de lâmpadas decorativas`,
      tipo_pagamento: 'material' as const,
      valor_previsto: 2200,
      data_vencimento: daysFromNow(1),
      status: 'previsto' as const,
      forma_pagamento: 'cartao' as const,
      fornecedor: 'Ilumina Design',
      etapa_orcamento: 'Entrega e Assistência Inicial',
    },
  ];

  await checkedInsert('pagamentos', pagamentos, true);

// ══════════════════════ 8. FORNECEDORES / PREÇOS / AGENDA / DOCUMENTOS ══════════════════════

  const fornecedores = [
    // Obra 1
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      nome: 'Portobello Shop SP',
      contato: 'Juliana Prado',
      telefone: '(11) 98888-1001',
      email: 'vendas@portobelloshopsp.com.br',
      cidade: 'São Paulo/SP',
      categoria: 'acabamentos',
      observacoes: 'Fornecedor premium de porcelanatos e revestimentos especiais.',
    },
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      nome: 'Marmoraria Delta',
      contato: 'Paulo Freitas',
      telefone: '(11) 98888-1002',
      email: 'comercial@marmorariadelta.com.br',
      cidade: 'São Paulo/SP',
      categoria: 'marmores',
      observacoes: 'Especializada em bancadas, nichos e acabamentos em mármore.',
    },
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      nome: 'Marcenaria Design',
      contato: 'Rodrigo Nunes',
      telefone: '(11) 98888-1003',
      email: 'orcamentos@marcenariadesign.com.br',
      cidade: 'São Paulo/SP',
      categoria: 'marcenaria',
      observacoes: 'Marcenaria sob medida para ambientes de alto padrão.',
    },

    // Obra 2
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      nome: 'DepMat Barueri',
      contato: 'Luciana Souza',
      telefone: '(11) 98888-2001',
      email: 'vendas@depmatbarueri.com.br',
      cidade: 'Barueri/SP',
      categoria: 'materiais',
      observacoes: 'Fornecedor recorrente de cimento, argamassa e ferragens.',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      nome: 'Cerâmica Barueri',
      contato: 'Carlos Pires',
      telefone: '(11) 98888-2002',
      email: 'comercial@ceramicabarueri.com.br',
      cidade: 'Barueri/SP',
      categoria: 'alvenaria',
      observacoes: 'Blocos cerâmicos e peças estruturais.',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      nome: 'Gerdau Distribuidor',
      contato: 'Marina Lopes',
      telefone: '(11) 98888-2003',
      email: 'obras@gerdaudist.com.br',
      cidade: 'Osasco/SP',
      categoria: 'aco',
      observacoes: 'Aço CA-50 e CA-60 para estrutura.',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      nome: 'Engemix',
      contato: 'Fabio Lima',
      telefone: '(11) 98888-2004',
      email: 'atendimento@engemix.com.br',
      cidade: 'Barueri/SP',
      categoria: 'concreto',
      observacoes: 'Concreto usinado e bombeamento.',
    },

    // Obra 3
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      nome: 'MoviTerra Ltda',
      contato: 'André Teixeira',
      telefone: '(11) 98888-3001',
      email: 'operacao@moviterra.com.br',
      cidade: 'Jundiaí/SP',
      categoria: 'terraplenagem',
      observacoes: 'Terraplenagem pesada e compactação.',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      nome: 'Estacas Brasil',
      contato: 'Guilherme Moraes',
      telefone: '(11) 98888-3002',
      email: 'comercial@estacasbrasil.com.br',
      cidade: 'Jundiaí/SP',
      categoria: 'fundacao',
      observacoes: 'Execução de fundação profunda e blocos de coroamento.',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      nome: 'SteelBuild',
      contato: 'Renato Salles',
      telefone: '(11) 98888-3003',
      email: 'vendas@steelbuild.com.br',
      cidade: 'Campinas/SP',
      categoria: 'estrutura_metalica',
      observacoes: 'Fabricação e montagem de estrutura metálica.',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      nome: 'HeavyLift',
      contato: 'Daniel Rocha',
      telefone: '(11) 98888-3004',
      email: 'locacao@heavylift.com.br',
      cidade: 'Campinas/SP',
      categoria: 'equipamentos',
      observacoes: 'Locação de guindastes e equipamentos pesados.',
    },

    // Obra 4
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      nome: 'Cerâmica Riviera',
      contato: 'Patrícia Nogueira',
      telefone: '(13) 98888-4001',
      email: 'vendas@ceramicariviera.com.br',
      cidade: 'Bertioga/SP',
      categoria: 'acabamentos',
      observacoes: 'Acabamentos premium para litoral.',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      nome: 'Piscinas Premium',
      contato: 'Márcio Vidal',
      telefone: '(13) 98888-4002',
      email: 'obras@piscinaspremium.com.br',
      cidade: 'Santos/SP',
      categoria: 'piscina',
      observacoes: 'Equipamentos e acabamento de piscinas.',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      nome: 'Verde Jardins',
      contato: 'Bruna Campos',
      telefone: '(13) 98888-4003',
      email: 'paisagismo@verdejardins.com.br',
      cidade: 'Bertioga/SP',
      categoria: 'paisagismo',
      observacoes: 'Paisagismo final e manutenção inicial.',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      nome: 'Clean Obras',
      contato: 'Sergio Mota',
      telefone: '(13) 98888-4004',
      email: 'contato@cleanobras.com.br',
      cidade: 'Bertioga/SP',
      categoria: 'limpeza',
      observacoes: 'Limpeza pós-obra e apoio à entrega.',
    },
  ];

  await checkedInsert('fornecedores', fornecedores, true);

  const precosFornecedores = [
    // Obra 1
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      fornecedor_nome: 'Portobello Shop SP',
      insumo: 'Porcelanato premium 80x80',
      categoria: 'acabamentos',
      unidade: 'm²',
      valor_unitario: 185,
      data_referencia: daysAgo(10),
      origem_preco: 'compra_real',
    },
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      fornecedor_nome: 'Marmoraria Delta',
      insumo: 'Mármore Carrara',
      categoria: 'marmores',
      unidade: 'm²',
      valor_unitario: 420,
      data_referencia: daysAgo(6),
      origem_preco: 'cotacao',
    },
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      fornecedor_nome: 'Marcenaria Design',
      insumo: 'Marcenaria sob medida',
      categoria: 'marcenaria',
      unidade: 'vb',
      valor_unitario: 38000,
      data_referencia: daysAgo(3),
      origem_preco: 'compra_real',
    },

    // Obra 2
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      fornecedor_nome: 'DepMat Barueri',
      insumo: 'Cimento CP-II 50kg',
      categoria: 'materiais',
      unidade: 'saco',
      valor_unitario: 39,
      data_referencia: daysAgo(2),
      origem_preco: 'compra_real',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      fornecedor_nome: 'Cerâmica Barueri',
      insumo: 'Bloco cerâmico 14x19x39',
      categoria: 'alvenaria',
      unidade: 'un',
      valor_unitario: 1.9,
      data_referencia: daysAgo(12),
      origem_preco: 'compra_real',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      fornecedor_nome: 'Gerdau Distribuidor',
      insumo: 'Vergalhão CA-50 10mm',
      categoria: 'aco',
      unidade: 'barra',
      valor_unitario: 78,
      data_referencia: daysAgo(8),
      origem_preco: 'cotacao',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      fornecedor_nome: 'Engemix',
      insumo: 'Concreto fck 25',
      categoria: 'concreto',
      unidade: 'm³',
      valor_unitario: 470,
      data_referencia: daysAgo(7),
      origem_preco: 'compra_real',
    },

    // Obra 3
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      fornecedor_nome: 'MoviTerra Ltda',
      insumo: 'Terraplenagem mecanizada',
      categoria: 'terraplenagem',
      unidade: 'vb',
      valor_unitario: 86000,
      data_referencia: daysAgo(20),
      origem_preco: 'compra_real',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      fornecedor_nome: 'Estacas Brasil',
      insumo: 'Estaca hélice contínua',
      categoria: 'fundacao',
      unidade: 'm',
      valor_unitario: 252.1,
      data_referencia: daysAgo(5),
      origem_preco: 'cotacao',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      fornecedor_nome: 'SteelBuild',
      insumo: 'Estrutura metálica',
      categoria: 'estrutura_metalica',
      unidade: 'vb',
      valor_unitario: 280000,
      data_referencia: daysAgo(3),
      origem_preco: 'cotacao',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      fornecedor_nome: 'HeavyLift',
      insumo: 'Locação de guindaste',
      categoria: 'equipamentos',
      unidade: 'diária',
      valor_unitario: 6000,
      data_referencia: daysAgo(2),
      origem_preco: 'cotacao',
    },

    // Obra 4
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      fornecedor_nome: 'Cerâmica Riviera',
      insumo: 'Porcelanato litoral premium',
      categoria: 'acabamentos',
      unidade: 'm²',
      valor_unitario: 198,
      data_referencia: daysAgo(20),
      origem_preco: 'compra_real',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      fornecedor_nome: 'Piscinas Premium',
      insumo: 'Equipamentos da piscina',
      categoria: 'piscina',
      unidade: 'vb',
      valor_unitario: 18500,
      data_referencia: daysAgo(16),
      origem_preco: 'compra_real',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      fornecedor_nome: 'Verde Jardins',
      insumo: 'Paisagismo final',
      categoria: 'paisagismo',
      unidade: 'vb',
      valor_unitario: 12000,
      data_referencia: daysAgo(6),
      origem_preco: 'compra_real',
    },
  ];

  await checkedInsert('precos_fornecedores', precosFornecedores, true);

  // ───────────────── AGENDA DE OBRA ─────────────────
  const agenda = [
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      titulo: 'Entrega do mármore complementar',
      data: daysFromNow(2),
      tipo: 'entrega',
      descricao: 'Recebimento de material para banheiro suíte master.',
      status: 'pendente',
    },
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      titulo: 'Reunião com cliente para definição de metais',
      data: daysFromNow(4),
      tipo: 'reuniao',
      descricao: 'Escolha final de metais e acessórios dos banheiros.',
      status: 'pendente',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      titulo: 'Concretagem da próxima laje',
      data: daysFromNow(5),
      tipo: 'execucao',
      descricao: 'Programação da concretagem do pavimento superior.',
      status: 'pendente',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      titulo: 'Recebimento de cimento complementar',
      data: daysFromNow(1),
      tipo: 'entrega',
      descricao: 'Reposição de cimento para continuidade da alvenaria.',
      status: 'pendente',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      titulo: 'Início fabricação estrutura metálica',
      data: daysFromNow(3),
      tipo: 'execucao',
      descricao: 'Kickoff fabril com fornecedor SteelBuild.',
      status: 'pendente',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      titulo: 'Mobilização do guindaste',
      data: daysFromNow(12),
      tipo: 'logistica',
      descricao: 'Reserva operacional para montagem futura.',
      status: 'pendente',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      titulo: 'Vistoria final com cliente',
      data: daysFromNow(3),
      tipo: 'vistoria',
      descricao: 'Checklist final de entrega da casa.',
      status: 'pendente',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      titulo: 'Entrega técnica e documentação',
      data: daysFromNow(7),
      tipo: 'entrega',
      descricao: 'Entrega de manuais, garantias e orientação ao cliente.',
      status: 'pendente',
    },
  ];

  await checkedInsert('obra_agenda', agenda, true);

  // ───────────────── DOCUMENTOS ─────────────────
  const documentos = [
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      nome: 'Projeto Executivo de Reforma',
      tipo: 'projeto',
      categoria: 'Projetos',
      arquivo_nome: 'projeto_reforma_itaim.pdf',
      url_arquivo: 'https://example.com/demo/projeto_reforma_itaim.pdf',
      observacoes: 'Layout final aprovado pelos clientes.',
    },
    {
      id: demoId(),
      obra_id: obra1Id,
      company_id: companyId,
      nome: 'Contrato de Marcenaria',
      tipo: 'contrato',
      categoria: 'Contratos',
      arquivo_nome: 'contrato_marcenaria.pdf',
      url_arquivo: 'https://example.com/demo/contrato_marcenaria.pdf',
      observacoes: 'Contrato com cláusula de entrega por ambientes.',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      nome: 'Projeto Estrutural Residência',
      tipo: 'projeto',
      categoria: 'Projetos',
      arquivo_nome: 'estrutura_residencia_martins.pdf',
      url_arquivo: 'https://example.com/demo/estrutura_residencia_martins.pdf',
      observacoes: 'Versão revisada com adequação da escada.',
    },
    {
      id: demoId(),
      obra_id: obra2Id,
      company_id: companyId,
      nome: 'Cronograma Físico-Financeiro',
      tipo: 'cronograma',
      categoria: 'Planejamento',
      arquivo_nome: 'cronograma_residencia.xlsx',
      url_arquivo: 'https://example.com/demo/cronograma_residencia.xlsx',
      observacoes: 'Arquivo referência para reunião mensal.',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      nome: 'Contrato Estrutura Metálica',
      tipo: 'contrato',
      categoria: 'Contratos',
      arquivo_nome: 'contrato_steelbuild.pdf',
      url_arquivo: 'https://example.com/demo/contrato_steelbuild.pdf',
      observacoes: 'Contrato com fabricação e montagem separadas por medição.',
    },
    {
      id: demoId(),
      obra_id: obra3Id,
      company_id: companyId,
      nome: 'Projeto de Fundação Profunda',
      tipo: 'projeto',
      categoria: 'Projetos',
      arquivo_nome: 'fundacao_profunda_logtech.pdf',
      url_arquivo: 'https://example.com/demo/fundacao_profunda_logtech.pdf',
      observacoes: 'Contém locação de estacas e memória de cálculo.',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      nome: 'Checklist de Entrega',
      tipo: 'vistoria',
      categoria: 'Entrega',
      arquivo_nome: 'checklist_entrega_riviera.pdf',
      url_arquivo: 'https://example.com/demo/checklist_entrega_riviera.pdf',
      observacoes: 'Checklist final para entrega ao cliente.',
    },
    {
      id: demoId(),
      obra_id: obra4Id,
      company_id: companyId,
      nome: 'Manual do Proprietário',
      tipo: 'manual',
      categoria: 'Entrega',
      arquivo_nome: 'manual_proprietario_riviera.pdf',
      url_arquivo: 'https://example.com/demo/manual_proprietario_riviera.pdf',
      observacoes: 'Documento com garantias e orientações iniciais.',
    },
  ];

  await checkedInsert('documentos_obra', documentos, true);
}

// ═══════════════════════════════════════════════════════════════
// REMOVE DEMO DATA
// ═══════════════════════════════════════════════════════════════

export async function removeDemoData(companyId: string) {
  const { data: obrasDemo, error: obrasError } = await (supabase.from as any)('obras')
    .select('id, nome')
    .eq('company_id', companyId)
    .ilike('nome', `${DEMO_PREFIX}%`);

  if (obrasError) {
    throw new Error(`Erro ao buscar obras demo: ${obrasError.message}`);
  }

  if (!obrasDemo || obrasDemo.length === 0) {
    return;
  }

  const obraIds = obrasDemo.map((o: any) => o.id);

  // filhos / dependências
  await (supabase.from as any)('precos_fornecedores').delete().in('obra_id', obraIds);
  await (supabase.from as any)('fornecedores').delete().in('obra_id', obraIds);
  await (supabase.from as any)('pagamento_itens').delete().in('obra_id', obraIds);
  await (supabase.from as any)('pagamentos').delete().in('obra_id', obraIds);
  await (supabase.from as any)('pendencias').delete().in('obra_id', obraIds);
  await (supabase.from as any)('documentos_obra').delete().in('obra_id', obraIds);
  await (supabase.from as any)('obra_agenda').delete().in('obra_id', obraIds);
  await (supabase.from as any)('diario_registros').delete().in('obra_id', obraIds);
  await (supabase.from as any)('movimentacoes').delete().in('obra_id', obraIds);
  await (supabase.from as any)('materiais').delete().in('obra_id', obraIds);
  await (supabase.from as any)('custo_real_itens').delete().in('obra_id', obraIds);
  await (supabase.from as any)('cronograma_dependencias').delete().in('obra_id', obraIds);

  // orçamento
  const { data: categorias } = await (supabase.from as any)('orcamento_categorias')
    .select('id')
    .in('obra_id', obraIds);

  const categoriaIds = (categorias || []).map((c: any) => c.id);

  if (categoriaIds.length > 0) {
    const { data: composicoes } = await (supabase.from as any)('orcamento_composicoes')
      .select('id')
      .in('categoria_id', categoriaIds);

    const composicaoIds = (composicoes || []).map((c: any) => c.id);

    if (composicaoIds.length > 0) {
      await (supabase.from as any)('orcamento_subitens').delete().in('composicao_id', composicaoIds);
      await (supabase.from as any)('orcamento_composicoes').delete().in('id', composicaoIds);
    }

    await (supabase.from as any)('orcamento_categorias').delete().in('id', categoriaIds);
  }

  // memberships
  await (supabase.from as any)('obra_memberships').delete().in('obra_id', obraIds);

  // por fim, obras
  await (supabase.from as any)('obras').delete().in('id', obraIds);
}
