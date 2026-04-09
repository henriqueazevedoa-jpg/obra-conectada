import { OrcamentoComposicao, OrcamentoSubitem } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import SubitemRow from './SubitemRow';
import { useState } from 'react';
import { formatCurrency } from '@/data/mockData';

interface Props {
  composicao: OrcamentoComposicao;
  unidades: string[];
  onChange: (updated: OrcamentoComposicao) => void;
  onRemove: () => void;
  generateSubitemCodigo: (compCode: string, existing: string[]) => string;
}

export default function ComposicaoRow({ composicao, unidades, onChange, onRemove, generateSubitemCodigo }: Props) {
  const [expanded, setExpanded] = useState(false);

  const update = (field: string, value: any) => {
    const next = { ...composicao, [field]: value };
    if (!next.usaSubitens) {
      if (field === 'quantidade' || field === 'precoUnitario') {
        if (next.quantidade && next.precoUnitario) next.precoTotal = next.quantidade * next.precoUnitario;
      }
      if (field === 'precoTotal' && next.quantidade && next.quantidade > 0) {
        next.precoUnitario = next.precoTotal / next.quantidade;
      }
    }
    onChange(next);
  };

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

  const toggleSubitens = (val: boolean) => {
    const next = { ...composicao, usaSubitens: val };
    if (val && next.subitens.length === 0) next.subitens = [makeSubitem()];
    recalcFromSubitens(next);
    onChange(next);
  };

  const recalcFromSubitens = (comp: OrcamentoComposicao) => {
    if (comp.usaSubitens) {
      comp.precoTotal = comp.subitens.reduce((s, si) => s + si.precoTotal, 0);
      comp.precoUnitario = comp.quantidade && comp.quantidade > 0 ? comp.precoTotal / comp.quantidade : null;
    }
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

  return (
    <div className="border border-border rounded-md bg-card">
      <div className="grid grid-cols-[80px_1fr_80px_80px_100px_100px_36px] gap-1 items-center text-xs p-2">
        <div className="text-xs font-mono text-muted-foreground px-1 truncate" title={composicao.codigo}>{composicao.codigo}</div>
        <Input value={composicao.descricao} onChange={e => update('descricao', e.target.value)} className="h-7 text-xs px-1" placeholder="Descrição" />
        <div className="relative">
          <Input value={composicao.unidade} onChange={e => update('unidade', e.target.value)} className="h-7 text-xs px-1" placeholder="Un" list={`un-comp-${composicao.id}`} />
          <datalist id={`un-comp-${composicao.id}`}>{unidades.map(u => <option key={u} value={u} />)}</datalist>
        </div>
        <Input type="number" value={composicao.quantidade ?? ''} onChange={e => update('quantidade', e.target.value ? parseFloat(e.target.value) : null)} className="h-7 text-xs px-1" placeholder="Qtd" />
        {hasSubitens ? (
          <>
            <div className="text-xs text-muted-foreground text-right pr-1">{composicao.precoUnitario != null ? formatCurrency(composicao.precoUnitario) : '-'}</div>
            <div className="text-xs font-medium text-right pr-1">{formatCurrency(composicao.precoTotal)}</div>
          </>
        ) : (
          <>
            <Input type="number" value={composicao.precoUnitario ?? ''} onChange={e => update('precoUnitario', e.target.value ? parseFloat(e.target.value) : null)} className="h-7 text-xs px-1" placeholder="P. Unit" />
            <Input type="number" value={composicao.precoTotal || ''} onChange={e => update('precoTotal', parseFloat(e.target.value) || 0)} className="h-7 text-xs px-1" placeholder="P. Total" />
          </>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>

      <div className="px-2 pb-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Switch id={`sub-${composicao.id}`} checked={hasSubitens} onCheckedChange={toggleSubitens} className="scale-75" />
          <Label htmlFor={`sub-${composicao.id}`} className="text-[10px] text-muted-foreground cursor-pointer">Subitens</Label>
        </div>
        {hasSubitens && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {composicao.subitens.length} subiten{composicao.subitens.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {hasSubitens && expanded && (
        <div className="px-2 pb-2 space-y-1">
          <div className="grid grid-cols-[80px_1fr_80px_80px_100px_100px_36px] gap-1 text-[10px] text-muted-foreground font-medium pl-8">
            <span>Código</span><span>Descrição</span><span>Un</span><span>Qtd</span><span>P. Unit</span><span>P. Total</span><span />
          </div>
          {composicao.subitens.map((si, idx) => (
            <SubitemRow key={si.id} subitem={si} unidades={unidades} onChange={s => updateSubitem(idx, s)} onRemove={() => removeSubitem(idx)} />
          ))}
          <Button variant="ghost" size="sm" className="text-xs h-6 ml-8" onClick={addSubitem}>
            <Plus className="h-3 w-3 mr-1" /> Subitem
          </Button>
        </div>
      )}
    </div>
  );
}
