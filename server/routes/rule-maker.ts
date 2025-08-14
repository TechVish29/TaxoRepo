import { RequestHandler } from "express";
import { BulkValidationRequest, BulkValidationResponse, ImportedCampaign, TaxonomyVersion, ValidationRerunRequest } from "@shared/api";

// Mock data for demonstration
let ruleVersions: TaxonomyVersion[] = [
  {
    id: "v1",
    version: 1,
    name: "Initial Token Rules",
    rules: [],
    createdAt: new Date().toISOString(),
    createdBy: "system",
    changelog: "Initial version with basic token positions"
  }
];

let currentVersion = 1;

export const handleBulkValidation: RequestHandler = (req, res) => {
  try {
    const { campaigns, taxonomyId, version }: BulkValidationRequest = req.body;

    if (!campaigns || !Array.isArray(campaigns)) {
      return res.status(400).json({ error: "Campaigns array is required" });
    }

    // Mock validation logic - in real app this would use the token position rules
    const results: ImportedCampaign[] = campaigns.map((campaign, index) => {
      const tokens = campaign.name.split('_');
      const score = Math.min(100, tokens.length * 20); // Mock scoring
      const maxScore = 100;
      const isValid = score >= 80;

      return {
        id: `campaign-${index}`,
        originalName: campaign.name,
        platform: campaign.platform,
        validationResult: {
          campaignName: campaign.name,
          isValid,
          score,
          maxScore,
          violations: isValid ? [] : [
            {
              ruleId: "token-structure",
              ruleName: "Token Structure",
              description: "Campaign name should follow token position rules",
              severity: 'error' as const,
              suggestion: "Use format: Date_Type_Target_Channel",
              weight: 20
            }
          ],
          suggestions: isValid ? [] : ["Consider using standard token format"]
        },
        status: 'validated' as const
      };
    });

    const summary = {
      total: results.length,
      valid: results.filter(r => r.validationResult?.isValid).length,
      invalid: results.filter(r => !r.validationResult?.isValid).length,
      avgScore: results.reduce((sum, r) => sum + (r.validationResult?.score || 0), 0) / results.length
    };

    const response: BulkValidationResponse = {
      results,
      summary
    };

    res.json(response);
  } catch (error) {
    console.error("Bulk validation error:", error);
    res.status(500).json({ error: "Internal server error during bulk validation" });
  }
};

export const handleSaveRuleVersion: RequestHandler = (req, res) => {
  try {
    const { name, rules, changelog } = req.body;

    const newVersion: TaxonomyVersion = {
      id: `v${currentVersion + 1}`,
      version: currentVersion + 1,
      name: name || `Version ${currentVersion + 1}`,
      rules: rules || [],
      createdAt: new Date().toISOString(),
      createdBy: "user", // In real app, get from auth
      changelog: changelog || "Rule updates"
    };

    ruleVersions.push(newVersion);
    currentVersion++;

    res.json(newVersion);
  } catch (error) {
    console.error("Save version error:", error);
    res.status(500).json({ error: "Failed to save rule version" });
  }
};

export const handleGetRuleVersions: RequestHandler = (req, res) => {
  try {
    res.json(ruleVersions);
  } catch (error) {
    console.error("Get versions error:", error);
    res.status(500).json({ error: "Failed to get rule versions" });
  }
};

export const handleValidationRerun: RequestHandler = (req, res) => {
  try {
    const { campaignIds, taxonomyVersion }: ValidationRerunRequest = req.body;

    if (!campaignIds || !Array.isArray(campaignIds)) {
      return res.status(400).json({ error: "Campaign IDs array is required" });
    }

    // Mock re-validation with specified version
    const revalidatedResults = campaignIds.map(id => {
      // In real app, fetch campaign by ID and re-validate with specified version
      return {
        campaignId: id,
        newValidationResult: {
          campaignName: `campaign-${id}`,
          isValid: Math.random() > 0.3, // Mock result
          score: Math.floor(Math.random() * 100),
          maxScore: 100,
          violations: [],
          suggestions: []
        },
        previousScore: Math.floor(Math.random() * 100),
        improved: Math.random() > 0.5
      };
    });

    res.json({
      revalidatedCampaigns: revalidatedResults,
      taxonomyVersion,
      summary: {
        total: revalidatedResults.length,
        improved: revalidatedResults.filter(r => r.improved).length,
        avgScoreChange: revalidatedResults.reduce((sum, r) => 
          sum + (r.newValidationResult.score - r.previousScore), 0) / revalidatedResults.length
      }
    });
  } catch (error) {
    console.error("Rerun validation error:", error);
    res.status(500).json({ error: "Failed to rerun validation" });
  }
};

export const handleExportMapping: RequestHandler = (req, res) => {
  try {
    const { format = 'csv', campaignIds } = req.body;

    // Mock export data
    const mappingData = (campaignIds || []).map((id: string) => ({
      campaignId: id,
      originalName: `original-${id}`,
      correctedName: `corrected-${id}`,
      changes: ["Fixed date format", "Added geo target"],
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
      platform: "Google Ads"
    }));

    if (format === 'csv') {
      const csvHeader = "Campaign ID,Original Name,Corrected Name,Changes,Confidence,Platform\n";
      const csvRows = mappingData.map(row => 
        `${row.campaignId},"${row.originalName}","${row.correctedName}","${row.changes.join('; ')}",${row.confidence}%,${row.platform}`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="campaign-mapping.csv"');
      res.send(csvContent);
    } else {
      res.json(mappingData);
    }
  } catch (error) {
    console.error("Export mapping error:", error);
    res.status(500).json({ error: "Failed to export mapping" });
  }
};
