// ============================================================
// CalculadoraPublicaPage — Página pública sem AppLayout
// Sprint 5 / Bloco 15
// Rota: /calculadora (sem autenticação)
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calculator, Save, Download, ArrowRight, Lock, Loader2, Building2, X } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { gerarPropostaPDF } from '@/lib/calculadora-pdf';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useObras, ObrasProvider } from '@/contexts/ObrasContext';
import { useCalculadoraAcesso } from '@/hooks/useCalculadoraAcesso';
import { useCalculadora } from '@/hooks/useCalculadora';
import DrawerCalculadoraEstimativa from '@/components/calculadora/DrawerCalculadoraEstimativa';
import CalculadoraResultadoView from '@/components/calculadora/CalculadoraResultadoView';
import ModalFeedback from '@/components/shared/ModalFeedback';
import type { CalculadoraResultado, CalculadoraParams } from '@/types/calculadora';

// ── Placeholder de resultado ──────────────────────────────────

function ResultadoPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[400px] text-center px-8">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Calculator className="h-10 w-10 text-primary/60" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">Calculadora de Orçamento</p>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha os dados ao lado para ver a estimativa de custo da sua obra.
        </p>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1 text-left">
        {[
          'Estimativa por CUB e SINAPI',
          'Distribuição de custo por etapa',
          'Cronograma paramétrico',
          'Faixa mínima e máxima',
        ].map(item => (
          <li key={item} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── CTAs por estado do usuário ────────────────────────────────

function CTAsResultado({
  resultado,
  params,
  onSalvar,
  onExportarPDF,
  gerandoPDF,
  onImportar,
}: {
  resultado: CalculadoraResultado;
  params: CalculadoraParams;
  onSalvar: () => void;
  onExportarPDF: () => void;
  gerandoPDF: boolean;
  onImportar: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const acesso = useCalculadoraAcesso();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-2 p-4 border-t border-border/40">
        <p className="text-xs text-muted-foreground text-center mb-1">
          Crie uma conta para salvar e exportar sua estimativa.
        </p>
        <Link to="/login?from=calculadora">
          <Button className="w-full gap-2">
            <Save className="h-4 w-4" /> Criar conta para salvar
          </Button>
        </Link>
        <Link to="/login?from=calculadora">
          <Button variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" /> Baixar PDF — Criar conta
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 border-t border-border/40">
      {acesso.salvar_estimativa ? (
        <Button onClick={onSalvar} className="w-full gap-2">
          <Save className="h-4 w-4" /> Salvar estimativa
          {acesso.limite_mensal !== null && (
            <span className="ml-auto text-[10px] opacity-70">
              {acesso.estimativas_usadas}/{acesso.limite_mensal}
            </span>
          )}
        </Button>
      ) : (
        <Button disabled className="w-full gap-2 opacity-60">
          <Save className="h-4 w-4" /> Salvar estimativa
          <span className="ml-auto text-[10px]">Plano limitado</span>
        </Button>
      )}

      {acesso.pdf ? (
        <Button variant="outline" className="w-full gap-2" onClick={onExportarPDF} disabled={gerandoPDF}>
          {gerandoPDF
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando PDF...</>
            : <><Download className="h-4 w-4" /> Baixar PDF</>}
        </Button>
      ) : (
        <Button variant="outline" disabled className="w-full gap-2 opacity-60">
          <Lock className="h-3.5 w-3.5" /> Baixar PDF — disponível no Pro
        </Button>
      )}

      <Button variant="outline" className="w-full gap-2" onClick={onImportar}>
        <ArrowRight className="h-4 w-4" /> Importar para obra no Lastra
      </Button>
    </div>
  );
}

// ── Modal: selecionar obra para importar ──────────────────────

function ModalImportarObra({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { obras } = useObras();
  const navigate = useNavigate();
  const ativas = obras.filter((o: any) => o.status !== 'concluida' && o.status !== 'cancelada');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <p className="font-bold text-sm">Selecionar obra</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">Escolha uma obra ativa para importar a estimativa como versão do orçamento.</p>

        {ativas.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">Nenhuma obra ativa encontrada.</p>
            <Button size="sm" onClick={() => navigate('/obras')} className="gap-2">
              <Building2 className="h-4 w-4" /> Criar obra
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {ativas.map((obra: any) => (
              <button
                key={obra.id}
                onClick={() => navigate(`/orcamento?obra=${obra.id}`)}
                className="w-full text-left px-4 py-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <p className="text-sm font-medium group-hover:text-primary transition-colors">{obra.nome}</p>
                {obra.endereco && <p className="text-xs text-muted-foreground mt-0.5 truncate">{obra.endereco}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function CalculadoraPublicaPage() {
  const { isAuthenticated, user } = useAuth();
  const { company } = useCompany();
  const { salvar } = useCalculadora();

  const [resultado, setResultado] = useState<CalculadoraResultado | null>(null);
  const [params, setParams] = useState<CalculadoraParams | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [importarOpen, setImportarOpen] = useState(false);

  const handleResultado = (r: CalculadoraResultado, p: CalculadoraParams) => {
    setResultado(r);
    setParams(p);
    setDrawerOpen(false);
  };

  const handleSalvar = async () => {
    if (!resultado || !params) return;
    await salvar({ params, resultado });
  };

  const handleExportarPDF = async () => {
    if (!resultado || !params) return;
    setGerandoPDF(true);
    try {
      await gerarPropostaPDF(resultado, params, {
        empresa_nome: (company as any)?.nome ?? undefined,
      });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header fixo ─────────────────────────────────────── */}
      <header className="h-14 border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-50 flex items-center px-4 gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Calculator className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm">Lastra</span>
        </Link>

        <p className="flex-1 text-center text-sm font-medium text-muted-foreground hidden sm:block">
          Calculadora de Orçamento Estimativo
        </p>

        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {(user?.email ?? 'U')[0].toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/login">
                <Button size="sm">Criar conta</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Corpo ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:flex-row">

        {/* Coluna esquerda: formulário (40%) */}
        <aside className="lg:w-[420px] lg:max-w-[420px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-border/40 bg-card">
          {/* Mobile: botão que abre drawer */}
          <div className="lg:hidden p-4">
            <Button className="w-full gap-2" onClick={() => setDrawerOpen(true)}>
              <Calculator className="h-4 w-4" />
              {resultado ? 'Refazer estimativa' : 'Calcular orçamento'}
            </Button>
          </div>

            {/* Desktop: formulário inline */}
            <div className="hidden lg:flex lg:flex-col overflow-y-auto h-[calc(100vh-56px)]">
              <DrawerCalculadoraEstimativa
                open={true}
                onOpenChange={() => {}}
                mode="publico"
                inline={true}
                onResultado={handleResultado}
              />
            </div>
        </aside>

        {/* Coluna direita: resultado (60%) */}
        <section className="flex-1 overflow-y-auto">
          {resultado && params ? (
            <div>
              <CalculadoraResultadoView
                resultado={resultado}
                params={params}
                modo="completo"
              />
              <CTAsResultado
                resultado={resultado}
                params={params}
                onSalvar={handleSalvar}
                onExportarPDF={handleExportarPDF}
                gerandoPDF={gerandoPDF}
                onImportar={() => setImportarOpen(true)}
              />
            </div>
          ) : (
            <ResultadoPlaceholder />
          )}
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Lastra — Sistema de Gestão de Obras</span>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Termos</Link>
          <button onClick={() => setFeedbackOpen(true)} className="hover:text-foreground transition-colors">Feedback</button>
        </div>
      </footer>

      {/* Drawer mobile */}
      <DrawerCalculadoraEstimativa
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="publico"
        onResultado={handleResultado}
      />
      <ModalFeedback origem="calculadora" open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      {importarOpen && (
        <ObrasProvider>
          <ModalImportarObra open={importarOpen} onClose={() => setImportarOpen(false)} />
        </ObrasProvider>
      )}
    </div>
  );
}
