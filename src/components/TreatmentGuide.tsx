import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Volume2, VolumeX, Download, Calendar, Clock, 
  Droplet, Sun, Thermometer, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface AnalysisResult {
  plantName: string;
  diseaseDetected: boolean;
  diseaseName?: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  symptoms: string[];
  recommendations: string[];
  healthScore: number;
  aiAssist?: string;
}

interface TreatmentGuideProps {
  analysis: AnalysisResult;
  imageUrl?: string;
}

interface TreatmentStep {
  day: number;
  title: string;
  actions: string[];
  icon: React.ReactNode;
  color: string;
}

const TreatmentGuide = ({ analysis, imageUrl }: TreatmentGuideProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [treatmentSteps, setTreatmentSteps] = useState<TreatmentStep[]>([]);
  const [aiPlan, setAiPlan] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [careTips, setCareTips] = useState({ watering: '', light: '', environment: '' });
  const [recoveryPrediction, setRecoveryPrediction] = useState('');
  const { toast } = useToast();
  const [highlightedImageUrl, setHighlightedImageUrl] = useState<string | null>(null);

  // Fetch AI-generated treatment plan and create highlighted image
  useEffect(() => {
    fetchAITreatmentPlan();
    if (imageUrl && analysis.diseaseDetected) {
      createHighlightedImage();
    }
  }, [analysis, imageUrl]);

  const fetchAITreatmentPlan = async () => {
    setIsLoadingAI(true);
    try {
      const response = await fetch('http://localhost:8000/generate-treatment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantName: analysis.plantName,
          diseaseDetected: analysis.diseaseDetected,
          diseaseName: analysis.diseaseName,
          severity: analysis.severity,
          symptoms: analysis.symptoms,
          confidence: analysis.confidence,
          healthScore: analysis.healthScore
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI treatment plan');
      }

      const data = await response.json();
      if (data.success && data.treatmentPlan) {
        setAiPlan(data.treatmentPlan);
        parseAITreatmentPlan(data.treatmentPlan);
        
        toast({
          title: '🤖 AI Treatment Plan Generated',
          description: 'Personalized care instructions ready!'
        });
      }
    } catch (error) {
      console.error('AI treatment plan error:', error);
      // Fallback to static plan
      const fallbackSteps = generateTreatmentTimeline(analysis);
      setTreatmentSteps(fallbackSteps);
      
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      toast({
        title: '⚠️ AI Unavailable',
        description: `${errorMsg}. Backend server may be offline. Using fallback plan.`,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const parseAITreatmentPlan = (plan: string) => {
    const timeline: TreatmentStep[] = [];
    
    try {
      // Parse DAY 0 - IMMEDIATE ACTION
      const day0Match = plan.match(/DAY 0.*?IMMEDIATE ACTION:?\s*([\s\S]*?)(?=DAY \d+|WATERING TIP|$)/i);
      if (day0Match) {
        const actions = extractActions(day0Match[1]);
        timeline.push({
          day: 0,
          title: 'Immediate Action',
          actions,
          icon: <AlertCircle className="h-5 w-5" />,
          color: 'text-red-500'
        });
      }

      // Parse DAY 1-3
      const day13Match = plan.match(/DAY 1-3.*?:?\s*([\s\S]*?)(?=DAY \d+|WATERING TIP|$)/i);
      if (day13Match) {
        const actions = extractActions(day13Match[1]);
        timeline.push({
          day: 1,
          title: 'Initial Treatment (Days 1-3)',
          actions,
          icon: <Droplet className="h-5 w-5" />,
          color: 'text-blue-500'
        });
      }

      // Parse DAY 4-7
      const day47Match = plan.match(/DAY 4-7.*?:?\s*([\s\S]*?)(?=DAY \d+|WATERING TIP|$)/i);
      if (day47Match) {
        const actions = extractActions(day47Match[1]);
        timeline.push({
          day: 4,
          title: 'Continued Care (Days 4-7)',
          actions,
          icon: <Sun className="h-5 w-5" />,
          color: 'text-yellow-500'
        });
      }

      // Parse DAY 8-14
      const day814Match = plan.match(/DAY 8-14.*?:?\s*([\s\S]*?)(?=DAY \d+|WATERING TIP|$)/i);
      if (day814Match) {
        const actions = extractActions(day814Match[1]);
        timeline.push({
          day: 8,
          title: 'Recovery Phase (Days 8-14)',
          actions,
          icon: <Sparkles className="h-5 w-5" />,
          color: 'text-green-500'
        });
      }

      // Parse DAY 15+
      const day15Match = plan.match(/DAY 15\+.*?:?\s*([\s\S]*?)(?=WATERING TIP|$)/i);
      if (day15Match) {
        const actions = extractActions(day15Match[1]);
        timeline.push({
          day: 15,
          title: 'Long-term Monitoring',
          actions,
          icon: <Check className="h-5 w-5" />,
          color: 'text-emerald-500'
        });
      }

      // Extract care tips
      const wateringMatch = plan.match(/WATERING TIP:?\s*(.*?)(?=LIGHT TIP|$)/is);
      const lightMatch = plan.match(/LIGHT TIP:?\s*(.*?)(?=ENVIRONMENT TIP|$)/is);
      const envMatch = plan.match(/ENVIRONMENT TIP:?\s*(.*?)(?=RECOVERY PREDICTION|PREVENTIVE|$)/is);
      const recoveryMatch = plan.match(/RECOVERY PREDICTION:?\s*(.*?)(?=\n\n|$)/is);

      setCareTips({
        watering: wateringMatch ? wateringMatch[1].trim() : 'Water when top inch of soil is dry',
        light: lightMatch ? lightMatch[1].trim() : 'Provide bright indirect light',
        environment: envMatch ? envMatch[1].trim() : 'Maintain 65-75°F with good air circulation'
      });

      if (recoveryMatch) {
        setRecoveryPrediction(recoveryMatch[1].trim());
      }

      // If we got at least one timeline item, use it
      if (timeline.length > 0) {
        setTreatmentSteps(timeline);
      } else {
        // Fallback to static
        setTreatmentSteps(generateTreatmentTimeline(analysis));
      }
    } catch (error) {
      console.error('Error parsing AI plan:', error);
      setTreatmentSteps(generateTreatmentTimeline(analysis));
    }
  };

  const extractActions = (text: string): string[] => {
    // Remove markdown formatting and split into actions
    const cleaned = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^\s*[-•]\s*/gm, '');
    
    const lines = cleaned
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && !line.match(/^(DAY|WATERING|LIGHT|ENVIRONMENT|RECOVERY)/i));
    
    return lines.slice(0, 6); // Max 6 actions per step
  };

  const createHighlightedImage = async () => {
    if (!imageUrl || !analysis.diseaseDetected) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Add disease highlighting overlay (simple approach)
          if (analysis.severity === 'High') {
            // Add red overlay for high severity areas (simulate disease detection)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(img.width * 0.3, img.height * 0.2, img.width * 0.4, img.height * 0.3);
            
            // Add warning border
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(img.width * 0.28, img.height * 0.18, img.width * 0.44, img.height * 0.34);
          } else if (analysis.severity === 'Medium') {
            // Yellow overlay for medium severity
            ctx.fillStyle = 'rgba(255, 165, 0, 0.25)';
            ctx.fillRect(img.width * 0.4, img.height * 0.3, img.width * 0.3, img.height * 0.25);
            
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(img.width * 0.38, img.height * 0.28, img.width * 0.34, img.height * 0.29);
          }
          
          // Add legend
          ctx.font = '16px Arial';
          ctx.fillStyle = 'white';
          ctx.fillRect(10, 10, 200, 30);
          ctx.fillStyle = 'black';
          ctx.fillText(`Disease Area (${analysis.severity} severity)`, 15, 30);
          
          setHighlightedImageUrl(canvas.toDataURL('image/jpeg', 0.9));
          resolve(true);
        };
        img.onerror = reject;
        img.src = imageUrl;
      });
    } catch (error) {
      console.warn('Failed to create highlighted image:', error);
    }
  };

  const generateTreatmentTimeline = (result: AnalysisResult): TreatmentStep[] => {
    const timeline: TreatmentStep[] = [];
    
    if (result.diseaseDetected) {
      // Day 0: Immediate action
      timeline.push({
        day: 0,
        title: 'Immediate Action',
        actions: [
          'Isolate the affected plant from healthy ones',
          'Take clear photos for progress tracking',
          result.recommendations[0] || 'Remove severely affected leaves'
        ],
        icon: <AlertCircle className="h-5 w-5" />,
        color: 'text-red-500'
      });

      // Day 1-3: Initial treatment
      timeline.push({
        day: 1,
        title: 'Initial Treatment (Days 1-3)',
        actions: [
          result.recommendations[1] || 'Apply appropriate treatment',
          'Water only at soil level, avoid wet leaves',
          'Ensure good air circulation around plant',
          'Monitor for spreading symptoms'
        ],
        icon: <Droplet className="h-5 w-5" />,
        color: 'text-blue-500'
      });

      // Day 4-7: Continued care
      timeline.push({
        day: 4,
        title: 'Continued Care (Days 4-7)',
        actions: [
          'Reapply treatment if needed',
          'Check for new growth or improvement',
          'Maintain consistent watering schedule',
          'Adjust light exposure if needed'
        ],
        icon: <Sun className="h-5 w-5" />,
        color: 'text-yellow-500'
      });

      // Day 8-14: Recovery phase
      timeline.push({
        day: 8,
        title: 'Recovery Phase (Days 8-14)',
        actions: [
          'Gradually reduce treatment frequency',
          'Resume normal fertilization schedule',
          'Look for signs of healthy new growth',
          'Consider preventive measures'
        ],
        icon: <Sparkles className="h-5 w-5" />,
        color: 'text-green-500'
      });

      // Day 15+: Monitoring
      timeline.push({
        day: 15,
        title: 'Ongoing Monitoring',
        actions: [
          'Continue regular health checks',
          'Maintain optimal growing conditions',
          'Watch for any symptom recurrence',
          'Document plant progress with photos'
        ],
        icon: <Check className="h-5 w-5" />,
        color: 'text-emerald-500'
      });
    } else {
      // Healthy plant maintenance
      timeline.push({
        day: 0,
        title: 'Maintain Health',
        actions: [
          'Continue current care routine',
          'Water when top inch of soil is dry',
          'Ensure adequate light exposure',
          'Monitor weekly for any changes'
        ],
        icon: <Check className="h-5 w-5" />,
        color: 'text-green-500'
      });
    }

    return timeline;
  };

  const speakInstructions = () => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Voice instructions are not supported in your browser.',
        variant: 'destructive'
      });
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Use AI-generated plan if available, otherwise fallback
    let textToSpeak = '';
    
    if (aiPlan) {
      // Clean up AI plan for speech
      textToSpeak = aiPlan
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/DAY \d+(-\d+)?\s*-\s*/gi, '. Day ')
        .replace(/:/g, '. ')
        .replace(/\n+/g, '. ')
        .substring(0, 1000); // Limit length
    } else {
      textToSpeak = `
        Treatment guide for ${analysis.plantName}.
        ${analysis.diseaseDetected 
          ? `Disease detected: ${analysis.diseaseName}. Severity: ${analysis.severity}.` 
          : 'Your plant appears healthy.'
        }
        Here are the recommended steps:
        ${treatmentSteps.map((step, idx) => 
          `Step ${idx + 1}: ${step.title}. ${step.actions.join('. ')}`
        ).join('. ')}
      `;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => {
      setIsPlaying(false);
      toast({
        title: 'Error',
        description: 'Failed to play voice instructions.',
        variant: 'destructive'
      });
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);

    toast({
      title: aiPlan ? '🔊 Playing AI Instructions' : '🔊 Playing Instructions',
      description: 'Voice guide started. Click again to stop.'
    });
  };

  const generatePDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header (fix corrupted symbols)
      doc.setFontSize(20);
      doc.setTextColor(34, 139, 34);
      doc.text('Plant Care Guide', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });

      // Add plant image if available
      if (imageUrl) {
        try {
          yPos += 15;
          const imgWidth = 60;
          const imgHeight = 45;
          const imgX = (pageWidth - imgWidth) / 2;
          
          // Convert image to base64 for PDF
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
              
              const imageData = canvas.toDataURL('image/jpeg', 0.8);
              doc.addImage(imageData, 'JPEG', imgX, yPos, imgWidth, imgHeight);
              resolve(true);
            };
            img.onerror = reject;
            // Use highlighted image in PDF if available, otherwise original
            img.src = (highlightedImageUrl && analysis.diseaseDetected) ? highlightedImageUrl : imageUrl;
          });
          
          yPos += imgHeight + 10;
        } catch (error) {
          console.warn('Failed to add image to PDF:', error);
        }
      }

      // Plant Information
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 51);
      doc.text('Plant Information', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.text(`Plant Name: ${analysis.plantName}`, 25, yPos);
      
      yPos += 7;
      doc.text(`Health Score: ${analysis.healthScore}/100`, 25, yPos);
      
      if (analysis.diseaseDetected) {
        yPos += 7;
        doc.setTextColor(220, 38, 38);
        doc.text(`Disease: ${analysis.diseaseName}`, 25, yPos);
        
        yPos += 7;
        doc.text(`Severity: ${analysis.severity}`, 25, yPos);
        
        yPos += 7;
        doc.text(`Confidence: ${analysis.confidence.toFixed(1)}%`, 25, yPos);
      }

      // Symptoms
      if (analysis.symptoms.length > 0) {
        yPos += 15;
        doc.setFontSize(14);
        doc.setTextColor(51, 51, 51);
        doc.text('Symptoms Observed', 20, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        analysis.symptoms.forEach((symptom, idx) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${idx + 1}. ${symptom}`, 25, yPos);
          yPos += 6;
        });
      }

      // Treatment Timeline
      yPos += 10;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 51);
      doc.text('Treatment Timeline', 20, yPos);

      treatmentSteps.forEach((step, idx) => {
        yPos += 12;
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(34, 139, 34);
        doc.text(`Day ${step.day}${step.day > 0 ? '+' : ''}: ${step.title}`, 25, yPos);
        
        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        step.actions.forEach((action, actionIdx) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${action}`, pageWidth - 50);
          lines.forEach((line: string) => {
            doc.text(line, 30, yPos);
            yPos += 5;
          });
        });
      });

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Plant Health AI - Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`${analysis.plantName.replace(/\s+/g, '_')}_care_guide.pdf`);

      toast({
        title: '✅ PDF Downloaded',
        description: 'Your plant care guide has been saved.'
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF.',
        variant: 'destructive'
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="mt-6 border-2 border-nature/20 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-forest/10 to-nature/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-nature" />
              Smart Treatment Guide
              {isLoadingAI && <span className="text-xs text-muted-foreground">(AI generating...)</span>}
            </CardTitle>
            <CardDescription>
              {aiPlan 
                ? '🤖 AI-powered personalized treatment plan with Gemini' 
                : 'AI-powered step-by-step care instructions with voice guidance'
              }
            </CardDescription>
          </div>
          <Badge className={`${getSeverityColor(analysis.severity)} text-white`}>
            {analysis.diseaseDetected ? `${analysis.severity} Severity` : 'Healthy'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={speakInstructions}
            variant={isPlaying ? "destructive" : "outline"}
            className="flex-1 min-w-[150px]"
          >
            {isPlaying ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Stop Voice Guide
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Voice Instructions
              </>
            )}
          </Button>
          
          <Button 
            onClick={generatePDF}
            variant="outline"
            className="flex-1 min-w-[150px]"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF Guide
          </Button>
        </div>

        {/* Disease Highlighting Preview */}
        {highlightedImageUrl && analysis.diseaseDetected && (
          <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Disease Area Detection
            </h4>
            <div className="relative inline-block">
              <img 
                src={highlightedImageUrl} 
                alt="Plant with highlighted disease areas" 
                className="max-w-full h-auto rounded-lg shadow-md max-h-64"
              />

            </div>
            <p className="text-xs text-gray-600 mt-2">
              * Highlighted areas are estimated based on disease severity. For precise diagnosis, consult a plant expert.
            </p>
          </div>
        )}

        {/* Health Overview */}
        <div className="p-4 bg-gradient-to-br from-forest/5 to-nature/5 rounded-lg border border-nature/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Plant Health Score</span>
            <span className="text-2xl font-bold text-nature">{analysis.healthScore}%</span>
          </div>
          <Progress value={analysis.healthScore} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {analysis.healthScore >= 80 ? 'Excellent condition' :
             analysis.healthScore >= 60 ? 'Good condition with room for improvement' :
             analysis.healthScore >= 40 ? 'Needs attention and care' :
             'Critical - immediate action required'}
          </p>
        </div>

        {/* Treatment Timeline */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-nature" />
            Treatment Timeline
          </h3>
          
          <div className="space-y-4">
            {treatmentSteps.map((step, idx) => (
              <div 
                key={idx}
                className={`relative pl-8 pb-4 ${
                  idx === currentStep ? 'border-l-4 border-nature' : 'border-l-2 border-gray-200'
                }`}
              >
                <div className={`absolute left-0 top-0 -translate-x-1/2 p-2 rounded-full bg-white border-2 ${
                  idx === currentStep ? 'border-nature' : 'border-gray-300'
                } ${step.color}`}>
                  {step.icon}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Day {step.day}{step.day > 0 ? '+' : ''}
                    </Badge>
                    <h4 className="font-semibold">{step.title}</h4>
                  </div>
                  
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {step.actions.map((action, actionIdx) => (
                      <li key={actionIdx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-nature mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        {analysis.aiAssist && (
          <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Expert Insight
            </h4>
            <p className="text-sm text-gray-700">{analysis.aiAssist}</p>
          </div>
        )}

        {/* AI-Generated Care Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Droplet className="h-5 w-5 text-blue-600 mb-2" />
            <h5 className="font-semibold text-sm mb-1 flex items-center gap-1">
              Watering
              {aiPlan && <Sparkles className="h-3 w-3 text-purple-500" />}
            </h5>
            <p className="text-xs text-gray-600">
              {careTips.watering || (analysis.diseaseDetected 
                ? 'Water at soil level only, avoid wet foliage'
                : 'Maintain regular watering schedule'
              )}
            </p>
          </div>
          
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <Sun className="h-5 w-5 text-yellow-600 mb-2" />
            <h5 className="font-semibold text-sm mb-1 flex items-center gap-1">
              Light
              {aiPlan && <Sparkles className="h-3 w-3 text-purple-500" />}
            </h5>
            <p className="text-xs text-gray-600">
              {careTips.light || (analysis.severity === 'High'
                ? 'Avoid direct harsh sunlight during treatment'
                : 'Ensure adequate bright indirect light'
              )}
            </p>
          </div>
          
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <Thermometer className="h-5 w-5 text-orange-600 mb-2" />
            <h5 className="font-semibold text-sm mb-1 flex items-center gap-1">
              Environment
              {aiPlan && <Sparkles className="h-3 w-3 text-purple-500" />}
            </h5>
            <p className="text-xs text-gray-600">
              {careTips.environment || 'Maintain 65-75°F with good air circulation'}
            </p>
          </div>
        </div>

        {/* AI Recovery Prediction */}
        {recoveryPrediction && (
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              Recovery Prediction
            </h4>
            <p className="text-sm text-gray-700">{recoveryPrediction}</p>
          </div>
        )}

        {/* Progress Tracker Tip */}
        <div className="p-3 bg-nature/5 rounded-lg border border-nature/20 text-sm">
          <p className="font-medium mb-1">💡 Track Your Progress</p>
          <p className="text-xs text-muted-foreground">
            Take photos every 3-4 days and compare them using our analyzer to monitor improvement.
            Re-scan weekly to track recovery progress.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TreatmentGuide;
