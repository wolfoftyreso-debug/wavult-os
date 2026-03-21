// ---------------------------------------------------------------------------
// Non-Conformance types
// ---------------------------------------------------------------------------
export type NCSeverity = "OBSERVATION" | "MINOR" | "MAJOR" | "CRITICAL";

export type NCStatus =
  | "OPEN"
  | "ANALYZING"
  | "ACTION_PLANNED"
  | "IMPLEMENTING"
  | "VERIFYING"
  | "CLOSED";

// ---------------------------------------------------------------------------
// PDCA Improvement cycle
// ---------------------------------------------------------------------------
export type PDCAPhase = "PLAN" | "DO" | "CHECK" | "ACT";

// ---------------------------------------------------------------------------
// Risk assessment
// ---------------------------------------------------------------------------
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ---------------------------------------------------------------------------
// Compliance requirement status
// ---------------------------------------------------------------------------
export type RequirementStatus = "OK" | "PARTIAL" | "FAIL" | "NA";
