import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import { catalogoInsumos, InsumoTemplate } from '@/data/catalogoInsumos';

// --- Types ---
export interface OrcamentoInsumo {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoUnitario: number | null;
  precoTotal: number;

  codigoReferenciaExterna?: string;
  origemGrupoTitulo?: string;
  origemComposicaoCodigo?: string;
  origemComposicaoDescricao?: string;

  // Campos SINAPI (preenchidos pelo assistente de IA)
  sinapiCodigo?: number | null;
  sinapiFonte?: string | null;
  sinapiPreco?: number | null;
  sinapiConfidence?: string | null;
  sinapiConfirmado?: boolean;

  /** Sprint 55C: Tipo e regime do insumo */
  tipo_item?: 'material' | 'mao_obra' | 'equipamento' | 'servico';
  needsTypeReview?: boolean;
  pending?: boolean;
  regime_mo?: 'clt' | 'mei' | 'autonomo' | 'pj' | null;
}

export interface OrcamentoComposicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoUnitario: number | null;
  precoTotal: number;
  insumos: OrcamentoInsumo[];
  usaInsumos: boolean;

  fonteReferencia?: string;
  codigoReferenciaExterna?: string;
  referenciaCompetencia?: string;
  ufReferencia?: string;
  regimeReferencia?: string;

  // Campos SINAPI (preenchidos pelo assistente de IA)
  sinapiCodigo?: number | null;
  sinapiFonte?: string | null;
  sinapiPreco?: number | null;
  sinapiConfidence?: string | null;
  sinapiConfirmado?: boolean;

  /** Tipo do item: composicao (com insumos) ou insumo_direto (sem decomposicao) */
  tipo?: 'composicao' | 'insumo_direto';

  dataInicioPrevista?: string;
  dataFimPrevista?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  pesoCronograma?: number;
  concluida?: boolean;

  /** Sprint 55C: Tipo e regime da composição */
  tipo_item?: 'material' | 'mao_obra' | 'equipamento' | 'servico' | 'composicao';
  regime_mo?: 'clt' | 'mei' | 'autonomo' | 'pj' | null;
}

export interface OrcamentoEtapa {
  id: string;
  codigo: string;
  nome: string;
  precoTotal: number;
  usaComposicoes: boolean;
  tipo: 'etapa';
  items: Array<OrcamentoEtapa | OrcamentoComposicao>;
  dataInicioPrevista?: string;
  dataFimPrevista?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  statusCronograma?: 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada';
  percentualCronograma?: number;
  responsavel?: string;
  observacoesCronograma?: string;
  /** Sprint 4: referência à versão de orçamento */
  versaoId?: string;
  /** Sprint 4: valor estimativo (base para delta no modo Analítico) */
  estimadoValor?: number;
  /** Suporte a Subetapas (N-Níveis) */
  parentId?: string;
}

export type VersaoTipo = 'estimativo' | 'analitico' | 'revisao';
export type VersaoStatus = 'rascunho' | 'ativo' | 'arquivado';

export interface OrcamentoVersao {
  id: string;
  obraId: string;
  companyId: string | null;
  numeroVersao: string;
  tipo: VersaoTipo;
  status: VersaoStatus;
  valorTotal: number;
  versaoPaiId?: string;
  descricao?: string;
  createdAt: string;
}

export interface OrcamentoObra {
  obraId: string;
  etapas: OrcamentoEtapa[];
}

export interface EtapaTemplate {
  codigo: string;
  nome: string;
}

type DbRow = Record<string, unknown>;

const defaultEtapas: EtapaTemplate[] = [
  { codigo: '01', nome: 'Serviços Preliminares' },
  { codigo: '02', nome: 'Demolições e Remoções' },
  { codigo: '03', nome: 'Movimento de Terra e Terraplanagem' },
  { codigo: '04', nome: 'Fundações e Contenções' },
  { codigo: '05', nome: 'Estrutura' },
  { codigo: '06', nome: 'Impermeabilização' },
  { codigo: '07', nome: 'Alvenaria e Vedações' },
  { codigo: '08', nome: 'Cobertura e Telhamento' },
  { codigo: '09', nome: 'Instalações Hidrossanitárias' },
  { codigo: '10', nome: 'Instalações Elétricas e Lógica' },
  { codigo: '11', nome: 'Instalações de Climatização' },
  { codigo: '12', nome: 'Instalações de Incêndio e SPDA' },
  { codigo: '13', nome: 'Revestimentos Internos' },
  { codigo: '14', nome: 'Revestimentos Externos e Fachada' },
  { codigo: '15', nome: 'Pisos e Contrapisos' },
  { codigo: '16', nome: 'Esquadrias e Vidros' },
  { codigo: '17', nome: 'Louças, Metais e Acessórios' },
  { codigo: '18', nome: 'Pintura e Acabamentos' },
  { codigo: '19', nome: 'Paisagismo e Urbanização' },
  { codigo: '20', nome: 'Entrega e Limpeza Final' },
];

interface OrcamentoContextType {
  orcamentos: OrcamentoObra[];
  loading: boolean;
  getOrcamento: (obraId: string) => OrcamentoObra | undefined;
  saveOrcamento: (orc: OrcamentoObra) => Promise<void>;
  finalizarOrcamento: (orc: OrcamentoObra) => Promise<{ total: number; novos: number }>;
  catalogoEtapas: EtapaTemplate[];
  addEtapaToCatalogo: (cat: EtapaTemplate) => void;
  generateEtapaCodigo: (etapasAtuais: OrcamentoEtapa[]) => string;
  getUnidadesUsadas: () => string[];
  getSugestaoInsumos: (etapaNome: string) => InsumoTemplate[];
  getComposicoesUsadasPorEtapa: (etapaNome: string) => { descricao: string; unidade: string }[];
  getTodasComposicoes: () => { descricao: string; unidade: string; etapaNome: string }[];
  generateComposicaoCodigo: (etapaCode: string, existingCodes: string[]) => string;
  generateInsumoCodigo: (composicaoCodigo: string, existingCodes: string[]) => string;
  recalcularWBS: (items: Array<OrcamentoEtapa | OrcamentoComposicao>, parentPrefix?: string) => Array<OrcamentoEtapa | OrcamentoComposicao>;
  refreshOrcamentos: () => Promise<void>;
  // ── Sprint 4: Versões de orçamento ────────────────────────────────────────────────────
  versoes: OrcamentoVersao[];
  getVersoes: (obraId: string) => OrcamentoVersao[];
  getVersaoAtiva: (obraId: string) => OrcamentoVersao | undefined;
  criarVersao: (obraId: string, opts: { tipo: VersaoTipo; descricao?: string; copiarDeVersaoId?: string }) => Promise<OrcamentoVersao>;
  salvarVersao: (versaoId: string, etapas: OrcamentoEtapa[]) => Promise<void>;
  getEtapasDaVersao: (versaoId: string) => OrcamentoEtapa[] | undefined;
  evoluirParaAnalitico: (versaoEstimativoId: string) => Promise<OrcamentoVersao>;
  ativarVersao: (versaoId: string, obraId: string) => Promise<void>;
  arquivarVersao: (versaoId: string) => Promise<void>;
  removerVersao: (versaoId: string) => Promise<void>;

