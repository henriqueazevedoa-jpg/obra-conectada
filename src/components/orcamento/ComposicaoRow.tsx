import { useState } from 'react';
import { OrcamentoComposicao, OrcamentoSubitem } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trash2, Plus, ChevronDown, Layers } from 'lucide-react';
import SubitemRow from './SubitemRow';
import { formatCurrency } from '@/data/mockData';

// Grid compartilhado entre header e linhas
export const COMPOSICAO_GRID = 'grid-cols-[120px_minmax(0,1fr)_68px_86px_104px_104px_34px]';

interface Props {
  composicao: OrcamentoComposicao;
  unidades: string[];
  onChange: (updated: OrcamentoComposicao) => void;
  onRemove: () => void;
  generateSubitemCodigo: (compCode: string, existing: string[]) => string;
  obraId?: string;
}

function recalcFromSubitens(comp: OrcamentoComposicao) {
  if (comp.usaSubitens) {
    comp.precoTotal = comp.subitens.reduce((s, si) => s + (Number(si.precoTotal) || 0), 0);
    comp.precoUnitario = comp.quantidade && comp.quantidade > 0
      ? comp.precoTotal / comp.quantidade
      : null;
  }
}

export default function ComposicaoRow({
  composicao, unidades, onChange, onRemove, generateSubitemCodigo, obraId,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const makeSubitem = (): OrcamentoSubitem => {
    const existingCodes = composicao.subitens.map(s => s.codigo);
    return {
      id: crypto.randomUUID(),
      codigo: generateSubitemCodigo(composicao.codigo, existingCodes),
      descricao: '',
      unidade: composicao.unidade || '',
      quantidade: null,
      precoUnitario: null,
      precoTotal: 0,
    };
  };

  const scaleSubitensForQuantidade = (
    subitens: OrcamentoSubitem[],
    previousQuantidade: number,
    nextQuantidade: number
  ): OrcamentoSubitem[] => {
    if (!(previousQuantidade > 0) || !(nextQuantidade > 0)) return subitens;
    const fator = nextQuantidade / previousQuantidade;
    return subitens.map((si) => {
      const q = (Number(si.quantidade) || 0) * fator;
      const pu = si.precoUnitario != null ? Number(si.precoUnitario) : null;
      return { ...si, quantidade: q, precoTotal: pu != null ? q * pu : Number(si.precoTotal) || 0 };
    });
  };

  const update = (field: string, value: string | number | null | boolean) => {
    const next = { ...composicao };
    const previousQuantidade = Number(composicao.quantidade) || 0;
    (next as unknown as Record<string, unknown>)[field] = value;

    if (!next.usaSubitens) {
      if (field === 'quantidade' || field === 'precoUnitario') {
        if (next.quantidade && next.precoUnitario) next.precoTotal = next.quantidade * next.precoUnitario;
      }
      if (field === 'precoTotal' && next.quantidade && next.quantidade > 0) {
        next.precoUnitario = next.precoTotal / next.quantidade;
      }
    } else {
      if (field === 'quantidade') {
        const nextQ = Number(value) || 0;
        if (previousQuantidade > 0 && nextQ > 0) {
          next.subitens = scaleSubitensForQuantidade(composicao.subitens, previousQuantidade, nextQ);
        }
      }
      recalcFromSubitens(next);
    }
    onChange(next);
  };

  const toggleSubitens = (val: boolean) => {
    const next = { ...composicao, usaSubitens: val };
    if (val && next.subitens.length === 0) next.subitens = [makeSubitem()];
    recalcFromSubitens(next);
    onChange(next);
    // Auto-expand o painel ao ativar
    if (val) setExpanded(true);
  };

  const updateSubitem = (idx: number, si: OrcamentoSubitem) => {
    const next = { ...composicao, subitens: [...composicao.subitens] };
    next.subitens[idx] = si;
    recalcFromSubitens(next);
    onChange(next);
  };

  const removeSubitem = (idx: number) => {
    const next = { ...composicao, subitens: composicao.subitens.filter((_, i) => i !== idx) };
    recalcFromSubitens(next);
    onChange(next);
  };

  const addSubitem = () => {
    const next = { ...composicao, subitens: [...composicao.subitens, makeSubitem()] };
    onChange(next);
  };

  const hasSubitens = composicao.usaSubitens;
  const isSinapi = composicao.fonteReferencia === 'SINAPI';

  return (
    <div className="rounded-md border border-border/40 bg-background">
      {/* ── Linha principal ── */}
      <div className={`grid ${COMPOSICAO_GRID} gap-2 items-center px-2 py-1.5`}>

        {/* Código + badge SINAPI */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs font-mono text-muted-foreground truncate">{composicao.codigo}</span>
          {isSinapi && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-400 text-blue-600 bg-blue-50 shrink-0 cursor-help">
                    SINAPI
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-48">
                  <p className="font-medium">Importado da SINAPI</p>
                  {composicao.ufReferencia && <p className="text-muted-foreground">UF: {composicao.ufReferencia}</p>}
                  {composicao.regimeReferencia && <p className="text-muted-foreground">Regime: {composicao.regimeReferencia}</p>}
                  {composicao.referenciaCompetencia && <p className="text-muted-foreground">Competência: {composicao.referenciaCompetencia}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Descrição */}
        <Input
          value={composicao.descricao}
          onChange={(e) => update('descricao', e.target.value)}
          className="h-8 text-xs px-2"
          placeholder="Descrição"
        />

        {/* Unidade */}
        <div>
          <Input
            value={composicao.unidade}
            onChange={(e) => update('unidade', e.target.value)}
            className="h-8 text-xs px-2"
            placeholder="Un"
            list={`un-comp-${composicao.id}`}
          />
          <datalist id={`un-comp-${composicao.id}`}>
            {unidades.map((u) => <option key={u} value={u} />)}
          </datalist>
        </div>

        {/* Quantidade */}
        <Input
          value={composicao.quantidade ?? ''}
          onChange={(e) => update('quantidade', e.target.value ? parseFloat(e.target.value) : null)}
          className="h-8 text-xs px-2 text-right"
          placeholder="Qtd"
          type="number"
        />

        {/* P. Unit */}
        {hasSubitens ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-right pr-2 text-muted-foreground cursor-help select-none">
                  {composicao.precoUnitario != null ? formatCurrency(composicao.precoUnitario) : '—'}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-48">
                Calculado automaticamente (Preço Total ÷ Quantidade)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Input
            value={composicao.precoUnitario ?? ''}
            onChange={(e) => update('precoUnitario', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-8 text-xs px-2 text-right"
            placeholder="P. Unit"
            type="number"
          />
        )}

        {/* P. Total */}
        {hasSubitens ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-right font-medium pr-2 cursor-help select-none">
                  {formatCurrency(composicao.precoTotal)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-52">
                Soma dos subitens. Edite as quantidades e preços nos subitens abaixo.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Input
            value={composicao.precoTotal || ''}
            onChange={(e) => update('precoTotal', parseFloat(e.target.value) || 0)}
            className="h-8 text-xs px-2 text-right"
            placeholder="P. Total"
            type="number"
          />
        )}

        {/* Excluir */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── Barra de ações ── */}
      <div className="flex items-center gap-4 px-2 pb-1.5 pt-0.5">
        <div className="flex items-center gap-1.5">
          <Switch
            id={`sub-toggle-${composicao.id}`}
            checked={hasSubitens}
            onCheckedChange={toggleSubitens}
            className="scale-75 origin-left"
          />
          <Label
            htmlFor={`sub-toggle-${composicao.id}`}
            className="text-[10px] text-muted-foreground cursor-pointer select-none"
          >
            Usar subitens
          </Label>
        </div>

        {hasSubitens && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
            />
            <Layers className="h-3 w-3" />
            {composicao.subitens.length} subitem{composicao.subitens.length !== 1 ? 'ns' : ''}
          </button>
        )}
      </div>

      {/* ── Painel de subitens ── */}
      {hasSubitens && expanded && (
        <div className="mx-2 mb-2 rounded border border-border/50 bg-muted/20 overflow-hidden">
          {/* Cabeçalho subitens */}
          <div className={`grid ${COMPOSICAO_GRID} gap-2 items-center px-3 py-1.5 bg-muted/40 border-b border-border/40 text-[10px] font-medium text-muted-foreground`}>
            <span>Código</span>
            <span>Insumo / Descrição</span>
            <span>Un</span>
            <span className="text-right">Qtd</span>
            <span className="text-right">P. Unit</span>
            <span className="text-right">P. Total</span>
            <span />
          </div>

          {/* Linhas de subitens */}
          <div className="divide-y divide-border/30">
            {composicao.subitens.map((si, idx) => (
              <SubitemRow
                key={si.id}
                subitem={si}
                unidades={unidades}
                onChange={(s) => updateSubitem(idx, s)}
                onRemove={() => removeSubitem(idx)}
                obraId={obraId}
              />
            ))}
          </div>

          {/* Adicionar subitem */}
          <div className="px-3 py-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={addSubitem}
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar subitem
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
