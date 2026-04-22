import { addDays, getDay } from 'date-fns';

export interface CalendarConfig {
  dias_uteis: number[]; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  horas_por_dia: number;
}

export interface AmdahlParams {
  p: number; // Porcentagem paralelizada (ex: 0.8)
  f: number; // Fator de perda de coordenação (ex: 0.05)
}

export interface AmdahlResult {
  duracaoSugeridaDias: number;
  eficiencia: number;
  fatorParalelo: number;
  overhead: number;
}

export function contarDiasUteis(inicio: Date, fim: Date, calendar: CalendarConfig, feriadosStr: Set<string>, feriadosRecorrentes: Set<string> = new Set()): number {
  let count = 0;
  let d = new Date(inicio);
  while (d <= fim) {
    if (calendar.dias_uteis.includes(getDay(d))) {
      const dtStr = d.toISOString().split('T')[0];
      const mmdd = dtStr.substring(5);
      if (!feriadosStr.has(dtStr) && !feriadosRecorrentes.has(mmdd)) {
        count++;
      }
    }
    d = addDays(d, 1);
  }
  return count;
}

export function adicionarDiasUteis(inicio: Date, dias: number, calendar: CalendarConfig, feriadosStr: Set<string>, feriadosRecorrentes: Set<string> = new Set()): Date {
  if (dias <= 0) return inicio;
  let d = new Date(inicio);
  let added = 0;
  
  const isHoliday = (date: Date) => {
    const dtStr = date.toISOString().split('T')[0];
    const mmdd = dtStr.substring(5);
    return feriadosStr.has(dtStr) || feriadosRecorrentes.has(mmdd);
  };
  
  // Garantir que a data inicial seja considerada "dia 1" se for útil, se não for dia útil avança.
  while (!calendar.dias_uteis.includes(getDay(d)) || isHoliday(d)) {
    d = addDays(d, 1);
  }
  
  added = 1;
  while (added < Math.ceil(dias)) {
    d = addDays(d, 1);
    if (calendar.dias_uteis.includes(getDay(d)) && !isHoliday(d)) {
      added++;
    }
  }
  
  return d;
}

export function estimarTrabalhoBase(quantidadePrevista: number, diariaMesaOuPessoa: number): number {
  // Retorna total de Carga Base (em Dias) se apenas 1 equipe for alocada
  if (diariaMesaOuPessoa <= 0) return 0;
  return quantidadePrevista / diariaMesaOuPessoa; 
}

export function calcularAmdahl(
  trabalhoBaseDias: number, 
  nEquipes: number, 
  params: AmdahlParams, 
  horasPorDia: number // Serve para calibragem futuramente, ou para avisos
): AmdahlResult | null {
  // Guard de divisão por zero requisitado pelo usuário
  if (nEquipes <= 0 || params.p < 0 || params.f < 0 || horasPorDia <= 0 || trabalhoBaseDias <= 0) {
    return null; 
  }

  const P = params.p;
  const f = params.f;
  
  // Amdahl Extension: D(n) = D(1) * [ (1-P) + P/n ] * [ 1 + f * ((n-1)/n) ]
  const fatorParalelo = (1 - P) + (P / nEquipes);
  const overhead = 1 + f * ((nEquipes - 1) / nEquipes);
  const duracaoSugeridaDias = trabalhoBaseDias * fatorParalelo * overhead;
  
  const idealPerfeitoDias = trabalhoBaseDias / nEquipes;
  // Evitar divisões por número muito próximo de zero
  const eficiencia = duracaoSugeridaDias <= 0 ? 0 : (idealPerfeitoDias / duracaoSugeridaDias) * 100;
  
  return {
    duracaoSugeridaDias,
    eficiencia,
    fatorParalelo,
    overhead
  };
}
