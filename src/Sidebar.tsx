import { useState } from 'react';
import { Menu, X, Navigation, Map } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activeTab: 'standard' | 'local';
  setActiveTab: (tab: 'standard' | 'local') => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setIsOpen(true)}>
        <Menu size={20} />
      </button>

      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)} />
      
      <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-group">
            <img src="/icon.png" alt="SeaLevel Logo" className="logo-img" />
            <h2>SeaLevel <span className="logo-highlight">App</span></h2>
          </div>
          <button className="close-sidebar-btn" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-nav">
          <p className="nav-group-title">TIDE DATA</p>
          <button 
            className={`nav-item ${activeTab === 'standard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('standard'); setIsOpen(false); }}
          >
            <Map size={18} />
            Standard Tides
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => { setActiveTab('local'); setIsOpen(false); }}
          >
            <Navigation size={18} />
            Local Tides
          </button>
        </div>
      </div>
    </>
  );
}
