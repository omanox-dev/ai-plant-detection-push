import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun } from 'lucide-react';

const CurrentWeather: React.FC = () => {
  const fixedHeight = 1500; // Fixed height of 1500px
  
  // Pune, Maharashtra coordinates
  const puneCoordinates = {
    lat: 18.5204,
    lon: 73.8567
  };

  return (
    <Card 
      className="w-full overflow-hidden"
      style={{ height: `${fixedHeight}px` }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Current Weather - Pune
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          <div 
            className="w-full rounded-b-lg overflow-hidden"
            style={{ height: `${fixedHeight - 100}px` }}
          >
            <iframe
              src={`https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&lat=${puneCoordinates.lat}&lon=${puneCoordinates.lon}&zoom=10`}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              title="OpenWeather Map - Pune"
              className="rounded-b-lg"
            />
          </div>
          
          <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600 rounded-b-lg border-t">
            <div className="flex items-center justify-between">
              <span>🌍 Powered by OpenWeather</span>
              <span>📍 Pune, Maharashtra (18.5204°, 73.8567°)</span>
              <span>🌱 Perfect for plant care planning</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentWeather;