import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlantAnalyzer from '@/components/PlantAnalyzer';
import ClimateInfo from '@/components/ClimateInfo';
import GeminiChatbot from '@/components/GeminiChatbot';
import { Button } from '@/components/ui/button';
import { Leaf, Stethoscope, Brain, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import heroImage from '@/assets/hero-plants.jpg';

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

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | undefined>();

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-white" />
            <span className="text-white font-semibold">Plant Health AI</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {!loading && (
              <>
                {user && (
                  <div className="flex items-center space-x-2 text-white/90">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Welcome back!</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAuthAction}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur"
                >
                  {user ? (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-forest/80 to-forest/40"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            AI Based Disease Detection
              <span className="block text-nature-light">In Medical Plants</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 animate-slide-up">
              Advanced disease detection, climate-smart recommendations, and expert botanical guidance for medicinal plants
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <div className="flex items-center justify-center space-x-2 px-6 py-3 bg-white/10 backdrop-blur rounded-full border border-white/20">
                <Stethoscope className="h-5 w-5" />
                <span>Disease Detection</span>
              </div>
              <div className="flex items-center justify-center space-x-2 px-6 py-3 bg-white/10 backdrop-blur rounded-full border border-white/20">
                <Leaf className="h-5 w-5" />
                <span>Climate Integration</span>
              </div>
              <div className="flex items-center justify-center space-x-2 px-6 py-3 bg-white/10 backdrop-blur rounded-full border border-white/20">
                <Brain className="h-5 w-5" />
                <span>AI Assistant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 space-y-12">
        {/* Feature Grid */}
        <section className="grid lg:grid-cols-2 gap-8">
          {/* Plant Analysis */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-forest mb-3">
                Intelligent Disease Detection
              </h2>
              <p className="text-muted-foreground">
                Upload images of your medicinal plants for instant AI-powered analysis and treatment recommendations
              </p>
            </div>
            <PlantAnalyzer onAnalysisComplete={setAnalysisResult} />
          </div>

          {/* Climate & Chatbot */}
          <div className="space-y-6">
            <ClimateInfo />
            <div className="text-center" id="plant-chatbot">
              <GeminiChatbot analysisContext={analysisResult} />
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="grid md:grid-cols-3 gap-6 pt-12">
          <div className="text-center p-6 rounded-lg bg-gradient-card shadow-soft animate-float">
            <Stethoscope className="h-12 w-12 text-forest mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-forest mb-2">Advanced Diagnostics</h3>
            <p className="text-muted-foreground">
              State-of-the-art AI algorithms trained on thousands of plant disease images for accurate identification
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-gradient-card shadow-soft animate-float" style={{ animationDelay: '0.1s' }}>
            <Leaf className="h-12 w-12 text-nature mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-forest mb-2">Climate Smart</h3>
            <p className="text-muted-foreground">
              Real-time weather integration provides personalized care recommendations based on your local conditions
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-gradient-card shadow-soft animate-float" style={{ animationDelay: '0.2s' }}>
            <Brain className="h-12 w-12 text-earth mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-forest mb-2">Expert Knowledge</h3>
            <p className="text-muted-foreground">
              Access botanical expertise 24/7 through our intelligent chatbot trained on medicinal plant care
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Leaf className="h-6 w-6 text-forest" />
            <span className="text-lg font-semibold text-forest">Plant Health AI</span>
          </div>
          <p className="text-muted-foreground">
            Empowering gardeners and herbalists with intelligent plant care technology
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;