// ============================================================
// CalculadoraResultadoView — Exibe resultado completo
// Sprint 5 / Bloco 14
// ============================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Download, Save, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatarMoeda, METODO_LABELS } from '@/lib/calculadora-engine';
import type { CalculadoraResultado, CalculadoraParams } from '@/types/calculadora';

// ── Props ─────────────────────────────────────────────────────

interface Props {
  resultado: CalculadoraResultado;
  params: CalculadoraParams;
  modo: 'completo' | 'preview';
  onSalvar?: () => void;
  onExportarPDF?: () => void;
  onImportarObra?: () => void;
}

// ── Helper: Seção colapsável ──────────────────────────────────

function Secao({
  titulo, subtotal, children, defaultOpen = true,
}: {
  titulo: string; subtotal?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <span className="text-sm font-semibold">{titulo}</span>
        <div className="flex items-center gap-3">
          {subtotal !== undefined && (
            <span className="text-sm font-bold text-primary">{formatarMoeda(subtotal)}</span>
          )}
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ── Helper: Tabela de etapas ──────────────────────────────────

function TabelaEtapas({ etapas }: { etapas: CalculadoraResultado['etapas_base'] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border/30">
          <th className="text-left py-1.5 font-medium text-muted-foreground">Etapa</th>
          <th className="text-right py-1.5 font-medium text-muted-foreground w-16">%</th>
          <th className="text-right py-1.5 font-medium text-muted-foreground w-28">Valor</th>
        </tr>
      </thead>
      <tbody>
        {etapas.map((e, i) => (
          <tr key={i} className="border-b border-border/20 last:border-0">
            <td className="py-1.5 pr-2">{e.nome}</td>
            <td className="py-1.5 text-right text-muted-foreground">{e.percentual_ajustado.toFixed(1)}%</td>
            <td className="py-1.5 text-right font-medium">{formatarMoeda(e.valor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Gantt SVG ─────────────────────────────────────────────────

function GanttSVG({ cronograma, prazo }: {
  cronograma: CalculadoraResultado['cronograma'];
  prazo: number;
}) {
  if (!cronograma.length) return null;
  const ROW_H = 32;
  const HEADER_H = 28;
  const MARGIN_L = 110;
  const WIDTH = 600;
  const CHART_W = WIDTH - MARGIN_L - 8;
  const height = cronograma.length * ROW_H + HEADER_H;

  // Marcações a cada 4 semanas
  const ticks: number[] = [];
  for (let w = 0; w <= prazo; w += 4) ticks.push(w);
  if (!ticks.includes(prazo)) ticks.push(prazo);

  const xFor = (w: number) => MARGIN_L + (w / prazo) * CHART_W;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" style={{ minHeight: height }}>
      {/* Grid lines */}
      {ticks.map(w => (
        <g key={w}>
          <line x1={xFor(w)} y1={HEADER_H} x2={xFor(w)} y2={height} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
          <text x={xFor(w)} y={HEADER_H - 6} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>
            {w}s
          </text>
        </g>
      ))}

      {/* Barras */}
      {cronograma.map((etapa, i) => {
        const y = HEADER_H + i * ROW_H + 4;
        const x1 = xFor(etapa.inicio_semana - 1);
        const x2 = xFor(etapa.fim_semana);
        const bw = Math.max(4, x2 - x1);
        const duracao = etapa.fim_semana - etapa.inicio_semana + 1;
        return (
          <g key={i}>
            {/* Label à esquerda */}
            <text
              x={MARGIN_L - 6}
              y={y + 14}
              textAnchor="end"
              fontSize={9}
              fill="currentColor"
              opacity={0.7}
            >
              {etapa.nome.length > 16 ? etapa.nome.slice(0, 15) + '…' : etapa.nome}
            </text>
            {/* Barra */}
            <rect x={x1} y={y} width={bw} height={20} rx={4} fill="hsl(var(--primary))" opacity={0.75} />
            {/* Label dentro da barra */}
            {bw > 24 && (
              <text x={x1 + bw / 2} y={y + 14} textAnchor="middle" fontSize={8} fill="white" fontWeight="600">
                {duracao}s
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────

export default function CalculadoraResultadoView({
  resultado, params, modo, onSalvar, onExportarPDF, onImportarObra,
}: Props) {
  const [gerandoPDF, setGerandoPDF] = useState(false);

  const handlePDF = async () => {
    if (!onExportarPDF) return;
    setGerandoPDF(true);
    try { await onExportarPDF(); }
    finally { setGerandoPDF(false); }
  };
  const totalEtapas = resultado.etapas_base.reduce((s, e) => s + e.valor, 0);
  const totalSinapi = resultado.etapas_sinapi.reduce((s, e) => s + e.valor, 0);
  const totalAdicionais = resultado.etapas_adicionais.reduce((s, e) => s + e.valor, 0);
  const fatorCombinado = Object.values(resultado.fatores).reduce((p, f) => p * f, 1);
  const meses = Math.round(resultado.prazo_semanas / 4.3);

  // Faixa visual: posição do ponto no slider
  const range = resultado.faixa_maxima - resultado.faixa_minima;
  const posPct = range > 0
    ? ((resultado.custo_total - resultado.faixa_minima) / range) * 100
    : 50;

  return (
    <div className="space-y-4 p-4">

      {/* ── Faixa de valores ─────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estimativa</p>
          <Badge variant="outline" className="text-[10px]">{METODO_LABELS[resultado.metodo]}</Badge>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{formatarMoeda(resultado.custo_total)}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatarMoeda(resultado.valor_m2_resultante)} / m²
          </p>
        </div>

        {/* Barra de faixa */}
        <div className="space-y-1">
          <div className="relative h-3 bg-muted rounded-full overflow-visible">
            <div
              className="absolute inset-y-0 left-0 bg-primary/20 rounded-full"
              style={{ width: `${posPct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background shadow-md"
              style={{ left: `calc(${posPct}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatarMoeda(resultado.faixa_minima)}</span>
            <span>{formatarMoeda(resultado.faixa_maxima)}</span>
          </div>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Precisão típica ±10% · CUB {resultado.estado}
        </p>
      </div>

      {/* ── Resumo financeiro ────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Resumo Financeiro</p>
        {[
          ['Custo de Construção', resultado.custo_construcao_bruto],
          [`BDI (${params.bdi_percentual ?? 20}%)`, resultado.bdi_valor],
          [`Contingência (${params.contingencia_percentual ?? 5}%)`, resultado.contingencia_valor],
        ].map(([label, valor]) => (
          <div key={String(label)} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{formatarMoeda(Number(valor))}</span>
          </div>
        ))}

        {resultado.custos_adicionais_valor > 0 && (
          <>
            <div className="border-t border-border/30 pt-2 mt-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Custo do Empreendimento</p>
              {resultado.etapas_adicionais.map((e, i) => (
                <div key={i} className="flex justify-between text-xs py-0.5">
                  <span className="text-muted-foreground">{e.nome}</span>
                  <span>{formatarMoeda(e.valor)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-border/30 pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span className="text-primary">{formatarMoeda(resultado.custo_total)}</span>
        </div>

        {resultado.preco_venda_sugerido && (
          <div className="flex justify-between text-sm pt-1 border-t border-border/30">
            <span className="text-muted-foreground">Preço de venda sugerido (+30%)</span>
            <span className="font-semibold">{formatarMoeda(resultado.preco_venda_sugerido)}</span>
          </div>
        )}
      </div>

      {/* ── Distribuição por etapas ──────────────────────────── */}
      <Secao titulo="Custo Base da Construção" subtotal={totalEtapas}>
        <TabelaEtapas etapas={resultado.etapas_base} />
      </Secao>

      {resultado.etapas_sinapi.length > 0 && (
        <Secao titulo="Instalações SINAPI" subtotal={totalSinapi}>
          <TabelaEtapas etapas={resultado.etapas_sinapi} />
        </Secao>
      )}

      {resultado.etapas_adicionais.length > 0 && (
        <Secao titulo="Custos Adicionais" subtotal={totalAdicionais}>
          <TabelaEtapas etapas={resultado.etapas_adicionais} />
        </Secao>
      )}

      {/* ── Cronograma ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cronograma Estimado</p>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] dark:bg-amber-950/20 dark:text-amber-400">
            Duração aproximada
          </Badge>
        </div>
        <p className="text-sm font-semibold">
          {resultado.prazo_semanas} semanas{meses > 0 ? ` (~${meses} meses)` : ''}
        </p>
        <GanttSVG cronograma={resultado.cronograma} prazo={resultado.prazo_semanas} />
      </div>

      {/* ── Fatores aplicados (colapsado) ───────────────────── */}
      <Secao titulo="Ver detalhes do cálculo" defaultOpen={false}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-1.5 font-medium text-muted-foreground">Parâmetro</th>
              <th className="text-right py-1.5 font-medium text-muted-foreground">Fator</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Estrutura', resultado.fatores.estrutura],
              ['Pavimentos', resultado.fatores.pavimentos],
              ['Topografia', resultado.fatores.topografia],
              ['Fundação', resultado.fatores.fundacao],
              ['Cobertura', resultado.fatores.cobertura],
              ['Padrão', resultado.fatores.padrao],
              ['Sistemas', resultado.fatores.sistemas_especiais],
              ['Acesso', resultado.fatores.acesso],
            ].map(([label, valor]) => (
              <tr key={String(label)} className="border-b border-border/20 last:border-0">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right font-mono">×{Number(valor).toFixed(3)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border/40 font-bold">
              <td className="py-2">Fator combinado</td>
              <td className="py-2 text-right font-mono text-primary">×{fatorCombinado.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </Secao>

      {/* ── Botões de ação ────────────────────────────────────── */}
      {modo === 'completo' && (onSalvar || onExportarPDF || onImportarObra) && (
        <div className="flex flex-col gap-2 pt-2">
          {onSalvar && (
            <Button onClick={onSalvar} className="w-full gap-2">
              <Save className="h-4 w-4" /> Salvar estimativa
            </Button>
          )}
          {onExportarPDF && (
            <Button onClick={handlePDF} variant="outline" className="w-full gap-2" disabled={gerandoPDF}>
              {gerandoPDF
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                : <><Download className="h-4 w-4" /> Baixar PDF</>}
            </Button>
          )}
          {onImportarObra && (
            <Button onClick={onImportarObra} variant="outline" className="w-full gap-2">
              <ArrowRight className="h-4 w-4" /> Importar para obra no Lastra
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
