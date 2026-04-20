import { supabase } from '@/integrations/supabase/untyped';
import { addDays, subDays, startOfDay } from 'date-fns';

const today = startOfDay(new Date());

let isSeeding = false;

export async function seedDemoData(companyId: string, userId: string) {
  // Sync Lock Session-level (Para evitar duplicação do StrictMode e Vite HMR)
  const SESSION_LOCK_KEY = `seeding_lock_${companyId}`;
  if (sessionStorage.getItem(SESSION_LOCK_KEY) === 'true') {
     console.log('[SEED] Bloqueado por SessionStorage (Execução paralela detectada).');
     return;
  }
  sessionStorage.setItem(SESSION_LOCK_KEY, 'true');
  
  if (isSeeding) {
    console.log('[SEED] Bloqueio de concorrência ativado.');
    return;
  }

  isSeeding = true;

  try {
    console.log('[SEED] Iniciando injeção procedural de Obras e SINAPI...');

    // Busca as obras atuais
    const { data: existingObras } = await supabase
      .from('obras')
      .select('id, codigo')
      .eq('company_id', companyId);

    if (existingObras && existingObras.length >= 5) {
       console.log('[SEED] Obras já existem na conta (' + existingObras.length + '). Ignorando novo seed.');
       isSeeding = false;
       return;
    }

    if (existingObras && existingObras.length > 0 && existingObras.length < 5) {
       console.log('[SEED] Limpando obras incompletas da conta admin...');
       await supabase.from('recursos_obra').delete().eq('company_id', companyId);
       await supabase.from('obras').delete().eq('company_id', companyId);
    }


    // ── 1. BUSCAR SINAPI ──
    const { data: refs, error: refsError } = await supabase.from('sinapi_referencias').select('id, competencia').order('competencia', {ascending: false}).limit(1);
    if (refsError) console.error('[SEED] Erro ao buscar SINAPI:', refsError);
    const refId = refs?.[0]?.id;

    let allSinapi: any[] = [];
    if (refId) {
      // Busca composições da SINAPI com seus itens e custos
      const { data: composicoes } = await supabase.from('sinapi_composicoes')
        .select(`
          codigo, descricao, unidade, grupo,
          itens:sinapi_composicao_itens(tipo_item, codigo_item, descricao_item, unidade, coeficiente),
          custos:sinapi_composicao_custos(custo)
        `)
        .eq('referencia_id', refId)
        .limit(100);
      
      if (composicoes) {
        allSinapi = composicoes;
      }
    }

    // Grupos SINAPI
    const grupoMap: Record<string, any[]> = {};
    for (const c of allSinapi) {
      const g = c.grupo || 'Serviços Diversos';
      if (!grupoMap[g]) grupoMap[g] = [];
      grupoMap[g].push(c);
    }
    const gruposDisponiveis = Object.keys(grupoMap);

    // ── 2. DEFINIÇÃO DAS OBRAS ──
    const obrasToInsert = [
      {
        nome: 'Residencial Vila Nova (100% SINAPI)',
        codigo: 'OBR-2026-001',
        cliente: 'Maria Oliveira',
        endereco: 'Rua das Palmeiras, 450 - Vila Nova, São Paulo/SP',
        status: 'em_andamento',
        data_inicio: subDays(today, 60).toISOString(),
        data_previsao_termino: addDays(today, 120).toISOString(),
        responsavel: 'Carlos Mendes',
        percentual_andamento: 45,
        company_id: companyId,
        descricao: 'Construção de residência unifamiliar com orçamento 100% embasado na tabela SINAPI interna do sistema.',
      },
      { nome: 'Edifício Comercial Centro', codigo: 'OBR-2026-002', cliente: 'Pedro Santos', endereco: 'Av. Paulista, 1200 - SP', status: 'planejamento', data_inicio: addDays(today, 15).toISOString(), data_previsao_termino: addDays(today, 300).toISOString(), responsavel: 'Carlos Mendes', percentual_andamento: 0, company_id: companyId, descricao: 'Edifício comercial de 6 pavimentos. Tarefas independentes (Marcos).' },
      { nome: 'Reforma Clínica Saúde Total', codigo: 'OBR-2025-003', cliente: 'Dr. André Martins', endereco: 'Rua Augusta, 890 - SP', status: 'concluida', data_inicio: subDays(today, 150).toISOString(), data_previsao_termino: subDays(today, 10).toISOString(), responsavel: 'Ricardo Ferreira', percentual_andamento: 100, company_id: companyId, descricao: 'Reforma completa de clínica médica. Entregue no prazo.' },
      { nome: 'Loteamento e Infraestrutura Jardim', codigo: 'OBR-2026-004', cliente: 'Prefeitura M.', endereco: 'Rodovia Anhanguera', status: 'em_andamento', data_inicio: subDays(today, 20).toISOString(), data_previsao_termino: addDays(today, 200).toISOString(), responsavel: 'Eng. Logístico', percentual_andamento: 15, company_id: companyId, descricao: 'Obras de infraestrutura, drenagem. Carga de equipamentos (Histograma).' },
      { nome: 'Galpão Logístico Industrial Flex', codigo: 'OBR-2026-005', cliente: 'XPTO Logística', endereco: 'Polo Industrial Oeste', status: 'em_andamento', data_inicio: subDays(today, 90).toISOString(), data_previsao_termino: addDays(today, 10).toISOString(), responsavel: 'Eng. Produção', percentual_andamento: 80, company_id: companyId, descricao: 'Galpão pré-moldado. Curva S acentuada no início.' }
    ];

    const { data: insertedObras, error: obrasError } = await supabase.from('obras').insert(obrasToInsert).select();
    if (obrasError || !insertedObras) return;

    const obraMap = {
      vilaNova: insertedObras.find(o => o.codigo === 'OBR-2026-001')!,
      comercial: insertedObras.find(o => o.codigo === 'OBR-2026-002')!,
      clinica: insertedObras.find(o => o.codigo === 'OBR-2025-003')!,
      infra: insertedObras.find(o => o.codigo === 'OBR-2026-004')!,
      galpao: insertedObras.find(o => o.codigo === 'OBR-2026-005')!,
    };

    // Memberships
    const memberships = insertedObras.map(o => ({ obra_id: o.id, user_id: userId, role: 'gestor' }));
    await supabase.from('obra_memberships').insert(memberships);

    // ── 3. RECURSOS ──
    const idResMestre = crypto.randomUUID();
    const idResEscavadeira = crypto.randomUUID();
    await supabase.from('recursos_obra').insert([
      { id: idResMestre, obra_id: obraMap.vilaNova.id, company_id: companyId, tipo: 'EQUIPE', nome: 'Mestre Giba', capacidade_diaria: 1, custo_hora: 45 },
      { id: idResEscavadeira, obra_id: obraMap.infra.id, company_id: companyId, tipo: 'EQUIPAMENTO', nome: 'Escavadeira CAT 320', capacidade_diaria: 1, custo_hora: 150 },
    ]);

    // ── 4. GERAÇÃO PROCEDURAL DOS ORÇAMENTOS E CRONOGRAMAS ──
    
    // Obra 1: Totalmente SINAPI (Se encontrarmos sinapi na conta)
    await seedObraProceduralSINAPI(obraMap.vilaNova, gruposDisponiveis, grupoMap, idResMestre, 0, 45); // andamento ~45%
    
    // Obras restantes: Miscelânea SINAPI + Composições Próprias (para simular cotação pendente)
    await seedObraProceduralMista(obraMap.comercial, 'planejamento', 0);
    await seedObraProceduralMista(obraMap.clinica, 'concluida', 100);
    await seedObraProceduralMista(obraMap.infra, 'em_andamento', 15, idResEscavadeira);
    await seedObraProceduralMista(obraMap.galpao, 'em_andamento', 80);

    console.log('[SEED] Dados de demonstração procedurais injetados com sucesso!');
  } catch (error) {
    console.error('[SEED] Falha catastrófica no seed procedural:', error);
  } finally {
    setTimeout(() => sessionStorage.removeItem(`seeding_lock_${companyId}`), 5000);
    isSeeding = false;
  }
}

