import * as SunCalc from 'suncalc';
import { X, Sunrise, Sunset, Moon, MoonStar } from 'lucide-react';
import './LunarModal.css';

interface LunarModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  lat?: number;
  lng?: number;
  locationName: string;
}

function getPhaseString(phase: number): { label: string, emoji: string } {
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

  return { label, emoji };
}

function formatTime(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

export function LunarModal({ isOpen, onClose, dateStr, lat, lng, locationName }: LunarModalProps) {
  if (!isOpen) return null;
  
  // Default to Bangkok coords if missing
  const latitude = lat ?? 13.7563;
  const longitude = lng ?? 100.5018;
  const date = new Date(dateStr);
  
  const sunTimes = SunCalc.getTimes(date, latitude, longitude);
  const moonTimes = SunCalc.getMoonTimes(date, latitude, longitude);
  const moonIllum = SunCalc.getMoonIllumination(date);
  
  const phaseData = getPhaseString(moonIllum.phase);
  const percent = Math.round(moonIllum.fraction * 100);

  // Compute next 4 specific phases roughly
  // This is a simplified approach: increment days and look for phase crossings
  const upcomingPhases: { date: Date, type: string, emoji: string }[] = [];
  let d = new Date(date);
  // Look ahead up to 35 days
  for (let i = 1; i <= 35; i++) {
    d.setDate(d.getDate() + 1);
    const m = SunCalc.getMoonIllumination(d);
    const pStr = getPhaseString(m.phase);
    
    // Only capture the major 4 phases roughly
    if (["ขึ้น 1 ค่ำ", "ขึ้น 8 ค่ำ", "ขึ้น 15 ค่ำ", "แรม 8 ค่ำ", "แรม 15 ค่ำ"].includes(pStr.label)) {
      if (upcomingPhases.length === 0 || upcomingPhases[upcomingPhases.length - 1].type !== pStr.label) {
        upcomingPhases.push({ date: new Date(d), type: pStr.label, emoji: pStr.emoji });
      }
    }
    if (upcomingPhases.length >= 4) break;
  }

  // Format Date String like "9 ก.ค. 2026"
  const dateTitle = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        
        <div className="modal-header">
          <h2>{locationName}</h2>
          <p>{dateTitle}</p>
        </div>

        <div className="moon-visual-container">
          <div className="moon-emoji-large">{phaseData.emoji}</div>
          <h3 className="phase-title">{phaseData.label} ({percent}%)</h3>
        </div>
        
        <div className="sun-moon-times">
          <div className="time-row">
            <div className="time-label"><Moon size={18}/> พระจันทร์ขึ้น:</div>
            <div className="time-value">{formatTime(moonTimes.rise)}</div>
          </div>
          <div className="time-row">
            <div className="time-label"><MoonStar size={18}/> พระจันทร์ตก:</div>
            <div className="time-value">{formatTime(moonTimes.set)}</div>
          </div>
          <div className="time-row">
            <div className="time-label"><Sunrise size={18}/> พระอาทิตย์ขึ้น:</div>
            <div className="time-value">{formatTime(sunTimes.sunrise)}</div>
          </div>
          <div className="time-row">
            <div className="time-label"><Sunset size={18}/> พระอาทิตย์ตก:</div>
            <div className="time-value">{formatTime(sunTimes.sunset)}</div>
          </div>
        </div>

        <div className="upcoming-phases">
          {upcomingPhases.map((phase, idx) => (
            <div className="upcoming-row" key={idx}>
              <div className="upcoming-emoji">{phase.emoji}</div>
              <div className="upcoming-date">
                {phase.date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}
