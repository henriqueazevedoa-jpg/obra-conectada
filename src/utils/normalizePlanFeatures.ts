import { PlanFeatures, DEFAULT_PLAN_FEATURES } from '@/types/planFeatures';

export function normalizePlanFeatures(rawFeatures: unknown): PlanFeatures {
  if (!rawFeatures || typeof rawFeatures !== 'object') {
    return { ...DEFAULT_PLAN_FEATURES };
  }

  const raw = rawFeatures as Record<string, unknown>;

  return {
    gantt_view: raw.gantt_view === true,
    gantt_edit: raw.gantt_edit === true,
    gantt_history: raw.gantt_history === true,
    gantt_baseline: raw.gantt_baseline === true,
    gantt_dependencies: raw.gantt_dependencies === true,
  };
}
