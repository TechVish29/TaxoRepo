import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
  feature: string;
}

export default function Placeholder({ title, description, feature }: PlaceholderProps) {
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
            <div>
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-600">{description}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-16 max-w-2xl">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Construction className="w-8 h-8 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-slate-900">Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-slate-600 text-lg">
              The {feature} feature is currently under development and will be available soon.
            </p>
            <p className="text-slate-500">
              Continue prompting to have this page built out with full functionality, 
              or explore the existing Campaign Taxonomy Checker features.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
              <Button onClick={() => window.location.href = "/"}>
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
