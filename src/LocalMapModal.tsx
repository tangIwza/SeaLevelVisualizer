import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Navigation, Search } from 'lucide-react';
import './MapModal.css';

// Fix for default marker icons in react-leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocalMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  onSelectCoordinate: (lat: number, lng: number) => void;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (p: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function MapUpdater({ center }: { center: L.LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 10);
    }
  }, [center, map]);
  return null;
}

export function LocalMapModal({ isOpen, onClose, initialLat = 13.7563, initialLng = 100.5018, onSelectCoordinate }: LocalMapModalProps) {
  const [position, setPosition] = useState<L.LatLng | null>(initialLat && initialLng ? new L.LatLng(initialLat, initialLng) : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<L.LatLng | null>(null);

  useEffect(() => {
    if (isOpen && initialLat && initialLng) {
      setPosition(new L.LatLng(initialLat, initialLng));
    }
  }, [isOpen, initialLat, initialLng]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&accept-language=th`);
      const data = await res.json();
      if (data && data.length > 0) {
        const result = data[0];
        const newPos = new L.LatLng(parseFloat(result.lat), parseFloat(result.lon));
        setPosition(newPos);
        setMapCenter(newPos);
      } else {
        alert('Location not found / ไม่พบสถานที่นี้');
      }
    } catch (err) {
      console.error(err);
      alert('Error searching location');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="map-modal-content" onClick={e => e.stopPropagation()}>
        <div className="map-header">
          <div className="map-title">
            <Navigation size={20} className="map-title-icon" />
            <h2>Select Custom Location</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div style={{ padding: '0 1rem 1rem 1rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="ค้นหาสถานที่ (เช่น ชลบุรี, ระยอง)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)',
                color: '#fff',
                outline: 'none',
                fontFamily: 'Inter, sans-serif'
              }}
            />
            <button 
              type="submit"
              disabled={isSearching}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isSearching ? 0.7 : 1
              }}
            >
              {isSearching ? '...' : <Search size={18} />}
            </button>
          </form>
        </div>

        <div className="map-container-wrapper" style={{ height: '300px' }}>
          <MapContainer center={[initialLat, initialLng]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
            <MapUpdater center={mapCenter} />
          </MapContainer>
        </div>

        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
           {position && (
             <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
               {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
             </div>
           )}
           <button 
             onClick={() => {
               if (position) {
                 onSelectCoordinate(position.lat, position.lng);
                 onClose();
               }
             }}
             style={{
               background: position ? '#3b82f6' : 'rgba(255,255,255,0.1)',
               color: position ? '#fff' : '#64748b',
               border: 'none',
               padding: '0.5rem 1.5rem',
               borderRadius: '8px',
               fontWeight: 600,
               cursor: position ? 'pointer' : 'not-allowed'
             }}
             disabled={!position}
           >
             Confirm Location
           </button>
        </div>
      </div>
    </div>
  );
}
