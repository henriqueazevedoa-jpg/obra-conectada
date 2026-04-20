import { useRef, useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet, Layers } from 'lucide-react';
import { importarPlanilhaCotacao, CotacaoImportada } from '@/lib/planilha/importCotacao';
import { useSuprimentos } from '@/contexts/SuprimentosContext';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  obraId: string | null;
  onSuccess: () => void;
}

export default function ImportarCotacaoDialog({
  open, onOpenChange, obraId, onSuccess,
}: Props) {
  const { lotes, importarRespostas } = useSuprimentos();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [rows, setRows] = useState<CotacaoImportada[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [fornecedorNome, setFornecedorNome] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Filtra lotes apenas da obra atual se houver
  const filteredLotes = useMemo(() => {
    if (!obraId || obraId === 'todos') return lotes;
    return lotes.filter(l => l.obra_id === obraId);
  }, [lotes, obraId]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setErro(null);
    
    // Tenta inferir o nome do fornecedor do nome do arquivo
    if (!fornecedorNome) {
      const fileName = file.name.split('.')[0].replace('cotacao_', '').split('_')[0];
      if (fileName && fileName !== 'cotacao') {
        setFornecedorNome(fileName.charAt(0).toUpperCase() + fileName.slice(1));
      }
    }

    const result = await importarPlanilhaCotacao(file);
    if (result.erro) {
      setErro(result.erro);
    } else {
      setRows(result.rows);
      setParsed(true);
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!selectedLoteId) { toast({ title: 'Selecione um lote de cotação', variant: 'destructive' }); return; }
    if (!fornecedorNome) { toast({ title: 'Identifique o fornecedor', variant: 'destructive' }); return; }
    
    const comPreco = rows.filter(r => r.preco !== null && r.preco > 0);
    if (comPreco.length === 0) { toast({ title: 'Nenhuma linha com preço encontrado', variant: 'destructive' }); return; }

    setLoading(true);
    try {
      await importarRespostas(
        selectedLoteId,
        fornecedorNome,
        comPreco.map(r => ({
          item_origem_id: r.id, // O ID_SISTEMA que gravamos na exportação
          preco_unitario: r.preco || 0,
          observacoes: r.observacoes
        }))
      );

      onSuccess();
      handleClose();
    } catch (err) {
      toast({ title: 'Erro ao importar', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setParsed(false);
    setErro(null);
    setSelectedLoteId('');
    setFornecedorNome('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            Importar Cotação Externa
          </DialogTitle>
          <DialogDescription>
            Importe os preços enviados pelo fornecedor para compará-los na Matriz de Decisão.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Lote de Cotação */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" /> Lote de Destino
            </Label>
            <Select value={selectedLoteId} onValueChange={setSelectedLoteId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione o lote..." />
              </SelectTrigger>
              <SelectContent>
                {filteredLotes.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome do Fornecedor */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Nome do Fornecedor</Label>
            <Input 
              placeholder="Ex: Madeireira Silva" 
              value={fornecedorNome}
              onChange={e => setFornecedorNome(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        {/* Upload Area */}
        <div
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${parsed ? 'border-emerald-500/30 bg-emerald-50/10' : 'border-border/60 hover:border-primary/50 hover:bg-muted/20'}`}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm">Lendo planilha...</p>
            </div>
          ) : parsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-emerald-700">Planilha Carregada!</p>
              <p className="text-xs text-muted-foreground">Clique para trocar de arquivo</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-muted-foreground opacity-50 mb-1" />
              <p className="text-sm font-medium">Clique ou arraste o arquivo .xlsx</p>
              <p className="text-xs text-muted-foreground">O arquivo deve conter a coluna ID_SISTEMA intacta.</p>
            </div>
          )}
        </div>

        {erro && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive flex gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Preview Panel */}
        {parsed && rows.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-200">
                  {rows.filter(r => r.preco! > 0).length} itens com preço
                </Badge>
                {rows.filter(r => !r.preco || r.preco === 0).length > 0 && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                    {rows.filter(r => !r.preco || r.preco === 0).length} ignorados
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden border-border/50 shadow-inner">
              <ScrollArea className="h-40 bg-muted/10">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-[10px] py-1">Descrição</TableHead>
                      <TableHead className="text-[10px] py-1 text-right">Preço Unitário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={`h-8 hover:bg-muted/50 transition-colors ${!r.preco || r.preco === 0 ? 'opacity-30 line-through' : ''}`}>
                        <TableCell className="text-[11px] font-medium truncate max-w-[300px] py-1">{r.descricao}</TableCell>
                        <TableCell className="text-[11px] text-right font-bold py-1">
                          {r.preco ? `R$ ${r.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || !selectedLoteId || !fornecedorNome || loading || rows.filter(r => r.preco! > 0).length === 0}
            className="gap-2 shadow-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar Importação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
