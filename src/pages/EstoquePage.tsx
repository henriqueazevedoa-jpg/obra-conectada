import { useState, useCallback, useEffect, useMemo } from 'react';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useAuth } from '@/contexts/AuthContext';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI } from '@/components/layout/PageShell';
import { 
  Package, 
  AlertTriangle, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Search, 
  Plus, 
  Filter,
  History,
  TrendingDown,
  TrendingUp,
  Box,
  Truck
} from 'lucide-react';
import NoObraState from '@/components/obras/NoObraState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EstoqueIcon = (
  <Package className="h-4 w-4" />
);

export default function EstoquePage() {
  const { obras } = useObras();
  const { selectedObraId: obraId } = useObraSelection();
  const obra = obras.find(o => o.id === obraId);
  const { getMateriaisByObra, registrarMovimentacao, materiais: allMateriais } = useEstoque();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('_all');
  const [isMovimentacaoOpen, setIsMovimentacaoOpen] = useState(false);
  const [movimentandoMaterial, setMovimentandoMaterial] = useState<any>(null);
  const [movimentacao, setMovimentacao] = useState({
    tipo: 'entrada' as 'entrada' | 'saida' | 'ajuste',
    quantidade: 1,
    observacao: ''
  });

  const materiais = useMemo(() => obra ? getMateriaisByObra(obra.id) : [], [obra, getMateriaisByObra]);

  const filteredMateriais = useMemo(() => {
    return materiais.filter(m => {
      const matchSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategoria === '_all' || m.categoria === filterCategoria;
      return matchSearch && matchCat;
    });
  }, [materiais, searchTerm, filterCategoria]);

  const categorias = useMemo(() => {
    const cats = new Set(materiais.map(m => m.categoria));
    return Array.from(cats);
  }, [materiais]);

  const kpis: PageKPI[] = useMemo(() => {
    const criticos = materiais.filter(m => (m.estoqueAtual || 0) <= (m.estoqueMinimo || 0)).length;
    return [
      { 
        id: 'total', 
        label: 'Itens Catalogados', 
        value: String(materiais.length), 
        icon: <Box className="h-4 w-4" />,
        tint: '#F3F2FD', valueColor: '#3C3489' 
      },
      { 
        id: 'criticos', 
        label: 'Materiais Críticos', 
        value: String(criticos), 
        icon: <AlertTriangle className="h-4 w-4" />,
        tint: criticos > 0 ? '#FCEBEB' : '#EAF3DE', 
        valueColor: criticos > 0 ? '#A32D2D' : '#3B6D11' 
      },
      { 
        id: 'movs', 
        label: 'Movimentações (Mês)', 
        value: '24', 
        icon: <History className="h-4 w-4" />,
        tint: '#F0F9FF', valueColor: '#0369A1' 
      },
    ];
  }, [materiais]);

  if (!obra) {
    return (
      <PageShell title="Estoque & Almoxarifado" icon={EstoqueIcon}>
        <NoObraState title="Nenhuma obra selecionada" description="Selecione uma obra para gerenciar o almoxarifado." />
      </PageShell>
    );
  }

  const handleMovimentar = async () => {
    if (!movimentandoMaterial) return;
    
    try {
      await registrarMovimentacao({
        obraId: movimentandoMaterial.obraId,
        materialId: movimentandoMaterial.id,
        materialNome: movimentandoMaterial.nome,
        tipo: movimentacao.tipo as 'entrada' | 'saida',
        data: new Date().toISOString().slice(0, 10),
        quantidade: movimentacao.quantidade,
        origemDestino: '',
        responsavel: '',
        observacoes: movimentacao.observacao,
      });
      
      toast({
        title: "Movimentação registrada",
        description: `${movimentacao.tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${movimentacao.quantidade} ${movimentandoMaterial.unidade} realizada.`
      });
      
      setIsMovimentacaoOpen(false);
      setMovimentacao({ tipo: 'entrada', quantidade: 1, observacao: '' });
    } catch (error) {
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível processar a movimentação.",
        variant: "destructive"
      });
    }
  };

  return (
    <PageShell
      title="Estoque & Almoxarifado"
      subtitle={`Gestão física de materiais e insumos da unidade ${obra.nome}`}
      icon={EstoqueIcon}
      kpis={kpis}
    >
      <div className="h-full flex flex-col gap-6 p-6 overflow-hidden">
        
        {/* Toolbar superior */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar material pelo nome..." 
                className="pl-9 h-10 rounded-xl"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="h-10 w-[160px] rounded-xl">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas Categorias</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
             <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 font-semibold">
                <Truck className="h-4 w-4" />
                Novas Entradas
             </Button>
             <Button size="sm" className="h-10 rounded-xl bg-primary hover:bg-primary/90 gap-2 font-semibold shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Novo Material
             </Button>
          </div>
        </div>

        {/* Grade de Materiais */}
        <div className="flex-1 overflow-y-auto">
          {filteredMateriais.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-3xl bg-muted/5">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground font-medium">Nenhum material encontrado com esses filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
              {filteredMateriais.map(item => {
                const isCritico = (item.estoqueAtual || 0) <= (item.estoqueMinimo || 0);
                return (
                  <Card key={item.id} className={cn(
                    "rounded-2xl border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-default group",
                    isCritico && "bg-orange-50/20 border-orange-200/50"
                  )}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 mb-0.5">{item.categoria}</p>
                          <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{item.nome}</h4>
                        </div>
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex flex-col items-center justify-center shrink-0 border border-border",
                          isCritico ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-muted/30 text-muted-foreground"
                        )}>
                          <span className="text-sm font-bold leading-none">{item.quantidadeAtual || 0}</span>
                          <span className="text-[9px] uppercase font-medium">{item.unidade}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] text-muted-foreground">Status do Estoque</span>
                          <span className={cn("text-[10px] font-bold", isCritico ? "text-orange-600" : "text-green-600")}>
                            {isCritico ? "ESTOQUE CRÍTICO" : "DENTRO DO NORMAL"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                           <div className={cn(
                             "h-full rounded-full transition-all duration-500",
                             isCritico ? "bg-orange-500" : "bg-green-500"
                           )} style={{ width: `${Math.min(((item.estoqueAtual || 0) / (item.estoqueMinimo * 2 || 100)) * 100, 100)}%` }} />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="secondary" 
                          className="flex-1 h-9 rounded-lg text-xs gap-1.5 font-bold bg-muted/50 hover:bg-muted"
                          onClick={() => {
                            setMovimentandoMaterial(item);
                            setMovimentacao({...movimentacao, tipo: 'entrada'});
                            setIsMovimentacaoOpen(true);
                          }}
                        >
                          <ArrowDownCircle className="h-3.5 w-3.5 text-blue-600" />
                          Entrada
                        </Button>
                        <Button 
                          variant="secondary" 
                          className="flex-1 h-9 rounded-lg text-xs gap-1.5 font-bold bg-muted/50 hover:bg-muted"
                          onClick={() => {
                            setMovimentandoMaterial(item);
                            setMovimentacao({...movimentacao, tipo: 'saida'});
                            setIsMovimentacaoOpen(true);
                          }}
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5 text-orange-600" />
                          Saída
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Movimentação */}
        <Dialog open={isMovimentacaoOpen} onOpenChange={setIsMovimentacaoOpen}>
           <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                   {movimentacao.tipo === 'entrada' ? <TrendingUp className="text-blue-500" /> : <TrendingDown className="text-orange-500" />}
                   Registrar Movimentação
                </DialogTitle>
                <DialogDescription>
                  {movimentandoMaterial?.nome} ({movimentandoMaterial?.unidade})
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Trânsito</Label>
                      <Select value={movimentacao.tipo} onValueChange={(val: any) => setMovimentacao({...movimentacao, tipo: val})}>
                         <SelectTrigger className="rounded-xl">
                            <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="entrada">Entrada (Compra/Reforço)</SelectItem>
                            <SelectItem value="saida">Saída (Consumo Obra)</SelectItem>
                            <SelectItem value="ajuste">Ajuste de Saldo</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade</Label>
                      <Input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        className="rounded-xl"
                        value={movimentacao.quantidade}
                        onChange={e => setMovimentacao({...movimentacao, quantidade: parseFloat(e.target.value)})}
                      />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label>Observação / Justificativa</Label>
                    <Input 
                      placeholder="Ex: Nota Fiscal #1234 ou Etapa Cimentação" 
                      className="rounded-xl"
                      value={movimentacao.observacao}
                      onChange={e => setMovimentacao({...movimentacao, observacao: e.target.value})}
                    />
                 </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                 <Button variant="ghost" onClick={() => setIsMovimentacaoOpen(false)} className="rounded-xl">
                   Cancelar
                 </Button>
                 <Button onClick={handleMovimentar} className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                   Confirmar Registro
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

      </div>
    </PageShell>
  );
}