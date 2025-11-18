import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Camera, Leaf, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface PlantAnalyzerProps {
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

const PlantAnalyzer = ({ onAnalysisComplete }: PlantAnalyzerProps) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [labels, setLabels] = useState<string[] | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to validate if image contains a plant
  const validatePlantImage = useCallback(
    async (file: File): Promise<{ isValid: boolean; reason?: string }> => {
      return new Promise((resolve) => {
        const img = new window.Image();
        const canvas = document.createElement('canvas');
        // getContext requires a parameter, so we should check for null after calling it
        const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Get image data for analysis
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Enhanced validation with multiple checks
          let greenPixels = 0;
          let brownPixels = 0;
          let totalPixels = data.length / 4;
          let hasVariedColors = false;
          let colorVariations = new Set();
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Check for green dominance (common in plants)
            if (g > r && g > b && g > 50) {
              greenPixels++;
            }
            
            // Check for brown tones (stems, soil, bark)
            if (r > 100 && g > 80 && b < 100 && Math.abs(r - g) < 30) {
              brownPixels++;
            }
            
            // Track color variations
            const colorKey = `${Math.floor(r/25)},${Math.floor(g/25)},${Math.floor(b/25)}`;
            colorVariations.add(colorKey);
          }
          
          // Calculate percentages
          const greenPercentage = (greenPixels / totalPixels) * 100;
          const brownPercentage = (brownPixels / totalPixels) * 100;
          const colorVariety = colorVariations.size;
          
          // Enhanced plant detection logic
          let isPlant = false;
          let reason = '';
          
          if (greenPercentage > 20) {
            isPlant = true;
            reason = 'High green content detected - likely a plant';
          } else if (greenPercentage > 10 && brownPercentage > 5) {
            isPlant = true;
            reason = 'Moderate green with brown tones - likely a plant';
          } else if (colorVariety > 50 && (greenPercentage > 5 || brownPercentage > 10)) {
            isPlant = true;
            reason = 'Varied colors with plant-like tones detected';
          } else if (greenPercentage < 5 && brownPercentage < 5) {
            isPlant = false;
            reason = 'No significant plant-like colors detected';
          } else {
            isPlant = false;
            reason = 'Insufficient plant characteristics detected';
          }
          
          resolve({ isValid: isPlant, reason });
        } else {
          resolve({ isValid: false, reason: 'Failed to analyze image' });
        }
      };
      
      img.onerror = () => resolve({ isValid: false, reason: 'Failed to load image' });
      img.src = URL.createObjectURL(file);
      });
    }, []
  );

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Clear previous validation errors
      setValidationError(null);
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate that the image contains a plant
      try {
        const validation = await validatePlantImage(file);
        
        if (!validation.isValid) {
          setValidationError("Please upload a plant photo.");
          toast({
            title: "Invalid Image",
            description: "Please upload a plant photo.",
            variant: "destructive",
          });
          return;
        }
        
        // Image is valid - proceed
        setSelectedImage(file);
        setImageUrl(URL.createObjectURL(file));
        setAnalysisResult(null);
        
        toast({
          title: "Image Validated",
          description: "Plant image detected successfully",
        });
        
      } catch (error) {
        setValidationError("Failed to validate image. Please try again.");
        toast({
          title: "Validation Error",
          description: "Unable to validate image. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [toast, validatePlantImage]);

  const analyzeImage = useCallback(async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);

    try {
      const form = new FormData();
      form.append('file', selectedImage);

      const res = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Prediction failed');
      }

      const data = await res.json();

      const result: AnalysisResult = {
        plantName: data.plantName,
        diseaseDetected: data.diseaseDetected,
        diseaseName: data.diseaseName,
        confidence: data.confidence,
        severity: data.severity,
        symptoms: data.symptoms || [],
        recommendations: data.recommendations || [],
        healthScore: data.healthScore || Math.round(data.confidence),
        aiAssist: data.aiAssist,
      };

      setAnalysisResult(result);
      
      // Call the callback to share results with chatbot
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
        console.log('📤 Sending analysis to chatbot:', result);
      }

      toast({
        title: 'Analysis Complete',
        description: `Plant identified as ${result.plantName}. Check chatbot for details!`,
      });
    } catch (err: any) {
      toast({
        title: 'Analysis Error',
        description: err?.message || 'Prediction failed',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, toast]);

  // Fetch label list from server so frontend and server use same mapping
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/labels');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.labels) setLabels(data.labels);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'text-destructive bg-destructive/10';
      case 'Medium': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
      case 'Low': return 'text-nature bg-nature/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-forest" />
            <CardTitle className="text-2xl">Plant Disease Detection</CardTitle>
          </div>
          <CardDescription>
            Upload an image of your medicinal plant for disease analysis
            {/* AI-powered */}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center space-y-4">
            {imageUrl ? (
              <div className="space-y-4">
                <img
                  src={imageUrl}
                  alt="Selected plant"
                  className="mx-auto max-h-64 rounded-lg object-cover shadow-nature"
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedImage(null);
                      setImageUrl(null);
                      setAnalysisResult(null);
                      setValidationError(null);
                    }}
                  >
                    Choose Different Image
                  </Button>
                  <Button
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Camera className="h-4 w-4" />
                        <span>Analyze Plant</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Upload Plant Image</p>
                  <p className="text-muted-foreground">
                    Drag & drop or click to select (Max 5MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button asChild variant="outline" className="hover:bg-nature/10">
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Select Image
                  </label>
                </Button>
                
                {/* Validation Error Display */}
                {validationError && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{validationError}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {analysisResult && (
        <Card className="border-none bg-gradient-card shadow-soft animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {analysisResult.diseaseDetected ? (
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-nature" />
                )}
                <span>Analysis Results</span>
              </CardTitle>
              <Badge className={getSeverityColor(analysisResult.severity)}>
                {analysisResult.severity} Risk
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-forest mb-2">Plant Identification</h4>
                <p className="text-lg font-medium">{analysisResult.plantName}</p>
                <p className="text-sm text-muted-foreground">
                  {analysisResult.confidence}% confidence
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-forest mb-2">Health Score</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-lg font-medium">{analysisResult.healthScore}/100</span>
                    <span className="text-sm text-muted-foreground">
                      {analysisResult.healthScore >= 80 ? 'Excellent' : 
                       analysisResult.healthScore >= 60 ? 'Good' : 
                       analysisResult.healthScore >= 40 ? 'Fair' : 'Poor'}
                    </span>
                  </div>
                  <Progress value={analysisResult.healthScore} className="h-2" />
                </div>
              </div>
            </div>

            {analysisResult.diseaseDetected && (
              <div>
                <h4 className="font-semibold text-forest mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Disease Detected: {analysisResult.diseaseName}
                </h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-2">Symptoms Identified:</h5>
                    <ul className="space-y-1">
                      {analysisResult.symptoms.map((symptom, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center">
                          <Info className="h-3 w-3 mr-2" />
                          {symptom}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {analysisResult.aiAssist && (
              <div className="bg-gradient-primary/5 border border-forest/20 rounded-lg p-4">
                <h4 className="font-semibold text-forest mb-2 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  AI Expert Analysis
                </h4>
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {analysisResult.aiAssist}
                </p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-forest mb-2">Recommendations</h4>
              <ul className="space-y-2">
                {analysisResult.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-foreground flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-nature flex-shrink-0" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlantAnalyzer;