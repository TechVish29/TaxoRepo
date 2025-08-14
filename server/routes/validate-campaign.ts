import { RequestHandler } from "express";
import { ValidateCampaignRequest, ValidateCampaignResponse, CampaignValidationResult, RuleViolation, QuickFix, CampaignRule } from "@shared/api";

// Default taxonomy rules for demonstration
const defaultRules: CampaignRule[] = [
  {
    id: "date-format",
    name: "Date Format",
    description: "Campaign must include date in YYYY format or Q#_YYYY format",
    pattern: "(Q[1-4]_)?20[0-9]{2}",
    required: true,
    weight: 20,
    errorMessage: "Missing or invalid date format. Use YYYY or Q#_YYYY format.",
    examples: ["2024", "Q4_2024"]
  },
  {
    id: "campaign-type",
    name: "Campaign Type",
    description: "Must specify campaign type (Search, Display, Social, Video, Email)",
    pattern: "(Search|Display|Social|Video|Email|Promo|Brand)",
    required: true,
    weight: 15,
    errorMessage: "Missing campaign type. Include Search, Display, Social, Video, Email, Promo, or Brand.",
    examples: ["Search", "Display", "Social"]
  },
  {
    id: "geo-target",
    name: "Geographic Target",
    description: "Include geographic target (US, UK, CA, Global, etc.)",
    pattern: "(US|UK|CA|AU|DE|FR|ES|IT|Global|EMEA|APAC|LATAM)",
    required: true,
    weight: 10,
    errorMessage: "Missing geographic target. Include US, UK, CA, Global, etc.",
    examples: ["US", "Global", "EMEA"]
  },
  {
    id: "no-spaces",
    name: "No Spaces",
    description: "Use underscores instead of spaces",
    pattern: "^[^\\s]*$",
    required: true,
    weight: 5,
    errorMessage: "Campaign names should not contain spaces. Use underscores instead.",
    examples: ["Campaign_Name", "No_Spaces_Here"]
  },
  {
    id: "length-limit",
    name: "Length Limit",
    description: "Campaign name should be between 10-80 characters",
    pattern: "^.{10,80}$",
    required: true,
    weight: 5,
    errorMessage: "Campaign name must be between 10-80 characters long.",
    examples: ["Appropriate_Length_Campaign_Name"]
  },
  {
    id: "special-chars",
    name: "Special Characters",
    description: "Avoid special characters except underscores and hyphens",
    pattern: "^[a-zA-Z0-9_-]+$",
    required: true,
    weight: 5,
    errorMessage: "Only letters, numbers, underscores, and hyphens are allowed.",
    examples: ["Valid-Campaign_Name123"]
  }
];

function validateCampaignName(campaignName: string, platform?: string): CampaignValidationResult {
  const violations: RuleViolation[] = [];
  let totalScore = 0;

  // Try to get platform-specific rules first
  let rulesToUse = defaultRules;
  if (platform) {
    // In a real app, this would fetch from the platform rules storage
    // For now, we'll use the default rules but could be enhanced
  }

  const maxScore = rulesToUse.reduce((sum, rule) => sum + rule.weight, 0);

  // Check each rule
  for (const rule of rulesToUse) {
    const regex = new RegExp(rule.pattern, 'i');
    const matches = regex.test(campaignName);

    if (!matches && rule.required) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.errorMessage,
        severity: 'error',
        suggestion: getSuggestionForRule(rule, campaignName),
        weight: rule.weight
      });
    } else if (matches) {
      totalScore += rule.weight;
    }
  }

  const isValid = violations.length === 0;
  const suggestions = generateSuggestions(campaignName, violations);

  return {
    campaignName,
    isValid,
    score: totalScore,
    maxScore,
    violations,
    suggestions,
    platform
  };
}

function getSuggestionForRule(rule: CampaignRule, campaignName: string): string {
  switch (rule.id) {
    case "date-format":
      return "Add current year like '2024' or quarter like 'Q4_2024' to your campaign name.";
    case "campaign-type":
      return "Add campaign type like '_Search', '_Display', or '_Social' to indicate the channel.";
    case "geo-target":
      return "Add geographic target like '_US', '_Global', or '_EMEA' to specify location.";
    case "no-spaces":
      return `Replace spaces with underscores: "${campaignName.replace(/\s+/g, '_')}"`;
    case "length-limit":
      return campaignName.length < 10 ? "Make the name longer and more descriptive." : "Shorten the name to under 80 characters.";
    case "special-chars":
      return `Remove special characters: "${campaignName.replace(/[^a-zA-Z0-9_-]/g, '')}"`;
    default:
      return "Follow the rule pattern: " + rule.examples.join(", ");
  }
}

function generateSuggestions(campaignName: string, violations: RuleViolation[]): string[] {
  const suggestions: string[] = [];
  
  if (violations.length === 0) {
    suggestions.push("Your campaign name follows all taxonomy rules!");
    return suggestions;
  }

  // General suggestions based on common issues
  if (violations.some(v => v.ruleId === "no-spaces")) {
    suggestions.push("Replace spaces with underscores for better consistency.");
  }
  
  if (violations.some(v => v.ruleId === "date-format")) {
    suggestions.push("Include the campaign year or quarter for better tracking.");
  }
  
  if (violations.some(v => v.ruleId === "campaign-type")) {
    suggestions.push("Add the marketing channel type to categorize your campaign.");
  }

  if (violations.length > 3) {
    suggestions.push("Consider using the Quick Fixes below to address multiple issues at once.");
  }

  return suggestions;
}

function generateQuickFixes(campaignName: string, violations: RuleViolation[]): QuickFix[] {
  const fixes: QuickFix[] = [];
  let fixedName = campaignName;

  // Apply common fixes
  if (violations.some(v => v.ruleId === "no-spaces")) {
    fixedName = fixedName.replace(/\s+/g, '_');
  }

  if (violations.some(v => v.ruleId === "special-chars")) {
    fixedName = fixedName.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  // Add missing components
  let enhancedName = fixedName;
  const needsDate = violations.some(v => v.ruleId === "date-format");
  const needsType = violations.some(v => v.ruleId === "campaign-type");
  const needsGeo = violations.some(v => v.ruleId === "geo-target");

  if (needsDate) {
    enhancedName = `Q4_2024_${enhancedName}`;
  }

  if (needsType && !enhancedName.match(/(Search|Display|Social|Video|Email|Promo|Brand)/i)) {
    enhancedName = `${enhancedName}_Search`;
  }

  if (needsGeo && !enhancedName.match(/(US|UK|CA|Global|EMEA|APAC)/i)) {
    enhancedName = `${enhancedName}_US`;
  }

  // Ensure length is appropriate
  if (enhancedName.length < 10) {
    enhancedName = `Campaign_${enhancedName}_Marketing`;
  } else if (enhancedName.length > 80) {
    enhancedName = enhancedName.substring(0, 77) + "...";
  }

  if (fixedName !== campaignName) {
    fixes.push({
      id: "basic-cleanup",
      description: "Fix formatting issues (spaces, special characters)",
      suggestedName: fixedName,
      confidence: 95
    });
  }

  if (enhancedName !== campaignName && enhancedName !== fixedName) {
    fixes.push({
      id: "comprehensive-fix",
      description: "Complete taxonomy compliance with all required elements",
      suggestedName: enhancedName,
      confidence: 90
    });
  }

  // Add a creative alternative
  if (violations.length > 0) {
    const creativeName = `Q4_2024_${campaignName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}_Search_US_Promo`.substring(0, 80);
    fixes.push({
      id: "template-based",
      description: "Use standard template format for maximum compliance",
      suggestedName: creativeName,
      confidence: 85
    });
  }

  return fixes;
}

export const handleValidateCampaign: RequestHandler = (req, res) => {
  try {
    const { campaignName, platform }: ValidateCampaignRequest = req.body;

    if (!campaignName || typeof campaignName !== 'string') {
      return res.status(400).json({ 
        error: "Campaign name is required and must be a string" 
      });
    }

    const result = validateCampaignName(campaignName.trim(), platform);
    const quickFixes = generateQuickFixes(campaignName.trim(), result.violations);

    const response: ValidateCampaignResponse = {
      result,
      quickFixes
    };

    res.json(response);
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({ 
      error: "Internal server error during validation" 
    });
  }
};
