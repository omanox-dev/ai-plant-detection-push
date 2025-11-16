import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'care_reminder' | 'health_alert' | 'analysis_complete';
  userId: string;
  plantName?: string;
  reminderTitle?: string;
  healthScore?: number;
  severity?: string;
  recommendations?: string[];
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
    const { type, userId, plantName, reminderTitle, healthScore, severity, recommendations }: NotificationRequest = await req.json();

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error('User email not found');
    }

    let subject = '';
    let htmlContent = '';

    switch (type) {
      case 'care_reminder':
        subject = `🌿 Plant Care Reminder: ${reminderTitle}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d5a27;">Plant Care Reminder</h2>
            <p>Hello ${profile.display_name || 'Plant Parent'}!</p>
            <p>This is a friendly reminder about your plant care task:</p>
            <div style="background: #f0f8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5a27; margin-top: 0;">${reminderTitle}</h3>
              ${plantName ? `<p><strong>Plant:</strong> ${plantName}</p>` : ''}
            </div>
            <p>Taking good care of your plants helps them thrive and stay healthy!</p>
            <p>Happy gardening! 🌱</p>
          </div>
        `;
        break;

      case 'health_alert':
        const severityColor = severity === 'high' ? '#dc2626' : severity === 'medium' ? '#ea580c' : '#059669';
        subject = `⚠️ Plant Health Alert: ${plantName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${severityColor};">Plant Health Alert</h2>
            <p>Hello ${profile.display_name || 'Plant Parent'}!</p>
            <p>We've detected some health concerns with your plant:</p>
            <div style="background: #fef3f2; border-left: 4px solid ${severityColor}; padding: 20px; margin: 20px 0;">
              <h3 style="color: ${severityColor}; margin-top: 0;">${plantName}</h3>
              <p><strong>Health Score:</strong> ${healthScore}/100</p>
              <p><strong>Severity:</strong> <span style="color: ${severityColor}; text-transform: capitalize;">${severity}</span></p>
            </div>
            ${recommendations && recommendations.length > 0 ? `
              <h4>Recommended Actions:</h4>
              <ul>
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            ` : ''}
            <p>Please check your plant and take appropriate action to help it recover.</p>
          </div>
        `;
        break;

      case 'analysis_complete':
        subject = `🔬 Plant Analysis Complete: ${plantName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d5a27;">Plant Analysis Complete</h2>
            <p>Hello ${profile.display_name || 'Plant Parent'}!</p>
            <p>Your plant analysis is ready:</p>
            <div style="background: #f0f8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5a27; margin-top: 0;">${plantName}</h3>
              <p><strong>Health Score:</strong> ${healthScore}/100</p>
            </div>
            <p>Check your dashboard to view the full analysis results and recommendations.</p>
          </div>
        `;
        break;
    }

    const { error: emailError } = await resend.emails.send({
      from: 'Plant Health Assistant <noreply@resend.dev>',
      to: [profile.email],
      subject,
      html: htmlContent,
    });

    if (emailError) {
      throw emailError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-notifications function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});