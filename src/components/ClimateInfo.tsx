import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, Sun, CloudRain, Thermometer, Droplets, Wind, Search, MapPin, Zap, CloudSnow, CloudDrizzle } from 'lucide-react';
interface ForecastDay {
  date: string;
  condition: string;
  temperature: number;
  icon: string;
}
interface WeatherData {
  location: string;
  date: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
  forecast: ForecastDay[];
  plantCareAdvice: string[];
}
const ClimateInfo = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const {
    toast
  } = useToast();
  const getLocationAndWeather = async (cityName?: string) => {
    setIsLoading(true);
    try {
      let requestData: any = {};
      
      if (cityName) {
        requestData.city = cityName;
      } else {
        // Request geolocation permission
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by this browser.');
        }
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          });
        });
        
        requestData.lat = position.coords.latitude;
        requestData.lon = position.coords.longitude;
        setHasPermission(true);
      }

      // Call the get-weather edge function
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: requestData
      });

      if (error) throw error;

      if (data.success) {
        const weatherInfo = data;
        const processedWeatherData: WeatherData = {
          location: `${weatherInfo.location.city}, ${weatherInfo.location.country}`,
          date: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'short'
          }),
          temperature: weatherInfo.current.temperature,
          humidity: weatherInfo.current.humidity,
          windSpeed: Math.round(weatherInfo.current.wind_speed),
          condition: mapWeatherCondition(weatherInfo.current.weather),
          description: weatherInfo.current.description,
          forecast: weatherInfo.forecast.slice(1, 5).map((day: any) => ({
            date: new Date(day.date).toLocaleDateString('en-US', {
              day: '2-digit',
              month: 'short'
            }),
            condition: mapWeatherCondition(day.weather),
            temperature: day.temperature,
            icon: mapWeatherCondition(day.weather)
          })),
          plantCareAdvice: weatherInfo.care_recommendations
        };

        setWeatherData(processedWeatherData);
        toast({
          title: "Weather Updated",
          description: `Weather information updated for ${processedWeatherData.location}`
        });
      } else {
        throw new Error(data.error || 'Failed to fetch weather data');
      }
    } catch (error: any) {
      console.error('Weather error:', error);
      if (!cityName) {
        setHasPermission(false);
      }
      toast({
        title: "Weather Error",
        description: error.message || (cityName ? "City not found" : "Please allow location access for weather information"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const mapWeatherCondition = (condition: string): string => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain')) return 'rainy';
    if (lowerCondition.includes('cloud')) return 'cloudy';
    if (lowerCondition.includes('clear') || lowerCondition.includes('sun')) return 'sunny';
    if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) return 'stormy';
    if (lowerCondition.includes('drizzle')) return 'drizzle';
    if (lowerCondition.includes('snow')) return 'snowy';
    return 'sunny'; // default
  };
  useEffect(() => {
    // Auto-load weather on component mount
    getLocationAndWeather();
  }, []);
  const getWeatherIcon = (condition: string, size: string = "h-16 w-16") => {
    switch (condition) {
      case 'sunny':
        return <Sun className={`${size} text-yellow-400`} />;
      case 'cloudy':
        return <Cloud className={`${size} text-gray-300`} />;
      case 'rainy':
        return <CloudRain className={`${size} text-blue-400`} />;
      case 'stormy':
        return <Zap className={`${size} text-purple-400`} />;
      case 'drizzle':
        return <CloudDrizzle className={`${size} text-blue-300`} />;
      default:
        return <Sun className={`${size} text-yellow-400`} />;
    }
  };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      getLocationAndWeather(searchQuery.trim());
    }
  };
  if (hasPermission === false && !weatherData) {
    return <Card className="border-none bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-2xl backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="text" placeholder="Search City" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300" />
                </div>
                <Button type="submit" size="icon" variant="secondary" disabled={isLoading}>
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>

            <div className="p-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-300 mb-4">
                Search for a city or enable location access for local weather data
              </p>
              <Button onClick={() => getLocationAndWeather()} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <MapPin className="mr-2 h-4 w-4" />
                Use My Location
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="border-none bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-2xl backdrop-blur-sm">
      <CardContent className="p-6 space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search City (e.g., Mumbai, India)" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300" 
            />
          </div>
          <Button type="submit" size="icon" variant="secondary" disabled={isLoading} title="Search city">
            <Search className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            size="icon" 
            variant="secondary" 
            disabled={isLoading}
            onClick={() => getLocationAndWeather()}
            title="Use current location"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </form>

        {isLoading ? <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-4" />
            <p className="text-gray-300">Loading weather data...</p>
          </div> : weatherData ? <>
            {/* Location and Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-gray-300" />
                <span className="text-lg font-medium">{weatherData.location}</span>
              </div>
              <span className="text-gray-300">{weatherData.date}</span>
            </div>

            {/* Main Weather Display */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-6">
                {getWeatherIcon(weatherData.condition)}
                <div>
                  <h3 className="text-4xl font-bold">{weatherData.temperature}°C</h3>
                  <p className="text-gray-300 text-lg">{weatherData.description}</p>
                </div>
              </div>
            </div>

            {/* Weather Details */}
            <div className="flex justify-between items-center bg-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Droplets className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-300">Humidity</p>
                  <p className="font-semibold">{weatherData.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Wind className="h-5 w-5 text-gray-300" />
                <div>
                  <p className="text-sm text-gray-300">Wind Speed</p>
                  <p className="font-semibold">{weatherData.windSpeed} M/s</p>
                </div>
              </div>
            </div>

            {/* 4-Day Forecast */}
            <div className="grid grid-cols-4 gap-3">
              {weatherData.forecast.map((day, index) => <div key={index} className="text-center bg-white/10 rounded-lg p-3">
                  <p className="text-sm text-gray-300 mb-2">{day.date}</p>
                  <div className="flex justify-center mb-2">
                    {getWeatherIcon(day.condition, "h-8 w-8")}
                  </div>
                  <p className="font-semibold">{day.temperature}°C</p>
                </div>)}
            </div>

            {/* Plant Care Recommendations */}
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3">Plant Care Tips</h4>
              <div className="space-y-2">
                {weatherData.plantCareAdvice.slice(0, 2).map((advice, index) => <div key={index} className="flex items-start space-x-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{advice}</span>
                  </div>)}
              </div>
            </div>
          </> : null}
      </CardContent>
    </Card>;
};
export default ClimateInfo;