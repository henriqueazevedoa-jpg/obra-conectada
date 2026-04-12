import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, Settings2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DiarioReportSections {
  cabecalho: boolean;
  clima: boolean;
  servicos: boolean;
  materiais: boolean;
  observacoes: boolean;
  problemas: boolean;
  fotos: boolean;
}

export const defaultDiarioReportSections: DiarioReportSections = {
  cabecalho: true,
  clima: true,
  servicos: true,
  materiais: true,
  observacoes: true,
  problemas: true,
  fotos: true,
};

export const fotoOnlyReportSections: DiarioReportSections = {
  cabecalho: true,
  clima: false,
  servicos: false,
  materiais: false,
  observacoes: false,
  problemas: false,
  fotos: true,
};

const sectionLabels: Record<keyof DiarioReportSections, string> = {
  cabecalho: 'Cabeçalho (Obra / Data)',
  clima: 'Clima / Trabalhadores',
  servicos: 'Serviços Executados',
  materiais: 'Materiais Utilizados',
  observacoes: 'Observações',
  problemas: 'Problemas Ocorridos',
  fotos: 'Fotos com Legenda',
};

interface Props {
  sections: DiarioReportSections;
  onChange: (sections: DiarioReportSections) => void;
  onGenerate: () => void;
  disabled?: boolean;
}

export default function DiarioReportPicker({ sections, onChange, onGenerate, disabled }: Props) {
  const toggle = (key: keyof DiarioReportSections) => {
    onChange({ ...sections, [key]: !sections[key] });
  };

  const allSelected = Object.values(sections).every(Boolean);
  const toggleAll = () => {
    const newVal = !allSelected;
    const updated = { ...sections };
    (Object.keys(updated) as (keyof DiarioReportSections)[]).forEach(k => { updated[k] = newVal; });
    onChange(updated);
  };

  const applyFotoOnly = () => {
    onChange({ ...fotoOnlyReportSections });
  };

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" disabled={disabled}>
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Configurar PDF</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Seções do Relatório</p>
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={toggleAll}>
                {allSelected ? 'Desmarcar' : 'Marcar'} todos
              </Button>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={applyFotoOnly}>
              📷 Apenas Relatório Fotográfico
            </Button>
            <div className="space-y-2">
              {(Object.keys(sectionLabels) as (keyof DiarioReportSections)[]).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`diario-print-${key}`}
                    checked={sections[key]}
                    onCheckedChange={() => toggle(key)}
                  />
                  <Label htmlFor={`diario-print-${key}`} className="text-xs cursor-pointer">
                    {sectionLabels[key]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button onClick={onGenerate} size="sm" className="gap-1.5 h-8 text-xs" disabled={disabled}>
        <FileText className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Gerar Relatório</span>
        <span className="sm:hidden">PDF</span>
      </Button>
    </div>
  );
}
