
// Configuration file for Google Maps API
var MAP_CONFIG = {
    apiKey: 'AIzaSyAXXl-S0lORRgk3UOCwA705LxGIR4PZjNw',  // Your actual API key

    defaultZoom: 12,
    defaultLat: 12.9716,  // Bangalore coordinates
    defaultLng: 77.5946,
    mapStyles: {
        hideLabels: true,
        lightRoads: true
    }
};

// Ensure it's available globally (use var instead of const)
window.MAP_CONFIG = MAP_CONFIG;

// Debug line to confirm it loaded
console.log('Config.js executed, MAP_CONFIG set:', MAP_CONFIG);