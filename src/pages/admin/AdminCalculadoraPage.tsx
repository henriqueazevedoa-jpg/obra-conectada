import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/untyped';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatarMoeda } from '@/lib/calculadora-engine';

const TABS = ['Visão Geral', 'Contas', 'Planos', 'CUB Global', 'EAP Global'];
const COLORS = ['hsl(var(--primary))', '#60a5fa', '#34d399', '#f59e0b', '#f87171'];

// ── Aba 1: Visão Geral ────────────────────────────────────────

function AbaVisaoGeral() {
  const [kpis, setKpis] = useState({ contas: 0, pro: 0, hoje: 0, mes: 0 });
  const [linhas, setLinhas] = useState<any[]>([]);
  const [pizza, setPizza] = useState<any[]>([]);
  const [estados, setEstados] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => {
    const sb = supabase as any;
    Promise.all([
      sb.from('calculadora_contas').select('id', { count: 'exact', head: true })
        .then((res: any) => { if (res.error) console.error('[DEBUG admin calc contas]', res.error); return res; }),
      sb.from('calculadora_contas').select('id', { count: 'exact', head: true }).eq('plano', 'pro')
        .then((res: any) => { if (res.error) console.error('[DEBUG admin calc pro]', res.error); return res; }),
      sb.from('calculadora_estimativas').select('id', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().slice(0, 10))
        .then((res: any) => { if (res.error) console.error('[DEBUG admin calc estimativas hoje]', res.error); return res; }),
      sb.from('calculadora_estimativas').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .then((res: any) => { if (res.error) console.error('[DEBUG admin calc estimativas mes]', res.error); return res; }),
    ]).then(([c, p, h, m]: any) => {
      setKpis({ contas: c.count ?? 0, pro: p.count ?? 0, hoje: h.count ?? 0, mes: m.count ?? 0 });
    });

    sb.from('calculadora_estimativas').select('created_at').gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
      .order('created_at').then(({ data }: any) => {
        if (!data) return;
        const agg: Record<string, number> = {};
        data.forEach((r: any) => { const d = r.created_at.slice(0, 10); agg[d] = (agg[d] ?? 0) + 1; });
        setLinhas(Object.entries(agg).map(([dia, total]) => ({ dia: dia.slice(5), total })));
      });

    sb.from('calculadora_estimativas').select('metodo_utilizado').then(({ data }: any) => {
      if (!data) return;
      const agg: Record<string, number> = {};
      data.forEach((r: any) => { const k = r.metodo_utilizado ?? 'N/A'; agg[k] = (agg[k] ?? 0) + 1; });
      setPizza(Object.entries(agg).map(([name, value]) => ({ name, value })));
    });

    sb.from('calculadora_estimativas').select('parametros').then(({ data }: any) => {
      if (!data) return;
      const ae: Record<string, number> = {}, at: Record<string, number> = {};
      data.forEach((r: any) => {
        const e = r.parametros?.estado; const t = r.parametros?.tipo_uso;
        if (e) ae[e] = (ae[e] ?? 0) + 1;
        if (t) at[t] = (at[t] ?? 0) + 1;
      });
      setEstados(Object.entries(ae).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([estado, total]) => ({ estado, total })));
      setTipos(Object.entries(at).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tipo, total]) => ({ tipo: tipo.replace('_', ' '), total })));
    });

    sb.from('calculadora_estimativas').select('metodo_utilizado,parametros,valor_total,created_at')
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }: any) => setRecentes(data ?? []));
  }, []);

  const KPI = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
    <div className="rounded-xl border border-border/40 bg-card p-5">
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold">{value.toLocaleString('pt-BR')}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total de contas" value={kpis.contas} />
        <KPI label="Contas Pro ativas" value={kpis.pro} sub={`R$ ${kpis.pro * 29}/mês estimado`} />
        <KPI label="Estimativas hoje" value={kpis.hoje} />
        <KPI label="Estimativas este mês" value={kpis.mes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <p className="text-sm font-semibold mb-3">Estimativas por dia (30 dias)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={linhas}>
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <p className="text-sm font-semibold mb-3">Distribuição por método</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {pizza.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <p className="text-sm font-semibold mb-3">Top 8 estados</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={estados} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="estado" type="category" tick={{ fontSize: 10 }} width={24} />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <p className="text-sm font-semibold mb-3">Top 5 tipos de uso</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tipos} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="tipo" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="total" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/40">
          <p className="text-sm font-semibold">Estimativas recentes</p>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr>
              {['Método', 'Tipo', 'Estado', 'Área m²', 'Valor', 'Data'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentes.map((r: any, i: number) => (
              <tr key={i} className="border-t border-border/20">
                <td className="px-3 py-2">{r.metodo_utilizado ?? '—'}</td>
                <td className="px-3 py-2">{r.parametros?.tipo_uso?.replace(/_/g, ' ') ?? '—'}</td>
                <td className="px-3 py-2">{r.parametros?.estado ?? '—'}</td>
                <td className="px-3 py-2">{r.parametros?.area_construida_m2 ?? '—'}</td>
                <td className="px-3 py-2">{r.valor_total ? formatarMoeda(r.valor_total) : '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Stub das outras abas (preenchidas nas próximas mensagens) ──

function AbaContas() {
  const [contas, setContas] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'free' | 'pro'>('todos');
  const [modalUpgrade, setModalUpgrade] = useState<{ conta: any; dias: string } | null>(null);
  const [sheetEst, setSheetEst] = useState<{ conta: any; estimativas: any[] } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const load = async () => {
    const sb = supabase as any;
    const { data } = await sb.from('calculadora_contas').select('*, profiles(nome, email)').order('created_at', { ascending: false });
    setContas(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const filtrados = filtro === 'todos' ? contas : contas.filter((c: any) => c.plano === filtro);

  const upgradePro = async () => {
    if (!modalUpgrade) return;
    setSalvando(true);
    const dias = Number(modalUpgrade.dias) || 30;
    const validade = new Date(Date.now() + dias * 864e5).toISOString();
    await (supabase as any).from('calculadora_contas').update({ plano: 'pro', pro_ativo_desde: new Date().toISOString(), pro_valido_ate: validade }).eq('id', modalUpgrade.conta.id);
    setModalUpgrade(null);
    setSalvando(false);
    load();
  };

  const revogarPro = async (conta: any) => {
    if (!confirm(`Revogar Pro de ${conta.profiles?.email}?`)) return;
    await (supabase as any).from('calculadora_contas').update({ plano: 'free', pro_valido_ate: null }).eq('id', conta.id);
    load();
  };

  const verEstimativas = async (conta: any) => {
    const { data } = await (supabase as any).from('calculadora_estimativas').select('metodo_utilizado,parametros,valor_total,created_at').eq('user_id', conta.user_id).order('created_at', { ascending: false });
    setSheetEst({ conta, estimativas: data ?? [] });
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2">
        {(['todos', 'free', 'pro'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              filtro === f ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
            {f === 'todos' ? 'Todos' : f === 'free' ? 'Free' : 'Pro'}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">{filtrados.length} contas</span>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border/40 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr>
              {['Nome', 'Email', 'Plano', 'Est./mês', 'Limite', 'Pro válido até', 'Cadastro', 'Ações'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c: any) => (
              <tr key={c.id} className="border-t border-border/20 hover:bg-muted/10">
                <td className="px-3 py-2 font-medium">{c.profiles?.nome ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.profiles?.email ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                    c.plano === 'pro' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                    {c.plano?.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2">{c.estimativas_mes ?? 0}</td>
                <td className="px-3 py-2">{c.limite_mensal ?? '∞'}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.pro_valido_ate?.slice(0, 10) ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.created_at?.slice(0, 10)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {c.plano === 'free' && (
                      <button onClick={() => setModalUpgrade({ conta: c, dias: '30' })}
                        className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20">
                        Upgrade Pro
                      </button>
                    )}
                    {c.plano === 'pro' && (
                      <button onClick={() => revogarPro(c)}
                        className="px-2 py-1 rounded-md bg-destructive/10 text-destructive text-[10px] font-semibold hover:bg-destructive/20">
                        Revogar
                      </button>
                    )}
                    <button onClick={() => verEstimativas(c)}
                      className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] hover:text-foreground">
                      Ver est.
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Upgrade */}
      {modalUpgrade && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl border border-border p-6 w-80 space-y-4">
            <p className="font-bold">Ativar Pro</p>
            <p className="text-xs text-muted-foreground">{modalUpgrade.conta.profiles?.email}</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Duração</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                value={modalUpgrade.dias}
                onChange={e => setModalUpgrade({ ...modalUpgrade, dias: e.target.value })}>
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
                <option value="365">365 dias</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalUpgrade(null)}
                className="flex-1 px-3 py-2 rounded-lg border border-border text-sm">
                Cancelar
              </button>
              <button onClick={upgradePro} disabled={salvando}
                className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
                {salvando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet Ver Estimativas */}
      {sheetEst && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-card w-full max-w-lg h-full flex flex-col border-l border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-sm">Estimativas — {sheetEst.conta.profiles?.email}</p>
              <button onClick={() => setSheetEst(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    {['Método', 'Área m²', 'Valor', 'Data'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetEst.estimativas.map((e: any, i: number) => (
                    <tr key={i} className="border-t border-border/20">
                      <td className="px-3 py-2">{e.metodo_utilizado ?? '—'}</td>
                      <td className="px-3 py-2">{e.parametros?.area_construida_m2 ?? '—'}</td>
                      <td className="px-3 py-2">{e.valor_total ? formatarMoeda(e.valor_total) : '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function AbaPlanos() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const { data } = await (supabase as any).from('calculadora_planos_config').select('*').order('plano');
    setPlanos(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const salvarPlano = async (plano: any) => {
    setSaving(plano.plano);
    await (supabase as any).from('calculadora_planos_config')
      .upsert(plano, { onConflict: 'plano' });
    setSaving(null);
    load();
  };

  const update = (idx: number, field: string, value: any) =>
    setPlanos(ps => ps.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">Configure permissões e limites por plano. Alterações afetam todos os usuários imediatamente.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {planos.map((p, idx) => (
          <div key={p.plano} className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold capitalize">{p.plano.replace('_', ' ')}</p>
              <span className="text-xs text-muted-foreground">R$ {p.preco_mensal ?? 0}/mês</span>
            </div>

            <div className="space-y-2">
              {([
                ['metodo_a', 'Método A — CUB Simplificado'],
                ['metodo_b', 'Método B — Híbrido SINAPI'],
                ['metodo_c', 'Método C — Quantitativos'],
                ['pdf', 'Exportar PDF'],
                ['salvar_estimativa', 'Salvar estimativas'],
              ] as [string, string][]).map(([field, label]) => (
                <div key={field} className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <button
                    onClick={() => update(idx, field, !p[field])}
                    className={cn('w-9 h-5 rounded-full transition-colors relative',
                      p[field] ? 'bg-primary' : 'bg-muted')}>
                    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      p[field] ? 'translate-x-4' : 'translate-x-0.5')} />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Limite mensal</label>
                <input type="number" className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                  value={p.limite_mensal ?? ''} placeholder="∞ ilimitado"
                  onChange={e => update(idx, 'limite_mensal', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Preço (R$/mês)</label>
                <input type="number" step="0.01" className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                  value={p.preco_mensal ?? 0}
                  onChange={e => update(idx, 'preco_mensal', Number(e.target.value))} />
              </div>
            </div>

            <button onClick={() => salvarPlano(p)} disabled={saving === p.plano}
              className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold">
              {saving === p.plano ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AbaCUBGlobal() {
  const [rows, setRows] = useState<any[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [editCell, setEditCell] = useState<{ id: string; field: string; valor: string } | null>(null);
  const [modalLote, setModalLote] = useState(false);
  const [lote, setLote] = useState({ estado: '', competencia: '' });

  const load = async () => {
    const { data } = await (supabase as any).from('calculadora_cub').select('*')
      .is('company_id', null).order('estado').order('categoria');
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const estados = [...new Set(rows.map((r: any) => r.estado))].sort();
  const filtrados = filtroEstado ? rows.filter((r: any) => r.estado === filtroEstado) : rows;

  const salvar = async (row: any, campo: string, valor: string) => {
    await (supabase as any).from('calculadora_cub').update({ [campo]: campo === 'valor_m2' ? Number(valor) : valor, updated_at: new Date().toISOString() }).eq('id', row.id);
    setEditCell(null);
    load();
  };

  const atualizarLote = async () => {
    const query = (supabase as any).from('calculadora_cub').update({ competencia: lote.competencia, updated_at: new Date().toISOString() }).is('company_id', null);
    if (lote.estado && lote.estado !== 'TODOS') query.eq('estado', lote.estado);
    await query;
    setModalLote(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background"
          value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos os estados</option>
          {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        <button onClick={() => setModalLote(true)}
          className="ml-auto px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">
          Atualizar competência em lote
        </button>
      </div>

      <div className="rounded-xl border border-border/40 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr>{['Estado', 'Categoria', 'Descrição', 'Valor R$/m²', 'Competência'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtrados.map((row: any) => (
              <tr key={row.id} className="border-t border-border/20 hover:bg-muted/10">
                <td className="px-3 py-2">{row.estado}</td>
                <td className="px-3 py-2 font-mono">{row.categoria}</td>
                <td className="px-3 py-2 max-w-[160px] truncate">{row.descricao}</td>
                <td className="px-3 py-2">
                  {editCell?.id === row.id && editCell.field === 'valor_m2' ? (
                    <div className="flex gap-1">
                      <input type="number" step="0.01" className="w-24 border border-border rounded px-1.5 py-0.5 text-xs bg-background"
                        value={editCell.valor} onChange={e => setEditCell({ ...editCell!, valor: e.target.value })} />
                      <button onClick={() => salvar(row, 'valor_m2', editCell!.valor)} className="text-primary text-[10px]">✓</button>
                      <button onClick={() => setEditCell(null)} className="text-muted-foreground text-[10px]">✕</button>
                    </div>
                  ) : (
                    <button className="hover:underline" onClick={() => setEditCell({ id: row.id, field: 'valor_m2', valor: String(row.valor_m2) })}>
                      R$ {Number(row.valor_m2).toFixed(2)}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {editCell?.id === row.id && editCell.field === 'competencia' ? (
                    <div className="flex gap-1">
                      <input type="month" className="border border-border rounded px-1.5 py-0.5 text-xs bg-background"
                        value={editCell.valor} onChange={e => setEditCell({ ...editCell!, valor: e.target.value })} />
                      <button onClick={() => salvar(row, 'competencia', editCell!.valor)} className="text-primary text-[10px]">✓</button>
                      <button onClick={() => setEditCell(null)} className="text-muted-foreground text-[10px]">✕</button>
                    </div>
                  ) : (
                    <button className="hover:underline" onClick={() => setEditCell({ id: row.id, field: 'competencia', valor: row.competencia ?? '' })}>
                      {row.competencia ?? '—'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalLote && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl border border-border p-6 w-80 space-y-4">
            <p className="font-bold text-sm">Atualizar competência em lote</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Estado</label>
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                  value={lote.estado} onChange={e => setLote(l => ({ ...l, estado: e.target.value }))}>
                  <option value="TODOS">Todos os estados</option>
                  {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nova competência</label>
                <input type="month" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                  value={lote.competencia} onChange={e => setLote(l => ({ ...l, competencia: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalLote(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={atualizarLote} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AbaEAPGlobal() {
  const [rows, setRows] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('residencial_unifamiliar');
  const [sheetNova, setSheetNova] = useState(false);
  const [nova, setNova] = useState({ etapa_nome: '', ordem: 1, percentual_base: 5, percentual_minimo: 3, percentual_maximo: 8 });
  const [erroJson, setErroJson] = useState('');
  const [saving, setSaving] = useState(false);

  const TIPOS = [
    ['residencial_unifamiliar', 'Residencial Unifamiliar'],
    ['residencial_multifamiliar', 'Residencial Multifamiliar'],
    ['comercial', 'Comercial'],
    ['galpao_industrial', 'Industrial'],
    ['reforma_interiores', 'Reforma'],
  ];

  const load = async () => {
    const { data } = await (supabase as any).from('calculadora_eap_template').select('*')
      .is('company_id', null).eq('tipo_uso', filtroTipo).order('ordem');
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, [filtroTipo]);


  const salvarNova = async () => {
    setSaving(true);
    await (supabase as any).from('calculadora_eap_template').insert({
      company_id: null, tipo_uso: filtroTipo,
      etapa_nome: nova.etapa_nome,
      ordem: nova.ordem,
      percentual_base: nova.percentual_base,
      percentual_minimo: nova.percentual_minimo,
      percentual_maximo: nova.percentual_maximo,
    });
    setSaving(false);
    setSheetNova(false);
    setErroJson('');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background"
          value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={() => setSheetNova(true)}
          className="ml-auto px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold">
          + Nova etapa global
        </button>
      </div>

      <div className="rounded-xl border border-border/40 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr>{['Ord', 'Etapa', '% Mín', '% Máx', '% Padrão'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id} className="border-t border-border/20">
                <td className="px-3 py-2">{row.ordem}</td>
                <td className="px-3 py-2 font-medium">{row.etapa_nome}</td>
                <td className="px-3 py-2">{row.percentual_minimo != null ? `${row.percentual_minimo}%` : '—'}</td>
                <td className="px-3 py-2">{row.percentual_maximo != null ? `${row.percentual_maximo}%` : '—'}</td>
                <td className="px-3 py-2 font-semibold text-primary">{row.percentual_base}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sheetNova && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-card w-full max-w-md h-full flex flex-col border-l border-border overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-sm">Nova etapa global — {filtroTipo}</p>
              <button onClick={() => setSheetNova(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {([
                ['etapa_nome', 'Nome da etapa', 'text'],
                ['ordem', 'Ordem', 'number'],
                ['percentual_base', '% Padrão', 'number'],
                ['percentual_minimo', '% Mínimo', 'number'],
                ['percentual_maximo', '% Máximo', 'number'],
              ] as [keyof typeof nova, string, string][]).map(([k, label, type]) => (
                <div key={k} className="space-y-1">
                  <label className="text-xs font-medium">{label}</label>
                  <input type={type} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background"
                    value={String(nova[k])} onChange={e => setNova(n => ({ ...n, [k]: type === 'number' ? Number(e.target.value) : e.target.value }))} />
                </div>
              ))}
              {erroJson && <p className="text-xs text-destructive">{erroJson}</p>}
            </div>
            <div className="p-4 border-t border-border">
              <button onClick={salvarNova} disabled={saving}
                className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold">
                {saving ? 'Salvando...' : 'Salvar etapa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ABA_COMPONENTS = [AbaVisaoGeral, AbaContas, AbaPlanos, AbaCUBGlobal, AbaEAPGlobal];

// ── Main Page ─────────────────────────────────────────────────

export default function AdminCalculadoraPage() {
  const [aba, setAba] = useState(0);
  const AbaAtual = ABA_COMPONENTS[aba];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calculadora — Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestão da Calculadora de Orçamento Estimativo</p>
      </div>

      <div className="flex gap-1 border-b border-border/40">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setAba(i)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              aba === i ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t}
          </button>
        ))}
      </div>

      <AbaAtual />
    </div>
  );
}
