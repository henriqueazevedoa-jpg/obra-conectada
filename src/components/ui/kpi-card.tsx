/**
 * KPICard — componente reutilizável de métrica.
 *
 * Anatomia (inspecionada em OrcamentoDashboard.tsx:558-573 + VISUAL.md § 6):
 *
 *   ┌──────────────────────────────────────┐
 *   │  [Icon 20px]   R$ 3.200,00           │  ← valor bold na cor semântica
 *   │                Total da obra         │  ← label 12px muted-foreground
 *   │                detalhe contextual    │  ← sublabel 10px (opcional)
 *   │                ████░░░░░░            │  ← barra de progresso 3px (opcional)
 *   └──────────────────────────────────────┘
 *
 * Layout interno: flex items-start gap-3 (ícone à esq., texto em coluna)
 * Container:      rounded-xl p-4 border — bg e border na cor semântica do estado
 *
 * USO:
 *   <KPICard
 *     icon={<TrendingUp className="h-5 w-5" style={{ color: '#534AB7' }} />}
 *     value="78%"
 *     label="Progresso geral"
 *     bg="bg-[#F3F2FD]"
 *     border="border-[#AFA9EC]"
 *     color="text-[#3C3489]"
 *     main
 *     progress={78}
 *     progressColor="#534AB7"
 *   />
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  /** Ícone Lucide de 20px (h-5 w-5). A cor do ícone deve ser passada via style inline no próprio ícone. */
  icon: ReactNode;
  /** Valor principal formatado — exibido acima do label (destaque visual) */
  value: string;
  /** Rótulo descritivo exibido abaixo do valor */
  label: string;
  /** Classe Tailwind/arbitrária de fundo. Ex: "bg-[#F3F2FD]", "bg-primary/8" */
  bg: string;
  /** Classe Tailwind/arbitrária de borda. Ex: "border-[#AFA9EC]", "border-primary/12" */
  border: string;
  /** Classe Tailwind de cor aplicada ao valor. Ex: "text-[#3C3489]", "text-primary" */
  color: string;
  /** Card principal — valor em 22px (vs 20px padrão) */
  main?: boolean;
  /** Linha contextual de 10px exibida abaixo do valor */
  sublabel?: string;
  /** 0-100 para exibir barra de progresso de 3px abaixo do sublabel */
  progress?: number;
  /** Cor hex da barra de progresso. Default: #534AB7 */
  progressColor?: string;
  /** Classe CSS extra para o card inteiro */
  className?: string;
}

export function KPICard({
  icon,
  value,
  label,
  bg,
  border,
  color,
  main = false,
  sublabel,
  progress,
  progressColor = '#534AB7',
  className,
}: KPICardProps) {
  return (
    <div className={cn('rounded-xl p-3 border flex items-start gap-2.5', bg, border, className)}>
      {/* Ícone — cor definida via style inline no ícone pai */}
      <div className="mt-0.5 shrink-0">
        {icon}
      </div>
      {/* Texto em coluna */}
      <div className="flex-1 min-w-0">
        {/* Valor principal */}
        <div
          className={cn('font-bold leading-none tabular-nums', color, main ? 'text-[20px]' : 'text-[16px]')}
        >
          {value}
        </div>
        {/* Label */}
        <div className="text-xs text-muted-foreground mt-1 leading-tight">
          {label}
        </div>
        {/* Sublabel contextual */}
        {sublabel && (
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
            {sublabel}
          </div>
        )}
        {/* Barra de progresso */}
        {progress !== undefined && (
          <div className="mt-1 h-[3px] rounded-full bg-black/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: progressColor,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * KPIGrid — container de grid para KPICards (VISUAL.md § 6).
 *
 * 2 colunas em mobile, 4 colunas em lg+.
 * Inclui padding e border-bottom para uso como faixa sticky abaixo do header L1.
 */
export function KPIGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 lg:grid-cols-4 gap-2.5',
        'px-4 py-2.5',
        'border-b border-border',
        'bg-[var(--color-background-primary)]',
        className
      )}
    >
      {children}
    </div>
  );
}
