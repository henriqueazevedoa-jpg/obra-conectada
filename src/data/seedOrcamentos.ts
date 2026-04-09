import type { OrcamentoObra } from '@/contexts/OrcamentoContext';

/**
 * Rich seed data for 3 obras in different stages.
 * Obra 1 (ob1) – Em andamento ~45%: started Jun 2025, expected Sep 2026. Today is Apr 2026.
 *   - 5 etapas concluídas, 3 em andamento (1 atrasada), 5 não iniciadas
 * Obra 2 (ob2) – Planejamento: starts Jun 2026, all future dates.
 * Obra 3 (ob3) – Concluída 100%: Jan-Jul 2025, all done.
 */

function sub(id: string, codigo: string, descricao: string, unidade: string, qtd: number, preco: number) {
  return { id, codigo, descricao, unidade, quantidade: qtd, precoUnitario: preco, precoTotal: qtd * preco };
}

export function createSeedOrcamentos(): OrcamentoObra[] {
  return [
    // ═══════════════════════════════════════════
    // OBRA 1 – Residencial Vila Nova (em andamento ~45%)
    // Started Jun 2025, target Sep 2026. Today = Apr 2026.
    // ═══════════════════════════════════════════
    {
      obraId: 'ob1',
      categorias: [
        // --- 1. Serviços Preliminares: CONCLUÍDA ---
        {
          id: 'ob1-cat1', codigo: 'CAT-001', nome: 'Serviços Preliminares', precoTotal: 12800, usaComposicoes: true,
          dataInicioPrevista: '2025-06-02', dataFimPrevista: '2025-06-20',
          dataInicioReal: '2025-06-02', dataFimReal: '2025-06-18',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Carlos Mendes',
          composicoes: [
            {
              id: 'ob1-c1-1', codigo: 'COMP-001-01', descricao: 'Limpeza e preparo do terreno', unidade: 'm²', quantidade: 320, precoUnitario: 15, precoTotal: 4800,
              subitens: [
                sub('ob1-s1-1-1', 'SUB-001-01-01', 'Remoção de entulho e vegetação', 'm²', 320, 8),
                sub('ob1-s1-1-2', 'SUB-001-01-02', 'Nivelamento do terreno', 'm²', 320, 7),
              ],
              usaSubitens: true, pesoCronograma: 30, concluida: true,
              dataInicioPrevista: '2025-06-02', dataFimPrevista: '2025-06-10', dataInicioReal: '2025-06-02', dataFimReal: '2025-06-09',
            },
            {
              id: 'ob1-c1-2', codigo: 'COMP-001-02', descricao: 'Tapume e instalações provisórias', unidade: 'vb', quantidade: 1, precoUnitario: 5200, precoTotal: 5200,
              subitens: [
                sub('ob1-s1-2-1', 'SUB-001-02-01', 'Tapume em compensado h=2,20m', 'm', 45, 65),
                sub('ob1-s1-2-2', 'SUB-001-02-02', 'Barracão de obra', 'vb', 1, 1800),
                sub('ob1-s1-2-3', 'SUB-001-02-03', 'Instalação elétrica provisória', 'vb', 1, 475),
              ],
              usaSubitens: true, pesoCronograma: 40, concluida: true,
              dataInicioPrevista: '2025-06-05', dataFimPrevista: '2025-06-16', dataInicioReal: '2025-06-05', dataFimReal: '2025-06-15',
            },
            {
              id: 'ob1-c1-3', codigo: 'COMP-001-03', descricao: 'Locação da obra', unidade: 'vb', quantidade: 1, precoUnitario: 2800, precoTotal: 2800,
              subitens: [], usaSubitens: false, pesoCronograma: 30, concluida: true,
              dataInicioPrevista: '2025-06-12', dataFimPrevista: '2025-06-20', dataInicioReal: '2025-06-12', dataFimReal: '2025-06-18',
            },
          ],
        },

        // --- 2. Fundação: CONCLUÍDA ---
        {
          id: 'ob1-cat2', codigo: 'CAT-002', nome: 'Fundação', precoTotal: 52000, usaComposicoes: true,
          dataInicioPrevista: '2025-06-23', dataFimPrevista: '2025-08-15',
          dataInicioReal: '2025-06-23', dataFimReal: '2025-08-20',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Carlos Mendes',
          observacoesCronograma: 'Atrasou 5 dias por necessidade de reforço em 2 blocos',
          composicoes: [
            {
              id: 'ob1-c2-1', codigo: 'COMP-002-01', descricao: 'Escavação e preparo', unidade: 'm³', quantidade: 85, precoUnitario: 120, precoTotal: 10200,
              subitens: [
                sub('ob1-s2-1-1', 'SUB-002-01-01', 'Escavação mecânica', 'm³', 85, 75),
                sub('ob1-s2-1-2', 'SUB-002-01-02', 'Regularização e compactação do fundo', 'm³', 85, 45),
              ],
              usaSubitens: true, pesoCronograma: 25, concluida: true,
              dataInicioPrevista: '2025-06-23', dataFimPrevista: '2025-07-05', dataInicioReal: '2025-06-23', dataFimReal: '2025-07-04',
            },
            {
              id: 'ob1-c2-2', codigo: 'COMP-002-02', descricao: 'Estacas tipo hélice contínua', unidade: 'm', quantidade: 180, precoUnitario: 130, precoTotal: 23400,
              subitens: [], usaSubitens: false, pesoCronograma: 45, concluida: true,
              dataInicioPrevista: '2025-07-01', dataFimPrevista: '2025-07-25', dataInicioReal: '2025-07-01', dataFimReal: '2025-07-28',
            },
            {
              id: 'ob1-c2-3', codigo: 'COMP-002-03', descricao: 'Blocos e vigas baldrames', unidade: 'm³', quantidade: 22, precoUnitario: 836.36, precoTotal: 18400,
              subitens: [
                sub('ob1-s2-3-1', 'SUB-002-03-01', 'Formas de madeira', 'm²', 95, 55),
                sub('ob1-s2-3-2', 'SUB-002-03-02', 'Armação CA-50/CA-60', 'kg', 1800, 4.5),
                sub('ob1-s2-3-3', 'SUB-002-03-03', 'Concreto usinado fck 30MPa', 'm³', 22, 185),
              ],
              usaSubitens: true, pesoCronograma: 30, concluida: true,
              dataInicioPrevista: '2025-07-20', dataFimPrevista: '2025-08-15', dataInicioReal: '2025-07-22', dataFimReal: '2025-08-20',
            },
          ],
        },

        // --- 3. Estrutura: CONCLUÍDA ---
        {
          id: 'ob1-cat3', codigo: 'CAT-003', nome: 'Estrutura', precoTotal: 98000, usaComposicoes: true,
          dataInicioPrevista: '2025-08-18', dataFimPrevista: '2025-12-15',
          dataInicioReal: '2025-08-22', dataFimReal: '2025-12-20',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Carlos Mendes',
          composicoes: [
            {
              id: 'ob1-c3-1', codigo: 'COMP-003-01', descricao: 'Pilares - concreto armado', unidade: 'vb', quantidade: 1, precoUnitario: 28000, precoTotal: 28000,
              subitens: [
                sub('ob1-s3-1-1', 'SUB-003-01-01', 'Formas de pilares', 'm²', 210, 48),
                sub('ob1-s3-1-2', 'SUB-003-01-02', 'Armação de pilares', 'kg', 2800, 4.8),
                sub('ob1-s3-1-3', 'SUB-003-01-03', 'Concretagem de pilares fck 30', 'm³', 18, 420),
              ],
              usaSubitens: true, pesoCronograma: 30, concluida: true,
              dataInicioPrevista: '2025-08-18', dataFimPrevista: '2025-09-30', dataInicioReal: '2025-08-22', dataFimReal: '2025-10-02',
            },
            {
              id: 'ob1-c3-2', codigo: 'COMP-003-02', descricao: 'Vigas - concreto armado', unidade: 'vb', quantidade: 1, precoUnitario: 32000, precoTotal: 32000,
              subitens: [
                sub('ob1-s3-2-1', 'SUB-003-02-01', 'Formas de vigas', 'm²', 280, 45),
                sub('ob1-s3-2-2', 'SUB-003-02-02', 'Armação de vigas', 'kg', 3200, 4.7),
                sub('ob1-s3-2-3', 'SUB-003-02-03', 'Concretagem de vigas fck 30', 'm³', 24, 415),
              ],
              usaSubitens: true, pesoCronograma: 35, concluida: true,
              dataInicioPrevista: '2025-09-15', dataFimPrevista: '2025-11-10', dataInicioReal: '2025-09-20', dataFimReal: '2025-11-15',
            },
            {
              id: 'ob1-c3-3', codigo: 'COMP-003-03', descricao: 'Lajes - concreto armado', unidade: 'vb', quantidade: 1, precoUnitario: 38000, precoTotal: 38000,
              subitens: [
                sub('ob1-s3-3-1', 'SUB-003-03-01', 'Formas e escoramentos de laje', 'm²', 350, 38),
                sub('ob1-s3-3-2', 'SUB-003-03-02', 'Armação de laje e tela', 'kg', 2900, 5.1),
                sub('ob1-s3-3-3', 'SUB-003-03-03', 'Concretagem de laje fck 25', 'm³', 32, 390),
              ],
              usaSubitens: true, pesoCronograma: 35, concluida: true,
              dataInicioPrevista: '2025-10-20', dataFimPrevista: '2025-12-15', dataInicioReal: '2025-10-25', dataFimReal: '2025-12-20',
            },
          ],
        },

        // --- 4. Alvenaria: CONCLUÍDA ---
        {
          id: 'ob1-cat4', codigo: 'CAT-004', nome: 'Alvenaria', precoTotal: 38500, usaComposicoes: true,
          dataInicioPrevista: '2025-11-01', dataFimPrevista: '2026-02-28',
          dataInicioReal: '2025-11-10', dataFimReal: '2026-03-05',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'José Silva',
          composicoes: [
            {
              id: 'ob1-c4-1', codigo: 'COMP-004-01', descricao: 'Alvenaria de vedação - blocos cerâmicos', unidade: 'm²', quantidade: 420, precoUnitario: 75, precoTotal: 31500,
              subitens: [
                sub('ob1-s4-1-1', 'SUB-004-01-01', 'Blocos cerâmicos 9x19x19', 'un', 5040, 1.2),
                sub('ob1-s4-1-2', 'SUB-004-01-02', 'Argamassa de assentamento', 'm³', 6.3, 380),
                sub('ob1-s4-1-3', 'SUB-004-01-03', 'Mão de obra pedreiro', 'm²', 420, 42),
              ],
              usaSubitens: true, pesoCronograma: 80, concluida: true,
              dataInicioPrevista: '2025-11-01', dataFimPrevista: '2026-02-15', dataInicioReal: '2025-11-10', dataFimReal: '2026-02-20',
            },
            {
              id: 'ob1-c4-2', codigo: 'COMP-004-02', descricao: 'Vergas e contravergas', unidade: 'vb', quantidade: 1, precoUnitario: 7000, precoTotal: 7000,
              subitens: [], usaSubitens: false, pesoCronograma: 20, concluida: true,
              dataInicioPrevista: '2026-01-15', dataFimPrevista: '2026-02-28', dataInicioReal: '2026-01-20', dataFimReal: '2026-03-05',
            },
          ],
        },

        // --- 5. Cobertura: CONCLUÍDA ---
        {
          id: 'ob1-cat5', codigo: 'CAT-005', nome: 'Cobertura', precoTotal: 35000, usaComposicoes: true,
          dataInicioPrevista: '2026-01-15', dataFimPrevista: '2026-03-15',
          dataInicioReal: '2026-01-20', dataFimReal: '2026-03-28',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Carlos Mendes',
          composicoes: [
            {
              id: 'ob1-c5-1', codigo: 'COMP-005-01', descricao: 'Estrutura de madeira para telhado', unidade: 'm²', quantidade: 140, precoUnitario: 120, precoTotal: 16800,
              subitens: [], usaSubitens: false, pesoCronograma: 50, concluida: true,
              dataInicioPrevista: '2026-01-15', dataFimPrevista: '2026-02-15', dataInicioReal: '2026-01-20', dataFimReal: '2026-02-18',
            },
            {
              id: 'ob1-c5-2', codigo: 'COMP-005-02', descricao: 'Telhas e cumeeira', unidade: 'm²', quantidade: 155, precoUnitario: 85, precoTotal: 13175,
              subitens: [], usaSubitens: false, pesoCronograma: 35, concluida: true,
              dataInicioPrevista: '2026-02-10', dataFimPrevista: '2026-03-05', dataInicioReal: '2026-02-15', dataFimReal: '2026-03-27',
            },
            {
              id: 'ob1-c5-3', codigo: 'COMP-005-03', descricao: 'Calhas e rufos', unidade: 'm', quantidade: 62, precoUnitario: 81, precoTotal: 5025,
              subitens: [], usaSubitens: false, pesoCronograma: 15, concluida: true,
              dataInicioPrevista: '2026-03-01', dataFimPrevista: '2026-03-15', dataInicioReal: '2026-03-20', dataFimReal: '2026-03-28',
            },
          ],
        },

        // --- 6. Instalações Elétricas: EM ANDAMENTO ~40% ---
        {
          id: 'ob1-cat6', codigo: 'CAT-006', nome: 'Instalações Elétricas', precoTotal: 32000, usaComposicoes: true,
          dataInicioPrevista: '2025-12-01', dataFimPrevista: '2026-05-30',
          dataInicioReal: '2025-12-05',
          statusCronograma: 'em_andamento', percentualCronograma: 40, responsavel: 'José Silva',
          composicoes: [
            {
              id: 'ob1-c6-1', codigo: 'COMP-006-01', descricao: 'Eletrodutos e caixas', unidade: 'vb', quantidade: 1, precoUnitario: 8500, precoTotal: 8500,
              subitens: [], usaSubitens: false, pesoCronograma: 25, concluida: true,
              dataInicioPrevista: '2025-12-01', dataFimPrevista: '2026-02-15', dataInicioReal: '2025-12-05', dataFimReal: '2026-02-20',
            },
            {
              id: 'ob1-c6-2', codigo: 'COMP-006-02', descricao: 'Fiação e cabeamento', unidade: 'vb', quantidade: 1, precoUnitario: 12000, precoTotal: 12000,
              subitens: [], usaSubitens: false, pesoCronograma: 35, concluida: false,
              dataInicioPrevista: '2026-02-15', dataFimPrevista: '2026-04-15', dataInicioReal: '2026-02-25',
            },
            {
              id: 'ob1-c6-3', codigo: 'COMP-006-03', descricao: 'Quadro e disjuntores', unidade: 'vb', quantidade: 1, precoUnitario: 6500, precoTotal: 6500,
              subitens: [], usaSubitens: false, pesoCronograma: 20,
              dataInicioPrevista: '2026-04-10', dataFimPrevista: '2026-05-10',
            },
            {
              id: 'ob1-c6-4', codigo: 'COMP-006-04', descricao: 'Iluminação e tomadas', unidade: 'vb', quantidade: 1, precoUnitario: 5000, precoTotal: 5000,
              subitens: [], usaSubitens: false, pesoCronograma: 20,
              dataInicioPrevista: '2026-05-01', dataFimPrevista: '2026-05-30',
            },
          ],
        },

        // --- 7. Instalações Hidráulicas: EM ANDAMENTO ~35% ---
        {
          id: 'ob1-cat7', codigo: 'CAT-007', nome: 'Instalações Hidráulicas', precoTotal: 26000, usaComposicoes: true,
          dataInicioPrevista: '2025-12-01', dataFimPrevista: '2026-05-30',
          dataInicioReal: '2025-12-10',
          statusCronograma: 'em_andamento', percentualCronograma: 35, responsavel: 'José Silva',
          composicoes: [
            {
              id: 'ob1-c7-1', codigo: 'COMP-007-01', descricao: 'Água fria - tubulação e conexões', unidade: 'vb', quantidade: 1, precoUnitario: 9000, precoTotal: 9000,
              subitens: [], usaSubitens: false, pesoCronograma: 35, concluida: true,
              dataInicioPrevista: '2025-12-01', dataFimPrevista: '2026-02-28', dataInicioReal: '2025-12-10', dataFimReal: '2026-03-05',
            },
            {
              id: 'ob1-c7-2', codigo: 'COMP-007-02', descricao: 'Esgoto - tubulação e caixas', unidade: 'vb', quantidade: 1, precoUnitario: 8500, precoTotal: 8500,
              subitens: [], usaSubitens: false, pesoCronograma: 35, concluida: false,
              dataInicioPrevista: '2026-01-15', dataFimPrevista: '2026-04-15', dataInicioReal: '2026-01-20',
            },
            {
              id: 'ob1-c7-3', codigo: 'COMP-007-03', descricao: 'Água quente - tubulação PPR', unidade: 'vb', quantidade: 1, precoUnitario: 5500, precoTotal: 5500,
              subitens: [], usaSubitens: false, pesoCronograma: 20,
              dataInicioPrevista: '2026-03-15', dataFimPrevista: '2026-05-15',
            },
            {
              id: 'ob1-c7-4', codigo: 'COMP-007-04', descricao: 'Pluvial', unidade: 'vb', quantidade: 1, precoUnitario: 3000, precoTotal: 3000,
              subitens: [], usaSubitens: false, pesoCronograma: 10,
              dataInicioPrevista: '2026-04-15', dataFimPrevista: '2026-05-30',
            },
          ],
        },

        // --- 8. Revestimentos: ATRASADA (deveria ter começado em Mar, começou com atraso) ---
        {
          id: 'ob1-cat8', codigo: 'CAT-008', nome: 'Revestimentos', precoTotal: 42000, usaComposicoes: true,
          dataInicioPrevista: '2026-03-01', dataFimPrevista: '2026-05-15',
          dataInicioReal: '2026-03-25',
          statusCronograma: 'atrasada', percentualCronograma: 10, responsavel: 'Carlos Mendes',
          composicoes: [
            { id: 'ob1-c8-1', codigo: 'COMP-008-01', descricao: 'Chapisco e emboço interno', unidade: 'm²', quantidade: 580, precoUnitario: 38, precoTotal: 22040, subitens: [], usaSubitens: false, pesoCronograma: 50, concluida: false, dataInicioPrevista: '2026-03-01', dataFimPrevista: '2026-04-10', dataInicioReal: '2026-03-25' },
            { id: 'ob1-c8-2', codigo: 'COMP-008-02', descricao: 'Revestimento cerâmico (banheiros e cozinha)', unidade: 'm²', quantidade: 120, precoUnitario: 95, precoTotal: 11400, subitens: [], usaSubitens: false, pesoCronograma: 30, dataInicioPrevista: '2026-04-05', dataFimPrevista: '2026-04-30' },
            { id: 'ob1-c8-3', codigo: 'COMP-008-03', descricao: 'Reboco externo', unidade: 'm²', quantidade: 310, precoUnitario: 27.6, precoTotal: 8560, subitens: [], usaSubitens: false, pesoCronograma: 20, dataInicioPrevista: '2026-04-15', dataFimPrevista: '2026-05-15' },
          ],
        },

        // --- 9. Pisos: NÃO INICIADA ---
        {
          id: 'ob1-cat9', codigo: 'CAT-009', nome: 'Pisos', precoTotal: 28000, usaComposicoes: true,
          dataInicioPrevista: '2026-05-01', dataFimPrevista: '2026-06-15',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0, responsavel: 'Carlos Mendes',
          composicoes: [
            { id: 'ob1-c9-1', codigo: 'COMP-009-01', descricao: 'Contrapiso', unidade: 'm²', quantidade: 280, precoUnitario: 35, precoTotal: 9800, subitens: [], usaSubitens: false, pesoCronograma: 35, dataInicioPrevista: '2026-05-01', dataFimPrevista: '2026-05-20' },
            { id: 'ob1-c9-2', codigo: 'COMP-009-02', descricao: 'Porcelanato 60x60', unidade: 'm²', quantidade: 220, precoUnitario: 82.7, precoTotal: 18200, subitens: [], usaSubitens: false, pesoCronograma: 65, dataInicioPrevista: '2026-05-20', dataFimPrevista: '2026-06-15' },
          ],
        },

        // --- 10. Pintura: NÃO INICIADA ---
        {
          id: 'ob1-cat10', codigo: 'CAT-010', nome: 'Pintura', precoTotal: 22000, usaComposicoes: true,
          dataInicioPrevista: '2026-06-15', dataFimPrevista: '2026-07-15',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0, responsavel: 'José Silva',
          composicoes: [
            { id: 'ob1-c10-1', codigo: 'COMP-010-01', descricao: 'Massa corrida e lixamento', unidade: 'm²', quantidade: 580, precoUnitario: 18, precoTotal: 10440, subitens: [], usaSubitens: false, pesoCronograma: 40, dataInicioPrevista: '2026-06-15', dataFimPrevista: '2026-06-30' },
            { id: 'ob1-c10-2', codigo: 'COMP-010-02', descricao: 'Pintura acrílica interna e externa', unidade: 'm²', quantidade: 650, precoUnitario: 17.8, precoTotal: 11560, subitens: [], usaSubitens: false, pesoCronograma: 60, dataInicioPrevista: '2026-07-01', dataFimPrevista: '2026-07-15' },
          ],
        },

        // --- 11. Esquadrias: NÃO INICIADA ---
        {
          id: 'ob1-cat11', codigo: 'CAT-011', nome: 'Esquadrias', precoTotal: 18000, usaComposicoes: true,
          dataInicioPrevista: '2026-06-01', dataFimPrevista: '2026-07-15',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0, responsavel: 'Carlos Mendes',
          composicoes: [
            { id: 'ob1-c11-1', codigo: 'COMP-011-01', descricao: 'Janelas de alumínio', unidade: 'un', quantidade: 14, precoUnitario: 850, precoTotal: 11900, subitens: [], usaSubitens: false, pesoCronograma: 60, dataInicioPrevista: '2026-06-01', dataFimPrevista: '2026-06-25' },
            { id: 'ob1-c11-2', codigo: 'COMP-011-02', descricao: 'Portas internas e externas', unidade: 'un', quantidade: 12, precoUnitario: 508.3, precoTotal: 6100, subitens: [], usaSubitens: false, pesoCronograma: 40, dataInicioPrevista: '2026-06-20', dataFimPrevista: '2026-07-15' },
          ],
        },

        // --- 12. Louças e Metais: NÃO INICIADA ---
        {
          id: 'ob1-cat12', codigo: 'CAT-012', nome: 'Louças e Metais', precoTotal: 9500, usaComposicoes: true,
          dataInicioPrevista: '2026-07-15', dataFimPrevista: '2026-08-15',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0, responsavel: 'José Silva',
          composicoes: [
            { id: 'ob1-c12-1', codigo: 'COMP-012-01', descricao: 'Vasos, pias e tanques', unidade: 'vb', quantidade: 1, precoUnitario: 6200, precoTotal: 6200, subitens: [], usaSubitens: false, pesoCronograma: 60, dataInicioPrevista: '2026-07-15', dataFimPrevista: '2026-08-01' },
            { id: 'ob1-c12-2', codigo: 'COMP-012-02', descricao: 'Torneiras, registros e acessórios', unidade: 'vb', quantidade: 1, precoUnitario: 3300, precoTotal: 3300, subitens: [], usaSubitens: false, pesoCronograma: 40, dataInicioPrevista: '2026-08-01', dataFimPrevista: '2026-08-15' },
          ],
        },

        // --- 13. Limpeza Final: NÃO INICIADA ---
        {
          id: 'ob1-cat13', codigo: 'CAT-013', nome: 'Limpeza Final', precoTotal: 4500, usaComposicoes: true,
          dataInicioPrevista: '2026-09-01', dataFimPrevista: '2026-09-30',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0, responsavel: 'Carlos Mendes',
          composicoes: [
            { id: 'ob1-c13-1', codigo: 'COMP-013-01', descricao: 'Limpeza grossa e fina', unidade: 'vb', quantidade: 1, precoUnitario: 3200, precoTotal: 3200, subitens: [], usaSubitens: false, pesoCronograma: 70, dataInicioPrevista: '2026-09-01', dataFimPrevista: '2026-09-20' },
            { id: 'ob1-c13-2', codigo: 'COMP-013-02', descricao: 'Remoção de entulho final', unidade: 'vb', quantidade: 1, precoUnitario: 1300, precoTotal: 1300, subitens: [], usaSubitens: false, pesoCronograma: 30, dataInicioPrevista: '2026-09-20', dataFimPrevista: '2026-09-30' },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════
    // OBRA 2 – Edifício Comercial (planejamento) - starts Jun 2026
    // ═══════════════════════════════════════════
    {
      obraId: 'ob2',
      categorias: [
        {
          id: 'ob2-cat1', codigo: 'CAT-001', nome: 'Serviços Preliminares', precoTotal: 48000, usaComposicoes: true,
          dataInicioPrevista: '2026-06-01', dataFimPrevista: '2026-07-15',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0, responsavel: 'Carlos Mendes',
          composicoes: [
            { id: 'ob2-c1-1', codigo: 'COMP-001-01', descricao: 'Demolição de construção existente', unidade: 'm³', quantidade: 180, precoUnitario: 85, precoTotal: 15300, subitens: [], usaSubitens: false, pesoCronograma: 35, dataInicioPrevista: '2026-06-01', dataFimPrevista: '2026-06-20' },
            { id: 'ob2-c1-2', codigo: 'COMP-001-02', descricao: 'Canteiro de obras e tapume', unidade: 'vb', quantidade: 1, precoUnitario: 18500, precoTotal: 18500, subitens: [], usaSubitens: false, pesoCronograma: 40, dataInicioPrevista: '2026-06-10', dataFimPrevista: '2026-07-01' },
            { id: 'ob2-c1-3', codigo: 'COMP-001-03', descricao: 'Sondagem e levantamento topográfico', unidade: 'vb', quantidade: 1, precoUnitario: 14200, precoTotal: 14200, subitens: [], usaSubitens: false, pesoCronograma: 25, dataInicioPrevista: '2026-06-15', dataFimPrevista: '2026-07-15' },
          ],
        },
        {
          id: 'ob2-cat2', codigo: 'CAT-002', nome: 'Fundação', precoTotal: 320000, usaComposicoes: true,
          dataInicioPrevista: '2026-07-15', dataFimPrevista: '2026-11-30',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0, responsavel: 'Carlos Mendes',
          composicoes: [
            { id: 'ob2-c2-1', codigo: 'COMP-002-01', descricao: 'Contenção e escavação subsolos', unidade: 'vb', quantidade: 1, precoUnitario: 145000, precoTotal: 145000, subitens: [], usaSubitens: false, pesoCronograma: 45, dataInicioPrevista: '2026-07-15', dataFimPrevista: '2026-09-30' },
            { id: 'ob2-c2-2', codigo: 'COMP-002-02', descricao: 'Estacas e blocos de fundação', unidade: 'vb', quantidade: 1, precoUnitario: 175000, precoTotal: 175000, subitens: [], usaSubitens: false, pesoCronograma: 55, dataInicioPrevista: '2026-09-01', dataFimPrevista: '2026-11-30' },
          ],
        },
        {
          id: 'ob2-cat3', codigo: 'CAT-003', nome: 'Estrutura', precoTotal: 850000, usaComposicoes: true,
          dataInicioPrevista: '2026-11-01', dataFimPrevista: '2027-06-30',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0, responsavel: 'Carlos Mendes',
          composicoes: [
            { id: 'ob2-c3-1', codigo: 'COMP-003-01', descricao: 'Estrutura de concreto armado - subsolos', unidade: 'vb', quantidade: 1, precoUnitario: 280000, precoTotal: 280000, subitens: [], usaSubitens: false, pesoCronograma: 30, dataInicioPrevista: '2026-11-01', dataFimPrevista: '2027-01-31' },
            { id: 'ob2-c3-2', codigo: 'COMP-003-02', descricao: 'Estrutura de concreto armado - pavimentos tipo', unidade: 'vb', quantidade: 1, precoUnitario: 420000, precoTotal: 420000, subitens: [], usaSubitens: false, pesoCronograma: 50, dataInicioPrevista: '2027-01-15', dataFimPrevista: '2027-05-31' },
            { id: 'ob2-c3-3', codigo: 'COMP-003-03', descricao: 'Estrutura cobertura e reservatórios', unidade: 'vb', quantidade: 1, precoUnitario: 150000, precoTotal: 150000, subitens: [], usaSubitens: false, pesoCronograma: 20, dataInicioPrevista: '2027-05-15', dataFimPrevista: '2027-06-30' },
          ],
        },
        {
          id: 'ob2-cat4', codigo: 'CAT-004', nome: 'Alvenaria', precoTotal: 210000, usaComposicoes: true,
          dataInicioPrevista: '2027-04-01', dataFimPrevista: '2027-08-31',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0,
          composicoes: [
            { id: 'ob2-c4-1', codigo: 'COMP-004-01', descricao: 'Alvenaria de vedação em bloco', unidade: 'm²', quantidade: 2800, precoUnitario: 75, precoTotal: 210000, subitens: [], usaSubitens: false, pesoCronograma: 100, dataInicioPrevista: '2027-04-01', dataFimPrevista: '2027-08-31' },
          ],
        },
        {
          id: 'ob2-cat5', codigo: 'CAT-006', nome: 'Instalações Elétricas', precoTotal: 185000, usaComposicoes: true,
          dataInicioPrevista: '2027-05-01', dataFimPrevista: '2027-10-31',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0,
          composicoes: [
            { id: 'ob2-c5-1', codigo: 'COMP-006-01', descricao: 'Instalações elétricas gerais', unidade: 'vb', quantidade: 1, precoUnitario: 185000, precoTotal: 185000, subitens: [], usaSubitens: false, pesoCronograma: 100, dataInicioPrevista: '2027-05-01', dataFimPrevista: '2027-10-31' },
          ],
        },
        {
          id: 'ob2-cat6', codigo: 'CAT-007', nome: 'Instalações Hidráulicas', precoTotal: 120000, usaComposicoes: true,
          dataInicioPrevista: '2027-05-01', dataFimPrevista: '2027-10-31',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0,
          composicoes: [
            { id: 'ob2-c6-1', codigo: 'COMP-007-01', descricao: 'Instalações hidrossanitárias completas', unidade: 'vb', quantidade: 1, precoUnitario: 120000, precoTotal: 120000, subitens: [], usaSubitens: false, pesoCronograma: 100, dataInicioPrevista: '2027-05-01', dataFimPrevista: '2027-10-31' },
          ],
        },
        {
          id: 'ob2-cat7', codigo: 'CAT-008', nome: 'Revestimentos', precoTotal: 280000, usaComposicoes: true,
          dataInicioPrevista: '2027-07-15', dataFimPrevista: '2027-10-31',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0,
          composicoes: [
            { id: 'ob2-c7-1', codigo: 'COMP-008-01', descricao: 'Revestimentos internos e fachada', unidade: 'vb', quantidade: 1, precoUnitario: 280000, precoTotal: 280000, subitens: [], usaSubitens: false, pesoCronograma: 100, dataInicioPrevista: '2027-07-15', dataFimPrevista: '2027-10-31' },
          ],
        },
        {
          id: 'ob2-cat8', codigo: 'CAT-010', nome: 'Pintura', precoTotal: 95000, usaComposicoes: true,
          dataInicioPrevista: '2027-10-01', dataFimPrevista: '2027-11-30',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0,
          composicoes: [
            { id: 'ob2-c8-1', codigo: 'COMP-010-01', descricao: 'Pintura geral interna e externa', unidade: 'vb', quantidade: 1, precoUnitario: 95000, precoTotal: 95000, subitens: [], usaSubitens: false, pesoCronograma: 100, dataInicioPrevista: '2027-10-01', dataFimPrevista: '2027-11-30' },
          ],
        },
        {
          id: 'ob2-cat9', codigo: 'CAT-013', nome: 'Limpeza Final', precoTotal: 15000, usaComposicoes: true,
          dataInicioPrevista: '2027-12-01', dataFimPrevista: '2027-12-31',
          statusCronograma: 'nao_iniciada', percentualCronograma: 0,
          composicoes: [
            { id: 'ob2-c9-1', codigo: 'COMP-013-01', descricao: 'Limpeza geral e entrega', unidade: 'vb', quantidade: 1, precoUnitario: 15000, precoTotal: 15000, subitens: [], usaSubitens: false, pesoCronograma: 100, dataInicioPrevista: '2027-12-01', dataFimPrevista: '2027-12-31' },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════
    // OBRA 3 – Clínica concluída (100%) Jan-Jul 2025
    // ═══════════════════════════════════════════
    {
      obraId: 'ob3',
      categorias: [
        {
          id: 'ob3-cat1', codigo: 'CAT-001', nome: 'Serviços Preliminares', precoTotal: 6800, usaComposicoes: true,
          dataInicioPrevista: '2025-01-06', dataFimPrevista: '2025-01-20',
          dataInicioReal: '2025-01-06', dataFimReal: '2025-01-18',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c1-1', codigo: 'COMP-001-01', descricao: 'Proteção de áreas existentes', unidade: 'vb', quantidade: 1, precoUnitario: 3200, precoTotal: 3200, subitens: [], usaSubitens: false, pesoCronograma: 50, concluida: true, dataInicioPrevista: '2025-01-06', dataFimPrevista: '2025-01-13', dataInicioReal: '2025-01-06', dataFimReal: '2025-01-12' },
            { id: 'ob3-c1-2', codigo: 'COMP-001-02', descricao: 'Demolição de divisórias e forros existentes', unidade: 'vb', quantidade: 1, precoUnitario: 3600, precoTotal: 3600, subitens: [], usaSubitens: false, pesoCronograma: 50, concluida: true, dataInicioPrevista: '2025-01-10', dataFimPrevista: '2025-01-20', dataInicioReal: '2025-01-10', dataFimReal: '2025-01-18' },
          ],
        },
        {
          id: 'ob3-cat2', codigo: 'CAT-006', nome: 'Instalações Elétricas', precoTotal: 18500, usaComposicoes: true,
          dataInicioPrevista: '2025-01-20', dataFimPrevista: '2025-03-15',
          dataInicioReal: '2025-01-21', dataFimReal: '2025-03-12',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c2-1', codigo: 'COMP-006-01', descricao: 'Nova rede elétrica e quadro de distribuição', unidade: 'vb', quantidade: 1, precoUnitario: 12500, precoTotal: 12500, subitens: [], usaSubitens: false, pesoCronograma: 65, concluida: true, dataInicioPrevista: '2025-01-20', dataFimPrevista: '2025-02-28', dataInicioReal: '2025-01-21', dataFimReal: '2025-02-25' },
            { id: 'ob3-c2-2', codigo: 'COMP-006-02', descricao: 'Iluminação LED e pontos de dados', unidade: 'vb', quantidade: 1, precoUnitario: 6000, precoTotal: 6000, subitens: [], usaSubitens: false, pesoCronograma: 35, concluida: true, dataInicioPrevista: '2025-02-15', dataFimPrevista: '2025-03-15', dataInicioReal: '2025-02-18', dataFimReal: '2025-03-12' },
          ],
        },
        {
          id: 'ob3-cat3', codigo: 'CAT-007', nome: 'Instalações Hidráulicas', precoTotal: 14200, usaComposicoes: true,
          dataInicioPrevista: '2025-01-20', dataFimPrevista: '2025-03-15',
          dataInicioReal: '2025-01-21', dataFimReal: '2025-03-10',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c3-1', codigo: 'COMP-007-01', descricao: 'Água fria e esgoto - consultórios e banheiros', unidade: 'vb', quantidade: 1, precoUnitario: 14200, precoTotal: 14200, subitens: [], usaSubitens: false, pesoCronograma: 100, concluida: true, dataInicioPrevista: '2025-01-20', dataFimPrevista: '2025-03-15', dataInicioReal: '2025-01-21', dataFimReal: '2025-03-10' },
          ],
        },
        {
          id: 'ob3-cat4', codigo: 'CAT-004', nome: 'Alvenaria', precoTotal: 12000, usaComposicoes: true,
          dataInicioPrevista: '2025-02-10', dataFimPrevista: '2025-03-31',
          dataInicioReal: '2025-02-12', dataFimReal: '2025-03-28',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c4-1', codigo: 'COMP-004-01', descricao: 'Novas divisórias em drywall e alvenaria', unidade: 'm²', quantidade: 185, precoUnitario: 64.9, precoTotal: 12000, subitens: [], usaSubitens: false, pesoCronograma: 100, concluida: true, dataInicioPrevista: '2025-02-10', dataFimPrevista: '2025-03-31', dataInicioReal: '2025-02-12', dataFimReal: '2025-03-28' },
          ],
        },
        {
          id: 'ob3-cat5', codigo: 'CAT-008', nome: 'Revestimentos', precoTotal: 28000, usaComposicoes: true,
          dataInicioPrevista: '2025-03-20', dataFimPrevista: '2025-05-10',
          dataInicioReal: '2025-03-22', dataFimReal: '2025-05-08',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c5-1', codigo: 'COMP-008-01', descricao: 'Revestimento cerâmico - áreas molhadas', unidade: 'm²', quantidade: 95, precoUnitario: 115, precoTotal: 10925, subitens: [], usaSubitens: false, pesoCronograma: 40, concluida: true, dataInicioPrevista: '2025-03-20', dataFimPrevista: '2025-04-15', dataInicioReal: '2025-03-22', dataFimReal: '2025-04-14' },
            { id: 'ob3-c5-2', codigo: 'COMP-008-02', descricao: 'Forro de gesso e sancas', unidade: 'm²', quantidade: 420, precoUnitario: 40.7, precoTotal: 17075, subitens: [], usaSubitens: false, pesoCronograma: 60, concluida: true, dataInicioPrevista: '2025-04-01', dataFimPrevista: '2025-05-10', dataInicioReal: '2025-04-03', dataFimReal: '2025-05-08' },
          ],
        },
        {
          id: 'ob3-cat6', codigo: 'CAT-009', nome: 'Pisos', precoTotal: 22500, usaComposicoes: true,
          dataInicioPrevista: '2025-04-15', dataFimPrevista: '2025-05-31',
          dataInicioReal: '2025-04-18', dataFimReal: '2025-05-28',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c6-1', codigo: 'COMP-009-01', descricao: 'Porcelanato técnico 80x80 polido', unidade: 'm²', quantidade: 350, precoUnitario: 64.3, precoTotal: 22500, subitens: [], usaSubitens: false, pesoCronograma: 100, concluida: true, dataInicioPrevista: '2025-04-15', dataFimPrevista: '2025-05-31', dataInicioReal: '2025-04-18', dataFimReal: '2025-05-28' },
          ],
        },
        {
          id: 'ob3-cat7', codigo: 'CAT-010', nome: 'Pintura', precoTotal: 15800, usaComposicoes: true,
          dataInicioPrevista: '2025-05-20', dataFimPrevista: '2025-06-20',
          dataInicioReal: '2025-05-22', dataFimReal: '2025-06-18',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c7-1', codigo: 'COMP-010-01', descricao: 'Pintura acrílica acetinada - paredes e teto', unidade: 'm²', quantidade: 680, precoUnitario: 16.5, precoTotal: 11220, subitens: [], usaSubitens: false, pesoCronograma: 70, concluida: true, dataInicioPrevista: '2025-05-20', dataFimPrevista: '2025-06-10', dataInicioReal: '2025-05-22', dataFimReal: '2025-06-08' },
            { id: 'ob3-c7-2', codigo: 'COMP-010-02', descricao: 'Pintura epóxi - áreas molhadas', unidade: 'm²', quantidade: 76, precoUnitario: 60.3, precoTotal: 4580, subitens: [], usaSubitens: false, pesoCronograma: 30, concluida: true, dataInicioPrevista: '2025-06-05', dataFimPrevista: '2025-06-20', dataInicioReal: '2025-06-06', dataFimReal: '2025-06-18' },
          ],
        },
        {
          id: 'ob3-cat8', codigo: 'CAT-011', nome: 'Esquadrias', precoTotal: 16000, usaComposicoes: true,
          dataInicioPrevista: '2025-06-01', dataFimPrevista: '2025-06-30',
          dataInicioReal: '2025-06-02', dataFimReal: '2025-06-28',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c8-1', codigo: 'COMP-011-01', descricao: 'Portas de consultórios com isolamento acústico', unidade: 'un', quantidade: 8, precoUnitario: 1250, precoTotal: 10000, subitens: [], usaSubitens: false, pesoCronograma: 60, concluida: true, dataInicioPrevista: '2025-06-01', dataFimPrevista: '2025-06-20', dataInicioReal: '2025-06-02', dataFimReal: '2025-06-18' },
            { id: 'ob3-c8-2', codigo: 'COMP-011-02', descricao: 'Vidros e divisórias de recepção', unidade: 'vb', quantidade: 1, precoUnitario: 6000, precoTotal: 6000, subitens: [], usaSubitens: false, pesoCronograma: 40, concluida: true, dataInicioPrevista: '2025-06-10', dataFimPrevista: '2025-06-30', dataInicioReal: '2025-06-12', dataFimReal: '2025-06-28' },
          ],
        },
        {
          id: 'ob3-cat9', codigo: 'CAT-012', nome: 'Louças e Metais', precoTotal: 8500, usaComposicoes: true,
          dataInicioPrevista: '2025-06-20', dataFimPrevista: '2025-07-10',
          dataInicioReal: '2025-06-22', dataFimReal: '2025-07-08',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c9-1', codigo: 'COMP-012-01', descricao: 'Louças e metais sanitários', unidade: 'vb', quantidade: 1, precoUnitario: 8500, precoTotal: 8500, subitens: [], usaSubitens: false, pesoCronograma: 100, concluida: true, dataInicioPrevista: '2025-06-20', dataFimPrevista: '2025-07-10', dataInicioReal: '2025-06-22', dataFimReal: '2025-07-08' },
          ],
        },
        {
          id: 'ob3-cat10', codigo: 'CAT-013', nome: 'Limpeza Final', precoTotal: 3500, usaComposicoes: true,
          dataInicioPrevista: '2025-07-10', dataFimPrevista: '2025-07-31',
          dataInicioReal: '2025-07-11', dataFimReal: '2025-07-28',
          statusCronograma: 'concluida', percentualCronograma: 100, responsavel: 'Ricardo Ferreira',
          composicoes: [
            { id: 'ob3-c10-1', codigo: 'COMP-013-01', descricao: 'Limpeza geral e vistoria final', unidade: 'vb', quantidade: 1, precoUnitario: 3500, precoTotal: 3500, subitens: [], usaSubitens: false, pesoCronograma: 100, concluida: true, dataInicioPrevista: '2025-07-10', dataFimPrevista: '2025-07-31', dataInicioReal: '2025-07-11', dataFimReal: '2025-07-28' },
          ],
        },
      ],
    },
  ];
}
