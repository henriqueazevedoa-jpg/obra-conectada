import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import { catalogoInsumos, categoriasExtras, InsumoTemplate } from '@/data/catalogoInsumos';

// --- Types ---
export interface OrcamentoSubitem {
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
}

export interface OrcamentoComposicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoUnitario: number | null;
  precoTotal: number;
  subitens: OrcamentoSubitem[];
  usaSubitens: boolean;

  fonteReferencia?: string;
  codigoReferenciaExterna?: string;
  referenciaCompetencia?: string;
  ufReferencia?: string;
  regimeReferencia?: string;

  dataInicioPrevista?: string;
  dataFimPrevista?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  pesoCronograma?: number;
  concluida?: boolean;
}

export interface OrcamentoCategoria {
  id: string;
  codigo: string;
  nome: string;
  precoTotal: number;
  usaComposicoes: boolean;
  composicoes: OrcamentoComposicao[];
  dataInicioPrevista?: string;
  dataFimPrevista?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  statusCronograma?: 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada';
  percentualCronograma?: number;
  responsavel?: string;
  observacoesCronograma?: string;
}

export interface OrcamentoObra {
  obraId: string;
  categorias: OrcamentoCategoria[];
}

export interface CategoriaTemplate {
  codigo: string;
  nome: string;
}

type DbRow = Record<string, unknown>;

const defaultCategorias: CategoriaTemplate[] = [
  { codigo: 'CAT-001', nome: 'Serviços Preliminares' },
  { codigo: 'CAT-002', nome: 'Fundação' },
  { codigo: 'CAT-003', nome: 'Estrutura' },
  { codigo: 'CAT-004', nome: 'Alvenaria' },
  { codigo: 'CAT-005', nome: 'Cobertura' },
  { codigo: 'CAT-006', nome: 'Instalações Elétricas' },
  { codigo: 'CAT-007', nome: 'Instalações Hidráulicas' },
  { codigo: 'CAT-008', nome: 'Revestimentos' },
  { codigo: 'CAT-009', nome: 'Pisos' },
  { codigo: 'CAT-010', nome: 'Pintura' },
  { codigo: 'CAT-011', nome: 'Esquadrias' },
  { codigo: 'CAT-012', nome: 'Louças e Metais' },
  { codigo: 'CAT-013', nome: 'Limpeza Final' },
  ...categoriasExtras,
];

