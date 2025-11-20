import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Leaf, AlertCircle, CheckCircle, Trash2, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PlantAnalysis {
  id: string;
  image_url: string;
  plant_name: string;
  health_score: number;
  has_disease: boolean;
  disease_name: string;
  confidence: number;
  severity: string;
  symptoms: string[];
  recommendations: string[];
  created_at: string;
}

const PlantHistory = () => {
  const [analyses, setAnalyses] = useState<PlantAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserAnalyses();
  }, []);

  const fetchUserAnalyses = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to view your plant history');
        return;
      }

      const { data, error: dbError } = await supabase
        .from('plant_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (dbError) throw dbError;

      setAnalyses(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load plant history');
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase
        .from('plant_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnalyses(analyses.filter(analysis => analysis.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete analysis');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadCSVReport = () => {
    if (analyses.length === 0) return;

    const headers = [
      'Date',
      'Plant Name',
      'Health Score (%)',
      'Disease Status',
      'Disease Name',
      'Severity',
      'Confidence (%)',
      'Symptoms',
      'Recommendations'
    ];

    const csvData = analyses.map(analysis => [
      formatDate(analysis.created_at),
      analysis.plant_name || 'Unknown Plant',
      analysis.health_score,
      analysis.has_disease ? 'Disease Detected' : 'Healthy',
      analysis.disease_name || 'None',
      analysis.severity || 'N/A',
      Math.round(analysis.confidence),
      Array.isArray(analysis.symptoms) ? analysis.symptoms.join('; ') : 'N/A',
      Array.isArray(analysis.recommendations) ? analysis.recommendations.join('; ') : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `plant_analysis_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadDetailedReport = () => {
    if (analyses.length === 0) return;

    const reportContent = `
PLANT ANALYSIS HISTORY REPORT
Generated on: ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Total Analyses: ${analyses.length}
Healthy Plants: ${analyses.filter(a => !a.has_disease).length}
Plants with Disease: ${analyses.filter(a => a.has_disease).length}
Average Health Score: ${Math.round(analyses.reduce((sum, a) => sum + a.health_score, 0) / analyses.length)}%

═══════════════════════════════════════════════════════════════════

DETAILED ANALYSIS RECORDS:

${analyses.map((analysis, index) => `
${index + 1}. ${analysis.plant_name || 'Unknown Plant'}
   Date: ${formatDate(analysis.created_at)}
   Health Score: ${analysis.health_score}%
   Status: ${analysis.has_disease ? 'Disease Detected' : 'Healthy'}
   ${analysis.has_disease ? `Disease: ${analysis.disease_name || 'Unknown'}
   Severity: ${analysis.severity || 'N/A'}` : ''}
   Confidence: ${Math.round(analysis.confidence)}%
   
   ${analysis.symptoms && analysis.symptoms.length > 0 ? `Symptoms:
   ${analysis.symptoms.map(symptom => `   • ${symptom}`).join('\n')}
   ` : ''}
   ${analysis.recommendations && analysis.recommendations.length > 0 ? `Recommendations:
   ${analysis.recommendations.map(rec => `   • ${rec}`).join('\n')}
   ` : ''}
   ───────────────────────────────────────────────────────────────────
`).join('')}

═══════════════════════════════════════════════════════════════════
Report generated by Plant Health AI - Disease Detection System
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `detailed_plant_report_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent"></div>
        <span className="ml-2 text-gray-600">Loading your plant history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700">{error}</p>
          <Button onClick={fetchUserAnalyses} className="mt-4" variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Leaf className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Plant Analyses Yet</h3>
          <p className="text-gray-500 mb-4">Start analyzing your plants to see your history here!</p>
          <Button onClick={() => window.location.href = '/'} className="bg-green-600 hover:bg-green-700">
            Analyze Your First Plant
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Your Plant History</h2>
          <Badge variant="secondary" className="text-sm">
            {analyses.length} analyses
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={downloadCSVReport}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={analyses.length === 0}
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
          <Button
            onClick={downloadDetailedReport}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            disabled={analyses.length === 0}
          >
            <FileText className="h-4 w-4" />
            Detailed Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analyses.map((analysis) => (
          <Card key={analysis.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Leaf className="h-5 w-5 text-green-600 mr-2" />
                  {analysis.plant_name || 'Unknown Plant'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAnalysis(analysis.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(analysis.created_at)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Plant Image */}
              {analysis.image_url && (
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={analysis.image_url}
                    alt={analysis.plant_name || 'Plant'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Health Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {analysis.has_disease ? (
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  )}
                  <span className="font-medium">
                    {analysis.has_disease ? 'Disease Detected' : 'Healthy'}
                  </span>
                </div>
                <Badge variant="outline">
                  {Math.round(analysis.confidence)}% confidence
                </Badge>
              </div>

              {/* Disease Information */}
              {analysis.has_disease && analysis.disease_name && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Disease:</span>
                    <Badge className={`text-white ${getSeverityColor(analysis.severity)}`}>
                      {analysis.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 bg-red-50 p-2 rounded">
                    {analysis.disease_name}
                  </p>
                </div>
              )}

              {/* Health Score */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Health Score</span>
                  <span className="font-medium">{analysis.health_score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      analysis.health_score >= 80 ? 'bg-green-500' :
                      analysis.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.health_score}%` }}
                  ></div>
                </div>
              </div>

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Top Recommendations:</span>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {analysis.recommendations.slice(0, 2).map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-600 mr-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button onClick={fetchUserAnalyses} variant="outline">
          Refresh History
        </Button>
      </div>
    </div>
  );
};

export default PlantHistory;