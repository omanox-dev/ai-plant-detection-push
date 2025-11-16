import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const weatherApiKey = Deno.env.get('WEATHER_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskType } = await req.json() || { taskType: 'care_reminders' };

    if (taskType === 'care_reminders') {
      await processCareReminders();
    } else if (taskType === 'weather_updates') {
      await processWeatherUpdates();
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${taskType} processed successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scheduled-tasks function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processCareReminders() {
  console.log('Processing care reminders...');
  
  // Get overdue care reminders
  const { data: reminders, error } = await supabase
    .from('care_reminders')
    .select(`
      *,
      saved_plants (plant_name),
      profiles (email, display_name)
    `)
    .lte('next_due_date', new Date().toISOString())
    .eq('is_completed', false);

  if (error) {
    console.error('Error fetching reminders:', error);
    return;
  }

  // Send notifications for each reminder
  for (const reminder of reminders || []) {
    try {
      // Send email notification
      await supabase.functions.invoke('send-notifications', {
        body: {
          type: 'care_reminder',
          userId: reminder.user_id,
          plantName: reminder.saved_plants?.plant_name,
          reminderTitle: reminder.title
        }
      });

      // Update next due date
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + reminder.frequency_days);
      
      await supabase
        .from('care_reminders')
        .update({ 
          next_due_date: nextDueDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reminder.id);

      console.log(`Processed reminder: ${reminder.title} for user ${reminder.user_id}`);
    } catch (err) {
      console.error(`Failed to process reminder ${reminder.id}:`, err);
    }
  }
}

async function processWeatherUpdates() {
  console.log('Processing weather updates...');
  
  // Get users with location data
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, location, email, display_name')
    .not('location', 'is', null);

  if (error) {
    console.error('Error fetching user profiles:', error);
    return;
  }

  for (const profile of profiles || []) {
    try {
      // Get precise weather data using geocoding first
      const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(profile.location)}&limit=1&appid=${weatherApiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      
      if (!geocodeResponse.ok) {
        console.error(`Geocoding failed for ${profile.location}`);
        continue;
      }
      
      const geoData = await geocodeResponse.json();
      if (!geoData || geoData.length === 0) {
        console.error(`No coordinates found for ${profile.location}`);
        continue;
      }
      
      const { lat, lon } = geoData[0];
      
      // Get current weather with precise coordinates
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`;
      const weatherResponse = await fetch(weatherUrl);
      
      if (!weatherResponse.ok) {
        console.error(`Weather API failed for coordinates ${lat}, ${lon}`);
        continue;
      }
      
      const weatherData = await weatherResponse.json();
      const temp = weatherData.main.temp;
      const humidity = weatherData.main.humidity;
      const condition = weatherData.weather[0].main;
      
      // Check for weather alerts that affect plant care
      let alertNeeded = false;
      let alertMessage = '';
      
      if (temp > 35) {
        alertNeeded = true;
        alertMessage = `High temperature alert (${temp}°C)! Consider moving sensitive plants to shade and increase watering frequency.`;
      } else if (temp < 5) {
        alertNeeded = true;
        alertMessage = `Low temperature warning (${temp}°C)! Protect plants from frost and move tender plants indoors.`;
      } else if (humidity < 30) {
        alertNeeded = true;
        alertMessage = `Low humidity alert (${humidity}%)! Consider misting plants or using a humidifier.`;
      } else if (condition === 'Rain' || condition === 'Thunderstorm') {
        alertNeeded = true;
        alertMessage = `Weather alert: ${condition} expected! Ensure outdoor plants have proper drainage and protect from heavy rain.`;
      }
      
      if (alertNeeded) {
        // Send weather alert
        await supabase.functions.invoke('send-notifications', {
          body: {
            type: 'care_reminder',
            userId: profile.user_id,
            reminderTitle: 'Weather Alert for Your Plants',
            plantName: alertMessage
          }
        });
      }
      
      console.log(`Processed weather update for user ${profile.user_id} in ${profile.location}: ${temp}°C, ${humidity}% humidity`);
      
    } catch (err) {
      console.error(`Failed to process weather update for user ${profile.user_id}:`, err);
    }
  }
}