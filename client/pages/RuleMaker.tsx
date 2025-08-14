import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Settings, ArrowLeft, TestTube, Save, Eye, Upload, Download, History, Copy, FileText, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TokenPosition, AdvancedCampaignRule, ConditionalRule, ImportedCampaign, PlatformRuleSet, SavePlatformRulesRequest } from "@shared/api";

export default function RuleMaker() {
  const [activeTab, setActiveTab] = useState("platforms");
  const [taxonomyVersion, setTaxonomyVersion] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Platform management state
  const [platforms] = useState([
    "Google Ads", "Facebook Ads", "LinkedIn Ads", "TikTok Ads",
    "Twitter Ads", "YouTube Ads", "Email Campaign", "Display Network"
  ]);
  const [selectedPlatform, setSelectedPlatform] = useState("Google Ads");
  const [platformRuleSets, setPlatformRuleSets] = useState<PlatformRuleSet[]>([]);

  // Token-based rules state
  const [tokenPositions, setTokenPositions] = useState<TokenPosition[]>([
    {
      id: "1",
      position: 0,
      name: "Date/Quarter",
      description: "Campaign timing identifier",
      required: true,
      allowedValues: ["Q1_2024", "Q2_2024", "Q3_2024", "Q4_2024", "2024", "2025"],
      separator: "_",
      synonyms: {
        "Q1": ["Quarter1", "Q1_24"],
        "Q4": ["Quarter4", "Q4_24", "Holiday"]
      },
      conditionalRules: []
    },
    {
      id: "2", 
      position: 1,
      name: "Campaign Type",
      description: "Marketing channel or campaign type",
      required: true,
      allowedValues: ["Search", "Display", "Social", "Video", "Email", "Promo", "Brand"],
      separator: "_",
      synonyms: {
        "Search": ["SEM", "PPC", "Paid Search"],
        "Social": ["SMM", "Social Media"],
        "Display": ["Banner", "GDN"]
      },
      conditionalRules: []
    }
  ]);

  // Import state
  const [importedCampaigns, setImportedCampaigns] = useState<ImportedCampaign[]>([]);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Test state
  const [testCampaign, setTestCampaign] = useState("");
  const [testResults, setTestResults] = useState<any>(null);

  const addTokenPosition = () => {
    if (tokenPositions.length >= 15) return;

    const newPosition: TokenPosition = {
      id: Date.now().toString(),
      position: tokenPositions.length,
      name: `Position ${tokenPositions.length + 1}`,
      description: "",
      required: false,
      allowedValues: [],
      separator: "_",
      synonyms: {},
      conditionalRules: []
    };
    setTokenPositions([...tokenPositions, newPosition]);
  };

  const setPositionCount = (count: number) => {
    if (count < 1 || count > 15) return;

    const currentCount = tokenPositions.length;

    if (count > currentCount) {
      // Add new positions
      const newPositions: TokenPosition[] = [];
      for (let i = currentCount; i < count; i++) {
        newPositions.push({
          id: `${Date.now()}-${i}`,
          position: i,
          name: `Position ${i + 1}`,
          description: "",
          required: false,
          allowedValues: [],
          separator: "_",
          synonyms: {},
          conditionalRules: []
        });
      }
      setTokenPositions([...tokenPositions, ...newPositions]);
    } else if (count < currentCount) {
      // Remove positions from the end
      setTokenPositions(tokenPositions.slice(0, count));
    }
  };

  const updateTokenPosition = (id: string, field: keyof TokenPosition, value: any) => {
    setTokenPositions(positions => 
      positions.map(pos => 
        pos.id === id ? { ...pos, [field]: value } : pos
      )
    );
  };

  const deleteTokenPosition = (id: string) => {
    if (tokenPositions.length <= 1) return; // Don't allow deleting the last position
    setTokenPositions(positions => {
      const filtered = positions.filter(pos => pos.id !== id);
      // Reorder positions after deletion
      return filtered.map((pos, index) => ({ ...pos, position: index }));
    });
  };

  const movePosition = (id: string, direction: 'up' | 'down') => {
    const currentIndex = tokenPositions.findIndex(pos => pos.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= tokenPositions.length) return;

    const newPositions = [...tokenPositions];
    [newPositions[currentIndex], newPositions[newIndex]] = [newPositions[newIndex], newPositions[currentIndex]];

    // Update position indices
    const reorderedPositions = newPositions.map((pos, index) => ({ ...pos, position: index }));
    setTokenPositions(reorderedPositions);
  };

  const addConditionalRule = (positionId: string) => {
    const newRule: ConditionalRule = {
      id: Date.now().toString(),
      condition: "",
      action: "require",
      targetPosition: 0,
      values: [],
      message: ""
    };
    
    updateTokenPosition(positionId, 'conditionalRules', [
      ...tokenPositions.find(p => p.id === positionId)?.conditionalRules || [],
      newRule
    ]);
  };

  const validateTokenBasedCampaign = (campaignName: string) => {
    // Handle complex parsing for campaigns with different separators
    let tokens: string[] = [];
    let remainingName = campaignName;

    // Parse tokens based on position separators
    for (let i = 0; i < tokenPositions.length; i++) {
      const position = tokenPositions[i];
      if (i === tokenPositions.length - 1) {
        // Last token gets the remainder
        tokens.push(remainingName);
        break;
      }

      const nextPosition = tokenPositions[i + 1];
      const separator = position.separator || '_';

      if (separator === '_') {
        const separatorIndex = remainingName.indexOf('_');
        if (separatorIndex !== -1) {
          tokens.push(remainingName.substring(0, separatorIndex));
          remainingName = remainingName.substring(separatorIndex + 1);
        } else {
          tokens.push(remainingName);
          remainingName = '';
        }
      } else {
        // For positions without separators, try to extract based on next separator
        const nextSeparatorIndex = remainingName.indexOf(nextPosition?.separator || '_');
        if (nextSeparatorIndex !== -1) {
          tokens.push(remainingName.substring(0, nextSeparatorIndex));
          remainingName = remainingName.substring(nextSeparatorIndex + (nextPosition?.separator === '_' ? 1 : 0));
        } else {
          tokens.push(remainingName);
          remainingName = '';
        }
      }
    }

    const violations = [];
    let score = 0;
    const maxScore = tokenPositions.filter(p => p.required).length * 10;

    tokenPositions.forEach((position, index) => {
      const token = tokens[index];
      
      if (position.required && !token) {
        violations.push({
          position: position.position,
          name: position.name,
          message: `Missing required token at position ${position.position + 1}: ${position.name}`
        });
        return;
      }

      if (token && position.allowedValues.length > 0) {
        const isValid = position.allowedValues.includes(token) || 
                       Object.values(position.synonyms).flat().includes(token);
        
        if (isValid) {
          score += position.required ? 10 : 5;
        } else {
          violations.push({
            position: position.position,
            name: position.name,
            message: `Invalid value "${token}" at position ${position.position + 1}. Allowed: ${position.allowedValues.join(', ')}`
          });
        }
      }
    });

    return {
      isValid: violations.length === 0,
      score,
      maxScore,
      violations,
      tokens
    };
  };

  const testTokenRules = () => {
    const result = validateTokenBasedCampaign(testCampaign);
    setTestResults(result);
  };

  const importCampaigns = () => {
    setIsImporting(true);
    
    // Parse input (support CSV format or line-separated)
    const lines = importText.split('\n').filter(line => line.trim());
    const campaigns: ImportedCampaign[] = lines.map((line, index) => {
      const parts = line.split(',');
      const name = parts[0]?.trim();
      const platform = parts[1]?.trim();
      
      return {
        id: `imported-${index}`,
        originalName: name,
        platform,
        status: 'pending' as const
      };
    });

    setImportedCampaigns(campaigns);
    setIsImporting(false);
    setImportText("");
  };

  const validateImportedCampaigns = () => {
    const updated = importedCampaigns.map(campaign => {
      const result = validateTokenBasedCampaign(campaign.originalName);
      return {
        ...campaign,
        validationResult: {
          campaignName: campaign.originalName,
          isValid: result.isValid,
          score: result.score,
          maxScore: result.maxScore,
          violations: result.violations.map(v => ({
            ruleId: v.position.toString(),
            ruleName: v.name,
            description: v.message,
            severity: 'error' as const,
            suggestion: `Fix ${v.name}`,
            weight: 10
          })),
          suggestions: []
        },
        status: 'validated' as const
      };
    });
    
    setImportedCampaigns(updated);
  };

  const generateCorrectedName = (campaign: ImportedCampaign) => {
    if (!campaign.validationResult) return campaign.originalName;
    
    const tokens = campaign.originalName.split('_');
    const correctedTokens = [...tokens];
    
    // Apply basic corrections based on token positions
    tokenPositions.forEach((position, index) => {
      if (!correctedTokens[index] && position.required && position.allowedValues.length > 0) {
        correctedTokens[index] = position.allowedValues[0];
      }
    });
    
    // Ensure minimum structure
    while (correctedTokens.length < tokenPositions.filter(p => p.required).length) {
      correctedTokens.push("TBD");
    }
    
    return correctedTokens.join('_');
  };

  const applyCorrectionToCampaign = (campaignId: string) => {
    setImportedCampaigns(campaigns => 
      campaigns.map(campaign => 
        campaign.id === campaignId 
          ? { 
              ...campaign, 
              suggestedName: generateCorrectedName(campaign),
              status: 'corrected' as const
            }
          : campaign
      )
    );
  };

  const exportResults = () => {
    const exportData = importedCampaigns
      .filter(c => c.status === 'corrected' && c.suggestedName)
      .map(c => ({
        'Original Name': c.originalName,
        'Corrected Name': c.suggestedName,
        'Platform': c.platform || '',
        'Score': c.validationResult?.score || 0,
        'Max Score': c.validationResult?.maxScore || 0,
        'Status': 'Corrected'
      }));

    const csvContent = [
      Object.keys(exportData[0] || {}).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-corrections-v${taxonomyVersion}.csv`;
    a.click();
  };

  const saveRuleVersion = () => {
    // In a real app, this would save to backend
    const newVersion = taxonomyVersion + 1;
    setTaxonomyVersion(newVersion);
    alert(`Rules saved as version ${newVersion}!`);
  };

  const savePlatformRules = async () => {
    try {
      const request: SavePlatformRulesRequest = {
        platform: selectedPlatform,
        rules: [], // Convert token positions to rules
        tokenPositions
      };

      const response = await fetch("/api/platform-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        // Update local state
        const updatedRuleSets = platformRuleSets.filter(rs => rs.platform !== selectedPlatform);
        updatedRuleSets.push({
          platform: selectedPlatform,
          rules: [],
          tokenPositions
        });
        setPlatformRuleSets(updatedRuleSets);
        alert(`${selectedPlatform} rules saved successfully!`);
      }
    } catch (error) {
      console.error("Error saving platform rules:", error);
      alert("Failed to save platform rules");
    }
  };

  const loadPlatformRules = (platform: string) => {
    const ruleSet = platformRuleSets.find(rs => rs.platform === platform);
    if (ruleSet) {
      setTokenPositions(ruleSet.tokenPositions);
      setSelectedPlatform(platform);
    }
  };

  const getCurrentPlatformRules = () => {
    return platformRuleSets.find(rs => rs.platform === selectedPlatform);
  };

  const applyTemplate = (templateType: 'basic' | 'advanced' | 'comprehensive' | 'snapchat' | 'tiktok') => {
    let newPositions: TokenPosition[] = [];

    switch (templateType) {
      case 'basic':
        newPositions = [
          {
            id: '1', position: 0, name: 'Date/Quarter', description: 'Campaign timing identifier',
            required: true, allowedValues: [],
            formatPattern: '^(Q[1-4]_)?20[0-9]{2}$',
            formatDescription: 'YYYY or Q#_YYYY format (e.g., 2024, Q4_2024)',
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '2', position: 1, name: 'Campaign Type', description: 'Marketing channel or campaign type',
            required: true, allowedValues: ['Search', 'Display', 'Social', 'Video', 'Email'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '3', position: 2, name: 'Geographic Target', description: 'Target geographic location',
            required: true, allowedValues: ['US', 'UK', 'CA', 'Global'],
            separator: '_', synonyms: {}, conditionalRules: []
          }
        ];
        break;
      case 'advanced':
        newPositions = [
          {
            id: '1', position: 0, name: 'Date/Quarter', description: 'Campaign timing identifier',
            required: true, allowedValues: ['Q1_2024', 'Q2_2024', 'Q3_2024', 'Q4_2024'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '2', position: 1, name: 'Campaign Type', description: 'Marketing channel',
            required: true, allowedValues: ['Search', 'Display', 'Social', 'Video'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '3', position: 2, name: 'Channel', description: 'Specific channel or platform',
            required: false, allowedValues: ['Google', 'Facebook', 'LinkedIn', 'TikTok'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '4', position: 3, name: 'Geographic Target', description: 'Target location',
            required: true, allowedValues: ['US', 'UK', 'CA', 'Global', 'EMEA'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '5', position: 4, name: 'Goal', description: 'Campaign objective',
            required: false, allowedValues: ['Awareness', 'Traffic', 'Conversion', 'Retention'],
            separator: '_', synonyms: {}, conditionalRules: []
          }
        ];
        break;
      case 'comprehensive':
        newPositions = [
          {
            id: '1', position: 0, name: 'Year', description: 'Campaign year',
            required: true, allowedValues: ['2024', '2025'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '2', position: 1, name: 'Quarter', description: 'Campaign quarter',
            required: true, allowedValues: ['Q1', 'Q2', 'Q3', 'Q4'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '3', position: 2, name: 'Business Unit', description: 'Business unit or brand',
            required: true, allowedValues: ['Corp', 'Brand_A', 'Brand_B'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '4', position: 3, name: 'Campaign Type', description: 'High-level campaign type',
            required: true, allowedValues: ['Acquisition', 'Retention', 'Brand'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '5', position: 4, name: 'Channel', description: 'Marketing channel',
            required: true, allowedValues: ['Search', 'Display', 'Social', 'Video', 'Email'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '6', position: 5, name: 'Platform', description: 'Specific platform',
            required: false, allowedValues: ['Google', 'Facebook', 'LinkedIn'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '7', position: 6, name: 'Geographic Target', description: 'Target location',
            required: true, allowedValues: ['US', 'UK', 'CA', 'Global'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '8', position: 7, name: 'Audience', description: 'Target audience segment',
            required: false, allowedValues: ['Broad', 'Lookalike', 'Custom', 'Retargeting'],
            separator: '_', synonyms: {}, conditionalRules: []
          }
        ];
        break;
      case 'snapchat':
        newPositions = [
          {
            id: '1', position: 0, name: 'Brand', description: 'Brand identifier (e.g., mny)',
            required: true, allowedValues: ['mny', 'brand_a', 'brand_b', 'corp'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '2', position: 1, name: 'Category', description: 'Campaign category (e.g., make)',
            required: true, allowedValues: ['make', 'grow', 'retain', 'acquire'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '3', position: 2, name: 'Group', description: 'Target group or segment (e.g., others)',
            required: true, allowedValues: ['others', 'youth', 'adults', 'families', 'professionals'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '4', position: 3, name: 'Theme', description: 'Campaign theme with context (e.g., awareness-snapads-mny-equity-ramadan)',
            required: true, allowedValues: ['awareness-snapads-mny-equity-ramadan', 'conversion-snapads-summer', 'brand-snapads-launch'],
            separator: '', synonyms: {}, conditionalRules: []
          },
          {
            id: '5', position: 4, name: 'Period', description: 'Time period code (e.g., 0225 for Feb 25)',
            required: true, allowedValues: ['0125', '0225', '0325', '0425', '0525', '0625'],
            separator: '', synonyms: {}, conditionalRules: []
          },
          {
            id: '6', position: 5, name: 'Market', description: 'Market/country code (e.g., sa for Saudi Arabia)',
            required: true, allowedValues: ['sa', 'ae', 'us', 'uk', 'ca', 'au'],
            separator: '_', synonyms: { 'sa': ['saudi'], 'ae': ['uae'], 'us': ['usa'] }, conditionalRules: []
          },
          {
            id: '7', position: 6, name: 'Buy Type', description: 'Buying method (e.g., auction)',
            required: true, allowedValues: ['auction', 'reserved', 'preferred', 'programmatic'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '8', position: 7, name: 'Objective', description: 'Campaign objective/optimization (e.g., aw-awareness)',
            required: true, allowedValues: ['aw-awareness', 'cv-conversion', 'tr-traffic', 'en-engagement'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '9', position: 8, name: 'Placement', description: 'Ad placement type (e.g., content)',
            required: true, allowedValues: ['content', 'stories', 'discover', 'spotlight'],
            separator: '_', synonyms: {}, conditionalRules: []
          }
        ];
        break;
      case 'tiktok':
        newPositions = [
          {
            id: '1', position: 0, name: 'Brand Code', description: '3-character brand abbreviation (lowercase)',
            required: true, allowedValues: ['cer', 'lrp', 'gar', 'vic', 'oap', 'lp'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '2', position: 1, name: 'Category Code', description: '4-character product category identifier (lowercase)',
            required: true, allowedValues: ['skfc', 'haca', 'skin', 'multi', 'make', 'haco'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '3', position: 2, name: 'Subcategory/Product', description: 'Product-specific identifier or campaign type',
            required: true, allowedValues: ['cer-cer', 'lrp-eff', 'vic-m89', 'other-advocacy', 'other-glyco'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '4', position: 3, name: 'Campaign Description', description: 'Campaign name with date marker: [campaignname]-[MMYY][region]-[details]',
            required: true, allowedValues: [],
            formatPattern: '^[a-z]+-[0-1][0-9][0-9]{2}(sa|ae|kw|lb)-[a-z]+$',
            formatDescription: '[campaignname]-[MMYY][region]-[details] (e.g., effaclarcleanser-0725sa-x)',
            separator: '_', synonyms: {
              'sa': ['saudi', 'saudiarabia'],
              'ae': ['uae', 'emirates'],
              'kw': ['kuwait'],
              'lb': ['lebanon']
            }, conditionalRules: []
          },
          {
            id: '5', position: 4, name: 'Funnel Stage', description: 'Funnel stage indicator',
            required: true, allowedValues: ['auc', 'res'],
            separator: '_', synonyms: {
              'auc': ['auction'],
              'res': ['reservation']
            }, conditionalRules: []
          },
          {
            id: '6', position: 5, name: 'Campaign Objective', description: 'Campaign objective specification',
            required: true, allowedValues: ['aw-video-views', 'aw-reach', 'cons-traffic', 'cons-engagement'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '7', position: 6, name: 'Additional Parameters', description: 'Campaign type indicators or targeting info',
            required: false, allowedValues: ['alwayson', 'other', 'x', 'lla'],
            separator: '_', synonyms: {
              'lla': ['lookalike']
            }, conditionalRules: []
          },
          {
            id: '8', position: 7, name: 'Reserved Field', description: 'Reserved field, usually "x" when not used',
            required: false, allowedValues: ['x'],
            separator: '_', synonyms: {}, conditionalRules: []
          },
          {
            id: '9', position: 8, name: 'Campaign ID', description: 'Format: ym followed by 8 digits (e.g., ym00479511)',
            required: true, allowedValues: [],
            formatPattern: '^(ym|YM)[0-9]{8}$',
            formatDescription: 'ym + 8 digits (e.g., ym00479511, YM12345678)',
            separator: '', synonyms: {
              'ym': ['YM']
            }, conditionalRules: []
          }
        ];
        break;
    }

    setTokenPositions(newPositions);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Advanced Rule Maker</h1>
                  <p className="text-sm text-slate-600">Token positions, imports, and validation workflows</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-blue-50">
                <History className="w-3 h-3 mr-1" />
                Version {taxonomyVersion}
              </Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="preview-mode" className="text-sm">Preview Mode</Label>
                <Switch
                  id="preview-mode"
                  checked={isPreviewMode}
                  onCheckedChange={setIsPreviewMode}
                />
              </div>
              <Button onClick={saveRuleVersion} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Save Version
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="platforms">Platform Rules</TabsTrigger>
            <TabsTrigger value="tokens">Token Positions</TabsTrigger>
            <TabsTrigger value="import">Import & Validate</TabsTrigger>
            <TabsTrigger value="results">Results & Export</TabsTrigger>
            <TabsTrigger value="test">Test Rules</TabsTrigger>
          </TabsList>

          {/* Platform Rules Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Platform-Specific Rules</h2>
              <div className="flex items-center gap-4">
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(platform => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={savePlatformRules} disabled={isPreviewMode}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Platform Rules
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Platform Rules */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Rules for {selectedPlatform}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      Configure token positions and validation rules specific to {selectedPlatform}.
                      These rules will be used when validating campaigns for this platform.
                    </p>

                    <div className="space-y-4">
                      {tokenPositions.map((position, index) => (
                        <div key={position.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">Position {position.position + 1}</Badge>
                            <div className="text-sm text-slate-600">{position.name}</div>
                          </div>
                          <div className="text-sm">
                            <div><strong>Required:</strong> {position.required ? 'Yes' : 'No'}</div>
                            <div><strong>Values:</strong> {position.allowedValues.slice(0, 3).join(', ')}
                              {position.allowedValues.length > 3 && `... (+${position.allowedValues.length - 3} more)`}
                            </div>
                          </div>
                        </div>
                      ))}

                      {tokenPositions.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <div className="text-lg font-medium mb-2">No rules configured</div>
                          <p>Switch to the Token Positions tab to create rules for {selectedPlatform}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Rules Overview */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>All Platform Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {platforms.map(platform => {
                        const ruleSet = platformRuleSets.find(rs => rs.platform === platform);
                        const isCurrentPlatform = platform === selectedPlatform;

                        return (
                          <div
                            key={platform}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isCurrentPlatform ? 'border-primary bg-primary/5' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => loadPlatformRules(platform)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{platform}</div>
                                <div className="text-sm text-slate-600">
                                  {ruleSet ? `${ruleSet.tokenPositions.length} rules` : 'No rules'}
                                </div>
                              </div>
                              <Badge variant={ruleSet ? "default" : "secondary"}>
                                {ruleSet ? "Configured" : "Empty"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Platform Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Configured Platforms:</span>
                        <Badge>{platformRuleSets.length}/{platforms.length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Current Platform:</span>
                        <Badge variant="outline">{selectedPlatform}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Rules:</span>
                        <Badge variant="secondary">
                          {getCurrentPlatformRules()?.tokenPositions.length || 0}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Token Positions Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Token Position Rules</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Positions:</Label>
                  <Select
                    value={tokenPositions.length.toString()}
                    onValueChange={(value) => setPositionCount(parseInt(value))}
                    disabled={isPreviewMode}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addTokenPosition} disabled={isPreviewMode || tokenPositions.length >= 15}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Position
                </Button>
              </div>
            </div>

            {/* Position Overview */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-900 text-lg">Position Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{tokenPositions.length}</div>
                    <div className="text-sm text-blue-700">Total Positions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {tokenPositions.filter(p => p.required).length}
                    </div>
                    <div className="text-sm text-blue-700">Required</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {tokenPositions.filter(p => !p.required).length}
                    </div>
                    <div className="text-sm text-blue-700">Optional</div>
                  </div>
                </div>

                {/* Quick Position Navigation */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex flex-wrap gap-2">
                    {tokenPositions.map((position, index) => (
                      <Button
                        key={position.id}
                        variant="outline"
                        size="sm"
                        className={`h-8 ${position.required ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}
                        onClick={() => {
                          document.getElementById(`position-${position.id}`)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          });
                        }}
                      >
                        {index + 1}. {position.name || `Position ${index + 1}`}
                      </Button>
                    ))}
                    {tokenPositions.length < 15 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-dashed border-gray-400 text-gray-500"
                        onClick={addTokenPosition}
                        disabled={isPreviewMode}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Template Selector */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-purple-900 text-lg">Quick Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => applyTemplate('basic')}
                    disabled={isPreviewMode}
                    className="h-auto p-3 text-left flex-col items-start"
                  >
                    <div className="font-medium">Basic (3 positions)</div>
                    <div className="text-xs text-slate-600">Date, Type, Target</div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => applyTemplate('advanced')}
                    disabled={isPreviewMode}
                    className="h-auto p-3 text-left flex-col items-start"
                  >
                    <div className="font-medium">Advanced (5 positions)</div>
                    <div className="text-xs text-slate-600">Date, Type, Channel, Target, Goal</div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => applyTemplate('comprehensive')}
                    disabled={isPreviewMode}
                    className="h-auto p-3 text-left flex-col items-start"
                  >
                    <div className="font-medium">Comprehensive (8 positions)</div>
                    <div className="text-xs text-slate-600">Full enterprise taxonomy</div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => applyTemplate('snapchat')}
                    disabled={isPreviewMode}
                    className="h-auto p-3 text-left flex-col items-start bg-yellow-50 border-yellow-300"
                  >
                    <div className="font-medium">Snapchat (9 positions)</div>
                    <div className="text-xs text-slate-600">Real-world enterprise example</div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => applyTemplate('tiktok')}
                    disabled={isPreviewMode}
                    className="h-auto p-3 text-left flex-col items-start bg-purple-50 border-purple-300"
                  >
                    <div className="font-medium">TikTok (9 positions)</div>
                    <div className="text-xs text-slate-600">Enterprise naming convention</div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Format Pattern Examples */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-900 text-lg">Format Pattern Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-blue-900">Date Formats</div>
                      <div className="space-y-1 text-xs">
                        <div><code className="bg-white px-1 rounded">^20[0-9]{2}$</code> → YYYY (e.g., 2024)</div>
                        <div><code className="bg-white px-1 rounded">^Q[1-4]_20[0-9]{2}$</code> → Q#_YYYY (e.g., Q4_2024)</div>
                        <div><code className="bg-white px-1 rounded">^[0-1][0-9][0-9]{2}$</code> → MMYY (e.g., 0725)</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-900">Campaign IDs</div>
                      <div className="space-y-1 text-xs">
                        <div><code className="bg-white px-1 rounded">^(ym|YM)[0-9]{8}$</code> → ym + 8 digits</div>
                        <div><code className="bg-white px-1 rounded">^[A-Z]{2}[0-9]{6}$</code> → 2 letters + 6 digits</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-blue-900">Complex Patterns</div>
                      <div className="space-y-1 text-xs">
                        <div><code className="bg-white px-1 rounded">^[a-z]+-[0-1][0-9][0-9]{2}(sa|ae|kw)-[a-z]+$</code></div>
                        <div className="text-slate-600">→ name-MMYY+region-details</div>
                        <div><code className="bg-white px-1 rounded">^[a-z]{3}_[a-z]{4}_[a-z-]+$</code></div>
                        <div className="text-slate-600">→ 3char_4char_product-line</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-900">Tips</div>
                      <div className="space-y-1 text-xs text-slate-700">
                        <div>• Use ^ and $ for exact matches</div>
                        <div>• [0-9] for digits, [a-z] for lowercase</div>
                        <div>• {'{n}'} for exact count, {'{n,m}'} for range</div>
                        <div>• (option1|option2) for alternatives</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-World Examples */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-amber-900 text-lg">Real-World Example: Snapchat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="font-mono text-sm bg-white p-3 rounded border break-all">
                      mny_make_others_awareness-snapads-mny-equity-ramadan0225sa_auction_aw-awareness_content_ym00444778
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div><strong>Brand:</strong> mny</div>
                      <div><strong>Category:</strong> make</div>
                      <div><strong>Group:</strong> others</div>
                      <div><strong>Theme:</strong> awareness-snapads-mny-equity-ramadan</div>
                      <div><strong>Period:</strong> 0225 (Feb 25)</div>
                      <div><strong>Market:</strong> sa (Saudi Arabia)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-purple-900 text-lg">Real-World Example: TikTok</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="font-mono text-sm bg-white p-3 rounded border break-all">
                      lrp_skfc_lrp-eff_effaclarcleanser-0725sa-x_auc_aw-video-views_x_x_ym00479511
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div><strong>Brand:</strong> lrp (La Roche-Posay)</div>
                      <div><strong>Category:</strong> skfc (Skincare Face)</div>
                      <div><strong>Subcategory:</strong> lrp-eff (Effaclar line)</div>
                      <div><strong>Description:</strong> effaclarcleanser-0725sa-x</div>
                      <div><strong>Funnel:</strong> auc (Auction)</div>
                      <div><strong>Objective:</strong> aw-video-views</div>
                      <div><strong>ID:</strong> ym00479511</div>
                    </div>
                    <div className="text-xs text-purple-700 mt-2">
                      <strong>Date Format:</strong> 0725 = July 2025, Region: sa = Saudi Arabia
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6">
              {tokenPositions.map((position, index) => (
                <Card
                  key={position.id}
                  id={`position-${position.id}`}
                  className={`bg-white/80 backdrop-blur-sm transition-all duration-200 ${
                    position.required ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-orange-500'
                  }`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`${
                            position.required ? 'border-green-500 text-green-700 bg-green-50' : 'border-orange-500 text-orange-700 bg-orange-50'
                          }`}
                        >
                          Position {position.position + 1}
                        </Badge>
                        <Input
                          value={position.name}
                          onChange={(e) => updateTokenPosition(position.id, 'name', e.target.value)}
                          className="font-semibold border-none p-0 h-auto bg-transparent"
                          disabled={isPreviewMode}
                          placeholder={`Position ${position.position + 1} Name`}
                        />
                        {position.required && <Badge className="bg-green-600">Required</Badge>}
                        {!position.required && <Badge variant="secondary">Optional</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePosition(position.id, 'up')}
                            disabled={isPreviewMode}
                            className="text-slate-600 hover:text-slate-700"
                          >
                            ↑
                          </Button>
                        )}
                        {index < tokenPositions.length - 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePosition(position.id, 'down')}
                            disabled={isPreviewMode}
                            className="text-slate-600 hover:text-slate-700"
                          >
                            ↓
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTokenPosition(position.id)}
                          disabled={isPreviewMode || tokenPositions.length <= 1}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={position.description}
                          onChange={(e) => updateTokenPosition(position.id, 'description', e.target.value)}
                          disabled={isPreviewMode}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Validation Type</Label>
                        <div className="mt-2 space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Format Pattern (Regex)</Label>
                            <Input
                              value={position.formatPattern || ''}
                              onChange={(e) => updateTokenPosition(position.id, 'formatPattern', e.target.value)}
                              disabled={isPreviewMode}
                              className="mt-1 font-mono text-sm"
                              placeholder="^(Q[1-4]_)?20[0-9]{2}$ or ^[0-1][0-9][0-9]{2}$"
                            />
                            <div className="text-xs text-slate-500 mt-1">
                              Use regex patterns for date formats, IDs, etc. Leave empty to use allowed values only.
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Format Description</Label>
                            <Input
                              value={position.formatDescription || ''}
                              onChange={(e) => updateTokenPosition(position.id, 'formatDescription', e.target.value)}
                              disabled={isPreviewMode}
                              className="mt-1"
                              placeholder="MMYY format (e.g., 0725 for July 2025)"
                            />
                            <div className="text-xs text-slate-500 mt-1">
                              Human-readable description of the format pattern.
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Allowed Values (comma-separated)</Label>
                            <Textarea
                              value={position.allowedValues.join(', ')}
                              onChange={(e) => updateTokenPosition(position.id, 'allowedValues',
                                e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                              disabled={isPreviewMode}
                              className="mt-1"
                              placeholder="Value1, Value2, Value3 (or leave empty if using format pattern)"
                            />
                            <div className="text-xs text-slate-500 mt-1">
                              Specific values OR use format pattern above. Format pattern takes precedence.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={position.required}
                            onCheckedChange={(checked) => updateTokenPosition(position.id, 'required', checked)}
                            disabled={isPreviewMode}
                          />
                          <Label>Required Position</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label>Separator:</Label>
                          <Input
                            value={position.separator}
                            onChange={(e) => updateTokenPosition(position.id, 'separator', e.target.value)}
                            disabled={isPreviewMode}
                            className="w-16"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Synonyms (JSON format)</Label>
                        <Textarea
                          value={JSON.stringify(position.synonyms, null, 2)}
                          onChange={(e) => {
                            try {
                              const synonyms = JSON.parse(e.target.value);
                              updateTokenPosition(position.id, 'synonyms', synonyms);
                            } catch {}
                          }}
                          disabled={isPreviewMode}
                          className="mt-1 font-mono text-sm"
                          placeholder='{"Alias": ["Synonym1", "Synonym2"]}'
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Conditional Rules</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addConditionalRule(position.id)}
                            disabled={isPreviewMode}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Rule
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {position.conditionalRules.map((rule, ruleIndex) => (
                            <div key={rule.id} className="p-2 border rounded text-sm">
                              <div className="font-medium">Rule {ruleIndex + 1}</div>
                              <div className="text-slate-600">
                                {rule.action} {rule.values.join(', ')} when {rule.condition}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Import & Validate Tab */}
          <TabsContent value="import" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Import Campaign Names
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Paste Campaign Names</Label>
                    <Textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Campaign Name 1, Platform&#10;Campaign Name 2, Platform&#10;Or just campaign names (one per line)"
                      className="mt-1 h-32"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={importCampaigns} disabled={!importText.trim() || isImporting}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {isImporting ? "..." : ""}
                    </Button>
                    <Button variant="outline" onClick={() => setImportText("")}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  </div>

                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Support formats: CSV (name,platform), line-separated names, or clipboard paste.
                      Future: XLSX file upload.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Import Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Imported:</span>
                      <Badge>{importedCampaigns.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Validated:</span>
                      <Badge variant="outline">
                        {importedCampaigns.filter(c => c.status === 'validated').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Corrected:</span>
                      <Badge variant="secondary">
                        {importedCampaigns.filter(c => c.status === 'corrected').length}
                      </Badge>
                    </div>
                    
                    {importedCampaigns.length > 0 && (
                      <Button 
                        onClick={validateImportedCampaigns} 
                        className="w-full mt-4"
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        Validate All Campaigns
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Imported Campaigns List */}
            {importedCampaigns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Imported Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importedCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{campaign.originalName}</div>
                          {campaign.platform && (
                            <div className="text-sm text-slate-600">{campaign.platform}</div>
                          )}
                          {campaign.validationResult && (
                            <div className="text-sm">
                              Score: {campaign.validationResult.score}/{campaign.validationResult.maxScore}
                              {campaign.validationResult.violations.length > 0 && (
                                <span className="text-red-600 ml-2">
                                  {campaign.validationResult.violations.length} issues
                                </span>
                              )}
                            </div>
                          )}
                          {campaign.suggestedName && (
                            <div className="text-sm text-green-600 font-mono">
                              → {campaign.suggestedName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            campaign.status === 'pending' ? 'secondary' :
                            campaign.status === 'validated' ? 'outline' :
                            campaign.status === 'corrected' ? 'default' : 'secondary'
                          }>
                            {campaign.status}
                          </Badge>
                          {campaign.status === 'validated' && !campaign.suggestedName && (
                            <Button
                              size="sm"
                              onClick={() => applyCorrectionToCampaign(campaign.id)}
                            >
                              Fix
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Results & Export Tab */}
          <TabsContent value="results" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Export Results</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportResults} disabled={!importedCampaigns.some(c => c.status === 'corrected')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Mapping
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Valid Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {importedCampaigns.filter(c => c.validationResult?.isValid).length}
                  </div>
                  <p className="text-sm text-slate-600">Already compliant</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Corrected</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {importedCampaigns.filter(c => c.status === 'corrected').length}
                  </div>
                  <p className="text-sm text-slate-600">Fixed and ready</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {importedCampaigns.filter(c => c.validationResult && !c.validationResult.isValid && c.status !== 'corrected').length}
                  </div>
                  <p className="text-sm text-slate-600">Need attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Export Preview */}
            {importedCampaigns.filter(c => c.status === 'corrected').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Export Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Original Name</th>
                          <th className="text-left p-2">Corrected Name</th>
                          <th className="text-left p-2">Platform</th>
                          <th className="text-left p-2">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedCampaigns
                          .filter(c => c.status === 'corrected')
                          .slice(0, 5)
                          .map(campaign => (
                            <tr key={campaign.id} className="border-b">
                              <td className="p-2 font-mono text-xs">{campaign.originalName}</td>
                              <td className="p-2 font-mono text-xs text-green-600">{campaign.suggestedName}</td>
                              <td className="p-2">{campaign.platform || '-'}</td>
                              <td className="p-2">
                                {campaign.validationResult?.score}/{campaign.validationResult?.maxScore}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {importedCampaigns.filter(c => c.status === 'corrected').length > 5 && (
                      <div className="text-center text-sm text-slate-600 mt-2">
                        +{importedCampaigns.filter(c => c.status === 'corrected').length - 5} more rows
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Test Rules Tab */}
          <TabsContent value="test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Test Token Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Test Campaign Name</Label>
                  <Input
                    value={testCampaign}
                    onChange={(e) => setTestCampaign(e.target.value)}
                    placeholder="mny_make_others_awareness-snapads-mny-equity-ramadan0225sa_auction_aw-awareness_content"
                    className="mt-1"
                  />
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestCampaign("Q4_2024_Search_US_Promo")}
                      className="text-xs"
                    >
                      Basic Example
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestCampaign("mny_make_others_awareness-snapads-mny-equity-ramadan0225sa_auction_aw-awareness_content")}
                      className="text-xs"
                    >
                      Snapchat Example
                    </Button>
                  </div>
                </div>
                
                <Button onClick={testTokenRules} disabled={!testCampaign.trim()}>
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Against Token Rules
                </Button>

                {testResults && (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 border rounded-lg bg-slate-50">
                      <div className="text-lg font-semibold">
                        Result: {testResults.isValid ? '✅ Valid' : '❌ Invalid'}
                      </div>
                      <div className="text-sm text-slate-600">
                        Score: {testResults.score}/{testResults.maxScore}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Token Breakdown:</h4>
                      <div className="grid gap-2">
                        {testResults.tokens.map((token: string, index: number) => {
                          const position = tokenPositions[index];
                          const isValid = position?.allowedValues.includes(token) || 
                                         Object.values(position?.synonyms || {}).flat().includes(token);
                          
                          return (
                            <div key={index} className={`p-2 border rounded text-sm ${
                              isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="font-medium">
                                Position {index + 1}: {position?.name || 'Undefined'}
                              </div>
                              <div className="font-mono">{token}</div>
                              {position && !isValid && (
                                <div className="text-xs text-red-600 mt-1">
                                  Expected: {position.allowedValues.slice(0, 3).join(', ')}
                                  {position.allowedValues.length > 3 && '...'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {testResults.violations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-red-600">Issues Found:</h4>
                        {testResults.violations.map((violation: any, index: number) => (
                          <Alert key={index} className="border-red-200">
                            <AlertDescription>{violation.message}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
