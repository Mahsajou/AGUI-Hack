/** Shared types for standalone IdeaLens API + UI. */

export type DesignSystemStatus =
  | "not_connected"
  | "fetching"
  | "awaiting_confirm"
  | "ready"
  | "error";

export interface FigmaSnapshot {
  fileKey: string;
  fileName: string;
  componentNames: string[];
  syncedAt: string;
  /** Short human summary for confirm step */
  summary: string;
}

export interface AssumptionItem {
  text: string;
  confidence: "known" | "guessing" | "unknown";
}

export interface ResearchOutput {
  assumptions: AssumptionItem[];
  open_questions: string[];
  risk_flags: string[];
}

export interface ConceptSketchOutput {
  concept_name: string;
  primary_surface: string;
  components_used: string[];
  user_flow: string[];
  key_interactions: string[];
  open_design_questions: string[];
}

export interface SetupRequiredPayload {
  setup_required: true;
  headline: string;
  body: string;
  cta_href: string;
  cta_label: string;
}
