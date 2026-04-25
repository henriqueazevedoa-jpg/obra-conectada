/**
 * MarcosPanel — Painel colapsável de Marcos do Cronograma
 *
 * Bloco 4: SPRINT-E (CRON-B)
 * Exibe abaixo do Gantt. Badge ◆ por tipo, drawer de criação.
 */

import { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Check, Trash2,
  Calendar, ExternalLink,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMarcos, CronogramaMarco, TipoMarco } from '@/hooks/useMarcos';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ── Constants ──────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoMarco, { label: string; color: string; bg: string; borderColor: string }> = {
  entrega:   { label: 'Entrega',   color: '#185FA5', bg: 'rgba(24,95,165,0.1)',   borderColor: 'rgba(24,95,165,0.25)' },
  pagamento: { label: 'Pagamento', color: '#3B6D11', bg: 'rgba(59,109,17,0.1)',   borderColor: 'rgba(59,109,17,0.25)' },
  aprovacao: { label: 'Aprovação', color: '#854F0B', bg: 'rgba(133,79,11,0.1)',   borderColor: 'rgba(133,79,11,0.25)' },
  outro:     { label: 'Outro',     color: '#888780', bg: 'rgba(136,135,128,0.1)', borderColor: 'rgba(136,135,128,0.25)' },
};

// ── Marco Row ──────────────────────────────────────────────────────────────────

