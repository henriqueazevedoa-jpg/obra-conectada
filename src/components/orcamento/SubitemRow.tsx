import { useState, useEffect, useCallback } from 'react';
import { OrcamentoSubitem } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMPOSICAO_GRID } from './ComposicaoRow';

interface PriceInfo {
  menorPreco: number;
  precoMedio: number;
  ultimoPreco: number;
  fornecedorMenor: string;
  dataUltimo: string;
}

interface Props {
  subitem: OrcamentoSubitem;
  unidades: string[];
  onChange: (updated: OrcamentoSubitem) => void;
  onRemove: () => void;
  obraId?: string;
}

export default function SubitemRow({ subitem, unidades, onChange, onRemove, obraId }: Props) {
  const [suggestions, setSuggestions] = useState<{ label: string; value: string }[]>([]);
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [showPriceRef, setShowPriceRef] = useState(false);
  const [precoRefTipo, setPrecoRefTipo] = useState<string>((subitem as any).precoReferenciaTipo || 'manual');

  // Busca sugestões de materiais
  useEffect(() => {
    const fetchSuggestions = async () => {
      const { data } = await supabase.from('precos_fornecedores').select('descricao_item_snapshot').limit(200);
      if (data) {
        const unique = new Map<string, string>();
        data.forEach((d: any) => {
          const desc = d.descricao_item_snapshot || '';
          if (desc && !unique.has(desc.toLowerCase())) unique.set(desc.toLowerCase(), desc);
        });
        setSuggestions(Array.from(unique.values()).map(label => ({ label, value: label.toLowerCase() })));
      }
    };
    fetchSuggestions();
  }, []);

  // Busca referência de preço ao mudar a descrição
  const fetchPriceInfo = useCallback(async (descricao: string) => {
    if (!descricao || descricao.length < 3) { setPriceInfo(null); return; }
    const { data } = await supabase
      .from('precos_fornecedores')
      .select('preco_unitario, fornecedor_id, data_referencia')
      .ilike('descricao_item_snapshot', `%${descricao}%`)
      .order('data_referencia', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) { setPriceInfo(null); return; }

    const precos = data as { preco_unitario: number; fornecedor_id: string; data_referencia: string }[];
    const menor = precos.reduce((m, p) => p.preco_unitario < m.preco_unitario ? p : m, precos[0]);
    const media = precos.reduce((s, p) => s + p.preco_unitario, 0) / precos.length;

    let fornNome = '—';
    if (menor.fornecedor_id) {
      const { data: fData } = await supabase.from('fornecedores').select('nome').eq('id', menor.fornecedor_id).single();
      if (fData) fornNome = (fData as any).nome;
    }

    setPriceInfo({
      menorPreco: menor.preco_unitario,
      precoMedio: media,
      ultimoPreco: precos[0].preco_unitario,
      fornecedorMenor: fornNome,
      dataUltimo: precos[0].data_referencia,
    });
  }, []);

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

  const handleDescricaoChange = (val: string) => {
    update('descricao', val);
    fetchPriceInfo(val);
  };

  const applyPrice = (tipo: string) => {
    if (!priceInfo) return;
    let preco = 0;
    if (tipo === 'menor_preco') preco = priceInfo.menorPreco;
    else if (tipo === 'preco_medio') preco = priceInfo.precoMedio;
    else if (tipo === 'ultimo_preco') preco = priceInfo.ultimoPreco;
    setPrecoRefTipo(tipo);
    update('precoUnitario', preco);
  };

  return (
    <div>
      {/* ── Linha principal — mesmo grid de ComposicaoRow ── */}
      <div className={`grid ${COMPOSICAO_GRID} gap-2 items-center px-3 py-1.5`}>
        {/* Código */}
        <div className="text-[10px] font-mono text-muted-foreground truncate" title={subitem.codigo}>
          {subitem.codigo}
        </div>

        {/* Descrição com autocomplete */}
        <AutocompleteInput
          suggestions={suggestions}
          value={subitem.descricao}
          onChange={handleDescricaoChange}
          placeholder="Descrição / insumo"
          className="h-8 text-xs px-2"
        />

        {/* Unidade */}
        <div>
          <Input
            value={subitem.unidade}
            onChange={e => update('unidade', e.target.value)}
            className="h-8 text-xs px-2"
            placeholder="Un"
            list={`un-sub-${subitem.id}`}
          />
          <datalist id={`un-sub-${subitem.id}`}>
            {unidades.map(u => <option key={u} value={u} />)}
          </datalist>
        </div>

        {/* Quantidade */}
        <Input
          type="number"
          value={subitem.quantidade ?? ''}
          onChange={e => update('quantidade', e.target.value ? parseFloat(e.target.value) : null)}
          className="h-8 text-xs px-2 text-right"
          placeholder="Qtd"
        />

        {/* P. Unit */}
        <Input
          type="number"
          value={subitem.precoUnitario ?? ''}
          onChange={e => update('precoUnitario', e.target.value ? parseFloat(e.target.value) : null)}
          className="h-8 text-xs px-2 text-right"
          placeholder="P. Unit"
        />

        {/* P. Total */}
        <Input
          type="number"
          value={subitem.precoTotal || ''}
          onChange={e => update('precoTotal', parseFloat(e.target.value) || 0)}
          className="h-8 text-xs px-2 text-right"
          placeholder="P. Total"
        />

        {/* Excluir */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* ── Referência de preço ── */}
      {priceInfo && (
        <div className="px-3 pb-1.5">
          <button
            onClick={() => setShowPriceRef(!showPriceRef)}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            {showPriceRef ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Referência de preço disponível
          </button>

          {showPriceRef && (
            <div className="mt-1.5 p-2.5 rounded-md border bg-muted/30 space-y-2">
              <div className="flex flex-wrap gap-4 text-[11px]">
                <span>
                  Menor: <strong className="text-green-600 dark:text-green-400">
                    R$ {priceInfo.menorPreco.toFixed(2)}
                  </strong>
                  <span className="text-muted-foreground ml-1">({priceInfo.fornecedorMenor})</span>
                </span>
                <span>Médio: <strong>R$ {priceInfo.precoMedio.toFixed(2)}</strong></span>
                <span>Último: <strong>R$ {priceInfo.ultimoPreco.toFixed(2)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Usar:</span>
                <Select value={precoRefTipo} onValueChange={v => applyPrice(v)}>
                  <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menor_preco">Menor Preço</SelectItem>
                    <SelectItem value="preco_medio">Preço Médio</SelectItem>
                    <SelectItem value="ultimo_preco">Último Preço</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