async function seedObraProceduralSINAPI(obra: any, gruposDisponiveis: string[], grupoMap: Record<string, any[]>, idResMestre: string, indexOffset: number, progressoGeral: number) {
  // Pega até 6 grupos que tenham coisas SINAPI
  const maxGroups = Math.min(6, gruposDisponiveis.length);
  const selectedGroups = gruposDisponiveis.slice(0, maxGroups);

  const tarefas: any[] = [];
  const categoriasInsert: any[] = [];
  const composicoesInsert: any[] = [];
  const itensInsert: any[] = [];

  for (let i = 0; i < maxGroups; i++) {
    const nomeGrupo = selectedGroups[i];
    const catId = crypto.randomUUID();
    let precoCat = 0;

    const compG = grupoMap[nomeGrupo];
    const qtyComps = Math.min(4, compG.length);

    for (let j = 0; j < qtyComps; j++) {
      const compId = crypto.randomUUID();
      const comp = compG[j];
      const qtdeComp = Math.floor(Math.random() * 50) + 10;
      const custoUnit = comp.custos && comp.custos.length > 0 ? parseFloat(comp.custos[0].custo) : (Math.random() * 100 + 10);
      const precoTot = qtdeComp * custoUnit;
      
      precoCat += precoTot;

      composicoesInsert.push({
        id: compId, etapa_id: catId, company_id: obra.company_id,
        codigo: comp.codigo.toString(),
        descricao: comp.descricao,
        unidade: comp.unidade || 'un',
        quantidade: qtdeComp,
        preco_unitario: custoUnit,
        preco_total: precoTot,
        fonte_referencia: 'SINAPI'
      });

      // Insumos da composição SINAPI
      if (comp.itens && comp.itens.length > 0) {
        comp.itens.forEach((it: any) => {
           itensInsert.push({
             id: crypto.randomUUID(),
             categoria_id: catId,
             composicao_id: compId,
             company_id: obra.company_id,
             codigo: it.codigo_item ? it.codigo_item.toString() : crypto.randomUUID(),
             nome: it.descricao_item || 'Insumo Genérico',
             unidade: it.unidade || 'un',
             quantidade: Number(it.coeficiente) * qtdeComp,
             custo_unitario: (custoUnit * 0.9) / comp.itens.length, // estimado pra demo
             custo_total: (Number(it.coeficiente) * qtdeComp) * ((custoUnit * 0.9) / comp.itens.length),
             origem_composicao_codigo: comp.codigo.toString()
           });
        });
      }
    }

    categoriasInsert.push({
      id: catId, obra_id: obra.id, company_id: obra.company_id,
      nome: nomeGrupo, codigo: `0${i+1}`, preco_total: precoCat
    });

    // Tarefas Críticas (atraso na primeira para o Mestre Giba)
    const bStart = subDays(today, 60 - i*15);
    const bEnd = subDays(today, 45 - i*15);
    let realStart = bStart;
    let realEnd = bEnd;
    let perc = progressoGeral;

    if (i === 0) {
       // Atrasado para colidir recurso
       perc = 100;
    } else if (i === 1) {
       // Força colisão de datas com a etapa 2 pra mostrar no histograma de Mestre Giba!
       realStart = subDays(today, 5);
       realEnd = addDays(today, 15);
       perc = 40;
    } else {
       perc = 0;
       realStart = addDays(today, i*10);
       realEnd = addDays(today, 20 + i*10);
    }

    tarefas.push({
      id: crypto.randomUUID(),
      obra_id: obra.id,
      nome: nomeGrupo,
      tipo_tarefa: 'PADRAO',
      baseline_inicio: bStart.toISOString(),
      baseline_fim: bEnd.toISOString(),
      data_inicio: realStart.toISOString(),
      data_fim: realEnd.toISOString(),
      percentual_concluido: perc,
      orcamento_categoria_id: catId,
      peso_orcamento: precoCat
    });
  }

  // Se nada foi gerado (sem sinapi), insere uma vazia
  if (categoriasInsert.length === 0) {
    const backupCatId = crypto.randomUUID();
    categoriasInsert.push({ id: backupCatId, obra_id: obra.id, company_id: obra.company_id, nome: 'Serviços Preliminares', codigo: '01', preco_total: 10000 });
    tarefas.push({ id: crypto.randomUUID(), obra_id: obra.id, nome: 'Serviços Preliminares', tipo_tarefa: 'PADRAO', baseline_inicio: today.toISOString(), baseline_fim: addDays(today, 10).toISOString(), data_inicio: today.toISOString(), data_fim: addDays(today, 10).toISOString(), percentual_concluido: 0, orcamento_categoria_id: backupCatId, peso_orcamento: 10000 });
  }

  // Bulk Inserts!
  if (categoriasInsert.length > 0) await supabase.from('orcamento_categorias').insert(categoriasInsert);
  // Dividindo os batches para evitar payload muito longo (supabase size limit)
  for(let i=0; i<composicoesInsert.length; i+=100) { await supabase.from('orcamento_composicoes').insert(composicoesInsert.slice(i, i+100)); }
  for(let i=0; i<itensInsert.length; i+=100) { await supabase.from('orcamento_subitens').insert(itensInsert.slice(i, i+100)); }
  
  if (tarefas.length > 0) await supabase.from('cronograma_tarefas').insert(tarefas);

  // Alocando o Recurso Crítico na tarefa de index 1 (pra colidir hoje)
  if (tarefas.length > 1 && idResMestre) {
     await supabase.from('cronograma_alocacoes').insert([
       { tarefa_id: tarefas[1].id, recurso_id: idResMestre, carga_percentual: 100 },
       { tarefa_id: tarefas[0].id, recurso_id: idResMestre, carga_percentual: 80 } // Atrasada e alocada HOJE! > 100% total
     ]);
  }
}

