import { X, Waves } from 'lucide-react';
import './WaveModal.css';

export interface HourlyWave {
  time: string;
  waveHeight: number | null;
}

interface WaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  dateStr: string;
  hourlyData: HourlyWave[];
}

export function WaveModal({ isOpen, onClose, locationName, dateStr, hourlyData }: WaveModalProps) {
  if (!isOpen) return null;

  const dateTitle = new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wave-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        
        <div className="modal-header">
          <h2>ความสูงคลื่นรายชั่วโมง</h2>
          <p>{locationName} - {dateTitle}</p>
        </div>

        <div className="hourly-wave-list">
          <div className="hourly-wave-header">
            <div className="hw-time">เวลา</div>
            <div className="hw-wave"><Waves size={14}/> คลื่น (เมตร)</div>
          </div>
          
          <div className="hourly-wave-body">
            {hourlyData.length === 0 ? (
              <div className="no-data">ไม่พบข้อมูลความสูงคลื่น</div>
            ) : (
              hourlyData.map((hour, idx) => {
                const timeLabel = new Date(hour.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

                return (
                  <div className="hourly-row" key={idx}>
                    <div className="hw-time">{timeLabel}</div>
                    <div className="hw-wave" style={{ color: '#38bdf8' }}>{hour.waveHeight !== null && hour.waveHeight !== undefined ? hour.waveHeight.toFixed(2) + ' m' : '--'}</div>
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
