/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Campaign taxonomy and validation types
 */

export interface CampaignRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  required: boolean;
  weight: number;
  errorMessage: string;
  examples: string[];
}

export interface CampaignValidationResult {
  campaignName: string;
  isValid: boolean;
  score: number;
  maxScore: number;
  violations: RuleViolation[];
  suggestions: string[];
  platform?: string;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: 'error' | 'warning';
  suggestion: string;
  weight: number;
}

export interface CampaignTaxonomy {
  id: string;
  name: string;
  description: string;
  rules: CampaignRule[];
  platforms: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidateCampaignRequest {
  campaignName: string;
  platform?: string;
  taxonomyId?: string;
}

export interface ValidateCampaignResponse {
  result: CampaignValidationResult;
  quickFixes: QuickFix[];
}

export interface QuickFix {
  id: string;
  description: string;
  suggestedName: string;
  confidence: number;
}

export interface CreateRuleRequest {
  name: string;
  description: string;
  pattern: string;
  required: boolean;
  weight: number;
  errorMessage: string;
  examples: string[];
}

export interface CreateTaxonomyRequest {
  name: string;
  description: string;
  platforms: string[];
  rules: CreateRuleRequest[];
}

/**
 * Enhanced Rule Maker Types
 */

export interface TokenPosition {
  id: string;
  position: number;
  name: string;
  description: string;
  required: boolean;
  allowedValues: string[];
  formatPattern?: string; // Regex pattern for format validation
  formatDescription?: string; // Human-readable format description
  separator: string;
  synonyms: Record<string, string[]>;
  conditionalRules: ConditionalRule[];
}

export interface ConditionalRule {
  id: string;
  condition: string; // e.g., "position[1] === 'Q1'"
  action: 'require' | 'forbid' | 'suggest';
  targetPosition: number;
  values: string[];
  message: string;
}

export interface AdvancedCampaignRule {
  id: string;
  name: string;
  description: string;
  type: 'regex' | 'token-based' | 'conditional';
  pattern?: string;
  tokenPositions?: TokenPosition[];
  required: boolean;
  weight: number;
  errorMessage: string;
  examples: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformRuleSet {
  platform: string;
  rules: AdvancedCampaignRule[];
  tokenPositions: TokenPosition[];
}

export interface TaxonomyVersion {
  id: string;
  version: number;
  name: string;
  rules: AdvancedCampaignRule[];
  platformRuleSets: PlatformRuleSet[];
  createdAt: string;
  createdBy: string;
  changelog: string;
}

export interface ImportedCampaign {
  id: string;
  originalName: string;
  suggestedName?: string;
  platform?: string;
  validationResult?: CampaignValidationResult;
  status: 'pending' | 'validated' | 'corrected' | 'exported';
}

export interface BulkValidationRequest {
  campaigns: { name: string; platform?: string }[];
  taxonomyId?: string;
  version?: number;
  selectedPlatformRules?: string; // Platform name to use for validation
}

export interface BulkValidationResponse {
  results: ImportedCampaign[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    avgScore: number;
  };
}

export interface ExportMapping {
  originalName: string;
  correctedName: string;
  changes: string[];
  confidence: number;
  platform?: string;
}

export interface ExportRequest {
  format: 'csv' | 'xlsx' | 'json';
  includeMapping: boolean;
  campaignIds: string[];
}

export interface ValidationRerunRequest {
  campaignIds: string[];
  taxonomyVersion: number;
}

export interface SavePlatformRulesRequest {
  platform: string;
  rules: AdvancedCampaignRule[];
  tokenPositions: TokenPosition[];
}

export interface GetPlatformRulesResponse {
  platforms: string[];
  ruleSets: PlatformRuleSet[];
}
