import { useState } from 'react';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useIADocumentos, DocTipo } from '@/hooks/useIADocumentos';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import IAInputButton from '@/components/ia/IAInputButton';
import NfReviewDrawer from '@/components/ia/NfReviewDrawer';

export default function EstoqueQuickView({ obraId }: { obraId: string }) {
  const { getMateriaisByObra, registrarMovimentacao } = useEstoque();
  const materiais = getMateriaisByObra(obraId);

  const { state, resultado, startProcessing, confirmarRecebimento, reset, isProcessing } =
    useIADocumentos(obraId);
  const [reviewOpen, setReviewOpen] = useState(false);

  const handleFileSelected = async (file: File, tipo: DocTipo) => {
    setReviewOpen(true);
    await startProcessing(file, tipo);
  };

  const handleVoiceReady = async (audioBlob: Blob) => {
    const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
    setReviewOpen(true);
    await startProcessing(file, 'audio');
  };

  const handleConfirm = async (itensRevisados: any[]) => {
    const ok = await confirmarRecebimento(itensRevisados, 'estoque', registrarMovimentacao);
    if (ok) { setReviewOpen(false); reset(); }
  };

  // ── Estoque display ──
  const sorted = [...materiais].sort((a, b) => {
    const aLevel = (a.quantidadeAtual || 0) <= (a.estoqueMinimo || 0) ? 0 : 1;
    const bLevel = (b.quantidadeAtual || 0) <= (b.estoqueMinimo || 0) ? 0 : 1;
    return aLevel - bLevel;
  });

  const criticos = materiais.filter(m => (m.quantidadeAtual || 0) <= (m.estoqueMinimo || 0)).length;

  const getStatus = (m: typeof materiais[0]) => {
    const qty = m.quantidadeAtual || 0;
    const min = m.estoqueMinimo || 0;
    if (qty <= 0) return { label: 'Esgotado', color: 'bg-red-500/15 text-red-400 border-red-500/30' };
    if (qty <= min) return { label: 'Crítico', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    return { label: 'OK', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{materiais.length} materiais</span>
          {criticos > 0 && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />{criticos} crítico{criticos !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* IA de Recebimento */}
          <IAInputButton
            size="sm"
            onFileSelected={handleFileSelected}
            onVoiceReady={handleVoiceReady}
            disabled={isProcessing}
          />
          <Button asChild size="sm" variant="outline" className="h-9 text-xs">
            <Link to="/estoque">Ver tudo <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </div>
      </div>

      {/* Tabela de materiais */}
      {materiais.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum material cadastrado no estoque.</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/estoque">Gerenciar Estoque <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Material</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Qtd.</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Un.</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map(m => {
                  const status = getStatus(m);
                  return (
                    <tr key={m.id} className={cn(
                      'hover:bg-muted/20 transition-colors',
                      (m.quantidadeAtual || 0) <= (m.estoqueMinimo || 0) && 'bg-amber-500/5'
                    )}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{m.nome}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {(m.quantidadeAtual || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{m.unidade}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={cn('text-[10px] border', status.color)}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Para gerenciar materiais e ver histórico completo, acesse{' '}
        <Link to="/estoque" className="text-primary/80 hover:underline">Estoque completo</Link>.
      </p>

      {/* IA Review Drawer */}
      <NfReviewDrawer
        open={reviewOpen}
        resultado={resultado}
        materiaisObra={materiais.map(m => ({ id: m.id, nome: m.nome, unidade: m.unidade }))}
        loading={state === 'uploading' || state === 'processing'}
        onClose={() => { setReviewOpen(false); reset(); }}
        onConfirm={handleConfirm}
        onReprocess={() => { reset(); }}
      />
    </div>
  );
}
