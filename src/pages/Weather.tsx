import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Weather = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Plant Care</span>
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">Weather Center</h1>
        </div>

        {/* Search and Location */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="text" 
                  placeholder="Search City (e.g., Mumbai, India)" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-10" 
                />
              </div>
              <Button type="submit" size="icon" disabled={isLoading}>
                <Search className="h-4 w-4" />
              </Button>
              <Button 
                type="button" 
                size="icon" 
                variant="outline"
                disabled={isLoading}
                onClick={getCurrentLocation}
                title="Use current location"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </form>

            {/* Location Display */}
            {location && (
              <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-medium text-gray-800">{location.name}</span>
                </div>
                <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                  📍 {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-600">Loading weather data...</p>
            </CardContent>
          </Card>
        ) : location ? (
          <div className="w-full">
            {/* Weather Radar - Full Width */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">📡 Weather Radar & Precipitation</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://openweathermap.org/weathermap?basemap=map&cities=true&layer=radar&lat=${location.lat}&lon=${location.lon}&zoom=8`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="h-[600px]">
                  <iframe
                    src={`https://openweathermap.org/weathermap?basemap=map&cities=true&layer=radar&lat=${location.lat}&lon=${location.lon}&zoom=8`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 'none' }}
                    title="Weather Radar"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Click the location button or search for a city to view weather data
              </p>
            </CardContent>
          </Card>
        )}

        {/* Plant Care Tips */}
        {location && (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold text-lg mb-4 flex items-center">
                <span className="text-2xl mr-2">🌱</span>
                Plant Care Weather Tips
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">💧 Watering Schedule</p>
                  <p>Adjust watering based on current humidity and temperature conditions</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">🌡️ Temperature Care</p>
                  <p>Monitor for extreme temperatures that may stress your plants</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">☀️ Light Conditions</p>
                  <p>Consider cloud cover when planning indoor plant placement</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">🌧️ Weather Protection</p>
                  <p>Prepare protection during storms or extreme weather events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Weather;