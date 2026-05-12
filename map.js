import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1IjoidmFoZW5zc2EiLCJhIjoiY21wMXdjaDM1MDV0ZDJ4b2pnd3kzem9mMyJ9.lQk7pmlBduD85AvlVrznSw';

const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/streets-v12', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18, // Maximum allowed zoom
});

map.on('load', async () => {
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });

    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': "#2E7D32",  // A bright green using hex code
            'line-width': 3,          // Thicker lines
            'line-opacity': 0.5,       // Slightly less transparent
        },
    });

    map.addSource("cambridge_route", {
        type: "geojson",
        data: "https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson",
    });

    map.addLayer({
        id: "bike-lanes-cambridge",
        type: "line",
        source: "cambridge_route",
        paint: {
        "line-color": "#2E7D32",
        "line-width": 3,
        "line-opacity": 0.5,
        },
    });

    let jsonData;

    try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

        // Await JSON fetch
        jsonData = await d3.json(jsonurl);

        console.log('Loaded JSON Data:', jsonData); // Log to verify structure
    }   catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }

    if (!jsonData) return;
    
    let stations = jsonData.data.stations;
    console.log("Stations Array:", stations);
});
