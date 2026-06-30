import React, { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceDot, ReferenceArea, ReferenceLine } from 'recharts';
import { MapPin, TrendingUp, TrendingDown, Moon, Map as MapIcon, CloudSun, CloudRain, CloudLightning, Waves, Fish } from 'lucide-react';
import { LunarModal } from './LunarModal';
import { MapModal } from './MapModal';
import { WeatherModal, type HourlyWeather } from './WeatherModal';
import { WaveModal } from './WaveModal';
import { Sidebar } from './Sidebar';
import { LocalMapModal } from './LocalMapModal';

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

const CurrentTimeLabel = (props: any) => {
  const { viewBox, value, isRising } = props;
  const { x, y } = viewBox;
  
  const width = 68;
  const height = 22;
  const arrowSize = 6;
  const r = 10;
  const tipY = y;
  const by = tipY - arrowSize - height;
  const bx = x - width / 2;
  
  const d = `
    M ${bx + r} ${by}
    L ${bx + width - r} ${by}
    Q ${bx + width} ${by} ${bx + width} ${by + r}
    L ${bx + width} ${by + height - r}
    Q ${bx + width} ${by + height} ${bx + width - r} ${by + height}
    L ${x + arrowSize} ${by + height}
    L ${x} ${tipY}
    L ${x - arrowSize} ${by + height}
    L ${bx + r} ${by + height}
    Q ${bx} ${by + height} ${bx} ${by + height - r}
    L ${bx} ${by + r}
    Q ${bx} ${by} ${bx + r} ${by}
    Z
  `;

  return (
    <g>
      <path d={d} fill="white" stroke="#ef4444" strokeWidth={1} />
      <text x={x} y={by + height / 2 + 4} fill="#ef4444" fontSize={11} fontWeight="bold" textAnchor="middle">
        {value.toFixed(2)} m {isRising ? '↑' : '↓'}
      </text>
    </g>
  );
};

