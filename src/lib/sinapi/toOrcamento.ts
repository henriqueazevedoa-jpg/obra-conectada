import type {
  OrcamentoComposicao,
  OrcamentoSubitem,
} from '@/contexts/OrcamentoContext';
import type { SinapiComposicaoExpandida } from './expandComposicao';

function gerarCodigoSubitem(index: number) {
  return `SIN-SUB-${String(index + 1).padStart(3, '0')}`;
}

export function sinapiExpandidaParaOrcamentoComposicao(params: {
  resultado: SinapiComposicaoExpandida;
  competencia: string;
}): OrcamentoComposicao {
  const { resultado, competencia } = params;

  const subitens: OrcamentoSubitem[] = resultado.consolidado.map((item, index) => {
    const origemPrincipal = item.origens[0];

    return {
      id: crypto.randomUUID(),
      codigo: gerarCodigoSubitem(index),
      descricao: item.descricao,
      unidade: item.unidade || '',
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      precoTotal: Number(item.custoTotal) || 0,

      codigoReferenciaExterna: String(item.codigo),
      origemGrupoTitulo: item.origens
        .map((origem) => origem.grupoOrigemDescricao)
        .join(' | '),
      origemComposicaoCodigo: origemPrincipal
        ? String(origemPrincipal.grupoOrigemCodigo)
        : undefined,
      origemComposicaoDescricao: origemPrincipal?.grupoOrigemDescricao,
    };
  });

  return {
    id: crypto.randomUUID(),
    codigo: `SINAPI-${resultado.composicaoPrincipal.codigo}`,
    descricao: resultado.composicaoPrincipal.descricao,
    unidade: resultado.composicaoPrincipal.unidade || '',
    quantidade: 1,
    precoUnitario: resultado.custoTotal,
    precoTotal: resultado.custoTotal,
    subitens,
    usaSubitens: true,

    fonteReferencia: 'SINAPI',
    codigoReferenciaExterna: String(resultado.composicaoPrincipal.codigo),
    referenciaCompetencia: competencia,
    ufReferencia: resultado.uf,
    regimeReferencia: resultado.regime,
  };
}