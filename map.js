import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

mapboxgl.accessToken =
  'pk.eyJ1IjoidmFoZW5zc2EiLCJhIjoiY21wMXdjaDM1MDV0ZDJ4b2pnd3kzem9mMyJ9.lQk7pmlBduD85AvlVrznSw';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);
let timeFilter = -1;

function formatTime(mins) {
  const date = new Date();
  date.setHours(0, mins, 0, 0);
  return date.toLocaleTimeString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) return tripsByMinute.flat();

  let min = (minute - 60 + 1440) % 1440;
  let max = (minute + 60) % 1440;

  if (min > max) {
    return tripsByMinute
      .slice(min)
      .concat(tripsByMinute.slice(0, max))
      .flat();
  }

  return tripsByMinute.slice(min, max).flat();
}

function computeStationTraffic(stations, timeFilter = -1) {
  const filteredDepartures = filterByMinute(departuresByMinute, timeFilter);
  const filteredArrivals = filterByMinute(arrivalsByMinute, timeFilter);

  const departures = d3.rollup(
    filteredDepartures,
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    filteredArrivals,
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stations.map((station) => {
    const id = station.short_name;

    const dep = departures.get(id) ?? 0;
    const arr = arrivals.get(id) ?? 0;

    return {
      ...station,
      departures: dep,
      arrivals: arr,
      totalTraffic: dep + arr,
    };
  });
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

map.on('load', async () => {
  const svg = d3.select('#map').append('svg');

  const jsonData = await d3.json(
    'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
  );

  const trips = await d3.csv(
    'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    }
  );

  trips.forEach((trip) => {
    const startMin = minutesSinceMidnight(trip.started_at);
    const endMin = minutesSinceMidnight(trip.ended_at);

    departuresByMinute[startMin].push(trip);
    arrivalsByMinute[endMin].push(trip);
  });

  let stations = computeStationTraffic(jsonData.data.stations, -1);

  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([3, 25]);

  const circles = svg
    .selectAll('circle')
    .data(stations, (d) => d.short_name)
    .enter()
    .append('circle')
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('opacity', 0.6);

  function updatePositions() {
    circles
      .attr('cx', (d) => getCoords(d).cx)
      .attr('cy', (d) => getCoords(d).cy);
  }

  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

  updatePositions();

  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  function updateScatterPlot() {
    const filteredStations = computeStationTraffic(stations, timeFilter);

    timeFilter === -1
    ? radiusScale.range([0, 25])
    : radiusScale.range([3, 50]);

    circles
      .data(filteredStations, (d) => d.short_name)
      .attr('r', (d) => radiusScale(d.totalTraffic));
  }

  function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = '';
      anyTimeLabel.style.display = 'block';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = 'none';
    }

    updateScatterPlot();
  }

  timeSlider.addEventListener('input', updateTimeDisplay);

  updateTimeDisplay();
});