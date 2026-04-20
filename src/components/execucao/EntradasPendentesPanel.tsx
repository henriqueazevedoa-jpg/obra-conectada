/**
 * EntradasPendentesPanel — G6
 * Painel de entradas pendentes enviadas por funcionários via link de operação.
 * Cada entrada pode ter foto de NF, observação e ser processada com IA (Vision).
 * O engenheiro revisa e confirma para inserir no estoque — a IA nunca age sozinha.
 */
import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose,
} from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PackagePlus, Sparkles, CheckCircle2, XCircle, Clock, Image as ImageIcon,
  AlertTriangle, Loader2, Receipt, TriangleAlert, RefreshCw, Eye,
} from 'lucide-react';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type EntradaStatus = 'pendente' | 'processado' | 'rejeitado';
type EntradaTipo = 'nota_fiscal' | 'recibo' | 'outro';

interface EntradaPendente {
  id: string;
  obra_id: string;
  link_id: string | null;
  nome_responsavel: string;
  tipo: EntradaTipo;
  foto_urls: string[];
  observacao: string | null;
  status: EntradaStatus;
  processado_por: string | null;
  dados_extraidos: DadosNF | null;
  created_at: string;
}

interface DadosNF {
  fornecedor?: string;
  data_nf?: string;
  numero_nf?: string;
  valor_total?: number;
  itens?: ItemNF[];
  observacao_ia?: string;
}

interface ItemNF {
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario?: number;
}

// ─── Labels ────────────────────────────────────────────────────────────────────

const tipoLabels: Record<EntradaTipo, string> = {
  nota_fiscal: 'Nota Fiscal',
  recibo: 'Recibo',
  outro: 'Outro',
};

const tipoIcons: Record<EntradaTipo, React.ElementType> = {
  nota_fiscal: Receipt,
  recibo: Receipt,
  outro: PackagePlus,
};

