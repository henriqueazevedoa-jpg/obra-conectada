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
      console.warn(`Demo seed: ${table} skipped (table not found)`);
      return;
    }
    console.error(`Demo seed: ${table} insert failed:`, error.message, error.details, error.hint);
    throw new Error(`${table}: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// SEED DEMO DATA — 4 obras completas
// ═══════════════════════════════════════════════════════════════

export async function seedDemoData(userId: string, companyId: string) {
  const obra1Id = demoId(); // Reforma Apartamento Alto Padrão
  const obra2Id = demoId(); // Residência Unifamiliar
  const obra3Id = demoId(); // Galpão Comercial
  const obra4Id = demoId(); // Obra quase concluída

  // ══════════════════════ 1. OBRAS ══════════════════════
  const obras = [
    {
      id: obra1Id, nome: `${DEMO_PREFIX} Reforma Apto Alto Padrão - Itaim`, codigo: 'DEMO-2026-001',
      cliente: 'Fernanda e Ricardo Azevedo', endereco: 'Rua Joaquim Floriano, 820 Apto 142 - Itaim Bibi, São Paulo/SP',
      status: 'em_andamento', data_inicio: daysAgo(75), data_previsao_termino: daysFromNow(45),
      responsavel: 'Arq. Camila Duarte', percentual_andamento: 62,
      descricao: 'Reforma completa de apartamento de 180m² - alto padrão. Demolição total do layout anterior, novo projeto de iluminação, marcenaria sob medida, automação residencial e acabamentos premium.',
      company_id: companyId,
      tipo_implantacao: 'em_andamento' as const, percentual_inicial: 10, valor_gasto_anterior: 38000,
      origem_dados: 'real' as const, observacao_interna: 'Clientes exigentes com acabamento. Aprovação de materiais sempre presencial.',
    },
    {
      id: obra2Id, nome: `${DEMO_PREFIX} Residência Família Martins`, codigo: 'DEMO-2026-002',
      cliente: 'Dr. Henrique Martins', endereco: 'Rua das Acácias, 340 - Alphaville, Barueri/SP',
      status: 'em_andamento', data_inicio: daysAgo(120), data_previsao_termino: daysFromNow(150),
      responsavel: 'Eng. Paulo Roberto', percentual_andamento: 38,
      descricao: 'Construção de residência unifamiliar de 2 pavimentos, 320m². Terreno de 450m² com piscina, churrasqueira e edícula. Projeto contemporâneo com sustentabilidade.',
      company_id: companyId,
      tipo_implantacao: 'nova' as const, origem_dados: 'real' as const,
    },
    {
      id: obra3Id, nome: `${DEMO_PREFIX} Galpão Comercial LogTech`, codigo: 'DEMO-2026-003',
      cliente: 'LogTech Armazéns Ltda', endereco: 'Rod. Anhanguera, Km 52 - Distrito Industrial, Jundiaí/SP',
      status: 'em_andamento', data_inicio: daysAgo(60), data_previsao_termino: daysFromNow(180),
      responsavel: 'Eng. Marcos Teixeira', percentual_andamento: 22,
      descricao: 'Construção de galpão comercial de 2.000m² com mezanino de 400m² para escritórios, docas de carga/descarga, piso industrial e área administrativa.',
      company_id: companyId,
      tipo_implantacao: 'nova' as const, origem_dados: 'real' as const,
      observacoes_implantacao: 'Projeto com alta movimentação de fornecedores e equipes simultâneas.',
    },
    {
      id: obra4Id, nome: `${DEMO_PREFIX} Casa de Praia - Riviera`, codigo: 'DEMO-2026-004',
      cliente: 'Família Nogueira', endereco: 'Av. Riviera, Módulo 24, Lote 18 - Riviera de São Lourenço, Bertioga/SP',
      status: 'em_andamento', data_inicio: daysAgo(240), data_previsao_termino: daysFromNow(15),
      responsavel: 'Eng. Roberto Campos', percentual_andamento: 94,
      descricao: 'Casa de praia de 250m², 3 suítes, varanda gourmet, piscina com borda infinita. Fase final: acabamentos, limpeza, vistoria e entrega.',
      company_id: companyId,
      tipo_implantacao: 'nova' as const, origem_dados: 'real' as const,
    },
  ];
  await checkedInsert('obras', obras);

  for (const obraId of [obra1Id, obra2Id, obra3Id, obra4Id]) {
    await (supabase.from as any)('obra_memberships').upsert(
      { obra_id: obraId, user_id: userId, role: 'gestor' as const },
      { onConflict: 'obra_id,user_id' }
    );
  }

  // ══════════════════════ 2. ORCAMENTO ══════════════════════

  // Obra 1 — Reforma Apto (cronograma curto, etapas de reforma)
  const c1 = Array.from({ length: 8 }, () => demoId());
  // Obra 2 — Residência (etapas tradicionais)
  const c2 = Array.from({ length: 10 }, () => demoId());
  // Obra 3 — Galpão (etapas industriais)
  const c3 = Array.from({ length: 8 }, () => demoId());
  // Obra 4 — Casa praia (quase concluída)
  const c4 = Array.from({ length: 9 }, () => demoId());

  const categorias = [
    // ── Obra 1: Reforma Apto ──
    { id: c1[0], obra_id: obra1Id, codigo: '01', nome: 'Demolição e Remoção', preco_total: 18000, usa_composicoes: true, data_inicio_prevista: daysAgo(73), data_fim_prevista: daysAgo(60), data_inicio_real: daysAgo(73), data_fim_real: daysAgo(58), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c1[1], obra_id: obra1Id, codigo: '02', nome: 'Elétrica e Automação', preco_total: 42000, usa_composicoes: true, data_inicio_prevista: daysAgo(58), data_fim_prevista: daysAgo(30), data_inicio_real: daysAgo(56), data_fim_real: daysAgo(28), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c1[2], obra_id: obra1Id, codigo: '03', nome: 'Hidráulica', preco_total: 28000, usa_composicoes: true, data_inicio_prevista: daysAgo(55), data_fim_prevista: daysAgo(35), data_inicio_real: daysAgo(53), data_fim_real: daysAgo(33), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c1[3], obra_id: obra1Id, codigo: '04', nome: 'Gesso e Forro', preco_total: 22000, usa_composicoes: true, data_inicio_prevista: daysAgo(30), data_fim_prevista: daysAgo(15), data_inicio_real: daysAgo(28), data_fim_real: daysAgo(12), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c1[4], obra_id: obra1Id, codigo: '05', nome: 'Revestimentos e Pisos', preco_total: 65000, usa_composicoes: true, data_inicio_prevista: daysAgo(15), data_fim_prevista: daysFromNow(5), data_inicio_real: daysAgo(12), status_cronograma: 'em_andamento' as const, percentual_cronograma: 70 },
    { id: c1[5], obra_id: obra1Id, codigo: '06', nome: 'Marcenaria', preco_total: 85000, usa_composicoes: false, data_inicio_prevista: daysAgo(5), data_fim_prevista: daysFromNow(25), data_inicio_real: daysAgo(3), status_cronograma: 'em_andamento' as const, percentual_cronograma: 15 },
    { id: c1[6], obra_id: obra1Id, codigo: '07', nome: 'Pintura', preco_total: 18000, usa_composicoes: false, data_inicio_prevista: daysFromNow(10), data_fim_prevista: daysFromNow(30), status_cronograma: 'nao_iniciada' as const },
    { id: c1[7], obra_id: obra1Id, codigo: '08', nome: 'Louças, Metais e Acabamento Final', preco_total: 45000, usa_composicoes: false, data_inicio_prevista: daysFromNow(20), data_fim_prevista: daysFromNow(40), status_cronograma: 'nao_iniciada' as const },

    // ── Obra 2: Residência ──
    { id: c2[0], obra_id: obra2Id, codigo: '01', nome: 'Serviços Preliminares', preco_total: 35000, usa_composicoes: true, data_inicio_prevista: daysAgo(118), data_fim_prevista: daysAgo(100), data_inicio_real: daysAgo(118), data_fim_real: daysAgo(98), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c2[1], obra_id: obra2Id, codigo: '02', nome: 'Fundação', preco_total: 95000, usa_composicoes: true, data_inicio_prevista: daysAgo(100), data_fim_prevista: daysAgo(65), data_inicio_real: daysAgo(98), data_fim_real: daysAgo(62), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c2[2], obra_id: obra2Id, codigo: '03', nome: 'Estrutura', preco_total: 165000, usa_composicoes: true, data_inicio_prevista: daysAgo(65), data_fim_prevista: daysAgo(10), data_inicio_real: daysAgo(62), status_cronograma: 'em_andamento' as const, percentual_cronograma: 75 },
    { id: c2[3], obra_id: obra2Id, codigo: '04', nome: 'Alvenaria e Vedação', preco_total: 72000, usa_composicoes: false, data_inicio_prevista: daysAgo(20), data_fim_prevista: daysFromNow(30), data_inicio_real: daysAgo(18), status_cronograma: 'em_andamento' as const, percentual_cronograma: 30 },
    { id: c2[4], obra_id: obra2Id, codigo: '05', nome: 'Cobertura', preco_total: 48000, usa_composicoes: false, data_inicio_prevista: daysFromNow(15), data_fim_prevista: daysFromNow(45), status_cronograma: 'nao_iniciada' as const },
    { id: c2[5], obra_id: obra2Id, codigo: '06', nome: 'Instalações Elétricas', preco_total: 55000, usa_composicoes: false, data_inicio_prevista: daysFromNow(25), data_fim_prevista: daysFromNow(75), status_cronograma: 'nao_iniciada' as const },
    { id: c2[6], obra_id: obra2Id, codigo: '07', nome: 'Instalações Hidráulicas', preco_total: 42000, usa_composicoes: false, data_inicio_prevista: daysFromNow(25), data_fim_prevista: daysFromNow(75), status_cronograma: 'nao_iniciada' as const },
    { id: c2[7], obra_id: obra2Id, codigo: '08', nome: 'Revestimentos', preco_total: 58000, usa_composicoes: false, data_inicio_prevista: daysFromNow(60), data_fim_prevista: daysFromNow(100), status_cronograma: 'nao_iniciada' as const },
    { id: c2[8], obra_id: obra2Id, codigo: '09', nome: 'Pintura e Acabamento', preco_total: 38000, usa_composicoes: false, data_inicio_prevista: daysFromNow(90), data_fim_prevista: daysFromNow(130), status_cronograma: 'nao_iniciada' as const },
    { id: c2[9], obra_id: obra2Id, codigo: '10', nome: 'Área Externa e Piscina', preco_total: 85000, usa_composicoes: false, data_inicio_prevista: daysFromNow(100), data_fim_prevista: daysFromNow(145), status_cronograma: 'nao_iniciada' as const },

    // ── Obra 3: Galpão ──
    { id: c3[0], obra_id: obra3Id, codigo: '01', nome: 'Terraplenagem', preco_total: 120000, usa_composicoes: true, data_inicio_prevista: daysAgo(58), data_fim_prevista: daysAgo(30), data_inicio_real: daysAgo(58), data_fim_real: daysAgo(28), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c3[1], obra_id: obra3Id, codigo: '02', nome: 'Fundação Profunda', preco_total: 280000, usa_composicoes: true, data_inicio_prevista: daysAgo(30), data_fim_prevista: daysFromNow(15), data_inicio_real: daysAgo(28), status_cronograma: 'em_andamento' as const, percentual_cronograma: 65 },
    { id: c3[2], obra_id: obra3Id, codigo: '03', nome: 'Estrutura Metálica', preco_total: 520000, usa_composicoes: false, data_inicio_prevista: daysFromNow(10), data_fim_prevista: daysFromNow(80), status_cronograma: 'nao_iniciada' as const },
    { id: c3[3], obra_id: obra3Id, codigo: '04', nome: 'Cobertura Metálica', preco_total: 195000, usa_composicoes: false, data_inicio_prevista: daysFromNow(60), data_fim_prevista: daysFromNow(100), status_cronograma: 'nao_iniciada' as const },
    { id: c3[4], obra_id: obra3Id, codigo: '05', nome: 'Piso Industrial', preco_total: 180000, usa_composicoes: false, data_inicio_prevista: daysFromNow(80), data_fim_prevista: daysFromNow(110), status_cronograma: 'nao_iniciada' as const },
    { id: c3[5], obra_id: obra3Id, codigo: '06', nome: 'Instalações Elétricas Industriais', preco_total: 165000, usa_composicoes: false, data_inicio_prevista: daysFromNow(70), data_fim_prevista: daysFromNow(130), status_cronograma: 'nao_iniciada' as const },
    { id: c3[6], obra_id: obra3Id, codigo: '07', nome: 'Mezanino e Escritórios', preco_total: 145000, usa_composicoes: false, data_inicio_prevista: daysFromNow(90), data_fim_prevista: daysFromNow(150), status_cronograma: 'nao_iniciada' as const },
    { id: c3[7], obra_id: obra3Id, codigo: '08', nome: 'Docas e Acabamento', preco_total: 95000, usa_composicoes: false, data_inicio_prevista: daysFromNow(130), data_fim_prevista: daysFromNow(170), status_cronograma: 'nao_iniciada' as const },

    // ── Obra 4: Casa Praia — quase concluída ──
    { id: c4[0], obra_id: obra4Id, codigo: '01', nome: 'Serviços Preliminares', preco_total: 28000, usa_composicoes: false, data_inicio_prevista: daysAgo(238), data_fim_prevista: daysAgo(220), data_inicio_real: daysAgo(238), data_fim_real: daysAgo(218), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c4[1], obra_id: obra4Id, codigo: '02', nome: 'Fundação', preco_total: 78000, usa_composicoes: false, data_inicio_prevista: daysAgo(220), data_fim_prevista: daysAgo(185), data_inicio_real: daysAgo(218), data_fim_real: daysAgo(182), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c4[2], obra_id: obra4Id, codigo: '03', nome: 'Estrutura', preco_total: 125000, usa_composicoes: false, data_inicio_prevista: daysAgo(185), data_fim_prevista: daysAgo(130), data_inicio_real: daysAgo(182), data_fim_real: daysAgo(128), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c4[3], obra_id: obra4Id, codigo: '04', nome: 'Alvenaria e Cobertura', preco_total: 92000, usa_composicoes: false, data_inicio_prevista: daysAgo(130), data_fim_prevista: daysAgo(85), data_inicio_real: daysAgo(128), data_fim_real: daysAgo(82), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c4[4], obra_id: obra4Id, codigo: '05', nome: 'Instalações Elétricas e Hidráulicas', preco_total: 68000, usa_composicoes: false, data_inicio_prevista: daysAgo(90), data_fim_prevista: daysAgo(50), data_inicio_real: daysAgo(88), data_fim_real: daysAgo(48), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c4[5], obra_id: obra4Id, codigo: '06', nome: 'Revestimentos e Pisos', preco_total: 85000, usa_composicoes: false, data_inicio_prevista: daysAgo(55), data_fim_prevista: daysAgo(20), data_inicio_real: daysAgo(52), data_fim_real: daysAgo(18), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c4[6], obra_id: obra4Id, codigo: '07', nome: 'Pintura', preco_total: 32000, usa_composicoes: false, data_inicio_prevista: daysAgo(22), data_fim_prevista: daysAgo(5), data_inicio_real: daysAgo(20), data_fim_real: daysAgo(4), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c4[7], obra_id: obra4Id, codigo: '08', nome: 'Piscina e Área Externa', preco_total: 95000, usa_composicoes: false, data_inicio_prevista: daysAgo(40), data_fim_prevista: daysAgo(5), data_inicio_real: daysAgo(38), data_fim_real: daysAgo(3), status_cronograma: 'concluida' as const, percentual_cronograma: 100 },
    { id: c4[8], obra_id: obra4Id, codigo: '09', nome: 'Limpeza Final, Vistoria e Entrega', preco_total: 15000, usa_composicoes: false, data_inicio_prevista: daysAgo(5), data_fim_prevista: daysFromNow(10), data_inicio_real: daysAgo(3), status_cronograma: 'em_andamento' as const, percentual_cronograma: 40 },
  ];
  await checkedInsert('orcamento_categorias', categorias);

  // Composições (amostras para obras 1, 2 e 3)
  const composicoes = [
    // Obra 1
    { categoria_id: c1[0], codigo: '01.01', descricao: 'Demolição de paredes e forros', preco_total: 6000, preco_unitario: 40, quantidade: 150, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c1[0], codigo: '01.02', descricao: 'Remoção de pisos e revestimentos', preco_total: 5500, preco_unitario: 35, quantidade: 157, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c1[0], codigo: '01.03', descricao: 'Remoção de entulho (caçambas)', preco_total: 6500, preco_unitario: 650, quantidade: 10, unidade: 'caç', usa_subitens: false, concluida: true },
    { categoria_id: c1[1], codigo: '02.01', descricao: 'Instalação elétrica completa', preco_total: 28000, preco_unitario: 155, quantidade: 180, unidade: 'pt', usa_subitens: false, concluida: true },
    { categoria_id: c1[1], codigo: '02.02', descricao: 'Automação residencial (central + módulos)', preco_total: 14000, preco_unitario: 14000, quantidade: 1, unidade: 'vb', usa_subitens: false, concluida: true },
    { categoria_id: c1[2], codigo: '03.01', descricao: 'Instalação hidráulica água fria/quente', preco_total: 18000, preco_unitario: 120, quantidade: 150, unidade: 'pt', usa_subitens: false, concluida: true },
    { categoria_id: c1[2], codigo: '03.02', descricao: 'Esgoto e ralos', preco_total: 10000, preco_unitario: 250, quantidade: 40, unidade: 'pt', usa_subitens: false, concluida: true },
    { categoria_id: c1[3], codigo: '04.01', descricao: 'Forro de gesso acartonado', preco_total: 14000, preco_unitario: 85, quantidade: 165, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c1[3], codigo: '04.02', descricao: 'Sancas e tabicas iluminação', preco_total: 8000, preco_unitario: 120, quantidade: 67, unidade: 'ml', usa_subitens: false, concluida: true },
    { categoria_id: c1[4], codigo: '05.01', descricao: 'Porcelanato retificado 80x80 (salas)', preco_total: 28000, preco_unitario: 280, quantidade: 100, unidade: 'm²', usa_subitens: false, concluida: true, peso_cronograma: 40 },
    { categoria_id: c1[4], codigo: '05.02', descricao: 'Mármore banheiro suíte master', preco_total: 18000, preco_unitario: 600, quantidade: 30, unidade: 'm²', usa_subitens: false, concluida: false, peso_cronograma: 30 },
    { categoria_id: c1[4], codigo: '05.03', descricao: 'Revestimento cerâmico cozinha', preco_total: 12000, preco_unitario: 200, quantidade: 60, unidade: 'm²', usa_subitens: false, concluida: false, peso_cronograma: 20 },
    { categoria_id: c1[4], codigo: '05.04', descricao: 'Rodapés e acabamentos', preco_total: 7000, preco_unitario: 70, quantidade: 100, unidade: 'ml', usa_subitens: false, concluida: false, peso_cronograma: 10 },

    // Obra 2
    { categoria_id: c2[0], codigo: '01.01', descricao: 'Limpeza e preparo do terreno', preco_total: 12000, preco_unitario: 18, quantidade: 667, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c2[0], codigo: '01.02', descricao: 'Tapume, barracão e instalações provisórias', preco_total: 18000, preco_unitario: 180, quantidade: 100, unidade: 'm', usa_subitens: false, concluida: true },
    { categoria_id: c2[0], codigo: '01.03', descricao: 'Locação da obra', preco_total: 5000, preco_unitario: 5000, quantidade: 1, unidade: 'vb', usa_subitens: false, concluida: true },
    { categoria_id: c2[1], codigo: '02.01', descricao: 'Escavação mecânica', preco_total: 28000, preco_unitario: 48, quantidade: 583, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: c2[1], codigo: '02.02', descricao: 'Concreto armado sapatas e baldrame', preco_total: 52000, preco_unitario: 480, quantidade: 108, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: c2[1], codigo: '02.03', descricao: 'Impermeabilização fundação', preco_total: 15000, preco_unitario: 75, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c2[2], codigo: '03.01', descricao: 'Pilares concreto armado', preco_total: 62000, preco_unitario: 520, quantidade: 119, unidade: 'un', usa_subitens: false, concluida: true, peso_cronograma: 30 },
    { categoria_id: c2[2], codigo: '03.02', descricao: 'Vigas e lajes térreo', preco_total: 55000, preco_unitario: 275, quantidade: 200, unidade: 'm²', usa_subitens: false, concluida: true, peso_cronograma: 25 },
    { categoria_id: c2[2], codigo: '03.03', descricao: 'Vigas e lajes 1º pavimento', preco_total: 48000, preco_unitario: 300, quantidade: 160, unidade: 'm²', usa_subitens: false, concluida: false, peso_cronograma: 25 },
    { categoria_id: c2[2], codigo: '03.04', descricao: 'Escada em concreto', preco_total: 0, preco_unitario: 0, quantidade: 0, unidade: 'vb', usa_subitens: false, concluida: false, peso_cronograma: 20 },

    // Obra 3
    { categoria_id: c3[0], codigo: '01.01', descricao: 'Corte e aterro do terreno', preco_total: 80000, preco_unitario: 28, quantidade: 2857, unidade: 'm³', usa_subitens: false, concluida: true },
    { categoria_id: c3[0], codigo: '01.02', descricao: 'Compactação e nivelamento', preco_total: 40000, preco_unitario: 16, quantidade: 2500, unidade: 'm²', usa_subitens: false, concluida: true },
    { categoria_id: c3[1], codigo: '02.01', descricao: 'Estacas hélice contínua Ø50cm', preco_total: 200000, preco_unitario: 240, quantidade: 833, unidade: 'm', usa_subitens: false, concluida: false, peso_cronograma: 60 },
    { categoria_id: c3[1], codigo: '02.02', descricao: 'Blocos de coroamento', preco_total: 80000, preco_unitario: 2200, quantidade: 36, unidade: 'un', usa_subitens: false, concluida: false, peso_cronograma: 40 },
  ];
  await checkedInsert('orcamento_composicoes', composicoes);

  // ══════════════════════ 3. CUSTO REAL ══════════════════════
  const custoItens = [
    // Obra 1
    { obra_id: obra1Id, company_id: companyId, categoria: 'Demolição e Remoção', descricao: `${DEMO_PREFIX} Demolição completa layout`, fornecedor: 'Demoli Express', valor: 7200, data: daysAgo(70) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Demolição e Remoção', descricao: `${DEMO_PREFIX} Caçambas de entulho (10x)`, fornecedor: 'Caçambas SP', valor: 7500, data: daysAgo(65) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Elétrica e Automação', descricao: `${DEMO_PREFIX} Material elétrico completo`, fornecedor: 'Eletro House', valor: 15800, data: daysAgo(50) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Elétrica e Automação', descricao: `${DEMO_PREFIX} Mão de obra elétrica`, fornecedor: 'Eletricista Renato MEI', valor: 12500, data: daysAgo(40) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Elétrica e Automação', descricao: `${DEMO_PREFIX} Central automação + módulos`, fornecedor: 'SmartHome Automação', valor: 14200, data: daysAgo(35) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Hidráulica', descricao: `${DEMO_PREFIX} Tubulação PPR água quente`, fornecedor: 'Hidro Center', valor: 8500, data: daysAgo(48) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Hidráulica', descricao: `${DEMO_PREFIX} Mão de obra hidráulica`, fornecedor: 'Encanador José', valor: 9800, data: daysAgo(38) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Gesso e Forro', descricao: `${DEMO_PREFIX} Forro e sancas`, fornecedor: 'Gesso Premium', valor: 19500, data: daysAgo(20) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Revestimentos e Pisos', descricao: `${DEMO_PREFIX} Porcelanato Portobello 80x80`, fornecedor: 'Portobello Shop SP', valor: 32000, data: daysAgo(10) },
    { obra_id: obra1Id, company_id: companyId, categoria: 'Revestimentos e Pisos', descricao: `${DEMO_PREFIX} Mão de obra assentamento`, fornecedor: 'Marmorista Antônio', valor: 8500, data: daysAgo(5) },

    // Obra 2
    { obra_id: obra2Id, company_id: companyId, categoria: 'Serviços Preliminares', descricao: `${DEMO_PREFIX} Limpeza e preparo terreno`, fornecedor: 'Terraplanagem Martins', valor: 14500, data: daysAgo(115) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Serviços Preliminares', descricao: `${DEMO_PREFIX} Tapume e barracão`, fornecedor: 'Canteiro Rápido', valor: 19000, data: daysAgo(110) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Escavação mecânica`, fornecedor: 'Terraplanagem Martins', valor: 30000, data: daysAgo(95) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Concreto usinado fundação`, fornecedor: 'Engemix Concreto', valor: 55000, data: daysAgo(80) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Impermeabilização manta asfáltica`, fornecedor: 'Vedacit Distribuidor', valor: 16500, data: daysAgo(70) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Aço CA-50 diversas bitolas`, fornecedor: 'Gerdau Distribuidor', valor: 42000, data: daysAgo(55) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Concreto usinado pilares/vigas`, fornecedor: 'Engemix Concreto', valor: 48000, data: daysAgo(40) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Fôrmas de madeira`, fornecedor: 'Madeireira São José', valor: 18000, data: daysAgo(50) },
    { obra_id: obra2Id, company_id: companyId, categoria: 'Alvenaria e Vedação', descricao: `${DEMO_PREFIX} Blocos cerâmicos', fornecedor: 'Cerâmica Barueri`, valor: 12000, data: daysAgo(15) },

    // Obra 3
    { obra_id: obra3Id, company_id: companyId, categoria: 'Terraplenagem', descricao: `${DEMO_PREFIX} Corte e aterro mecanizado`, fornecedor: 'MoviTerra Ltda', valor: 85000, data: daysAgo(50) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Terraplenagem', descricao: `${DEMO_PREFIX} Compactação solo`, fornecedor: 'MoviTerra Ltda', valor: 38000, data: daysAgo(35) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Fundação Profunda', descricao: `${DEMO_PREFIX} Mobilização perfuratriz`, fornecedor: 'Estacas Brasil', valor: 45000, data: daysAgo(25) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Fundação Profunda', descricao: `${DEMO_PREFIX} Estacas hélice - Etapa 1`, fornecedor: 'Estacas Brasil', valor: 95000, data: daysAgo(15) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Projetos', descricao: `${DEMO_PREFIX} Projeto arquitetônico`, fornecedor: 'Arq. Industrial', valor: 45000, data: daysAgo(55) },
    { obra_id: obra3Id, company_id: companyId, categoria: 'Projetos', descricao: `${DEMO_PREFIX} Projeto estrutural metálico`, fornecedor: 'Calc Steel Eng.', valor: 38000, data: daysAgo(45) },

    // Obra 4
    { obra_id: obra4Id, company_id: companyId, categoria: 'Serviços Preliminares', descricao: `${DEMO_PREFIX} Canteiro e limpeza terreno`, fornecedor: 'Construtora Litoral', valor: 30000, data: daysAgo(235) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Fundação', descricao: `${DEMO_PREFIX} Fundação completa`, fornecedor: 'Construtora Litoral', valor: 82000, data: daysAgo(195) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Estrutura', descricao: `${DEMO_PREFIX} Estrutura concreto armado`, fornecedor: 'Concretal Bertioga', valor: 130000, data: daysAgo(150) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Alvenaria e Cobertura', descricao: `${DEMO_PREFIX} Alvenaria e telhado colonial`, fornecedor: 'Construtora Litoral', valor: 95000, data: daysAgo(100) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Instalações', descricao: `${DEMO_PREFIX} Elétrica e hidráulica completa`, fornecedor: 'Multi Instalações', valor: 72000, data: daysAgo(65) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Revestimentos e Pisos', descricao: `${DEMO_PREFIX} Porcelanato e cerâmica`, fornecedor: 'Cerâmica Riviera', valor: 88000, data: daysAgo(35) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Pintura', descricao: `${DEMO_PREFIX} Pintura interna e externa`, fornecedor: 'Pinturas Costa', valor: 34000, data: daysAgo(12) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Piscina e Área Externa', descricao: `${DEMO_PREFIX} Piscina borda infinita`, fornecedor: 'Piscinas Premium', valor: 68000, data: daysAgo(20) },
    { obra_id: obra4Id, company_id: companyId, categoria: 'Piscina e Área Externa', descricao: `${DEMO_PREFIX} Paisagismo e deck`, fornecedor: 'Verde Jardins', valor: 28000, data: daysAgo(8) },
  ];
  await checkedInsert('custo_real_itens', custoItens);

  // ══════════════════════ 4. MATERIAIS ══════════════════════
  const mat = Array.from({ length: 22 }, () => demoId());
  const materiais = [
    // Obra 1
    { id: mat[0], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Porcelanato Portobello 80x80 Cinza`, unidade: 'm²', categoria: 'Acabamento', estoque_atual: 12, estoque_minimo: 5, localizacao: 'Apartamento' },
    { id: mat[1], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Mármore Carrara polido`, unidade: 'm²', categoria: 'Acabamento', estoque_atual: 2, estoque_minimo: 8, localizacao: 'Depósito condomínio' },
    { id: mat[2], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Argamassa colante ACIII flexível`, unidade: 'saco', categoria: 'Cimento', estoque_atual: 5, estoque_minimo: 10, localizacao: 'Apartamento' },
    { id: mat[3], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Tinta Suvinil Acrílico Premium`, unidade: 'lata 18L', categoria: 'Pintura', estoque_atual: 0, estoque_minimo: 6, localizacao: 'A comprar' },
    // Obra 2
    { id: mat[4], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, unidade: 'saco', categoria: 'Cimento', estoque_atual: 40, estoque_minimo: 60, localizacao: 'Almoxarifado' },
    { id: mat[5], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, unidade: 'barra', categoria: 'Aço', estoque_atual: 85, estoque_minimo: 50, localizacao: 'Pátio coberto' },
    { id: mat[6], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Areia média`, unidade: 'm³', categoria: 'Agregados', estoque_atual: 3, estoque_minimo: 8, localizacao: 'Pátio' },
    { id: mat[7], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Brita 1`, unidade: 'm³', categoria: 'Agregados', estoque_atual: 2, estoque_minimo: 6, localizacao: 'Pátio' },
    { id: mat[8], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Bloco cerâmico 14x19x39`, unidade: 'un', categoria: 'Alvenaria', estoque_atual: 3500, estoque_minimo: 1000, localizacao: 'Pátio' },
    { id: mat[9], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Madeira para fôrma (tábua)`, unidade: 'm²', categoria: 'Madeira', estoque_atual: 30, estoque_minimo: 20, localizacao: 'Galpão' },
    { id: mat[10], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Arame recozido`, unidade: 'kg', categoria: 'Aço', estoque_atual: 5, estoque_minimo: 15, localizacao: 'Almoxarifado' },
    { id: mat[11], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Prego 18x27`, unidade: 'kg', categoria: 'Ferragens', estoque_atual: 8, estoque_minimo: 5, localizacao: 'Almoxarifado' },
    // Obra 3
    { id: mat[12], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Concreto usinado fck 30`, unidade: 'm³', categoria: 'Concreto', estoque_atual: 0, estoque_minimo: 0, localizacao: 'Sob demanda' },
    { id: mat[13], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Aço CA-50 16mm`, unidade: 'barra', categoria: 'Aço', estoque_atual: 120, estoque_minimo: 80, localizacao: 'Pátio' },
    { id: mat[14], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Cascalho para base`, unidade: 'm³', categoria: 'Agregados', estoque_atual: 15, estoque_minimo: 30, localizacao: 'Terreno' },
    // Obra 4
    { id: mat[15], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Tinta acrílica branca 18L`, unidade: 'lata', categoria: 'Pintura', estoque_atual: 3, estoque_minimo: 0, localizacao: 'Garagem' },
    { id: mat[16], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Rejunte flexível branco`, unidade: 'saco 5kg', categoria: 'Acabamento', estoque_atual: 4, estoque_minimo: 2, localizacao: 'Garagem' },
    { id: mat[17], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Silicone acético transparente`, unidade: 'tubo', categoria: 'Acabamento', estoque_atual: 6, estoque_minimo: 3, localizacao: 'Garagem' },
  ];
  await checkedInsert('materiais', materiais);

  const movimentacoes = [
    { obra_id: obra1Id, company_id: companyId, material_id: mat[0], material_nome: `${DEMO_PREFIX} Porcelanato Portobello 80x80`, quantidade: 110, tipo: 'entrada' as const, data: daysAgo(12), responsavel: 'Camila', origem_destino: 'Portobello Shop SP' },
    { obra_id: obra1Id, company_id: companyId, material_id: mat[0], material_nome: `${DEMO_PREFIX} Porcelanato Portobello 80x80`, quantidade: 98, tipo: 'saida' as const, data: daysAgo(5), responsavel: 'Antônio', origem_destino: 'Salas e corredor' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[4], material_nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, quantidade: 120, tipo: 'entrada' as const, data: daysAgo(30), responsavel: 'Paulo', origem_destino: 'DepMat Barueri' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[4], material_nome: `${DEMO_PREFIX} Cimento CP-II 50kg`, quantidade: 80, tipo: 'saida' as const, data: daysAgo(15), responsavel: 'Pedro', origem_destino: 'Concreto virado alvenaria' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[5], material_nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, quantidade: 200, tipo: 'entrada' as const, data: daysAgo(55), responsavel: 'Paulo', origem_destino: 'Gerdau' },
    { obra_id: obra2Id, company_id: companyId, material_id: mat[5], material_nome: `${DEMO_PREFIX} Vergalhão CA-50 10mm`, quantidade: 115, tipo: 'saida' as const, data: daysAgo(25), responsavel: 'José', origem_destino: 'Armação pilares e vigas' },
    { obra_id: obra3Id, company_id: companyId, material_id: mat[13], material_nome: `${DEMO_PREFIX} Aço CA-50 16mm`, quantidade: 200, tipo: 'entrada' as const, data: daysAgo(20), responsavel: 'Marcos', origem_destino: 'Gerdau Industrial' },
    { obra_id: obra3Id, company_id: companyId, material_id: mat[13], material_nome: `${DEMO_PREFIX} Aço CA-50 16mm`, quantidade: 80, tipo: 'saida' as const, data: daysAgo(10), responsavel: 'Carlos', origem_destino: 'Armação blocos fundação' },
  ];
  await checkedInsert('movimentacoes', movimentacoes);

  // ══════════════════════ 5. DIÁRIO DE OBRA ══════════════════════
  const diarios = [
    // Obra 1 — últimos 10 dias
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(9), clima: 'sol' as const, trabalhadores: 6, servicos_executados: `${DEMO_PREFIX} Conclusão forro de gesso sala de estar. Início instalação sancas iluminação indireta.`, problemas: null, observacoes: 'Cliente visitou e aprovou acabamento do gesso.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(8), clima: 'sol' as const, trabalhadores: 7, servicos_executados: `${DEMO_PREFIX} Sancas concluídas nos quartos. Teste de pontos elétricos com eletricista.`, problemas: null, observacoes: 'Todos os pontos OK.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(7), clima: 'nublado' as const, trabalhadores: 5, servicos_executados: `${DEMO_PREFIX} Recebimento do porcelanato Portobello. Preparação do contrapiso para assentamento.`, problemas: null, observacoes: '110m² recebidos. Conferido com NF.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(6), clima: 'sol' as const, trabalhadores: 4, servicos_executados: `${DEMO_PREFIX} Início assentamento porcelanato sala de estar - 35m².`, problemas: null, observacoes: 'Marmorista Antônio e ajudante.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(5), clima: 'sol' as const, trabalhadores: 4, servicos_executados: `${DEMO_PREFIX} Continuação porcelanato sala e corredor - mais 30m².`, problemas: 'Argamassa ACIII acabando. Solicitar reposição urgente.', observacoes: null, status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(4), clima: 'chuva' as const, trabalhadores: 4, servicos_executados: `${DEMO_PREFIX} Assentamento porcelanato corredor e cozinha - 33m². Total concluído: 98m².`, problemas: null, observacoes: 'Trabalho interno, chuva não afetou produtividade.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(3), clima: 'sol' as const, trabalhadores: 3, servicos_executados: `${DEMO_PREFIX} Início marcenaria - medição final dos módulos cozinha. Conferência de projeto com designer.`, problemas: 'Discrepância de 2cm no vão do forno de embutir. Ajuste necessário.', observacoes: 'Marceneiro informou prazo de 20 dias para produção.', status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(2), clima: 'sol' as const, trabalhadores: 2, servicos_executados: `${DEMO_PREFIX} Rejuntamento porcelanato salas concluído. Preparação paredes banheiro master para mármore.`, problemas: null, observacoes: null, status: 'aprovado' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(1), clima: 'nublado' as const, trabalhadores: 3, servicos_executados: `${DEMO_PREFIX} Início assentamento mármore Carrara banheiro suíte master. Recortes na bancada.`, problemas: 'Estoque de mármore abaixo do necessário. Faltam 6m².', observacoes: 'Solicitar reposição na Marmoraria Delta.', status: 'pendente' as const },
    { obra_id: obra1Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(0), clima: 'sol' as const, trabalhadores: 3, servicos_executados: `${DEMO_PREFIX} Continuação mármore banheiro. Instalação de ralos lineares.`, problemas: null, observacoes: null, status: 'pendente' as const },

    // Obra 2 — últimos 8 dias
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(7), clima: 'sol' as const, trabalhadores: 12, servicos_executados: `${DEMO_PREFIX} Concretagem laje do térreo - 160m². Bomba lança 28m. 45m³ concreto.`, problemas: null, observacoes: 'Excelente rendimento. Concreto entregue pontualmente.', status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(6), clima: 'sol' as const, trabalhadores: 8, servicos_executados: `${DEMO_PREFIX} Cura da laje com molhamento. Início desforma pilares térreo.`, problemas: null, observacoes: null, status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(5), clima: 'nublado' as const, trabalhadores: 10, servicos_executados: `${DEMO_PREFIX} Armação de vigas V1 a V8 do 1º pav. Corte e dobra de aço.`, problemas: null, observacoes: 'Arame recozido com estoque baixo - providenciar compra.', status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(4), clima: 'chuva' as const, trabalhadores: 5, servicos_executados: `${DEMO_PREFIX} Serviços internos. Corte aço no galpão. Conferência de projeto.`, problemas: 'Chuva forte impediu trabalho externo pela manhã.', observacoes: 'Retomada normal à tarde.', status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(3), clima: 'sol' as const, trabalhadores: 11, servicos_executados: `${DEMO_PREFIX} Montagem fôrmas vigas 1º pav. Início alvenaria térreo - fachada lateral.`, problemas: null, observacoes: '450 blocos assentados.', status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(2), clima: 'sol' as const, trabalhadores: 11, servicos_executados: `${DEMO_PREFIX} Alvenaria térreo continuação. Passagem de eletrodutos nas paredes.`, problemas: null, observacoes: null, status: 'aprovado' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(1), clima: 'sol' as const, trabalhadores: 10, servicos_executados: `${DEMO_PREFIX} Alvenaria fachada frontal e lateral direita. Vergas e contravergas.`, problemas: 'Cimento abaixo do mínimo. Compra solicitada.', observacoes: null, status: 'pendente' as const },
    { obra_id: obra2Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(0), clima: 'nublado' as const, trabalhadores: 9, servicos_executados: `${DEMO_PREFIX} Continuação alvenaria interna. Conferência de esquadrias com projeto.`, problemas: null, observacoes: 'Previsão de chuva para amanhã.', status: 'pendente' as const },

    // Obra 3 — últimos 5 dias
    { obra_id: obra3Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(4), clima: 'sol' as const, trabalhadores: 18, servicos_executados: `${DEMO_PREFIX} Perfuração de estacas - setor B. 12 estacas executadas (profundidade média 14m).`, problemas: null, observacoes: 'Produção acima da meta diária.', status: 'aprovado' as const },
    { obra_id: obra3Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(3), clima: 'sol' as const, trabalhadores: 16, servicos_executados: `${DEMO_PREFIX} Perfuração setor C - 10 estacas. Arrasamento estacas setor A.`, problemas: 'Solo com matacão em 2 pontos. Necessário reposicionar estacas.', observacoes: 'Engenheiro geotécnico consultado.', status: 'aprovado' as const },
    { obra_id: obra3Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(2), clima: 'nublado' as const, trabalhadores: 15, servicos_executados: `${DEMO_PREFIX} Conclusão perfuração setor C. Início armação blocos de coroamento.`, problemas: null, observacoes: null, status: 'aprovado' as const },
    { obra_id: obra3Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(1), clima: 'sol' as const, trabalhadores: 14, servicos_executados: `${DEMO_PREFIX} Fôrmas e armação blocos setor A. Recebimento concreto para arrasamento.`, problemas: null, observacoes: 'Concreto fck 30 conforme especificação.', status: 'pendente' as const },
    { obra_id: obra3Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(0), clima: 'sol' as const, trabalhadores: 16, servicos_executados: `${DEMO_PREFIX} Concretagem 8 blocos setor A. Armação blocos setor B.`, problemas: null, observacoes: 'Previsão de concluir fundação em 2 semanas.', status: 'pendente' as const },

    // Obra 4 — fase final
    { obra_id: obra4Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(5), clima: 'sol' as const, trabalhadores: 6, servicos_executados: `${DEMO_PREFIX} Pintura final fachada lateral. Rejuntamento deck de madeira piscina.`, problemas: null, observacoes: 'Pintura ficou excelente. Cor aprovada pelo cliente.', status: 'aprovado' as const },
    { obra_id: obra4Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(4), clima: 'sol' as const, trabalhadores: 5, servicos_executados: `${DEMO_PREFIX} Instalação de louças e metais banheiro suíte 3. Teste hidráulico geral.`, problemas: 'Pequeno vazamento no registro da suíte 2. Corrigido.', observacoes: null, status: 'aprovado' as const },
    { obra_id: obra4Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(3), clima: 'nublado' as const, trabalhadores: 4, servicos_executados: `${DEMO_PREFIX} Limpeza grossa. Remoção de entulho restante. Vistoria de acabamentos.`, problemas: 'Retoque necessário em 3 pontos de pintura interna.', observacoes: 'Lista de pendências de entrega elaborada.', status: 'aprovado' as const },
    { obra_id: obra4Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(2), clima: 'sol' as const, trabalhadores: 4, servicos_executados: `${DEMO_PREFIX} Retoques de pintura. Regulagem de esquadrias. Teste elétrico completo.`, problemas: null, observacoes: 'Todas as tomadas e circuitos OK.', status: 'aprovado' as const },
    { obra_id: obra4Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(1), clima: 'sol' as const, trabalhadores: 3, servicos_executados: `${DEMO_PREFIX} Limpeza fina completa. Preparação para vistoria do cliente.`, problemas: null, observacoes: 'Vistoria do cliente agendada para sexta-feira.', status: 'pendente' as const },
    { obra_id: obra4Id, user_id: userId, usuario_nome: 'Demo Gestor', data: daysAgo(0), clima: 'sol' as const, trabalhadores: 2, servicos_executados: `${DEMO_PREFIX} Paisagismo finalizado. Enchimento piscina. Teste do sistema de filtragem.`, problemas: null, observacoes: 'Casa pronta para entrega.', status: 'pendente' as const },
  ];
  await checkedInsert('diario_registros', diarios);

  // ══════════════════════ 6. PAGAMENTOS ══════════════════════
  const pag = Array.from({ length: 45 }, () => demoId());
  const pagamentos = [
    // Obra 1
    { id: pag[0], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Demolição e remoção de entulho`, tipo_pagamento: 'servico' as const, valor_previsto: 14700, data_vencimento: daysAgo(65), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Demoli Express', data_pagamento: daysAgo(65), etapa_orcamento: 'Demolição e Remoção' },
    { id: pag[1], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Material elétrico completo`, tipo_pagamento: 'material' as const, valor_previsto: 15800, data_vencimento: daysAgo(48), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Eletro House', data_pagamento: daysAgo(48), etapa_orcamento: 'Elétrica e Automação' },
    { id: pag[2], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Automação residencial`, tipo_pagamento: 'servico' as const, valor_previsto: 14200, valor_parcela: 7100, data_vencimento: daysAgo(33), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'SmartHome Automação', numero_parcela: 1, total_parcelas: 2, data_pagamento: daysAgo(33), etapa_orcamento: 'Elétrica e Automação' },
    { id: pag[3], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Automação - Parcela 2/2`, tipo_pagamento: 'servico' as const, valor_previsto: 14200, valor_parcela: 7100, data_vencimento: daysFromNow(3), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'SmartHome Automação', numero_parcela: 2, total_parcelas: 2, etapa_orcamento: 'Elétrica e Automação' },
    { id: pag[4], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Tubulação PPR água quente`, tipo_pagamento: 'material' as const, valor_previsto: 8500, data_vencimento: daysAgo(45), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Hidro Center', data_pagamento: daysAgo(45), etapa_orcamento: 'Hidráulica' },
    { id: pag[5], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Gesso e sancas`, tipo_pagamento: 'servico' as const, valor_previsto: 19500, data_vencimento: daysAgo(15), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Gesso Premium', data_pagamento: daysAgo(15), etapa_orcamento: 'Gesso e Forro' },
    { id: pag[6], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Porcelanato Portobello`, tipo_pagamento: 'material' as const, valor_previsto: 32000, valor_parcela: 10666.67, data_vencimento: daysAgo(8), status: 'pago' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Portobello Shop SP', numero_parcela: 1, total_parcelas: 3, data_pagamento: daysAgo(8), etapa_orcamento: 'Revestimentos e Pisos' },
    { id: pag[7], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Portobello - Parcela 2/3`, tipo_pagamento: 'material' as const, valor_previsto: 32000, valor_parcela: 10666.67, data_vencimento: daysFromNow(22), status: 'previsto' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Portobello Shop SP', numero_parcela: 2, total_parcelas: 3, etapa_orcamento: 'Revestimentos e Pisos' },
    { id: pag[8], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Portobello - Parcela 3/3`, tipo_pagamento: 'material' as const, valor_previsto: 32000, valor_parcela: 10666.66, data_vencimento: daysFromNow(52), status: 'previsto' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Portobello Shop SP', numero_parcela: 3, total_parcelas: 3, etapa_orcamento: 'Revestimentos e Pisos' },
    { id: pag[9], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Mão de obra marmorista`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 8500, data_vencimento: daysAgo(2), status: 'atrasado' as const, forma_pagamento: 'pix' as const, fornecedor: 'Marmorista Antônio', etapa_orcamento: 'Revestimentos e Pisos' },
    { id: pag[10], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Marcenaria sob medida - Sinal`, tipo_pagamento: 'servico' as const, valor_previsto: 42500, data_vencimento: daysFromNow(5), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Marcenaria Design', etapa_orcamento: 'Marcenaria' },
    { id: pag[11], obra_id: obra1Id, descricao: `${DEMO_PREFIX} Mármore Carrara - Reposição`, tipo_pagamento: 'material' as const, valor_previsto: 4800, data_vencimento: daysFromNow(3), status: 'previsto' as const, forma_pagamento: 'pix' as const, fornecedor: 'Marmoraria Delta', etapa_orcamento: 'Revestimentos e Pisos' },

    // Obra 2
    { id: pag[12], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Tapume e barracão de obra`, tipo_pagamento: 'servico' as const, valor_previsto: 19000, data_vencimento: daysAgo(108), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Canteiro Rápido', data_pagamento: daysAgo(108) },
    { id: pag[13], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Escavação mecânica`, tipo_pagamento: 'servico' as const, valor_previsto: 30000, data_vencimento: daysAgo(90), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Terraplanagem Martins', data_pagamento: daysAgo(90), etapa_orcamento: 'Fundação' },
    { id: pag[14], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Concreto usinado fundação`, tipo_pagamento: 'material' as const, valor_previsto: 55000, data_vencimento: daysAgo(75), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Engemix Concreto', data_pagamento: daysAgo(75), etapa_orcamento: 'Fundação' },
    { id: pag[15], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Aço CA-50 diversas bitolas`, tipo_pagamento: 'material' as const, valor_previsto: 42000, valor_parcela: 14000, data_vencimento: daysAgo(45), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Gerdau Distribuidor', numero_parcela: 1, total_parcelas: 3, data_pagamento: daysAgo(45), etapa_orcamento: 'Estrutura' },
    { id: pag[16], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Aço - Parcela 2/3`, tipo_pagamento: 'material' as const, valor_previsto: 42000, valor_parcela: 14000, data_vencimento: daysFromNow(5), status: 'previsto' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Gerdau Distribuidor', numero_parcela: 2, total_parcelas: 3, etapa_orcamento: 'Estrutura' },
    { id: pag[17], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Aço - Parcela 3/3`, tipo_pagamento: 'material' as const, valor_previsto: 42000, valor_parcela: 14000, data_vencimento: daysFromNow(35), status: 'previsto' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Gerdau Distribuidor', numero_parcela: 3, total_parcelas: 3, etapa_orcamento: 'Estrutura' },
    { id: pag[18], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Concreto pilares/vigas`, tipo_pagamento: 'material' as const, valor_previsto: 48000, data_vencimento: daysAgo(35), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Engemix Concreto', data_pagamento: daysAgo(35), etapa_orcamento: 'Estrutura' },
    { id: pag[19], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Mão de obra - Quinzena`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 28000, data_vencimento: daysAgo(3), status: 'atrasado' as const, forma_pagamento: 'transferencia' as const, fornecedor: null, observacoes: 'Aguardando medição aprovada' },
    { id: pag[20], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Blocos cerâmicos`, tipo_pagamento: 'material' as const, valor_previsto: 12000, data_vencimento: daysAgo(12), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Cerâmica Barueri', data_pagamento: daysAgo(12), etapa_orcamento: 'Alvenaria e Vedação' },
    { id: pag[21], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Fôrmas de madeira`, tipo_pagamento: 'material' as const, valor_previsto: 18000, data_vencimento: daysAgo(48), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Madeireira São José', data_pagamento: daysAgo(48), etapa_orcamento: 'Estrutura' },
    { id: pag[22], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Aluguel betoneira - Abril`, tipo_pagamento: 'aluguel' as const, valor_previsto: 3500, data_vencimento: daysFromNow(2), status: 'previsto' as const, forma_pagamento: 'pix' as const, fornecedor: 'LocaMaq' },
    { id: pag[23], obra_id: obra2Id, descricao: `${DEMO_PREFIX} Engenheiro residente - Abril`, tipo_pagamento: 'servico' as const, valor_previsto: 9500, data_vencimento: daysFromNow(15), status: 'previsto' as const, forma_pagamento: 'transferencia' as const },

    // Obra 3
    { id: pag[24], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Terraplenagem completa`, tipo_pagamento: 'servico' as const, valor_previsto: 123000, data_vencimento: daysAgo(25), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'MoviTerra Ltda', data_pagamento: daysAgo(25), etapa_orcamento: 'Terraplenagem' },
    { id: pag[25], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Mobilização perfuratriz`, tipo_pagamento: 'servico' as const, valor_previsto: 45000, data_vencimento: daysAgo(22), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Estacas Brasil', data_pagamento: daysAgo(22), etapa_orcamento: 'Fundação Profunda' },
    { id: pag[26], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Estacas - Medição 1`, tipo_pagamento: 'servico' as const, valor_previsto: 95000, data_vencimento: daysAgo(10), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Estacas Brasil', data_pagamento: daysAgo(10), etapa_orcamento: 'Fundação Profunda' },
    { id: pag[27], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Estacas - Medição 2`, tipo_pagamento: 'servico' as const, valor_previsto: 95000, data_vencimento: daysFromNow(8), status: 'previsto' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Estacas Brasil', etapa_orcamento: 'Fundação Profunda' },
    { id: pag[28], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Projeto arquitetônico`, tipo_pagamento: 'servico' as const, valor_previsto: 45000, data_vencimento: daysAgo(50), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Arq. Industrial', data_pagamento: daysAgo(50) },
    { id: pag[29], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Projeto estrutural`, tipo_pagamento: 'servico' as const, valor_previsto: 38000, data_vencimento: daysAgo(40), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Calc Steel Eng.', data_pagamento: daysAgo(40) },
    { id: pag[30], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Aço CA-50 16mm`, tipo_pagamento: 'material' as const, valor_previsto: 55000, data_vencimento: daysAgo(15), status: 'pago' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Gerdau Industrial', data_pagamento: daysAgo(15), etapa_orcamento: 'Fundação Profunda' },
    { id: pag[31], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Concreto fck 30 - Blocos`, tipo_pagamento: 'material' as const, valor_previsto: 35000, data_vencimento: daysFromNow(5), status: 'previsto' as const, forma_pagamento: 'boleto' as const, fornecedor: 'Concreteira Regional', etapa_orcamento: 'Fundação Profunda' },
    { id: pag[32], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Mão de obra - Abril`, tipo_pagamento: 'mao_de_obra' as const, valor_previsto: 45000, data_vencimento: daysFromNow(10), status: 'previsto' as const, forma_pagamento: 'transferencia' as const },
    { id: pag[33], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Aluguel retroescavadeira`, tipo_pagamento: 'aluguel' as const, valor_previsto: 8500, data_vencimento: daysAgo(5), status: 'atrasado' as const, forma_pagamento: 'boleto' as const, fornecedor: 'LocaMaq Industrial' },
    { id: pag[34], obra_id: obra3Id, descricao: `${DEMO_PREFIX} Estrutura metálica - Sinal 30%`, tipo_pagamento: 'material' as const, valor_previsto: 156000, data_vencimento: daysFromNow(15), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'MetalStruct', etapa_orcamento: 'Estrutura Metálica' },

    // Obra 4
    { id: pag[35], obra_id: obra4Id, descricao: `${DEMO_PREFIX} Pintura interna e externa`, tipo_pagamento: 'servico' as const, valor_previsto: 34000, data_vencimento: daysAgo(8), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Pinturas Costa', data_pagamento: daysAgo(8), etapa_orcamento: 'Pintura' },
    { id: pag[36], obra_id: obra4Id, descricao: `${DEMO_PREFIX} Piscina borda infinita`, tipo_pagamento: 'servico' as const, valor_previsto: 68000, valor_parcela: 34000, data_vencimento: daysAgo(15), status: 'pago' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Piscinas Premium', numero_parcela: 1, total_parcelas: 2, data_pagamento: daysAgo(15), etapa_orcamento: 'Piscina e Área Externa' },
    { id: pag[37], obra_id: obra4Id, descricao: `${DEMO_PREFIX} Piscina - Parcela 2/2`, tipo_pagamento: 'servico' as const, valor_previsto: 68000, valor_parcela: 34000, data_vencimento: daysFromNow(5), status: 'previsto' as const, forma_pagamento: 'transferencia' as const, fornecedor: 'Piscinas Premium', numero_parcela: 2, total_parcelas: 2, etapa_orcamento: 'Piscina e Área Externa' },
    { id: pag[38], obra_id: obra4Id, descricao: `${DEMO_PREFIX} Paisagismo e deck`, tipo_pagamento: 'servico' as const, valor_previsto: 28000, data_vencimento: daysAgo(5), status: 'pago' as const, forma_pagamento: 'pix' as const, fornecedor: 'Verde Jardins', data_pagamento: daysAgo(5), etapa_orcamento: 'Piscina e Área Externa' },
    { id: pag[39], obra_id: obra4Id, descricao: `${DEMO_PREFIX} Louças e metais Deca`, tipo_pagamento: 'material' as const, valor_previsto: 22000, data_vencimento: daysAgo(12), status: 'pago' as const, forma_pagamento: 'cartao' as const, fornecedor: 'Deca Loja', data_pagamento: daysAgo(12) },
    { id: pag[40], obra_id: obra4Id, descricao: `${DEMO_PREFIX} Limpeza final profissional`, tipo_pagamento: 'servico' as const, valor_previsto: 4500, data_vencimento: daysFromNow(3), status: 'previsto' as const, forma_pagamento: 'pix' as const, fornecedor: 'CleanPro' },
    { id: pag[41], obra_id: obra4Id, descricao: `${DEMO_PREFIX} Vistoria e habite-se`, tipo_pagamento: 'servico' as const, valor_previsto: 5500, data_vencimento: daysFromNow(10), status: 'previsto' as const, forma_pagamento: 'boleto' as const },
  ];
  await checkedInsert('pagamentos', pagamentos);

  // ══════════════════════ 7. PENDÊNCIAS ══════════════════════
  const pendencias = [
    // Obra 1 — muitas pendências (cliente exigente)
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Aprovar cor da marcenaria com cliente`, descricao: 'Cliente quer ver amostra do laminado Nogueira antes de aprovar produção', tipo: 'orcamento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(2) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Repor mármore Carrara (6m² faltante)`, descricao: 'Estoque insuficiente para finalizar banheiro suíte master', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(3) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Repor argamassa ACIII flexível`, descricao: 'Estoque abaixo do mínimo, necessário para continuação dos pisos', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'em_andamento' as const, data_limite: daysFromNow(1), observacao_interna: 'Pedido feito na DepMat, entrega amanhã' },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Pagar marmorista Antônio (atrasado)`, descricao: 'Pagamento de R$ 8.500 vencido há 2 dias', tipo: 'pagamento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysAgo(2) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Definir modelo de cubas com designer`, tipo: 'orcamento' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(7) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Agendar vistoria do condomínio`, descricao: 'Necessário para liberação do elevador de serviço', tipo: 'documento' as const, prioridade: 'media' as const, status: 'em_andamento' as const, data_limite: daysFromNow(5) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Solicitar tinta Suvinil Premium`, descricao: '6 latas de 18L necessárias, estoque zerado', tipo: 'custo' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(10) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Aprovar projeto de iluminação final`, tipo: 'documento' as const, prioridade: 'baixa' as const, status: 'resolvida' as const, data_limite: daysAgo(5) },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Contratar instalador de ar-condicionado`, tipo: 'custo' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(15) },

    // Obra 2
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Comprar cimento (estoque baixo)`, descricao: 'Estoque de 40 sacos, mínimo 60. Alvenaria consumindo rápido.', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(1) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Repor arame recozido`, descricao: 'Estoque de 5kg, mínimo 15kg', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(2) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Cotação telhas coloniais`, descricao: '3 cotações necessárias. Cobertura prevista para iniciar em 15 dias.', tipo: 'orcamento' as const, prioridade: 'media' as const, status: 'em_andamento' as const, data_limite: daysFromNow(10), observacao_interna: '2 cotações recebidas, falta 1' },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Aprovar medição para pagar mão de obra`, descricao: 'Medição da quinzena pendente de aprovação', tipo: 'pagamento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysAgo(1) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Contratar topógrafo para conferência`, tipo: 'custo' as const, prioridade: 'baixa' as const, status: 'resolvida' as const, data_limite: daysAgo(15) },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Solicitar areia e brita`, descricao: 'Agregados abaixo do mínimo', tipo: 'custo' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(3) },

    // Obra 3
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Licenciamento ambiental`, descricao: 'Documentação em análise no órgão ambiental', tipo: 'documento' as const, prioridade: 'alta' as const, status: 'em_andamento' as const, data_limite: daysFromNow(20), observacao_interna: 'Prazo estimado: 15 dias úteis' },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Pagar aluguel retroescavadeira (atrasado)`, descricao: 'R$ 8.500 vencidos há 5 dias', tipo: 'pagamento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysAgo(5) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Contratar vigilância noturna`, descricao: 'Material acumulado no canteiro. Segurança necessária.', tipo: 'custo' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(5) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Aprovar amostra estrutura metálica`, descricao: 'MetalStruct enviará protótipo de conexão', tipo: 'orcamento' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(12) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Seguro all risks da obra`, tipo: 'documento' as const, prioridade: 'media' as const, status: 'em_andamento' as const, data_limite: daysFromNow(10) },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Cotação piso industrial epoxi`, tipo: 'orcamento' as const, prioridade: 'baixa' as const, status: 'aberta' as const, data_limite: daysFromNow(30) },

    // Obra 4
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} Agendar vistoria final com cliente`, descricao: 'Família Nogueira confirmou disponibilidade para sexta', tipo: 'documento' as const, prioridade: 'alta' as const, status: 'em_andamento' as const, data_limite: daysFromNow(3) },
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} Solicitar habite-se na prefeitura`, tipo: 'documento' as const, prioridade: 'alta' as const, status: 'aberta' as const, data_limite: daysFromNow(7) },
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} Entregar manual do proprietário`, descricao: 'Manual com garantias, manutenção preventiva e contatos', tipo: 'documento' as const, prioridade: 'media' as const, status: 'em_andamento' as const, data_limite: daysFromNow(10) },
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} As-built elétrico e hidráulico`, descricao: 'Plantas atualizadas com o executado', tipo: 'documento' as const, prioridade: 'media' as const, status: 'aberta' as const, data_limite: daysFromNow(12) },
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} ART de execução para CREA`, tipo: 'documento' as const, prioridade: 'media' as const, status: 'resolvida' as const, data_limite: daysAgo(10) },
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} Teste do sistema de aquecimento solar`, tipo: 'custo' as const, prioridade: 'baixa' as const, status: 'resolvida' as const, data_limite: daysAgo(3) },
  ];
  await checkedInsert('pendencias', pendencias);

  // ══════════════════════ 8. FORNECEDORES ══════════════════════
  const forn = Array.from({ length: 18 }, () => demoId());
  const fornecedores = [
    // Obra 1
    { id: forn[0], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Portobello Shop SP`, cnpj: '12.345.001/0001-01', email: 'vendas@portobellosp.com', telefone: '(11) 3045-8900', cidade: 'São Paulo', observacoes: 'Parcela em 3x cartão. Entrega em 5 dias úteis.' },
    { id: forn[1], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} SmartHome Automação`, email: 'contato@smarthome.com', telefone: '(11) 99876-5432', cidade: 'São Paulo', observacoes: 'Especialista em automação residencial. Garantia 2 anos.' },
    { id: forn[2], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Gesso Premium`, telefone: '(11) 98765-4321', cidade: 'São Paulo', observacoes: 'R$ 85/m² forro, R$ 120/ml sancas.' },
    { id: forn[3], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Marcenaria Design`, cnpj: '12.345.004/0001-04', email: 'projetos@marcenariadesign.com', telefone: '(11) 3322-4455', cidade: 'Osasco', observacoes: 'Prazo de 20 dias úteis para produção. 50% sinal, 50% entrega.' },
    { id: forn[4], obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Marmoraria Delta`, cnpj: '12.345.005/0001-05', email: 'vendas@marmorariadelta.com', telefone: '(11) 2233-4455', cidade: 'São Paulo', observacoes: 'Carrara polido R$ 600/m². Entrega em 3 dias.' },
    // Obra 2
    { id: forn[5], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Engemix Concreto`, cnpj: '22.345.001/0001-01', email: 'pedidos@engemix.com', telefone: '(11) 4002-8922', cidade: 'Barueri', observacoes: 'Entrega em até 2h. Boleto 28 dias.' },
    { id: forn[6], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Gerdau Distribuidor`, cnpj: '22.345.002/0001-02', email: 'vendas@gerdau.com', telefone: '(11) 3456-7890', cidade: 'Guarulhos', observacoes: 'Parcela em 3x boleto. Entrega semanal.' },
    { id: forn[7], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Terraplanagem Martins`, telefone: '(11) 99888-7766', cidade: 'Barueri', observacoes: 'Equipamento próprio. Parceiro há 5 anos.' },
    { id: forn[8], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Madeireira São José`, cnpj: '22.345.004/0001-04', email: 'vendas@madeirasaojose.com', telefone: '(11) 4567-8901', cidade: 'Mogi das Cruzes' },
    { id: forn[9], obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Cerâmica Barueri`, telefone: '(11) 4321-5678', cidade: 'Barueri', observacoes: 'Blocos cerâmicos com preço competitivo.' },
    // Obra 3
    { id: forn[10], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} MoviTerra Ltda`, cnpj: '33.345.001/0001-01', email: 'contato@moviterra.com', telefone: '(11) 5566-7788', cidade: 'Jundiaí', observacoes: 'Especializada em grandes volumes. Frota própria.' },
    { id: forn[11], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Estacas Brasil`, cnpj: '33.345.002/0001-02', email: 'orcamento@estacasbrasil.com', telefone: '(11) 6677-8899', cidade: 'Campinas', observacoes: 'Hélice contínua e CFA. Perfuratriz própria.' },
    { id: forn[12], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} MetalStruct`, cnpj: '33.345.003/0001-03', email: 'projetos@metalstruct.com', telefone: '(11) 7788-9900', cidade: 'Limeira', observacoes: 'Fabricação e montagem de estrutura metálica. Prazo 60 dias.' },
    { id: forn[13], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Calc Steel Eng.`, email: 'projetos@calcsteel.com', telefone: '(11) 8899-0011', cidade: 'São Paulo', observacoes: 'Referência em projetos industriais.' },
    { id: forn[14], obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} LocaMaq Industrial`, cnpj: '33.345.005/0001-05', email: 'locacao@locamaq.com', telefone: '(11) 3344-5566', cidade: 'Jundiaí', observacoes: 'Retroescavadeiras e guindastes sob demanda.' },
    // Obra 4
    { id: forn[15], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Piscinas Premium`, cnpj: '44.345.001/0001-01', email: 'vendas@piscinaspremium.com', telefone: '(13) 3456-7890', cidade: 'Bertioga', observacoes: 'Especializada em piscinas de alto padrão. Borda infinita.' },
    { id: forn[16], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Verde Jardins`, telefone: '(13) 99876-5432', cidade: 'Bertioga', observacoes: 'Paisagismo completo. Plantas nativas e tropicais.' },
    { id: forn[17], obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Pinturas Costa`, telefone: '(13) 98765-4321', cidade: 'Santos', observacoes: 'Pintura residencial premium. Equipe experiente.' },
  ];
  await checkedInsert('fornecedores', fornecedores);

  // ══════════════════════ 9. PREÇOS FORNECEDORES ══════════════════════
  const precos = [
    { fornecedor_id: forn[0], obra_id: obra1Id, descricao_item_snapshot: 'Porcelanato 80x80 cinza polido', preco_unitario: 289, unidade: 'm²', data_referencia: daysAgo(15), origem_preco: 'compra_real' as const, categoria: 'material' },
    { fornecedor_id: forn[1], obra_id: obra1Id, descricao_item_snapshot: 'Central automação + 12 módulos', preco_unitario: 14200, unidade: 'vb', data_referencia: daysAgo(40), origem_preco: 'compra_real' as const, categoria: 'servico' },
    { fornecedor_id: forn[2], obra_id: obra1Id, descricao_item_snapshot: 'Forro gesso acartonado', preco_unitario: 85, unidade: 'm²', data_referencia: daysAgo(25), origem_preco: 'compra_real' as const, categoria: 'mao_de_obra' },
    { fornecedor_id: forn[3], obra_id: obra1Id, descricao_item_snapshot: 'Cozinha completa sob medida', preco_unitario: 42500, unidade: 'vb', data_referencia: daysAgo(5), origem_preco: 'cotacao' as const, categoria: 'material' },
    { fornecedor_id: forn[4], obra_id: obra1Id, descricao_item_snapshot: 'Mármore Carrara polido', preco_unitario: 600, unidade: 'm²', data_referencia: daysAgo(10), origem_preco: 'compra_real' as const, categoria: 'material' },
    { fornecedor_id: forn[5], obra_id: obra2Id, descricao_item_snapshot: 'Concreto fck 25 MPa', preco_unitario: 420, unidade: 'm³', data_referencia: daysAgo(80), origem_preco: 'compra_real' as const, categoria: 'material' },
    { fornecedor_id: forn[5], obra_id: obra2Id, descricao_item_snapshot: 'Concreto fck 25 MPa', preco_unitario: 435, unidade: 'm³', data_referencia: daysAgo(35), origem_preco: 'compra_real' as const, categoria: 'material', observacoes: 'Reajuste de 3,5%' },
    { fornecedor_id: forn[6], obra_id: obra2Id, descricao_item_snapshot: 'Vergalhão CA-50 10mm', preco_unitario: 44.50, unidade: 'barra 12m', data_referencia: daysAgo(55), origem_preco: 'compra_real' as const, categoria: 'material' },
    { fornecedor_id: forn[10], obra_id: obra3Id, descricao_item_snapshot: 'Terraplenagem corte e aterro', preco_unitario: 30, unidade: 'm³', data_referencia: daysAgo(55), origem_preco: 'compra_real' as const, categoria: 'servico' },
    { fornecedor_id: forn[11], obra_id: obra3Id, descricao_item_snapshot: 'Estaca hélice contínua Ø50cm', preco_unitario: 240, unidade: 'm', data_referencia: daysAgo(25), origem_preco: 'compra_real' as const, categoria: 'servico' },
    { fornecedor_id: forn[12], obra_id: obra3Id, descricao_item_snapshot: 'Estrutura metálica galpão', preco_unitario: 260, unidade: 'm²', data_referencia: daysAgo(10), origem_preco: 'cotacao' as const, categoria: 'material' },
    { fornecedor_id: forn[15], obra_id: obra4Id, descricao_item_snapshot: 'Piscina borda infinita 8x4m', preco_unitario: 68000, unidade: 'vb', data_referencia: daysAgo(25), origem_preco: 'compra_real' as const, categoria: 'servico' },
    { fornecedor_id: forn[16], obra_id: obra4Id, descricao_item_snapshot: 'Paisagismo completo', preco_unitario: 28000, unidade: 'vb', data_referencia: daysAgo(10), origem_preco: 'compra_real' as const, categoria: 'servico' },
  ];
  await checkedInsert('precos_fornecedores', precos);

  // ══════════════════════ 10. AGENDA ══════════════════════
  const agenda = [
    // Obra 1
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Visita cliente para aprovar pisos`, tipo: 'vistoria', data_programada: daysAgo(6), hora_programada: '10:00:00', responsavel: 'Arq. Camila', status: 'concluido' as const, prioridade: 'alta' as const },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Entrega mármore Carrara`, tipo: 'entrega_material', data_programada: daysFromNow(3), hora_programada: '08:00:00', responsavel: 'Marmoraria Delta', status: 'confirmado' as const, prioridade: 'alta' as const },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Medição marcenaria - cozinha`, tipo: 'medicao', data_programada: daysAgo(3), hora_programada: '14:00:00', responsavel: 'Marcenaria Design', status: 'concluido' as const, prioridade: 'media' as const },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Reunião com designer de interiores`, tipo: 'reuniao', data_programada: daysFromNow(2), hora_programada: '15:00:00', responsavel: 'Arq. Camila', status: 'confirmado' as const, prioridade: 'media' as const },
    { obra_id: obra1Id, titulo: `${DEMO_PREFIX} Instalação ar-condicionado`, tipo: 'instalacao', data_programada: daysFromNow(20), hora_programada: '08:00:00', responsavel: 'Clima Perfeito', status: 'programado' as const, prioridade: 'media' as const },

    // Obra 2
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Concretagem laje 1º pavimento`, tipo: 'execucao', data_programada: daysFromNow(7), hora_programada: '07:00:00', responsavel: 'Eng. Paulo', status: 'confirmado' as const, prioridade: 'alta' as const, descricao: 'Bomba lança 28m. Previsão 50m³.' },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Reunião de medição quinzenal`, tipo: 'reuniao', data_programada: daysAgo(1), hora_programada: '16:00:00', responsavel: 'Eng. Paulo', status: 'atrasado' as const, prioridade: 'alta' as const },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Entrega telhas coloniais`, tipo: 'entrega_material', data_programada: daysFromNow(18), hora_programada: '08:00:00', responsavel: 'Telhas SP', status: 'programado' as const, prioridade: 'media' as const },
    { obra_id: obra2Id, titulo: `${DEMO_PREFIX} Vistoria fundação com calculista`, tipo: 'vistoria', data_programada: daysAgo(60), hora_programada: '10:00:00', responsavel: 'Eng. Estrutural', status: 'concluido' as const, prioridade: 'alta' as const },

    // Obra 3
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Ensaio de integridade estacas`, tipo: 'ensaio', data_programada: daysFromNow(5), hora_programada: '09:00:00', responsavel: 'Lab. Geotécnico', status: 'confirmado' as const, prioridade: 'alta' as const },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Reunião MetalStruct - projeto`, tipo: 'reuniao', data_programada: daysFromNow(10), hora_programada: '14:00:00', responsavel: 'Eng. Marcos', status: 'programado' as const, prioridade: 'media' as const },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Visita fiscal ambiental`, tipo: 'vistoria', data_programada: daysFromNow(15), hora_programada: '10:00:00', responsavel: 'Consultoria Ambiental', status: 'programado' as const, prioridade: 'alta' as const },
    { obra_id: obra3Id, titulo: `${DEMO_PREFIX} Entrega concreto para blocos`, tipo: 'entrega_material', data_programada: daysFromNow(3), hora_programada: '07:00:00', responsavel: 'Concreteira Regional', status: 'confirmado' as const, prioridade: 'alta' as const },

    // Obra 4
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} Vistoria final com cliente`, tipo: 'vistoria', data_programada: daysFromNow(3), hora_programada: '10:00:00', responsavel: 'Eng. Roberto', status: 'confirmado' as const, prioridade: 'alta' as const, descricao: 'Família Nogueira vem de SP para vistoria.' },
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} Limpeza profissional`, tipo: 'execucao', data_programada: daysFromNow(1), hora_programada: '08:00:00', responsavel: 'CleanPro', status: 'confirmado' as const, prioridade: 'alta' as const },
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} Entrega de chaves`, tipo: 'administrativo', data_programada: daysFromNow(10), hora_programada: '16:00:00', responsavel: 'Eng. Roberto', status: 'programado' as const, prioridade: 'alta' as const },
    { obra_id: obra4Id, titulo: `${DEMO_PREFIX} Foto profissional da obra concluída`, tipo: 'outro', data_programada: daysFromNow(8), hora_programada: '09:00:00', responsavel: 'Fotógrafo Studio', status: 'programado' as const, prioridade: 'baixa' as const },
  ];
  await checkedInsert('obra_agenda', agenda, true);

  // ══════════════════════ 11. DOCUMENTOS ══════════════════════
  const documentos = [
    // Obra 1
    { obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Contrato de Reforma`, categoria: 'Contratos', descricao: 'Contrato assinado com clientes Fernanda e Ricardo Azevedo', arquivo_url: '', arquivo_nome: 'contrato-reforma-itaim.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 245000, created_by: userId },
    { obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Projeto de Iluminação`, categoria: 'Projetos', descricao: 'Projeto luminotécnico aprovado pelo designer', arquivo_url: '', arquivo_nome: 'projeto-iluminacao-v3.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 1850000, created_by: userId },
    { obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} Orçamento Marcenaria`, categoria: 'Orçamentos aprovados', descricao: 'Orçamento aprovado da Marcenaria Design', arquivo_url: '', arquivo_nome: 'orcamento-marcenaria-design.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 320000, created_by: userId },
    { obra_id: obra1Id, company_id: companyId, nome: `${DEMO_PREFIX} ART Reforma`, categoria: 'ART / RRT', descricao: 'ART de reforma registrada no CREA-SP', arquivo_url: '', arquivo_nome: 'art-reforma-crea.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 180000, created_by: userId },

    // Obra 2
    { obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Contrato de Construção`, categoria: 'Contratos', descricao: 'Contrato com Dr. Henrique Martins', arquivo_url: '', arquivo_nome: 'contrato-residencia-martins.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 380000, created_by: userId },
    { obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Projeto Arquitetônico`, categoria: 'Projetos', descricao: 'Projeto completo aprovado na prefeitura', arquivo_url: '', arquivo_nome: 'projeto-arquitetonico-alphaville.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 4200000, created_by: userId },
    { obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Projeto Estrutural`, categoria: 'Projetos', descricao: 'Cálculo estrutural e detalhamento', arquivo_url: '', arquivo_nome: 'projeto-estrutural-residencia.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 2800000, created_by: userId },
    { obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Alvará de Construção`, categoria: 'Licenças', descricao: 'Alvará de construção emitido pela prefeitura de Barueri', arquivo_url: '', arquivo_nome: 'alvara-construcao-barueri.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 95000, created_by: userId },
    { obra_id: obra2Id, company_id: companyId, nome: `${DEMO_PREFIX} Memorial Descritivo`, categoria: 'Projetos', descricao: 'Memorial descritivo completo da obra', arquivo_url: '', arquivo_nome: 'memorial-descritivo.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 520000, created_by: userId },

    // Obra 3
    { obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Contrato LogTech`, categoria: 'Contratos', descricao: 'Contrato de construção com LogTech Armazéns', arquivo_url: '', arquivo_nome: 'contrato-galpao-logtech.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 450000, created_by: userId },
    { obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Laudo de Sondagem SPT`, categoria: 'Projetos', descricao: 'Relatório completo de sondagem geotécnica', arquivo_url: '', arquivo_nome: 'laudo-sondagem-spt.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 1200000, created_by: userId },
    { obra_id: obra3Id, company_id: companyId, nome: `${DEMO_PREFIX} Projeto Estrutural Metálico`, categoria: 'Projetos', descricao: 'Projeto de estrutura metálica - Calc Steel', arquivo_url: '', arquivo_nome: 'projeto-estrutura-metalica.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 5500000, created_by: userId },

    // Obra 4
    { obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Contrato Casa de Praia`, categoria: 'Contratos', descricao: 'Contrato com Família Nogueira', arquivo_url: '', arquivo_nome: 'contrato-casa-praia-riviera.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 320000, created_by: userId },
    { obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} As-Built Elétrico`, categoria: 'Projetos', descricao: 'Planta elétrica atualizada conforme executado', arquivo_url: '', arquivo_nome: 'as-built-eletrico.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 1800000, created_by: userId },
    { obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Manual do Proprietário`, categoria: 'Outros', descricao: 'Manual de uso, garantias e manutenção preventiva', arquivo_url: '', arquivo_nome: 'manual-proprietario-riviera.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 680000, created_by: userId },
    { obra_id: obra4Id, company_id: companyId, nome: `${DEMO_PREFIX} Habite-se (pendente)`, categoria: 'Licenças', descricao: 'Protocolo de solicitação do habite-se na prefeitura', arquivo_url: '', arquivo_nome: 'protocolo-habite-se.pdf', arquivo_tipo: 'application/pdf', tamanho_bytes: 85000, created_by: userId },
  ];
  await checkedInsert('documentos_obra', documentos, true);

  return { obra1Id, obra2Id, obra3Id, obra4Id };
}

// ═══════════════════════════════════════════════════════════════
// CLEAR DEMO DATA
// ═══════════════════════════════════════════════════════════════

export async function clearDemoData(companyId: string) {
  const { data: demoObras } = await supabase
    .from('obras')
    .select('id')
    .eq('company_id', companyId)
    .like('nome', `${DEMO_PREFIX}%`);

  const obraIds = (demoObras || []).map((o: any) => o.id);
  if (obraIds.length === 0) return;

  for (const obraId of obraIds) {
    await supabase.from('precos_fornecedores').delete().eq('obra_id', obraId);
    await supabase.from('fornecedores').delete().eq('obra_id', obraId);
    await supabase.from('pendencias').delete().eq('obra_id', obraId);
    await supabase.from('pagamento_itens').delete().eq('obra_id', obraId);
    await supabase.from('pagamentos').delete().eq('obra_id', obraId);
    await supabase.from('diario_registros').delete().eq('obra_id', obraId);
    await supabase.from('movimentacoes').delete().eq('obra_id', obraId);
    await supabase.from('materiais').delete().eq('obra_id', obraId);
    await supabase.from('obra_agenda').delete().eq('obra_id', obraId);
    await supabase.from('documentos_obra').delete().eq('obra_id', obraId);
    await supabase.from('cronograma_dependencias').delete().eq('obra_id', obraId);

    const { data: cats } = await supabase.from('orcamento_categorias').select('id').eq('obra_id', obraId);
    if (cats) {
      for (const cat of (cats as any[])) {
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