  // ── Configurações SINAPI ────────────────────────────────────────────────────────
  sinapiConfig: SinapiConfig;
  updateSinapiConfig: (cfg: Partial<SinapiConfig>) => void;
}

export interface SinapiConfig {
  referencia_id: string | null;
  uf: string;
  regime: 'SEM_DESONERACAO' | 'COM_DESONERACAO';
  competencia?: string;
  isSinapiSearchEnabled?: boolean;
}

const OrcamentoContext = createContext<OrcamentoContextType | null>(null);

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function asNullableNumber(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed ?? null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asStatusCronograma(
  value: unknown
): OrcamentoEtapa['statusCronograma'] {
  if (
    value === 'nao_iniciada' ||
    value === 'em_andamento' ||
    value === 'concluida' ||
    value === 'atrasada'
  ) {
    return value;
  }
  return undefined;
}

// --- DB mapping helpers ---

/**
 * Normaliza origem_grupo_titulo (preenchido pelo seed) para o enum interno tipo_item.
 * Aceita variantes com e sem acento, caixa mista.
 */
function normalizeOrigemToTipoItem(
  value: unknown
): 'material' | 'mao_obra' | 'equipamento' | 'servico' | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const v = value.trim().toLowerCase();
  if (v === 'material') return 'material';
  if (v === 'mão de obra' || v === 'mao de obra' || v === 'mão-de-obra' || v === 'mo') return 'mao_obra';
  if (v === 'equipamento' || v === 'equipment') return 'equipamento';
  if (v === 'serviço' || v === 'servico' || v === 'serviços') return 'servico';
  return undefined;
}
function dbToInsumo(row: DbRow): OrcamentoInsumo {
  // Fallback de descrição: descricao → nome → string vazia
  const descricao =
    asOptionalString(row.descricao) ??
    asOptionalString(row.nome) ??
    'Insumo sem descrição';

  // Fallback de tipo: tipo_item → tipo → origem_grupo_titulo → 'material'
  const tipo_item: OrcamentoInsumo['tipo_item'] =
    normalizeOrigemToTipoItem(row.tipo_item) ??
    normalizeOrigemToTipoItem(row.tipo) ??
    normalizeOrigemToTipoItem(row.origem_grupo_titulo) ??
    'material';

  return {
    id: asString(row.id),
    codigo: asString(row.codigo),
    descricao,
    unidade: asString(row.unidade),
    quantidade: asNullableNumber(row.quantidade),
    precoUnitario: asNullableNumber(row.preco_unitario),
    precoTotal: asNumber(row.preco_total) ?? 0,

    codigoReferenciaExterna: asOptionalString(row.codigo_referencia_externa),
    origemGrupoTitulo: asOptionalString(row.origem_grupo_titulo),
    origemComposicaoCodigo: asOptionalString(row.origem_composicao_codigo),
    origemComposicaoDescricao: asOptionalString(row.origem_composicao_descricao),

    sinapiCodigo: row.sinapi_codigo != null ? Number(row.sinapi_codigo) : null,
    sinapiFonte: asOptionalString(row.sinapi_fonte),
    sinapiPreco: row.sinapi_preco != null ? Number(row.sinapi_preco) : null,
    sinapiConfidence: asOptionalString(row.sinapi_confidence),
    sinapiConfirmado: asBoolean(row.sinapi_confirmado),

    tipo_item,
    regime_mo: (row.regime_mo as any) || null,
  };
}

function dbToComposicao(row: DbRow, insumos: OrcamentoInsumo[]): OrcamentoComposicao {
  return {
    id: asString(row.id),
    codigo: asString(row.codigo),
    descricao: asString(row.descricao),
    unidade: asString(row.unidade),
    quantidade: asNullableNumber(row.quantidade),
    precoUnitario: asNullableNumber(row.preco_unitario),
    precoTotal: asNumber(row.preco_total) ?? 0,
    insumos,
    usaInsumos: asBoolean(row.usa_subitens),

    fonteReferencia: asOptionalString(row.fonte_referencia),
    codigoReferenciaExterna: asOptionalString(row.codigo_referencia_externa),
    referenciaCompetencia: asOptionalString(row.referencia_competencia),
    ufReferencia: asOptionalString(row.uf_referencia),
    regimeReferencia: asOptionalString(row.regime_referencia),

    sinapiCodigo: row.sinapi_codigo != null ? Number(row.sinapi_codigo) : null,
    sinapiFonte: asOptionalString(row.sinapi_fonte),
    sinapiPreco: row.sinapi_preco != null ? Number(row.sinapi_preco) : null,
    sinapiConfidence: asOptionalString(row.sinapi_confidence),
    sinapiConfirmado: asBoolean(row.sinapi_confirmado),

    dataInicioPrevista: asOptionalString(row.data_inicio_prevista),
    dataFimPrevista: asOptionalString(row.data_fim_prevista),
    dataInicioReal: asOptionalString(row.data_inicio_real),
    dataFimReal: asOptionalString(row.data_fim_real),
    pesoCronograma: asNumber(row.peso_cronograma),
    concluida: asBoolean(row.concluida),
    tipo: (row.tipo === 'insumo_direto' ? 'insumo_direto' : 'composicao') as 'composicao' | 'insumo_direto',
    tipo_item: (row.tipo_item as any) || 'material',
    regime_mo: (row.regime_mo as any) || null,
  };
}

function dbToEtapa(row: DbRow, composicoes: OrcamentoComposicao[]): OrcamentoEtapa {
  return {
    id: asString(row.id),
    codigo: asString(row.codigo),
    nome: asString(row.nome),
    precoTotal: asNumber(row.preco_total) ?? 0,
    usaComposicoes: asBoolean(row.usa_composicoes),
    tipo: 'etapa',
    items: composicoes,
    dataInicioPrevista: asOptionalString(row.data_inicio_prevista),
    dataFimPrevista: asOptionalString(row.data_fim_prevista),
    dataInicioReal: asOptionalString(row.data_inicio_real),
    dataFimReal: asOptionalString(row.data_fim_real),
    statusCronograma: asStatusCronograma(row.status_cronograma),
    percentualCronograma: asNumber(row.percentual_cronograma),
    responsavel: asOptionalString(row.responsavel),
    observacoesCronograma: asOptionalString(row.observacoes_cronograma),
    // Sprint 4
    versaoId: asOptionalString(row.versao_id),
    estimadoValor: asNumber(row.estimado_valor),
    // N-Níveis
    parentId: asOptionalString(row.parent_id),
  };
}

function dbToVersao(row: DbRow): OrcamentoVersao {
  return {
    id: asString(row.id),
    obraId: asString(row.obra_id),
    companyId: asOptionalString(row.company_id) ?? null,
    numeroVersao: asString(row.numero_versao, 'v1.0'),
    tipo: (row.tipo as VersaoTipo) || 'estimativo',
    status: (row.status as VersaoStatus) || 'ativo',
    valorTotal: asNumber(row.valor_total) ?? 0,
    versaoPaiId: asOptionalString(row.versao_pai_id),
    descricao: asOptionalString(row.descricao),
    createdAt: asString(row.created_at),
  };
}

