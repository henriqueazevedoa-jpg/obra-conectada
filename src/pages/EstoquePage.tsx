import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/data/mockData';
import {
  Package,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Plus,
  Check,
  X,
} from 'lucide-react';
import VoiceInputButton from '@/components/voice/VoiceInputButton';

const categoriasEstoque = [
  'Cimento',
  'Agregados',
  'Aço',
  'Alvenaria',
  'Hidráulica',
  'Elétrica',
  'Pintura',
  'Madeira',
  'Impermeabilização',
  'Ferragens',
  'EPI',
  'Outros',
];

export default function EstoquePage() {
  const { user, hasPermission } = useAuth();
  const { obras } = useObras();
  const {
    getMateriaisByObra,
    getMovimentacoesByObra,
    registrarMovimentacao,
    addMaterial,
    updateMaterial,
  } = useEstoque();
  const { selectedObraId: obraId, setSelectedObraId: setObraId } = useObraSelection();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<'entrada' | 'saida'>('entrada');
  const [newMov, setNewMov] = useState({
    materialId: '',
    quantidade: '',
    origemDestino: '',
    observacoes: '',
  });

  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [newMat, setNewMat] = useState({
    nome: '',
    unidade: '',
    categoria: '',
    estoqueMinimo: '',
  });

  const [editingMinId, setEditingMinId] = useState<string | null>(null);
  const [editingMinValue, setEditingMinValue] = useState('');

  const obra = obras.find((o) => o.id === obraId) || obras[0];

  if (!obra) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estoque</h1>
        <p className="text-muted-foreground">
          Controle de materiais e movimentações da obra
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Nenhuma obra cadastrada.</p>
        </CardContent>
      </Card>
    </div>
  );
}

  const materiais = getMateriaisByObra(obra.id);
  const movimentacoes = getMovimentacoesByObra(obra.id);

  const materiaisBaixo = materiais.filter(
    (m: any) => m.estoqueAtual < m.estoqueMinimo
  );
  const filtered = materiais.filter(
    (m: any) => !search || m.nome.toLowerCase().includes(search.toLowerCase())
  );

  const canMovimentar = hasPermission('estoque:movimentar');

  const handleMovimentar = () => {
    const material = materiais.find((m: any) => m.id === newMov.materialId);
    if (!material) return;

    const qty = parseInt(newMov.quantidade) || 0;

    registrarMovimentacao({
      id: `mv${Date.now()}`,
      obraId: obra.id,
      materialId: material.id,
      materialNome: material.nome,
      tipo: movTipo,
      data: new Date().toISOString().split('T')[0],
      quantidade: qty,
      origemDestino: newMov.origemDestino,
      responsavel: user?.name || '',
      observacoes: newMov.observacoes,
    });

    setDialogOpen(false);
    setNewMov({
      materialId: '',
      quantidade: '',
      origemDestino: '',
      observacoes: '',
    });
  };

  const handleCadastrar = () => {
    addMaterial({
      id: `m${Date.now()}`,
      obraId: obra.id,
      nome: newMat.nome,
      categoria: newMat.categoria,
      unidade: newMat.unidade,
      estoqueAtual: 0,
      estoqueMinimo: parseInt(newMat.estoqueMinimo) || 0,
      localizacao: '',
      observacoes: '',
    });

    setCadastroOpen(false);
    setNewMat({
      nome: '',
      unidade: '',
      categoria: '',
      estoqueMinimo: '',
    });
  };

  const handleSaveMin = (id: string) => {
    updateMaterial(id, { estoqueMinimo: parseInt(editingMinValue) || 0 });
    setEditingMinId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">
            Controle de materiais e movimentações da obra
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={obra.id} onValueChange={setObraId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map((o: any) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo} - {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canMovimentar && (
            <div className="flex gap-2">
              <Dialog open={cadastroOpen} onOpenChange={setCadastroOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Material</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Nome do Material *</label>
                      <Input
                        value={newMat.nome}
                        onChange={(e) =>
                          setNewMat({ ...newMat, nome: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Unidade *</label>
                      <Select
                        value={newMat.unidade}
                        onValueChange={(v) => setNewMat({ ...newMat, unidade: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            'un',
                            'kg',
                            'm',
                            'm²',
                            'm³',
                            'saco',
                            'barra',
                            'rolo',
                            'lata',
                            'l',
                            't',
                            'pç',
                            'cx',
                          ].map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Categoria *</label>
                      <Select
                        value={newMat.categoria}
                        onValueChange={(v) => setNewMat({ ...newMat, categoria: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasEstoque.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Estoque Mínimo</label>
                      <Input
                        type="number"
                        value={newMat.estoqueMinimo}
                        onChange={(e) =>
                          setNewMat({ ...newMat, estoqueMinimo: e.target.value })
                        }
                      />
                    </div>

                    <Button
                      onClick={handleCadastrar}
                      className="w-full"
                      disabled={!newMat.nome || !newMat.unidade || !newMat.categoria}
                    >
                      Cadastrar Material
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Movimentar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Registrar {movTipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={movTipo === 'entrada' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMovTipo('entrada')}
                        >
                          Entrada
                        </Button>
                        <Button
                          type="button"
                          variant={movTipo === 'saida' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMovTipo('saida')}
                        >
                          Saída
                        </Button>
                      </div>

                      <VoiceInputButton
                        onResult={(parsed: any) => {
                          if (parsed.tipo) {
                            setMovTipo(parsed.tipo === 'saida' ? 'saida' : 'entrada');
                          }

                          if (parsed.material) {
                            const mat = materiais.find((m: any) =>
                              m.nome.toLowerCase().includes(
                                String(parsed.material).toLowerCase()
                              )
                            );
                            if (mat) {
                              setNewMov((prev) => ({ ...prev, materialId: mat.id }));
                            }
                          }

                          if (parsed.quantidade) {
                            setNewMov((prev) => ({
                              ...prev,
                              quantidade: String(parsed.quantidade),
                            }));
                          }

                          if (parsed.origem_destino) {
                            setNewMov((prev) => ({
                              ...prev,
                              origemDestino: parsed.origem_destino,
                            }));
                          }

                          if (parsed.observacoes) {
                            setNewMov((prev) => ({
                              ...prev,
                              observacoes: parsed.observacoes,
                            }));
                          }

                          setDialogOpen(true);
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Material</label>
                      <Select
                        value={newMov.materialId}
                        onValueChange={(v) => setNewMov({ ...newMov, materialId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materiais.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome} ({m.estoqueAtual} {m.unidade})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Quantidade</label>
                      <Input
                        type="number"
                        value={newMov.quantidade}
                        onChange={(e) =>
                          setNewMov({ ...newMov, quantidade: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        {movTipo === 'entrada' ? 'Origem' : 'Destino'}
                      </label>
                      <Input
                        value={newMov.origemDestino}
                        onChange={(e) =>
                          setNewMov({ ...newMov, origemDestino: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        value={newMov.observacoes}
                        onChange={(e) =>
                          setNewMov({ ...newMov, observacoes: e.target.value })
                        }
                      />
                    </div>

                    <Button
                      onClick={handleMovimentar}
                      className="w-full"
                      disabled={!newMov.materialId || !newMov.quantidade}
                    >
                      Registrar {movTipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary/30 mx-auto mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Itens</p>
            <p className="text-lg sm:text-2xl font-bold">{materiais.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-warning/30 mx-auto mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Estoque Baixo
            </p>
            <p
              className={`text-lg sm:text-2xl font-bold ${
                materiaisBaixo.length > 0 ? 'text-warning' : 'text-foreground'
              }`}
            >
              {materiaisBaixo.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <ArrowDownCircle className="h-5 w-5 sm:h-6 sm:w-6 text-success/30 mx-auto mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Movimentações
            </p>
            <p className="text-lg sm:text-2xl font-bold">
              {movimentacoes.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="materiais">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="materiais" className="flex-1 sm:flex-initial">
            Materiais
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="flex-1 sm:flex-initial">
            Movimentações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materiais" className="mt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2">Material</th>
                  <th className="text-left p-2">Categoria</th>
                  <th className="text-center p-2">Estoque</th>
                  <th className="text-center p-2">Mínimo</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any) => (
                  <tr key={m.id} className="border-b border-border">
                    <td className="p-2 font-medium">{m.nome}</td>
                    <td className="p-2 text-muted-foreground">{m.categoria}</td>
                    <td className="p-2 text-center">
                      {m.estoqueAtual} {m.unidade}
                    </td>
                    <td className="p-2 text-center">
                      {editingMinId === m.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            className="h-7 w-16 text-xs text-center"
                            value={editingMinValue}
                            onChange={(e) => setEditingMinValue(e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleSaveMin(m.id)}
                          >
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setEditingMinId(null)}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => {
                            setEditingMinId(m.id);
                            setEditingMinValue(String(m.estoqueMinimo));
                          }}
                        >
                          {m.estoqueMinimo} {m.unidade}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {m.estoqueAtual < m.estoqueMinimo ? (
                        <Badge
                          variant="secondary"
                          className="bg-destructive/10 text-destructive border-0"
                        >
                          Baixo
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-success/10 text-success border-0"
                        >
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden space-y-2">
            {filtered.map((m: any) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.categoria}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">
                    {m.estoqueAtual}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      {m.unidade}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    mín: {m.estoqueMinimo}
                  </p>
                </div>

                {m.estoqueAtual < m.estoqueMinimo ? (
                  <Badge
                    variant="secondary"
                    className="bg-destructive/10 text-destructive border-0 text-[10px] shrink-0"
                  >
                    Baixo
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-success/10 text-success border-0 text-[10px] shrink-0"
                  >
                    OK
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-3 space-y-2">
          {movimentacoes.map((mov: any) => (
            <div
              key={mov.id}
              className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-card rounded-lg border border-border"
            >
              {mov.tipo === 'entrada' ? (
                <ArrowDownCircle className="h-5 w-5 text-success shrink-0" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-warning shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{mov.materialNome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDate(mov.data)} · {mov.origemDestino}
                </p>
              </div>

              <Badge
                variant="secondary"
                className={`shrink-0 text-xs ${
                  mov.tipo === 'entrada'
                    ? 'bg-success/10 text-success border-0'
                    : 'bg-warning/10 text-warning border-0'
                }`}
              >
                {mov.tipo === 'entrada' ? '+' : '-'}
                {mov.quantidade}
              </Badge>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}