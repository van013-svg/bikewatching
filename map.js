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

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

map.on('load', async () => {

    const svg = d3.select("#map").append("svg")

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

    let trips;

    try {
        const csvUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

        trips = await d3.csv(csvUrl);

        console.log('Loaded Trips Data:', trips);
    } catch (error) {
        console.error('Error loading CSV:', error);
    }

    if (!trips) return;

    const departures = d3.rollup(
        trips,
        v => v.length,
        d => d.start_station_id
    );

    const arrivals = d3.rollup(
        trips,
        v => v.length,
        d => d.end_station_id
    );

    stations = stations.map(station => {
        let id = station.short_name;

        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;

        return station;
    });

    console.log("Stations with traffic:", stations);

    const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, d => d.totalTraffic)])
        .range([0, 25]);

    const circles = svg
        .selectAll("circle")
        .data(stations)
        .enter()
        .append("circle")
        .attr("r", d => radiusScale(d.totalTraffic))
        .attr("fill", "steelblue")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0.6)
        .attr("cx", d => getCoords(d).cx)
        .attr("cy", d => getCoords(d).cy)
        .each(function (d) {
            // Add <title> for browser tooltips
            d3.select(this)
            .append('title')
            .text(
                `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
        );
  });

    function updatePositions() {
        circles
            .attr("cx", d => getCoords(d).cx)
            .attr("cy", d => getCoords(d).cy);
    }

    updatePositions();

    map.on('move', updatePositions); // Update during map movement
    map.on('zoom', updatePositions); // Update during zooming
    map.on('resize', updatePositions); // Update on window resize
    map.on('moveend', updatePositions); // Final adjustment after movement ends
});
