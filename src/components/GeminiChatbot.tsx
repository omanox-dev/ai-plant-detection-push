import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Loader2, Send, Sparkles, Leaf } from 'lucide-react';

interface PlantAnalysisContext {
  plantName?: string;
  diseaseDetected?: boolean;
  diseaseName?: string;
  confidence?: number;
  severity?: string;
  symptoms?: string[];
  recommendations?: string[];
  healthScore?: number;
  aiAssist?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeminiChatbotProps {
  analysisContext?: PlantAnalysisContext;
}

const GeminiChatbot: React.FC<GeminiChatbotProps> = ({ analysisContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When analysis context changes, send welcome message with analysis data
  useEffect(() => {
    if (analysisContext && Object.keys(analysisContext).length > 0) {
      let welcomeMessage = `🌱 **New Plant Analysis Available**\n\n`;
      welcomeMessage += `📋 **Plant:** ${analysisContext.plantName}\n`;
      welcomeMessage += `📊 **Confidence:** ${analysisContext.confidence}%\n`;
      welcomeMessage += `💚 **Health Score:** ${analysisContext.healthScore}/100\n\n`;
      
      if (analysisContext.diseaseDetected) {
        welcomeMessage += `⚠️ **Disease Detected:** ${analysisContext.diseaseName}\n`;
        welcomeMessage += `🔴 **Severity:** ${analysisContext.severity}\n\n`;
        
        if (analysisContext.symptoms && analysisContext.symptoms.length > 0) {
          welcomeMessage += `**Symptoms:**\n${analysisContext.symptoms.map(s => `• ${s}`).join('\n')}\n\n`;
        }
        
        if (analysisContext.recommendations && analysisContext.recommendations.length > 0) {
          welcomeMessage += `**Recommendations:**\n${analysisContext.recommendations.map(r => `• ${r}`).join('\n')}\n\n`;
        }
      } else {
        welcomeMessage += `✅ **Status:** Your plant appears healthy!\n\n`;
      }
      
      welcomeMessage += `💬 I'm your AI plant assistant. Ask me anything about this analysis, treatment options, or general plant care!`;

      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [analysisContext]);

  const buildSystemPrompt = () => {
    if (!analysisContext) {
      return `You are a helpful plant care assistant with expertise in plant diseases, treatment, and general plant care. 
Be friendly, concise, and provide actionable advice.`;
    }

    let systemPrompt = `You are an expert plant care assistant. The user has just analyzed their plant with the following results:\n\n`;
    systemPrompt += `Plant Name: ${analysisContext.plantName}\n`;
    systemPrompt += `Disease Detected: ${analysisContext.diseaseDetected ? 'Yes' : 'No'}\n`;
    
    if (analysisContext.diseaseDetected) {
      systemPrompt += `Disease Name: ${analysisContext.diseaseName}\n`;
      systemPrompt += `Severity: ${analysisContext.severity}\n`;
      systemPrompt += `Confidence: ${analysisContext.confidence}%\n`;
      systemPrompt += `Health Score: ${analysisContext.healthScore}/100\n`;
      
      if (analysisContext.symptoms && analysisContext.symptoms.length > 0) {
        systemPrompt += `Symptoms: ${analysisContext.symptoms.join(', ')}\n`;
      }
      
      if (analysisContext.recommendations && analysisContext.recommendations.length > 0) {
        systemPrompt += `Recommendations: ${analysisContext.recommendations.join(', ')}\n`;
      }
    } else {
      systemPrompt += `The plant appears healthy with a score of ${analysisContext.healthScore}/100.\n`;
    }
    
    if (analysisContext.aiAssist) {
      systemPrompt += `\nDetailed Analysis: ${analysisContext.aiAssist}\n`;
    }
    
    systemPrompt += `\nAnswer user questions based on this analysis. Be specific, helpful, and reference the analysis data when relevant. 
Keep responses concise but informative. If asked about treatment, provide step-by-step guidance.`;
    
    return systemPrompt;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      
      // Build conversation history for context
      const conversationHistory = messages
        .slice(-5) // Last 5 messages for context
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const fullPrompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory}\n\nUser: ${input}\n\nAssistant:`;

      // Call Gemini API
      const response = await fetch(`http://localhost:8000/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          analysisContext: analysisContext
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please make sure the backend server is running on port 8000.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Remove markdown formatting for cleaner display
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1')      // Remove italic *text*
      .replace(/#{1,6}\s/g, '')         // Remove headers #
      .replace(/`([^`]+)`/g, '$1')      // Remove inline code `text`
      .replace(/^\s*[-*]\s/gm, '• ')    // Convert - or * lists to bullets
      .trim();
    
    return formatted;
  };

  return (
    <Card className="w-full h-[600px] flex flex-col bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 border-2 border-green-200 dark:border-green-800">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-green-200 dark:border-green-800 bg-white/50 dark:bg-gray-900/50">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
          <Leaf className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Plant AI Assistant <Sparkles className="w-4 h-4 text-yellow-500" />
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Powered by Gemini AI
          </p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Welcome to Plant AI Assistant
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {analysisContext 
                ? 'Analysis loaded! Ask me anything about your plant.' 
                : 'Analyze a plant to get started, then ask me questions!'}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-left">
                {formatMessage(message.content)}
              </div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-5 h-5 animate-spin text-green-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-green-200 dark:border-green-800 bg-white/50 dark:bg-gray-900/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your plant..."
            disabled={isLoading}
            className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default GeminiChatbot;
