import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, ChevronsDownUp, ChevronsUpDown, Eye, Pencil, Lock } from 'lucide-react';
import { ZoomLevel, ZOOM_LABELS } from './types';
import { cn } from '@/lib/utils';

interface Props {
  zoom: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
  showBaseline: boolean;
  onToggleBaseline: (v: boolean) => void;
  baselineEditMode: boolean;
  onToggleBaselineEdit: (v: boolean) => void;
  canEdit: boolean;
  canEditBaseline: boolean;
  canViewBaseline: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const zoomLevels: ZoomLevel[] = ['day', 'week', 'month', 'fit'];

function GanttToolbar({
  zoom, onZoomChange,
  showBaseline, onToggleBaseline,
  baselineEditMode, onToggleBaselineEdit,
  canEdit, canEditBaseline, canViewBaseline,
  onExpandAll, onCollapseAll,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/20 text-xs">
      {/* Zoom */}
      <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
        {zoomLevels.map(z => (
          <Button
            key={z}
            variant={zoom === z ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => onZoomChange(z)}
          >
            {ZOOM_LABELS[z]}
          </Button>
        ))}
      </div>

      <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

      {/* Baseline toggle */}
      {canViewBaseline && (
        <div className="flex items-center gap-1.5">
          <Switch
            id="show-baseline"
            checked={showBaseline}
            onCheckedChange={onToggleBaseline}
            className="scale-75"
          />
          <Label htmlFor="show-baseline" className="text-[10px] cursor-pointer">Baseline</Label>
        </div>
      )}

      {/* Baseline edit toggle */}
      {canEditBaseline && showBaseline && (
        <div className="flex items-center gap-1.5">
          <Switch
            id="edit-baseline"
            checked={baselineEditMode}
            onCheckedChange={onToggleBaselineEdit}
            className="scale-75"
          />
          <Label htmlFor="edit-baseline" className="text-[10px] cursor-pointer">
            <Pencil className="h-3 w-3 inline mr-0.5" />Editar baseline
          </Label>
        </div>
      )}

      <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

      {/* Expand/Collapse */}
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={onExpandAll}>
        <ChevronsUpDown className="h-3 w-3" /> Abrir
      </Button>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={onCollapseAll}>
        <ChevronsDownUp className="h-3 w-3" /> Fechar
      </Button>

      {/* Mode indicator */}
      <div className="ml-auto">
        {baselineEditMode ? (
          <Badge variant="outline" className="text-[9px] gap-1 border-amber-500/50 text-amber-600">
            <Pencil className="h-2.5 w-2.5" /> Editando baseline
          </Badge>
        ) : canEdit ? (
          <Badge variant="outline" className="text-[9px] gap-1 border-primary/50 text-primary">
            <Pencil className="h-2.5 w-2.5" /> Editando cronograma
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] gap-1">
            <Lock className="h-2.5 w-2.5" /> Somente leitura
          </Badge>
        )}
      </div>
    </div>
  );
}

export default memo(GanttToolbar);
