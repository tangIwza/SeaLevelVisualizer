import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Calendar, Clock, MapPin, TrendingUp, TrendingDown } from 'lucide-react';

interface DayData {
  day: number;
  hours: number[];
}

interface MonthData {
  month: number;
  days: DayData[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

function App() {
  const [data, setData] = useState<MonthData[]>([]);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/tide_data.json')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load data');
        return response.json();
      })
      .then((jsonData: MonthData[]) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Compute the data for the chart based on current selection
  const chartData = useMemo(() => {
    if (!data.length) return [];
    
    const monthData = data.find(m => m.month === selectedMonth);
    if (!monthData) return [];
    
    const dayData = monthData.days.find(d => d.day === selectedDay);
    if (!dayData) return [];
    
    return dayData.hours.map((val, index) => ({
      time: `${index.toString().padStart(2, '0')}:00`,
      level: val
    }));
  }, [data, selectedMonth, selectedDay]);

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

  // When month changes, check if the selected day is still valid for this month
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setSelectedMonth(newMonth);
    
    // Find how many days are in this new month
    const newMonthData = data.find(m => m.month === newMonth);
    if (newMonthData) {
      const maxDays = newMonthData.days.length;
      if (selectedDay > maxDays) {
        setSelectedDay(maxDays);
      }
    }
  };

  const activeMonthData = data.find(m => m.month === selectedMonth);
  const availableDays = activeMonthData ? activeMonthData.days.map(d => d.day) : [];

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
          <div className="title-group">
            <h1>Sea Level Visualizer</h1>
            <p><MapPin size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/> Map Ta Phut, Rayong (2026)</p>
          </div>
          
          <div className="controls-group">
            {/* Month Filter */}
            <div className="select-wrapper">
              <select 
                className="custom-select" 
                value={selectedMonth} 
                onChange={handleMonthChange}
              >
                {data.map(m => (
                  <option key={m.month} value={m.month}>
                    {MONTH_NAMES[m.month - 1]}
                  </option>
                ))}
              </select>
              <Calendar className="select-icon" size={16} />
            </div>

            {/* Day Filter */}
            <div className="select-wrapper">
              <select 
                className="custom-select" 
                value={selectedDay} 
                onChange={e => setSelectedDay(parseInt(e.target.value))}
              >
                {availableDays.map(day => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ))}
              </select>
              <Clock className="select-icon" size={16} />
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#94a3b8" 
                tick={{fill: '#94a3b8', fontSize: 12}}
                tickMargin={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{fill: '#94a3b8', fontSize: 12}}
                domain={[0, 4]}
                tickFormatter={(value) => `${value}m`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="custom-tooltip">
                        <p className="label">{label}</p>
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
            </AreaChart>
          </ResponsiveContainer>
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
          </div>
        )}
        
      </div>
    </div>
  );
}

export default App;
