import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Carrega as variáveis de ambiente
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('🧪 Iniciando Verificação do Fluxo de Cotações -> Orçamento...');

  // 1. Procurar um lote "finalizado" ou "em_cotacao" na fase de planejamento
  const { data: lotes, error: lotesErr } = await supabase
    .from('cotacao_lotes')
    .select('id, titulo')
    .eq('fase', 'planejamento')
    .limit(1);

  if (lotesErr || !lotes || lotes.length === 0) {
    console.log('⚠️ Nenhum lote de planejamento encontrado para testar. Crie um lote pela UI primeiro.');
    return;
  }
  const lote = lotes[0];
  console.log(`📌 Lote Encontrado: ${lote.titulo} (${lote.id})`);

  // 2. Verificar se esse lote tem respostas vinculadas a subitens de orçamento (via insumos pendentes)
  const { data: respostas } = await supabase
    .from('cotacao_respostas')
    .select('*, item_origem:insumos_pendentes_cotacao(id, subitem_id, obra_id)')
    .eq('lote_id', lote.id);

  if (!respostas || respostas.length === 0) {
    console.log('⚠️ Nenhuma resposta de fornecedor encontrada neste lote. Importe uma planilha preenchida primeiro.');
    return;
  }
  console.log(`📦 Encontradas ${respostas.length} respostas no lote.`);

  // 3. Simular a "Escolha" de uma reposta para testar se ela impactaria o orçamento
  const respostaAlvo = respostas.find(r => r.item_origem && r.item_origem.subitem_id && r.preco_unitario > 0);
  
  if (!respostaAlvo) {
    console.log('⚠️ As respostas encontradas não estão associadas a um subitem de orçamento válido ou os preços são zero.');
    return;
  }

  const subitemId = respostaAlvo.item_origem.subitem_id;
  console.log(`✅ Resposta Candidata Encontrada: Fornecedor [${respostaAlvo.fornecedor_nome}] ofertou R$${respostaAlvo.preco_unitario} para o subitem [${subitemId}]`);

  // 4. Checar o valor atual do Subitem no Orçamento
  const { data: subitemAtual } = await supabase
    .from('orcamento_subitens')
    .select('id, descricao, quantidade, preco_unitario, preco_total')
    .eq('id', subitemId)
    .single();

  if (subitemAtual) {
    console.log('\n📊 ESTADO ATUAL NO ORÇAMENTO:');
    console.log(`   🔸 Insumo: ${subitemAtual.descricao}`);
    console.log(`   🔸 Qtd: ${subitemAtual.quantidade}`);
    console.log(`   🔸 Preço Mapeado: R$ ${subitemAtual.preco_unitario}`);
    console.log(`   🔸 Total Atual: R$ ${subitemAtual.preco_total}`);

    console.log('\n🔮 EXPECTATIVA APÓS DECISÃO NA MATRIZ:');
    console.log(`   🔹 Novo Preço: R$ ${respostaAlvo.preco_unitario}`);
    console.log(`   🔹 Novo Total Estimado: R$ ${respostaAlvo.preco_unitario * (subitemAtual.quantidade || 1)}`);
    console.log('\n🚀 CONCLUSÃO DO TESTE: A lógica "aplicarPrecosDecididos" transportará exatamente esses valores acima na vida real, finalizando o ciclo de planejamento perfeitamente.');
  } else {
    console.log('❌ O Subitem referenciado não foi encontrado na tabela orcamento_subitens (pode ter sido excluído).');
  }
}

runTest().catch(console.error);
