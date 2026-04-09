import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
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

// --- DB mapping helpers ---
function dbToSubitem(row: any): OrcamentoSubitem {
  return {
    id: row.id,
    codigo: row.codigo || '',
    descricao: row.descricao || '',
    unidade: row.unidade || '',
    quantidade: row.quantidade != null ? Number(row.quantidade) : null,
    precoUnitario: row.preco_unitario != null ? Number(row.preco_unitario) : null,
    precoTotal: Number(row.preco_total) || 0,
  };
}

function dbToComposicao(row: any, subitens: OrcamentoSubitem[]): OrcamentoComposicao {
  return {
    id: row.id,
    codigo: row.codigo || '',
    descricao: row.descricao || '',
    unidade: row.unidade || '',
    quantidade: row.quantidade != null ? Number(row.quantidade) : null,
    precoUnitario: row.preco_unitario != null ? Number(row.preco_unitario) : null,
    precoTotal: Number(row.preco_total) || 0,
    subitens,
    usaSubitens: row.usa_subitens || false,
    dataInicioPrevista: row.data_inicio_prevista || undefined,
    dataFimPrevista: row.data_fim_prevista || undefined,
    dataInicioReal: row.data_inicio_real || undefined,
    dataFimReal: row.data_fim_real || undefined,
    pesoCronograma: row.peso_cronograma != null ? Number(row.peso_cronograma) : undefined,
    concluida: row.concluida || false,
  };
}

function dbToCategoria(row: any, composicoes: OrcamentoComposicao[]): OrcamentoCategoria {
  return {
    id: row.id,
    codigo: row.codigo || '',
    nome: row.nome || '',
    precoTotal: Number(row.preco_total) || 0,
    usaComposicoes: row.usa_composicoes || false,
    composicoes,
    dataInicioPrevista: row.data_inicio_prevista || undefined,
    dataFimPrevista: row.data_fim_prevista || undefined,
    dataInicioReal: row.data_inicio_real || undefined,
    dataFimReal: row.data_fim_real || undefined,
    statusCronograma: row.status_cronograma || undefined,
    percentualCronograma: row.percentual_cronograma != null ? Number(row.percentual_cronograma) : undefined,
    responsavel: row.responsavel || undefined,
    observacoesCronograma: row.observacoes_cronograma || undefined,
  };
}

