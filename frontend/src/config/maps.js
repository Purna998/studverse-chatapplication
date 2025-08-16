// Google Maps API Configuration
// TODO: Replace with your actual Google Maps API key
export const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// Google Maps API configuration
export const MAPS_CONFIG = {
  apiKey: GOOGLE_MAPS_API_KEY,
  libraries: ['places'],
  defaultCenter: { lat: 27.7172, lng: 85.3240 }, // Default to Kathmandu
  defaultZoom: 14,
  maxZoom: 18,
  minZoom: 10,
  mapStyles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Helper function to check if API key is set
export const isMapsApiKeySet = () => {
  return GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY';
};

// Helper function to get the Google Maps script URL
export const getMapsScriptUrl = () => {
  if (!isMapsApiKeySet()) {
    console.warn('Google Maps API key not provided. Please add your API key to config/maps.js');
    return null;
  }
  
  return `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
}; 