import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, ExternalLink } from 'lucide-react';

const ClimateInfo = () => {
  const [location, setLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get current location
  const getCurrentLocation = async () => {
    setIsLoading(true);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser.');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Use coordinates as location name for now
      setLocation({
        lat: latitude,
        lon: longitude,
        name: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`
      });
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for city
  const searchCity = async (cityName: string) => {
    setIsLoading(true);
    try {
      // For demo, we'll use a simple geocoding API
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`);
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setLocation({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          name: display_name.split(',').slice(0, 2).join(', ')
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchCity(searchQuery.trim());
    }
  };

  // Auto-load current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <Card className="border-none bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-2xl backdrop-blur-sm">
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
          <Button type="submit" size="icon" variant="secondary" disabled={isLoading}>
            <Search className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            size="icon" 
            variant="secondary" 
            disabled={isLoading}
            onClick={getCurrentLocation}
            title="Use current location"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </form>

        {/* Location Display */}
        {location && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-gray-300" />
              <span className="text-lg font-medium">{location.name}</span>
            </div>
            <div className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded">
              📍 {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-4" />
            <p className="text-gray-300">Loading weather data...</p>
          </div>
        ) : location ? (
          <>
            {/* Weather Center Link */}
            <div className="bg-white/10 rounded-lg p-6 text-center space-y-4">
              <h3 className="font-semibold text-xl mb-4">Weather Information</h3>
              <p className="text-gray-300 mb-6">View comprehensive weather data and interactive maps</p>
              
              <Button
                onClick={() => window.location.href = '/weather'}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white p-6 h-auto w-full max-w-md mx-auto flex flex-col items-center space-y-3"
              >
                <div className="text-4xl">🌤️</div>
                <div>
                  <div className="font-bold text-lg">Open Weather Center</div>
                  <div className="text-sm opacity-90">Interactive maps, radar, forecasts & more</div>
                </div>
                <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
                  📍 {location.name}
                </div>
              </Button>

              <div className="mt-6 text-sm text-gray-400">
                Access full weather dashboard with live data from OpenWeather
              </div>
            </div>

            {/* Plant Care Tips */}
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3">🌱 Plant Care Tips</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• Check soil moisture daily in current weather conditions</p>
                <p>• Adjust watering schedule based on temperature and humidity</p>
                <p>• Monitor plants for weather-related stress signs</p>
                <p>• Provide extra protection during extreme weather</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">
              Click the location button or search for a city to view weather data
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClimateInfo;