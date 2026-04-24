import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, RotateCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { ESTADOS_BRASIL, formatarMoeda } from '@/lib/calculadora-engine';

const TIPO_USO_OPTIONS = [
  { value: 'residencial_unifamiliar', label: 'Residencial Unifamiliar' },
  { value: 'residencial_multifamiliar', label: 'Residencial Multifamiliar' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'galpao_industrial', label: 'Industrial / Galpão' },
  { value: 'reforma_interiores', label: 'Reforma de Interiores' },
];

const CUSTOS_ITEMS = [
  ['incluir_projeto_arquitetonico', 'Projetos (arq. + estrutural + instalações)', 4.5],
  ['incluir_art_rrt', 'ART/RRT do responsável técnico', 0.5],
  ['incluir_alvara_aprovacoes', 'Alvará de construção', 1.0],
  ['incluir_habite_se', 'Habite-se e regularização', 0.5],
  ['incluir_administracao', 'Administração/gestão da obra', 5.0],
  ['incluir_iss', 'ISS sobre serviços', 3.0],
  ['incluir_inss_obra', 'INSS da obra (CPP)', 3.5],
] as [string, string, number][];

// ── Seção wrapper ─────────────────────────────────────────────

function Secao({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Seção 1: Parâmetros padrão ────────────────────────────────

function SecaoParametros({ companyId }: { companyId: string }) {
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState({
    estado_padrao: 'SP',
    municipio_padrao: '',
    tipo_uso_padrao: 'residencial_unifamiliar',
    bdi_padrao: 25,
    contingencia_padrao: 10,
    fator_seguranca: 1.0,
    margem_precisao: 20,
    custos_adicionais_config: {} as Record<string, { ativo: boolean; percentual: number }>,
  });

  useEffect(() => {
    (supabase as any)
      .from('calculadora_configuracoes')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setCfg({
          estado_padrao: data.estado_padrao ?? 'SP',
          municipio_padrao: data.municipio_padrao ?? '',
          tipo_uso_padrao: data.tipo_uso_padrao ?? 'residencial_unifamiliar',
          bdi_padrao: data.bdi_padrao ?? 25,
          contingencia_padrao: data.contingencia_padrao ?? 10,
          fator_seguranca: data.fator_seguranca ?? 1.0,
          margem_precisao: data.margem_precisao ?? 20,
          custos_adicionais_config: data.custos_adicionais_config ?? {},
        });
      });
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('calculadora_configuracoes')
        .upsert({ company_id: companyId, ...cfg }, { onConflict: 'company_id' });
      if (error) throw error;
      toast({ title: 'Configurações salvas', description: 'Parâmetros padrão atualizados.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const setCA = (k: string, field: 'ativo' | 'percentual', v: boolean | number) =>
    setCfg(c => ({
      ...c,
      custos_adicionais_config: {
        ...c.custos_adicionais_config,
        [k]: { ...c.custos_adicionais_config[k], [field]: v },
      },
    }));

  return (
    <Secao title="Parâmetros padrão" sub="Valores pré-preenchidos ao abrir a calculadora para sua empresa.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Estado padrão</Label>
          <Select value={cfg.estado_padrao} onValueChange={v => setCfg(c => ({ ...c, estado_padrao: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">
              {ESTADOS_BRASIL.map(e => <SelectItem key={e.uf} value={e.uf}>{e.uf} — {e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Município padrão</Label>
          <Input value={cfg.municipio_padrao} onChange={e => setCfg(c => ({ ...c, municipio_padrao: e.target.value }))} placeholder="Ex: São Paulo" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de obra padrão</Label>
          <Select value={cfg.tipo_uso_padrao} onValueChange={v => setCfg(c => ({ ...c, tipo_uso_padrao: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPO_USO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>BDI padrão (%)</Label>
          <Input type="number" step={0.5} min={0} max={100} value={cfg.bdi_padrao} onChange={e => setCfg(c => ({ ...c, bdi_padrao: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Contingência padrão (%)</Label>
          <Input type="number" step={0.5} min={0} max={50} value={cfg.contingencia_padrao} onChange={e => setCfg(c => ({ ...c, contingencia_padrao: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Fator de segurança</Label>
          <Input type="number" step={0.01} min={1} max={1.5} value={cfg.fator_seguranca} onChange={e => setCfg(c => ({ ...c, fator_seguranca: Number(e.target.value) }))} />
          <p className="text-xs text-muted-foreground">1.00 = sem adicional · 1.10 = +10%</p>
        </div>
        <div className="space-y-1.5">
          <Label>Margem de precisão declarada (%)</Label>
          <Input type="number" step={1} min={5} max={40} value={cfg.margem_precisao} onChange={e => setCfg(c => ({ ...c, margem_precisao: Number(e.target.value) }))} />
          <p className="text-xs text-muted-foreground">Faixa de variação exibida nos resultados</p>
        </div>
      </div>

      <div className="border border-border/40 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Custos do empreendimento — padrões</p>
        {CUSTOS_ITEMS.map(([k, label, defaultPct]) => {
          const item = cfg.custos_adicionais_config[k] ?? { ativo: false, percentual: defaultPct };
          return (
            <div key={k} className="flex items-center gap-3">
              <Switch checked={item.ativo} onCheckedChange={v => setCA(k, 'ativo', v)} />
              <span className="flex-1 text-sm">{label}</span>
              <Input type="number" step={0.1} min={0} max={20} className="w-20 h-7 text-xs"
                value={item.percentual} onChange={e => setCA(k, 'percentual', Number(e.target.value))} />
              <span className="text-xs text-muted-foreground w-4">%</span>
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar parâmetros'}
      </Button>
    </Secao>
  );
}

// ── Seção 2: Valores de CUB ───────────────────────────────────

function SecaoCUB({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [editCell, setEditCell] = useState<{ id: string; field: 'valor_m2' | 'competencia'; valor: string } | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any)
      .from('calculadora_cub')
      .select('*')
      .or(`company_id.is.null,company_id.eq.${companyId}`)
      .order('estado').order('categoria')
      .then(({ data }: any) => setRows(data ?? []));
  }, [companyId]);

  // Merge: preferir linha da empresa sobre sistema
  const merged = Object.values(
    rows.reduce((acc: any, r: any) => {
      const key = `${r.estado}|${r.categoria}`;
      if (!acc[key] || r.company_id) acc[key] = r;
      return acc;
    }, {})
  ) as any[];

  const estadosPresentes = [...new Set(merged.map((r: any) => r.estado))].sort();
  const filtrados = filtroEstado ? merged.filter((r: any) => r.estado === filtroEstado) : merged;

  const salvarOverride = async (row: any, valor_m2: number, competencia: string) => {
    setSalvando(row.estado + row.categoria);
    try {
      await (supabase as any).from('calculadora_cub').upsert({
        company_id: companyId,
        estado: row.estado,
        categoria: row.categoria,
        descricao: row.descricao,
        valor_m2,
        competencia,
      }, { onConflict: 'company_id,estado,categoria' });
      const { data } = await (supabase as any).from('calculadora_cub').select('*')
        .or(`company_id.is.null,company_id.eq.${companyId}`).order('estado').order('categoria');
      setRows(data ?? []);
      toast({ title: 'CUB salvo', description: `${row.estado} ${row.categoria} atualizado.` });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(null);
      setEditCell(null);
    }
  };

  const restaurar = async (row: any) => {
    if (!confirm(`Restaurar ${row.estado} ${row.categoria} para o padrão do sistema?`)) return;
    await (supabase as any).from('calculadora_cub').delete()
      .eq('company_id', companyId).eq('estado', row.estado).eq('categoria', row.categoria);
    const { data } = await (supabase as any).from('calculadora_cub').select('*')
      .or(`company_id.is.null,company_id.eq.${companyId}`).order('estado').order('categoria');
    setRows(data ?? []);
    toast({ title: 'CUB restaurado', description: 'Valor padrão do sistema restaurado.' });
  };

  return (
    <Secao title="Valores de CUB" sub="Valores SINDUSCON por estado. Edite para usar valores mais recentes.">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Edite valores diretamente na tabela. Use Restaurar para voltar ao padrão do sistema.
      </div>

      <div className="flex items-center gap-2">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Todos os estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {estadosPresentes.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              {['Categoria', 'Descrição', 'Valor R$/m²', 'Competência', 'Status', 'Ações'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((row: any) => {
              const isOverride = !!row.company_id;
              const isEditingValor = editCell?.id === row.id && editCell.field === 'valor_m2';
              const isEditingComp = editCell?.id === row.id && editCell.field === 'competencia';
              return (
                <tr key={row.id} className="border-t border-border/20 hover:bg-muted/10">
                  <td className="px-3 py-2 font-mono text-xs">{row.categoria}</td>
                  <td className="px-3 py-2 text-xs max-w-[180px] truncate">{row.descricao}</td>
                  <td className="px-3 py-2">
                    {isEditingValor ? (
                      <div className="flex gap-1">
                        <Input type="number" step={0.01} className="h-7 w-28 text-xs"
                          value={editCell.valor}
                          onChange={e => setEditCell({ ...editCell!, valor: e.target.value })}
                        />
                        <Button size="icon" className="h-7 w-7 text-xs" variant="default"
                          onClick={() => salvarOverride(row, Number(editCell!.valor), row.competencia)}>✓</Button>
                        <Button size="icon" className="h-7 w-7 text-xs" variant="ghost"
                          onClick={() => setEditCell(null)}>✕</Button>
                      </div>
                    ) : (
                      <button className="text-xs hover:underline" onClick={() => setEditCell({ id: row.id, field: 'valor_m2', valor: String(row.valor_m2) })}>
                        {formatarMoeda(row.valor_m2)}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {isEditingComp ? (
                      <div className="flex gap-1">
                        <Input type="month" className="h-7 w-32 text-xs"
                          value={editCell.valor}
                          onChange={e => setEditCell({ ...editCell!, valor: e.target.value })}
                        />
                        <Button size="icon" className="h-7 w-7" variant="default"
                          onClick={() => salvarOverride(row, row.valor_m2, editCell!.valor)}>✓</Button>
                        <Button size="icon" className="h-7 w-7" variant="ghost"
                          onClick={() => setEditCell(null)}>✕</Button>
                      </div>
                    ) : (
                      <button className="hover:underline" onClick={() => setEditCell({ id: row.id, field: 'competencia', valor: row.competencia ?? '' })}>
                        {row.competencia ?? '—'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isOverride
                      ? <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Personalizado</Badge>
                      : <Badge variant="outline" className="text-[10px]">Sistema</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    {isOverride && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Restaurar padrão"
                        onClick={() => restaurar(row)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Secao>
  );
}

// ── Seção 3: Distribuição EAP ─────────────────────────────────

function SecaoEAP({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('residencial_unifamiliar');
  const [editId, setEditId] = useState<string | null>(null);
  const [editPct, setEditPct] = useState('');

  const loadRows = async () => {
    const { data } = await (supabase as any)
      .from('calculadora_eap_template')
      .select('*')
      .or(`company_id.is.null,company_id.eq.${companyId}`)
      .eq('tipo_uso', filtroTipo)
      .order('ordem');
    setRows(data ?? []);
  };

  useEffect(() => { loadRows(); }, [filtroTipo, companyId]);

  const merged = Object.values(
    rows.reduce((acc: any, r: any) => {
      const key = `${r.tipo_uso}|${r.etapa_nome}`;
      if (!acc[key] || r.company_id) acc[key] = r;
      return acc;
    }, {})
  ) as any[];

  const somaPadrao = merged.reduce((s: number, r: any) => s + (r.percentual_base ?? 0), 0);

  const salvar = async (row: any) => {
    await (supabase as any).from('calculadora_eap_template').upsert({
      company_id: companyId,
      tipo_uso: row.tipo_uso,
      etapa_nome: row.etapa_nome,
      ordem: row.ordem,
      percentual_base: Number(editPct),
      percentual_minimo: row.percentual_minimo,
      percentual_maximo: row.percentual_maximo,
    }, { onConflict: 'company_id,tipo_uso,etapa_nome' });
    setEditId(null);
    loadRows();
    toast({ title: 'EAP salvo' });
  };

  const restaurar = async (row: any) => {
    if (!confirm(`Restaurar etapa ${row.etapa_nome} para o padrão?`)) return;
    await (supabase as any).from('calculadora_eap_template').delete()
      .eq('company_id', companyId).eq('tipo_uso', row.tipo_uso).eq('etapa_nome', row.etapa_nome);
    loadRows();
    toast({ title: 'EAP restaurado' });
  };

  return (
    <Secao title="Distribuição EAP" sub="Percentuais por etapa de construção. Edite o % padrão para personalizar.">
      <Select value={filtroTipo} onValueChange={setFiltroTipo}>
        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TIPO_USO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              {['Ord', 'Etapa', '% Mín', '% Máx', '% Padrão', 'Status', 'Ações'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merged.map((row: any) => {
              const isOverride = !!row.company_id;
              const isEditing = editId === `${row.tipo_uso}|${row.etapa_nome}`;
              return (
                <tr key={`${row.tipo_uso}|${row.etapa_nome}`} className="border-t border-border/20 hover:bg-muted/10">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.ordem}</td>
                  <td className="px-3 py-2 text-xs font-medium">{row.etapa_nome}</td>
                  <td className="px-3 py-2 text-xs">{row.percentual_minimo != null ? `${row.percentual_minimo}%` : '—'}</td>
                  <td className="px-3 py-2 text-xs">{row.percentual_maximo != null ? `${row.percentual_maximo}%` : '—'}</td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Input type="number" step={0.1} className="h-7 w-20 text-xs"
                          value={editPct} onChange={e => setEditPct(e.target.value)} />
                        <Button size="icon" className="h-7 w-7" variant="default" onClick={() => salvar(row)}>✓</Button>
                        <Button size="icon" className="h-7 w-7" variant="ghost" onClick={() => setEditId(null)}>✕</Button>
                      </div>
                    ) : (
                      <button className="text-xs hover:underline"
                        onClick={() => { setEditId(`${row.tipo_uso}|${row.etapa_nome}`); setEditPct(String(row.percentual_base)); }}>
                        {row.percentual_base}%
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isOverride
                      ? <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Personalizado</Badge>
                      : <Badge variant="outline" className="text-[10px]">Sistema</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    {isOverride && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => restaurar(row)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={cn('flex items-center gap-2 text-xs p-3 rounded-xl border',
        somaPadrao >= 90 && somaPadrao <= 110
          ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400'
          : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400')}>
        <span>Soma dos % padrão: <strong>{somaPadrao.toFixed(1)}%</strong></span>
        <span className="text-muted-foreground">— Normalizado automaticamente para 100% no cálculo.</span>
      </div>
    </Secao>
  );
}

// ── Main Tab ──────────────────────────────────────────────────

export default function ConfigCalculadoraTab() {
  const { company } = useCompany();
  if (!company) return null;

  return (
    <div className="space-y-12">
      <SecaoParametros companyId={company.id} />
      <div className="border-t border-border/40" />
      <SecaoCUB companyId={company.id} />
      <div className="border-t border-border/40" />
      <SecaoEAP companyId={company.id} />
    </div>
  );
}