export function buildEtapasTree(flatEtapas: OrcamentoEtapa[]): OrcamentoEtapa[] {
  const map = new Map<string, OrcamentoEtapa>();
  flatEtapas.forEach(e => map.set(e.id, { ...e, items: [...(e.items || [])] }));
  const roots: OrcamentoEtapa[] = [];
  flatEtapas.forEach(e => {
    const node = map.get(e.id)!;
    if (e.parentId && map.has(e.parentId)) {
      const parent = map.get(e.parentId)!;
      parent.items.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortByCodigo = (a: OrcamentoEtapa | OrcamentoComposicao, b: OrcamentoEtapa | OrcamentoComposicao) => {
    return (a.codigo || '').localeCompare((b.codigo || ''), undefined, { numeric: true });
  };

  const sortRecursive = (nodes: OrcamentoEtapa[]) => {
    nodes.sort(sortByCodigo as any);
    nodes.forEach(n => {
      if (n.items && n.items.length > 0) {
        n.items.sort(sortByCodigo);
        const subetapas = n.items.filter(i => i.tipo === 'etapa') as OrcamentoEtapa[];
        if (subetapas.length > 0) sortRecursive(subetapas);
      }
    });
  };

  sortRecursive(roots);
  return roots;
}

export function OrcamentoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [orcamentos, setOrcamentos] = useState<OrcamentoObra[]>([]);
  const [versoes, setVersoes] = useState<OrcamentoVersao[]>([]);
  const [etapasByVersao, setEtapasByVersao] = useState<Map<string, OrcamentoEtapa[]>>(new Map());
  const [catalogoEtapas, setCatalogo] = useState<EtapaTemplate[]>(defaultEtapas);
  const [loading, setLoading] = useState(true);

  const [sinapiConfig, setSinapiConfigState] = useState<SinapiConfig>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('lastra_sinapi_config');
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return { referencia_id: null, uf: 'SP', regime: 'SEM_DESONERACAO', competencia: '' };
  });

  const updateSinapiConfig = useCallback((cfg: Partial<SinapiConfig>) => {
    setSinapiConfigState(prev => {
      const next = { ...prev, ...cfg };
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastra_sinapi_config', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const userId = user?.id;

  const fetchAll = useCallback(async () => {
    if (!userId) {
      setOrcamentos([]);
      setLoading(false);
      return;
    }

    const [etapaRes, compRes, insumoRes, versaoRes] = await Promise.all([
      supabase.from('orcamento_categorias').select('*'),
      supabase.from('orcamento_composicoes').select('*'),
      supabase.from('orcamento_subitens').select('*'),
      supabase.from('orcamento_versoes').select('*'),
    ]);

    if (etapaRes.error) throw etapaRes.error;
    if (compRes.error) throw compRes.error;
    if (insumoRes.error) throw insumoRes.error;

    const etapasDb = (etapaRes.data || []) as DbRow[];
    const compsDb = (compRes.data || []) as DbRow[];
    const insumosDb = (insumoRes.data || []) as DbRow[];
    const versoesDb = (versaoRes?.data || []) as DbRow[];

    const insumosByComp = new Map<string, DbRow[]>();
    for (const ins of insumosDb) {
      const composicaoId = asString(ins.composicao_id);
      const arr = insumosByComp.get(composicaoId) || [];
      arr.push(ins);
      insumosByComp.set(composicaoId, arr);
    }

    const compsByEtapa = new Map<string, OrcamentoComposicao[]>();
    for (const c of compsDb) {
      const compId = asString(c.id);
      const etapaId = asString(c.etapa_id);
      const compInsumos = (insumosByComp.get(compId) || []).map(dbToInsumo);
      const comp = dbToComposicao(c, compInsumos);
      const arr = compsByEtapa.get(etapaId) || [];
      arr.push(comp);
      compsByEtapa.set(etapaId, arr);
    }

    const obraMap = new Map<string, OrcamentoEtapa[]>();
    for (const etp of etapasDb) {
      const etpId = asString(etp.id);
      const obraId = asString(etp.obra_id);
      const etpComps = compsByEtapa.get(etpId) || [];
      const etapa = dbToEtapa(etp, etpComps);
      const arr = obraMap.get(obraId) || [];
      arr.push(etapa);
      obraMap.set(obraId, arr);
    }

    const result: OrcamentoObra[] = [];
    for (const [obraId, etapas] of obraMap) {
      result.push({ obraId, etapas: buildEtapasTree(etapas) });
    }

    setOrcamentos(result);

    // Sprint 4: mapear etapas por versaoId
    const byVersao = new Map<string, OrcamentoEtapa[]>();
    for (const etp of etapasDb) {
      const versaoId = asOptionalString(etp.versao_id);
      if (versaoId) {
        const etpId = asString(etp.id);
        const etpComps = compsByEtapa.get(etpId) || [];
        const etapa = dbToEtapa(etp, etpComps);
        const arr = byVersao.get(versaoId) || [];
        arr.push(etapa);
        byVersao.set(versaoId, arr);
      }
    }
    
    const byVersaoTree = new Map<string, OrcamentoEtapa[]>();
    for (const [vId, etps] of byVersao) {
      byVersaoTree.set(vId, buildEtapasTree(etps));
    }
    
    setEtapasByVersao(byVersaoTree);
    setVersoes(versoesDb.map(dbToVersao));

    setCatalogo((prev) => {
      const next = [...prev];
      for (const etp of etapasDb) {
        const codigo = asString(etp.codigo);
        const nome = asString(etp.nome);
        if (!next.some((c) => c.codigo === codigo)) {
          next.push({ codigo, nome });
        }
      }
      return next;
    });

    setLoading(false);
  }, [userId]);

  const fetchOrcamento = useCallback(async (obraId: string) => {
    if (!userId) return;

    const [etapaRes, compRes, insumoRes, versaoRes] = await Promise.all([
      supabase.from('orcamento_categorias').select('*').eq('obra_id', obraId),
      supabase.from('orcamento_composicoes').select('*').in('etapa_id', (await supabase.from('orcamento_categorias').select('id').eq('obra_id', obraId)).data?.map(e => e.id) ?? []),
      supabase.from('orcamento_subitens').select('*').in('categoria_id', (await supabase.from('orcamento_categorias').select('id').eq('obra_id', obraId)).data?.map(e => e.id) ?? []),
      supabase.from('orcamento_versoes').select('*').eq('obra_id', obraId),
    ]);

    if (etapaRes.error || compRes.error || insumoRes.error) return;

    const etapasDb = (etapaRes.data || []) as DbRow[];
    const compsDb = (compRes.data || []) as DbRow[];
    const insumosDb = (insumoRes.data || []) as DbRow[];
    const versoesDb = (versaoRes?.data || []) as DbRow[];

    const insumosByComp = new Map<string, DbRow[]>();
    for (const ins of insumosDb) {
      const composicaoId = asString(ins.composicao_id);
      const arr = insumosByComp.get(composicaoId) || [];
      arr.push(ins);
      insumosByComp.set(composicaoId, arr);
    }

    const compsByEtapa = new Map<string, OrcamentoComposicao[]>();
    for (const c of compsDb) {
      const compId = asString(c.id);
      const etapaId = asString(c.etapa_id);
      const compInsumos = (insumosByComp.get(compId) || []).map(dbToInsumo);
      const comp = dbToComposicao(c, compInsumos);
      const arr = compsByEtapa.get(etapaId) || [];
      arr.push(comp);
      compsByEtapa.set(etapaId, arr);
    }

    const etpComps = compsByEtapa;
    const resultEtapas = etapasDb.map(etp => {
      const etpId = asString(etp.id);
      return dbToEtapa(etp, etpComps.get(etpId) || []);
    });

    setOrcamentos(prev => {
      const idx = prev.findIndex(o => o.obraId === obraId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { obraId, etapas: buildEtapasTree(resultEtapas) };
        return next;
      }
      return [...prev, { obraId, etapas: buildEtapasTree(resultEtapas) }];
    });

    const byVersao = new Map<string, OrcamentoEtapa[]>();
    for (const etp of etapasDb) {
      const versaoId = asOptionalString(etp.versao_id);
      if (versaoId) {
        const etpId = asString(etp.id);
        const etapa = dbToEtapa(etp, compsByEtapa.get(etpId) || []);
        const arr = byVersao.get(versaoId) || [];
        arr.push(etapa);
        byVersao.set(versaoId, arr);
      }
    }
    
    setEtapasByVersao(prev => {
      const next = new Map(prev);
      for (const [vId, etps] of byVersao) {
        next.set(vId, buildEtapasTree(etps));
      }
      return next;
    });

    setVersoes(prev => {
      const filtered = prev.filter(v => v.obraId !== obraId);
      return [...filtered, ...versoesDb.map(dbToVersao)];
    });

  }, [userId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const getOrcamento = useCallback((obraId: string) => {
    return orcamentos.find((o) => o.obraId === obraId);
  }, [orcamentos]);

  const saveOrcamento = useCallback(async (orcInput: OrcamentoObra) => {
    const processEtapaInput = (e: OrcamentoEtapa): OrcamentoEtapa => ({
      ...e,
      items: e.items ? e.items.map(item => {
        if (item.tipo === 'etapa') return processEtapaInput(item as OrcamentoEtapa);
        const c = item as OrcamentoComposicao;
        return {
          ...c,
          insumos: c.insumos.filter(i => !i.pending)
        };
      }) : []
    });
    
    const orc: OrcamentoObra = {
      ...orcInput,
      etapas: orcInput.etapas.map(processEtapaInput)
    };
    const obraId = orc.obraId;

    const existing = orcamentos.find((o) => o.obraId === obraId);
    const existingEtapaIds = new Set<string>();
    const existingCompIds = new Set<string>();
    const existingInsumoIds = new Set<string>();

    const extractExisting = (etapas: OrcamentoEtapa[]) => {
      for (const etapa of etapas) {
        existingEtapaIds.add(etapa.id);
        for (const item of etapa.items) {
          if (item.tipo === 'etapa') {
            extractExisting([item as OrcamentoEtapa]);
          } else {
            const comp = item as OrcamentoComposicao;
            existingCompIds.add(comp.id);
            for (const insumo of comp.insumos) {
              existingInsumoIds.add(insumo.id);
            }
          }
        }
      }
    };
    if (existing) extractExisting(existing.etapas);

    const newEtapaIds = new Set<string>();
    const newCompIds = new Set<string>();
    const newInsumoIds = new Set<string>();

    const etapasPayload: any[] = [];
    const compsPayload: any[] = [];
    const insumosPayload: any[] = [];

    const preparePayloads = (etapas: OrcamentoEtapa[], parentId: string | null) => {
      for (const etapa of etapas) {
        newEtapaIds.add(etapa.id);
        etapasPayload.push({
          id: etapa.id,
          obra_id: obraId,
          company_id: company?.id ?? null,
          codigo: etapa.codigo,
          nome: etapa.nome,
          preco_total: etapa.precoTotal,
          usa_composicoes: etapa.usaComposicoes,
          data_inicio_prevista: etapa.dataInicioPrevista || null,
          data_fim_prevista: etapa.dataFimPrevista || null,
          data_inicio_real: etapa.dataInicioReal || null,
          data_fim_real: etapa.dataFimReal || null,
          status_cronograma: etapa.statusCronograma || null,
          percentual_cronograma: etapa.percentualCronograma ?? null,
          responsavel: etapa.responsavel || null,
          observacoes_cronograma: etapa.observacoesCronograma || null,
          versao_id: etapa.versaoId || null,
          estimado_valor: etapa.estimadoValor ?? null,
          parent_id: parentId,
        });

        for (const item of etapa.items) {
          if (item.tipo === 'etapa') {
            preparePayloads([item as OrcamentoEtapa], etapa.id);
          } else {
            const comp = item as OrcamentoComposicao;
            newCompIds.add(comp.id);
            compsPayload.push({
              id: comp.id,
              etapa_id: etapa.id,
              company_id: company?.id ?? null,
              codigo: comp.codigo,
              descricao: comp.descricao,
              unidade: comp.unidade || null,
              quantidade: comp.quantidade,
              preco_unitario: comp.precoUnitario,
              preco_total: comp.precoTotal,
              usa_subitens: comp.usaInsumos,
              fonte_referencia: comp.fonteReferencia || null,
              codigo_referencia_externa: comp.codigoReferenciaExterna || null,
              referencia_competencia: comp.referenciaCompetencia || null,
              uf_referencia: comp.ufReferencia || null,
              regime_referencia: comp.regimeReferencia || null,
              data_inicio_prevista: comp.dataInicioPrevista || null,
              data_fim_prevista: comp.dataFimPrevista || null,
              data_inicio_real: comp.dataInicioReal || null,
              data_fim_real: comp.dataFimReal || null,
              peso_cronograma: comp.pesoCronograma ?? null,
              concluida: comp.concluida || false,
              tipo: comp.tipo || 'composicao',
              tipo_item: comp.tipo_item || 'material',
              regime_mo: comp.regime_mo || null,
            });

            for (const insumo of comp.insumos) {
              newInsumoIds.add(insumo.id);
              insumosPayload.push({
                id: insumo.id,
                composicao_id: comp.id,
                categoria_id: etapa.id,
                company_id: company?.id,
                nome: (insumo.descricao || insumo.codigo || 'Insumo').replace(/^\[DEMO\] /, '').substring(0, 200),
                codigo: insumo.codigo,
                descricao: insumo.descricao,
                unidade: insumo.unidade || null,
                quantidade: insumo.quantidade,
                preco_unitario: insumo.precoUnitario,
                preco_total: insumo.precoTotal,
                codigo_referencia_externa: insumo.codigoReferenciaExterna || null,
                origem_grupo_titulo: insumo.origemGrupoTitulo || null,
                origem_composicao_codigo: insumo.origemComposicaoCodigo || null,
                origem_composicao_descricao: insumo.origemComposicaoDescricao || null,
              });
            }
          }
        }
      }
    };
    
    preparePayloads(orc.etapas, null);

    if (etapasPayload.length > 0) {
      const { error } = await supabase.from('orcamento_categorias').upsert(etapasPayload);
      if (error) throw error;
    }

    if (compsPayload.length > 0) {
      const { error } = await supabase.from('orcamento_composicoes').upsert(compsPayload);
      if (error) throw error;
    }

    if (insumosPayload.length > 0) {
      // Chunk inserts just in case
      const chunkSize = 1000;
      for (let i = 0; i < insumosPayload.length; i += chunkSize) {
        const chunk = insumosPayload.slice(i, i + chunkSize);
        const { error } = await supabase.from('orcamento_subitens').upsert(chunk);
        if (error) throw error;
      }
    }

    const insumosToDelete = [...existingInsumoIds].filter((id) => !newInsumoIds.has(id));
    const compsToDelete = [...existingCompIds].filter((id) => !newCompIds.has(id));
    const etapasToDelete = [...existingEtapaIds].filter((id) => !newEtapaIds.has(id));

    if (insumosToDelete.length > 0) {
      const { error } = await supabase.from('orcamento_subitens').delete().in('id', insumosToDelete);
      if (error) throw error;
    }
    if (compsToDelete.length > 0) {
      const { error } = await supabase.from('orcamento_composicoes').delete().in('id', compsToDelete);
      if (error) throw error;
    }
    if (etapasToDelete.length > 0) {
      const { error } = await supabase.from('orcamento_categorias').delete().in('id', etapasToDelete);
      if (error) throw error;
    }

    setCatalogo((prev) => {
      const next = [...prev];
      for (const etapa of orc.etapas) {
        if (!next.some((c) => c.codigo === etapa.codigo)) {
          next.push({ codigo: etapa.codigo, nome: etapa.nome });
        }
      }
      return next;
    });

    // Em vez de optimistic update manual, recarregar apenas esta obra do banco
    await fetchOrcamento(obraId);
  }, [orcamentos, fetchOrcamento]);

  /**
   * finalizarOrcamento — Fase 2.3 (Alternativa A)
   * Salva o orçamento e, em seguida, varre todos os itens sem preço,
   * inserindo-os na fila `insumos_pendentes_cotacao`.
   * Retorna o total de itens sem preço e quantos foram inseridos como novos.
   */
  const finalizarOrcamento = useCallback(async (orc: OrcamentoObra): Promise<{ total: number; novos: number }> => {
    const obraId = orc.obraId;

    // 1. Salva o orçamento no banco
    await saveOrcamento(orc);

    // 2. Coleta itens sem preço
    const itensSemPreco: { subitem_id: string | null; nome_insumo: string; unidade: string | null }[] = [];
    const subIdsComPreco: string[] = [];

    const processItensSemPreco = (etapas: OrcamentoEtapa[]) => {
      for (const etapa of etapas) {
        for (const item of etapa.items) {
          if (item.tipo === 'etapa') {
            processItensSemPreco([item as OrcamentoEtapa]);
          } else {
            const comp = item as OrcamentoComposicao;
            if (!comp.usaInsumos) {
              if ((!comp.precoUnitario || comp.precoUnitario === 0) && comp.descricao?.trim()) {
                itensSemPreco.push({ subitem_id: null, nome_insumo: comp.descricao, unidade: comp.unidade || null });
              }
            } else {
              for (const insumo of comp.insumos) {
                if (!insumo.descricao?.trim()) continue;
                if (!insumo.precoUnitario || insumo.precoUnitario === 0) {
                  itensSemPreco.push({ subitem_id: insumo.id, nome_insumo: insumo.descricao, unidade: insumo.unidade || null });
                } else {
                  subIdsComPreco.push(insumo.id);
                }
              }
            }
          }
        }
      }
    };
    processItensSemPreco(orc.etapas);

    // 3. Remove da fila insumos que ganharam preço
    if (subIdsComPreco.length > 0) {
      await supabase.from('insumos_pendentes_cotacao').delete().in('subitem_id', subIdsComPreco).eq('obra_id', obraId);
    }

    // 4. Insere novos sem preço (evitando duplicatas por subitem_id)
    let novosInseridos = 0;
    const rowsComId = itensSemPreco.filter(r => r.subitem_id !== null);
    const rowsSemId = itensSemPreco.filter(r => r.subitem_id === null);

    if (rowsComId.length > 0) {
      const { data: existentes } = await supabase
        .from('insumos_pendentes_cotacao')
        .select('subitem_id')
        .in('subitem_id', rowsComId.map(r => r.subitem_id!))
        .eq('obra_id', obraId);
      const existentesIds = new Set((existentes || []).map((e: Record<string, unknown>) => e.subitem_id as string));
      const paraInserir = rowsComId.filter(r => !existentesIds.has(r.subitem_id!));
      if (paraInserir.length > 0) {
        await supabase.from('insumos_pendentes_cotacao').insert(
          paraInserir.map(r => ({ obra_id: obraId, subitem_id: r.subitem_id, nome_insumo: r.nome_insumo, unidade: r.unidade, status: 'pendente' }))
        );
        novosInseridos += paraInserir.length;
      }
    }

    for (const row of rowsSemId) {
      const { data: ex } = await supabase
        .from('insumos_pendentes_cotacao')
        .select('id')
        .eq('obra_id', obraId)
        .eq('nome_insumo', row.nome_insumo)
        .is('subitem_id', null)
        .limit(1);
      if (!ex || ex.length === 0) {
        await supabase.from('insumos_pendentes_cotacao').insert({ obra_id: obraId, subitem_id: null, nome_insumo: row.nome_insumo, unidade: row.unidade, status: 'pendente' });
        novosInseridos++;
      }
    }

    return { total: itensSemPreco.length, novos: novosInseridos };
  }, [saveOrcamento]);

  // ── Sprint 4: Funções de versão ───────────────────────────────────────────

  const getVersoes = useCallback((obraId: string) => {
    return versoes
      .filter(v => v.obraId === obraId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [versoes]);

  const getVersaoAtiva = useCallback((obraId: string) => {
    return versoes.find(v => v.obraId === obraId && v.status === 'ativo');
  }, [versoes]);

  const getEtapasDaVersao = useCallback((versaoId: string) => {
    return etapasByVersao.get(versaoId);
  }, [etapasByVersao]);

  /** Cria nova versão (em branco ou cópia de outra). Retorna a versão criada. */
  const criarVersao = useCallback(async (
    obraId: string,
    opts: { tipo: VersaoTipo; descricao?: string; copiarDeVersaoId?: string }
  ): Promise<OrcamentoVersao> => {
    // Determinar próximo número de versão
    const existentes = versoes.filter(v => v.obraId === obraId);
    const major = existentes.length + 1;
    const numeroVersao = `v${major}.0`;

    const { data: novaVersaoData, error: vErr } = await supabase
      .from('orcamento_versoes')
      .insert({
        obra_id: obraId,
        company_id: company?.id ?? null,
        numero_versao: numeroVersao,
        tipo: opts.tipo,
        status: 'rascunho',
        valor_total: 0,
        descricao: opts.descricao || null,
      })
      .select()
      .single();
    if (vErr) throw vErr;
    const novaVersao = dbToVersao(novaVersaoData as DbRow);

    // Copiar etapas + composições + insumos da versão de origem (se solicitado)
    if (opts.copiarDeVersaoId) {
      const etapasOrigem = etapasByVersao.get(opts.copiarDeVersaoId) || [];
      const copyEtapaRecursively = async (etapa: OrcamentoEtapa, parentId: string | null) => {
        const novoEtapaId = crypto.randomUUID();
        await supabase.from('orcamento_categorias').insert({
          id: novoEtapaId,
          obra_id: obraId,
          company_id: company?.id ?? null,
          versao_id: novaVersao.id,
          codigo: etapa.codigo,
          nome: etapa.nome,
          preco_total: etapa.precoTotal,
          usa_composicoes: etapa.usaComposicoes,
          estimado_valor: null,
          parent_id: parentId,
        });

        for (const item of etapa.items || []) {
          if (item.tipo === 'etapa') {
            await copyEtapaRecursively(item as OrcamentoEtapa, novoEtapaId);
          } else {
            const comp = item as OrcamentoComposicao;
            const novoCompId = crypto.randomUUID();
            await supabase.from('orcamento_composicoes').insert({
              id: novoCompId,
              etapa_id: novoEtapaId,
              company_id: company?.id ?? null,
              codigo: comp.codigo,
              descricao: comp.descricao,
              unidade: comp.unidade || null,
              quantidade: comp.quantidade,
              preco_unitario: comp.precoUnitario,
              preco_total: comp.precoTotal,
              usa_subitens: comp.usaInsumos,
              tipo: comp.tipo || 'composicao',
              fonte_referencia: comp.fonteReferencia || null,
              tipo_item: comp.tipo_item || 'material',
              regime_mo: comp.regime_mo || null,
            });
            for (const ins of comp.insumos) {
              await supabase.from('orcamento_subitens').insert({
                id: crypto.randomUUID(),
                composicao_id: novoCompId,
                categoria_id: novoEtapaId,
                company_id: company?.id ?? null,
                nome: ins.descricao || ins.codigo,
                codigo: ins.codigo,
                descricao: ins.descricao,
                unidade: ins.unidade || null,
                quantidade: ins.quantidade,
                preco_unitario: ins.precoUnitario,
                preco_total: ins.precoTotal,
              });
            }
          }
        }
      };

      for (const etapa of etapasOrigem) {
        await copyEtapaRecursively(etapa, null);
      }
    }

    await fetchAll();
    return novaVersao;
  }, [versoes, etapasByVersao, company, fetchAll]);

  /** Salva etapas de uma versão específica (similar a saveOrcamento mas por versaoId) */
  const salvarVersao = useCallback(async (versaoId: string, etapasInput: OrcamentoEtapa[]) => {
    const processEtapas = (etapasList: OrcamentoEtapa[]): OrcamentoEtapa[] => {
      return etapasList.map(e => ({
        ...e,
        items: e.items.map(item => {
          if (item.tipo === 'etapa') {
            return processEtapas([item as OrcamentoEtapa])[0];
          } else {
            const c = item as OrcamentoComposicao;
            return {
              ...c,
              insumos: c.insumos ? c.insumos.filter(i => !i.pending) : []
            };
          }
        })
      }));
    };

    const etapas = processEtapas(etapasInput);

    const versao = versoes.find(v => v.id === versaoId);
    if (!versao) throw new Error('Versão não encontrada');

    const existingEtapas = etapasByVersao.get(versaoId) || [];

    const getFlatIds = (list: OrcamentoEtapa[]) => {
      const eIds = new Set<string>();
      const cIds = new Set<string>();
      const iIds = new Set<string>();

      const traverse = (nodes: OrcamentoEtapa[]) => {
        for (const n of nodes) {
          eIds.add(n.id);
          for (const item of n.items || []) {
            if (item.tipo === 'etapa') {
              traverse([item as OrcamentoEtapa]);
            } else {
              const comp = item as OrcamentoComposicao;
              cIds.add(comp.id);
              if (comp.insumos) {
                for (const ins of comp.insumos) {
                  iIds.add(ins.id);
                }
              }
            }
          }
        }
      };
      traverse(list);
      return { eIds, cIds, iIds };
    };

    const { eIds: existingIds, cIds: existingCmpIds, iIds: existingInsIds } = getFlatIds(existingEtapas);
    const { eIds: newIds, cIds: newCmpIds, iIds: newInsIds } = getFlatIds(etapas);

    const etapasPayload: any[] = [];
    const compsPayload: any[] = [];
    const insumosPayload: any[] = [];

    let totalValor = 0;

    const preparePayloads = (etapasList: OrcamentoEtapa[], parentId: string | null) => {
      for (const etapa of etapasList) {
        if (!parentId) totalValor += etapa.precoTotal; // Sum only roots
        etapasPayload.push({
          id: etapa.id,
          obra_id: versao.obraId,
          company_id: company?.id ?? null,
          versao_id: versaoId,
          codigo: etapa.codigo,
          nome: etapa.nome,
          preco_total: etapa.precoTotal,
          usa_composicoes: etapa.usaComposicoes,
          estimado_valor: etapa.estimadoValor ?? null,
          data_inicio_prevista: etapa.dataInicioPrevista || null,
          data_fim_prevista: etapa.dataFimPrevista || null,
          status_cronograma: etapa.statusCronograma || null,
          percentual_cronograma: etapa.percentualCronograma ?? null,
          responsavel: etapa.responsavel || null,
          parent_id: parentId,
        });

        for (const item of etapa.items || []) {
          if (item.tipo === 'etapa') {
            preparePayloads([item as OrcamentoEtapa], etapa.id);
          } else {
            const comp = item as OrcamentoComposicao;
            compsPayload.push({
              id: comp.id,
              etapa_id: etapa.id,
              company_id: company?.id ?? null,
              codigo: comp.codigo,
              descricao: comp.descricao,
              unidade: comp.unidade || null,
              quantidade: comp.quantidade,
              preco_unitario: comp.precoUnitario,
              preco_total: comp.precoTotal,
              usa_subitens: comp.usaInsumos,
              tipo: comp.tipo || 'composicao',
              fonte_referencia: comp.fonteReferencia || null,
              codigo_referencia_externa: comp.codigoReferenciaExterna || null,
              tipo_item: comp.tipo_item || 'material',
              regime_mo: comp.regime_mo || null,
            });

            if (comp.insumos) {
              for (const ins of comp.insumos) {
                insumosPayload.push({
                  id: ins.id,
                  composicao_id: comp.id,
                  categoria_id: etapa.id,
                  company_id: company?.id ?? null,
                  nome: ins.descricao || ins.codigo,
                  codigo: ins.codigo,
                  descricao: ins.descricao,
                  unidade: ins.unidade || null,
                  quantidade: ins.quantidade,
                  preco_unitario: ins.precoUnitario,
                  preco_total: ins.precoTotal,
                  tipo_item: ins.tipo_item || 'material',
                  regime_mo: ins.regime_mo || null,
                });
              }
            }
          }
        }
      }
    };

    preparePayloads(etapas, null);

    if (etapasPayload.length > 0) {
      const { error } = await supabase.from('orcamento_categorias').upsert(etapasPayload);
      if (error) throw error;
    }

    if (compsPayload.length > 0) {
      const { error } = await supabase.from('orcamento_composicoes').upsert(compsPayload);
      if (error) throw error;
    }

    if (insumosPayload.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < insumosPayload.length; i += chunkSize) {
        const chunk = insumosPayload.slice(i, i + chunkSize);
        const { error } = await supabase.from('orcamento_subitens').upsert(chunk);
        if (error) throw error;
      }
    }

    // Identificar deletados (precisa pegar todos os insumos existentes vs novos)
    const delIns = [...existingInsIds].filter(id => !newInsIds.has(id));
    
    if (delIns.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < delIns.length; i += chunkSize) {
        const chunk = delIns.slice(i, i + chunkSize);
        await supabase.from('orcamento_subitens').delete().in('id', chunk);
      }
    }

    const delComps = [...existingCmpIds].filter(id => !newCmpIds.has(id));
    if (delComps.length > 0) {
      await supabase.from('orcamento_composicoes').delete().in('id', delComps);
    }

    // Remover etapas deleted
    const delEtapas = [...existingIds].filter(id => !newIds.has(id));
    if (delEtapas.length > 0) {
      await supabase.from('orcamento_categorias').delete().in('id', delEtapas);
    }

    // Atualizar valor_total na versão
    await supabase.from('orcamento_versoes').update({ valor_total: totalValor }).eq('id', versaoId);

    // Optimistic update
    setEtapasByVersao(prev => { const next = new Map(prev); next.set(versaoId, etapas); return next; });
    setVersoes(prev => prev.map(v => v.id === versaoId ? { ...v, valorTotal: totalValor } : v));
  }, [versoes, etapasByVersao, company?.id]);

  /** Cria versão Analítica baseada em uma versão Estimativa, copiando estrutura + registrando estimado_valor */
  const evoluirParaAnalitico = useCallback(async (versaoEstimativoId: string): Promise<OrcamentoVersao> => {
    const versaoOrigem = versoes.find(v => v.id === versaoEstimativoId);
    if (!versaoOrigem) throw new Error('Versão estimativa não encontrada');

    const etapasOrigem = etapasByVersao.get(versaoEstimativoId) || [];
    const existentes = versoes.filter(v => v.obraId === versaoOrigem.obraId);
    const major = existentes.length + 1;
    const numeroVersao = `v${major}.0`;

    // Criar versão analítica
    const { data: novaVData, error: vErr } = await supabase
      .from('orcamento_versoes')
      .insert({
        obra_id: versaoOrigem.obraId,
        company_id: company?.id ?? null,
        numero_versao: numeroVersao,
        tipo: 'analitico',
        status: 'ativo',
        valor_total: 0,
        versao_pai_id: versaoEstimativoId,
        descricao: `Evoluído de ${versaoOrigem.numeroVersao} — ${versaoOrigem.descricao || 'Estimativo'}`,
      })
      .select()
      .single();
    if (vErr) throw vErr;
    const novaVersao = dbToVersao(novaVData as DbRow);

    // Copiar etapas com estimado_valor = preco_total do estimativo, copiando a estrutura em N-Níveis
    const copyEtapaRecursively = async (etapa: OrcamentoEtapa, parentId: string | null) => {
      const novoEtapaId = crypto.randomUUID();
      await supabase.from('orcamento_categorias').insert({
        id: novoEtapaId,
        obra_id: versaoOrigem.obraId,
        company_id: company?.id ?? null,
        versao_id: novaVersao.id,
        codigo: etapa.codigo,
        nome: etapa.nome,
        preco_total: 0, // será preenchido conforme composições
        usa_composicoes: true,
        estimado_valor: etapa.precoTotal, // <<< valor do estimativo como referência
        parent_id: parentId,
      });

      for (const item of etapa.items || []) {
        if (item.tipo === 'etapa') {
          await copyEtapaRecursively(item as OrcamentoEtapa, novoEtapaId);
        } else {
          const comp = item as OrcamentoComposicao;
          const novoCompId = crypto.randomUUID();
          await supabase.from('orcamento_composicoes').insert({
            id: novoCompId,
            etapa_id: novoEtapaId,
            company_id: company?.id ?? null,
            codigo: comp.codigo,
            descricao: comp.descricao,
            unidade: comp.unidade || null,
            quantidade: comp.quantidade,
            preco_unitario: comp.precoUnitario,
            preco_total: comp.precoTotal,
            usa_subitens: comp.usaInsumos,
            tipo: comp.tipo || 'composicao',
            fonte_referencia: comp.fonteReferencia || null,
          });
          for (const ins of comp.insumos) {
            await supabase.from('orcamento_subitens').insert({
              id: crypto.randomUUID(),
              composicao_id: novoCompId,
              categoria_id: novoEtapaId,
              company_id: company?.id ?? null,
              nome: ins.descricao || ins.codigo,
              codigo: ins.codigo,
              descricao: ins.descricao,
              unidade: ins.unidade || null,
              quantidade: ins.quantidade,
              preco_unitario: ins.precoUnitario,
              preco_total: ins.precoTotal,
            });
          }
        }
      }
    };

    for (const etapa of etapasOrigem) {
      await copyEtapaRecursively(etapa, null);
    }

    // Arquivar versão estimativa
    await supabase.from('orcamento_versoes').update({ status: 'arquivado' }).eq('id', versaoEstimativoId);
    await fetchAll();
    return novaVersao;
  }, [versoes, etapasByVersao, company, fetchAll]);

  const ativarVersao = useCallback(async (versaoId: string, obraId: string) => {
    // Arquivar todas as ativas da mesma obra
    await supabase.from('orcamento_versoes').update({ status: 'arquivado' })
      .eq('obra_id', obraId).eq('status', 'ativo');
    await supabase.from('orcamento_versoes').update({ status: 'ativo' }).eq('id', versaoId);
    setVersoes(prev => prev.map(v => v.obraId === obraId
      ? { ...v, status: v.id === versaoId ? 'ativo' : (v.status === 'ativo' ? 'arquivado' : v.status) }
      : v));
  }, []);

  const arquivarVersao = useCallback(async (versaoId: string) => {
    await supabase.from('orcamento_versoes').update({ status: 'arquivado' }).eq('id', versaoId);
    setVersoes(prev => prev.map(v => v.id === versaoId ? { ...v, status: 'arquivado' } : v));
  }, []);

  const removerVersao = useCallback(async (versaoId: string) => {
    const { error } = await supabase.from('orcamento_versoes').delete().eq('id', versaoId);
    if (error) throw error;
    setVersoes(prev => prev.filter(v => v.id !== versaoId));
    setEtapasByVersao(prev => {
      const next = new Map(prev);
      next.delete(versaoId);
      return next;
    });
  }, []);

  // ──────────────────────────────────────────────────────────────────
  const addEtapaToCatalogo = useCallback((cat: EtapaTemplate) => {
    setCatalogo((prev) => {
      if (prev.some((c) => c.codigo === cat.codigo)) return prev;
      return [...prev, cat];
    });
  }, []);

  const generateEtapaCodigo = useCallback((etapasAtuais: OrcamentoEtapa[]) => {
    const nums = etapasAtuais
      .map(e => parseInt(e.codigo, 10))
      .filter(n => !isNaN(n) && n > 0);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return String(next).padStart(2, '0');
  }, []);

  const generateComposicaoCodigo = useCallback((etapaCode: string, existingCodes: string[]) => {
    const prefix = etapaCode.replace('ETP-', 'COMP-');
    let max = 0;

    for (const code of existingCodes) {
      const m = code.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    return `${prefix}-${String(max + 1).padStart(2, '0')}`;
  }, []);

  const generateInsumoCodigo = useCallback((composicaoCodigo: string, existingCodes: string[]) => {
    const prefix = composicaoCodigo.replace('COMP-', 'INS-');
    let max = 0;

    for (const code of existingCodes) {
      const m = code.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    return `${prefix}-${String(max + 1).padStart(2, '0')}`;
  }, []);

  const recalcularWBS = useCallback((items: Array<OrcamentoEtapa | OrcamentoComposicao>, parentPrefix = ''): Array<OrcamentoEtapa | OrcamentoComposicao> => {
    let etapaCount = 0;
    let compCount = 0;

    return items.map(item => {
      if (item.tipo === 'etapa') {
        etapaCount++;
        // Option B: "1.1", "1.2". If no parent, just "1", "2"
        const currentPrefix = parentPrefix ? `${parentPrefix}.${etapaCount}` : `${etapaCount}`;
        // If it's a root level item, some people prefer "1.0", but "1" or "1.0" is fine. We will use "1.0" for visual consistency if parentPrefix is empty.
        const codeToDisplay = parentPrefix ? currentPrefix : `${currentPrefix}.0`;
        
        return {
          ...item,
          codigo: codeToDisplay,
          items: recalcularWBS((item as OrcamentoEtapa).items || [], currentPrefix)
        } as OrcamentoEtapa;
      } else {
        compCount++;
        // Option B: Composições get "1.1.C1", "1.1.C2" etc.
        // If it's floating at root level, we use "1.0.C1" where 1.0 is a placeholder, or just "C1". Let's use "0.C1".
        const currentPrefix = parentPrefix ? parentPrefix : '0';
        return {
          ...item,
          codigo: `${currentPrefix}.C${compCount}`
        } as OrcamentoComposicao;
      }
    });
  }, []);

  const extractComposicoes = useCallback((etapa: OrcamentoEtapa): OrcamentoComposicao[] => {
    let comps: OrcamentoComposicao[] = [];
    if (!etapa.items) return comps;
    for (const item of etapa.items) {
      if (item.tipo === 'etapa') {
        comps = comps.concat(extractComposicoes(item as OrcamentoEtapa));
      } else {
        comps.push(item as OrcamentoComposicao);
      }
    }
    return comps;
  }, []);

  const getUnidadesUsadas = useCallback(() => {
    const set = new Set<string>();
    ['vb', 'm²', 'm³', 'm', 'un', 'kg', 'saco', 'barra', 'rolo', 'l', 't', 'mês', 'dia', 'h'].forEach((u) => set.add(u));

    for (const orc of orcamentos) {
      for (const etapa of orc.etapas) {
        for (const comp of extractComposicoes(etapa)) {
          if (comp.unidade) set.add(comp.unidade);
          for (const insumo of comp.insumos) {
            if (insumo.unidade) set.add(insumo.unidade);
          }
        }
      }
    }

    return Array.from(set).sort();
  }, [orcamentos]);

  const getSugestaoInsumos = useCallback((etapaNome: string): InsumoTemplate[] => {
    const fromCatalog = catalogoInsumos.filter((i) => i.etapaRef === etapaNome);
    const fromExisting: InsumoTemplate[] = [];

    for (const orc of orcamentos) {
      for (const etapa of orc.etapas) {
        if (etapa.nome === etapaNome) {
          for (const comp of extractComposicoes(etapa)) {
            if (
              comp.descricao &&
              !fromCatalog.some((c) => c.descricao === comp.descricao) &&
              !fromExisting.some((e) => e.descricao === comp.descricao)
            ) {
              fromExisting.push({
                descricao: comp.descricao,
                unidade: comp.unidade,
                etapaRef: etapaNome,
              });
            }
          }
        }
      }
    }

    return [...fromCatalog, ...fromExisting];
  }, [orcamentos]);

  const getComposicoesUsadasPorEtapa = useCallback((etapaNome: string) => {
    const result: { descricao: string; unidade: string }[] = [];

    for (const orc of orcamentos) {
      for (const etapa of orc.etapas) {
        if (etapa.nome === etapaNome) {
          for (const comp of extractComposicoes(etapa)) {
            if (comp.descricao && !result.some((r) => r.descricao === comp.descricao)) {
              result.push({ descricao: comp.descricao, unidade: comp.unidade });
            }
          }
        }
      }
    }

    return result;
  }, [orcamentos]);

  // Fix BUG-4: retorna TODAS as composições de TODAS as obras/etapas da company
  // sem filtro restritivo por nome de etapa
  const getTodasComposicoes = useCallback((): { descricao: string; unidade: string; etapaNome: string }[] => {
    const result: { descricao: string; unidade: string; etapaNome: string }[] = [];
    for (const orc of orcamentos) {
      for (const etapa of orc.etapas) {
        for (const comp of extractComposicoes(etapa)) {
          if (comp.descricao && !result.some((r) => r.descricao === comp.descricao)) {
            result.push({ descricao: comp.descricao, unidade: comp.unidade, etapaNome: etapa.nome });
          }
        }
      }
    }
    return result;
  }, [orcamentos]);

  return (
    <OrcamentoContext.Provider
      value={{
        orcamentos,
        loading,
        getOrcamento,
        saveOrcamento,
        finalizarOrcamento,
        catalogoEtapas,
        addEtapaToCatalogo,
        generateEtapaCodigo,
        getUnidadesUsadas,
        getSugestaoInsumos,
        getComposicoesUsadasPorEtapa,
        getTodasComposicoes,
        generateComposicaoCodigo,
        generateInsumoCodigo,
        recalcularWBS,
        refreshOrcamentos: fetchAll,
        // Sprint 4
        versoes,
        getVersoes,
        getVersaoAtiva,
        criarVersao,
        salvarVersao,
        getEtapasDaVersao,
        evoluirParaAnalitico,
        ativarVersao,
        arquivarVersao,
        removerVersao,
        sinapiConfig,
        updateSinapiConfig,
      }}
    >
      {children}
    </OrcamentoContext.Provider>
  );
}

export function useOrcamento() {
  const ctx = useContext(OrcamentoContext);
  if (!ctx) throw new Error('useOrcamento must be used within OrcamentoProvider');
  return ctx;
}