function MarcoRow({ marco, onConcluir, onDelete }: {
  marco: CronogramaMarco;
  onConcluir: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = TIPO_CONFIG[marco.tipo];
  const atrasado = !marco.concluido && isPast(parseISO(marco.data_prevista));

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: marco.concluido ? 'rgba(59,109,17,0.04)' : 'var(--color-background-secondary)',
      borderRadius: 10,
      border: `1px solid ${marco.concluido ? 'rgba(59,109,17,0.2)' : atrasado ? 'rgba(163,45,45,0.2)' : 'var(--color-border-secondary)'}`,
      opacity: marco.concluido ? 0.75 : 1,
    }}>
      {/* Diamante tipo */}
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: cfg.bg,
        border: `1px solid ${cfg.borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 14, color: cfg.color,
      }}>
        ◆
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: marco.concluido ? '#3B6D11' : 'var(--color-text-primary)',
            textDecoration: marco.concluido ? 'line-through' : 'none',
          }}>
            {marco.nome}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.borderColor}`,
            fontWeight: 500,
          }}>
            {cfg.label}
          </span>
          {atrasado && !marco.concluido && (
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(163,45,45,0.08)', color: '#A32D2D', border: '1px solid rgba(163,45,45,0.2)', fontWeight: 500 }}>
              Atrasado
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar style={{ width: 10, height: 10 }} />
            {format(parseISO(marco.data_prevista), "dd/MM/yyyy", { locale: ptBR })}
          </span>
          {marco.data_real && (
            <span style={{ fontSize: 11, color: '#3B6D11' }}>
              ✓ Realizado em {format(parseISO(marco.data_real), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          )}
          {marco.contrato_id && (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <ExternalLink style={{ width: 9, height: 9 }} />
              Vinculado a contrato
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {!marco.concluido && (
          <button
            onClick={() => onConcluir(marco.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              height: 26, padding: '0 10px',
              background: 'rgba(59,109,17,0.08)', color: '#3B6D11',
              border: '1px solid rgba(59,109,17,0.2)', borderRadius: 6,
              fontSize: 11, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Check style={{ width: 11, height: 11 }} />
            Concluir
          </button>
        )}
        <button
          onClick={() => onDelete(marco.id)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26,
            background: 'transparent', color: 'var(--color-text-secondary)',
            border: '1px solid transparent', borderRadius: 6,
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A32D2D'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(163,45,45,0.25)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
        >
          <Trash2 style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  );
}

// ── Add Marco Dialog ───────────────────────────────────────────────────────────

interface AddMarcoDialogProps {
  obraId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (input: {
    obra_id: string; nome: string; data_prevista: string;
    tipo: TipoMarco; contrato_id: string | null;
  }) => Promise<unknown>;
}

function AddMarcoDialog({ obraId, open, onOpenChange, onAdd }: AddMarcoDialogProps) {
  const [nome, setNome] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<TipoMarco>('entrega');
  const [contratoId, setContratoId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const { data: contratos = [] } = useQuery<{ id: string; numero: string; descricao: string }[]>({
    queryKey: ['contratos_select', obraId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contratos')
        .select('id, numero, descricao')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reset = () => { setNome(''); setData(new Date().toISOString().split('T')[0]); setTipo('entrega'); setContratoId(''); };

  const handleSubmit = async () => {
    if (!nome.trim() || !data) return;
    setSaving(true);
    await onAdd({ obra_id: obraId, nome: nome.trim(), data_prevista: data, tipo, contrato_id: contratoId || null });
    setSaving(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#854F0B' }}>◆</span>
            Adicionar Marco
          </DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>Nome do Marco</Label>
            <Input
              value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Entrega fundações, Vistoria cliente..."
              autoFocus
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Data Prevista</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={v => setTipo(v as TipoMarco)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrega">Entrega</SelectItem>
                  <SelectItem value="pagamento">Pagamento</SelectItem>
                  <SelectItem value="aprovacao">Aprovação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {contratos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Vincular a Contrato (opcional)</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero || 'Contrato'} — {c.descricao?.slice(0, 40) || '—'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            onClick={() => { onOpenChange(false); reset(); }}
            style={{ height: 34, padding: '0 14px', border: '1px solid var(--color-border-secondary)', borderRadius: 8, background: 'transparent', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!nome.trim() || !data || saving}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8, background: '#534AB7', color: '#fff',
              border: 'none', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: !nome.trim() || saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Salvando…' : 'Criar Marco'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

interface MarcosPanelProps {
  obraId: string;
}

export default function MarcosPanel({ obraId }: MarcosPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const { marcos, addMarco, deleteMarco, concluirMarco } = useMarcos(obraId);

  const pendentes = marcos.filter(m => !m.concluido);
  const concluidos = marcos.filter(m => m.concluido);

  return (
    <>
      {/* Collapsible Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px',
        background: 'var(--color-background-secondary)',
        borderTop: '1px solid var(--color-border-secondary)',
        cursor: 'pointer', userSelect: 'none', flexShrink: 0,
      }} onClick={() => setCollapsed(c => !c)}>
        {collapsed ? <ChevronRight style={{ width: 14, height: 14, color: 'var(--color-text-secondary)' }} /> : <ChevronDown style={{ width: 14, height: 14, color: 'var(--color-text-secondary)' }} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Marcos
        </span>
        {pendentes.length > 0 && (
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 100, background: 'rgba(133,79,11,0.1)', color: '#854F0B', border: '1px solid rgba(133,79,11,0.2)', fontWeight: 600 }}>
            {pendentes.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={e => { e.stopPropagation(); setShowAdd(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            height: 24, padding: '0 8px',
            background: 'rgba(83,74,183,0.08)', color: '#534AB7',
            border: '1px solid rgba(83,74,183,0.2)', borderRadius: 6,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus style={{ width: 10, height: 10 }} />
          Adicionar Marco
        </button>
      </div>

      {/* Panel body */}
      {!collapsed && (
        <div style={{
          padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 8,
          maxHeight: 260, overflowY: 'auto',
          background: 'var(--color-background-primary)',
          flexShrink: 0,
        }}>
          {marcos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-secondary)', fontSize: 12 }}>
              <span style={{ fontSize: 20, display: 'block', marginBottom: 6 }}>◆</span>
              Nenhum marco cadastrado. Marque entregas, pagamentos e aprovações importantes.
            </div>
          ) : (
            <>
              {pendentes.map(m => (
                <MarcoRow key={m.id} marco={m} onConcluir={concluirMarco} onDelete={deleteMarco} />
              ))}
              {concluidos.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                    Concluídos ({concluidos.length})
                  </div>
                  {concluidos.map(m => (
                    <MarcoRow key={m.id} marco={m} onConcluir={concluirMarco} onDelete={deleteMarco} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      <AddMarcoDialog
        obraId={obraId}
        open={showAdd}
        onOpenChange={setShowAdd}
        onAdd={addMarco}
      />
    </>
  );
}
