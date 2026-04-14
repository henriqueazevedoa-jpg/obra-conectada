import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== CONFIGURAÇÃO DE TESTE =====
const REFERENCIA_ID = 'cdb8f140-dd33-41a9-8203-2c940e10adf5';
const CODIGO_COMPOSICAO = 104658;
const UF = 'SP';
const REGIME = 'SEM_DESONERACAO';
// ================================

async function main() {
  console.log('Expandindo composição...');
  console.log(`Referência: ${REFERENCIA_ID}`);
  console.log(`Composição: ${CODIGO_COMPOSICAO}`);
  console.log(`UF: ${UF}`);
  console.log(`Regime: ${REGIME}`);

  const composicaoPrincipal = await buscarComposicaoPrincipal(
    REFERENCIA_ID,
    CODIGO_COMPOSICAO
  );

  const detalhado = await expandirComposicao({
    referenciaId: REFERENCIA_ID,
    codigoComposicao: CODIGO_COMPOSICAO,
    fatorAcumulado: 1,
    caminho: [],
    grupoOrigem: null,
  });

  const consolidado = consolidarInsumos(detalhado);
  const consolidadoComPrecos = await anexarPrecos({
    referenciaId: REFERENCIA_ID,
    insumos: consolidado,
    uf: UF,
    regime: REGIME,
  });

  const custoTotal = consolidadoComPrecos.reduce((acc, item) => {
    return acc + (Number(item.custo_total) || 0);
  }, 0);

  const resultado = {
    referencia_id: REFERENCIA_ID,
    composicao_principal: composicaoPrincipal,
    uf: UF,
    regime: REGIME,
    quantidade_insumos_detalhados: detalhado.length,
    quantidade_insumos_consolidados: consolidadoComPrecos.length,
    custo_total: custoTotal,
    detalhado,
    consolidado: consolidadoComPrecos,
  };

  console.log(JSON.stringify(resultado, null, 2));
}

async function buscarComposicaoPrincipal(referenciaId, codigo) {
  const { data, error } = await supabase
    .from('sinapi_composicoes')
    .select('codigo, descricao, unidade, grupo, situacao')
    .eq('referencia_id', referenciaId)
    .eq('codigo', codigo)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`Composição principal ${codigo} não encontrada.`);
  }

  return data;
}

async function expandirComposicao({
  referenciaId,
  codigoComposicao,
  fatorAcumulado,
  caminho,
  grupoOrigem,
}) {
  if (caminho.includes(codigoComposicao)) {
    throw new Error(
      `Loop detectado na árvore de composição. Caminho: ${[
        ...caminho,
        codigoComposicao,
      ].join(' -> ')}`
    );
  }

  const caminhoAtual = [...caminho, codigoComposicao];

  const composicaoAtual = await buscarComposicaoPrincipal(
    referenciaId,
    codigoComposicao
  );

  const { data: itens, error } = await supabase
    .from('sinapi_composicao_itens')
    .select(`
      composicao_codigo,
      ordem,
      tipo_item,
      codigo_item,
      descricao_item,
      unidade,
      coeficiente,
      situacao
    `)
    .eq('referencia_id', referenciaId)
    .eq('composicao_codigo', codigoComposicao)
    .order('ordem', { ascending: true });

  if (error) throw error;

  let resultado = [];

  for (const item of itens || []) {
    const coeficiente = Number(item.coeficiente) || 0;
    const fatorItem = coeficiente * fatorAcumulado;

    if (item.tipo_item === 'INSUMO') {
      resultado.push({
        tipo: 'INSUMO',
        codigo: Number(item.codigo_item),
        descricao: item.descricao_item,
        unidade: item.unidade,
        quantidade: fatorItem,

        // rastreabilidade
        composicao_pai_codigo: Number(codigoComposicao),
        composicao_pai_descricao: composicaoAtual.descricao,
        grupo_origem_codigo: grupoOrigem?.codigo || Number(codigoComposicao),
        grupo_origem_descricao:
          grupoOrigem?.descricao || composicaoAtual.descricao,
        caminho_composicoes: caminhoAtual,
        nivel: caminhoAtual.length - 1,
      });

      continue;
    }

    if (item.tipo_item === 'COMPOSICAO') {
      const composicaoFilha = await buscarComposicaoPrincipal(
        referenciaId,
        Number(item.codigo_item)
      );

      const filhos = await expandirComposicao({
        referenciaId,
        codigoComposicao: Number(item.codigo_item),
        fatorAcumulado: fatorItem,
        caminho: caminhoAtual,
        grupoOrigem: {
          codigo: Number(item.codigo_item),
          descricao: composicaoFilha.descricao,
        },
      });

      resultado = resultado.concat(filhos);
    }
  }

  return resultado;
}

function consolidarInsumos(lista) {
  const mapa = new Map();

  for (const item of lista) {
    const chave = String(item.codigo);

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: Number(item.quantidade) || 0,

        // mantemos grupos de origem para futura UX
        origens: [
          {
            grupo_origem_codigo: item.grupo_origem_codigo,
            grupo_origem_descricao: item.grupo_origem_descricao,
            quantidade: Number(item.quantidade) || 0,
          },
        ],
      });
    } else {
      const atual = mapa.get(chave);
      atual.quantidade += Number(item.quantidade) || 0;

      const origemExistente = atual.origens.find(
        (origem) =>
          origem.grupo_origem_codigo === item.grupo_origem_codigo
      );

      if (origemExistente) {
        origemExistente.quantidade += Number(item.quantidade) || 0;
      } else {
        atual.origens.push({
          grupo_origem_codigo: item.grupo_origem_codigo,
          grupo_origem_descricao: item.grupo_origem_descricao,
          quantidade: Number(item.quantidade) || 0,
        });
      }
    }
  }

  return Array.from(mapa.values()).sort((a, b) =>
    String(a.descricao).localeCompare(String(b.descricao), 'pt-BR')
  );
}

async function anexarPrecos({ referenciaId, insumos, uf, regime }) {
  if (!insumos.length) return [];

  const codigos = insumos.map((item) => Number(item.codigo));

  const { data: precos, error } = await supabase
    .from('sinapi_insumo_precos')
    .select('insumo_codigo, uf, regime, preco')
    .eq('referencia_id', referenciaId)
    .eq('uf', uf)
    .eq('regime', regime)
    .in('insumo_codigo', codigos);

  if (error) throw error;

  const mapaPrecos = new Map(
    (precos || []).map((preco) => [
      Number(preco.insumo_codigo),
      Number(preco.preco),
    ])
  );

  return insumos.map((item) => {
    const precoUnitario = mapaPrecos.has(Number(item.codigo))
      ? mapaPrecos.get(Number(item.codigo))
      : null;

    const custoTotal =
      precoUnitario !== null
        ? (Number(item.quantidade) || 0) * precoUnitario
        : null;

    return {
      ...item,
      uf,
      regime,
      preco_unitario: precoUnitario,
      custo_total: custoTotal,
    };
  });
}

main().catch((error) => {
  console.error('Erro ao expandir composição:', error);
  process.exit(1);
});