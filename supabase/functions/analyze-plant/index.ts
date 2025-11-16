import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  imageUrl: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { imageUrl, userId }: AnalyzeRequest = await req.json();

    if (!imageUrl || !userId) {
      return new Response('Missing required parameters', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    if (!geminiApiKey) {
      return new Response('Gemini API key not configured', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Call Gemini Vision API
    const analysisPrompt = `You are an expert plant pathologist and botanist. Analyze this plant image and provide a detailed assessment in JSON format with the following structure:

{
  "plant_name": "Scientific and common name if identifiable",
  "health_score": 85,
  "has_disease": true/false,
  "disease_name": "Name of disease if detected",
  "confidence": 92.5,
  "severity": "low/medium/high",
  "symptoms": ["List of visible symptoms"],
  "recommendations": ["Specific treatment and care recommendations"],
  "additional_notes": "Any additional observations"
}

Focus on:
- Plant identification
- Disease detection and diagnosis
- Health assessment (0-100 score)
- Specific symptoms visible
- Treatment recommendations
- Preventive care advice

Be thorough but concise. If you're uncertain about identification, mention it in confidence level.`;

    // First, validate that the image contains a plant
    const validationPrompt = `Analyze this image and determine if it contains a plant. Respond with ONLY a JSON object in this exact format:

{
  "contains_plant": true/false,
  "confidence": 0-100,
  "reason": "Brief explanation of why this is or isn't a plant image"
}

If the image contains any living plant (trees, flowers, herbs, vegetables, etc.), set contains_plant to true. If it's an animal, object, landscape without plants, or anything else, set contains_plant to false.`;

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    console.log('Validating image contains plant...');
    
    // Validate image contains plant first
    const validationResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: validationPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 200,
        }
      }),
    });

    if (!validationResponse.ok) {
      const errorText = await validationResponse.text();
      console.error('Gemini validation API error:', validationResponse.status, errorText);
      throw new Error(`Failed to validate image: ${validationResponse.status} ${validationResponse.statusText}`);
    }

    const validationResult = await validationResponse.json();
    const validationText = validationResult.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!validationText) {
      throw new Error('No validation result from Gemini');
    }

    // Parse validation response
    let validationData;
    try {
      validationData = JSON.parse(validationText);
    } catch (parseError) {
      console.error('Failed to parse validation response:', parseError);
      throw new Error('Invalid validation response format');
    }

    // Check if image contains plant
    if (!validationData.contains_plant) {
      console.log('Image validation failed:', validationData.reason);
      throw new Error(`Image validation failed: ${validationData.reason || 'No plant detected in image'}`);
    }

    console.log('Plant validation successful, proceeding with analysis...');
    
    console.log('Calling Gemini API with image size:', imageBuffer.byteLength);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: analysisPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      // If rate limited, provide a fallback analysis
      if (response.status === 429) {
        const fallbackAnalysis = {
          plant_name: "Plant Analysis (Rate Limited)",
          health_score: 75,
          has_disease: false,
          disease_name: null,
          confidence: 50,
          severity: "unknown",
          symptoms: ["Unable to perform detailed analysis due to API limits"],
          recommendations: ["Please try again later", "Check plant for visible signs of disease", "Ensure proper watering and lighting"],
          additional_notes: "Analysis temporarily unavailable due to API rate limits"
        };
        
        // Save fallback to database
        const { data: savedAnalysis } = await supabase
          .from('plant_analyses')
          .insert({
            user_id: userId,
            image_url: imageUrl,
            plant_name: fallbackAnalysis.plant_name,
            health_score: fallbackAnalysis.health_score,
            has_disease: fallbackAnalysis.has_disease,
            disease_name: fallbackAnalysis.disease_name,
            confidence: fallbackAnalysis.confidence,
            severity: fallbackAnalysis.severity,
            symptoms: fallbackAnalysis.symptoms,
            recommendations: fallbackAnalysis.recommendations,
            analysis_data: fallbackAnalysis
          })
          .select()
          .single();
        
        return new Response(JSON.stringify({
          success: true,
          analysis: savedAnalysis,
          rawData: fallbackAnalysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const aiResult = await response.json();
    const analysisText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error('No analysis result from Gemini');
    }

    // Parse the JSON response
    let analysisData;
    try {
      analysisData = JSON.parse(analysisText);
    } catch (parseError) {
      // If parsing fails, create a structured response
      analysisData = {
        plant_name: "Unable to identify",
        health_score: 70,
        has_disease: false,
        disease_name: null,
        confidence: 50,
        severity: "unknown",
        symptoms: ["Analysis completed but unable to parse structured data"],
        recommendations: ["Please consult with a plant expert for detailed diagnosis"],
        additional_notes: analysisText
      };
    }

    // Save to database
    const { data: savedAnalysis, error: dbError } = await supabase
      .from('plant_analyses')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        plant_name: analysisData.plant_name,
        health_score: analysisData.health_score,
        has_disease: analysisData.has_disease,
        disease_name: analysisData.disease_name,
        confidence: analysisData.confidence,
        severity: analysisData.severity,
        symptoms: analysisData.symptoms,
        recommendations: analysisData.recommendations,
        analysis_data: analysisData
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save analysis');
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: savedAnalysis,
      rawData: analysisData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-plant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});