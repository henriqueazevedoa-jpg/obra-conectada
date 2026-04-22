import { addDays, startOfWeek, endOfWeek, isMonday } from 'date-fns';

/**
 * Retorna as datas de Início (Segunda, 00:00:00) e Fim (Sexta, 23:59:59)
 * correspondentes à PRÓXIMA semana.
 * Regra de negócio: Se hoje já for segunda-feira, a "próxima semana" ainda 
 * será a semana que vem, e não a semana vigente.
 */
export function getProximaSemanaRange(referencia: Date = new Date()): { inicio: Date; fim: Date } {
  // Encontra a segunda-feira da semana de referência
  // weekStartsOn: 1 (Segunda-feira)
  let inicioEstaSemana = startOfWeek(referencia, { weekStartsOn: 1 });
  
  // A próxima segunda sempre será +7 dias a partir do início da semana corrente
  let inicioProximaSegunda = addDays(inicioEstaSemana, 7);
  
  // inicio: Próxima segunda, 00:00:00
  inicioProximaSegunda.setHours(0, 0, 0, 0);

  // fim: Sexta-feira da próxima semana (+4 dias da segunda), 23:59:59
  let fimProximaSexta = addDays(inicioProximaSegunda, 4);
  fimProximaSexta.setHours(23, 59, 59, 999);

  return {
    inicio: inicioProximaSegunda,
    fim: fimProximaSexta
  };
}
