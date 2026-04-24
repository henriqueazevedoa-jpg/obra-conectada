import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileDown, Bot, Loader2, FileSpreadsheet, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ImportarExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'paste' | 'upload';
  onSuccess: () => void;
}

const COLUMNS_MAP = [
  { id: 'ignorar', label: 'Ignorar coluna' },
  { id: 'codigo', label: 'Código' },
  { id: 'nome', label: 'Nome da Composição' },
  { id: 'unidade', label: 'Unidade' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'preco_medio', label: 'Preço Médio' },
];

export default function ImportarExcelModal({ open, onOpenChange, mode, onSuccess }: ImportarExcelModalProps) {
  const { company } = useCompany();
  const [step, setStep] = useState<1 | 2>(1); // 1: Input, 2: Preview/Map
  
  // Input State
  const [pasteText, setPasteText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI State
  const [interpreting, setInterpreting] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false); // Should check if ai_addon_active

  // Data State
  const [rawData, setRawData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  // AI Result State
  const [aiResult, setAiResult] = useState<any[]>([]);
  const [isAiMode, setIsAiMode] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setPasteText('');
      setSelectedFile(null);
      setRawData([]);
      setColumnMapping([]);
      setAiResult([]);
      setIsAiMode(false);
      
      // Check if AI Addon is active
      // Assuming there is an ai_addon_active flag in company profiles, 
      // but for now we enable the button and handle errors gracefully.
      setIsAiEnabled(true);
    }
  }, [open]);

  // ─── Parsers ─────────────────────────────────────────────────────────────

  const handleProcessData = async () => {
    if (mode === 'paste') {
      if (!pasteText.trim()) {
        toast({ title: 'Cole algum conteúdo', variant: 'destructive' });
        return;
      }
      parseTextData(pasteText);
    } else {
      if (!selectedFile) {
        toast({ title: 'Selecione um arquivo', variant: 'destructive' });
        return;
      }
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const stringData = data.map(row => row.map(cell => String(cell || '')));
      processParsedData(stringData);
    }
  };

  const parseTextData = (text: string) => {
    // Basic TSV / CSV parser
    const separator = text.includes('\t') ? '\t' : (text.includes(';') ? ';' : ',');
    const lines = text.split('\n').filter(l => l.trim());
    const data = lines.map(line => line.split(separator).map(c => c.trim()));
    processParsedData(data);
  };

  const processParsedData = (data: string[][]) => {
    if (data.length === 0) return;
    setRawData(data);
    
    // Auto-map first row
    const firstRow = data[0];
    const newMapping = firstRow.map(header => {
      const h = header.toLowerCase();
      if (h.includes('cód') || h.includes('cod')) return 'codigo';
      if (h.includes('nome') || h.includes('descri')) return 'nome';
      if (h.includes('unid')) return 'unidade';
      if (h.includes('categ') || h.includes('tipo')) return 'categoria';
      if (h.includes('preço') || h.includes('preco') || h.includes('valor')) return 'preco_medio';
      return 'ignorar';
    });
    setColumnMapping(newMapping);
    setStep(2);
  };

  // ─── IA Add-on ────────────────────────────────────────────────────────────

  const handleInterpretAI = async () => {
    let contentToInterpret = '';
    
    if (mode === 'paste') {
      if (!pasteText.trim()) {
        toast({ title: 'Cole algum conteúdo primeiro', variant: 'destructive' });
        return;
      }
      contentToInterpret = pasteText;
    } else {
      if (!selectedFile) {
        toast({ title: 'Selecione um arquivo primeiro', variant: 'destructive' });
        return;
      }
      // For files, we convert to CSV text to send to AI
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      contentToInterpret = XLSX.utils.sheet_to_csv(ws);
    }

    setInterpreting(true);
    setIsAiMode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(
        `${supabase.supabaseUrl}/functions/v1/interpretar-composicoes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ conteudo: contentToInterpret, company_id: company?.id })
        }
      );

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      if (data.composicoes) {
        setAiResult(data.composicoes);
        setStep(2);
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (e: any) {
      toast({ title: 'Erro na interpretação', description: e.message, variant: 'destructive' });
      setIsAiMode(false);
    } finally {
      setInterpreting(false);
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!company?.id) return;
    setSaving(true);
    
    try {
      const payload: any[] = [];
      
      if (isAiMode) {
        // AI already mapped correctly
        for (const item of aiResult) {
          payload.push({
            company_id: company.id,
            nome: item.nome,
            codigo: item.codigo || null,
            unidade: item.unidade || 'un',
            categoria: item.categoria || null,
            preco_medio: typeof item.preco_medio === 'number' ? item.preco_medio : null,
            insumos: Array.isArray(item.insumos) ? item.insumos : [],
            is_modelo: false,
            origem: 'manual' // or 'ai_import'
          });
        }
      } else {
        // Manual mapping
        // Skip first row if it looks like a header (we don't have a strict check, let's just check if first mapped col is not a number for price or just assume row 0 is header)
        const isHeader = rawData[0].some(cell => typeof cell === 'string' && isNaN(Number(cell.replace(',','.'))));
        const dataToProcess = isHeader ? rawData.slice(1) : rawData;
        
        for (const row of dataToProcess) {
          const item: any = { company_id: company.id, is_modelo: false, origem: 'manual', insumos: [] };
          let hasName = false;
          
          for (let i = 0; i < columnMapping.length; i++) {
            const col = columnMapping[i];
            const val = row[i];
            if (!val || col === 'ignorar') continue;
            
            if (col === 'nome') { item.nome = val; hasName = true; }
            if (col === 'codigo') item.codigo = val;
            if (col === 'unidade') item.unidade = val;
            if (col === 'categoria') item.categoria = val;
            if (col === 'preco_medio') {
              const cleanVal = val.replace('R$', '').replace(/\s/g, '').replace(',', '.');
              item.preco_medio = parseFloat(cleanVal) || null;
            }
          }
          if (hasName) payload.push(item);
        }
      }

      if (payload.length === 0) {
        toast({ title: 'Nenhuma composição válida encontrada', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('catalogo_composicoes').insert(payload);
      if (error) throw error;
      
      toast({ title: `${payload.length} composições importadas com sucesso!` });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['Código', 'Nome', 'Unidade', 'Categoria', 'Preço Médio']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Composicoes.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{mode === 'paste' ? 'Colar do Excel' : 'Upload de Arquivo'}</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Insira seus dados para importação em lote.' : 'Revise as colunas antes de importar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 1 ? (
            <div className="space-y-4">
              {mode === 'paste' ? (
                <Textarea 
                  className="min-h-[300px] font-mono text-xs whitespace-pre"
                  placeholder="Cole aqui os dados copiados do Excel (Ctrl+C / Ctrl+V)..."
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                />
              ) : (
                <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-2">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Clique ou arraste um arquivo Excel</h3>
                    <p className="text-sm text-muted-foreground mt-1">Formatos suportados: .xlsx, .csv</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".xlsx,.csv" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={e => e.target.files && setSelectedFile(e.target.files[0])}
                  />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => fileInputRef.current?.click()}>
                      Procurar arquivo
                    </Button>
                    <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                      <FileDown className="h-4 w-4" /> Baixar Template
                    </Button>
                  </div>
                  {selectedFile && (
                    <div className="bg-muted px-4 py-2 rounded-md mt-4 text-sm font-medium">
                      {selectedFile.name} selecionado.
                    </div>
                  )}
                </div>
              )}

              {isAiEnabled && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-lg p-4 flex items-start gap-4 mt-4">
                  <div className="bg-violet-100 p-2 rounded-lg text-violet-600">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-violet-900">Interpretação Inteligente com IA</h4>
                    <p className="text-xs text-violet-700 mt-0.5">
                      Deixe a IA analisar e extrair as composições e seus insumos automaticamente a partir do seu texto. Custo: ~0.05 créditos.
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                    onClick={handleInterpretAI}
                    disabled={interpreting || (mode === 'paste' ? !pasteText : !selectedFile)}
                  >
                    {interpreting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
                    Interpretar com IA
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Preview Step
            <div className="space-y-4">
              {isAiMode ? (
                // AI Result Preview
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b border-border font-medium text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Cód.</th>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Unid.</th>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2">Preço</th>
                        <th className="px-3 py-2 text-center">Insumos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {aiResult.map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{item.codigo || '-'}</td>
                          <td className="px-3 py-2 font-medium">{item.nome}</td>
                          <td className="px-3 py-2">{item.unidade || 'un'}</td>
                          <td className="px-3 py-2">{item.categoria || '-'}</td>
                          <td className="px-3 py-2">
                            {item.preco_medio ? `R$ ${item.preco_medio.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {item.insumos?.length > 0 ? (
                              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                {item.insumos.length}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Manual Mapping Preview
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        {columnMapping.map((mapVal, i) => (
                          <th key={i} className="p-2 font-normal">
                            <Select 
                              value={mapVal} 
                              onValueChange={v => {
                                const next = [...columnMapping];
                                next[i] = v;
                                setColumnMapping(next);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLUMNS_MAP.map(c => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rawData.slice(0, 10).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 truncate max-w-[200px]" title={cell}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rawData.length > 10 && (
                    <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20 border-t border-border">
                      + {rawData.length - 10} linhas ocultas para preview
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border pt-4 mt-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleProcessData} disabled={interpreting || (mode === 'paste' ? !pasteText : !selectedFile)}>
                Continuar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={saving}>Voltar</Button>
              <Button onClick={handleConfirm} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Importação
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
