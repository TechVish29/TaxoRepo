import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Lightbulb, Target, Settings, Upload, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ValidateCampaignRequest, ValidateCampaignResponse, CampaignValidationResult } from "@shared/api";

export default function Index() {
  const [campaignName, setCampaignName] = useState("");
  const [platform, setPlatform] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CampaignValidationResult | null>(null);
  const [quickFixes, setQuickFixes] = useState<any[]>([]);

  const platforms = [
    "Google Ads",
    "Facebook Ads", 
    "LinkedIn Ads",
    "TikTok Ads",
    "Twitter Ads",
    "YouTube Ads",
    "Email Campaign",
    "Display Network"
  ];

  const validateCampaign = async () => {
    if (!campaignName.trim()) return;
    
    setIsValidating(true);
    try {
      const request: ValidateCampaignRequest = {
        campaignName: campaignName.trim(),
        platform: platform || undefined
      };
      
      const response = await fetch("/api/validate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });
      
      const data: ValidateCampaignResponse = await response.json();
      setValidationResult(data.result);
      setQuickFixes(data.quickFixes || []);
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExampleCampaign = (example: string) => {
    setCampaignName(example);
    setPlatform("Google Ads");
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "bg-green-100 border-green-200";
    if (percentage >= 60) return "bg-yellow-100 border-yellow-200";
    return "bg-red-100 border-red-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Campaign Taxonomy Checker</h1>
                <p className="text-sm text-slate-600">Validate & optimize marketing campaign names</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/rule-maker'}>
                <Settings className="w-4 h-4 mr-2" />
                Rule Maker
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/uploader'}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Bulk Campaign Name Validation
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-4">
            Upload CSV, XLSX, or text files containing campaign names for instant validation against
            platform-specific taxonomies. Get detailed scoring and automated fixes.
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <Button
              size="lg"
              onClick={() => window.location.href = '/uploader'}
              className="px-8"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Campaign Files
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.location.href = '/rule-maker'}
            >
              <Settings className="w-5 h-5 mr-2" />
              Configure Rules
            </Button>
          </div>
        </div>

        {/* Quick Single Validation */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Quick Single Campaign Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Campaign Name
                </label>
                <Input
                  placeholder="mny_make_others_awareness-snapads-mny-equity-ramadan0225sa_auction_aw-awareness_content"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && validateCampaign()}
                  className="text-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Platform
                </label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={validateCampaign}
                disabled={!campaignName.trim() || isValidating}
                size="lg"
                className="px-8"
              >
                {isValidating ? "Validating..." : "Test Single Campaign"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="text-sm text-slate-500">
                Try examples:
                <Button
                  variant="link"
                  className="px-2 text-primary"
                  onClick={() => handleExampleCampaign("mny_make_others_awareness-snapads-mny-equity-ramadan0225sa_auction_aw-awareness_content")}
                >
                  Snapchat
                </Button>
                <Button
                  variant="link"
                  className="px-2 text-primary"
                  onClick={() => handleExampleCampaign("Q4_2024_BlackFriday_Search_US_Promo")}
                >
                  Basic
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">For Multiple Campaigns</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Upload CSV, XLSX, or text files to validate hundreds of campaigns at once.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => window.location.href = '/uploader'}
                  >
                    Go to Document Uploader
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Results */}
        {validationResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Score Card */}
            <Card className={`border-2 ${getScoreBgColor(validationResult.score, validationResult.maxScore)}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  Validation Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(validationResult.score, validationResult.maxScore)}`}>
                    {validationResult.score}/{validationResult.maxScore}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {Math.round((validationResult.score / validationResult.maxScore) * 100)}% Compliant
                  </div>
                  <Badge 
                    variant={validationResult.isValid ? "default" : "destructive"}
                    className="mt-3"
                  >
                    {validationResult.isValid ? "VALID" : "NEEDS FIXES"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Violations */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Issues Found ({validationResult.violations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {validationResult.violations.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      No issues found! Your campaign name follows all rules.
                    </div>
                  ) : (
                    validationResult.violations.map((violation, index) => (
                      <Alert key={index} className="border-l-4 border-l-red-500">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium text-slate-900">{violation.ruleName}</div>
                          <div className="text-sm text-slate-600 mt-1">{violation.description}</div>
                          <div className="text-sm text-primary mt-2 font-medium">
                            💡 {violation.suggestion}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Fixes */}
        {quickFixes.length > 0 && (
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Lightbulb className="w-5 h-5" />
                Quick Fixes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {quickFixes.map((fix, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{fix.description}</div>
                      <div className="text-sm text-slate-600 mt-1 font-mono bg-slate-100 px-2 py-1 rounded">
                        {fix.suggestedName}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        {fix.confidence}% confidence
                      </Badge>
                      <Button 
                        size="sm"
                        onClick={() => setCampaignName(fix.suggestedName)}
                      >
                        Apply Fix
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>No-Code Rule Maker</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Create and customize naming conventions with our intuitive rule builder. No technical knowledge required.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/rule-maker'}>
                Build Rules
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Document Uploader</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Upload CSV, XLSX, or text files containing campaign names for bulk validation and correction.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/uploader'}>
                Upload Documents
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Multi-Platform Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Validate campaigns across Google Ads, Facebook, LinkedIn, and more with platform-specific rules.
              </p>
              <Button variant="outline" className="w-full">
                See Platforms
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