// Procedural para criar tarefas variadas, mesclando pendentes sem preços para cotação
async function seedObraProceduralMista(obra: any, status: string, prog: number, idResSecundario?: string) {
   const cats = [
     {n: 'Infraestrutura', val: 50000},
     {n: 'Superestrutura', val: 120000},
     {n: 'Alvenaria', val: 45000},
     {n: 'Acabamentos', val: 0} // 0 Força cotação vazia!
   ];

   const tarefas: any[] = [];
   
   for(let i=0; i<cats.length; i++) {
     const catRes = await supabase.from('orcamento_categorias').insert({
       obra_id: obra.id, nome: cats[i].n, codigo: `0${i+1}`, preco_total: cats[i].val, company_id: obra.company_id
     }).select('id').single();

     if (catRes.data) {
       // Composição Propria Completa
       if (cats[i].val > 0) {
         await supabase.from('orcamento_composicoes').insert({
           etapa_id: catRes.data.id, codigo: `0${i+1}.1`, descricao: `Execução ${cats[i].n}`,
           preco_unitario: cats[i].val, quantidade: 1, preco_total: cats[i].val, company_id: obra.company_id, fonte_referencia: 'PRÓPRIA'
         });
       } else {
         // Composição Própria com custo Vazio, para a aba de Cotações!
         const cpRes = await supabase.from('orcamento_composicoes').insert({
           etapa_id: catRes.data.id, codigo: `0${i+1}.1`, descricao: `Material Pendente ${cats[i].n}`,
           preco_unitario: 0, quantidade: 15, preco_total: 0, company_id: obra.company_id, fonte_referencia: 'PRÓPRIA'
         }).select('id').single();
         if (cpRes.data) {
            await supabase.from('orcamento_subitens').insert({
               categoria_id: catRes.data.id, composicao_id: cpRes.data.id, company_id: obra.company_id,
               nome: 'Porcelanato A', unidade: 'm²', quantidade: 15, custo_unitario: 0, custo_total: 0
            });
         }
       }

       let bStart = subDays(today, 60 - i*15);
       let bEnd = subDays(today, 45 - i*15);
       
       if (status === 'planejamento') { bStart = addDays(today, 10 + i*10); bEnd = addDays(today, 20 + i*10); }
       if (status === 'concluida') { bStart = subDays(today, 200 - i*10); bEnd = subDays(today, 190 - i*10); }

       const tarId = crypto.randomUUID();
       tarefas.push({
          id: tarId, obra_id: obra.id, nome: cats[i].n, tipo_tarefa: 'PADRAO',
          baseline_inicio: bStart.toISOString(), baseline_fim: bEnd.toISOString(),
          data_inicio: bStart.toISOString(), data_fim: bEnd.toISOString(), percentual_concluido: prog,
          orcamento_categoria_id: catRes.data.id, peso_orcamento: cats[i].val
       });

       if (idResSecundario && i === 0) {
         await supabase.from('cronograma_alocacoes').insert([{ tarefa_id: tarId, recurso_id: idResSecundario, carga_percentual: 100 }]);
       }
     }
   }

   // Lote Marcos Administrativos fora do orçamento (Tarefas independentes)
   tarefas.push({
      id: crypto.randomUUID(), obra_id: obra.id, nome: 'Alvará Prefeitura', tipo_tarefa: 'MARCO',
      baseline_inicio: today.toISOString(), baseline_fim: today.toISOString(),
      data_inicio: today.toISOString(), data_fim: today.toISOString(), percentual_concluido: prog === 100 ? 100 : 0
   });

   if (tarefas.length > 0) await supabase.from('cronograma_tarefas').insert(tarefas);
}
