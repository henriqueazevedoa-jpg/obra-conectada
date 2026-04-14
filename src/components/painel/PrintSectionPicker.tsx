import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Printer, Settings2 } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';

export interface PrintSections {
  identificacao: boolean;
  kpis: boolean;
  resumoExecutivo: boolean;
  pontosAtencao: boolean;
  curvaS: boolean;
  cronograma: boolean;
  custosEtapa: boolean;
  curvaABC: boolean;
  cronogramaPagamentos: boolean;
  estoqueCritico: boolean;
  diario: boolean;
  pagamentos: boolean;
  pendencias: boolean;
  fornecedores: boolean;
}

export const defaultPrintSections: PrintSections = {
  identificacao: true,
  kpis: true,
  resumoExecutivo: true,
  pontosAtencao: true,
  curvaS: true,
  cronograma: true,
  custosEtapa: true,
  curvaABC: true,
  cronogramaPagamentos: true,
  estoqueCritico: true,
  diario: true,
  pagamentos: true,
  pendencias: true,
  fornecedores: true,
};

const sectionLabels: Record<keyof PrintSections, string> = {
  identificacao: 'Identificação da Obra',
  kpis: 'Indicadores (KPIs)',
  resumoExecutivo: 'Resumo Executivo',
  pontosAtencao: 'Pontos de Atenção',
  curvaS: 'Curva S',
  cronograma: 'Resumo do Cronograma',
  custosEtapa: 'Custos por Etapa',
  curvaABC: 'Curva ABC',
  cronogramaPagamentos: 'Cronograma de Pagamentos',
  estoqueCritico: 'Estoque Crítico',
  diario: 'Últimos Registros do Diário',
  pagamentos: 'Pagamentos',
  pendencias: 'Pendências',
  fornecedores: 'Fornecedores',
};

interface Props {
  sections: PrintSections;
  onChange: (sections: PrintSections) => void;
  onPrint: () => void;
}

export default function PrintSectionPicker({ sections, onChange, onPrint }: Props) {
  const toggle = (key: keyof PrintSections) => {
    onChange({ ...sections, [key]: !sections[key] });
  };

  const allSelected = Object.values(sections).every(Boolean);
  const toggleAll = () => {
    const newVal = !allSelected;
    const updated = { ...sections };
    (Object.keys(updated) as (keyof PrintSections)[]).forEach(k => { updated[k] = newVal; });
    onChange(updated);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-9">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Configurar Painel</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Seções Visíveis</p>
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={toggleAll}>
                {allSelected ? 'Desmarcar' : 'Marcar'} todos
              </Button>
            </div>
            <div className="space-y-2">
              {(Object.keys(sectionLabels) as (keyof PrintSections)[]).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`print-${key}`}
                    checked={sections[key]}
                    onCheckedChange={() => toggle(key)}
                  />
                  <Label htmlFor={`print-${key}`} className="text-xs cursor-pointer">
                    {sectionLabels[key]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button onClick={onPrint} size="sm" className="gap-1.5 h-9">
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Imprimir Panorama Geral</span>
        <span className="sm:hidden">Imprimir</span>
      </Button>
    </div>
  );
}
