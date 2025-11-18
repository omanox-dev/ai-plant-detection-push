import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const weatherApiKey = Deno.env.get('WEATHER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherRequest {
  city?: string;
  lat?: number;
  lon?: number;
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
    const { city, lat, lon }: WeatherRequest = await req.json();

    let weatherUrl = '';
    let locationName = '';
    let coordinates = { lat: 0, lon: 0 };
    
    if (lat && lon) {
      // Use precise coordinates directly
      weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`;
      coordinates = { lat, lon };
      locationName = `${lat}, ${lon}`;
    } else if (city) {
      // First get precise coordinates using geocoding with better parameters
      // Support format: "City, State, Country" or "City, Country" or just "City"
      const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=5&appid=${weatherApiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      
      if (!geocodeResponse.ok) {
        throw new Error(`Geocoding API error: ${geocodeResponse.statusText}`);
      }
      
      const geoData = await geocodeResponse.json();
      if (!geoData || geoData.length === 0) {
        throw new Error('Location not found. Try format: "City, Country" for better accuracy');
      }
      
      // Use first result (most relevant)
      const { lat: geoLat, lon: geoLon, name, state, country } = geoData[0];
      coordinates = { lat: geoLat, lon: geoLon };
      locationName = state ? `${name}, ${state}, ${country}` : `${name}, ${country}`;
      weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${geoLat}&lon=${geoLon}&appid=${weatherApiKey}&units=metric`;
    } else {
      return new Response('Either city name or coordinates are required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const response = await fetch(weatherUrl);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const weatherData = await response.json();

    // Process the forecast data to get daily summaries
    const dailyForecasts = [];
    const processedDays = new Set();

    for (const item of weatherData.list.slice(0, 32)) { // Get enough data for 4 days
      const date = new Date(item.dt * 1000);
      const dayKey = date.toDateString();
      
      if (!processedDays.has(dayKey) && dailyForecasts.length < 4) {
        dailyForecasts.push({
          date: dayKey,
          temperature: Math.round(item.main.temp),
          feels_like: Math.round(item.main.feels_like),
          humidity: item.main.humidity,
          weather: item.weather[0].main,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          wind_speed: item.wind.speed,
          pressure: item.main.pressure
        });
        processedDays.add(dayKey);
      }
    }

    // Generate plant care recommendations based on weather
    const currentWeather = dailyForecasts[0];
    let careRecommendations = [];

    if (currentWeather) {
      // Temperature-based recommendations
      if (currentWeather.temperature > 30) {
        careRecommendations.push("🌡️ High temperature alert! Increase watering frequency and provide shade.");
      } else if (currentWeather.temperature < 5) {
        careRecommendations.push("❄️ Cold weather warning! Protect sensitive plants from frost.");
      }

      // Humidity recommendations
      if (currentWeather.humidity < 30) {
        careRecommendations.push("💧 Low humidity detected. Consider using a humidifier near your plants.");
      } else if (currentWeather.humidity > 80) {
        careRecommendations.push("🌫️ High humidity levels. Ensure good air circulation to prevent fungal issues.");
      }

      // Weather-based care
      if (currentWeather.weather.includes('Rain')) {
        careRecommendations.push("🌧️ Rainy weather ahead! Reduce watering and check drainage.");
      } else if (currentWeather.weather.includes('Clear')) {
        careRecommendations.push("☀️ Sunny weather! Perfect time for photosynthesis. Monitor soil moisture.");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      location: {
        name: locationName,
        city: weatherData.city.name,
        country: weatherData.city.country,
        coordinates: coordinates
      },
      current: dailyForecasts[0] || null,
      forecast: dailyForecasts,
      care_recommendations: careRecommendations,
      last_updated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-weather function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather data';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});