const statusStyles: Record<EntradaStatus, string> = {
  pendente: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  processado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejeitado: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const statusLabels: Record<EntradaStatus, string> = {
  pendente: 'Pendente',
  processado: 'Processado',
  rejeitado: 'Rejeitado',
};

const SUPABASE_URL = 'https://ehmdwwuhhumgxhsjvvrr.supabase.co';

// ─── Card individual ───────────────────────────────────────────────────────────

function EntradaCard({
  entrada,
  onReview,
  onReject,
}: {
  entrada: EntradaPendente;
  onReview: () => void;
  onReject: () => void;
}) {
  const TipoIcon = tipoIcons[entrada.tipo] || PackagePlus;
  const isFaltaMaterial = entrada.observacao?.startsWith('FALTA DE MATERIAL:');
  const dataFormatada = format(parseISO(entrada.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR });

  return (
    <div className={cn(
      'border rounded-xl p-4 bg-card transition-all duration-150',
      entrada.status === 'pendente' ? 'border-amber-500/20' : 'border-border'
    )}>
      <div className="flex items-start gap-3">
        {/* Miniatura da foto ou ícone */}
        <div className="shrink-0">
          {entrada.foto_urls?.length > 0 ? (
            <div className="h-14 w-14 rounded-lg overflow-hidden border border-border relative group">
              <img
                src={entrada.foto_urls[0]}
                alt="NF"
                className="h-full w-full object-cover"
              />
              {entrada.foto_urls.length > 1 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+{entrada.foto_urls.length - 1}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={cn(
              'h-14 w-14 rounded-lg flex items-center justify-center border border-border',
              isFaltaMaterial ? 'bg-amber-500/10' : 'bg-muted/40'
            )}>
              {isFaltaMaterial
                ? <TriangleAlert className="h-6 w-6 text-amber-400" />
                : <TipoIcon className="h-6 w-6 text-muted-foreground" />
              }
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="font-semibold text-sm text-foreground">
              {entrada.nome_responsavel}
            </span>
            <Badge className={cn('text-[10px] border', statusStyles[entrada.status])}>
              {statusLabels[entrada.status]}
            </Badge>
            {!isFaltaMaterial && (
              <Badge variant="outline" className="text-[10px]">
                {tipoLabels[entrada.tipo]}
              </Badge>
            )}
            {isFaltaMaterial && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                Falta de material
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{dataFormatada}</p>

          {entrada.observacao && !isFaltaMaterial && (
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{entrada.observacao}</p>
          )}
          {isFaltaMaterial && (
            <p className="text-sm text-amber-400/90 mt-1 line-clamp-2">
              {entrada.observacao?.replace('FALTA DE MATERIAL: ', '')}
            </p>
          )}

          {/* Dados extraídos pela IA */}
          {entrada.dados_extraidos && entrada.status === 'processado' && (
            <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 space-y-0.5">
              <p className="text-[11px] text-emerald-400 font-semibold">IA processada</p>
              {entrada.dados_extraidos.fornecedor && (
                <p className="text-xs text-foreground/70">Fornecedor: {entrada.dados_extraidos.fornecedor}</p>
              )}
              {entrada.dados_extraidos.valor_total && (
                <p className="text-xs text-foreground/70">
                  Total: R$ {entrada.dados_extraidos.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
              {entrada.dados_extraidos.itens && (
                <p className="text-xs text-foreground/70">
                  {entrada.dados_extraidos.itens.length} item(ns) identificado(s)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        {entrada.status === 'pendente' && !isFaltaMaterial && (
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={onReview}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title="Revisar / Processar com IA"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={onReject}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
              title="Rejeitar"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
        {entrada.status === 'pendente' && isFaltaMaterial && (
          <button
            onClick={onReject}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
            title="Dispensar alerta"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Drawer de revisão ─────────────────────────────────────────────────────────

function RevisaoDrawer({
  entrada,
  open,
  onClose,
  onSaved,
}: {
  entrada: EntradaPendente | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [processandoIA, setProcessandoIA] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [dadosIA, setDadosIA] = useState<DadosNF | null>(null);
  const [fotoAtiva, setFotoAtiva] = useState(0);

  // Form de confirmação (pré-preenchido pela IA ou manual)
  const [fornecedor, setFornecedor] = useState('');
  const [dataNF, setDataNF] = useState('');
  const [numeroNF, setNumeroNF] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [observacaoManual, setObservacaoManual] = useState('');

  useEffect(() => {
    if (!open || !entrada) return;
    setDadosIA(entrada.dados_extraidos || null);
    setFotoAtiva(0);
    // Pré-preenche se já há dados da IA
    if (entrada.dados_extraidos) {
      const d = entrada.dados_extraidos;
      setFornecedor(d.fornecedor || '');
      setDataNF(d.data_nf || '');
      setNumeroNF(d.numero_nf || '');
      setValorTotal(d.valor_total ? String(d.valor_total) : '');
      setObservacaoManual(d.observacao_ia || '');
    } else {
      setFornecedor(''); setDataNF(''); setNumeroNF(''); setValorTotal(''); setObservacaoManual('');
    }
  }, [open, entrada]);

  const handleProcessarIA = async () => {
    if (!entrada) return;
    if (!entrada.foto_urls || entrada.foto_urls.length === 0) {
      toast({ title: 'Sem foto para processar', description: 'Esta entrada não tem imagem anexada.', variant: 'destructive' });
      return;
    }
    setProcessandoIA(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/process-nf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          entrada_id: entrada.id,
          foto_url: entrada.foto_urls[0],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const extracted: DadosNF = data.dados || {};
      setDadosIA(extracted);
      setFornecedor(extracted.fornecedor || '');
      setDataNF(extracted.data_nf || '');
      setNumeroNF(extracted.numero_nf || '');
      setValorTotal(extracted.valor_total ? String(extracted.valor_total) : '');
      setObservacaoManual(extracted.observacao_ia || '');
      toast({ title: '✅ IA processou a nota!', description: 'Revise os dados antes de confirmar.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao processar com IA', description: msg, variant: 'destructive' });
    } finally {
      setProcessandoIA(false);
    }
  };

  const handleConfirmar = async () => {
    if (!entrada) return;
    setConfirmando(true);
    try {
      const dados: DadosNF = {
        fornecedor: fornecedor || undefined,
        data_nf: dataNF || undefined,
        numero_nf: numeroNF || undefined,
        valor_total: valorTotal ? parseFloat(valorTotal) : undefined,
        itens: dadosIA?.itens || undefined,
        observacao_ia: observacaoManual || undefined,
      };
      await supabase.from('entradas_pendentes').update({
        status: 'processado',
        dados_extraidos: dados,
      }).eq('id', entrada.id);
      toast({ title: '✅ Entrada confirmada!', description: 'Os dados foram registrados com sucesso.' });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao confirmar', description: msg, variant: 'destructive' });
    } finally {
      setConfirmando(false);
    }
  };

  if (!entrada) return null;

  const temFotos = entrada.foto_urls && entrada.foto_urls.length > 0;

  return (
    <Drawer open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DrawerContent className="max-h-[92vh] flex flex-col">
        <DrawerHeader className="border-b border-border pb-3">
          <DrawerTitle className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-primary/80" />
            Revisar entrada — {entrada.nome_responsavel}
          </DrawerTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tipoLabels[entrada.tipo]} · {format(parseISO(entrada.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Fotos da NF */}
          {temFotos && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Imagem da nota
              </label>
              <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                <img
                  src={entrada.foto_urls[fotoAtiva]}
                  alt="Nota fiscal"
                  className="w-full max-h-64 object-contain bg-black/20"
                />
                {entrada.foto_urls.length > 1 && (
                  <div className="flex gap-1.5 p-2 justify-center">
                    {entrada.foto_urls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setFotoAtiva(i)}
                        className={cn(
                          'h-2 w-2 rounded-full transition-colors',
                          i === fotoAtiva ? 'bg-primary' : 'bg-muted-foreground/30'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Botão IA */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'w-full h-10 gap-2 font-medium',
                  dadosIA ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5' : 'border-primary/30 text-primary hover:bg-primary/5'
                )}
                onClick={handleProcessarIA}
                disabled={processandoIA}
              >
                {processandoIA ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                ) : dadosIA ? (
                  <><RefreshCw className="h-4 w-4" /> Reprocessar com IA</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Processar com IA</>
                )}
              </Button>

              {processandoIA && (
                <p className="text-xs text-muted-foreground text-center animate-pulse">
                  Extraindo dados da nota fiscal com Vision AI...
                </p>
              )}
            </div>
          )}

          {/* Observação original */}
          {entrada.observacao && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Observação do campo
              </label>
              <div className="rounded-xl bg-muted/30 border border-border px-4 py-3">
                <p className="text-sm text-foreground/80">{entrada.observacao}</p>
              </div>
            </div>
          )}

          {/* Formulário de confirmação */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Dados para confirmar
              {dadosIA && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary ml-auto">
                  Pré-preenchido pela IA
                </Badge>
              )}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs text-muted-foreground">Fornecedor</label>
                <Input
                  value={fornecedor}
                  onChange={e => setFornecedor(e.target.value)}
                  placeholder="Nome do fornecedor..."
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Data da NF</label>
                <Input
                  type="date"
                  value={dataNF}
                  onChange={e => setDataNF(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Nº da NF</label>
                <Input
                  value={numeroNF}
                  onChange={e => setNumeroNF(e.target.value)}
                  placeholder="000000"
                  className="h-10"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs text-muted-foreground">Valor total (R$)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={valorTotal}
                  onChange={e => setValorTotal(e.target.value)}
                  placeholder="0,00"
                  className="h-10"
                />
              </div>
            </div>

            {/* Itens da NF extraídos pela IA */}
            {dadosIA?.itens && dadosIA.itens.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Itens identificados pela IA</label>
                <div className="rounded-xl border border-border divide-y divide-border">
                  {dadosIA.itens.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 text-xs">
                      <span className="text-foreground/80 flex-1 min-w-0 truncate">{item.descricao}</span>
                      <span className="text-muted-foreground ml-3 shrink-0">
                        {item.quantidade} {item.unidade}
                      </span>
                      {item.valor_unitario && (
                        <span className="text-muted-foreground ml-3 shrink-0">
                          R$ {item.valor_unitario.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Observações internas</label>
              <Textarea
                value={observacaoManual}
                onChange={e => setObservacaoManual(e.target.value)}
                placeholder="Anotações sobre esta entrada..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t border-border gap-2">
          <Button
            onClick={handleConfirmar}
            disabled={confirmando}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {confirmando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirmando...</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar entrada</>}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full h-11">Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ─── EntradasPendentesPanel (export padrão) ────────────────────────────────────

export default function EntradasPendentesPanel({
  obraId,
  onCountChange,
  onAlertChange,
}: {
  obraId: string;
  /** Número de NFs pendentes (exclui falta de material) */
  onCountChange?: (count: number) => void;
  /** Número de alertas de falta de material pendentes */
  onAlertChange?: (count: number) => void;
}) {
  const [entradas, setEntradas] = useState<EntradaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<EntradaStatus | '_all'>('_all');
  const [reviewEntrada, setReviewEntrada] = useState<EntradaPendente | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const fetchEntradas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('entradas_pendentes')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });
    const items = (data || []) as EntradaPendente[];
    setEntradas(items);
    // Separate NF entries from falta-de-material alerts
    const nfPendentes = items.filter(e => e.status === 'pendente' && !e.observacao?.startsWith('FALTA DE MATERIAL:'));
    const faltaPendentes = items.filter(e => e.status === 'pendente' && e.observacao?.startsWith('FALTA DE MATERIAL:'));
    onCountChange?.(nfPendentes.length);
    onAlertChange?.(faltaPendentes.length);
    setLoading(false);
  }, [obraId, onCountChange, onAlertChange]);

  useEffect(() => { fetchEntradas(); }, [fetchEntradas]);

  const handleReject = async () => {
    if (!rejectId) return;
    setRejecting(true);
    await supabase.from('entradas_pendentes').update({ status: 'rejeitado' }).eq('id', rejectId);
    toast({ title: 'Entrada rejeitada.' });
    setRejectId(null);
    setRejecting(false);
    fetchEntradas();
  };

  // Falta de material: shown in dedicated banner, not in main NF list
  const faltaAlerts = entradas.filter(e => e.status === 'pendente' && e.observacao?.startsWith('FALTA DE MATERIAL:'));
  const nfEntradas = entradas.filter(e => !e.observacao?.startsWith('FALTA DE MATERIAL:'));
  const filtered = nfEntradas.filter(e => filterStatus === '_all' || e.status === filterStatus);
  const countPendente = nfEntradas.filter(e => e.status === 'pendente').length;
  const countProcessado = nfEntradas.filter(e => e.status === 'processado').length;

  const statusFilterOptions: { value: EntradaStatus | '_all'; label: string }[] = [
    { value: '_all', label: 'Todos' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'processado', label: 'Processados' },
    { value: 'rejeitado', label: 'Rejeitados' },
  ];

  return (
    <div className="space-y-4">

      {/* ── Alertas de falta de material ─────────────────────────── */}
      {faltaAlerts.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-red-500/20">
            <TriangleAlert className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-red-400">
              {faltaAlerts.length} sinalização{faltaAlerts.length !== 1 ? 'ões' : ''} de falta de material
            </p>
          </div>
          <div className="divide-y divide-red-500/10">
            {faltaAlerts.map(alerta => (
              <div key={alerta.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground/90 font-medium truncate">
                    {alerta.observacao?.replace('FALTA DE MATERIAL: ', '')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {alerta.nome_responsavel} · {format(parseISO(alerta.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => setRejectId(alerta.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  title="Dispensar alerta"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI row — NFs only */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'NFs Pendentes', value: countPendente, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Processadas', value: countProcessado, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total NFs', value: nfEntradas.length, color: 'text-foreground', bg: 'bg-muted/30' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn('rounded-xl border border-border p-3 text-center', bg)}>
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Aviso informativo */}
      {countPendente > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              {countPendente} NF{countPendente !== 1 ? 's' : ''} aguardando revisão
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clique em <Eye className="h-3 w-3 inline" /> para revisar e confirmar. Use a IA para extrair dados automaticamente das fotos de NF.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {statusFilterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterStatus === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchEntradas}
          className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center">
            <PackagePlus className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="text-muted-foreground text-sm">
            {filterStatus === '_all'
              ? 'Nenhuma entrada de material registrada ainda.'
              : `Nenhuma entrada ${statusLabels[filterStatus as EntradaStatus]?.toLowerCase()}.`}
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-xs">
            Entradas aparecem aqui quando funcionários registram recebimento de material via link de operação.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entrada => (
            <EntradaCard
              key={entrada.id}
              entrada={entrada}
              onReview={() => setReviewEntrada(entrada)}
              onReject={() => setRejectId(entrada.id)}
            />
          ))}
        </div>
      )}

      {/* Drawer de revisão */}
      <RevisaoDrawer
        entrada={reviewEntrada}
        open={!!reviewEntrada}
        onClose={() => setReviewEntrada(null)}
        onSaved={fetchEntradas}
      />

      {/* Confirmação de rejeição */}
      <AlertDialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              A entrada será marcada como rejeitada. Essa ação pode ser revertida manualmente pelo banco de dados, mas não pela interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejecting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {rejecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
