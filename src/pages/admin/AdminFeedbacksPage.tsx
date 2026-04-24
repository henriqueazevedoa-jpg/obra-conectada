import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function AdminFeedbacksPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [filtroLido, setFiltroLido] = useState('');
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    let q = (supabase as any).from('feedbacks').select('*').order('created_at', { ascending: false });
    if (filtroTipo) q = q.eq('tipo', filtroTipo);
    if (filtroOrigem) q = q.eq('origem', filtroOrigem);
    if (filtroLido === 'lido') q = q.eq('lido', true);
    if (filtroLido === 'nao_lido') q = q.eq('lido', false);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, [filtroTipo, filtroOrigem, filtroLido]);

  const marcarLido = async (id: string) => {
    await (supabase as any).from('feedbacks').update({ lido: true }).eq('id', id);
    load();
  };

  const marcarTodosLido = async () => {
    await (supabase as any).from('feedbacks').update({ lido: true }).eq('lido', false);
    load();
  };

  const salvarNota = async () => {
    if (!detalhe) return;
    setSaving(true);
    await (supabase as any).from('feedbacks').update({ nota_interna: nota, lido: detalhe.lido }).eq('id', detalhe.id);
    setSaving(false);
    setDetalhe({ ...detalhe, nota_interna: nota });
    load();
  };

  const naoLidos = rows.filter(r => !r.lido).length;
  const hoje = rows.filter(r => r.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  const TIPO_COLORS: Record<string, string> = {
    sugestao: 'bg-blue-50 text-blue-700 border-blue-200',
    problema: 'bg-red-50 text-red-700 border-red-200',
    elogio:   'bg-green-50 text-green-700 border-green-200',
    outro:    'bg-muted text-muted-foreground',
  };

  const TIPO_EMOJI: Record<string, string> = {
    sugestao: '💡', problema: '🐛', elogio: '👍', outro: '💬',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Feedbacks</h1>
        </div>
        <div className="flex gap-4 text-sm ml-4">
          <span>Total: <strong>{rows.length}</strong></span>
          <span>Não lidos: <strong className="text-primary">{naoLidos}</strong></span>
          <span>Hoje: <strong>{hoje}</strong></span>
        </div>
        <button onClick={marcarTodosLido}
          className="ml-auto px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">
          Marcar todos como lido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {['', 'sugestao', 'problema', 'elogio', 'outro'].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={cn('px-3 py-1 rounded-lg text-xs border transition-colors',
              filtroTipo === t ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
            {t === '' ? 'Todos os tipos' : `${TIPO_EMOJI[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
          </button>
        ))}
        <span className="w-px h-5 bg-border self-center" />
        {['', 'lastra', 'calculadora'].map(o => (
          <button key={o} onClick={() => setFiltroOrigem(o)}
            className={cn('px-3 py-1 rounded-lg text-xs border transition-colors',
              filtroOrigem === o ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
            {o === '' ? 'Todas origens' : o.charAt(0).toUpperCase() + o.slice(1)}
          </button>
        ))}
        <span className="w-px h-5 bg-border self-center" />
        {[['', 'Todos status'], ['nao_lido', 'Não lidos'], ['lido', 'Lidos']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltroLido(v)}
            className={cn('px-3 py-1 rounded-lg text-xs border transition-colors',
              filtroLido === v ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
            {l}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border/40 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr>
              {['Tipo', 'Mensagem', 'Página', 'E-mail', 'Origem', 'Data', 'Lido', 'Ações'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={cn('border-t border-border/20', !r.lido && 'bg-primary/5')}>
                <td className="px-3 py-2">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', TIPO_COLORS[r.tipo] ?? 'bg-muted')}>
                    {TIPO_EMOJI[r.tipo]} {r.tipo}
                  </span>
                </td>
                <td className="px-3 py-2 max-w-[200px]">
                  <span className="line-clamp-2">{r.mensagem?.slice(0, 80)}{r.mensagem?.length > 80 ? '…' : ''}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground max-w-[100px] truncate">{r.pagina_contexto ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">
                  {r.email_resposta
                    ? <a href={`mailto:${r.email_resposta}`} className="hover:underline text-primary">{r.email_resposta}</a>
                    : '—'}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="text-[10px]">{r.origem}</Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.created_at?.slice(0, 10)}</td>
                <td className="px-3 py-2">
                  {r.lido
                    ? <span className="text-green-600">✓</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => { setDetalhe(r); setNota(r.nota_interna ?? ''); }}
                      className="px-2 py-1 rounded bg-muted text-muted-foreground hover:text-foreground text-[10px]">
                      Ver
                    </button>
                    {!r.lido && (
                      <button onClick={() => marcarLido(r.id)}
                        className="px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 text-[10px]">
                        ✓ Lido
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Nenhum feedback encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sheet de detalhe */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-card w-full max-w-md h-full flex flex-col border-l border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex gap-2">
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', TIPO_COLORS[detalhe.tipo])}>
                  {TIPO_EMOJI[detalhe.tipo]} {detalhe.tipo}
                </span>
                <Badge variant="outline" className="text-[10px]">{detalhe.origem}</Badge>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Mensagem</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{detalhe.mensagem}</p>
              </div>
              {detalhe.pagina_contexto && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Página de contexto</p>
                  <p className="text-sm font-mono">{detalhe.pagina_contexto}</p>
                </div>
              )}
              {detalhe.email_resposta && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">E-mail</p>
                  <a href={`mailto:${detalhe.email_resposta}`} className="text-sm text-primary hover:underline">{detalhe.email_resposta}</a>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Data</p>
                <p className="text-sm">{new Date(detalhe.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Nota interna</label>
                <textarea
                  rows={4}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"
                  placeholder="Anotar contexto ou próximo passo..."
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium">Marcar como lido</label>
                <button
                  onClick={() => setDetalhe({ ...detalhe, lido: !detalhe.lido })}
                  className={cn('w-9 h-5 rounded-full transition-colors relative', detalhe.lido ? 'bg-green-500' : 'bg-muted')}>
                  <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    detalhe.lido ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <button onClick={salvarNota} disabled={saving}
                className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold">
                {saving ? 'Salvando...' : 'Salvar nota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
