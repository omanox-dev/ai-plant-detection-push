import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    botpressWebChat: {
      init: (config: any) => void;
      onEvent: (callback: (event: any) => void, events: string[]) => void;
      sendEvent: (event: any) => void;
      sendPayload: (payload: any) => void;
      mergeConfig: (config: any) => void;
      isOpen: () => boolean;
      open: () => void;
      close: () => void;
    };
    // Store analysis in window for chatbot access
    currentPlantAnalysis?: PlantAnalysisContext;
  }
}

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

interface PlantChatbotProps {
  analysisContext?: PlantAnalysisContext;
}

const PlantChatbot: React.FC<PlantChatbotProps> = ({ analysisContext }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Hide the Botpress floating button and widget completely
    const hideBotpressElements = () => {
      const style = document.createElement('style');
      style.textContent = `
        .bpw-widget-btn, .bpw-floating-button, .bpw-widget, .bpw-widget-container, .bpw-widget-iframe {
          display: none !important;
        }
        .bpw-widget-btn, .bpw-floating-button, .bpw-widget, .bpw-widget-container, .bpw-widget-iframe {
          visibility: hidden !important;
        }
        .bpw-widget-btn, .bpw-floating-button, .bpw-widget, .bpw-widget-container, .bpw-widget-iframe {
          opacity: 0 !important;
        }
        .bpw-widget-btn, .bpw-floating-button, .bpw-widget, .bpw-widget-container, .bpw-widget-iframe {
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
        }
      `;
      document.head.appendChild(style);
    };

    // Check if script is already loaded
    if (window.botpressWebChat) {
      setIsLoaded(true);
      hideBotpressElements();
      return;
    }

    // Load Botpress Webchat script
    const script = document.createElement('script');
    script.src = 'https://cdn.botpress.cloud/webchat/v1/inject.js';
    script.async = true;
    
    script.onload = () => {
      // Wait a bit for the script to fully initialize
      setTimeout(() => {
        if (window.botpressWebChat) {
          try {
            // // Initialize Botpress Webchat
            // window.botpressWebChat.init({
            //   "composerPlaceholder": "Ask about your plants...",
            //   "botConversationDescription": "Plant assistant",
            //   "botId": "d1065343-de50-4387-8b54-38f74dd55bf0",
            //   "hostUrl": "https://cdn.botpress.cloud/webchat/v1",
            //   "messagingUrl": "https://messaging.botpress.cloud",
            //   "clientId": "d1065343-de50-4387-8b54-38f74dd55bf0",
            //   "webhookId": "",
            //   "lazySocket": true,
            //   "themeName": "prism",
            //   "botName": "Plant Assistant",
            //   "avatarUrl": "https://cdn.botpress.cloud/webchat/v1/assets/plant.png",
            //   "phoneNumber": "",
            //   "emailAddress": "",
            //   "websiteUrl": "",
            //   "callToAction": "",
            //   "callToActionUrl": "",
            //   "sendIcon": "https://cdn.botpress.cloud/webchat/v1/assets/send.svg",
            //   "profileAvatar": "https://cdn.botpress.cloud/webchat/v1/assets/profile.svg",
            //   "openIcon": "https://cdn.botpress.cloud/webchat/v1/assets/open.svg",
            //   "closeIcon": "https://cdn.botpress.cloud/webchat/v1/assets/close.svg",
            //   "chatIcon": "https://cdn.botpress.cloud/webchat/v1/assets/chat.svg",
            //   "hideWidget": true,
            //   "disableToggle": true,
            //   "useSessionStorage": true,
            //   "closeOnEscape": false,
            //   "showConversationsButton": false,
            //   "enableTranscriptDownload": false,
            //   "stylesheet": "https://cdn.botpress.cloud/webchat/v1/assets/webchat.css"
            // });
            window.botpressWebChat.init({
              "composerPlaceholder": "Ask about your plants...",
              "botConversationDescription": "Plant assistant",
              "botId": "d1065343-de50-4387-8b54-38f74dd55bf0",
              "hostUrl": "https://cdn.botpress.cloud/webchat/v1",
              "messagingUrl": "https://messaging.botpress.cloud",
              "clientId": "d1065343-de50-4387-8b54-38f74dd55bf0",
              "lazySocket": true,
              "themeName": "prism",
              "botName": "Plant Assistant",
              "avatarUrl": "https://cdn.botpress.cloud/webchat/v1/assets/plant.png",
              "showPoweredBy": false,   // 🚀 removes watermark
              "hideWidget": true,
              "disableToggle": true,
              "useSessionStorage": true,
              "showConversationsButton": false,
              "enableTranscriptDownload": false,
              "stylesheet": "https://cdn.botpress.cloud/webchat/v1/assets/webchat.css"
            
            });
            

            // Listen for successful initialization
            window.botpressWebChat.onEvent((event: any) => {
              if (event.type === 'LIFECYCLE.LOADED') {
                setIsLoaded(true);
                hideBotpressElements();
                
                // Send analysis context to chatbot if available
                if (analysisContext && Object.keys(analysisContext).length > 0) {
                  sendAnalysisContext(analysisContext);
                }
                
                // Open the chat widget
                setTimeout(() => {
                  window.botpressWebChat.open();
                }, 1000);
              }
            }, ['LIFECYCLE.LOADED']);

          } catch (error) {
            console.error('Botpress initialization error:', error);
            setIsError(true);
          }
        } else {
          setIsError(true);
        }
      }, 1000);
    };

    script.onerror = () => {
      console.error('Failed to load Botpress script');
      setIsError(true);
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      const existingScript = document.querySelector('script[src*="botpress.cloud"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [analysisContext]);

  // Clear previous analysis data
  const clearPreviousAnalysis = () => {
    // Clear global storage
    window.currentPlantAnalysis = undefined;
    
    // Try to clear chatbot config
    try {
      if (window.botpressWebChat?.mergeConfig) {
        window.botpressWebChat.mergeConfig({
          userData: {
            currentAnalysis: null
          }
        });
      }
    } catch (e) {
      console.warn('Could not clear chatbot config:', e);
    }
    
    console.log('🧹 Previous analysis cleared from memory');
  };

  // Send analysis context to chatbot
  const sendAnalysisContext = (context: PlantAnalysisContext) => {
    if (!window.botpressWebChat) return;

    try {
      // Clear any previous analysis first
      clearPreviousAnalysis();
      
      // Store new analysis in window object for chatbot to access
      window.currentPlantAnalysis = context;
      
      // Wait a moment for chatbot to be fully ready
      setTimeout(() => {
        if (!window.botpressWebChat) return;

        // Create structured data payload for chatbot memory
        const structuredData = {
          type: 'proactive-trigger',
          channel: 'web',
          payload: {
            type: 'plant-analysis',
            replace: true, // This analysis replaces any previous one
            data: {
              plantName: context.plantName,
              diseaseDetected: context.diseaseDetected,
              diseaseName: context.diseaseName || 'None',
              confidence: context.confidence,
              severity: context.severity || 'Low',
              symptoms: context.symptoms || [],
              recommendations: context.recommendations || [],
              healthScore: context.healthScore || 0,
              aiAnalysis: context.aiAssist || '',
              timestamp: new Date().toISOString()
            }
          }
        };

        // Format human-readable message
        let contextMessage = `🌱 NEW ANALYSIS - MEMORY UPDATED\n\n`;
        contextMessage += `📋 Current Plant: ${context.plantName}\n`;
        contextMessage += `📊 Confidence: ${context.confidence}%\n`;
        contextMessage += `💚 Health Score: ${context.healthScore}/100\n\n`;
        
        if (context.diseaseDetected) {
          contextMessage += `⚠️ DISEASE DETECTED: ${context.diseaseName}\n`;
          contextMessage += `Severity: ${context.severity}\n\n`;
          if (context.symptoms && context.symptoms.length > 0) {
            contextMessage += `Symptoms:\n${context.symptoms.map(s => `• ${s}`).join('\n')}\n\n`;
          }
        } else {
          contextMessage += `✅ Status: Healthy Plant\n\n`;
        }
        
        if (context.aiAssist) {
          contextMessage += `AI Analysis:\n${context.aiAssist}\n\n`;
        }
        
        if (context.recommendations && context.recommendations.length > 0) {
          contextMessage += `Recommendations:\n${context.recommendations.map(r => `• ${r}`).join('\n')}\n\n`;
        }
        
        contextMessage += `📌 This is now my CURRENT plant analysis. All my answers will be based on THIS data until you analyze another plant.\n\n`;
        contextMessage += `💬 Ask me anything about this plant!`;

        // Send to chatbot with structured data
        try {
          window.botpressWebChat.sendEvent({
            type: 'proactive-trigger',
            channel: 'web',
            payload: structuredData.payload
          });
          console.log('✅ NEW analysis stored in chatbot memory (previous cleared):', structuredData);
        } catch (e) {
          console.warn('Structured data send failed, trying text message:', e);
        }

        // Also send as text message for display
        try {
          window.botpressWebChat.sendEvent({
            type: 'text',
            text: contextMessage
          });
          console.log('✅ Text message sent to chatbot');
        } catch (e) {
          console.error('Failed to send text message:', e);
        }

        // Try to inject into chatbot config/state
        try {
          if (window.botpressWebChat.mergeConfig) {
            window.botpressWebChat.mergeConfig({
              userData: {
                currentAnalysis: context
              }
            });
            console.log('✅ Analysis merged into chatbot config');
          }
        } catch (e) {
          console.warn('Could not merge config:', e);
        }

      }, 2000); // Wait 2 seconds for chatbot to be ready
      
    } catch (error) {
      console.error('Failed to send analysis context:', error);
    }
  };

  // Update context when it changes
  useEffect(() => {
    if (isLoaded && analysisContext && window.botpressWebChat) {
      sendAnalysisContext(analysisContext);
    }
  }, [analysisContext, isLoaded]);

  const handleManualOpen = () => {
    if (window.botpressWebChat && isLoaded) {
      window.botpressWebChat.open();
    }
  };

  if (isError) {
    return (
      <div className="w-full h-[600px] relative flex items-center justify-center">
        <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Connection Error</h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            Unable to connect to Botpress. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] relative flex items-center justify-center">
      <div className="text-center">
        <div className="">
          <span className=""></span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {isLoaded ? '' : ''}
        </p>
        {isLoaded && (
          <button
            onClick={handleManualOpen}
            className=""
          >
          
          </button>
        )}
        <div className="text-xs text-muted-foreground mt-4">
        </div>
      </div>
    </div>
  );
};

export default PlantChatbot;
