import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Navigation } from 'lucide-react';
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

interface LocationData {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: LocationData[];
  selectedLocationId: string;
  onSelectLocation: (id: string) => void;
}

function FlyToSelected({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 8, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

export function MapModal({ isOpen, onClose, locations, selectedLocationId, onSelectLocation }: MapModalProps) {
  if (!isOpen) return null;

  const selectedLoc = locations.find(l => l.id === selectedLocationId);
  const centerLat = selectedLoc?.lat || 13.7563;
  const centerLng = selectedLoc?.lng || 100.5018;

  const validLocations = locations.filter(l => l.lat && l.lng);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="map-modal-content" onClick={e => e.stopPropagation()}>
        <div className="map-header">
          <div className="map-title">
            <Navigation size={20} className="map-title-icon" />
            <h2>Select Station on Map</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="map-container-wrapper">
          <MapContainer center={[centerLat, centerLng]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {selectedLoc?.lat && selectedLoc?.lng && (
              <FlyToSelected lat={selectedLoc.lat} lng={selectedLoc.lng} />
            )}
            {validLocations.map(loc => (
              <Marker 
                key={loc.id} 
                position={[loc.lat!, loc.lng!]}
                eventHandlers={{
                  click: () => {
                    onSelectLocation(loc.id);
                  }
                }}
              >
                <Popup className="custom-popup">
                  <div className="popup-content">
                    <strong>{loc.name}</strong>
                    <button className="select-station-btn" onClick={(e) => {
                      e.stopPropagation();
                      onSelectLocation(loc.id);
                      onClose();
                    }}>
                      Select Station
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
