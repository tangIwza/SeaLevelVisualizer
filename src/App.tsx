import React, { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceDot } from 'recharts';
import { MapPin, TrendingUp, TrendingDown, Moon, Map as MapIcon, CloudSun, CloudRain, CloudLightning, Waves } from 'lucide-react';
import { LunarModal } from './LunarModal';
import { MapModal } from './MapModal';
import { WeatherModal, type HourlyWeather } from './WeatherModal';
import { WaveModal } from './WaveModal';

interface DayData {
  day: number;
  hours: number[];
}

interface MonthData {
  month: number;
  days: DayData[];
}

interface LocationData {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  data: MonthData[];
}

function getLunarPhase(dateStr: string): { phase: string, emoji: string } {
  const date = new Date(dateStr);
  const newMoon = new Date(Date.UTC(2024, 0, 11, 11, 57, 0));
  const synodicMonth = 29.53058867 * 24 * 60 * 60 * 1000;
  const diff = date.getTime() - newMoon.getTime();
  const phase = (diff % synodicMonth + synodicMonth) % synodicMonth / synodicMonth;
  const lunarDays = phase * 29.53058867;

  let label = "";
  if (lunarDays <= 14.765) {
    const day = Math.floor(lunarDays) + 1;
    label = `ขึ้น ${Math.min(day, 15)} ค่ำ`;
  } else {
    const day = Math.floor(lunarDays - 14.765) + 1;
    label = `แรม ${Math.min(day, 15)} ค่ำ`;
  }

  let emoji = "🌑";
  if (phase < 0.03 || phase > 0.97) emoji = "🌑";
  else if (phase < 0.22) emoji = "🌒";
  else if (phase < 0.28) emoji = "🌓";
  else if (phase < 0.47) emoji = "🌔";
  else if (phase < 0.53) emoji = "🌕";
  else if (phase < 0.72) emoji = "🌖";
  else if (phase < 0.78) emoji = "🌗";
  else emoji = "🌘";

  return { phase: label, emoji };
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function App() {
  const [data, setData] = useState<LocationData[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("MT");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isWaveModalOpen, setIsWaveModalOpen] = useState(false);
  const [pinnedData, setPinnedData] = useState<any>(null);
  const [activeHoverData, setActiveHoverData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return `2026-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  interface WeatherData {
    temp: number | null;
    windSpeed: number | null;
    rainProb: number | null;
    hourly: HourlyWeather[];
  }
  const [weather, setWeather] = useState<WeatherData>({ temp: null, windSpeed: null, rainProb: null, hourly: [] });
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    fetch('/tide_data.json')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load data');
        return response.json();
      })
      .then((jsonData: LocationData[]) => {
        setData(jsonData);
        const defaultId = jsonData.find(loc => loc.id === "MT")?.id || (jsonData.length > 0 ? jsonData[0].id : "MT");
        setSelectedLocationId(defaultId);

        // Try to get GPS and select closest station
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            let closestDist = Infinity;
            let closestId = defaultId;

            for (const loc of jsonData) {
              if (loc.lat && loc.lng) {
                const dist = getDistanceFromLatLonInKm(userLat, userLng, loc.lat, loc.lng);
                if (dist < closestDist) {
                  closestDist = dist;
                  closestId = loc.id;
                }
              }
            }
            setSelectedLocationId(closestId);
          }, (err) => {
            console.warn("Geolocation error:", err.message);
          });
        }

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const loc = data.find(l => l.id === selectedLocationId);
    if (!loc || !loc.lat || !loc.lng) return;

    setWeatherLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&hourly=temperature_2m,wind_speed_10m,precipitation_probability,relative_humidity_2m&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max&timezone=Asia%2FBangkok&start_date=${selectedDate}&end_date=${selectedDate}`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${loc.lat}&longitude=${loc.lng}&hourly=wave_height&timezone=Asia%2FBangkok&start_date=${selectedDate}&end_date=${selectedDate}`;

    Promise.all([
      fetch(url).then(res => res.json()),
      fetch(marineUrl).then(res => res.json()).catch(() => ({}))
    ])
      .then(([json, marineJson]) => {
        if (json.hourly && json.hourly.time) {
          
          let hourlyData: HourlyWeather[] = [];
          hourlyData = json.hourly.time.map((timeStr: string, index: number) => {
            let waveHeight = null;
            if (marineJson.hourly && marineJson.hourly.wave_height) {
              waveHeight = marineJson.hourly.wave_height[index];
            }
            return {
              time: timeStr,
              temp: json.hourly.temperature_2m[index],
              windSpeed: json.hourly.wind_speed_10m[index],
              rainProb: json.hourly.precipitation_probability[index],
              humidity: json.hourly.relative_humidity_2m ? json.hourly.relative_humidity_2m[index] : null,
              waveHeight
            };
          });

          let avgTemp = null;
          let avgWind = null;
          let avgRain = null;

          const temps = json.hourly.temperature_2m || [];
          const winds = json.hourly.wind_speed_10m || [];
          const rains = json.hourly.precipitation_probability || [];

          if (temps.length > 0) {
            avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
          }
          if (winds.length > 0) {
            avgWind = winds.reduce((a: number, b: number) => a + b, 0) / winds.length;
          }
          if (rains.length > 0) {
            avgRain = rains.reduce((a: number, b: number) => a + b, 0) / rains.length;
          }

          setWeather({
            temp: avgTemp,
            windSpeed: avgWind,
            rainProb: avgRain !== null ? Math.round(avgRain) : null,
            hourly: hourlyData
          });
        } else {
          setWeather({ temp: null, windSpeed: null, rainProb: null, hourly: [] });
        }
      })
      .catch((err) => {
        console.error("Error fetching weather:", err);
        setWeather({ temp: null, windSpeed: null, rainProb: null, hourly: [] });
      })
      .finally(() => setWeatherLoading(false));
  }, [selectedLocationId, selectedDate, data]);

  const selectedMonth = parseInt(selectedDate.split('-')[1], 10);
  const selectedDay = parseInt(selectedDate.split('-')[2], 10);

  // Compute the data for the chart based on current selection
  const chartData = useMemo(() => {
    if (!data.length) return [];

    const locationData = data.find(loc => loc.id === selectedLocationId);
    if (!locationData) return [];

    const monthData = locationData.data.find(m => m.month === selectedMonth);
    if (!monthData) return [];

    const dayData = monthData.days.find(d => d.day === selectedDay);
    if (!dayData) return [];

    return dayData.hours.map((val, index) => ({
      time: `${index.toString().padStart(2, '0')}:00`,
      hour: index,
      level: val
    }));
  }, [data, selectedLocationId, selectedMonth, selectedDay]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    let min = chartData[0];
    let max = chartData[0];
    for (const dataPoint of chartData) {
      if (dataPoint.level < min.level) min = dataPoint;
      if (dataPoint.level > max.level) max = dataPoint;
    }
    return { min, max };
  }, [chartData]);

  const maxWave = useMemo(() => {
    if (!weather.hourly || weather.hourly.length === 0) return null;
    let max = null;
    let maxTime = "";
    for (const hour of weather.hourly) {
      if (hour.waveHeight !== null && hour.waveHeight !== undefined) {
        if (max === null || hour.waveHeight > max) {
          max = hour.waveHeight;
          maxTime = hour.time;
        }
      }
    }
    if (max === null) return null;
    return { level: max, time: new Date(maxTime).getHours().toString().padStart(2, '0') + ':00' };
  }, [weather.hourly]);

  const lunarPhase = useMemo(() => getLunarPhase(selectedDate), [selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setPinnedData(null);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLocationId(e.target.value);
  };

  const selectedLocation = data.find(loc => loc.id === selectedLocationId);
  const selectedLocationName = selectedLocation?.name || 'Unknown Location';

  if (loading) {
    return (
      <div className="app-container">
        <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <h2>Loading Sea Level Data...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#ef4444' }}>
          <h2>Error: {error}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="dashboard-card">

        {/* Header and Controls */}
        <div className="dashboard-header">

          {/* Top Row: Title & Weather */}
          <div className="header-top-row">
            <div className="title-group-left">
              <h1 style={{ marginBottom: 0 }}>Sea Level<span className="desktop-only-title"> Visualizer</span></h1>
            </div>

            {/* Weather Badge */}
            <div className="weather-badge"
              onClick={() => setIsWeatherModalOpen(true)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.8rem',
                minWidth: 'fit-content',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
              {weatherLoading ? (
                <span style={{ opacity: 0.7 }}>Loading...</span>
              ) : weather.temp !== null ? (
                <>
                  {weather.rainProb !== null && weather.rainProb >= 80 ? (
                    <CloudLightning size={16} style={{ color: '#fbbf24' }} />
                  ) : weather.rainProb !== null && weather.rainProb >= 50 ? (
                    <CloudRain size={16} style={{ color: '#60a5fa' }} />
                  ) : (
                    <CloudSun size={16} style={{ color: '#3b82f6' }} />
                  )}
                  <span>
                    {Math.round(weather.temp)}°C
                    <span style={{ opacity: 0.3, margin: '0 6px' }}>|</span>
                    {Math.round(weather.windSpeed || 0)} km/h
                    {weather.rainProb !== null && (
                      <>
                        <span style={{ opacity: 0.3, margin: '0 6px' }}>|</span>
                        {weather.rainProb}% rain
                      </>
                    )}
                  </span>
                </>
              ) : (
                <span style={{ opacity: 0.7 }}>No weather data</span>
              )}
            </div>
          </div>

          {/* Bottom Row: Location Subtitle & Controls */}
          <div className="header-bottom-row">
            <p className="location-subtitle"><MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {selectedLocationName} (2026)</p>

            <div className="controls-group">
              {/* Map Button */}
              <button
                onClick={() => setIsMapModalOpen(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                title="Select on Map"
              >
                <MapIcon size={20} />
              </button>
              {/* Location Picker */}
              <div className="select-wrapper location-wrapper">
                <select
                  className="custom-select"
                  value={selectedLocationId}
                  onChange={handleLocationChange}
                >
                  {data.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              {/* Date Picker */}
              <div className="select-wrapper date-wrapper">
                <input
                  type="date"
                  className="custom-select"
                  value={selectedDate}
                  onChange={handleDateChange}
                  min="2026-01-01"
                  max="2026-12-31"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Chart Area */}
        <div
          className="chart-container"
          style={{ position: 'relative' }}
          onClick={() => {
            if (activeHoverData) {
              if (pinnedData && pinnedData.label === activeHoverData.label) {
                setPinnedData(null);
              } else {
                setPinnedData(activeHoverData);
              }
            } else {
              setPinnedData(null);
            }
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
              onMouseMove={(e: any) => {
                if (e && e.activePayload) {
                  setActiveHoverData({
                    payload: e.activePayload,
                    label: e.activeLabel,
                    coordinate: e.activeCoordinate
                  });
                } else {
                  setActiveHoverData(null);
                }
              }}
              onMouseLeave={() => setActiveHoverData(null)}
            >
              <defs>
                <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[0, 23]}
                ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
                tickFormatter={(val) => `${val.toString().padStart(2, '0')}:00`}
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickMargin={5}
                minTickGap={20}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={[0, 4]}
                tickFormatter={(value) => `${value}m`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    if (pinnedData && pinnedData.label === label) return null;
                    return (
                      <div className="custom-tooltip">
                        <p className="label">{`${label?.toString().padStart(2, '0')}:00`}</p>
                        <p className="value">{`${payload[0].value} m`}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="level"
                stroke="#34d399"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorLevel)"
                activeDot={{ r: 6, fill: "#fff", stroke: "#34d399", strokeWidth: 2 }}
              />
              {pinnedData && (
                <ReferenceDot
                  x={pinnedData.label}
                  y={pinnedData.payload[0].value}
                  r={6}
                  fill="#fff"
                  stroke="#34d399"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>

          {pinnedData && pinnedData.coordinate && (
            <div
              style={{
                position: 'absolute',
                left: pinnedData.coordinate.x,
                top: pinnedData.coordinate.y,
                pointerEvents: 'none',
                transform: 'translate(-50%, -100%)',
                marginTop: '-10px',
                zIndex: 100
              }}
            >
              <div className="custom-tooltip">
                <p className="label">{`${pinnedData.label?.toString().padStart(2, '0')}:00`}</p>
                <p className="value">{`${pinnedData.payload[0].value} m`}</p>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Area */}
        {stats && (
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon-wrapper high">
                <TrendingUp size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Highest Sea Level</span>
                <span className="stat-value">{stats.max.level} m <span className="stat-time">at {stats.max.time}</span></span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper low">
                <TrendingDown size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Lowest Sea Level</span>
                <span className="stat-value">{stats.min.level} m <span className="stat-time">at {stats.min.time}</span></span>
              </div>
            </div>

            <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => setIsModalOpen(true)} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                <Moon size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">ข้างขึ้นข้างแรม</span>
                <span className="stat-value">{lunarPhase.emoji} {lunarPhase.phase}</span>
              </div>
            </div>

            {maxWave && (
              <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => setIsWaveModalOpen(true)} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Waves size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Max Wave Height</span>
                  <span className="stat-value">{maxWave.level.toFixed(1)} m <span className="stat-time">at {maxWave.time}</span></span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <LunarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dateStr={selectedDate}
        lat={selectedLocation?.lat}
        lng={selectedLocation?.lng}
        locationName={selectedLocationName}
      />

      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        locations={data}
        selectedLocationId={selectedLocationId}
        onSelectLocation={setSelectedLocationId}
      />

      <WeatherModal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        locationName={selectedLocationName}
        dateStr={selectedDate}
        hourlyData={weather.hourly}
      />

      <WaveModal
        isOpen={isWaveModalOpen}
        onClose={() => setIsWaveModalOpen(false)}
        locationName={selectedLocationName}
        dateStr={selectedDate}
        hourlyData={weather.hourly}
      />
    </div>
  );
}

export default App;
