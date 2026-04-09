import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Route, Play, Navigation2, RefreshCw } from 'lucide-react';

const GraphVisualizer = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mode, setMode] = useState('addNode'); // 'addNode', 'addEdge'
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  
  const [mstEdges, setMstEdges] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const svgRef = useRef(null);

  // Generate unique IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Canvas Handlers
  const handleSvgClick = (e) => {
    if (mode !== 'addNode' || isAnimating) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    // Use scaling if SVG uses viewBox, but here let's assume 1:1 mapping for simplicity
    // Actually we will use viewBox in SVG and mapping clientX to viewbox coords.
    // simpler approach: since viz-workspace has overflow hidden and relative, we can just use bounding box directly if svg is 100% 100%.
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cityName = prompt("Enter City Name:", `City ${nodes.length + 1}`);
    if (cityName) {
      setNodes([...nodes, { id: generateId(), x, y, name: cityName }]);
      // Clear MST when modifying graph
      setMstEdges([]);
      setTotalCost(0);
    }
  };

  const handleNodeClick = (nodeId, e) => {
    e.stopPropagation(); // prevent svg click
    if (mode !== 'addEdge' || isAnimating) return;

    if (!selectedNodeId) {
      setSelectedNodeId(nodeId);
    } else {
      if (selectedNodeId !== nodeId) {
        // Prevent duplicate edges
        const exists = edges.find(
          edge => (edge.source === selectedNodeId && edge.target === nodeId) ||
                  (edge.source === nodeId && edge.target === selectedNodeId)
        );
        if (!exists) {
          const weightStr = prompt("Enter Road Weight (Distance/Cost):", "10");
          const weight = parseInt(weightStr);
          if (!isNaN(weight) && weight > 0) {
            setEdges([...edges, { id: generateId(), source: selectedNodeId, target: nodeId, weight }]);
            // Clear MST when modifying graph
            setMstEdges([]);
            setTotalCost(0);
          }
        }
      }
      setSelectedNodeId(null); // Reset selection
    }
  };

  // Prim's Algorithm
  const runPrimsAlgorithm = async () => {
    if (nodes.length === 0 || edges.length === 0 || isAnimating) return;
    setIsAnimating(true);
    setMstEdges([]);
    setTotalCost(0);

    let visited = new Set([nodes[0].id]);
    let currentMst = [];
    let currentCost = 0;

    while (visited.size < nodes.length) {
      let minEdge = null;
      let minWeight = Infinity;
      let nextNode = null;

      // Find shortest edge from visited to unvisited
      for (const edge of edges) {
        let isSourceVisited = visited.has(edge.source);
        let isTargetVisited = visited.has(edge.target);

        // One and only one node should be visited to expand the frontier
        if (isSourceVisited !== isTargetVisited) {
          if (edge.weight < minWeight) {
            minWeight = edge.weight;
            minEdge = edge;
            nextNode = isSourceVisited ? edge.target : edge.source;
          }
        }
      }

      if (!minEdge) break; // Disconnected graph case

      visited.add(nextNode);
      currentMst.push(minEdge.id);
      currentCost += minWeight;

      setMstEdges([...currentMst]);
      setTotalCost(currentCost);
      await new Promise(res => setTimeout(res, 800)); // Animation pause
    }

    if (visited.size < nodes.length) {
      alert("Graph is disconnected! Found MST for the connected component.");
    }
    
    setIsAnimating(false);
  };

  const resetGraph = () => {
    if (isAnimating) return;
    if (window.confirm('Clear the entire map?')) {
      setNodes([]);
      setEdges([]);
      setMstEdges([]);
      setTotalCost(0);
      setSelectedNodeId(null);
    }
  };

  const getMidpoint = (sourceId, targetId) => {
    const s = nodes.find(n => n.id === sourceId);
    const t = nodes.find(n => n.id === targetId);
    if (!s || !t) return { x: 0, y: 0 };
    return { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
  };

  return (
    <div className="viz-container">
      {/* Controls Sidebar */}
      <div className="card toolbar">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Navigation2 size={20} className="text-accent-primary" />
          Map Controls
        </h3>

        <div className="toolbar-group">
          <label className="text-sm text-secondary">Interaction Mode</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={`btn ${mode === 'addNode' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1 }}
              onClick={() => { setMode('addNode'); setSelectedNodeId(null); }}
              disabled={isAnimating}
            >
              <MapPin size={16} /> Add Cities
            </button>
            <button 
              className={`btn ${mode === 'addEdge' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1 }}
              onClick={() => setMode('addEdge')}
              disabled={isAnimating}
            >
              <Route size={16} /> Add Roads
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {mode === 'addNode' 
              ? 'Click anywhere on the map to add a City.' 
              : 'Click two Cities to connect them with a Road.'}
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
          <Play size={16} /> Find Minimum Route (Prim's)
        </button>

        <button className="btn btn-secondary" onClick={resetGraph} disabled={isAnimating} style={{ width: '100%' }}>
          <RefreshCw size={16} /> Reset Map
        </button>

        {/* Results Data */}
        <div style={{ marginTop: 'auto', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Route Cost</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {totalCost > 0 ? totalCost : '--'}
          </div>
          {mstEdges.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginTop: '0.25rem' }}>
              Minimum Spanning Tree found!
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas for Visualization */}
      <div className="viz-workspace" style={{ cursor: mode === 'addNode' ? 'crosshair' : 'default' }}>
        <svg 
          ref={svgRef} 
          width="100%" 
          height="100%" 
          onClick={handleSvgClick}
        >
          {/* Edges */}
          {edges.map(edge => {
            const s = nodes.find(n => n.id === edge.source);
            const t = nodes.find(n => n.id === edge.target);
            if (!s || !t) return null;
            
            const isMst = mstEdges.includes(edge.id);
            const mid = getMidpoint(edge.source, edge.target);
            
            return (
              <g key={edge.id}>
                <motion.line
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isMst ? 'var(--accent-success)' : 'var(--border-color)'}
                  strokeWidth={isMst ? 4 : 2}
                  className="edge-line"
                  animate={{ stroke: isMst ? '#10b981' : '#334155' }}
                  transition={{ duration: 0.5 }}
                />
                {/* Edge Weight Background */}
                <rect 
                  x={mid.x - 12} y={mid.y - 10} 
                  width={24} height={20} 
                  rx={4} ry={4} 
                  className="edge-weight-bg" 
                />
                {/* Edge Weight Text */}
                <text 
                  x={mid.x} y={mid.y + 4} 
                  textAnchor="middle" 
                  className="edge-weight-text"
                >
                  {edge.weight}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const inMst = mstEdges.length > 0 && edges.some(e => mstEdges.includes(e.id) && (e.source === node.id || e.target === node.id)) || (mstEdges.length > 0 && nodes.length > 0 && nodes[0].id === node.id);

            return (
              <g key={node.id} onClick={(e) => handleNodeClick(node.id, e)} style={{ cursor: mode === 'addEdge' ? 'pointer' : 'default' }}>
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={18}
                  fill={isSelected ? "var(--accent-primary)" : (inMst ? "var(--bg-card)" : "var(--bg-secondary)")}
                  stroke={inMst ? "var(--accent-success)" : (isSelected ? "#fff" : "var(--border-color)")}
                  strokeWidth={isSelected || inMst ? 3 : 2}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={mode === 'addEdge' ? { scale: 1.2 } : {}}
                  transition={{ type: "spring" }}
                />
                <text 
                  x={node.x} y={node.y - 25} 
                  textAnchor="middle" 
                  fill="var(--text-primary)" 
                  fontSize="12px" 
                  fontWeight="600"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.name}
                </text>
                <text 
                  x={node.x} y={node.y + 4} 
                  textAnchor="middle" 
                  fill="#fff" 
                  fontSize="10px" 
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.name.charAt(0).toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {nodes.length === 0 && (
          <div style={{ position: 'absolute', color: 'var(--text-secondary)', textAlign: 'center', pointerEvents: 'none' }}>
            <MapPin size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Map is empty. Click to add cities.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphVisualizer;
