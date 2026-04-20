import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Table2, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrcamentoEtapa } from '@/contexts/OrcamentoContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraNome: string;
  etapas: OrcamentoEtapa[];
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(v: number | null | undefined) {
  if (v == null) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

export default function ExportarOrcamentoDialog({ open, onOpenChange, obraNome, etapas }: Props) {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [scope, setScope] = useState<'all' | string>('all');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const etapasFiltradas = scope === 'all' ? etapas : etapas.filter(e => e.id === scope);
  const totalGeral = etapasFiltradas.reduce((s, e) => s + (e.precoTotal || 0), 0);
  const totalComposicoes = etapasFiltradas.reduce((s, e) => s + (e.composicoes?.length || 0), 0);

  const handleExportCSV = () => {
    const rows: string[][] = [];
    rows.push(['Etapa', 'Cód. Etapa', 'Composição', 'Cód. Comp.', 'Insumo', 'Cód. Ins.', 'Unidade', 'Qty', 'Preço Unit.', 'Preço Total', 'Fonte']);

    for (const etapa of etapasFiltradas) {
      for (const comp of etapa.composicoes || []) {
        if (comp.usaInsumos && comp.insumos?.length) {
          for (const ins of comp.insumos) {
            rows.push([
              etapa.nome || '',
              etapa.codigo || '',
              comp.descricao || '',
              comp.codigo || '',
              ins.descricao || '',
              ins.codigo || '',
              ins.unidade || '',
              formatNumber(ins.quantidade),
              formatNumber(ins.precoUnitario),
              formatNumber(ins.precoTotal),
              comp.fonteReferencia || '',
            ]);
          }
        } else {
          rows.push([
            etapa.nome || '',
            etapa.codigo || '',
            comp.descricao || '',
            comp.codigo || '',
            '',
            '',
            comp.unidade || '',
            formatNumber(comp.quantidade),
            formatNumber(comp.precoUnitario),
            formatNumber(comp.precoTotal),
            comp.fonteReferencia || '',
          ]);
        }
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const bom = '\uFEFF'; // BOM para Excel reconhecer UTF-8
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orcamento_${obraNome.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExportPDF = () => {
    // Cria uma janela de impressão com o conteúdo do orçamento
    const win = window.open('', '_blank');
    if (!win) return;

    const rows = etapasFiltradas.flatMap(etapa =>
      (etapa.composicoes || []).flatMap(comp => {
        if (comp.usaInsumos && comp.insumos?.length) {
          return comp.insumos.map(ins => [
            etapa.nome, comp.codigo, comp.descricao,
            ins.codigo, ins.descricao, ins.unidade,
            formatNumber(ins.quantidade), formatCurrency(ins.precoUnitario), formatCurrency(ins.precoTotal),
          ]);
        }
        return [[
          etapa.nome, comp.codigo, comp.descricao,
          '', '', comp.unidade,
          formatNumber(comp.quantidade), formatCurrency(comp.precoUnitario), formatCurrency(comp.precoTotal),
        ]];
      })
    );

    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Orçamento — ${obraNome}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #1e293b; }
        h1 { font-size: 15px; margin-bottom: 4px; }
        p.sub { color: #64748b; font-size: 10px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e40af; color: white; padding: 5px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        .total { font-weight: bold; text-align: right; margin-top: 12px; font-size: 12px; }
        @media print { body { margin: 10mm; } button { display: none; } }
      </style>
      </head><body>
      <h1>Orçamento — ${obraNome}</h1>
      <p class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR')} | ${etapasFiltradas.length} etapa(s) | ${totalComposicoes} composição(ões)</p>
      <table>
        <thead><tr>
          <th>Etapa</th><th>Cód. Comp.</th><th>Composição</th>
          <th>Cód. Ins.</th><th>Insumo</th><th>Un</th>
          <th>Qtd</th><th>P.Unit.</th><th>P.Total</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <p class="total">Total Geral: ${formatCurrency(totalGeral)}</p>
      <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'csv') handleExportCSV();
      else handleExportPDF();
      setDone(true);
      setTimeout(() => { setDone(false); onOpenChange(false); }, 1200);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-primary" />
            Exportar Orçamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Formato */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Formato</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'csv', label: 'Planilha CSV', desc: 'Abrir no Excel', icon: Table2 },
                { id: 'pdf', label: 'PDF / Imprimir', desc: 'Para impressão', icon: FileText },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id as 'csv' | 'pdf')}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                      format === opt.id
                        ? 'bg-primary/8 border-primary/60 text-primary dark:bg-indigo-950/30 dark:border-primary dark:text-primary/80'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Escopo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Escopo</label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Obra inteira ({etapas.length} etapas)</SelectItem>
                {etapas.map(e => (
                  <SelectItem key={e.id} value={e.id} className="text-xs">
                    {e.codigo} — {e.nome || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resumo */}
          <div className="rounded-lg bg-muted/30 border p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Etapas</span>
              <span className="font-medium">{etapasFiltradas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Composições</span>
              <span className="font-medium">{totalComposicoes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-primary dark:text-primary/80">{formatCurrency(totalGeral)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            className={cn('text-xs gap-1.5', done ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary hover:bg-primary')}
            onClick={handleExport}
            disabled={exporting || etapasFiltradas.length === 0}
          >
            {done ? <Check className="h-3.5 w-3.5" /> : exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {done ? 'Exportado!' : exporting ? 'Exportando...' : `Exportar ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
