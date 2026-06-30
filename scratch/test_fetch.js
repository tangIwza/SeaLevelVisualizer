const url = 'https://api.open-meteo.com/v1/forecast?latitude=12.6&longitude=100.9&hourly=temperature_2m,wind_speed_10m,precipitation_probability,relative_humidity_2m&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max&timezone=Asia%2FBangkok&start_date=2026-07-08&end_date=2026-07-08';

fetch(url)
  .then(res => res.json())
  .then(json => {
    console.log("Keys in hourly:", Object.keys(json.hourly));
    console.log("First 3 hours relative_humidity_2m:", json.hourly.relative_humidity_2m.slice(0, 3));
  })
  .catch(err => console.error(err));