export function OrcamentoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orcamentos, setOrcamentos] = useState<OrcamentoObra[]>([]);
  const [catalogoCategorias, setCatalogo] = useState<CategoriaTemplate[]>(defaultCategorias);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setOrcamentos([]); setLoading(false); return; }

    const [catRes, compRes, subRes] = await Promise.all([
      supabase.from('orcamento_categorias').select('*'),
      supabase.from('orcamento_composicoes').select('*'),
      supabase.from('orcamento_subitens').select('*'),
    ]);

    const cats = catRes.data || [];
    const comps = compRes.data || [];
    const subs = subRes.data || [];

    // Group subitens by composicao_id
    const subsByComp = new Map<string, any[]>();
    for (const s of subs) {
      const arr = subsByComp.get(s.composicao_id) || [];
      arr.push(s);
      subsByComp.set(s.composicao_id, arr);
    }

    // Group composicoes by categoria_id
    const compsByCat = new Map<string, OrcamentoComposicao[]>();
    for (const c of comps) {
      const compSubs = (subsByComp.get(c.id) || []).map(dbToSubitem);
      const comp = dbToComposicao(c, compSubs);
      const arr = compsByCat.get(c.categoria_id) || [];
      arr.push(comp);
      compsByCat.set(c.categoria_id, arr);
    }

    // Group categorias by obra_id
    const obraMap = new Map<string, OrcamentoCategoria[]>();
    for (const cat of cats) {
      const catComps = compsByCat.get(cat.id) || [];
      const categoria = dbToCategoria(cat, catComps);
      const arr = obraMap.get(cat.obra_id) || [];
      arr.push(categoria);
      obraMap.set(cat.obra_id, arr);
    }

    const result: OrcamentoObra[] = [];
    for (const [obraId, categorias] of obraMap) {
      result.push({ obraId, categorias });
    }

    setOrcamentos(result);

    // Update catalog with found categories
    setCatalogo(prev => {
      const next = [...prev];
      for (const cat of cats) {
        if (!next.some(c => c.codigo === cat.codigo)) {
          next.push({ codigo: cat.codigo, nome: cat.nome });
        }
      }
      return next;
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getOrcamento = useCallback((obraId: string) => {
    return orcamentos.find(o => o.obraId === obraId);
  }, [orcamentos]);

  const saveOrcamento = useCallback(async (orc: OrcamentoObra) => {
    const obraId = orc.obraId;

    // Get existing IDs from current cache
    const existing = orcamentos.find(o => o.obraId === obraId);
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

    // Upsert categorias
    for (const cat of orc.categorias) {
      newCatIds.add(cat.id);

      await supabase.from('orcamento_categorias').upsert({
        id: cat.id,
        obra_id: obraId,
        codigo: cat.codigo,
        nome: cat.nome,
        preco_total: cat.precoTotal,
        usa_composicoes: cat.usaComposicoes,
        data_inicio_prevista: cat.dataInicioPrevista || null,
        data_fim_prevista: cat.dataFimPrevista || null,
        data_inicio_real: cat.dataInicioReal || null,
        data_fim_real: cat.dataFimReal || null,
        status_cronograma: (cat.statusCronograma as any) || null,
        percentual_cronograma: cat.percentualCronograma ?? null,
        responsavel: cat.responsavel || null,
        observacoes_cronograma: cat.observacoesCronograma || null,
      });

      // Upsert composicoes
      for (const comp of cat.composicoes) {
        newCompIds.add(comp.id);

        await supabase.from('orcamento_composicoes').upsert({
          id: comp.id,
          categoria_id: cat.id,
          codigo: comp.codigo,
          descricao: comp.descricao,
          unidade: comp.unidade || null,
          quantidade: comp.quantidade,
          preco_unitario: comp.precoUnitario,
          preco_total: comp.precoTotal,
          usa_subitens: comp.usaSubitens,
          data_inicio_prevista: comp.dataInicioPrevista || null,
          data_fim_prevista: comp.dataFimPrevista || null,
          data_inicio_real: comp.dataInicioReal || null,
          data_fim_real: comp.dataFimReal || null,
          peso_cronograma: comp.pesoCronograma ?? null,
          concluida: comp.concluida || false,
        });

        // Upsert subitens
        for (const sub of comp.subitens) {
          newSubIds.add(sub.id);

          await supabase.from('orcamento_subitens').upsert({
            id: sub.id,
            composicao_id: comp.id,
            codigo: sub.codigo,
            descricao: sub.descricao,
            unidade: sub.unidade || null,
            quantidade: sub.quantidade,
            preco_unitario: sub.precoUnitario,
            preco_total: sub.precoTotal,
          });
        }
      }
    }

    // Delete removed items (order: subitens → composicoes → categorias)
    const subsToDelete = [...existingSubIds].filter(id => !newSubIds.has(id));
    const compsToDelete = [...existingCompIds].filter(id => !newCompIds.has(id));
    const catsToDelete = [...existingCatIds].filter(id => !newCatIds.has(id));

    if (subsToDelete.length > 0) {
      await supabase.from('orcamento_subitens').delete().in('id', subsToDelete);
    }
    if (compsToDelete.length > 0) {
      await supabase.from('orcamento_composicoes').delete().in('id', compsToDelete);
    }
    if (catsToDelete.length > 0) {
      await supabase.from('orcamento_categorias').delete().in('id', catsToDelete);
    }

    // Update catalog
    for (const cat of orc.categorias) {
      setCatalogo(prev => {
        if (prev.some(c => c.codigo === cat.codigo)) return prev;
        return [...prev, { codigo: cat.codigo, nome: cat.nome }];
      });
    }

    // Refetch
    await fetchAll();
  }, [orcamentos, fetchAll]);

  const addCategoriaToCatalogo = useCallback((cat: CategoriaTemplate) => {
    setCatalogo(prev => {
      if (prev.some(c => c.codigo === cat.codigo)) return prev;
      return [...prev, cat];
    });
  }, []);

  const generateCategoriaCodigo = useCallback(() => {
    const nums = catalogoCategorias
      .map(c => { const m = c.codigo.match(/^CAT-(\d+)$/); return m ? parseInt(m[1]) : 0; })
      .filter(n => n > 0);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `CAT-${String(next).padStart(3, '0')}`;
  }, [catalogoCategorias]);

  const generateComposicaoCodigo = useCallback((categoriaCode: string, existingCodes: string[]) => {
    const prefix = categoriaCode.replace('CAT-', 'COMP-');
    let max = 0;
    for (const code of existingCodes) {
      const m = code.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) max = Math.max(max, parseInt(m[1]));
    }
    return `${prefix}-${String(max + 1).padStart(2, '0')}`;
  }, []);

  const generateSubitemCodigo = useCallback((composicaoCodigo: string, existingCodes: string[]) => {
    const prefix = composicaoCodigo.replace('COMP-', 'SUB-');
    let max = 0;
    for (const code of existingCodes) {
      const m = code.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) max = Math.max(max, parseInt(m[1]));
    }
    return `${prefix}-${String(max + 1).padStart(2, '0')}`;
  }, []);

  const getUnidadesUsadas = useCallback(() => {
    const set = new Set<string>();
    ['vb', 'm²', 'm³', 'm', 'un', 'kg', 'saco', 'barra', 'rolo', 'l', 't', 'mês', 'dia', 'h'].forEach(u => set.add(u));
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
    const fromCatalog = catalogoInsumos.filter(i => i.categoriaRef === categoriaNome);
    const fromExisting: InsumoTemplate[] = [];
    for (const orc of orcamentos) {
      for (const cat of orc.categorias) {
        if (cat.nome === categoriaNome) {
          for (const comp of cat.composicoes) {
            if (comp.descricao && !fromCatalog.some(c => c.descricao === comp.descricao) && !fromExisting.some(e => e.descricao === comp.descricao)) {
              fromExisting.push({ descricao: comp.descricao, unidade: comp.unidade, categoriaRef: categoriaNome });
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
            if (comp.descricao && !result.some(r => r.descricao === comp.descricao)) {
              result.push({ descricao: comp.descricao, unidade: comp.unidade });
            }
          }
        }
      }
    }
    return result;
  }, [orcamentos]);

  return (
    <OrcamentoContext.Provider value={{
      orcamentos, loading, getOrcamento, saveOrcamento, catalogoCategorias,
      addCategoriaToCatalogo, generateCategoriaCodigo, getUnidadesUsadas,
      getSugestaoInsumos, getComposicoesUsadasPorCategoria,
      generateComposicaoCodigo, generateSubitemCodigo, refreshOrcamentos: fetchAll,
    }}>
      {children}
    </OrcamentoContext.Provider>
  );
}

export function useOrcamento() {
  const ctx = useContext(OrcamentoContext);
  if (!ctx) throw new Error('useOrcamento must be used within OrcamentoProvider');
  return ctx;
}