function App() {
  const [data, setData] = useState<LocationData[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("MT");
  const [activeTab, setActiveTab] = useState<'standard' | 'local'>('standard');
  const [localCoordinate, setLocalCoordinate] = useState<{lat: number, lng: number} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isLocalMapModalOpen, setIsLocalMapModalOpen] = useState(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isWaveModalOpen, setIsWaveModalOpen] = useState(false);
  const [pinnedData, setPinnedData] = useState<any>(null);
  const [showFishingTime, setShowFishingTime] = useState(false);
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('tide_data.json')
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
    let targetLat: number | undefined;
    let targetLng: number | undefined;

    if (activeTab === 'standard') {
      const loc = data.find(l => l.id === selectedLocationId);
      if (loc) {
        targetLat = loc.lat;
        targetLng = loc.lng;
      }
    } else if (activeTab === 'local' && localCoordinate) {
      targetLat = localCoordinate.lat;
      targetLng = localCoordinate.lng;
    }

    if (!targetLat || !targetLng) return;

    setWeatherLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLng}&hourly=temperature_2m,wind_speed_10m,precipitation_probability,relative_humidity_2m&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max&timezone=Asia%2FBangkok&start_date=${selectedDate}&end_date=${selectedDate}`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${targetLat}&longitude=${targetLng}&hourly=wave_height&timezone=Asia%2FBangkok&start_date=${selectedDate}&end_date=${selectedDate}`;

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
  }, [selectedLocationId, selectedDate, data, activeTab, localCoordinate]);

  const selectedMonth = parseInt(selectedDate.split('-')[1], 10);
  const selectedDay = parseInt(selectedDate.split('-')[2], 10);

  // Compute the data for the chart based on current selection
  const chartData = useMemo(() => {
    if (!data.length) return [];

    if (activeTab === 'standard') {
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
    } else {
      // Local mode
      if (!localCoordinate) return [];
      
      const validLocations = data.filter(loc => loc.lat !== undefined && loc.lng !== undefined);
      if (validLocations.length < 2) return [];

      const distances = validLocations.map(loc => {
        const dist = getDistanceFromLatLonInKm(localCoordinate.lat, localCoordinate.lng, loc.lat!, loc.lng!);
        return { loc, dist };
      });

      distances.sort((a, b) => a.dist - b.dist);
      const p1 = distances[0];
      const p2 = distances[1];

      let w1, w2;
      if (p1.dist === 0) {
        w1 = 1; w2 = 0;
      } else if (p2.dist === 0) {
        w1 = 0; w2 = 1;
      } else {
        w1 = p2.dist / (p1.dist + p2.dist);
        w2 = p1.dist / (p1.dist + p2.dist);
      }

      const p1Month = p1.loc.data.find(m => m.month === selectedMonth);
      const p2Month = p2.loc.data.find(m => m.month === selectedMonth);

      if (!p1Month || !p2Month) return [];

      const p1Day = p1Month.days.find(d => d.day === selectedDay);
      const p2Day = p2Month.days.find(d => d.day === selectedDay);

      if (!p1Day || !p2Day) return [];

      return p1Day.hours.map((val1, index) => {
        const val2 = p2Day.hours[index];
        const interpolatedLevel = (val1 * w1) + (val2 * w2);
        
        return {
          time: `${index.toString().padStart(2, '0')}:00`,
          hour: index,
          level: interpolatedLevel
        };
      });
    }
  }, [data, selectedLocationId, selectedMonth, selectedDay, activeTab, localCoordinate]);

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

  const isToday = useMemo(() => {
    const todayStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
    return selectedDate === todayStr;
  }, [selectedDate, currentTime]);

  const currentLevelData = useMemo(() => {
    if (!isToday || chartData.length === 0) return null;
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const xPos = currentHour + currentMinute / 60;
    
    const currentData = chartData.find(d => d.hour === currentHour);
    const nextData = chartData.find(d => d.hour === currentHour + 1);
    
    if (currentData && nextData) {
      const diff = nextData.level - currentData.level;
      const level = currentData.level + (diff * (currentMinute / 60));
      const isRising = diff > 0;
      return { xPos, level, isRising };
    } else if (currentData) {
      return { xPos, level: currentData.level, isRising: true };
    }
    return null;
  }, [isToday, chartData, currentTime]);

  // Compute best fishing periods (hours with highest tide change rate)
  const fishingPeriods = useMemo(() => {
    if (!chartData.length || chartData.length < 2) return [];

    const changes: { hour: number; prevHour: number; change: number }[] = [];
    for (let i = 1; i < chartData.length; i++) {
      changes.push({
        hour: chartData[i].hour,
        prevHour: chartData[i - 1].hour,
        change: Math.abs(chartData[i].level - chartData[i - 1].level)
      });
    }

    const avgChange = changes.reduce((sum, c) => sum + c.change, 0) / changes.length;
    const threshold = avgChange * 0.8;

    // Group consecutive high-change hours into periods
    const periods: { start: number; end: number }[] = [];
    let current: { start: number; end: number } | null = null;

    for (const c of changes) {
      if (c.change >= threshold) {
        if (!current) {
          current = { start: c.prevHour, end: c.hour };
        } else {
          current.end = c.hour;
        }
      } else {
        if (current) {
          periods.push(current);
          current = null;
        }
      }
    }
    if (current) periods.push(current);

    return periods;
  }, [chartData]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setPinnedData(null);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLocationId(e.target.value);
  };

  const selectedLocation = data.find(loc => loc.id === selectedLocationId);
  const selectedLocationName = activeTab === 'standard' 
    ? (selectedLocation?.name || 'Unknown Location')
    : (localCoordinate ? `Custom (${localCoordinate.lat.toFixed(4)}, ${localCoordinate.lng.toFixed(4)})` : 'Select a location');

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
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="app-container">
        <div className="dashboard-card">

        {/* Header and Controls */}
        <div className="dashboard-header">

          {/* Top Row: Title & Weather */}
          <div className="header-top-row">
            <div className="title-group-left">
              <h1 className="dashboard-title" style={{ marginBottom: 0 }}>SeaLevel<span className="desktop-only-title logo-highlight"> App</span></h1>
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
                onClick={() => activeTab === 'standard' ? setIsMapModalOpen(true) : setIsLocalMapModalOpen(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  width: '42px',
                  height: '42px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                title="Select on Map"
              >
                <MapIcon size={20} />
              </button>
              {/* Location Picker */}
              <div className="select-wrapper location-wrapper">
                {activeTab === 'standard' ? (
                  <select
                    className="custom-select"
                    value={selectedLocationId}
                    onChange={handleLocationChange}
                  >
                    {data.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                ) : (
                  <button 
                    className="custom-select" 
                    style={{ textAlign: 'left', minWidth: '160px' }}
                    onClick={() => setIsLocalMapModalOpen(true)}
                  >
                    {localCoordinate ? `${localCoordinate.lat.toFixed(2)}, ${localCoordinate.lng.toFixed(2)}` : 'Select Location'}
                  </button>
                )}
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
              {/* Best Fishing Time Toggle */}
              <button
                className={`fishing-btn${showFishingTime ? ' active' : ''}`}
                onClick={() => setShowFishingTime(f => !f)}
                style={{
                  background: showFishingTime ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${showFishingTime ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  color: showFishingTime ? '#ef4444' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap'
                }}
                title="Best Fishing Time"
              >
                <Fish size={18} />
                <span className="desktop-only-title">Fishing</span>
              </button>
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
              margin={{ top: 30, right: 10, left: -15, bottom: 0 }}
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
                {showFishingTime && (
                  <linearGradient id="colorFishing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                )}
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
                        <p className="value">{`${Number(payload[0].value).toFixed(2)} m`}</p>
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
              {showFishingTime && fishingPeriods.map((period, i) => (
                <ReferenceArea
                  key={`fish-${i}`}
                  x1={period.start}
                  x2={period.end}
                  fill="#ef4444"
                  fillOpacity={0.15}
                  stroke="#ef4444"
                  strokeOpacity={0.3}
                  strokeDasharray="4 4"
                />
              ))}
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
              {currentLevelData && (
                <ReferenceLine 
                  x={currentLevelData.xPos} 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  label={(props) => <CurrentTimeLabel {...props} value={currentLevelData.level} isRising={currentLevelData.isRising} />}
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
                <p className="value">{`${Number(pinnedData.payload[0].value).toFixed(2)} m`}</p>
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
                <span className="stat-value">{stats.max.level.toFixed(2)} m <span className="stat-time">at {stats.max.time}</span></span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper low">
                <TrendingDown size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Lowest Sea Level</span>
                <span className="stat-value">{stats.min.level.toFixed(2)} m <span className="stat-time">at {stats.min.time}</span></span>
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
                  <span className="stat-value">{maxWave.level.toFixed(2)} m <span className="stat-time">at {maxWave.time}</span></span>
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
      <LocalMapModal
        isOpen={isLocalMapModalOpen}
        onClose={() => setIsLocalMapModalOpen(false)}
        initialLat={localCoordinate?.lat || (activeTab === 'standard' && selectedLocation?.lat ? selectedLocation.lat : 13.7563)}
        initialLng={localCoordinate?.lng || (activeTab === 'standard' && selectedLocation?.lng ? selectedLocation.lng : 100.5018)}
        onSelectCoordinate={(lat, lng) => setLocalCoordinate({ lat, lng })}
      />
      </div>
    </div>
  );
}

export default App;