interface OrcamentoContextType {
  orcamentos: OrcamentoObra[];
  loading: boolean;
  getOrcamento: (obraId: string) => OrcamentoObra | undefined;
  saveOrcamento: (orc: OrcamentoObra) => Promise<void>;
  catalogoCategorias: CategoriaTemplate[];
  addCategoriaToCatalogo: (cat: CategoriaTemplate) => void;
  generateCategoriaCodigo: () => string;
  getUnidadesUsadas: () => string[];
  getSugestaoInsumos: (categoriaNome: string) => InsumoTemplate[];
  getComposicoesUsadasPorCategoria: (categoriaNome: string) => { descricao: string; unidade: string }[];
  generateComposicaoCodigo: (categoriaCode: string, existingCodes: string[]) => string;
  generateSubitemCodigo: (composicaoCodigo: string, existingCodes: string[]) => string;
  refreshOrcamentos: () => Promise<void>;
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
): OrcamentoCategoria['statusCronograma'] {
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
function dbToSubitem(row: DbRow): OrcamentoSubitem {
  return {
    id: asString(row.id),
    codigo: asString(row.codigo),
    descricao: asString(row.descricao),
    unidade: asString(row.unidade),
    quantidade: asNullableNumber(row.quantidade),
    precoUnitario: asNullableNumber(row.preco_unitario),
    precoTotal: asNumber(row.preco_total) ?? 0,

    codigoReferenciaExterna: asOptionalString(row.codigo_referencia_externa),
    origemGrupoTitulo: asOptionalString(row.origem_grupo_titulo),
    origemComposicaoCodigo: asOptionalString(row.origem_composicao_codigo),
    origemComposicaoDescricao: asOptionalString(row.origem_composicao_descricao),
  };
}

function dbToComposicao(row: DbRow, subitens: OrcamentoSubitem[]): OrcamentoComposicao {
  return {
    id: asString(row.id),
    codigo: asString(row.codigo),
    descricao: asString(row.descricao),
    unidade: asString(row.unidade),
    quantidade: asNullableNumber(row.quantidade),
    precoUnitario: asNullableNumber(row.preco_unitario),
    precoTotal: asNumber(row.preco_total) ?? 0,
    subitens,
    usaSubitens: asBoolean(row.usa_subitens),

    fonteReferencia: asOptionalString(row.fonte_referencia),
    codigoReferenciaExterna: asOptionalString(row.codigo_referencia_externa),
    referenciaCompetencia: asOptionalString(row.referencia_competencia),
    ufReferencia: asOptionalString(row.uf_referencia),
    regimeReferencia: asOptionalString(row.regime_referencia),

    dataInicioPrevista: asOptionalString(row.data_inicio_prevista),
    dataFimPrevista: asOptionalString(row.data_fim_prevista),
    dataInicioReal: asOptionalString(row.data_inicio_real),
    dataFimReal: asOptionalString(row.data_fim_real),
    pesoCronograma: asNumber(row.peso_cronograma),
    concluida: asBoolean(row.concluida),
  };
}

function dbToCategoria(row: DbRow, composicoes: OrcamentoComposicao[]): OrcamentoCategoria {
  return {
    id: asString(row.id),
    codigo: asString(row.codigo),
    nome: asString(row.nome),
    precoTotal: asNumber(row.preco_total) ?? 0,
    usaComposicoes: asBoolean(row.usa_composicoes),
    composicoes,
    dataInicioPrevista: asOptionalString(row.data_inicio_prevista),
    dataFimPrevista: asOptionalString(row.data_fim_prevista),
    dataInicioReal: asOptionalString(row.data_inicio_real),
    dataFimReal: asOptionalString(row.data_fim_real),
    statusCronograma: asStatusCronograma(row.status_cronograma),
    percentualCronograma: asNumber(row.percentual_cronograma),
    responsavel: asOptionalString(row.responsavel),
    observacoesCronograma: asOptionalString(row.observacoes_cronograma),
  };
}

export function OrcamentoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [orcamentos, setOrcamentos] = useState<OrcamentoObra[]>([]);
  const [catalogoCategorias, setCatalogo] = useState<CategoriaTemplate[]>(defaultCategorias);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setOrcamentos([]);
      setLoading(false);
      return;
    }

    const [catRes, compRes, subRes] = await Promise.all([
      supabase.from('orcamento_categorias').select('*'),
      supabase.from('orcamento_composicoes').select('*'),
      supabase.from('orcamento_subitens').select('*'),
    ]);

    if (catRes.error) throw catRes.error;
    if (compRes.error) throw compRes.error;
    if (subRes.error) throw subRes.error;

    const cats = (catRes.data || []) as DbRow[];
    const comps = (compRes.data || []) as DbRow[];
    const subs = (subRes.data || []) as DbRow[];

    const subsByComp = new Map<string, DbRow[]>();
    for (const s of subs) {
      const composicaoId = asString(s.composicao_id);
      const arr = subsByComp.get(composicaoId) || [];
      arr.push(s);
      subsByComp.set(composicaoId, arr);
    }

    const compsByCat = new Map<string, OrcamentoComposicao[]>();
    for (const c of comps) {
      const compId = asString(c.id);
      const categoriaId = asString(c.categoria_id);
      const compSubs = (subsByComp.get(compId) || []).map(dbToSubitem);
      const comp = dbToComposicao(c, compSubs);
      const arr = compsByCat.get(categoriaId) || [];
      arr.push(comp);
      compsByCat.set(categoriaId, arr);
    }

    const obraMap = new Map<string, OrcamentoCategoria[]>();
    for (const cat of cats) {
      const catId = asString(cat.id);
      const obraId = asString(cat.obra_id);
      const catComps = compsByCat.get(catId) || [];
      const categoria = dbToCategoria(cat, catComps);
      const arr = obraMap.get(obraId) || [];
      arr.push(categoria);
      obraMap.set(obraId, arr);
    }

    const result: OrcamentoObra[] = [];
    for (const [obraId, categorias] of obraMap) {
      result.push({ obraId, categorias });
    }

    setOrcamentos(result);

    setCatalogo((prev) => {
      const next = [...prev];
      for (const cat of cats) {
        const codigo = asString(cat.codigo);
        const nome = asString(cat.nome);
        if (!next.some((c) => c.codigo === codigo)) {
          next.push({ codigo, nome });
        }
      }
      return next;
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const getOrcamento = useCallback((obraId: string) => {
    return orcamentos.find((o) => o.obraId === obraId);
  }, [orcamentos]);

  const saveOrcamento = useCallback(async (orc: OrcamentoObra) => {
    const obraId = orc.obraId;

    const existing = orcamentos.find((o) => o.obraId === obraId);
    const existingCatIds = new Set<string>();
    const existingCompIds = new Set<string>();
    const existingSubIds = new Set<string>();

    if (existing) {
      for (const cat of existing.categorias) {
        existingCatIds.add(cat.id);
        for (const comp of cat.composicoes) {
          existingCompIds.add(comp.id);
          for (const sub of comp.subitens) {
            existingSubIds.add(sub.id);
          }
        }
      }
    }

    const newCatIds = new Set<string>();
    const newCompIds = new Set<string>();
    const newSubIds = new Set<string>();

    for (const cat of orc.categorias) {
      newCatIds.add(cat.id);

      const { error: catError } = await supabase.from('orcamento_categorias').upsert({
        id: cat.id,
        obra_id: obraId,
        company_id: company?.id ?? null,
        codigo: cat.codigo,
        nome: cat.nome,
        preco_total: cat.precoTotal,
        usa_composicoes: cat.usaComposicoes,
        data_inicio_prevista: cat.dataInicioPrevista || null,
        data_fim_prevista: cat.dataFimPrevista || null,
        data_inicio_real: cat.dataInicioReal || null,
        data_fim_real: cat.dataFimReal || null,
        status_cronograma: cat.statusCronograma || null,
        percentual_cronograma: cat.percentualCronograma ?? null,
        responsavel: cat.responsavel || null,
        observacoes_cronograma: cat.observacoesCronograma || null,
      });

      if (catError) throw catError;

      for (const comp of cat.composicoes) {
        newCompIds.add(comp.id);

        const { error: compError } = await supabase.from('orcamento_composicoes').upsert({
          id: comp.id,
          categoria_id: cat.id,
          company_id: company?.id ?? null,
          codigo: comp.codigo,
          descricao: comp.descricao,
          unidade: comp.unidade || null,
          quantidade: comp.quantidade,
          preco_unitario: comp.precoUnitario,
          preco_total: comp.precoTotal,
          usa_subitens: comp.usaSubitens,

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
        });

        if (compError) throw compError;

        for (const sub of comp.subitens) {
          newSubIds.add(sub.id);

          const { error: subError } = await supabase.from('orcamento_subitens').upsert({
            id: sub.id,
            composicao_id: comp.id,
            // NOT NULL fields required by DB schema and RLS policy
            categoria_id: cat.id,
            company_id: company?.id,
            nome: (sub.descricao || sub.codigo || 'Subitem').replace(/^\[DEMO\] /, '').substring(0, 200),
            // Regular fields
            codigo: sub.codigo,
            descricao: sub.descricao,
            unidade: sub.unidade || null,
            quantidade: sub.quantidade,
            preco_unitario: sub.precoUnitario,
            preco_total: sub.precoTotal,

            codigo_referencia_externa: sub.codigoReferenciaExterna || null,
            origem_grupo_titulo: sub.origemGrupoTitulo || null,
            origem_composicao_codigo: sub.origemComposicaoCodigo || null,
            origem_composicao_descricao: sub.origemComposicaoDescricao || null,
          });

          if (subError) throw subError;
        }
      }
    }

    const subsToDelete = [...existingSubIds].filter((id) => !newSubIds.has(id));
    const compsToDelete = [...existingCompIds].filter((id) => !newCompIds.has(id));
    const catsToDelete = [...existingCatIds].filter((id) => !newCatIds.has(id));

    if (subsToDelete.length > 0) {
      const { error } = await supabase.from('orcamento_subitens').delete().in('id', subsToDelete);
      if (error) throw error;
    }
    if (compsToDelete.length > 0) {
      const { error } = await supabase.from('orcamento_composicoes').delete().in('id', compsToDelete);
      if (error) throw error;
    }
    if (catsToDelete.length > 0) {
      const { error } = await supabase.from('orcamento_categorias').delete().in('id', catsToDelete);
      if (error) throw error;
    }

    setCatalogo((prev) => {
      const next = [...prev];
      for (const cat of orc.categorias) {
        if (!next.some((c) => c.codigo === cat.codigo)) {
          next.push({ codigo: cat.codigo, nome: cat.nome });
        }
      }
      return next;
    });

    // Optimistic update: atualiza estado local sem buscar novamente do banco.
    // Evita o re-fetch completo (3 tabelas) após cada autosave, que causava
    // refreshes visíveis na UI. Os dados no banco já foram persistidos acima.
    setOrcamentos((prev) => {
      const idx = prev.findIndex((o) => o.obraId === obraId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { obraId, categorias: orc.categorias };
        return next;
      }
      return [...prev, { obraId, categorias: orc.categorias }];
    });
  }, [orcamentos]);

  const addCategoriaToCatalogo = useCallback((cat: CategoriaTemplate) => {
    setCatalogo((prev) => {
      if (prev.some((c) => c.codigo === cat.codigo)) return prev;
      return [...prev, cat];
    });
  }, []);

  const generateCategoriaCodigo = useCallback(() => {
    const nums = catalogoCategorias
      .map((c) => {
        const m = c.codigo.match(/^CAT-(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `CAT-${String(next).padStart(3, '0')}`;
  }, [catalogoCategorias]);

  const generateComposicaoCodigo = useCallback((categoriaCode: string, existingCodes: string[]) => {
    const prefix = categoriaCode.replace('CAT-', 'COMP-');
    let max = 0;

    for (const code of existingCodes) {
      const m = code.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    return `${prefix}-${String(max + 1).padStart(2, '0')}`;
  }, []);

  const generateSubitemCodigo = useCallback((composicaoCodigo: string, existingCodes: string[]) => {
    const prefix = composicaoCodigo.replace('COMP-', 'SUB-');
    let max = 0;

    for (const code of existingCodes) {
      const m = code.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    return `${prefix}-${String(max + 1).padStart(2, '0')}`;
  }, []);

  const getUnidadesUsadas = useCallback(() => {
    const set = new Set<string>();
    ['vb', 'm²', 'm³', 'm', 'un', 'kg', 'saco', 'barra', 'rolo', 'l', 't', 'mês', 'dia', 'h'].forEach((u) => set.add(u));

    for (const orc of orcamentos) {
      for (const cat of orc.categorias) {
        for (const comp of cat.composicoes) {
          if (comp.unidade) set.add(comp.unidade);
          for (const sub of comp.subitens) {
            if (sub.unidade) set.add(sub.unidade);
          }
        }
      }
    }

    return Array.from(set).sort();
  }, [orcamentos]);

  const getSugestaoInsumos = useCallback((categoriaNome: string): InsumoTemplate[] => {
    const fromCatalog = catalogoInsumos.filter((i) => i.categoriaRef === categoriaNome);
    const fromExisting: InsumoTemplate[] = [];

    for (const orc of orcamentos) {
      for (const cat of orc.categorias) {
        if (cat.nome === categoriaNome) {
          for (const comp of cat.composicoes) {
            if (
              comp.descricao &&
              !fromCatalog.some((c) => c.descricao === comp.descricao) &&
              !fromExisting.some((e) => e.descricao === comp.descricao)
            ) {
              fromExisting.push({
                descricao: comp.descricao,
                unidade: comp.unidade,
                categoriaRef: categoriaNome,
              });
            }
          }
        }
      }
    }

    return [...fromCatalog, ...fromExisting];
  }, [orcamentos]);

  const getComposicoesUsadasPorCategoria = useCallback((categoriaNome: string) => {
    const result: { descricao: string; unidade: string }[] = [];

    for (const orc of orcamentos) {
      for (const cat of orc.categorias) {
        if (cat.nome === categoriaNome) {
          for (const comp of cat.composicoes) {
            if (comp.descricao && !result.some((r) => r.descricao === comp.descricao)) {
              result.push({ descricao: comp.descricao, unidade: comp.unidade });
            }
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
        catalogoCategorias,
        addCategoriaToCatalogo,
        generateCategoriaCodigo,
        getUnidadesUsadas,
        getSugestaoInsumos,
        getComposicoesUsadasPorCategoria,
        generateComposicaoCodigo,
        generateSubitemCodigo,
        refreshOrcamentos: fetchAll,
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