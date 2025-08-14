import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Download, ArrowLeft, CheckCircle2, AlertCircle, Trash2, Wand2, Copy, Settings, Clock, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ValidateCampaignRequest, ValidateCampaignResponse, CampaignValidationResult, QuickFix } from "@shared/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CampaignEntry {
  originalName: string;
  platform?: string;
  validationResult?: CampaignValidationResult;
  quickFixes?: QuickFix[];
  correctedName?: string;
  isFixed: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  campaigns: CampaignEntry[];
  status: 'uploaded' | 'processing' | 'validated' | 'error';
  validationSummary?: {
    total: number;
    valid: number;
    invalid: number;
    avgScore: number;
    fixed: number;
  };
}

interface ValidationLog {
  id: string;
  timestamp: string;
  fileName: string;
  platform: string;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    avgScore: number;
    fixed: number;
  };
  duration: number; // in milliseconds
  status: 'completed' | 'error';
}

export default function DocumentUploader() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Platform rules state - Initialize with fallback immediately
  const defaultPlatforms = ["Snapchat", "Google Ads", "Facebook Ads", "LinkedIn Ads", "TikTok Ads", "Twitter Ads", "YouTube Ads"];
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>(defaultPlatforms);
  const [selectedValidationPlatform, setSelectedValidationPlatform] = useState<string>("Snapchat");
  const [isPlatformsLoading, setIsPlatformsLoading] = useState(false);

  // Validation logs state
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'logs'>('upload');

  // Note: API loading removed to prevent fetch errors
  // Platform rules are now static and reliable

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const supportedTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    
    files.forEach(file => {
      if (supportedTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        processFile(file);
      } else {
        alert(`Unsupported file type: ${file.name}. Please upload CSV, XLSX, or TXT files.`);
      }
    });
  };

  const processFile = async (file: File) => {
    const startTime = Date.now();
    const newFile: UploadedFile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      campaigns: [],
      status: 'processing'
    };

    setUploadedFiles(prev => [...prev, newFile]);

    try {
      // Parse file content
      const fileContent = await readFileContent(file);
      const campaigns = parseFileContent(fileContent, file.type);

      // Update with parsed campaigns
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === newFile.id
            ? { ...f, campaigns: campaigns.map(c => ({ ...c, isFixed: false })) }
            : f
        )
      );

      // Validate each campaign
      const validatedCampaigns: CampaignEntry[] = [];

      for (const campaign of campaigns) {
        try {
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch("/api/validate-campaign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignName: campaign.originalName,
              platform: selectedValidationPlatform || campaign.platform
            } as ValidateCampaignRequest),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: ValidateCampaignResponse = await response.json();

          if (data && data.result) {
            validatedCampaigns.push({
              ...campaign,
              validationResult: data.result,
              quickFixes: data.quickFixes || [],
              isFixed: false
            });
          } else {
            throw new Error("Invalid validation response format");
          }
        } catch (error) {
          console.warn("Validation error for campaign:", campaign.originalName, error);

          // Create a basic validation result based on simple rules
          const tokens = campaign.originalName.split('_');
          const isBasicValid = tokens.length >= 3; // Basic check for minimum structure
          const basicScore = isBasicValid ? 60 : 20; // Give some score for having structure

          validatedCampaigns.push({
            ...campaign,
            validationResult: {
              campaignName: campaign.originalName,
              isValid: isBasicValid,
              score: basicScore,
              maxScore: 100,
              violations: isBasicValid ? [] : [{
                ruleId: "structure",
                ruleName: "Basic Structure",
                description: "Campaign name should have at least 3 parts separated by underscores",
                severity: 'error' as const,
                suggestion: "Use format like: Brand_Type_Target or similar structure",
                weight: 20
              }],
              suggestions: isBasicValid ? ["Campaign structure looks good"] : ["Add more descriptive parts to your campaign name"]
            },
            quickFixes: isBasicValid ? [] : [{
              id: "basic-fix",
              description: "Add basic structure",
              suggestedName: campaign.originalName.includes('_') ? campaign.originalName + "_Campaign" : campaign.originalName.replace(/[^a-zA-Z0-9]/g, '_') + "_Type_Target",
              confidence: 70
            }],
            isFixed: false
          });
        }
      }

      // Calculate summary
      const summary = {
        total: validatedCampaigns.length,
        valid: validatedCampaigns.filter(c => c.validationResult?.isValid).length,
        invalid: validatedCampaigns.filter(c => c.validationResult && !c.validationResult.isValid).length,
        avgScore: validatedCampaigns.reduce((sum, c) => sum + (c.validationResult?.score || 0), 0) / validatedCampaigns.length,
        fixed: 0
      };

      // Log the validation result
      const validationLog: ValidationLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fileName: file.name,
        platform: selectedValidationPlatform,
        summary,
        duration: Date.now() - startTime,
        status: 'completed'
      };

      setValidationLogs(prev => [validationLog, ...prev]);

      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === newFile.id
            ? {
                ...f,
                campaigns: validatedCampaigns,
                status: 'validated' as const,
                validationSummary: summary
              }
            : f
        )
      );
    } catch (error) {
      console.error("File processing error:", error);

      // Log the error
      const errorLog: ValidationLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fileName: file.name,
        platform: selectedValidationPlatform,
        summary: {
          total: 0,
          valid: 0,
          invalid: 0,
          avgScore: 0,
          fixed: 0
        },
        duration: Date.now() - startTime,
        status: 'error'
      };

      setValidationLogs(prev => [errorLog, ...prev]);

      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === newFile.id
            ? { ...f, status: 'error' as const }
            : f
        )
      );
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseFileContent = (content: string, fileType: string): CampaignEntry[] => {
    const lines = content.split('\n').filter(line => line.trim());

    if (fileType === 'text/csv' || content.includes(',')) {
      // CSV format: campaign_name,platform
      return lines.map(line => {
        const [name, platform] = line.split(',').map(s => s.trim().replace(/"/g, ''));
        return {
          originalName: name,
          platform: platform || undefined,
          isFixed: false
        };
      });
    } else {
      // Plain text format: one campaign per line
      return lines.map(line => ({
        originalName: line.trim(),
        isFixed: false
      }));
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const applyQuickFix = (fileId: string, campaignIndex: number, fixIndex: number) => {
    setUploadedFiles(prev =>
      prev.map(file => {
        if (file.id !== fileId) return file;

        const updatedCampaigns = [...file.campaigns];
        const campaign = updatedCampaigns[campaignIndex];
        const quickFix = campaign.quickFixes?.[fixIndex];

        if (quickFix) {
          updatedCampaigns[campaignIndex] = {
            ...campaign,
            correctedName: quickFix.suggestedName,
            isFixed: true
          };
        }

        const summary = {
          ...file.validationSummary!,
          fixed: updatedCampaigns.filter(c => c.isFixed).length
        };

        return {
          ...file,
          campaigns: updatedCampaigns,
          validationSummary: summary
        };
      })
    );
  };

  const applyAllFixes = (fileId: string) => {
    setUploadedFiles(prev =>
      prev.map(file => {
        if (file.id !== fileId) return file;

        const updatedCampaigns = file.campaigns.map(campaign => {
          if (campaign.quickFixes && campaign.quickFixes.length > 0 && !campaign.isFixed) {
            return {
              ...campaign,
              correctedName: campaign.quickFixes[0].suggestedName,
              isFixed: true
            };
          }
          return campaign;
        });

        const summary = {
          ...file.validationSummary!,
          fixed: updatedCampaigns.filter(c => c.isFixed).length
        };

        return {
          ...file,
          campaigns: updatedCampaigns,
          validationSummary: summary
        };
      })
    );
  };

  const exportResults = (file: UploadedFile) => {
    const csvHeader = 'Original Name,Corrected Name,Platform,Score,Max Score,Status,Issues,Suggestions\n';

    const csvRows = file.campaigns.map(campaign => {
      const originalName = campaign.originalName;
      const correctedName = campaign.correctedName || campaign.originalName;
      const platform = campaign.platform || '';
      const score = campaign.validationResult?.score || 0;
      const maxScore = campaign.validationResult?.maxScore || 100;
      const status = campaign.isFixed ? 'Corrected' :
                    campaign.validationResult?.isValid ? 'Valid' : 'Invalid';
      const issues = campaign.validationResult?.violations.length || 0;
      const suggestions = campaign.validationResult?.suggestions.join('; ') || '';

      return `"${originalName}","${correctedName}","${platform}",${score},${maxScore},"${status}",${issues},"${suggestions}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_validated_results.csv`;
    a.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Document Uploader</h1>
                <p className="text-sm text-slate-600">Upload campaign files for bulk validation</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'logs')} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload & Validate
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Validation Logs ({validationLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
        {/* Active Validation Rule Set */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Active Validation Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-600">ACTIVE</Badge>
              <span className="font-medium">Your uploaded campaigns will be validated against: <strong>{selectedValidationPlatform}</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className={`p-3 border rounded-lg ${selectedValidationPlatform === 'Google Ads' ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="font-medium text-sm">Google Ads</div>
                <div className="font-mono text-xs text-slate-600 mt-1">Q4_2024_Search_US</div>
                <div className="text-xs text-slate-500 mt-1">3 positions: Date, Type, Target</div>
              </div>

              <div className={`p-3 border rounded-lg ${selectedValidationPlatform === 'Facebook Ads' ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="font-medium text-sm">Facebook Ads</div>
                <div className="font-mono text-xs text-slate-600 mt-1">Q3_Traffic_Lookalike</div>
                <div className="text-xs text-slate-500 mt-1">3 positions: Date, Objective, Audience</div>
              </div>

              <div className={`p-3 border rounded-lg ${selectedValidationPlatform === 'LinkedIn Ads' ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="font-medium text-sm">LinkedIn Ads</div>
                <div className="font-mono text-xs text-slate-600 mt-1">Q4_Sponsored_Content_C_Level</div>
                <div className="text-xs text-slate-500 mt-1">3 positions: Date, Type, Audience</div>
              </div>

              <div className={`p-3 border-2 rounded-lg ${selectedValidationPlatform === 'TikTok Ads' ? 'border-green-500 bg-green-50' : 'border-purple-300 bg-purple-50'}`}>
                <div className="font-medium text-sm text-purple-800">TikTok Ads</div>
                <div className="font-mono text-xs text-purple-700 mt-1 break-all">lrp_skfc_lrp-eff_effaclar...</div>
                <div className="text-xs text-purple-600 mt-1">9 positions: Enterprise taxonomy</div>
              </div>

              <div className={`p-3 border-2 rounded-lg ${selectedValidationPlatform === 'Snapchat' ? 'border-green-500 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
                <div className="font-medium text-sm text-amber-800">Snapchat</div>
                <div className="font-mono text-xs text-amber-700 mt-1 break-all">mny_make_others_awareness...</div>
                <div className="text-xs text-amber-600 mt-1">9 positions: Enterprise taxonomy</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-600">
              ⚙️ The highlighted rule set above will be used to validate all uploaded campaigns. Change platform above to switch rules.
            </div>
          </CardContent>
        </Card>

        {/* Upload Zone */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Campaign Files
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">Validation Platform:</Label>
                <Select
                  value={selectedValidationPlatform}
                  onValueChange={setSelectedValidationPlatform}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select platform rules" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlatforms.map(platform => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm text-slate-600">
                  Choose which platform's rules to use for validation
                </div>
              </div>

              {/* TikTok Validation Rules Detail */}
              {selectedValidationPlatform === 'TikTok Ads' && (
                <Card className="bg-purple-50 border-purple-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-purple-900 text-lg flex items-center gap-2">
                      <Badge className="bg-green-600">ACTIVE RULES</Badge>
                      TikTok Enterprise Validation Taxonomy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-purple-800 mb-3">
                      <strong>Your uploaded campaigns will be validated against this 9-position structure:</strong>
                    </div>
                    <div className="font-mono text-xs bg-white p-3 rounded border break-all">
                      lrp_skfc_lrp-eff_effaclarcleanser-0725sa-x_auc_aw-video-views_x_x_ym00479511
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-purple-800 hover:text-purple-900">
                        View Required Token Positions ↓
                      </summary>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 1 - Brand Code (3 chars):</strong> cer, lrp, gar, vic, oap, lp
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 2 - Category Code (4 chars):</strong> skfc, haca, skin, multi, make, haco
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 3 - Subcategory:</strong> cer-cer, lrp-eff, vic-m89, other-advocacy
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 4 - Description:</strong> [name]-[MMYY][region]-[details]
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 5 - Funnel:</strong> auc (auction), res (reservation)
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 6 - Objective:</strong> aw-video-views, aw-reach, cons-traffic
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 7 - Additional:</strong> alwayson, other, x, lla (lookalike)
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 8 - Reserved:</strong> x (usually not used)
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 9 - Campaign ID:</strong> ym + 8 digits (e.g., ym00479511)
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-purple-700 bg-purple-100 p-2 rounded">
                        <strong>Region Codes:</strong> sa (Saudi Arabia), ae (UAE), kw (Kuwait), lb (Lebanon)<br/>
                        <strong>Date Format:</strong> MMYY (e.g., 0725 for July 2025, 0625 for June 2025)<br/>
                        <strong>Special Cases:</strong> TopView campaigns use different format: TOPVIEW-[date]-Q-[id]-[timestamp]
                      </div>
                    </details>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('/rule-maker', '_blank')}
                        className="text-xs border-purple-400 text-purple-800 hover:bg-purple-100"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Modify Rules
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Snapchat Validation Rules Detail */}
              {selectedValidationPlatform === 'Snapchat' && (
                <Card className="bg-amber-50 border-amber-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-amber-900 text-lg flex items-center gap-2">
                      <Badge className="bg-green-600">ACTIVE RULES</Badge>
                      Snapchat Enterprise Validation Taxonomy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-amber-800 mb-3">
                      <strong>Your uploaded campaigns will be validated against this 9-position structure:</strong>
                    </div>
                    <div className="font-mono text-xs bg-white p-3 rounded border break-all">
                      mny_make_others_awareness-snapads-mny-equity-ramadan0225sa_auction_aw-awareness_content
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-amber-800 hover:text-amber-900">
                        View Required Token Positions ↓
                      </summary>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 1 - Brand:</strong> mny, brand_a, brand_b, corp
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 2 - Category:</strong> make, grow, retain, acquire
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 3 - Group:</strong> others, youth, adults, families
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 4 - Theme:</strong> awareness-snapads-mny-equity-ramadan, etc.
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 5 - Period:</strong> 0225 (Feb 25), 0325, 0425, etc.
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 6 - Market:</strong> sa (Saudi), ae (UAE), us, uk, ca
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 7 - Buy Type:</strong> auction, reserved, preferred
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 8 - Objective:</strong> aw-awareness, cv-conversion, tr-traffic
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <strong>Position 9 - Placement:</strong> content, stories, discover, spotlight
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-amber-700 bg-amber-100 p-2 rounded">
                        <strong>Validation Process:</strong> Each uploaded campaign name will be parsed into these 9 positions and checked against the allowed values above. Non-compliant campaigns will receive detailed error messages and suggested fixes.
                      </div>
                    </details>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('/rule-maker', '_blank')}
                        className="text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Modify Rules
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Drop files here or click to browse
                  </h3>
                  <p className="text-slate-600 mt-2">
                    Support for CSV, XLSX, and TXT files containing campaign names
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Select Files
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            <Alert className="mt-4">
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Supported formats:</strong> CSV files with campaign names, XLSX spreadsheets, 
                or TXT files with one campaign name per line. Maximum file size: 10MB.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{file.name}</div>
                          <div className="text-sm text-slate-600">
                            {formatFileSize(file.size)} • {file.campaigns.length > 0 && `${file.campaigns.length} campaigns`}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant={
                            file.status === 'uploaded' ? 'secondary' :
                            file.status === 'processing' ? 'outline' :
                            file.status === 'validated' ? 'default' : 'destructive'
                          }>
                            {file.status === 'processing' && '⏳ Processing...'}
                            {file.status === 'uploaded' && '📁 Uploaded'}
                            {file.status === 'validated' && '✅ Validated'}
                            {file.status === 'error' && '❌ Error'}
                          </Badge>

                          {file.status === 'validated' && file.validationSummary && file.validationSummary.invalid > 0 && (
                            <Button size="sm" variant="outline" onClick={() => applyAllFixes(file.id)}>
                              <Wand2 className="w-4 h-4 mr-2" />
                              Fix All
                            </Button>
                          )}

                          {file.status === 'validated' && (
                            <Button size="sm" onClick={() => exportResults(file)}>
                              <Download className="w-4 h-4 mr-2" />
                              Export
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Validation Results */}
                    {file.validationSummary && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">
                              {file.validationSummary.total}
                            </div>
                            <div className="text-sm text-slate-600">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {file.validationSummary.valid}
                            </div>
                            <div className="text-sm text-slate-600">Valid</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {file.validationSummary.invalid}
                            </div>
                            <div className="text-sm text-slate-600">Invalid</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {file.validationSummary.fixed}
                            </div>
                            <div className="text-sm text-slate-600">Fixed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {Math.round(file.validationSummary.avgScore)}%
                            </div>
                            <div className="text-sm text-slate-600">Avg Score</div>
                          </div>
                        </div>

                        {/* Campaign Details */}
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {file.campaigns.slice(0, 10).map((campaign, index) => (
                            <div key={index} className="p-3 border rounded-lg text-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-mono text-xs">{campaign.originalName}</div>
                                  {campaign.correctedName && (
                                    <div className="font-mono text-xs text-green-600 mt-1">
                                      → {campaign.correctedName}
                                    </div>
                                  )}
                                  {campaign.validationResult && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant={campaign.validationResult.isValid ? "default" : "destructive"} className="text-xs">
                                        {campaign.validationResult.score}/{campaign.validationResult.maxScore}
                                      </Badge>
                                      {campaign.validationResult.violations.length > 0 && (
                                        <span className="text-red-600 text-xs">
                                          {campaign.validationResult.violations.length} issues
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {campaign.quickFixes && campaign.quickFixes.length > 0 && !campaign.isFixed && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => applyQuickFix(file.id, index, 0)}
                                      className="text-xs"
                                    >
                                      Fix
                                    </Button>
                                  )}
                                  {campaign.isFixed && (
                                    <Badge variant="default" className="text-xs">Fixed</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {file.campaigns.length > 10 && (
                            <div className="text-center text-sm text-slate-600 py-2">
                              +{file.campaigns.length - 10} more campaigns...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">File Format Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">CSV Format</div>
                <div className="text-sm text-slate-600">
                  First column: campaign names. Optional second column: platform names.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">XLSX Format</div>
                <div className="text-sm text-slate-600">
                  Campaign names in column A, platforms in column B (optional).
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">TXT Format</div>
                <div className="text-sm text-slate-600">
                  One campaign name per line, plain text format.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Validation Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Validation History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validationLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No validation history yet</h3>
                    <p className="text-slate-600 mb-4">Upload and validate campaign files to see your test history here.</p>
                    <Button onClick={() => setActiveTab('upload')} variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Start Uploading
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{validationLogs.length}</div>
                          <div className="text-sm text-blue-700">Total Tests</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {validationLogs.filter(log => log.status === 'completed').length}
                          </div>
                          <div className="text-sm text-green-700">Successful</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {validationLogs.filter(log => log.status === 'error').length}
                          </div>
                          <div className="text-sm text-red-700">Failed</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round(validationLogs.filter(log => log.status === 'completed').reduce((sum, log) => sum + log.summary.avgScore, 0) / Math.max(validationLogs.filter(log => log.status === 'completed').length, 1))}%
                          </div>
                          <div className="text-sm text-purple-700">Avg Score</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Logs List */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {validationLogs.map((log) => (
                        <Card key={log.id} className={`transition-all hover:shadow-md ${log.status === 'error' ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="font-medium text-slate-900">{log.fileName}</div>
                                  <Badge variant={log.status === 'completed' ? 'default' : 'destructive'}>
                                    {log.status === 'completed' ? 'Completed' : 'Error'}
                                  </Badge>
                                  <Badge variant="outline">{log.platform}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {(log.duration / 1000).toFixed(1)}s
                                  </div>
                                </div>
                              </div>
                              {log.status === 'completed' && (
                                <div className="flex items-center gap-4 text-right">
                                  <div className="text-sm">
                                    <div className="font-medium">Score: {Math.round(log.summary.avgScore)}%</div>
                                    <div className="text-slate-600">{log.summary.total} campaigns</div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center">
                                      <div className="font-bold text-green-600">{log.summary.valid}</div>
                                      <div className="text-slate-500">Valid</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-bold text-red-600">{log.summary.invalid}</div>
                                      <div className="text-slate-500">Invalid</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-bold text-blue-600">{log.summary.fixed}</div>
                                      <div className="text-slate-500">Fixed</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Clear History Button */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setValidationLogs([])}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear History
                      </Button>
                    </div>
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
