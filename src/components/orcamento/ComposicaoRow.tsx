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
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import SubitemRow from './SubitemRow';
import { formatCurrency } from '@/data/mockData';

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

export default function ComposicaoRow({ composicao, unidades, onChange, onRemove, generateSubitemCodigo, obraId }: Props) {
  const [expanded, setExpanded] = useState(false);

  const makeSubitem = (): OrcamentoSubitem => {
    const existingCodes = composicao.subitens.map(s => s.codigo);
    return {
      id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      const quantidadeAtual = Number(si.quantidade) || 0;
      const precoUnitario = si.precoUnitario != null ? Number(si.precoUnitario) : null;
      const quantidadeNova = quantidadeAtual * fator;
      const precoTotalNovo = precoUnitario != null
        ? quantidadeNova * precoUnitario
        : Number(si.precoTotal) || 0;

      return {
        ...si,
        quantidade: quantidadeNova,
        precoTotal: precoTotalNovo,
      };
    });
  };

  const update = (field: string, value: string | number | null | boolean) => {
    const next = { ...composicao };
    const previousQuantidade = Number(composicao.quantidade) || 0;

    (next as unknown as Record<string, unknown>)[field] = value;

    if (!next.usaSubitens) {
      if (field === 'quantidade' || field === 'precoUnitario') {
        if (next.quantidade && next.precoUnitario) {
          next.precoTotal = next.quantidade * next.precoUnitario;
        }
      }

      if (field === 'precoTotal' && next.quantidade && next.quantidade > 0) {
        next.precoUnitario = next.precoTotal / next.quantidade;
      }
    } else {
      if (field === 'quantidade') {
        const nextQuantidade = Number(value) || 0;
        if (previousQuantidade > 0 && nextQuantidade > 0) {
          next.subitens = scaleSubitensForQuantidade(
            composicao.subitens,
            previousQuantidade,
            nextQuantidade
          );
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
    <>
      <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)_70px_90px_110px_110px_72px] gap-2 items-center py-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs truncate">{composicao.codigo}</span>
          {isSinapi && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 h-4 border-blue-400 text-blue-600 bg-blue-50 shrink-0 cursor-help"
                  >
                    SINAPI
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-48">
                  <p className="font-medium">Importado da SINAPI</p>
                  {composicao.ufReferencia && (
                    <p className="text-muted-foreground">UF: {composicao.ufReferencia}</p>
                  )}
                  {composicao.regimeReferencia && (
                    <p className="text-muted-foreground">Regime: {composicao.regimeReferencia}</p>
                  )}
                  {composicao.referenciaCompetencia && (
                    <p className="text-muted-foreground">Competência: {composicao.referenciaCompetencia}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <Input value={composicao.descricao} onChange={(e) => update('descricao', e.target.value)} className="h-7 text-xs px-1" placeholder="Descrição" />

        <div>
          <Input value={composicao.unidade} onChange={(e) => update('unidade', e.target.value)} className="h-7 text-xs px-1" placeholder="Un" list={`un-comp-${composicao.id}`} />
          <datalist id={`un-comp-${composicao.id}`}>{unidades.map((u) => <option key={u} value={u} />)}</datalist>
        </div>

        <Input value={composicao.quantidade ?? ''} onChange={(e) => update('quantidade', e.target.value ? parseFloat(e.target.value) : null)} className="h-7 text-xs px-1" placeholder="Qtd" />

        {hasSubitens ? (
          <>
            <div className="text-xs text-right">{composicao.precoUnitario != null ? formatCurrency(composicao.precoUnitario) : '-'}</div>
            <div className="text-xs text-right">{formatCurrency(composicao.precoTotal)}</div>
          </>
        ) : (
          <>
            <Input value={composicao.precoUnitario ?? ''} onChange={(e) => update('precoUnitario', e.target.value ? parseFloat(e.target.value) : null)} className="h-7 text-xs px-1" placeholder="P. Unit" />
            <Input value={composicao.precoTotal || ''} onChange={(e) => update('precoTotal', parseFloat(e.target.value) || 0)} className="h-7 text-xs px-1" placeholder="P. Total" />
          </>
        )}

        <div className="flex justify-end gap-1">
          <div className="flex items-center gap-1 text-[10px]">
            <Switch checked={hasSubitens} onCheckedChange={toggleSubitens} className="scale-75" />
            <Label className="text-[10px]">Subitens</Label>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {hasSubitens && (
        <div className="pb-2">
          <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {composicao.subitens.length} subiten{composicao.subitens.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {hasSubitens && expanded && (
        <div className="ml-8 border-l pl-4 pb-3">
          <div className="grid grid-cols-[100px_minmax(0,1fr)_70px_90px_110px_110px_40px] gap-2 items-center text-[10px] text-muted-foreground py-1">
            <div>Código</div><div>Descrição</div><div>Un</div><div>Qtd</div><div>P. Unit</div><div>P. Total</div><div />
          </div>
          {composicao.subitens.map((si, idx) => (
            <SubitemRow key={si.id} subitem={si} unidades={unidades} onChange={(s) => updateSubitem(idx, s)} onRemove={() => removeSubitem(idx)} obraId={obraId} />
          ))}
          <Button variant="outline" size="sm" onClick={addSubitem} className="mt-2 h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" />Subitem</Button>
        </div>
      )}
    </>
  );
}
