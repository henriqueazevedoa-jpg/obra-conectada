/**
 * RecebiveisTab.tsx
 * Aba de Recebíveis no FinanceiroCentral.
 * Exibe registros da tabela 'recebiveis' com status dinâmico,
 * KPIs e drawer de confirmação de recebimento.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { isAfter, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Loader2, CheckCircle, Clock, AlertTriangle, DollarSign, TrendingDown, Receipt } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { PageKPI } from '@/components/layout/PageShell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recebivel {
  id: string;
  obra_id: string;
  contrato_id: string | null;
  medicao_id: string | null;
  descricao: string;
  valor_faturado: number;
  valor_recebido: number | null;
  status: string; // 'aberto' | 'recebido' | 'parcial' | 'cancelado'
  data_emissao: string | null;
  data_vencimento: string | null;
  data_recebimento: string | null;
  forma_recebimento: string | null;
  numero_nf: string | null;
  observacoes: string | null;
  // computed
  statusDinamico?: 'recebido' | 'parcial' | 'vencido' | 'a_vencer' | 'pendente';
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
}

function calcStatus(r: Recebivel): Recebivel['statusDinamico'] {
  if (r.status === 'recebido') return 'recebido';
  if (r.status === 'parcial')  return 'parcial';
  if (r.status === 'cancelado') return 'pendente';
  // aberto
  if (!r.data_vencimento) return 'pendente';
  const venc = parseISO(r.data_vencimento);
  if (isAfter(new Date(), venc)) return 'vencido';
  // a_vencer = vence nos próximos 7 dias
  const em7 = new Date(); em7.setDate(em7.getDate() + 7);
  if (!isAfter(venc, em7)) return 'a_vencer';
  return 'pendente';
}

const STATUS_CFG = {
  recebido: { label: 'Recebido',  icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  parcial:  { label: 'Parcial',   icon: TrendingDown,  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  vencido:  { label: 'Vencido',   icon: AlertTriangle, cls: 'bg-red-100 text-red-700 border-red-200' },
  a_vencer: { label: 'A vencer',  icon: Clock,         cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  pendente: { label: 'Pendente',  icon: Clock,         cls: 'bg-muted text-muted-foreground border-border' },
} as const;

const FORMAS = [
  { value: 'pix',           label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto',        label: 'Boleto' },
  { value: 'dinheiro',      label: 'Dinheiro' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'cartao',        label: 'Cartão' },
  { value: 'outro',         label: 'Outro' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecebiveisTabProps {
  obraId: string;
  isActive?: boolean;
  onKpisReady?: (kpis: PageKPI[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecebiveisTab({ obraId, isActive = true, onKpisReady }: RecebiveisTabProps) {
  const [recebiveis, setRecebiveis] = useState<Recebivel[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer de confirmação
  const [confirmando, setConfirmando] = useState<Recebivel | null>(null);
  const [drcDataRecebimento, setDrcDataRecebimento] = useState('');
  const [drcValorRecebido, setDrcValorRecebido] = useState('');
  const [drcForma, setDrcForma] = useState('pix');
  const [drcNumeroNF, setDrcNumeroNF] = useState('');
  const [drcObs, setDrcObs] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRecebiveis = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('recebiveis')
      .select('*')
      .eq('obra_id', obraId)
      .order('data_vencimento', { ascending: true });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      const enriched = (data || []).map((r: Recebivel) => ({
        ...r,
        statusDinamico: calcStatus(r),
      }));
      setRecebiveis(enriched);
    }
    setLoading(false);
  }, [obraId]);

  useEffect(() => {
    if (isActive) fetchRecebiveis();
  }, [isActive, fetchRecebiveis]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpisData = useMemo(() => {
    const pendentes = recebiveis.filter(r => r.statusDinamico !== 'recebido' && r.statusDinamico !== 'parcial');
    const recebidos = recebiveis.filter(r => r.statusDinamico === 'recebido' || r.statusDinamico === 'parcial');
    const vencidos  = recebiveis.filter(r => r.statusDinamico === 'vencido');

    const aReceber  = pendentes.reduce((s, r) => s + Number(r.valor_faturado), 0);
    const recebido  = recebidos.reduce((s, r) => s + Number(r.valor_recebido || r.valor_faturado), 0);
    const emAtraso  = vencidos.reduce((s, r) => s + Number(r.valor_faturado), 0);

    return { aReceber, recebido, emAtraso };
  }, [recebiveis]);

  useEffect(() => {
    if (!onKpisReady) return;
    onKpisReady([
      {
        id: 'a-receber',
        label: 'A Receber',
        value: fmt(kpisData.aReceber),
        icon: <Receipt style={{ width: 14, height: 14, color: '#534AB7' }} />,
        tint: '#F3F2FD',
        valueColor: '#3C3489',
        main: true,
      },
      {
        id: 'recebido',
        label: 'Recebido',
        value: fmt(kpisData.recebido),
        icon: <CheckCircle style={{ width: 14, height: 14, color: kpisData.recebido > 0 ? '#3B6D11' : '#888' }} />,
        tint: kpisData.recebido > 0 ? '#EAF3DE' : undefined,
        valueColor: kpisData.recebido > 0 ? '#3B6D11' : undefined,
      },
      {
        id: 'vencidos',
        label: 'Em Atraso',
        value: fmt(kpisData.emAtraso),
        icon: <AlertTriangle style={{ width: 14, height: 14, color: kpisData.emAtraso > 0 ? '#B91C1C' : '#888' }} />,
        tint: kpisData.emAtraso > 0 ? '#FEE2E2' : undefined,
        valueColor: kpisData.emAtraso > 0 ? '#B91C1C' : undefined,
      },
    ]);
  }, [kpisData, onKpisReady]);

  // ── Grupos ────────────────────────────────────────────────────────────────
  const aReceber = recebiveis.filter(r => !['recebido'].includes(r.statusDinamico!));
  const recebidos = recebiveis.filter(r => r.statusDinamico === 'recebido');

  // ── Drawer handlers ───────────────────────────────────────────────────────
  const abrirConfirmacao = (r: Recebivel) => {
    setConfirmando(r);
    setDrcDataRecebimento(new Date().toISOString().slice(0, 10));
    setDrcValorRecebido(String(r.valor_faturado));
    setDrcForma('pix');
    setDrcNumeroNF(r.numero_nf || '');
    setDrcObs('');
  };

  const handleConfirmar = async () => {
    if (!confirmando) return;
    setSaving(true);
    try {
      const valorRec = Number(drcValorRecebido) || 0;
      const novoStatus = valorRec >= Number(confirmando.valor_faturado) ? 'recebido' : 'parcial';

      const { error } = await (supabase as any)
        .from('recebiveis')
        .update({
          status:            novoStatus,
          valor_recebido:    valorRec,
          data_recebimento:  drcDataRecebimento || null,
          forma_recebimento: drcForma || null,
          numero_nf:         drcNumeroNF || null,
          observacoes:       drcObs || null,
        })
        .eq('id', confirmando.id);

      if (error) throw error;

      toast({
        title: novoStatus === 'recebido' ? 'Recebimento confirmado!' : 'Recebimento parcial registrado.',
        description: `${fmt(valorRec)} em ${fmtDate(drcDataRecebimento)}.`,
      });
      setConfirmando(null);
      fetchRecebiveis();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const renderRow = (r: Recebivel) => {
    const cfg = STATUS_CFG[r.statusDinamico!] ?? STATUS_CFG.pendente;
    const StatusIcon = cfg.icon;
    const isPendente = !['recebido', 'parcial'].includes(r.statusDinamico!);

    return (
      <div
        key={r.id}
        className={cn(
          'flex items-center justify-between gap-4 px-5 py-4 border-b border-border/40 last:border-0',
          'hover:bg-muted/30 transition-colors group'
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <StatusIcon className={cn('h-4 w-4 mt-0.5 shrink-0', {
            'text-emerald-600': r.statusDinamico === 'recebido',
            'text-blue-600':    r.statusDinamico === 'parcial',
            'text-red-600':     r.statusDinamico === 'vencido',
            'text-amber-500':   r.statusDinamico === 'a_vencer',
            'text-muted-foreground': r.statusDinamico === 'pendente',
          })} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{r.descricao}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Emissão: {fmtDate(r.data_emissao)}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className={cn('text-xs font-medium', r.statusDinamico === 'vencido' && 'text-red-600')}>
                Venc: {fmtDate(r.data_vencimento)}
              </span>
              {r.numero_nf && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">NF {r.numero_nf}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{fmt(Number(r.valor_faturado))}</p>
            {r.valor_recebido != null && r.statusDinamico === 'parcial' && (
              <p className="text-[10px] text-blue-600">Rec: {fmt(Number(r.valor_recebido))}</p>
            )}
          </div>
          <Badge className={cn('text-[10px] border px-1.5 py-0 h-5 shrink-0', cfg.cls)}>
            {cfg.label}
          </Badge>
          {isPendente && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => abrirConfirmacao(r)}
            >
              Confirmar
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (recebiveis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <DollarSign className="h-10 w-10 opacity-20" />
        <p className="text-sm font-medium">Nenhum recebível registrado</p>
        <p className="text-xs text-center max-w-xs">
          Os recebíveis são criados automaticamente quando uma medição de cliente é aprovada.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 animate-fade-in">

        {/* Grupo A Receber */}
        {aReceber.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                A Receber ({aReceber.length})
              </p>
            </div>
            <div>
              {aReceber.map(renderRow)}
            </div>
          </div>
        )}

        {/* Grupo Recebido */}
        {recebidos.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-border/60 bg-emerald-50 dark:bg-emerald-950/20">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Recebido ({recebidos.length})
              </p>
            </div>
            <div>
              {recebidos.map(renderRow)}
            </div>
          </div>
        )}

      </div>

      {/* Drawer de confirmação */}
      <Sheet open={!!confirmando} onOpenChange={o => !o && setConfirmando(null)}>
        <SheetContent className="sm:max-w-[460px] flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-4 border-b border-border/40">
            <SheetTitle>Confirmar Recebimento</SheetTitle>
            <SheetDescription className="text-sm">
              {confirmando?.descricao}
            </SheetDescription>
            <p className="text-lg font-bold text-foreground pt-1">
              {confirmando ? fmt(Number(confirmando.valor_faturado)) : ''}
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="drc-data">Data de Recebimento</Label>
                <Input
                  id="drc-data"
                  type="date"
                  value={drcDataRecebimento}
                  onChange={e => setDrcDataRecebimento(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="drc-valor">Valor Recebido (R$)</Label>
                <Input
                  id="drc-valor"
                  type="number"
                  step="0.01"
                  min={0}
                  value={drcValorRecebido}
                  onChange={e => setDrcValorRecebido(e.target.value)}
                />
              </div>
            </div>

            {/* Indicador parcial/total */}
            {confirmando && drcValorRecebido && (
              <div className={cn(
                'rounded-lg px-4 py-2.5 text-xs font-semibold text-center',
                Number(drcValorRecebido) >= Number(confirmando.valor_faturado)
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              )}>
                {Number(drcValorRecebido) >= Number(confirmando.valor_faturado)
                  ? '✓ Recebimento total — status: Recebido'
                  : `⚠ Recebimento parcial — status: Parcial (falta ${fmt(Number(confirmando.valor_faturado) - Number(drcValorRecebido))})`
                }
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="drc-forma">Forma de Recebimento</Label>
              <Select value={drcForma} onValueChange={setDrcForma}>
                <SelectTrigger id="drc-forma">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="drc-nf">Número NF (opcional)</Label>
              <Input
                id="drc-nf"
                value={drcNumeroNF}
                onChange={e => setDrcNumeroNF(e.target.value)}
                placeholder="Ex: 001234"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="drc-obs">Observações (opcional)</Label>
              <Textarea
                id="drc-obs"
                value={drcObs}
                onChange={e => setDrcObs(e.target.value)}
                placeholder="Notas sobre este recebimento..."
                className="resize-none h-20"
              />
            </div>
          </div>

          <SheetFooter className="p-5 border-t border-border/40 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={saving || !drcDataRecebimento || !drcValorRecebido}
              onClick={handleConfirmar}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {saving ? 'Confirmando...' : 'Confirmar Recebimento'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
