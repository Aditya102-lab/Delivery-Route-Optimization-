import React from 'react';
import { MapPin, Route, Play, Navigation2, RefreshCw } from 'lucide-react';

const ControlsPanel = ({ mode, setMode, resetGraph, runPrimsAlgorithm, isAnimating, nodes, edges }) => {
  return (
    <div className="card toolbar" style={{ flexShrink: 0 }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Navigation2 size={20} className="text-accent-primary" />
        Delivery Controls
      </h3>

      <div className="toolbar-group">
        <label className="text-sm text-secondary">Interaction Mode</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${mode === 'addNode' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1 }}
            onClick={() => setMode('addNode')}
            disabled={isAnimating}
          >
            <MapPin size={16} /> Locations
          </button>
          <button 
            className={`btn ${mode === 'addEdge' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1 }}
            onClick={() => setMode('addEdge')}
            disabled={isAnimating}
          >
            <Route size={16} /> Roads
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          {mode === 'addNode' 
            ? 'Click the map to add the Restaurant first, then Customers.' 
            : 'Click 2 locations to connect them with a delivery road.'}
        </p>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />

      <h3 style={{ marginBottom: '1rem' }}>Optimization</h3>
      <button 
        className="btn btn-primary" 
        onClick={runPrimsAlgorithm} 
        disabled={isAnimating || nodes.length < 2 || edges.length === 0}
        style={{ width: '100%', marginBottom: '1rem', background: 'linear-gradient(135deg, var(--accent-success), #059669)' }}
      >
        <Play size={16} /> Optimize Delivery Route
      </button>

      <button className="btn btn-secondary" onClick={resetGraph} disabled={isAnimating} style={{ width: '100%' }}>
        <RefreshCw size={16} /> Reset Map
      </button>
    </div>
  );
};

export default ControlsPanel;
