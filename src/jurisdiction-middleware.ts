import { Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JurisdictionContext {
  primary: any;
  all: any[];
  getRule: (module: string, key: string) => Promise<any>;
  isEnabled: (featureCode: string) => Promise<boolean>;
}

interface JurisdictionRequest extends Request {
  jurisdiction?: JurisdictionContext;
  user?: {
    id: string;
    org_id: string;
    role: string;
    [key: string]: any;
  };
}

// ---------------------------------------------------------------------------
// getJurisdictionRule
// ---------------------------------------------------------------------------

/**
 * Get a specific rule for an org's jurisdiction.
 *
 * 1. Resolve the org's primary jurisdiction from org_jurisdictions.
 * 2. Look up the rule in jurisdiction_rules for that jurisdiction.
 * 3. Fallback: look up jurisdiction_rules where code = 'GLOBAL'.
 * 4. Return the parsed rule_value, or null if not found.
 */
// JURISDICTION_DEPENDENT
async function getJurisdictionRule(
  orgId: string,
  module: string,
  ruleKey: string
): Promise<any> {
  // 1. Get org's primary jurisdiction
  const { data: orgJur, error: ojErr } = await supabase
    .from("org_jurisdictions")
    .select("jurisdiction_id, jurisdictions(*)")
    .eq("org_id", orgId)
    .eq("is_primary", true)
    .single(); // JURISDICTION_DEPENDENT

  if (ojErr || !orgJur) {
    // No primary jurisdiction configured — try GLOBAL fallback directly
    return await getGlobalFallbackRule(module, ruleKey);
  }

  const jurisdictionId = orgJur.jurisdiction_id;

  // 2. Look up rule in jurisdiction_rules for the primary jurisdiction
  const { data: rule, error: ruleErr } = await supabase
    .from("jurisdiction_rules")
    .select("*")
    .eq("jurisdiction_id", jurisdictionId)
    .eq("module", module)
    .eq("rule_key", ruleKey)
    .single(); // JURISDICTION_DEPENDENT

  if (!ruleErr && rule) {
    return parseRuleValue(rule.rule_value);
  }

  // 3. Fallback: GLOBAL jurisdiction
  return await getGlobalFallbackRule(module, ruleKey); // JURISDICTION_DEPENDENT
}

/**
 * Internal helper — resolve a rule from the GLOBAL jurisdiction.
 */
async function getGlobalFallbackRule(
  module: string,
  ruleKey: string
): Promise<any> {
  // Find the GLOBAL jurisdiction
  const { data: globalJur } = await supabase
    .from("jurisdictions")
    .select("id")
    .eq("code", "GLOBAL")
    .single(); // JURISDICTION_DEPENDENT

  if (!globalJur) return null;

  const { data: rule } = await supabase
    .from("jurisdiction_rules")
    .select("*")
    .eq("jurisdiction_id", globalJur.id)
    .eq("module", module)
    .eq("rule_key", ruleKey)
    .single(); // JURISDICTION_DEPENDENT

  return rule ? parseRuleValue(rule.rule_value) : null;
}

/**
 * Attempt to JSON-parse a rule_value; return as-is if not valid JSON.
 */
function parseRuleValue(value: any): any {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// isFeatureEnabled
// ---------------------------------------------------------------------------

/**
 * Check if a feature is enabled for an org.
 *
 * 1. Look up the feature_gate by feature_code.
 * 2. Check feature_gate_status for the org + primary jurisdiction.
 * 3. If requires_legal_review and no APPROVED legal_review -> false.
 * 4. If no status entry -> return default_enabled from feature_gates.
 * 5. Return the enabled boolean.
 */
// JURISDICTION_DEPENDENT
async function isFeatureEnabled(
  orgId: string,
  featureCode: string
): Promise<boolean> {
  // 1. Look up the feature gate definition
  const { data: gate, error: gateErr } = await supabase
    .from("feature_gates")
    .select("*")
    .eq("feature_code", featureCode)
    .single(); // JURISDICTION_DEPENDENT

  if (gateErr || !gate) {
    return false;
  }

  // Resolve org's primary jurisdiction
  const { data: orgJur } = await supabase
    .from("org_jurisdictions")
    .select("jurisdiction_id")
    .eq("org_id", orgId)
    .eq("is_primary", true)
    .single(); // JURISDICTION_DEPENDENT

  if (!orgJur) {
    // No jurisdiction configured — fall back to gate default
    return gate.default_enabled ?? false; // JURISDICTION_DEPENDENT
  }

  const jurisdictionId = orgJur.jurisdiction_id;

  // 2. Check feature_gate_status for org + jurisdiction
  const { data: status } = await supabase
    .from("feature_gate_status")
    .select("*")
    .eq("feature_gate_id", gate.id)
    .eq("org_id", orgId)
    .eq("jurisdiction_id", jurisdictionId)
    .single(); // JURISDICTION_DEPENDENT

  // 4. No status entry — return default_enabled
  if (!status) {
    return gate.default_enabled ?? false; // JURISDICTION_DEPENDENT
  }

  // 3. If requires_legal_review, verify an APPROVED legal_review exists
  if (gate.requires_legal_review) {
    const { data: review } = await supabase
      .from("legal_reviews")
      .select("id, status")
      .eq("org_id", orgId)
      .eq("jurisdiction_id", jurisdictionId)
      .eq("feature_code", featureCode)
      .eq("status", "APPROVED")
      .limit(1)
      .single(); // JURISDICTION_DEPENDENT

    if (!review) {
      return false; // JURISDICTION_DEPENDENT
    }
  }

  // 5. Return the explicit enabled boolean
  return status.enabled ?? false; // JURISDICTION_DEPENDENT
}

// ---------------------------------------------------------------------------
// getOrgJurisdictions
// ---------------------------------------------------------------------------

/**
 * Get all jurisdictions linked to an org.
 */
// JURISDICTION_DEPENDENT
async function getOrgJurisdictions(orgId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("org_jurisdictions")
    .select("*, jurisdictions(*)")
    .eq("org_id", orgId); // JURISDICTION_DEPENDENT

  if (error || !data) {
    return [];
  }

  return data;
}

// ---------------------------------------------------------------------------
// Express Middleware — jurisdictionContext
// ---------------------------------------------------------------------------

/**
 * Express middleware that injects jurisdiction context into every request.
 *
 * Attaches `req.jurisdiction` with:
 *   - primary:   the primary jurisdiction object
 *   - all:       all jurisdiction objects for the org
 *   - getRule:   (module, key) => getJurisdictionRule(orgId, module, key)
 *   - isEnabled: (featureCode) => isFeatureEnabled(orgId, featureCode)
 */
// JURISDICTION_DEPENDENT
async function jurisdictionContext(
  req: JurisdictionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const orgId = req.user?.org_id;

  if (!orgId) {
    // No authenticated org context — skip jurisdiction enrichment
    next();
    return;
  }

  try {
    const allJurisdictions = await getOrgJurisdictions(orgId); // JURISDICTION_DEPENDENT

    const primaryEntry = allJurisdictions.find(
      (j: any) => j.is_primary === true
    );
    const primary = primaryEntry?.jurisdictions ?? null; // JURISDICTION_DEPENDENT

    req.jurisdiction = {
      primary,
      all: allJurisdictions.map((j: any) => j.jurisdictions), // JURISDICTION_DEPENDENT
      getRule: (module: string, key: string) =>
        getJurisdictionRule(orgId, module, key), // JURISDICTION_DEPENDENT
      isEnabled: (featureCode: string) =>
        isFeatureEnabled(orgId, featureCode), // JURISDICTION_DEPENDENT
    };

    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  getJurisdictionRule,
  isFeatureEnabled,
  getOrgJurisdictions,
  jurisdictionContext,
};
