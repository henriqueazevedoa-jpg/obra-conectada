import { supabase } from '@/integrations/supabase/untyped';

export type SinapiRegime =
  | 'SEM_DESONERACAO'
  | 'COM_DESONERACAO'
  | 'SEM_ENCARGOS';

export interface SinapiInsumoDetalhado {
  tipo: 'INSUMO';
  codigo: number;
  descricao: string;
  unidade: string | null;
  quantidade: number;

  composicaoPaiCodigo: number;
  composicaoPaiDescricao: string;
  grupoOrigemCodigo: number;
  grupoOrigemDescricao: string;
  caminhoComposicoes: number[];
  nivel: number;
}

export interface SinapiInsumoConsolidado {
  codigo: number;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  origens: {
    grupoOrigemCodigo: number;
    grupoOrigemDescricao: string;
    quantidade: number;
  }[];
  uf: string;
  regime: SinapiRegime;
  precoUnitario: number | null;
  custoTotal: number | null;
}

export interface SinapiComposicaoExpandida {
  referenciaId: string;
  composicaoPrincipal: {
    codigo: number;
    descricao: string;
    unidade: string | null;
    grupo: string | null;
    situacao: string | null;
  };
  uf: string;
  regime: SinapiRegime;
  detalhado: SinapiInsumoDetalhado[];
  consolidado: SinapiInsumoConsolidado[];
  custoTotal: number;
}

async function buscarComposicaoPrincipal(referenciaId: string, codigo: number) {
  const { data, error } = await supabase
    .from('sinapi_composicoes')
    .select('codigo, descricao, unidade, grupo, situacao')
    .eq('referencia_id', referenciaId)
    .eq('codigo', codigo)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Composição ${codigo} não encontrada.`);

  return {
    codigo: Number(data.codigo),
    descricao: data.descricao,
    unidade: data.unidade ?? null,
    grupo: data.grupo ?? null,
    situacao: data.situacao ?? null,
  };
}

async function expandirRecursivamente(params: {
  referenciaId: string;
  codigoComposicao: number;
  fatorAcumulado: number;
  caminho: number[];
  grupoOrigem: { codigo: number; descricao: string } | null;
}): Promise<SinapiInsumoDetalhado[]> {
  const { referenciaId, codigoComposicao, fatorAcumulado, caminho, grupoOrigem } = params;

  if (caminho.includes(codigoComposicao)) {
    throw new Error(`Loop detectado: ${[...caminho, codigoComposicao].join(' -> ')}`);
  }

  const caminhoAtual = [...caminho, codigoComposicao];
  const composicaoAtual = await buscarComposicaoPrincipal(referenciaId, codigoComposicao);

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

  let resultado: SinapiInsumoDetalhado[] = [];

  for (const item of itens || []) {
    const coeficiente = Number(item.coeficiente) || 0;
    const fatorItem = coeficiente * fatorAcumulado;

    if (item.tipo_item === 'INSUMO') {
      resultado.push({
        tipo: 'INSUMO',
        codigo: Number(item.codigo_item),
        descricao: item.descricao_item,
        unidade: item.unidade ?? null,
        quantidade: fatorItem,
        composicaoPaiCodigo: codigoComposicao,
        composicaoPaiDescricao: composicaoAtual.descricao,
        grupoOrigemCodigo: grupoOrigem?.codigo || codigoComposicao,
        grupoOrigemDescricao: grupoOrigem?.descricao || composicaoAtual.descricao,
        caminhoComposicoes: caminhoAtual,
        nivel: caminhoAtual.length - 1,
      });

      continue;
    }

    if (item.tipo_item === 'COMPOSICAO') {
      const composicaoFilha = await buscarComposicaoPrincipal(
        referenciaId,
        Number(item.codigo_item)
      );

      const filhos = await expandirRecursivamente({
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

function consolidarInsumos(
  detalhado: SinapiInsumoDetalhado[]
): Omit<SinapiInsumoConsolidado, 'uf' | 'regime' | 'precoUnitario' | 'custoTotal'>[] {
  const mapa = new Map<string, Omit<SinapiInsumoConsolidado, 'uf' | 'regime' | 'precoUnitario' | 'custoTotal'>>();

  for (const item of detalhado) {
    const chave = String(item.codigo);

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: Number(item.quantidade) || 0,
        origens: [
          {
            grupoOrigemCodigo: item.grupoOrigemCodigo,
            grupoOrigemDescricao: item.grupoOrigemDescricao,
            quantidade: Number(item.quantidade) || 0,
          },
        ],
      });
      continue;
    }

    const atual = mapa.get(chave)!;
    atual.quantidade += Number(item.quantidade) || 0;

    const origemExistente = atual.origens.find(
      (origem) => origem.grupoOrigemCodigo === item.grupoOrigemCodigo
    );

    if (origemExistente) {
      origemExistente.quantidade += Number(item.quantidade) || 0;
    } else {
      atual.origens.push({
        grupoOrigemCodigo: item.grupoOrigemCodigo,
        grupoOrigemDescricao: item.grupoOrigemDescricao,
        quantidade: Number(item.quantidade) || 0,
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) =>
    String(a.descricao).localeCompare(String(b.descricao), 'pt-BR')
  );
}

async function anexarPrecos(params: {
  referenciaId: string;
  insumos: Omit<SinapiInsumoConsolidado, 'uf' | 'regime' | 'precoUnitario' | 'custoTotal'>[];
  uf: string;
  regime: SinapiRegime;
}): Promise<SinapiInsumoConsolidado[]> {
  const { referenciaId, insumos, uf, regime } = params;

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

  const mapaPrecos = new Map<number, number>(
    (precos || []).map((preco) => [
      Number(preco.insumo_codigo),
      Number(preco.preco),
    ])
  );

  return insumos.map((item) => {
    const precoUnitario = mapaPrecos.has(Number(item.codigo))
      ? mapaPrecos.get(Number(item.codigo))!
      : null;

    const custoTotal =
      precoUnitario !== null
        ? (Number(item.quantidade) || 0) * precoUnitario
        : null;

    return {
      ...item,
      uf,
      regime,
      precoUnitario,
      custoTotal,
    };
  });
}

export async function expandirComposicaoSinapi(params: {
  referenciaId: string;
  codigoComposicao: number;
  uf: string;
  regime: SinapiRegime;
}): Promise<SinapiComposicaoExpandida> {
  const { referenciaId, codigoComposicao, uf, regime } = params;

  const composicaoPrincipal = await buscarComposicaoPrincipal(
    referenciaId,
    codigoComposicao
  );

  const detalhado = await expandirRecursivamente({
    referenciaId,
    codigoComposicao,
    fatorAcumulado: 1,
    caminho: [],
    grupoOrigem: null,
  });

  const consolidadoBase = consolidarInsumos(detalhado);
  const consolidado = await anexarPrecos({
    referenciaId,
    insumos: consolidadoBase,
    uf,
    regime,
  });

  const custoTotal = consolidado.reduce((acc, item) => {
    return acc + (Number(item.custoTotal) || 0);
  }, 0);

  return {
    referenciaId,
    composicaoPrincipal,
    uf,
    regime,
    detalhado,
    consolidado,
    custoTotal,
  };
}