import { X, CloudSun, CloudRain, CloudLightning, Thermometer, Wind, Droplets } from 'lucide-react';
import './WeatherModal.css';

export interface HourlyWeather {
  time: string;
  temp: number;
  windSpeed: number;
  rainProb: number;
  waveHeight?: number | null;
}

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  dateStr: string;
  hourlyData: HourlyWeather[];
}

export function WeatherModal({ isOpen, onClose, locationName, dateStr, hourlyData }: WeatherModalProps) {
  if (!isOpen) return null;

  const dateTitle = new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content weather-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        
        <div className="modal-header">
          <h2>พยากรณ์อากาศรายชั่วโมง</h2>
          <p>{locationName} - {dateTitle}</p>
        </div>

        <div className="hourly-weather-list">
          <div className="hourly-weather-header">
            <div className="hw-time">เวลา</div>
            <div className="hw-temp"><Thermometer size={14}/> อุณหภูมิ</div>
            <div className="hw-rain"><Droplets size={14}/> โอกาสฝน</div>
            <div className="hw-wind"><Wind size={14}/> ลม</div>
          </div>
          
          <div className="hourly-weather-body">
            {hourlyData.length === 0 ? (
              <div className="no-data">ไม่พบข้อมูลพยากรณ์อากาศ</div>
            ) : (
              hourlyData.map((hour, idx) => {
                const timeLabel = new Date(hour.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                
                let Icon = CloudSun;
                let iconColor = '#3b82f6';
                if (hour.rainProb >= 80) {
                  Icon = CloudLightning;
                  iconColor = '#fbbf24';
                } else if (hour.rainProb >= 50) {
                  Icon = CloudRain;
                  iconColor = '#60a5fa';
                }

                return (
                  <div className="hourly-row" key={idx}>
                    <div className="hw-time">{timeLabel}</div>
                    <div className="hw-temp">{Math.round(hour.temp)}°C</div>
                    <div className="hw-rain" style={{ color: iconColor }}>
                      <Icon size={16} style={{ marginRight: '6px' }} />
                      {hour.rainProb}%
                    </div>
                    <div className="hw-wind">{Math.round(hour.windSpeed)} km/h</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
