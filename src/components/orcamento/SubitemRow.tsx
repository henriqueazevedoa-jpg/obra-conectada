import { OrcamentoSubitem } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface Props {
  subitem: OrcamentoSubitem;
  unidades: string[];
  onChange: (updated: OrcamentoSubitem) => void;
  onRemove: () => void;
}

export default function SubitemRow({ subitem, unidades, onChange, onRemove }: Props) {
  const update = (field: string, value: any) => {
    const next = { ...subitem, [field]: value };
    if (field === 'quantidade' || field === 'precoUnitario') {
      if (next.quantidade && next.precoUnitario) next.precoTotal = next.quantidade * next.precoUnitario;
    }
    if (field === 'precoTotal' && next.quantidade && next.quantidade > 0) {
      next.precoUnitario = next.precoTotal / next.quantidade;
    }
    onChange(next);
  };

  return (
    <div className="grid grid-cols-[80px_1fr_80px_80px_100px_100px_36px] gap-1 items-center text-xs pl-8">
      <div className="text-xs font-mono text-muted-foreground px-1 truncate" title={subitem.codigo}>{subitem.codigo}</div>
      <Input value={subitem.descricao} onChange={e => update('descricao', e.target.value)} className="h-7 text-xs px-1" placeholder="Descrição" />
      <div className="relative">
        <Input value={subitem.unidade} onChange={e => update('unidade', e.target.value)} className="h-7 text-xs px-1" placeholder="Un" list={`un-sub-${subitem.id}`} />
        <datalist id={`un-sub-${subitem.id}`}>{unidades.map(u => <option key={u} value={u} />)}</datalist>
      </div>
      <Input type="number" value={subitem.quantidade ?? ''} onChange={e => update('quantidade', e.target.value ? parseFloat(e.target.value) : null)} className="h-7 text-xs px-1" placeholder="Qtd" />
      <Input type="number" value={subitem.precoUnitario ?? ''} onChange={e => update('precoUnitario', e.target.value ? parseFloat(e.target.value) : null)} className="h-7 text-xs px-1" placeholder="P. Unit" />
      <Input type="number" value={subitem.precoTotal || ''} onChange={e => update('precoTotal', parseFloat(e.target.value) || 0)} className="h-7 text-xs px-1" placeholder="P. Total" />
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
    </div>
  );
}
