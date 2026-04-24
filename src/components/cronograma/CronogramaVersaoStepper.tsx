/**
 * CronogramaVersaoStepper
 *
 * Exibe o stepper de fases (Estimativo → Analítico → Execução)
 * e um seletor dropdown de versões disponíveis para a fase ativa.
 *
 * Comportamento:
 *   - Fases já criadas: clicável, ativa a versão mais recente daquela fase
 *   - Fase seguinte disponível: botão "Avançar" cria nova versão
 *   - Fase futura (ainda bloqueada): desabilitada visualmente
 */

import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Check, Lock,
  BarChart3, TrendingUp, Hammer,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CronogramaVersao, TipoCronogramaVersao } from '@/hooks/useCronogramaVersoes';

// ── Config das fases ─────────────────────────────────────────────────────────

const FASES: {
  tipo: TipoCronogramaVersao;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  cor: string;
  corAtiva: string;
}[] = [
  {
    tipo: 'estimativo',
    label: 'Estimativo',
    sublabel: 'Datas e durações preliminares',
    icon: <BarChart3 style={{ width: 13, height: 13 }} />,
    cor: '#888780',
    corAtiva: '#534AB7',
  },
  {
    tipo: 'analitico',
    label: 'Analítico',
    sublabel: 'Recursos e predecessores',
    icon: <TrendingUp style={{ width: 13, height: 13 }} />,
    cor: '#888780',
    corAtiva: '#185FA5',
  },
  {
    tipo: 'execucao',
    label: 'Execução',
    sublabel: 'Medição de avanço real',
    icon: <Hammer style={{ width: 13, height: 13 }} />,
    cor: '#888780',
    corAtiva: '#3B6D11',
  },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface CronogramaVersaoStepperProps {
  versoes: CronogramaVersao[];
  versaoAtiva: CronogramaVersao | null;
  onSelectVersao: (versao: CronogramaVersao) => void;
  onCriarVersao: (tipo: TipoCronogramaVersao) => Promise<void>;
  loading?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CronogramaVersaoStepper({
  versoes,
  versaoAtiva,
  onSelectVersao,
  onCriarVersao,
  loading = false,
}: CronogramaVersaoStepperProps) {
  const [criando, setCriando] = useState<TipoCronogramaVersao | null>(null);

  // Agrupar versões por tipo
  const porTipo = (tipo: TipoCronogramaVersao) =>
    versoes.filter(v => v.tipo === tipo && v.status !== 'arquivado');

  // Determinar qual é o próximo tipo disponível para criar
  const temEstimativo = porTipo('estimativo').length > 0;
  const temAnalitico = porTipo('analitico').length > 0;

  const proximoTipo = (): TipoCronogramaVersao | null => {
    if (!temEstimativo) return 'estimativo';
    if (!temAnalitico) return 'analitico';
    if (porTipo('execucao').length === 0) return 'execucao';
    return null;
  };

  const handleCriar = async (tipo: TipoCronogramaVersao) => {
    setCriando(tipo);
    await onCriarVersao(tipo);
    setCriando(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {FASES.map((fase, idx) => {
        const fasesDisponiveis = porTipo(fase.tipo);
        const temFase = fasesDisponiveis.length > 0;
        const eAtiva = versaoAtiva?.tipo === fase.tipo;
        const isProximo = proximoTipo() === fase.tipo;
        const isBloqueada = !temFase && !isProximo;
        const isCriandoEsta = criando === fase.tipo;

        return (
          <div key={fase.tipo} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Separador → */}
            {idx > 0 && (
              <ChevronRight
                style={{
                  width: 12, height: 12,
                  color: 'var(--color-text-secondary)',
                  opacity: 0.4, flexShrink: 0,
                }}
              />
            )}

            {/* Fase já tem versão: mostra badge + seletor */}
            {temFase ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      height: 26,
                      padding: '0 8px',
                      borderRadius: 6,
                      border: eAtiva
                        ? `1px solid ${fase.corAtiva}40`
                        : '1px solid transparent',
                      background: eAtiva
                        ? `${fase.corAtiva}12`
                        : 'transparent',
                      color: eAtiva ? fase.corAtiva : 'var(--color-text-secondary)',
                      fontSize: 11,
                      fontWeight: eAtiva ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: eAtiva ? fase.corAtiva : '#888780' }}>
                      {fase.icon}
                    </span>
                    {fase.label}
                    {eAtiva && versaoAtiva && fasesDisponiveis.length > 1 && (
                      <ChevronDown style={{ width: 10, height: 10 }} />
                    )}
                    {eAtiva && (
                      <Check style={{ width: 10, height: 10, color: fase.corAtiva }} />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" style={{ minWidth: 220 }}>
                  <div style={{
                    padding: '4px 10px 6px',
                    fontSize: 10,
                    color: 'var(--color-text-secondary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {fase.label} — {fasesDisponiveis.length} versão{fasesDisponiveis.length > 1 ? 'ões' : ''}
                  </div>
                  {fasesDisponiveis.map(v => (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => onSelectVersao(v)}
                      style={{
                        fontWeight: v.id === versaoAtiva?.id ? 600 : 400,
                        color: v.id === versaoAtiva?.id ? fase.corAtiva : undefined,
                      }}
                    >
                      <span style={{ flex: 1 }}>{v.nome}</span>
                      {v.id === versaoAtiva?.id && (
                        <Check style={{ width: 12, height: 12, color: fase.corAtiva }} />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleCriar(fase.tipo)}
                    disabled={isCriandoEsta}
                  >
                    <Plus style={{ width: 12, height: 12, marginRight: 6 }} />
                    Nova versão {fase.label.toLowerCase()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isProximo ? (
              /* Próxima fase: botão de avanço */
              <button
                onClick={() => handleCriar(fase.tipo)}
                disabled={isCriandoEsta || loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  height: 26,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px dashed rgba(83,74,183,0.3)',
                  background: 'transparent',
                  color: '#534AB7',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: isCriandoEsta ? 'not-allowed' : 'pointer',
                  opacity: isCriandoEsta ? 0.6 : 1,
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus style={{ width: 11, height: 11 }} />
                {isCriandoEsta ? 'Criando…' : `Iniciar ${fase.label}`}
              </button>
            ) : (
              /* Fase bloqueada */
              <button
                disabled
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  height: 26,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: 11,
                  fontWeight: 400,
                  opacity: 0.4,
                  cursor: 'not-allowed',
                  whiteSpace: 'nowrap',
                }}
              >
                <Lock style={{ width: 10, height: 10 }} />
                {fase.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
