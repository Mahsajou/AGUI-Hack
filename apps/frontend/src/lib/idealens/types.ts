/** Shared types for standalone IdeaLens API + UI. */

export type DesignSystemStatus =
  | "not_connected"
  | "fetching"
  | "awaiting_confirm"
  | "ready"
  | "error";

/** How the user linked the design system (no PAT required for this flow). */
export type DesignSystemLinkKind = "figma_file_url" | "figma_mcp";

export interface FigmaSnapshot {
  linkKind: DesignSystemLinkKind;
  fileName: string;
  syncedAt: string;
  summary: string;
  /** From REST fetch when PAT used later; empty when only URL/MCP is linked */
  componentNames: string[];
  /** Set when linkKind is figma_file_url */
  fileUrl?: string;
  /** Parsed key when derivable from fileUrl */
  fileKey?: string;
  /** Set when linkKind is figma_mcp */
  mcpUrl?: string;
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
