export type IntelType = "opportunity" | "threat";
export type IntelStatus = "new" | "triaged" | "acting" | "closed";
export type IntelSource = "ai_scan" | "manual" | "import" | "feed";
export type ReviewStatus = "unreviewed" | "reviewed" | "rejected";

export type ActionType = "develop" | "leverage" | "mitigate" | "monitor";
export type ActionStatus = "draft" | "planned" | "in_progress" | "done";

export type SourceCheckStatus =
  | "unchecked"
  | "aligned"
  | "partial"
  | "misaligned"
  | "unreachable";

export type RunStatus = "running" | "completed" | "failed";

export interface IntelItem {
  id: string;
  user_id: string | null;
  title: string;
  type: IntelType;
  description: string | null;
  source_url: string | null;
  priority_score: number;
  status: IntelStatus;
  recommendation: string | null;
  confidence: number | null;
  source: IntelSource;
  review_status: ReviewStatus;
  research_run_id: string | null;
  created_at: string;
  source_check_status?: SourceCheckStatus | null;
  source_check_notes?: string | null;
  source_checked_at?: string | null;
  category?: string | null;
}

export interface Watchlist {
  id: string;
  topic: string;
  category: string | null;
  enabled: boolean;
  created_at: string;
}

export interface Action {
  id: string;
  user_id: string | null;
  intel_item_id: string;
  title: string;
  description: string | null;
  action_type: ActionType | null;
  status: ActionStatus;
  assignee_name: string | null;
  assignee_role: string | null;
  due_date: string | null;
  created_at: string;
}

export interface ResearchRun {
  id: string;
  user_id: string | null;
  query: string;
  status: RunStatus;
  result_count: number;
  created_at: string;
}

export interface IntelItemWithActions extends IntelItem {
  actions: Action[];
}

export const INTEL_STATUSES: IntelStatus[] = ["new", "triaged", "acting", "closed"];
export const ACTION_STATUSES: ActionStatus[] = ["draft", "planned", "in_progress", "done"];
export const ACTION_TYPES: ActionType[] = ["develop", "leverage", "mitigate", "monitor"];
export const INTEL_TYPES: IntelType[] = ["opportunity", "threat"];

export const ASSIGNEE_ROLES = [
  "sales",
  "marketing",
  "R&D",
  "service",
  "BD",
  "product specialist",
  "field application scientist",
] as const;

export const SOURCE_CHECK_LABELS: Record<SourceCheckStatus, string> = {
  unchecked: "Source not checked",
  aligned: "Source aligned",
  partial: "Partly aligned",
  misaligned: "Source misaligned",
  unreachable: "Source unreachable",
};

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  acting: "Acting",
  closed: "Closed",
  draft: "Draft",
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
};
