import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardPaste, ChevronRight, ChevronLeft, Check, AlertTriangle, X, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrcamentoEtapa } from '@/contexts/OrcamentoContext';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface PastedComposicao {
  descricao: string;
  unidade?: string;
  quantidade?: number;
  precoUnitario?: number;
}

type PlanilhaField = 'descricao' | 'unidade' | 'quantidade' | 'precoUnitario' | 'ignorar';
type CotacaoField = 'descricao' | 'precoUnitario' | 'ignorar';

interface MapaItem {
  key: string;
  descricao: string;
  unidade: string;
}

interface MatchResult {
  pastedIndex: number;
  pastedDescricao: string;
  pastedPreco: number | null;
  matchedKey: string | null;
  matchedDescricao: string | null;
  score: number;
}

type Step = 'paste' | 'map' | 'preview';

interface Props {
  mode: 'planilha' | 'cotacao';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Modo planilha
  etapas?: OrcamentoEtapa[];
  onApplyComposicoes?: (etapaId: string, composicoes: PastedComposicao[]) => void;
  // Modo cotação
  itensDoMapa?: MapaItem[];
  onApplyPrecos?: (fornecedorNome: string, precos: Record<string, number>) => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function parseTSV(text: string): string[][] {
  return text
    .split('\n')
    .map(line => line.split('\t').map(cell => cell.trim().replace(/^"|"$/g, '')))
    .filter(row => row.some(cell => cell.length > 0));
}

function looksLikeHeader(row: string[]): boolean {
  const headerWords = ['descri', 'nome', 'item', 'servi', 'unit', 'un.', 'qtd', 'quant',
    'preco', 'preço', 'valor', 'total', 'cod', 'codigo'];
  const normalized = row.map(normalize);
  return normalized.some(cell => headerWords.some(w => cell.includes(w)));
}

function autoDetectMapping(headers: string[]): Record<number, PlanilhaField> {
  const map: Record<number, PlanilhaField> = {};
  headers.forEach((h, i) => {
    const n = normalize(h);
    if (n.includes('desc') || n.includes('nome') || n.includes('item') || n.includes('serv')) {
      map[i] = 'descricao';
    } else if (n.includes('un') && !n.includes('unit')) {
      map[i] = 'unidade';
    } else if (n.includes('qtd') || n.includes('quant')) {
      map[i] = 'quantidade';
    } else if (n.includes('unit') || n.includes('preco') || n.includes('preço') || n.includes('valor')) {
      map[i] = 'precoUnitario';
    } else {
      map[i] = 'ignorar';
    }
  });
  return map;
}

function autoDetectCotacaoMapping(headers: string[]): Record<number, CotacaoField> {
  const map: Record<number, CotacaoField> = {};
  headers.forEach((h, i) => {
    const n = normalize(h);
    if (n.includes('desc') || n.includes('nome') || n.includes('item') || n.includes('serv')) {
      map[i] = 'descricao';
    } else if (n.includes('unit') || n.includes('preco') || n.includes('preço') || n.includes('valor')) {
      map[i] = 'precoUnitario';
    } else {
      map[i] = 'ignorar';
    }
  });
  return map;
}

function parseNumber(val: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function matchScore(colada: string, descSistema: string): number {
  const wc = normalize(colada).split(/\s+/).filter(w => w.length > 3);
  const ws = normalize(descSistema).split(/\s+/).filter(w => w.length > 3);
  if (wc.length === 0 || ws.length === 0) return 0;
  const intersection = wc.filter(w => ws.includes(w));
  return intersection.length / Math.max(wc.length, ws.length);
}

// ── Componente ─────────────────────────────────────────────────────────────────

const PLANILHA_FIELD_LABELS: Record<PlanilhaField, string> = {
  descricao: 'Descrição *',
  unidade: 'Unidade',
  quantidade: 'Quantidade',
  precoUnitario: 'Preço Unitário',
  ignorar: '— Ignorar —',
};

const COTACAO_FIELD_LABELS: Record<CotacaoField, string> = {
  descricao: 'Descrição (para match)',
  precoUnitario: 'Preço Unitário *',
  ignorar: '— Ignorar —',
};

export default function PasteImportDialog({
  mode,
  open,
  onOpenChange,
  etapas = [],
  onApplyComposicoes,
  itensDoMapa = [],
  onApplyPrecos,
}: Props) {
  const [step, setStep] = useState<Step>('paste');
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [colMappingPlanilha, setColMappingPlanilha] = useState<Record<number, PlanilhaField>>({});
  const [colMappingCotacao, setColMappingCotacao] = useState<Record<number, CotacaoField>>({});
  const [selectedEtapaId, setSelectedEtapaId] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [applying, setApplying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const reset = () => {
    setStep('paste');
    setRawText('');
    setParsedRows([]);
    setHasHeader(true);
    setColMappingPlanilha({});
    setColMappingCotacao({});
    setSelectedEtapaId(etapas[0]?.id || '');
    setFornecedorNome('');
    setApplying(false);
  };

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOpenChange]);

  // Parse text when user pastes
  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) { setParsedRows([]); return; }
    const rows = parseTSV(text);
    setParsedRows(rows);
    // Auto-detect header
    if (rows.length > 0) {
      const firstLooksLike = looksLikeHeader(rows[0]);
      setHasHeader(firstLooksLike);
      // Auto-detect mapping from headers
      const headers = firstLooksLike ? rows[0] : rows[0].map((_, i) => `Coluna ${i + 1}`);
      if (mode === 'planilha') {
        setColMappingPlanilha(autoDetectMapping(headers));
      } else {
        setColMappingCotacao(autoDetectCotacaoMapping(headers));
      }
    }
  };

  const headerRow = hasHeader && parsedRows.length > 0 ? parsedRows[0] : parsedRows[0]?.map((_, i) => `Coluna ${i + 1}`);
  const dataRows = hasHeader ? parsedRows.slice(1) : parsedRows;
  const numCols = headerRow?.length ?? 0;

  // ── Computed: composições extraídas ─────────────────────────────────────────
  const composicoesExtraidas = useMemo((): PastedComposicao[] => {
    if (mode !== 'planilha' || dataRows.length === 0) return [];
    return dataRows.map(row => {
      const comp: PastedComposicao = { descricao: '' };
      for (let i = 0; i < numCols; i++) {
        const field = colMappingPlanilha[i];
        const val = row[i] ?? '';
        if (field === 'descricao') comp.descricao = val;
        else if (field === 'unidade') comp.unidade = val;
        else if (field === 'quantidade') comp.quantidade = parseNumber(val) ?? undefined;
        else if (field === 'precoUnitario') comp.precoUnitario = parseNumber(val) ?? undefined;
      }
      return comp;
    }).filter(c => c.descricao.length > 0);
  }, [mode, dataRows, colMappingPlanilha, numCols]);

  // ── Computed: matches para cotação ──────────────────────────────────────────
  const matchResults = useMemo((): MatchResult[] => {
    if (mode !== 'cotacao' || dataRows.length === 0) return [];
    const descCol = Object.entries(colMappingCotacao).find(([, v]) => v === 'descricao')?.[0];
    const precoCol = Object.entries(colMappingCotacao).find(([, v]) => v === 'precoUnitario')?.[0];

    return dataRows.map((row, idx) => {
      const descColada = row[Number(descCol)] ?? '';
      const precoVal = parseNumber(row[Number(precoCol)] ?? '');

      let bestMatch: { key: string; descricao: string; score: number } | null = null;
      for (const item of itensDoMapa) {
        const score = matchScore(descColada, item.descricao);
        if (score > 0.4 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { key: item.key, descricao: item.descricao, score };
        }
      }

      return {
        pastedIndex: idx,
        pastedDescricao: descColada,
        pastedPreco: precoVal,
        matchedKey: bestMatch?.key ?? null,
        matchedDescricao: bestMatch?.descricao ?? null,
        score: bestMatch?.score ?? 0,
      };
    }).filter(r => r.pastedDescricao.length > 0);
  }, [mode, dataRows, colMappingCotacao, itensDoMapa]);

  const matchedCount = matchResults.filter(r => r.matchedKey !== null).length;
  const validCount = matchResults.filter(r => r.matchedKey !== null && r.pastedPreco !== null).length;

  // ── Avançar para o mapeamento ────────────────────────────────────────────────
  const canProceedFromPaste = parsedRows.length > 0 && rawText.trim().length > 0;

  // ── Avançar para preview / confirmar ────────────────────────────────────────
  const canProceedFromMap = mode === 'planilha'
    ? Object.values(colMappingPlanilha).includes('descricao') && composicoesExtraidas.length > 0
    : Object.values(colMappingCotacao).includes('precoUnitario') && validCount > 0;

  // ── Apply ────────────────────────────────────────────────────────────────────
  const handleApply = useCallback(async () => {
    setApplying(true);
    try {
      if (mode === 'planilha' && onApplyComposicoes) {
        onApplyComposicoes(selectedEtapaId || etapas[0]?.id, composicoesExtraidas);
        handleClose();
      } else if (mode === 'cotacao' && onApplyPrecos) {
        const precos: Record<string, number> = {};
        matchResults.forEach(r => {
          if (r.matchedKey && r.pastedPreco !== null) {
            precos[r.matchedKey] = r.pastedPreco;
          }
        });
        await onApplyPrecos(fornecedorNome.trim() || 'Fornecedor importado', precos);
        handleClose();
      }
    } finally {
      setApplying(false);
    }
  }, [mode, composicoesExtraidas, matchResults, selectedEtapaId, fornecedorNome, onApplyComposicoes, onApplyPrecos, etapas, handleClose]);

  const title = mode === 'planilha' ? '📋 Importar Composições do Excel' : '📋 Colar Preços do Fornecedor';
  const stepLabels = ['Colar', 'Mapear', 'Confirmar'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-card to-emerald-50/30 dark:to-emerald-950/10 px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          </DialogHeader>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-3">
            {stepLabels.map((label, i) => {
              const stepId = ['paste', 'map', 'preview'][i] as Step;
              const isCurrent = step === stepId;
              const isDone = ['paste', 'map', 'preview'].indexOf(step) > i;
              return (
                <div key={label} className="flex items-center gap-1">
                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all',
                    isCurrent ? 'bg-emerald-600 text-white' :
                    isDone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {isDone ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                    {label}
                  </div>
                  {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* ── STEP 1: COLAR ──────────────────────────────────────────────────── */}
          {step === 'paste' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {mode === 'planilha'
                    ? 'Selecione as células desejadas no Excel ou Google Sheets e pressione Ctrl+C. Depois, clique na área abaixo e pressione Ctrl+V.'
                    : 'Copie a planilha do fornecedor (com descrição e preço unitário) e cole abaixo. O sistema tentará identificar os itens automaticamente.'}
                </p>
              </div>

              {mode === 'cotacao' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nome do Fornecedor</label>
                  <Input
                    value={fornecedorNome}
                    onChange={e => setFornecedorNome(e.target.value)}
                    placeholder="Ex: Fornecedora ABC Ltda."
                    className="h-8 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Cole aqui (Ctrl+V)</label>
                <textarea
                  ref={textareaRef}
                  value={rawText}
                  onChange={e => handleTextChange(e.target.value)}
                  onPaste={e => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text');
                    handleTextChange(text);
                  }}
                  placeholder="Cole aqui os dados copiados do Excel..."
                  className="w-full h-32 px-3 py-2 text-xs font-mono border rounded-md resize-none bg-muted/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-muted-foreground/40"
                />
              </div>

              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                      {dataRows.length} linha{dataRows.length !== 1 ? 's' : ''} detectada{dataRows.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {numCols} coluna{numCols !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Toggle header */}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasHeader}
                      onChange={e => setHasHeader(e.target.checked)}
                      className="rounded"
                    />
                    Primeira linha é cabeçalho
                  </label>

                  {/* Preview table */}
                  <div className="overflow-x-auto rounded-md border">
                    <table className="text-[11px] w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          {headerRow?.map((h, i) => (
                            <th key={i} className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                              {h || `Col ${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dataRows.slice(0, 3).map((row, ri) => (
                          <tr key={ri} className="border-t odd:bg-muted/10">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-2 py-1 text-foreground max-w-[160px] truncate">
                                {cell || <span className="text-muted-foreground/40">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {dataRows.length > 3 && (
                          <tr className="border-t bg-muted/5">
                            <td colSpan={numCols} className="px-2 py-1.5 text-muted-foreground text-center">
                              +{dataRows.length - 3} linhas restantes...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: MAPEAR ────────────────────────────────────────────────── */}
          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Indique qual campo do sistema corresponde a cada coluna detectada.
              </p>

              <div className="space-y-2">
                {headerRow?.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-36 text-xs text-foreground font-medium truncate shrink-0 bg-muted/40 px-2 py-1.5 rounded">
                      {h || `Coluna ${i + 1}`}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <Select
                      value={mode === 'planilha' ? (colMappingPlanilha[i] ?? 'ignorar') : (colMappingCotacao[i] ?? 'ignorar')}
                      onValueChange={v => {
                        if (mode === 'planilha') {
                          setColMappingPlanilha(prev => ({ ...prev, [i]: v as PlanilhaField }));
                        } else {
                          setColMappingCotacao(prev => ({ ...prev, [i]: v as CotacaoField }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mode === 'planilha'
                          ? Object.entries(PLANILHA_FIELD_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                          ))
                          : Object.entries(COTACAO_FIELD_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    {/* Preview do valor */}
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px] shrink-0">
                      {dataRows[0]?.[i] ?? ''}
                    </span>
                  </div>
                ))}
              </div>

              {mode === 'planilha' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Adicionar à etapa</label>
                  <Select value={selectedEtapaId} onValueChange={setSelectedEtapaId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar etapa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {etapas.map(e => (
                        <SelectItem key={e.id} value={e.id} className="text-xs">
                          {e.nome || e.codigo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === 'cotacao' && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    O sistema fará correspondência automática entre as descrições coladas e os itens do mapa de preços. Itens sem correspondência (similaridade &lt;40%) serão ignorados.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: PREVIEW ───────────────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {mode === 'planilha' && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <Check className="h-3 w-3 mr-1" />
                      {composicoesExtraidas.length} composição{composicoesExtraidas.length !== 1 ? 'ões' : ''} prontas para importar
                    </Badge>
                    {etapas.find(e => e.id === selectedEtapaId) && (
                      <Badge variant="outline" className="text-[10px]">
                        → {etapas.find(e => e.id === selectedEtapaId)?.nome || selectedEtapaId}
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-md border overflow-hidden">
                    <table className="text-[11px] w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Descrição</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Un</th>
                          <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">Qtd</th>
                          <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">P.Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {composicoesExtraidas.slice(0, 8).map((c, i) => (
                          <tr key={i} className="border-t odd:bg-muted/10">
                            <td className="px-3 py-1.5 text-foreground max-w-[200px] truncate">{c.descricao}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{c.unidade || '—'}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{c.quantidade ?? '—'}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {c.precoUnitario != null ? c.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                            </td>
                          </tr>
                        ))}
                        {composicoesExtraidas.length > 8 && (
                          <tr className="border-t bg-muted/5">
                            <td colSpan={4} className="px-3 py-1.5 text-muted-foreground text-center">
                              +{composicoesExtraidas.length - 8} mais...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {mode === 'cotacao' && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <Check className="h-3 w-3 mr-1" />
                      {validCount} preço{validCount !== 1 ? 's' : ''} com correspondência
                    </Badge>
                    {matchResults.length - matchedCount > 0 && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {matchResults.length - matchedCount} sem correspondência (serão ignorados)
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-md border overflow-hidden max-h-64 overflow-y-auto">
                    <table className="text-[11px] w-full">
                      <thead className="sticky top-0">
                        <tr className="bg-muted/50">
                          <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Colado</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Correspondência</th>
                          <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">Preço</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchResults.map((r, i) => (
                          <tr key={i} className={cn('border-t', r.matchedKey ? 'odd:bg-muted/10' : 'bg-amber-50/40 dark:bg-amber-950/10')}>
                            <td className="px-3 py-1.5 max-w-[150px] truncate text-foreground" title={r.pastedDescricao}>
                              {r.pastedDescricao}
                            </td>
                            <td className="px-3 py-1.5">
                              {r.matchedDescricao ? (
                                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <Check className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[140px]" title={r.matchedDescricao}>{r.matchedDescricao}</span>
                                </span>
                              ) : (
                                <span className="text-amber-600 flex items-center gap-1">
                                  <X className="h-3 w-3" />
                                  Não identificado
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                              {r.pastedPreco != null ? r.pastedPreco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/10 gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">
            Cancelar
          </Button>

          {step !== 'paste' && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={() => setStep(step === 'map' ? 'paste' : 'map')}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          )}

          {step === 'paste' && (
            <Button
              size="sm"
              className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!canProceedFromPaste}
              onClick={() => setStep('map')}
            >
              Mapear colunas
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {step === 'map' && (
            <Button
              size="sm"
              className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!canProceedFromMap}
              onClick={() => setStep('preview')}
            >
              Ver prévia
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {step === 'preview' && (
            <Button
              size="sm"
              className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={applying || (mode === 'planilha' ? composicoesExtraidas.length === 0 : validCount === 0)}
              onClick={handleApply}
            >
              {applying ? 'Importando...' : (
                mode === 'planilha'
                  ? `Importar ${composicoesExtraidas.length} composição${composicoesExtraidas.length !== 1 ? 'ões' : ''}`
                  : `Salvar ${validCount} preço${validCount !== 1 ? 's' : ''}`
              )}
              <ClipboardPaste className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
