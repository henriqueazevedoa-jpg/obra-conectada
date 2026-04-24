import React, { useState, useMemo, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/untyped';
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(date);
};
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Layers, Calendar, DollarSign, Building2, ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PrecoHistorico {
  id: string;
  descricao_insumo: string;
  unidade: string | null;
  fornecedor_nome: string | null;
  preco_unitario: number;
  origem: string | null;
  data_referencia: string | null;
}

interface BancoPrecosTabProps {
  onKpisReady?: (kpis: any[]) => void;
  isActive: boolean;
}

export default function BancoPrecosTab({ onKpisReady, isActive }: BancoPrecosTabProps) {
  const { company } = useCompany();
  const [data, setData] = useState<PrecoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [origemFilter, setOrigemFilter] = useState('todos');
  const [agruparPor, setAgruparPor] = useState('nenhum');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!company?.id) return;

    const fetchData = async () => {
      setLoading(true);
      const { data: res } = await (supabase as any)
        .from('preco_historico')
        .select('id, descricao_insumo, unidade, fornecedor_nome, preco_unitario, origem, data_referencia')
        .eq('company_id', company.id)
        .order('data_referencia', { ascending: false })
        .limit(1000);

      const items = res || [];
      setData(items);
      setLoading(false);

      if (onKpisReady) {
        onKpisReady([{
          id: 'banco_regs',
          label: 'Registros de Preço',
          value: items.length.toString(),
          icon: <DollarSign className="w-4 h-4 text-emerald-500" />
        }]);
      }
    };

    fetchData();
  }, [company?.id, onKpisReady]);

  // Filtro
  const filtered = useMemo(() => {
    let list = data;
    if (origemFilter !== 'todos') {
      list = list.filter(d => (d.origem?.toLowerCase() || '') === origemFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        (d.descricao_insumo?.toLowerCase().includes(q)) ||
        (d.fornecedor_nome?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [data, searchQuery, origemFilter]);

  // Agrupamento
  const grouped = useMemo(() => {
    if (agruparPor === 'nenhum') return [];
    
    const map = new Map<string, PrecoHistorico[]>();
    for (const item of filtered) {
      let key = '';
      let title = '';
      if (agruparPor === 'insumo') {
        key = `${item.descricao_insumo}|${item.unidade || ''}`;
        title = item.descricao_insumo;
      } else if (agruparPor === 'fornecedor') {
        key = item.fornecedor_nome || 'Sem Fornecedor';
        title = item.fornecedor_nome || 'Sem Fornecedor';
      } else if (agruparPor === 'origem') {
        key = item.origem || 'Desconhecida';
        title = item.origem || 'Desconhecida';
      }
      
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    
    return Array.from(map.entries()).map(([key, items]) => {
      const min = Math.min(...items.map(i => i.preco_unitario));
      const max = Math.max(...items.map(i => i.preco_unitario));
      const avg = items.reduce((s, i) => s + i.preco_unitario, 0) / items.length;
      let title = key;
      if (agruparPor === 'insumo') title = items[0].descricao_insumo;
      
      return {
        key,
        title,
        items,
        min,
        max,
        avg,
        count: items.length
      };
    }).sort((a, b) => b.count - a.count);
  }, [filtered, agruparPor]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getOrigemBadge = (origem: string | null) => {
    switch (origem?.toLowerCase()) {
      case 'manual': return <Badge variant="outline" className="bg-slate-100 text-slate-700 hover:bg-slate-100">Manual</Badge>;
      case 'cotacao': return <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Cotação</Badge>;
      case 'nf': return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Nota Fiscal</Badge>;
      case 'sinapi': return <Badge variant="outline" className="bg-orange-100 text-orange-700 hover:bg-orange-100">SINAPI</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">{origem || 'Desconhecida'}</Badge>;
    }
  };

  if (!isActive) return null;

  return (
    <div className="flex flex-col h-full bg-background animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Buscar por insumo ou fornecedor..."
            className="h-8 pl-8 pr-8 text-xs bg-background"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="h-8 text-xs bg-background w-[140px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Origens</SelectItem>
              <SelectItem value="cotacao">Cotação</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="importado">Planilha (Importado)</SelectItem>
              <SelectItem value="sinapi">SINAPI</SelectItem>
              <SelectItem value="nf">Nota Fiscal</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agruparPor} onValueChange={setAgruparPor}>
            <SelectTrigger className="h-8 text-xs bg-background w-[140px]">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Sem Agrupamento</SelectItem>
              <SelectItem value="insumo">Por Insumo</SelectItem>
              <SelectItem value="fornecedor">Por Fornecedor</SelectItem>
              <SelectItem value="origem">Por Origem</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-medium border-b sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 min-w-[300px]">Insumo</th>
                <th className="px-4 py-3 w-20">Unid.</th>
                <th className="px-4 py-3 min-w-[200px]">Fornecedor</th>
                <th className="px-4 py-3 w-32 text-right">Preço</th>
                <th className="px-4 py-3 w-32">Origem</th>
                <th className="px-4 py-3 w-32">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando banco de preços...
                  </td>
                </tr>
              ) : agruparPor !== 'nenhum' ? (
                grouped.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  grouped.map(g => (
                    <React.Fragment key={g.key}>
                      <tr 
                        className={cn(
                          "hover:bg-slate-50 cursor-pointer transition-colors",
                          expandedGroups.has(g.key) ? "bg-slate-50/50" : ""
                        )}
                        onClick={() => toggleGroup(g.key)}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {expandedGroups.has(g.key) ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="capitalize">{g.title}</span>
                            <Badge variant="secondary" className="text-[10px] ml-2 font-normal">
                              {g.count} reg
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {agruparPor === 'insumo' ? g.items[0].unidade : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          Mín: {formatCurrency(g.min)} • Máx: {formatCurrency(g.max)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 bg-emerald-50/30">
                          {formatCurrency(g.avg)} <span className="text-[10px] text-emerald-600/70 font-normal ml-1">MÉDIA</span>
                        </td>
                        <td className="px-4 py-3" colSpan={2}></td>
                      </tr>
                      {expandedGroups.has(g.key) && g.items.map(item => (
                        <tr key={item.id} className="bg-slate-50/50 hover:bg-slate-50/80">
                          <td className="px-4 py-2 pl-10 text-slate-600 border-l-2 border-primary/20 flex flex-col justify-center h-full min-h-[44px]">
                            <div className="flex items-center">
                              <span className="text-slate-400 mr-2 shrink-0">└─</span>
                              {agruparPor !== 'insumo' && <span className="font-medium truncate block flex-1">{item.descricao_insumo}</span>}
                              {agruparPor === 'insumo' && <span className="text-xs text-muted-foreground">Detalhe de preço</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-slate-500">{item.unidade}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {item.fornecedor_nome ? <Building2 className="w-3.5 h-3.5 text-slate-400" /> : <Hash className="w-3.5 h-3.5 text-slate-400" />}
                              <span className={cn(!item.fornecedor_nome && "text-muted-foreground")}>
                                {item.fornecedor_nome || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.preco_unitario)}</td>
                          <td className="px-4 py-2">{getOrigemBadge(item.origem)}</td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {item.data_referencia ? formatDate(item.data_referencia) : '-'}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )
              ) : (
                filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{item.descricao_insumo}</td>
                      <td className="px-4 py-3 text-slate-500">{item.unidade}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.fornecedor_nome ? <Building2 className="w-3.5 h-3.5 text-slate-400" /> : <Hash className="w-3.5 h-3.5 text-slate-400" />}
                          <span className={cn(!item.fornecedor_nome && "text-muted-foreground")}>
                            {item.fornecedor_nome || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.preco_unitario)}</td>
                      <td className="px-4 py-3">{getOrigemBadge(item.origem)}</td>
                      <td className="px-4 py-3 text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.data_referencia ? formatDate(item.data_referencia) : '-'}
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
