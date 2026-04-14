export type PlanFeatures = {
  gantt_view: boolean;
  gantt_edit: boolean;
  gantt_history: boolean;
  gantt_baseline: boolean;
  gantt_baseline_edit: boolean;
  gantt_dependencies: boolean;
};

export const DEFAULT_PLAN_FEATURES: PlanFeatures = {
  gantt_view: false,
  gantt_edit: false,
  gantt_history: false,
  gantt_baseline: false,
  gantt_baseline_edit: false,
  gantt_dependencies: false,
};
