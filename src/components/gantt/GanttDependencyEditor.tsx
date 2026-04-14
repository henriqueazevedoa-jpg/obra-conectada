import { useState } from 'react';
import { GanttTask } from './types';
import { GanttDependency, DepType } from '@/hooks/useGanttDependencies';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Link2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  onAdd: (sourceId: string, targetId: string, tipo: DepType) => Promise<boolean | undefined>;
  onRemove: (depId: string) => void;
}

const tipoLabels: Record<DepType, string> = {
  FS: 'Término → Início',
  SS: 'Início → Início',
};

export default function GanttDependencyEditor({ tasks, dependencies, onAdd, onRemove }: Props) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [tipo, setTipo] = useState<DepType>('FS');

  // Only top-level tasks (etapas)
  const etapas = tasks.filter(t => !t.groupId);

  const handleAdd = async () => {
    if (!sourceId || !targetId) return;
    if (sourceId === targetId) {
      toast.error('Não é possível criar dependência de uma etapa com ela mesma');
      return;
    }
    const result = await onAdd(sourceId, targetId, tipo);
    if (result === false) {
      toast.error('Dependência circular detectada');
      return;
    }
    setSourceId('');
    setTargetId('');
    toast.success('Dependência adicionada');
  };

  const getTaskName = (id: string) => etapas.find(t => t.id === id)?.name || id;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5 text-primary" />
        Dependências entre Etapas
      </p>

      {/* Add form */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Predecessora</label>
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className="w-[160px] h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {etapas.map(t => (
                <SelectItem key={t.id} value={t.id} className="text-xs">{t.code} — {t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mb-1" />

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Sucessora</label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="w-[160px] h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {etapas.filter(t => t.id !== sourceId).map(t => (
                <SelectItem key={t.id} value={t.id} className="text-xs">{t.code} — {t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Tipo</label>
          <Select value={tipo} onValueChange={v => setTipo(v as DepType)}>
            <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FS" className="text-xs">FS (Término → Início)</SelectItem>
              <SelectItem value="SS" className="text-xs">SS (Início → Início)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAdd} disabled={!sourceId || !targetId}>
          <Link2 className="h-3 w-3" /> Vincular
        </Button>
      </div>

      {/* Existing deps */}
      {dependencies.length > 0 && (
        <div className="space-y-1">
          {dependencies.map(dep => (
            <div key={dep.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
              <span className="font-medium">{getTaskName(dep.source_cat_id)}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0">{tipoLabels[dep.tipo as DepType] || dep.tipo}</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{getTaskName(dep.target_cat_id)}</span>
              {dep.lag_days > 0 && (
                <span className="text-muted-foreground">+{dep.lag_days}d</span>
              )}
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => onRemove(dep.id)}>
                <X className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {dependencies.length === 0 && (
        <p className="text-[10px] text-muted-foreground italic">Nenhuma dependência cadastrada.</p>
      )}
    </div>
  );
}
